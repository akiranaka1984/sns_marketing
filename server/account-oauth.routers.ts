/**
 * Account OAuth Router
 *
 * Implements X/Twitter 3-legged OAuth 1.0a flow for connecting individual
 * X accounts to their own Access Token + Access Token Secret.
 *
 * Flow:
 *   1. startOAuthFlow  → GET Request Token from X → return authUrl
 *   2. User authorizes on X
 *   3. X redirects to /api/x-oauth/callback with oauth_token + oauth_verifier
 *   4. Callback exchanges for Access Token and persists it to accounts table
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { db } from "./db";
import { getAccountById } from "./db";
import { xApiSettings, accounts } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "./utils/logger";
import { decrypt } from "./utils/encryption";

const logger = createLogger("account-oauth.routers");

// ─── Pending OAuth Request Storage ───────────────────────────────────
//
// Keyed by oauth_token returned from X during step 1 (Request Token).
// Entries are cleaned up after 10 minutes.

interface PendingOAuthEntry {
  oauthTokenSecret: string;
  accountId: number;
  createdAt: number;
}

export const pendingOAuthRequests = new Map<string, PendingOAuthEntry>();

const PENDING_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanupExpiredPendingRequests(): void {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [token, entry] of pendingOAuthRequests.entries()) {
    if (entry.createdAt < cutoff) {
      pendingOAuthRequests.delete(token);
    }
  }
}

// ─── OAuth 1.0a Helpers ──────────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

interface ConsumerCredentials {
  apiKey: string;
  apiSecret: string;
}

interface FullOAuthCredentials extends ConsumerCredentials {
  accessToken: string;
  accessTokenSecret: string;
}

/**
 * Build an OAuth 1.0a Authorization header.
 *
 * When exchanging a Request Token (step 1) only consumer credentials are
 * present — pass accessToken = '' and accessTokenSecret = ''.
 *
 * When exchanging for an Access Token (step 4) pass the request token as
 * accessToken and the request token secret as accessTokenSecret.
 */
function buildOAuthHeader(
  method: string,
  url: string,
  credentials: FullOAuthCredentials,
  extraParams: Record<string, string> = {},
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_version: "1.0",
  };

  // oauth_token is only included when we have one (not for request_token step)
  if (credentials.accessToken) {
    oauthParams["oauth_token"] = credentials.accessToken;
  }

  // Combine oauth params + any extra params for the signature base string
  const allParams: Record<string, string> = { ...oauthParams, ...extraParams };

  const paramString = Object.keys(allParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
    .join("&");

  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;

  // Signing key = consumer_secret & token_secret (token_secret empty on step 1)
  const signingKey = `${percentEncode(credentials.apiSecret)}&${percentEncode(credentials.accessTokenSecret)}`;

  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  oauthParams["oauth_signature"] = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}

// ─── Consumer Credential Loading ──────────────────────────────────────

async function getConsumerCredentials(
  userId: number,
): Promise<ConsumerCredentials | null> {
  const [settings] = await db
    .select()
    .from(xApiSettings)
    .where(eq(xApiSettings.userId, userId))
    .limit(1);

  if (!settings?.apiKey || !settings?.apiSecret) {
    logger.error(
      { userId },
      "Missing consumer credentials (apiKey / apiSecret) in x_api_settings",
    );
    return null;
  }

  return { apiKey: decrypt(settings.apiKey), apiSecret: decrypt(settings.apiSecret) };
}

// ─── X OAuth Endpoints ────────────────────────────────────────────────

const REQUEST_TOKEN_URL = "https://api.twitter.com/oauth/request_token";
const ACCESS_TOKEN_URL = "https://api.twitter.com/oauth/access_token";
const AUTHORIZE_URL = "https://api.twitter.com/oauth/authorize";

// ─── Router ───────────────────────────────────────────────────────────

export const accountOAuthRouter = router({
  /**
   * Step 1: Begin the 3-legged OAuth flow.
   *
   * Requests a Request Token from X and returns the Authorization URL
   * the user should be redirected to.
   */
  startOAuthFlow: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the account belongs to this user
      const account = await getAccountById(input.accountId);

      if (!account || account.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found or unauthorized",
        });
      }

      // Load consumer credentials from xApiSettings
      const consumer = await getConsumerCredentials(ctx.user.id);
      if (!consumer) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "X API consumer credentials not configured. Set apiKey and apiSecret in Settings > X API.",
        });
      }

      // Clean up stale pending entries before adding a new one
      cleanupExpiredPendingRequests();

      const callbackUrl = `${process.env.OAUTH_SERVER_URL || "http://localhost:5001"}/api/x-oauth/callback`;

      // Build the Authorization header for the request_token endpoint.
      // oauth_callback is included as an extra param in the signature.
      const authHeader = buildOAuthHeader(
        "POST",
        REQUEST_TOKEN_URL,
        {
          apiKey: consumer.apiKey,
          apiSecret: consumer.apiSecret,
          accessToken: "",        // No token yet
          accessTokenSecret: "",  // No secret yet
        },
        { oauth_callback: callbackUrl },
      );

      logger.info(
        { accountId: input.accountId },
        "Requesting OAuth request token from X",
      );

      const response = await fetch(REQUEST_TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ oauth_callback: callbackUrl }).toString(),
      });

      if (!response.ok) {
        const body = await response.text();
        logger.error(
          { status: response.status, body },
          "X request_token endpoint returned an error",
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `X API returned ${response.status} when requesting token: ${body}`,
        });
      }

      const responseText = await response.text();
      const params = new URLSearchParams(responseText);

      const oauthToken = params.get("oauth_token");
      const oauthTokenSecret = params.get("oauth_token_secret");
      const callbackConfirmed = params.get("oauth_callback_confirmed");

      if (!oauthToken || !oauthTokenSecret) {
        logger.error({ responseText }, "Missing oauth_token in request_token response");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "X did not return an oauth_token. Check your consumer credentials.",
        });
      }

      if (callbackConfirmed !== "true") {
        logger.warn(
          { callbackConfirmed },
          "oauth_callback_confirmed is not 'true'",
        );
      }

      // Store the pending request so the callback can look it up
      pendingOAuthRequests.set(oauthToken, {
        oauthTokenSecret,
        accountId: input.accountId,
        createdAt: Date.now(),
      });

      const authUrl = `${AUTHORIZE_URL}?oauth_token=${oauthToken}`;

      logger.info(
        { accountId: input.accountId, oauthToken },
        "OAuth request token obtained successfully",
      );

      return { authUrl, oauthToken };
    }),

  /**
   * Query the current OAuth connection status for an account.
   */
  getOAuthStatus: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ ctx, input }) => {
      const account = await getAccountById(input.accountId);

      if (!account || account.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found or unauthorized",
        });
      }

      return {
        accountId: account.id,
        oauthTokenStatus: account.oauthTokenStatus ?? "not_connected",
        oauthUsername: account.oauthUsername ?? null,
        oauthConnectedAt: account.oauthConnectedAt ?? null,
      };
    }),

  /**
   * Disconnect a connected X OAuth account.
   * Clears the stored access tokens and resets status.
   */
  disconnectAccount: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const account = await getAccountById(input.accountId);

      if (!account || account.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found or unauthorized",
        });
      }

      await db
        .update(accounts)
        .set({
          oauthAccessToken: null,
          oauthAccessTokenSecret: null,
          oauthTokenStatus: "not_connected",
          oauthUsername: null,
          oauthConnectedAt: null,
        })
        .where(eq(accounts.id, input.accountId));

      logger.info(
        { accountId: input.accountId },
        "OAuth account disconnected",
      );

      return { success: true };
    }),
});

// ─── Access Token Exchange (used by callback route) ───────────────────

/**
 * Exchange the oauth_token + oauth_verifier (from the X callback) for a
 * permanent Access Token + Access Token Secret.
 *
 * Returns the parsed response params on success.
 */
export async function exchangeForAccessToken(
  consumerKey: string,
  consumerSecret: string,
  oauthToken: string,
  oauthTokenSecret: string,
  oauthVerifier: string,
): Promise<URLSearchParams> {
  const authHeader = buildOAuthHeader(
    "POST",
    ACCESS_TOKEN_URL,
    {
      apiKey: consumerKey,
      apiSecret: consumerSecret,
      accessToken: oauthToken,
      accessTokenSecret: oauthTokenSecret,
    },
    { oauth_verifier: oauthVerifier },
  );

  const response = await fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ oauth_verifier: oauthVerifier }).toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `X access_token endpoint returned ${response.status}: ${body}`,
    );
  }

  const text = await response.text();
  return new URLSearchParams(text);
}
