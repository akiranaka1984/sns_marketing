/**
 * X API v2 Poster
 *
 * Posts content to X/Twitter using the official API v2 with OAuth 1.0a authentication.
 * This is the stable, low-risk alternative to Playwright browser automation.
 *
 * Requirements:
 * - X API Basic plan ($200/month) or higher
 * - OAuth 1.0a credentials (API Key, API Secret, Access Token, Access Token Secret)
 *
 * The existing Playwright poster (x-playwright-poster.ts) is NOT modified.
 * This module runs in parallel — switching is controlled by account.postingMethod.
 */

import crypto from 'crypto';
import { db } from './db';
import { xApiSettings, accounts } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from './utils/logger';

const logger = createLogger('x-api-v2-poster');

const X_API_BASE = 'https://api.x.com';

// ─── Types ───────────────────────────────────────────────────────────

export interface ApiV2PostResult {
  success: boolean;
  message: string;
  error?: string;
  tweetId?: string;
  postUrl?: string;
}

interface OAuthCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

interface XApiError {
  title?: string;
  detail?: string;
  type?: string;
  status?: number;
  errors?: Array<{ message: string; parameters?: Record<string, string[]> }>;
}

// ─── OAuth 1.0a Signature ────────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateOAuthHeader(
  method: string,
  url: string,
  credentials: OAuthCredentials,
  bodyParams?: Record<string, string>,
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: credentials.accessToken,
    oauth_version: '1.0',
  };

  // Combine all params for signature base
  const allParams: Record<string, string> = { ...oauthParams, ...(bodyParams || {}) };

  // Sort and encode
  const paramString = Object.keys(allParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
    .join('&');

  // Signature base string
  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;

  // Signing key
  const signingKey = `${percentEncode(credentials.apiSecret)}&${percentEncode(credentials.accessTokenSecret)}`;

  // HMAC-SHA1
  const signature = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');

  oauthParams['oauth_signature'] = signature;

  // Build Authorization header
  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

// ─── Credential Loading ──────────────────────────────────────────────

async function getOAuthCredentials(): Promise<OAuthCredentials | null> {
  const settings = await db.query.xApiSettings.findFirst({
    where: eq(xApiSettings.userId, 1),
  });

  if (!settings?.apiKey || !settings?.apiSecret || !settings?.accessToken || !settings?.accessTokenSecret) {
    logger.error('Missing OAuth 1.0a credentials in x_api_settings. All four fields are required: apiKey, apiSecret, accessToken, accessTokenSecret');
    return null;
  }

  return {
    apiKey: settings.apiKey,
    apiSecret: settings.apiSecret,
    accessToken: settings.accessToken,
    accessTokenSecret: settings.accessTokenSecret,
  };
}

// ─── Rate Limit Handling ─────────────────────────────────────────────

interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
}

function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const remaining = headers.get('x-rate-limit-remaining');
  const reset = headers.get('x-rate-limit-reset');

  if (remaining === null || reset === null) return null;

  return {
    remaining: parseInt(remaining, 10),
    resetAt: new Date(parseInt(reset, 10) * 1000),
  };
}

// ─── Media Upload ────────────────────────────────────────────────────

/**
 * Upload media to X via the v2 media upload endpoint.
 * Returns the media_id string to attach to a tweet.
 *
 * For images: simple upload (INIT → APPEND → FINALIZE)
 */
async function uploadMedia(
  filePath: string,
  credentials: OAuthCredentials,
): Promise<string | null> {
  const fs = await import('fs/promises');
  const path = await import('path');

  try {
    const fileData = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    const isVideo = mimeType.startsWith('video/');
    const mediaCategory = isVideo ? 'tweet_video' : 'tweet_image';

    // Step 1: INIT
    const initUrl = `${X_API_BASE}/2/media/upload`;
    const initParams: Record<string, string> = {
      command: 'INIT',
      total_bytes: fileData.length.toString(),
      media_type: mimeType,
      media_category: mediaCategory,
    };

    const initAuth = generateOAuthHeader('POST', initUrl, credentials, initParams);

    const initForm = new URLSearchParams(initParams);
    const initRes = await fetch(initUrl, {
      method: 'POST',
      headers: {
        Authorization: initAuth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: initForm.toString(),
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      logger.error({ status: initRes.status, err }, 'Media upload INIT failed');
      return null;
    }

    const initData = await initRes.json();
    const mediaId = initData.media_id_string || initData.data?.id;
    if (!mediaId) {
      logger.error({ initData }, 'No media_id returned from INIT');
      return null;
    }

    // Step 2: APPEND (single chunk for images, chunked for video)
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(fileData.length / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = fileData.subarray(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

      const appendUrl = `${X_API_BASE}/2/media/upload`;
      const appendParams: Record<string, string> = {
        command: 'APPEND',
        media_id: mediaId,
        segment_index: i.toString(),
      };

      // For APPEND we need multipart/form-data with the binary
      const formData = new FormData();
      formData.append('command', 'APPEND');
      formData.append('media_id', mediaId);
      formData.append('segment_index', i.toString());
      formData.append('media_data', Buffer.from(chunk).toString('base64'));

      const appendAuth = generateOAuthHeader('POST', appendUrl, credentials, appendParams);

      const appendRes = await fetch(appendUrl, {
        method: 'POST',
        headers: {
          Authorization: appendAuth,
        },
        body: formData,
      });

      if (!appendRes.ok) {
        const err = await appendRes.json().catch(() => ({}));
        logger.error({ status: appendRes.status, err, chunk: i }, 'Media upload APPEND failed');
        return null;
      }
    }

    // Step 3: FINALIZE
    const finalizeUrl = `${X_API_BASE}/2/media/upload`;
    const finalizeParams: Record<string, string> = {
      command: 'FINALIZE',
      media_id: mediaId,
    };

    const finalizeAuth = generateOAuthHeader('POST', finalizeUrl, credentials, finalizeParams);
    const finalizeForm = new URLSearchParams(finalizeParams);

    const finalizeRes = await fetch(finalizeUrl, {
      method: 'POST',
      headers: {
        Authorization: finalizeAuth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: finalizeForm.toString(),
    });

    if (!finalizeRes.ok) {
      const err = await finalizeRes.json().catch(() => ({}));
      logger.error({ status: finalizeRes.status, err }, 'Media upload FINALIZE failed');
      return null;
    }

    const finalizeData = await finalizeRes.json();

    // For video, wait for processing
    if (isVideo && finalizeData.processing_info) {
      const processed = await waitForMediaProcessing(mediaId, credentials);
      if (!processed) return null;
    }

    logger.info({ mediaId }, 'Media uploaded successfully');
    return mediaId;
  } catch (error: any) {
    logger.error({ err: error.message, filePath }, 'Media upload failed');
    return null;
  }
}

async function waitForMediaProcessing(
  mediaId: string,
  credentials: OAuthCredentials,
  maxWaitMs = 120_000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const statusUrl = `${X_API_BASE}/2/media/upload`;
    const statusParams: Record<string, string> = {
      command: 'STATUS',
      media_id: mediaId,
    };

    const auth = generateOAuthHeader('GET', statusUrl, credentials, statusParams);
    const queryString = new URLSearchParams(statusParams).toString();

    const res = await fetch(`${statusUrl}?${queryString}`, {
      method: 'GET',
      headers: { Authorization: auth },
    });

    if (!res.ok) {
      logger.error({ status: res.status }, 'Media status check failed');
      return false;
    }

    const data = await res.json();
    const state = data.processing_info?.state;

    if (state === 'succeeded') return true;
    if (state === 'failed') {
      logger.error({ error: data.processing_info?.error }, 'Media processing failed');
      return false;
    }

    const waitSeconds = data.processing_info?.check_after_secs || 5;
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
  }

  logger.error({ mediaId }, 'Media processing timed out');
  return false;
}

// ─── Tweet Creation ──────────────────────────────────────────────────

/**
 * Post a tweet using X API v2.
 *
 * Endpoint: POST /2/tweets
 * Auth: OAuth 1.0a (User context)
 */
export async function postToXViaApiV2(
  accountId: number,
  content: string,
  mediaUrls?: string[],
): Promise<ApiV2PostResult> {
  try {
    const credentials = await getOAuthCredentials();
    if (!credentials) {
      return {
        success: false,
        message: 'X API OAuth credentials not configured. Set them in Settings > X API.',
        error: 'MISSING_CREDENTIALS',
      };
    }

    // Get account info for username (to build post URL)
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
    });

    if (!account) {
      return { success: false, message: 'Account not found', error: 'ACCOUNT_NOT_FOUND' };
    }

    // Upload media if provided
    let mediaIds: string[] = [];
    if (mediaUrls && mediaUrls.length > 0) {
      logger.info({ accountId, mediaCount: mediaUrls.length }, 'Uploading media files');

      for (const mediaUrl of mediaUrls) {
        const mediaId = await uploadMedia(mediaUrl, credentials);
        if (mediaId) {
          mediaIds.push(mediaId);
        } else {
          logger.warn({ mediaUrl }, 'Failed to upload media, skipping');
        }
      }
    }

    // Build tweet payload
    const tweetPayload: Record<string, any> = {
      text: content,
    };

    if (mediaIds.length > 0) {
      tweetPayload.media = {
        media_ids: mediaIds,
      };
    }

    // Create tweet
    const tweetUrl = `${X_API_BASE}/2/tweets`;
    const authHeader = generateOAuthHeader('POST', tweetUrl, credentials);

    logger.info({ accountId, contentLength: content.length, hasMedia: mediaIds.length > 0 }, 'Posting tweet via API v2');

    const response = await fetch(tweetUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetPayload),
    });

    // Parse rate limit info
    const rateLimit = parseRateLimitHeaders(response.headers);
    if (rateLimit) {
      logger.info({ remaining: rateLimit.remaining, resetAt: rateLimit.resetAt.toISOString() }, 'Rate limit status');
      if (rateLimit.remaining <= 5) {
        logger.warn({ remaining: rateLimit.remaining, resetAt: rateLimit.resetAt.toISOString() }, 'Approaching rate limit!');
      }
    }

    if (!response.ok) {
      const errorData: XApiError = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.title || `HTTP ${response.status}`;

      // Handle specific error codes
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || 'unknown';
        logger.error({ retryAfter }, 'Rate limited by X API');
        return {
          success: false,
          message: `Rate limited. Retry after ${retryAfter} seconds.`,
          error: 'RATE_LIMITED',
        };
      }

      if (response.status === 403) {
        logger.error({ errorData }, 'Forbidden — check API plan and permissions');
        return {
          success: false,
          message: `API access denied: ${errorMessage}. Check your X API plan supports tweet creation.`,
          error: 'FORBIDDEN',
        };
      }

      logger.error({ status: response.status, errorData }, 'Tweet creation failed');
      return {
        success: false,
        message: `Tweet creation failed: ${errorMessage}`,
        error: `API_ERROR_${response.status}`,
      };
    }

    const data = await response.json();
    const tweetId = data.data?.id;

    if (!tweetId) {
      logger.error({ data }, 'No tweet ID in response');
      return {
        success: false,
        message: 'Tweet may have been created but no ID was returned',
        error: 'NO_TWEET_ID',
      };
    }

    const username = account.xHandle || account.username;
    const postUrl = `https://x.com/${username}/status/${tweetId}`;

    logger.info({ accountId, tweetId, postUrl }, 'Tweet posted successfully via API v2');

    return {
      success: true,
      message: 'Tweet posted successfully via X API v2',
      tweetId,
      postUrl,
    };
  } catch (error: any) {
    logger.error({ accountId, err: error.message }, 'postToXViaApiV2 failed');
    return {
      success: false,
      message: `Failed to post via X API v2: ${error.message}`,
      error: error.message,
    };
  }
}

// ─── Connection Test ─────────────────────────────────────────────────

/**
 * Test the X API v2 connection by verifying credentials.
 * Uses GET /2/users/me to check if the OAuth tokens are valid.
 */
export async function testApiV2Connection(): Promise<{
  success: boolean;
  username?: string;
  error?: string;
}> {
  try {
    const credentials = await getOAuthCredentials();
    if (!credentials) {
      return { success: false, error: 'Missing OAuth credentials' };
    }

    const url = `${X_API_BASE}/2/users/me`;
    const authHeader = generateOAuthHeader('GET', url, credentials);

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `API returned ${response.status}: ${(err as XApiError).detail || 'Unknown error'}`,
      };
    }

    const data = await response.json();
    const username = data.data?.username;

    logger.info({ username }, 'X API v2 connection test successful');
    return { success: true, username };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
