import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { createLogger } from "../utils/logger";

const logger = createLogger("oauth");

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Development mode: auto-login endpoint
  // Also enabled when ENABLE_DEV_LOGIN=true for production debugging
  if (process.env.NODE_ENV === "development" || process.env.ENABLE_DEV_LOGIN === "true") {
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

        console.log("[Dev Login] Test user logged in successfully");
        res.redirect(302, "/");
      } catch (error) {
        console.error("[Dev Login] Failed:", error);
        res.status(500).json({ error: "Dev login failed" });
      }
    });

    console.log("[Dev] Development login enabled at /api/dev-login");
  }
  // Admin password login endpoint
  app.post("/api/admin-login", async (req: Request, res: Response) => {
    try {
      const { password } = req.body || {};

      if (!password || typeof password !== "string") {
        res.status(400).json({ success: false, message: "パスワードを入力してください" });
        return;
      }

      const adminPassword = ENV.adminPassword;
      if (!adminPassword) {
        logger.error("[Admin Login] ADMIN_PASSWORD environment variable is not set");
        res.status(500).json({ success: false, message: "管理者パスワードが設定されていません" });
        return;
      }

      if (password !== adminPassword) {
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
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
