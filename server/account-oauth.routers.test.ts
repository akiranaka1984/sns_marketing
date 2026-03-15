/**
 * Tests for server/account-oauth.routers.ts
 *
 * Covers:
 *   - pendingOAuthRequests in-memory store (set / get / cleanup)
 *   - buildOAuthHeader internals via exchangeForAccessToken
 *   - accountOAuthRouter.getOAuthStatus — status query
 *   - accountOAuthRouter.disconnectAccount — clears tokens
 *   - accountOAuthRouter.startOAuthFlow — missing credentials, account not found,
 *     X API error, and happy path (mocked fetch)
 *   - exchangeForAccessToken — success and error propagation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../drizzle/schema", () => ({
  xApiSettings: {},
  accounts: {},
}));

const mockXApiSettingsFind = vi.fn();
const mockAccountsFind = vi.fn();
const mockUpdate = vi.fn(() => ({
  set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })),
}));

vi.mock("./db", () => ({
  db: {
    query: {
      xApiSettings: { findFirst: mockXApiSettingsFind },
      accounts: { findFirst: mockAccountsFind },
    },
    update: () => mockUpdate(),
  },
}));

vi.mock("./db/index", () => ({
  db: {
    query: {
      xApiSettings: { findFirst: mockXApiSettingsFind },
      accounts: { findFirst: mockAccountsFind },
    },
    update: () => mockUpdate(),
  },
}));

// Global fetch mock for X API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─── Context factory ──────────────────────────────────────────────────────────

function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-open-id",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "admin",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_CONSUMER = {
  id: 1,
  userId: 1,
  apiKey: "consumer_key",
  apiSecret: "consumer_secret",
  accessToken: "global_access_token",
  accessTokenSecret: "global_access_secret",
};

const MOCK_ACCOUNT = {
  id: 42,
  userId: 1,
  username: "testuser",
  platform: "twitter" as const,
  status: "active",
  oauthAccessToken: null,
  oauthAccessTokenSecret: null,
  oauthTokenStatus: "not_connected",
  oauthUsername: null,
  oauthConnectedAt: null,
};

// ─── Tests: pendingOAuthRequests store ───────────────────────────────────────

describe("pendingOAuthRequests", () => {
  it("can set and retrieve an entry", async () => {
    const { pendingOAuthRequests } = await import("./account-oauth.routers");

    pendingOAuthRequests.set("token_abc", {
      oauthTokenSecret: "secret_xyz",
      accountId: 10,
      createdAt: Date.now(),
    });

    const entry = pendingOAuthRequests.get("token_abc");
    expect(entry).toBeDefined();
    expect(entry?.oauthTokenSecret).toBe("secret_xyz");
    expect(entry?.accountId).toBe(10);

    // Cleanup
    pendingOAuthRequests.delete("token_abc");
  });

  it("returns undefined for unknown tokens", async () => {
    const { pendingOAuthRequests } = await import("./account-oauth.routers");
    expect(pendingOAuthRequests.get("nonexistent_token")).toBeUndefined();
  });

  it("allows deletion of an entry", async () => {
    const { pendingOAuthRequests } = await import("./account-oauth.routers");

    pendingOAuthRequests.set("delete_me", {
      oauthTokenSecret: "s",
      accountId: 1,
      createdAt: Date.now(),
    });
    pendingOAuthRequests.delete("delete_me");

    expect(pendingOAuthRequests.get("delete_me")).toBeUndefined();
  });
});

// ─── Tests: accountOAuthRouter via tRPC caller ───────────────────────────────

describe("accountOAuthRouter.getOAuthStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not_connected status for account without tokens", async () => {
    mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    const result = await caller.accountOAuth.getOAuthStatus({ accountId: 42 });

    expect(result.accountId).toBe(42);
    expect(result.oauthTokenStatus).toBe("not_connected");
    expect(result.oauthUsername).toBeNull();
  });

  it("returns active status for account with connected tokens", async () => {
    mockAccountsFind.mockResolvedValue({
      ...MOCK_ACCOUNT,
      oauthTokenStatus: "active",
      oauthUsername: "@realuser",
      oauthConnectedAt: "2026-01-01 00:00:00",
    });

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    const result = await caller.accountOAuth.getOAuthStatus({ accountId: 42 });

    expect(result.oauthTokenStatus).toBe("active");
    expect(result.oauthUsername).toBe("@realuser");
    expect(result.oauthConnectedAt).toBe("2026-01-01 00:00:00");
  });

  it("throws NOT_FOUND when account does not exist", async () => {
    mockAccountsFind.mockResolvedValue(null);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    await expect(caller.accountOAuth.getOAuthStatus({ accountId: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND when account belongs to a different user", async () => {
    mockAccountsFind.mockResolvedValue({ ...MOCK_ACCOUNT, userId: 99 }); // belongs to user 99

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx(1)); // authenticated as user 1

    await expect(caller.accountOAuth.getOAuthStatus({ accountId: 42 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("accountOAuthRouter.disconnectAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns { success: true } on successful disconnect", async () => {
    mockAccountsFind.mockResolvedValue({
      ...MOCK_ACCOUNT,
      oauthAccessToken: "old_token",
      oauthAccessTokenSecret: "old_secret",
      oauthTokenStatus: "active",
    });

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    const result = await caller.accountOAuth.disconnectAccount({ accountId: 42 });

    expect(result.success).toBe(true);
  });

  it("calls db.update to clear OAuth fields", async () => {
    mockAccountsFind.mockResolvedValue({
      ...MOCK_ACCOUNT,
      oauthAccessToken: "old_token",
      oauthAccessTokenSecret: "old_secret",
      oauthTokenStatus: "active",
    });

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    await caller.accountOAuth.disconnectAccount({ accountId: 42 });

    // db.update should have been called once
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("throws NOT_FOUND when account not found", async () => {
    mockAccountsFind.mockResolvedValue(null);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.accountOAuth.disconnectAccount({ accountId: 999 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("accountOAuthRouter.startOAuthFlow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when account does not exist", async () => {
    mockAccountsFind.mockResolvedValue(null);
    mockXApiSettingsFind.mockResolvedValue(MOCK_CONSUMER);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.accountOAuth.startOAuthFlow({ accountId: 999 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when account belongs to a different user", async () => {
    mockAccountsFind.mockResolvedValue({ ...MOCK_ACCOUNT, userId: 99 });
    mockXApiSettingsFind.mockResolvedValue(MOCK_CONSUMER);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx(1));

    await expect(
      caller.accountOAuth.startOAuthFlow({ accountId: 42 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws PRECONDITION_FAILED when consumer credentials not configured", async () => {
    mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
    mockXApiSettingsFind.mockResolvedValue(null); // no credentials

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.accountOAuth.startOAuthFlow({ accountId: 42 }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("throws PRECONDITION_FAILED when apiKey is empty string", async () => {
    mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
    mockXApiSettingsFind.mockResolvedValue({ ...MOCK_CONSUMER, apiKey: "" });

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.accountOAuth.startOAuthFlow({ accountId: 42 }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("throws INTERNAL_SERVER_ERROR when X request_token endpoint fails", async () => {
    mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
    mockXApiSettingsFind.mockResolvedValue(MOCK_CONSUMER);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Could not authenticate"),
    });

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.accountOAuth.startOAuthFlow({ accountId: 42 }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("throws INTERNAL_SERVER_ERROR when X response has no oauth_token", async () => {
    mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
    mockXApiSettingsFind.mockResolvedValue(MOCK_CONSUMER);
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("oauth_callback_confirmed=true"),
      // Note: no oauth_token in response
    });

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.accountOAuth.startOAuthFlow({ accountId: 42 }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("returns authUrl and oauthToken on successful request_token", async () => {
    mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
    mockXApiSettingsFind.mockResolvedValue(MOCK_CONSUMER);
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          "oauth_token=req_token_123&oauth_token_secret=req_secret_456&oauth_callback_confirmed=true",
        ),
    });

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeCtx());

    const result = await caller.accountOAuth.startOAuthFlow({ accountId: 42 });

    expect(result.oauthToken).toBe("req_token_123");
    expect(result.authUrl).toContain("oauth_token=req_token_123");
    expect(result.authUrl).toContain("api.twitter.com/oauth/authorize");
  });

  it("stores pending request entry after successful request_token", async () => {
    mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
    mockXApiSettingsFind.mockResolvedValue(MOCK_CONSUMER);
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          "oauth_token=pending_tok&oauth_token_secret=pending_sec&oauth_callback_confirmed=true",
        ),
    });

    const { appRouter } = await import("./routers");
    const { pendingOAuthRequests } = await import("./account-oauth.routers");
    const caller = appRouter.createCaller(makeCtx());

    await caller.accountOAuth.startOAuthFlow({ accountId: 42 });

    const entry = pendingOAuthRequests.get("pending_tok");
    expect(entry).toBeDefined();
    expect(entry?.accountId).toBe(42);
    expect(entry?.oauthTokenSecret).toBe("pending_sec");

    // Cleanup
    pendingOAuthRequests.delete("pending_tok");
  });
});

// ─── Tests: exchangeForAccessToken ───────────────────────────────────────────

describe("exchangeForAccessToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns parsed URLSearchParams on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          "oauth_token=access_tok&oauth_token_secret=access_sec&screen_name=johndoe&user_id=999",
        ),
    });

    const { exchangeForAccessToken } = await import("./account-oauth.routers");
    const params = await exchangeForAccessToken(
      "consumer_key",
      "consumer_secret",
      "req_token",
      "req_secret",
      "verifier_code",
    );

    expect(params.get("oauth_token")).toBe("access_tok");
    expect(params.get("oauth_token_secret")).toBe("access_sec");
    expect(params.get("screen_name")).toBe("johndoe");
    expect(params.get("user_id")).toBe("999");
  });

  it("throws an Error when X access_token endpoint returns non-OK status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("oauth_problem=token_rejected"),
    });

    const { exchangeForAccessToken } = await import("./account-oauth.routers");

    await expect(
      exchangeForAccessToken("key", "secret", "req_tok", "req_sec", "verifier"),
    ).rejects.toThrow(/401/);
  });

  it("includes oauth_verifier in the request body", async () => {
    let capturedBody = "";
    mockFetch.mockImplementation((_url: string, options: RequestInit) => {
      capturedBody = options.body?.toString() ?? "";
      return Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            "oauth_token=at&oauth_token_secret=ats&screen_name=user",
          ),
      });
    });

    const { exchangeForAccessToken } = await import("./account-oauth.routers");
    await exchangeForAccessToken("k", "s", "rt", "rs", "my_verifier_code");

    expect(capturedBody).toContain("oauth_verifier=my_verifier_code");
  });

  it("sends a POST to the X access_token URL", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    mockFetch.mockImplementation((url: string, options: RequestInit) => {
      capturedUrl = url;
      capturedMethod = options.method ?? "";
      return Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve("oauth_token=at&oauth_token_secret=ats&screen_name=user"),
      });
    });

    const { exchangeForAccessToken } = await import("./account-oauth.routers");
    await exchangeForAccessToken("k", "s", "rt", "rs", "v");

    expect(capturedUrl).toContain("api.twitter.com/oauth/access_token");
    expect(capturedMethod.toUpperCase()).toBe("POST");
  });

  it("generates an Authorization header containing OAuth fields", async () => {
    let capturedAuthHeader = "";
    mockFetch.mockImplementation((_url: string, options: RequestInit) => {
      capturedAuthHeader = (options.headers as Record<string, string>)?.["Authorization"] ?? "";
      return Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve("oauth_token=at&oauth_token_secret=ats&screen_name=user"),
      });
    });

    const { exchangeForAccessToken } = await import("./account-oauth.routers");
    await exchangeForAccessToken("consumer_k", "consumer_s", "req_t", "req_ts", "verifier");

    // oauth_verifier is used in the signature base string but NOT added to the
    // Authorization header — it is sent in the request body instead.
    expect(capturedAuthHeader).toMatch(/^OAuth /);
    expect(capturedAuthHeader).toContain("oauth_consumer_key=");
    expect(capturedAuthHeader).toContain("oauth_signature=");
    // Sanity: header should NOT contain oauth_verifier directly
    expect(capturedAuthHeader).not.toContain("oauth_verifier=");
  });
});
