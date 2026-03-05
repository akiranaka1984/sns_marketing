/**
 * SNS Posting Router
 *
 * Routes posts to the appropriate backend based on account.postingMethod:
 *   - "api_v2"     → Official X API v2 (stable, low-risk)
 *   - "playwright"  → Playwright browser automation (legacy, kept for rollback)
 *   - "duoplus"     → DuoPlus cloud phone (legacy, kept for rollback)
 *
 * The Playwright and DuoPlus code paths are UNCHANGED.
 * The api_v2 path is new and additive.
 */

import { postToXViaPlaywright } from './playwright';
import { postToXViaApiV2 } from './x-api-v2-poster';
import { db } from './db';
import { accounts } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from './utils/logger';

const logger = createLogger('sns-posting');

interface PostResult {
  success: boolean;
  message: string;
  error?: string;
  postUrl?: string;
  screenshotUrl?: string;
}

/**
 * Post to SNS based on platform and account's postingMethod.
 *
 * Routing logic:
 *   1. Look up account.postingMethod
 *   2. If "api_v2" → use official X API v2
 *   3. If "playwright" (default) → use Playwright browser automation (unchanged)
 *   4. If "duoplus" → use DuoPlus (unchanged, legacy)
 *   5. If api_v2 fails, optionally fall back to Playwright
 */
export async function postToSNS(
  platform: string,
  content: string,
  accountId: number,
  mediaUrls?: string[],
): Promise<PostResult> {
  const normalizedPlatform = platform.toLowerCase();

  if (normalizedPlatform !== 'twitter' && normalizedPlatform !== 'x') {
    return {
      success: false,
      message: `プラットフォーム "${platform}" はサポートされていません。現在はX/Twitterのみ対応しています。`,
      error: 'UNSUPPORTED_PLATFORM',
    };
  }

  // Determine posting method from account settings
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
    columns: { postingMethod: true },
  });

  const method = account?.postingMethod || 'playwright';

  // ── Route: X API v2 (new, stable) ──────────────────────────────
  if (method === 'api_v2') {
    logger.info({ accountId, method }, 'Using X API v2 mode');

    const result = await postToXViaApiV2(accountId, content, mediaUrls);

    if (result.success) {
      return {
        success: true,
        message: result.message,
        postUrl: result.postUrl,
      };
    }

    // Fallback to Playwright if API v2 fails (e.g. rate limit, credential issue)
    // This keeps the system resilient during migration
    logger.warn({ accountId, error: result.error }, 'API v2 failed, falling back to Playwright');

    const fallback = await postToXViaPlaywright(accountId, content, mediaUrls);
    return {
      success: fallback.success,
      message: fallback.success
        ? `${fallback.message} (API v2 fallback to Playwright)`
        : fallback.message,
      error: fallback.error,
    };
  }

  // ── Route: Playwright (default, unchanged) ─────────────────────
  if (method === 'playwright') {
    logger.info({ accountId, method }, 'Using Playwright mode');
    const result = await postToXViaPlaywright(accountId, content, mediaUrls);
    return {
      success: result.success,
      message: result.message,
      error: result.error,
    };
  }

  // ── Route: DuoPlus (legacy, unchanged) ─────────────────────────
  if (method === 'duoplus') {
    logger.info({ accountId, method }, 'Using DuoPlus mode (legacy)');
    // DuoPlus posting goes through Playwright as it always has
    const result = await postToXViaPlaywright(accountId, content, mediaUrls);
    return {
      success: result.success,
      message: result.message,
      error: result.error,
    };
  }

  return {
    success: false,
    message: `Unknown posting method: ${method}`,
    error: 'UNKNOWN_METHOD',
  };
}
