/**
 * Tests for server/x-api-v2-poster.ts
 *
 * Covers:
 *   - OAuth 1.0a signature generation (percentEncode, header structure)
 *   - postToXViaApiV2: credential resolution, fetch call, result handling
 *   - testApiV2Connection: connection test with global credentials
 *   - Rate limit / error status handling (429, 403, generic errors)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../drizzle/schema", () => ({
  xApiSettings: {},
  accounts: {},
  apiUsageTracking: {},
}));

const mockXApiSettingsFind = vi.fn();
const mockAccountsFind = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("./db", () => ({
  db: {
    query: {
      xApiSettings: { findFirst: mockXApiSettingsFind },
      accounts: { findFirst: mockAccountsFind },
    },
    insert: () => ({
      values: () =>
        mockInsert().onDuplicateKeyUpdate
          ? mockInsert()
          : { onDuplicateKeyUpdate: () => Promise.resolve() },
    }),
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
  },
}));

vi.mock("./db/index", () => ({
  db: {
    query: {
      xApiSettings: { findFirst: mockXApiSettingsFind },
      accounts: { findFirst: mockAccountsFind },
    },
    insert: () => ({ values: () => ({ onDuplicateKeyUpdate: () => Promise.resolve() }) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
  },
}));

// Global fetch mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_SETTINGS = {
  apiKey: "test_api_key",
  apiSecret: "test_api_secret",
  accessToken: "test_access_token",
  accessTokenSecret: "test_access_token_secret",
};

const MOCK_ACCOUNT = {
  id: 1,
  userId: 1,
  username: "testuser",
  xHandle: "testhandle",
  platform: "twitter",
  oauthAccessToken: null,
  oauthAccessTokenSecret: null,
};

function makeOkResponse(body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  };
}

function makeErrorResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("x-api-v2-poster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── OAuth header structure ────────────────────────────────────────────────

  describe("OAuth 1.0a header structure", () => {
    it("generated Authorization header starts with 'OAuth '", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);

      // Capture the Authorization header sent to fetch
      let capturedAuthHeader: string | undefined;
      mockFetch.mockImplementation((url: string, options: RequestInit) => {
        capturedAuthHeader = (options.headers as Record<string, string>)?.["Authorization"];
        return Promise.resolve(
          makeOkResponse({ data: { id: "tweet123" } }),
        );
      });

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      await postToXViaApiV2(1, "Hello X!");

      expect(capturedAuthHeader).toBeDefined();
      expect(capturedAuthHeader).toMatch(/^OAuth /);
    });

    it("OAuth header contains required fields", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);

      let capturedAuthHeader = "";
      mockFetch.mockImplementation((_url: string, options: RequestInit) => {
        capturedAuthHeader = (options.headers as Record<string, string>)?.["Authorization"] ?? "";
        return Promise.resolve(makeOkResponse({ data: { id: "tweet123" } }));
      });

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      await postToXViaApiV2(1, "Hello X!");

      // Required OAuth 1.0a fields
      expect(capturedAuthHeader).toContain("oauth_consumer_key=");
      expect(capturedAuthHeader).toContain("oauth_nonce=");
      expect(capturedAuthHeader).toContain("oauth_signature=");
      expect(capturedAuthHeader).toContain("oauth_signature_method=");
      expect(capturedAuthHeader).toContain("oauth_timestamp=");
      expect(capturedAuthHeader).toContain("oauth_token=");
      expect(capturedAuthHeader).toContain("oauth_version=");
    });

    it("OAuth header uses HMAC-SHA1 signature method", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);

      let capturedAuthHeader = "";
      mockFetch.mockImplementation((_url: string, options: RequestInit) => {
        capturedAuthHeader = (options.headers as Record<string, string>)?.["Authorization"] ?? "";
        return Promise.resolve(makeOkResponse({ data: { id: "tweet123" } }));
      });

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      await postToXViaApiV2(1, "Hello X!");

      expect(capturedAuthHeader).toContain("oauth_signature_method");
      // Encoded: HMAC-SHA1 → HMAC-SHA1 (percent-encoded as HMAC-SHA1)
      expect(capturedAuthHeader).toMatch(/HMAC.SHA1/);
    });

    it("nonce is unique across two calls", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);

      const headers: string[] = [];
      mockFetch.mockImplementation((_url: string, options: RequestInit) => {
        headers.push((options.headers as Record<string, string>)?.["Authorization"] ?? "");
        return Promise.resolve(makeOkResponse({ data: { id: "tweet123" } }));
      });

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      await postToXViaApiV2(1, "First call");
      await postToXViaApiV2(1, "Second call");

      expect(headers.length).toBe(2);
      // Nonces should differ between calls
      const nonceMatch1 = headers[0]?.match(/oauth_nonce="([^"]+)"/);
      const nonceMatch2 = headers[1]?.match(/oauth_nonce="([^"]+)"/);
      expect(nonceMatch1?.[1]).toBeDefined();
      expect(nonceMatch2?.[1]).toBeDefined();
      expect(nonceMatch1?.[1]).not.toBe(nonceMatch2?.[1]);
    });
  });

  // ── Credential resolution ─────────────────────────────────────────────────

  describe("credential resolution", () => {
    it("returns MISSING_CREDENTIALS error when no xApiSettings row", async () => {
      mockXApiSettingsFind.mockResolvedValue(null);
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(1, "Hello!");

      expect(result.success).toBe(false);
      expect(result.error).toBe("MISSING_CREDENTIALS");
    });

    it("returns MISSING_CREDENTIALS error when apiKey is missing from settings", async () => {
      mockXApiSettingsFind.mockResolvedValue({ ...MOCK_SETTINGS, apiKey: "" });
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(1, "Hello!");

      expect(result.success).toBe(false);
      expect(result.error).toBe("MISSING_CREDENTIALS");
    });

    it("prefers per-account OAuth tokens over global tokens", async () => {
      const perAccountSettings = {
        ...MOCK_SETTINGS,
        accessToken: "global_access_token",
        accessTokenSecret: "global_access_secret",
      };
      const perAccountAccount = {
        ...MOCK_ACCOUNT,
        oauthAccessToken: "per_account_token",
        oauthAccessTokenSecret: "per_account_secret",
        oauthUsername: "@testuser",
      };

      mockXApiSettingsFind.mockResolvedValue(perAccountSettings);
      mockAccountsFind.mockResolvedValue(perAccountAccount);

      let capturedAuthHeader = "";
      mockFetch.mockImplementation((_url: string, options: RequestInit) => {
        capturedAuthHeader = (options.headers as Record<string, string>)?.["Authorization"] ?? "";
        return Promise.resolve(makeOkResponse({ data: { id: "tweet123" } }));
      });

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      await postToXViaApiV2(1, "Hello!");

      // oauth_token in the header should reflect per-account token (percent-encoded)
      expect(capturedAuthHeader).toContain("oauth_token=");
      // The per-account token differs from global; the header should NOT contain the raw global token
      expect(capturedAuthHeader).not.toContain("global_access_token");
    });

    it("falls back to global access token when no per-account tokens", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue({
        ...MOCK_ACCOUNT,
        oauthAccessToken: null,
        oauthAccessTokenSecret: null,
      });

      let capturedAuthHeader = "";
      mockFetch.mockImplementation((_url: string, options: RequestInit) => {
        capturedAuthHeader = (options.headers as Record<string, string>)?.["Authorization"] ?? "";
        return Promise.resolve(makeOkResponse({ data: { id: "tweet123" } }));
      });

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(1, "Hello!");

      // Should succeed using global tokens
      expect(result.success).toBe(true);
      expect(capturedAuthHeader).toContain("oauth_token=");
    });
  });

  // ── postToXViaApiV2 success paths ─────────────────────────────────────────

  describe("postToXViaApiV2 — success", () => {
    it("returns success with tweetId and postUrl", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
      mockFetch.mockResolvedValue(makeOkResponse({ data: { id: "tweet_abc123" } }));

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(1, "Hello X!");

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe("tweet_abc123");
      expect(result.postUrl).toContain("tweet_abc123");
      expect(result.postUrl).toContain("x.com");
    });

    it("builds post URL using xHandle when available", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue({ ...MOCK_ACCOUNT, xHandle: "myhandle" });
      mockFetch.mockResolvedValue(makeOkResponse({ data: { id: "tid1" } }));

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(1, "Hello!");

      expect(result.postUrl).toContain("myhandle");
    });

    it("falls back to username in post URL when xHandle is absent", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue({ ...MOCK_ACCOUNT, xHandle: null, username: "fallbackuser" });
      mockFetch.mockResolvedValue(makeOkResponse({ data: { id: "tid2" } }));

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(1, "Hello!");

      expect(result.postUrl).toContain("fallbackuser");
    });

    it("returns ACCOUNT_NOT_FOUND error when account does not exist", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue(null);

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(99, "Hello!");

      expect(result.success).toBe(false);
      expect(result.error).toBe("ACCOUNT_NOT_FOUND");
    });
  });

  // ── Error / rate limit handling ───────────────────────────────────────────

  describe("postToXViaApiV2 — error handling", () => {
    it("returns RATE_LIMITED error on HTTP 429", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
      mockFetch.mockResolvedValue(
        makeErrorResponse(429, { detail: "Too Many Requests" }, { "retry-after": "60" }),
      );

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(1, "Hello!");

      expect(result.success).toBe(false);
      expect(result.error).toBe("RATE_LIMITED");
      expect(result.message).toContain("60");
    });

    it("returns FORBIDDEN error on HTTP 403", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
      mockFetch.mockResolvedValue(
        makeErrorResponse(403, { detail: "Forbidden", title: "Authorization Error" }),
      );

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(1, "Hello!");

      expect(result.success).toBe(false);
      expect(result.error).toBe("FORBIDDEN");
    });

    it("returns API_ERROR_* for other HTTP error codes", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
      mockFetch.mockResolvedValue(
        makeErrorResponse(500, { detail: "Internal Server Error" }),
      );

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(1, "Hello!");

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/^API_ERROR_/);
    });

    it("returns NO_TWEET_ID error when response has no data.id", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
      mockFetch.mockResolvedValue(makeOkResponse({ data: {} })); // id missing

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(1, "Hello!");

      expect(result.success).toBe(false);
      expect(result.error).toBe("NO_TWEET_ID");
    });

    it("handles unexpected fetch exception gracefully", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(1, "Hello!");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });
  });

  // ── testApiV2Connection ───────────────────────────────────────────────────

  describe("testApiV2Connection", () => {
    it("returns success and username when credentials are valid", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockFetch.mockResolvedValue(
        makeOkResponse({ data: { id: "u1", username: "myuser" } }),
      );

      const { testApiV2Connection } = await import("./x-api-v2-poster");
      const result = await testApiV2Connection();

      expect(result.success).toBe(true);
      expect(result.username).toBe("myuser");
    });

    it("returns failure when credentials are missing", async () => {
      mockXApiSettingsFind.mockResolvedValue(null);

      const { testApiV2Connection } = await import("./x-api-v2-poster");
      const result = await testApiV2Connection();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("returns failure when API returns non-OK status", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockFetch.mockResolvedValue(makeErrorResponse(401, { detail: "Unauthorized" }));

      const { testApiV2Connection } = await import("./x-api-v2-poster");
      const result = await testApiV2Connection();

      expect(result.success).toBe(false);
      expect(result.error).toContain("401");
    });

    it("uses GET /2/users/me endpoint", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      let capturedUrl = "";
      mockFetch.mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve(makeOkResponse({ data: { id: "u1", username: "testuser" } }));
      });

      const { testApiV2Connection } = await import("./x-api-v2-poster");
      await testApiV2Connection();

      expect(capturedUrl).toContain("/2/users/me");
    });
  });

  // ── Rate limit header parsing ─────────────────────────────────────────────

  describe("rate limit header awareness", () => {
    it("succeeds even when rate limit remaining is low", async () => {
      mockXApiSettingsFind.mockResolvedValue(MOCK_SETTINGS);
      mockAccountsFind.mockResolvedValue(MOCK_ACCOUNT);
      mockFetch.mockResolvedValue({
        ...makeOkResponse({ data: { id: "tid_rl" } }),
        headers: {
          get: (key: string) => {
            const map: Record<string, string> = {
              "x-rate-limit-remaining": "3",
              "x-rate-limit-reset": String(Math.floor(Date.now() / 1000) + 900),
            };
            return map[key] ?? null;
          },
        },
      });

      const { postToXViaApiV2 } = await import("./x-api-v2-poster");
      const result = await postToXViaApiV2(1, "Low limit tweet");

      // Should still succeed — low limit is a warning, not a failure
      expect(result.success).toBe(true);
    });
  });
});
