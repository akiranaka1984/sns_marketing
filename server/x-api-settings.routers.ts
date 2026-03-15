import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { db } from "./db";
import { xApiSettings, apiUsageTracking } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { testApiV2Connection } from "./x-api-v2-poster";
import { ensureEncrypted, decrypt } from "./utils/encryption";

import { createLogger } from "./utils/logger";

const logger = createLogger("x-api-settings.routers");

/**
 * X API Settings Router
 * Manages X (Twitter) API credentials
 */
export const xApiSettingsRouter = router({
  /**
   * Get X API settings for current user
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id || 1;

    const settings = await db.query.xApiSettings.findFirst({
      where: eq(xApiSettings.userId, userId),
    });

    if (!settings) {
      return {
        configured: false,
        apiKey: "",
        apiSecret: "",
        bearerToken: "",
        accessToken: "",
        accessTokenSecret: "",
        apiTier: "free" as const,
        oauthConfigured: false,
        lastTestedAt: null,
        testResult: null,
      };
    }

    // Decrypt sensitive credential fields before returning to client
    const decryptedApiKey = settings.apiKey ? decrypt(settings.apiKey) : "";
    const decryptedApiSecret = settings.apiSecret ? decrypt(settings.apiSecret) : "";
    const decryptedBearerToken = settings.bearerToken ? decrypt(settings.bearerToken) : "";
    const decryptedAccessToken = settings.accessToken ? decrypt(settings.accessToken) : "";
    const decryptedAccessTokenSecret = settings.accessTokenSecret ? decrypt(settings.accessTokenSecret) : "";

    return {
      configured: !!settings.bearerToken,
      apiKey: decryptedApiKey,
      apiSecret: decryptedApiSecret,
      bearerToken: decryptedBearerToken,
      accessToken: decryptedAccessToken,
      accessTokenSecret: decryptedAccessTokenSecret,
      apiTier: settings.apiTier || "free",
      oauthConfigured: !!(decryptedApiKey && decryptedApiSecret && decryptedAccessToken && decryptedAccessTokenSecret),
      lastTestedAt: settings.lastTestedAt,
      testResult: settings.testResult,
    };
  }),

  /**
   * Save X API settings
   */
  save: protectedProcedure
    .input(z.object({
      apiKey: z.string().optional(),
      apiSecret: z.string().optional(),
      bearerToken: z.string().optional(),
      accessToken: z.string().optional(),
      accessTokenSecret: z.string().optional(),
      apiTier: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id || 1;

      // Check if settings exist
      const existing = await db.query.xApiSettings.findFirst({
        where: eq(xApiSettings.userId, userId),
      });

      // Encrypt sensitive credentials before storing in database
      const encApiKey = input.apiKey ? ensureEncrypted(input.apiKey) : undefined;
      const encApiSecret = input.apiSecret ? ensureEncrypted(input.apiSecret) : undefined;
      const encBearerToken = input.bearerToken ? ensureEncrypted(input.bearerToken) : undefined;
      const encAccessToken = input.accessToken ? ensureEncrypted(input.accessToken) : undefined;
      const encAccessTokenSecret = input.accessTokenSecret ? ensureEncrypted(input.accessTokenSecret) : undefined;

      if (existing) {
        // Update existing
        await db.update(xApiSettings)
          .set({
            apiKey: encApiKey ?? existing.apiKey,
            apiSecret: encApiSecret ?? existing.apiSecret,
            bearerToken: encBearerToken ?? existing.bearerToken,
            accessToken: encAccessToken ?? existing.accessToken,
            accessTokenSecret: encAccessTokenSecret ?? existing.accessTokenSecret,
            apiTier: input.apiTier ?? existing.apiTier,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(xApiSettings.userId, userId));
      } else {
        // Insert new
        await db.insert(xApiSettings).values({
          userId,
          apiKey: encApiKey || null,
          apiSecret: encApiSecret || null,
          bearerToken: encBearerToken || null,
          accessToken: encAccessToken || null,
          accessTokenSecret: encAccessTokenSecret || null,
          apiTier: input.apiTier || 'free',
        });
      }

      return {
        success: true,
        message: "X API設定を保存しました",
      };
    }),

  /**
   * Test X API connection using Bearer Token
   */
  testConnection: protectedProcedure
    .input(z.object({
      bearerToken: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id || 1;

      try {
        // Test the Bearer Token by fetching a user
        const response = await fetch(
          "https://api.twitter.com/2/users/by/username/twitter",
          {
            headers: {
              Authorization: `Bearer ${input.bearerToken}`,
            },
          }
        );

        const testResult = response.ok ? "success" : "failed";
        const now = new Date().toISOString();

        // Update test result in database
        const existing = await db.query.xApiSettings.findFirst({
          where: eq(xApiSettings.userId, userId),
        });

        if (existing) {
          await db.update(xApiSettings)
            .set({
              lastTestedAt: now,
              testResult,
            })
            .where(eq(xApiSettings.userId, userId));
        }

        if (response.ok) {
          return {
            success: true,
            message: "接続成功: X APIが正常に動作しています",
          };
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.errors?.[0]?.message || response.statusText;

          if (response.status === 401) {
            return {
              success: false,
              message: "接続失敗: Bearer Tokenが無効です",
            };
          } else if (response.status === 403) {
            return {
              success: false,
              message: "接続失敗: アクセスが拒否されました（API権限を確認してください）",
            };
          } else if (response.status === 429) {
            return {
              success: false,
              message: "接続失敗: レート制限に達しました",
            };
          } else {
            return {
              success: false,
              message: `接続失敗: ${errorMessage}`,
            };
          }
        }
      } catch (error: any) {
        logger.error("[X API] Connection test failed:", error);
        return {
          success: false,
          message: `接続失敗: ${error.message}`,
        };
      }
    }),

  /**
   * Test X API v2 OAuth 1.0a connection (for posting)
   * Uses the saved credentials to call GET /2/users/me
   */
  testOAuthConnection: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const result = await testApiV2Connection();

        if (result.success) {
          const userId = ctx.user?.id || 1;
          const now = new Date().toISOString();

          await db.update(xApiSettings)
            .set({ lastTestedAt: now, testResult: 'oauth_success' })
            .where(eq(xApiSettings.userId, userId));

          return {
            success: true,
            message: `OAuth接続成功: @${result.username} として認証されました`,
            username: result.username,
          };
        }

        return {
          success: false,
          message: `OAuth接続失敗: ${result.error}`,
        };
      } catch (error: any) {
        logger.error("[X API] OAuth connection test failed:", error);
        return {
          success: false,
          message: `OAuth接続失敗: ${error.message}`,
        };
      }
    }),

  /**
   * Get API usage statistics for the current month.
   * Returns total tweet count across all accounts and a per-account breakdown.
   */
  getApiUsage: protectedProcedure.query(async () => {
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    // Per-account breakdown for the current month
    const rows = await db
      .select({
        accountId: apiUsageTracking.accountId,
        tweetCount: apiUsageTracking.tweetCount,
        lastPostedAt: apiUsageTracking.lastPostedAt,
      })
      .from(apiUsageTracking)
      .where(eq(apiUsageTracking.month, currentMonth));

    const totalTweets = rows.reduce((acc, row) => acc + (row.tweetCount ?? 0), 0);

    return {
      month: currentMonth,
      totalTweets,
      perAccount: rows,
    };
  }),

  /**
   * Get the monthly tweet limit based on the API tier configured in xApiSettings.
   * Tier limits (tweets per month):
   *   free:       500
   *   basic:    3,000
   *   pro:    300,000
   *   enterprise: unlimited (represented as null)
   */
  getMonthlyLimit: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id || 1;

    const settings = await db.query.xApiSettings.findFirst({
      where: eq(xApiSettings.userId, userId),
    });

    const tier = settings?.apiTier ?? 'free';

    const limits: Record<string, number | null> = {
      free: 500,
      basic: 3000,
      pro: 300000,
      enterprise: null,
    };

    return {
      tier,
      monthlyLimit: limits[tier] ?? 500,
    };
  }),
});
