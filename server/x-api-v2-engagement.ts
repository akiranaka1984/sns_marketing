/**
 * X API v2 Engagement Actions
 *
 * Implements engagement actions using the official X API v2 with OAuth 1.0a authentication.
 * This module replaces the Playwright-based engagement-actions.ts for:
 *   - Like / Unlike tweets
 *   - Retweet / Unretweet tweets
 *   - Reply to tweets
 *   - Follow / Unfollow users
 *
 * All operations require OAuth 1.0a (User Context) credentials.
 * Credentials are loaded via getOAuthCredentials() imported from x-api-v2-poster.ts.
 *
 * References:
 *   - Like:       POST   /2/users/:id/likes
 *   - Unlike:     DELETE /2/users/:id/likes/:tweet_id
 *   - Retweet:    POST   /2/users/:id/retweets
 *   - Unretweet:  DELETE /2/users/:id/retweets/:tweet_id
 *   - Reply:      POST   /2/tweets  (with reply.in_reply_to_tweet_id)
 *   - Follow:     POST   /2/users/:id/following
 *   - Unfollow:   DELETE /2/users/:source_id/following/:target_id
 */

import crypto from 'crypto';
import { db } from './db';
import { xApiSettings, accounts, apiUsageTracking } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { createLogger } from './utils/logger';
import { decrypt } from './utils/encryption';

const logger = createLogger('x-api-v2-engagement');

const X_API_BASE = 'https://api.x.com';

// ─── Types ───────────────────────────────────────────────────────────

export interface EngagementResult {
  success: boolean;
  message: string;
  error?: string;
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
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate an OAuth 1.0a Authorization header.
 *
 * For JSON-body endpoints (Content-Type: application/json) the body parameters
 * must NOT be included in the signature base string — only oauth_ params are signed.
 * Pass bodyParams only for application/x-www-form-urlencoded requests.
 */
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

  // Combine all params for the signature base string
  const allParams: Record<string, string> = { ...oauthParams, ...(bodyParams || {}) };

  const paramString = Object.keys(allParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
    .join('&');

  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;

  const signingKey = `${percentEncode(credentials.apiSecret)}&${percentEncode(credentials.accessTokenSecret)}`;

  const signature = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');

  oauthParams['oauth_signature'] = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

// ─── Credential Loading ──────────────────────────────────────────────

/**
 * Load OAuth 1.0a credentials for a specific account.
 *
 * Resolution order:
 *   1. Per-account tokens (oauthAccessToken + oauthAccessTokenSecret from accounts table)
 *      combined with the global API Key + API Secret from xApiSettings.
 *   2. Global credentials from xApiSettings as a fallback.
 */
async function getOAuthCredentials(accountId: number): Promise<OAuthCredentials | null> {
  const settings = await db.query.xApiSettings.findFirst({
    where: eq(xApiSettings.userId, 1),
  });

  if (!settings?.apiKey || !settings?.apiSecret) {
    logger.error({ accountId }, 'Missing global API Key / API Secret in x_api_settings');
    return null;
  }

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
  });

  if (account?.oauthAccessToken && account?.oauthAccessTokenSecret) {
    logger.info({ accountId, oauthUsername: account.oauthUsername }, 'Using per-account OAuth tokens');
    return {
      apiKey: decrypt(settings.apiKey),
      apiSecret: decrypt(settings.apiSecret),
      accessToken: decrypt(account.oauthAccessToken),
      accessTokenSecret: decrypt(account.oauthAccessTokenSecret),
    };
  }

  if (!settings.accessToken || !settings.accessTokenSecret) {
    logger.error(
      { accountId },
      'No per-account OAuth tokens and no global Access Token / Secret in x_api_settings',
    );
    return null;
  }

  logger.info({ accountId }, 'Falling back to global OAuth tokens for account');
  return {
    apiKey: decrypt(settings.apiKey),
    apiSecret: decrypt(settings.apiSecret),
    accessToken: decrypt(settings.accessToken),
    accessTokenSecret: decrypt(settings.accessTokenSecret),
  };
}

// ─── User ID Resolution ──────────────────────────────────────────────

/**
 * Resolve the authenticated X user ID for the given account.
 *
 * Calls GET /2/users/me and returns the numeric user ID string.
 * The result should be cached on the account row (xUserId) in a future schema update.
 */
async function resolveUserId(
  accountId: number,
  credentials: OAuthCredentials,
): Promise<string | null> {
  const url = `${X_API_BASE}/2/users/me`;
  const authHeader = generateOAuthHeader('GET', url, credentials);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      const err: XApiError = await response.json().catch(() => ({}));
      logger.error(
        { accountId, status: response.status, err },
        'Failed to resolve user ID via /2/users/me',
      );
      return null;
    }

    const data = await response.json();
    const userId: string | undefined = data.data?.id;

    if (!userId) {
      logger.error({ accountId, data }, 'No id in /2/users/me response');
      return null;
    }

    return userId;
  } catch (error: any) {
    logger.error({ accountId, err: error.message }, 'Network error while resolving user ID');
    return null;
  }
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

/**
 * Build a standardized EngagementResult for HTTP error responses.
 */
function buildErrorResult(
  status: number,
  errorData: XApiError,
  headers: Headers,
  action: string,
  accountId: number,
): EngagementResult {
  const rateLimit = parseRateLimitHeaders(headers);
  if (rateLimit) {
    logger.info(
      { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt.toISOString() },
      'Rate limit status',
    );
  }

  if (status === 429) {
    const retryAfter = headers.get('retry-after') || 'unknown';
    logger.error({ accountId, action, retryAfter }, 'Rate limited by X API');
    return {
      success: false,
      message: `Rate limited. Retry after ${retryAfter} seconds.`,
      error: 'RATE_LIMITED',
    };
  }

  if (status === 401) {
    logger.error({ accountId, action, errorData }, 'Unauthorized — OAuth credentials invalid or expired');
    return {
      success: false,
      message: 'OAuth credentials are invalid or expired. Reconnect the account.',
      error: 'UNAUTHORIZED',
    };
  }

  if (status === 403) {
    const detail = errorData.detail || errorData.title || `HTTP ${status}`;
    logger.error({ accountId, action, errorData }, 'Forbidden — check API plan and permissions');
    return {
      success: false,
      message: `API access denied: ${detail}. Check your X API plan and app permissions.`,
      error: 'FORBIDDEN',
    };
  }

  const detail = errorData.detail || errorData.title || `HTTP ${status}`;
  logger.error({ accountId, action, status, errorData }, `${action} API call failed`);
  return {
    success: false,
    message: `${action} failed: ${detail}`,
    error: `API_ERROR_${status}`,
  };
}

// ─── API Usage Tracking ──────────────────────────────────────────────

/**
 * Record an engagement action in the api_usage_tracking table.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE for atomic upsert.
 * Non-fatal — errors are logged but do not affect the caller.
 */
async function recordApiUsage(accountId: number): Promise<void> {
  const month = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    await db
      .insert(apiUsageTracking)
      .values({ accountId, month, tweetCount: 1, lastPostedAt: now })
      .onDuplicateKeyUpdate({
        set: {
          tweetCount: sql`${apiUsageTracking.tweetCount} + 1`,
          lastPostedAt: now,
        },
      });

    logger.info({ accountId, month }, 'API engagement usage recorded');
  } catch (error: any) {
    logger.error({ accountId, month, err: error.message }, 'Failed to record API engagement usage');
  }
}

// ─── Shared Setup Helper ─────────────────────────────────────────────

/**
 * Load credentials and resolve the authenticated user ID.
 * Returns null for both on any error so callers can return early.
 */
async function setup(
  accountId: number,
  action: string,
): Promise<{ credentials: OAuthCredentials; userId: string } | null> {
  const credentials = await getOAuthCredentials(accountId);
  if (!credentials) {
    logger.error({ accountId, action }, 'OAuth credentials not configured');
    return null;
  }

  const userId = await resolveUserId(accountId, credentials);
  if (!userId) {
    logger.error({ accountId, action }, 'Failed to resolve authenticated user ID');
    return null;
  }

  return { credentials, userId };
}

// ─── Like ────────────────────────────────────────────────────────────

/**
 * Like a tweet via POST /2/users/:id/likes
 */
export async function likePost(accountId: number, tweetId: string): Promise<EngagementResult> {
  const ctx = await setup(accountId, 'likePost');
  if (!ctx) {
    return {
      success: false,
      message: 'X API OAuth credentials not configured. Set them in Settings > X API.',
      error: 'MISSING_CREDENTIALS',
    };
  }

  const { credentials, userId } = ctx;
  const url = `${X_API_BASE}/2/users/${userId}/likes`;
  const authHeader = generateOAuthHeader('POST', url, credentials);

  logger.info({ accountId, tweetId }, 'Liking tweet via API v2');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tweet_id: tweetId }),
    });

    if (!response.ok) {
      const errorData: XApiError = await response.json().catch(() => ({}));
      return buildErrorResult(response.status, errorData, response.headers, 'likePost', accountId);
    }

    logger.info({ accountId, tweetId }, 'Tweet liked successfully via API v2');
    await recordApiUsage(accountId);
    return { success: true, message: 'Tweet liked successfully' };
  } catch (error: any) {
    logger.error({ accountId, tweetId, err: error.message }, 'likePost network error');
    return { success: false, message: `Failed to like tweet: ${error.message}`, error: error.message };
  }
}

// ─── Unlike ──────────────────────────────────────────────────────────

/**
 * Unlike a tweet via DELETE /2/users/:id/likes/:tweet_id
 */
export async function unlikePost(accountId: number, tweetId: string): Promise<EngagementResult> {
  const ctx = await setup(accountId, 'unlikePost');
  if (!ctx) {
    return {
      success: false,
      message: 'X API OAuth credentials not configured. Set them in Settings > X API.',
      error: 'MISSING_CREDENTIALS',
    };
  }

  const { credentials, userId } = ctx;
  const url = `${X_API_BASE}/2/users/${userId}/likes/${tweetId}`;
  const authHeader = generateOAuthHeader('DELETE', url, credentials);

  logger.info({ accountId, tweetId }, 'Unliking tweet via API v2');

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      const errorData: XApiError = await response.json().catch(() => ({}));
      return buildErrorResult(response.status, errorData, response.headers, 'unlikePost', accountId);
    }

    logger.info({ accountId, tweetId }, 'Tweet unliked successfully via API v2');
    return { success: true, message: 'Tweet unliked successfully' };
  } catch (error: any) {
    logger.error({ accountId, tweetId, err: error.message }, 'unlikePost network error');
    return { success: false, message: `Failed to unlike tweet: ${error.message}`, error: error.message };
  }
}

// ─── Retweet ─────────────────────────────────────────────────────────

/**
 * Retweet a tweet via POST /2/users/:id/retweets
 */
export async function retweet(accountId: number, tweetId: string): Promise<EngagementResult> {
  const ctx = await setup(accountId, 'retweet');
  if (!ctx) {
    return {
      success: false,
      message: 'X API OAuth credentials not configured. Set them in Settings > X API.',
      error: 'MISSING_CREDENTIALS',
    };
  }

  const { credentials, userId } = ctx;
  const url = `${X_API_BASE}/2/users/${userId}/retweets`;
  const authHeader = generateOAuthHeader('POST', url, credentials);

  logger.info({ accountId, tweetId }, 'Retweeting tweet via API v2');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tweet_id: tweetId }),
    });

    if (!response.ok) {
      const errorData: XApiError = await response.json().catch(() => ({}));
      return buildErrorResult(response.status, errorData, response.headers, 'retweet', accountId);
    }

    logger.info({ accountId, tweetId }, 'Tweet retweeted successfully via API v2');
    await recordApiUsage(accountId);
    return { success: true, message: 'Tweet retweeted successfully' };
  } catch (error: any) {
    logger.error({ accountId, tweetId, err: error.message }, 'retweet network error');
    return { success: false, message: `Failed to retweet: ${error.message}`, error: error.message };
  }
}

// ─── Unretweet ───────────────────────────────────────────────────────

/**
 * Undo a retweet via DELETE /2/users/:id/retweets/:tweet_id
 */
export async function unretweet(accountId: number, tweetId: string): Promise<EngagementResult> {
  const ctx = await setup(accountId, 'unretweet');
  if (!ctx) {
    return {
      success: false,
      message: 'X API OAuth credentials not configured. Set them in Settings > X API.',
      error: 'MISSING_CREDENTIALS',
    };
  }

  const { credentials, userId } = ctx;
  const url = `${X_API_BASE}/2/users/${userId}/retweets/${tweetId}`;
  const authHeader = generateOAuthHeader('DELETE', url, credentials);

  logger.info({ accountId, tweetId }, 'Unretweeting tweet via API v2');

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      const errorData: XApiError = await response.json().catch(() => ({}));
      return buildErrorResult(response.status, errorData, response.headers, 'unretweet', accountId);
    }

    logger.info({ accountId, tweetId }, 'Tweet unretweeted successfully via API v2');
    return { success: true, message: 'Retweet removed successfully' };
  } catch (error: any) {
    logger.error({ accountId, tweetId, err: error.message }, 'unretweet network error');
    return { success: false, message: `Failed to unretweet: ${error.message}`, error: error.message };
  }
}

// ─── Reply ───────────────────────────────────────────────────────────

/**
 * Reply to a tweet via POST /2/tweets with the reply field.
 *
 * The reply.in_reply_to_tweet_id field tells X to thread this tweet
 * as a reply to the given tweet ID.
 */
export async function replyToPost(
  accountId: number,
  tweetId: string,
  text: string,
): Promise<EngagementResult> {
  const credentials = await getOAuthCredentials(accountId);
  if (!credentials) {
    return {
      success: false,
      message: 'X API OAuth credentials not configured. Set them in Settings > X API.',
      error: 'MISSING_CREDENTIALS',
    };
  }

  const url = `${X_API_BASE}/2/tweets`;
  // JSON body: body params are NOT included in the OAuth signature base for JSON requests
  const authHeader = generateOAuthHeader('POST', url, credentials);

  const payload = {
    text,
    reply: {
      in_reply_to_tweet_id: tweetId,
    },
  };

  logger.info({ accountId, tweetId, textLength: text.length }, 'Replying to tweet via API v2');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData: XApiError = await response.json().catch(() => ({}));
      return buildErrorResult(response.status, errorData, response.headers, 'replyToPost', accountId);
    }

    const data = await response.json();
    const replyTweetId: string | undefined = data.data?.id;

    logger.info({ accountId, tweetId, replyTweetId }, 'Reply posted successfully via API v2');
    await recordApiUsage(accountId);
    return { success: true, message: 'Reply posted successfully' };
  } catch (error: any) {
    logger.error({ accountId, tweetId, err: error.message }, 'replyToPost network error');
    return { success: false, message: `Failed to post reply: ${error.message}`, error: error.message };
  }
}

// ─── Follow ──────────────────────────────────────────────────────────

/**
 * Follow a user via POST /2/users/:id/following
 *
 * @param targetUserId - The numeric X user ID of the user to follow (not the @username)
 */
export async function followUser(
  accountId: number,
  targetUserId: string,
): Promise<EngagementResult> {
  const ctx = await setup(accountId, 'followUser');
  if (!ctx) {
    return {
      success: false,
      message: 'X API OAuth credentials not configured. Set them in Settings > X API.',
      error: 'MISSING_CREDENTIALS',
    };
  }

  const { credentials, userId } = ctx;
  const url = `${X_API_BASE}/2/users/${userId}/following`;
  const authHeader = generateOAuthHeader('POST', url, credentials);

  logger.info({ accountId, targetUserId }, 'Following user via API v2');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target_user_id: targetUserId }),
    });

    if (!response.ok) {
      const errorData: XApiError = await response.json().catch(() => ({}));
      return buildErrorResult(response.status, errorData, response.headers, 'followUser', accountId);
    }

    const data = await response.json();
    // X API returns { data: { following: true } } on success
    // or { data: { following: true, pending_follow: true } } for protected accounts
    const isPending: boolean = data.data?.pending_follow === true;

    if (isPending) {
      logger.info({ accountId, targetUserId }, 'Follow request sent (account is protected)');
      return { success: true, message: 'Follow request sent (account is protected)' };
    }

    logger.info({ accountId, targetUserId }, 'User followed successfully via API v2');
    await recordApiUsage(accountId);
    return { success: true, message: 'User followed successfully' };
  } catch (error: any) {
    logger.error({ accountId, targetUserId, err: error.message }, 'followUser network error');
    return { success: false, message: `Failed to follow user: ${error.message}`, error: error.message };
  }
}

// ─── Unfollow ────────────────────────────────────────────────────────

/**
 * Unfollow a user via DELETE /2/users/:source_user_id/following/:target_user_id
 *
 * @param targetUserId - The numeric X user ID of the user to unfollow (not the @username)
 */
export async function unfollowUser(
  accountId: number,
  targetUserId: string,
): Promise<EngagementResult> {
  const ctx = await setup(accountId, 'unfollowUser');
  if (!ctx) {
    return {
      success: false,
      message: 'X API OAuth credentials not configured. Set them in Settings > X API.',
      error: 'MISSING_CREDENTIALS',
    };
  }

  const { credentials, userId } = ctx;
  const url = `${X_API_BASE}/2/users/${userId}/following/${targetUserId}`;
  const authHeader = generateOAuthHeader('DELETE', url, credentials);

  logger.info({ accountId, targetUserId }, 'Unfollowing user via API v2');

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      const errorData: XApiError = await response.json().catch(() => ({}));
      return buildErrorResult(response.status, errorData, response.headers, 'unfollowUser', accountId);
    }

    logger.info({ accountId, targetUserId }, 'User unfollowed successfully via API v2');
    return { success: true, message: 'User unfollowed successfully' };
  } catch (error: any) {
    logger.error({ accountId, targetUserId, err: error.message }, 'unfollowUser network error');
    return { success: false, message: `Failed to unfollow user: ${error.message}`, error: error.message };
  }
}
