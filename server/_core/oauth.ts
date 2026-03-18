import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { db as drizzleDb } from "../db";
import { accounts, xApiSettings, adminSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { createLogger } from "../utils/logger";
import {
  pendingOAuthRequests,
  exchangeForAccessToken,
} from "../account-oauth.routers";
import bcrypt from "bcryptjs";
import { ensureEncrypted, decrypt } from "../utils/encryption";

const logger = createLogger("oauth");

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Development mode: auto-login endpoint
  // ENABLE_DEV_LOGIN=true is accepted only in non-production environments.
  // In production, this flag is intentionally ignored to prevent unauthorized access.
  const isDevLoginEnabled =
    process.env.NODE_ENV === "development" ||
    (process.env.ENABLE_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production");

  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_LOGIN === "true") {
    logger.warn(
      "[Dev Login] WARNING: ENABLE_DEV_LOGIN=true is set but ignored in production (NODE_ENV=production). " +
      "Remove this environment variable to suppress this warning."
    );
  }

  if (isDevLoginEnabled) {
    app.get("/api/dev-login", async (req: Request, res: Response) => {
      try {
        const testOpenId = "dev-test-user";
        const testName = "Dev User";

        // Create or update test user
        await db.upsertUser({
          openId: testOpenId,
          name: testName,
          email: "dev@test.local",
          loginMethod: "dev",
          lastSignedIn: new Date().toISOString().slice(0, 19).replace("T", " "),
        });

        // Create session token
        const sessionToken = await sdk.createSessionToken(testOpenId, {
          name: testName,
          expiresInMs: ONE_YEAR_MS,
        });

        // Set cookie and redirect
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        logger.info("[Dev Login] Test user logged in successfully");
        res.redirect(302, "/");
      } catch (error) {
        logger.error("[Dev Login] Failed:", error);
        res.status(500).json({ error: "Dev login failed" });
      }
    });

    logger.info("[Dev] Development login enabled at /api/dev-login");
  }
  // Admin password login endpoint
  app.post("/api/admin-login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body || {};

      // Validate username (must be "admin")
      if (!username || typeof username !== "string" || username !== "admin") {
        res.status(401).json({ success: false, message: "ユーザーIDが正しくありません" });
        return;
      }

      if (!password || typeof password !== "string") {
        res.status(400).json({ success: false, message: "パスワードを入力してください" });
        return;
      }

      // Fetch hashed password from DB (0 or 1 row)
      const dbSetting = await drizzleDb.query.adminSettings.findFirst();

      let isValid = false;

      if (dbSetting) {
        // DB password exists: verify with bcrypt
        isValid = await bcrypt.compare(password, dbSetting.passwordHash);
      } else {
        // Fallback: compare against ENV.adminPassword for backward compatibility
        const adminPassword = ENV.adminPassword;
        if (!adminPassword) {
          logger.error("[Admin Login] No password configured in DB or environment");
          res.status(500).json({ success: false, message: "管理者パスワードが設定されていません" });
          return;
        }
        isValid = password === adminPassword;
      }

      if (!isValid) {
        logger.warn("[Admin Login] Invalid password attempt");
        res.status(401).json({ success: false, message: "パスワードが正しくありません" });
        return;
      }

      const adminOpenId = ENV.ownerOpenId || "admin-user";
      const adminName = ENV.ownerName || "Admin";

      await db.upsertUser({
        openId: adminOpenId,
        name: adminName,
        email: null,
        loginMethod: "admin",
        lastSignedIn: new Date().toISOString().slice(0, 19).replace("T", " "),
      });

      const sessionToken = await sdk.createSessionToken(adminOpenId, {
        name: adminName,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      logger.info("[Admin Login] Admin logged in successfully");
      res.json({ success: true, message: "ログインしました" });
    } catch (error) {
      logger.error("[Admin Login] Failed:", error);
      res.status(500).json({ success: false, message: "ログインに失敗しました" });
    }
  });

  // GET /api/admin/password-status - Check if DB password is configured
  app.get("/api/admin/password-status", async (_req: Request, res: Response) => {
    try {
      const dbSetting = await drizzleDb.query.adminSettings.findFirst();
      res.json({ isSet: !!dbSetting });
    } catch (error) {
      logger.error("[Admin Password Status] Failed:", error);
      res.status(500).json({ error: "ステータスの取得に失敗しました" });
    }
  });

  // POST /api/admin/set-password - Set or change the admin password stored in DB
  app.post("/api/admin/set-password", async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body || {};

      if (!newPassword || typeof newPassword !== "string") {
        res.status(400).json({ success: false, message: "新しいパスワードを入力してください" });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ success: false, message: "パスワードは6文字以上で入力してください" });
        return;
      }

      const dbSetting = await drizzleDb.query.adminSettings.findFirst();

      if (dbSetting) {
        // Changing existing password: require both session auth AND current password
        const sessionUser = await sdk.authenticateRequest(req).catch(() => null);
        if (!sessionUser) {
          res.status(401).json({ success: false, message: "ログインが必要です" });
          return;
        }

        if (!currentPassword || typeof currentPassword !== "string") {
          res.status(400).json({ success: false, message: "現在のパスワードを入力してください" });
          return;
        }
        const isValid = await bcrypt.compare(currentPassword, dbSetting.passwordHash);
        if (!isValid) {
          res.status(401).json({ success: false, message: "現在のパスワードが正しくありません" });
          return;
        }

        // Update existing record
        const newHash = await bcrypt.hash(newPassword, 12);
        await drizzleDb
          .update(adminSettings)
          .set({ passwordHash: newHash })
          .where(eq(adminSettings.id, dbSetting.id));

        logger.info("[Admin Set Password] Password updated successfully");
        res.json({ success: true, message: "パスワードを変更しました" });
      } else {
        // Initial setup: no currentPassword required
        const newHash = await bcrypt.hash(newPassword, 12);
        await drizzleDb.insert(adminSettings).values({ passwordHash: newHash });

        logger.info("[Admin Set Password] Initial password set successfully");
        res.json({ success: true, message: "管理者パスワードを設定しました" });
      }
    } catch (error) {
      logger.error("[Admin Set Password] Failed:", error);
      res.status(500).json({ success: false, message: "パスワードの設定に失敗しました" });
    }
  });

  // ─── X OAuth 1.0a callback for individual account linking ───────────
  app.get("/api/x-oauth/callback", async (req: Request, res: Response) => {
    const oauthToken = typeof req.query["oauth_token"] === "string" ? req.query["oauth_token"] : undefined;
    const oauthVerifier = typeof req.query["oauth_verifier"] === "string" ? req.query["oauth_verifier"] : undefined;

    if (!oauthToken || !oauthVerifier) {
      logger.error("[X OAuth] Callback missing oauth_token or oauth_verifier");
      res.redirect(302, "/accounts?oauth_error=missing_params");
      return;
    }

    // Retrieve the pending request entry stored during startOAuthFlow
    const pending = pendingOAuthRequests.get(oauthToken);

    if (!pending) {
      logger.error({ oauthToken }, "[X OAuth] No pending request found for oauth_token — may have expired");
      res.redirect(302, "/accounts?oauth_error=expired_or_unknown_token");
      return;
    }

    const { oauthTokenSecret, accountId } = pending;

    // Remove the pending entry immediately — one-time use
    pendingOAuthRequests.delete(oauthToken);

    try {
      // Load consumer credentials (apiKey / apiSecret) from xApiSettings.
      // We do a best-effort lookup using userId=1 since at this point we do
      // not have a session cookie in this redirect context.
      const settingsRow = await drizzleDb.query.xApiSettings.findFirst({
        where: eq(xApiSettings.userId, 1),
      });

      if (!settingsRow?.apiKey || !settingsRow?.apiSecret) {
        logger.error("[X OAuth] Consumer credentials not configured in x_api_settings");
        res.redirect(302, `/accounts?oauth_error=missing_consumer_credentials`);
        return;
      }

      logger.info({ accountId }, "[X OAuth] Exchanging request token for access token");

      const tokenParams = await exchangeForAccessToken(
        decrypt(settingsRow.apiKey),
        decrypt(settingsRow.apiSecret),
        oauthToken,
        oauthTokenSecret,
        oauthVerifier,
      );

      const accessToken = tokenParams.get("oauth_token");
      const accessTokenSecret = tokenParams.get("oauth_token_secret");
      const screenName = tokenParams.get("screen_name");

      if (!accessToken || !accessTokenSecret) {
        logger.error({ tokenParams: tokenParams.toString() }, "[X OAuth] Missing access token in X response");
        res.redirect(302, `/accounts?oauth_error=token_exchange_failed`);
        return;
      }

      const now = new Date().toISOString();

      await drizzleDb
        .update(accounts)
        .set({
          oauthAccessToken: ensureEncrypted(accessToken),
          oauthAccessTokenSecret: ensureEncrypted(accessTokenSecret),
          oauthTokenStatus: "active",
          oauthUsername: screenName ?? null,
          oauthConnectedAt: now,
        } as any)
        .where(eq(accounts.id, accountId));

      logger.info(
        { accountId, screenName },
        "[X OAuth] Account linked successfully",
      );

      res.redirect(302, `/accounts?oauth_success=1&accountId=${accountId}`);
    } catch (error: any) {
      logger.error({ accountId, err: error.message }, "[X OAuth] Callback failed");
      res.redirect(302, `/accounts?oauth_error=${encodeURIComponent(error.message)}`);
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date().toISOString().slice(0, 19).replace("T", " "),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      logger.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
