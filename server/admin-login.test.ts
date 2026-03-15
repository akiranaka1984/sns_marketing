/**
 * Tests for the /api/admin-login endpoint in server/_core/oauth.ts
 *
 * Strategy: mock the entire server/db module (avoids MySQL pool creation),
 * mock bcryptjs and sdk, then call registerOAuthRoutes with a stub Express app
 * and exercise each captured handler directly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";

// ─── Mock: server/db (entire module) ──────────────────────────────────────────
// oauth.ts imports:  import * as db from "../db";   (upsertUser)
//                    import { db as drizzleDb } from "../db";   (query.adminSettings)

const mockFindFirst = vi.fn();
const mockDbInsert = vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) }));
const mockDbUpdate = vi.fn(() => ({
  set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })),
}));

vi.mock("./db", () => ({
  // Named re-export used as namespace: `import * as db`
  upsertUser: vi.fn(() => Promise.resolve()),
  getUserByOpenId: vi.fn(() => Promise.resolve(null)),
  // Named export used as `db`: `import { db as drizzleDb }`
  db: {
    query: {
      adminSettings: { findFirst: () => mockFindFirst() },
      xApiSettings: { findFirst: vi.fn(() => Promise.resolve(null)) },
    },
    insert: () => mockDbInsert(),
    update: () => mockDbUpdate(),
  },
}));

// ─── Mock: bcryptjs ───────────────────────────────────────────────────────────

const mockBcryptCompare = vi.fn();
const mockBcryptHash = vi.fn((pw: string) => Promise.resolve(`hashed_${pw}`));

vi.mock("bcryptjs", () => ({
  default: {
    compare: (...args: unknown[]) => mockBcryptCompare(...args),
    hash: (...args: unknown[]) => mockBcryptHash(...args),
  },
}));

// ─── Mock: sdk (avoid JWT and HTTP overhead) ──────────────────────────────────

vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn(() => Promise.resolve("mock-session-token")),
  },
}));

// ─── Mock: account-oauth.routers (avoids real X API calls on import) ─────────

vi.mock("./account-oauth.routers", () => ({
  pendingOAuthRequests: new Map(),
  exchangeForAccessToken: vi.fn(),
}));

// ─── Utilities ────────────────────────────────────────────────────────────────

function buildReq(body: Record<string, unknown> = {}, protocol = "https") {
  return {
    body,
    protocol,
    hostname: "example.com",
    headers: {},
    query: {},
  } as unknown as Request;
}

type MockRes = {
  _cookies: Array<{ name: string; value: string; options: unknown }>;
  _responses: Array<{ status: number; body: unknown }>;
  status(code: number): MockRes;
  json(body: unknown): MockRes;
  cookie(name: string, value: string, options: unknown): MockRes;
  redirect: ReturnType<typeof vi.fn>;
  readonly lastResponse: { status: number; body: unknown } | undefined;
};

function buildRes(): MockRes & Response {
  const cookies: Array<{ name: string; value: string; options: unknown }> = [];
  const responses: Array<{ status: number; body: unknown }> = [];
  let currentStatus = 200;

  const res: MockRes = {
    _cookies: cookies,
    _responses: responses,
    status(code: number) {
      currentStatus = code;
      return res;
    },
    json(body: unknown) {
      responses.push({ status: currentStatus, body });
      return res;
    },
    cookie(name: string, value: string, options: unknown) {
      cookies.push({ name, value, options });
      return res;
    },
    redirect: vi.fn(),
    get lastResponse() {
      return responses[responses.length - 1];
    },
  };

  return res as MockRes & Response;
}

type Handler = (req: Request, res: Response) => void | Promise<void>;

// Register routes once and cache the handler map
let _handlers: Record<string, Handler> | null = null;

async function getHandlers(): Promise<Record<string, Handler>> {
  if (_handlers) return _handlers;

  const captured: Record<string, Handler> = {};
  const mockApp = {
    get: vi.fn((path: string, handler: Handler) => {
      captured[`GET:${path}`] = handler;
    }),
    post: vi.fn((path: string, handler: Handler) => {
      captured[`POST:${path}`] = handler;
    }),
  };

  const { registerOAuthRoutes } = await import("./_core/oauth");
  registerOAuthRoutes(mockApp as unknown as import("express").Express);
  _handlers = captured;
  return captured;
}

// ─── Tests: input validation ─────────────────────────────────────────────────

describe("/api/admin-login input validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when username is missing", async () => {
    const handlers = await getHandlers();
    const req = buildReq({ password: "secret" });
    const res = buildRes();
    await handlers["POST:/api/admin-login"]!(req, res);
    expect(res.lastResponse?.status).toBe(401);
    expect((res.lastResponse?.body as Record<string, unknown>).success).toBe(false);
  });

  it("returns 401 when username is not 'admin'", async () => {
    const handlers = await getHandlers();
    const req = buildReq({ username: "hacker", password: "secret" });
    const res = buildRes();
    await handlers["POST:/api/admin-login"]!(req, res);
    expect(res.lastResponse?.status).toBe(401);
  });

  it("returns 400 when password is missing", async () => {
    const handlers = await getHandlers();
    const req = buildReq({ username: "admin" });
    const res = buildRes();
    await handlers["POST:/api/admin-login"]!(req, res);
    expect(res.lastResponse?.status).toBe(400);
    expect((res.lastResponse?.body as Record<string, unknown>).success).toBe(false);
  });

  it("returns 400 when password is not a string", async () => {
    const handlers = await getHandlers();
    const req = buildReq({ username: "admin", password: 12345 });
    const res = buildRes();
    await handlers["POST:/api/admin-login"]!(req, res);
    expect(res.lastResponse?.status).toBe(400);
  });
});

// ─── Tests: DB-stored bcrypt password ────────────────────────────────────────

describe("/api/admin-login with DB-stored bcrypt password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 and calls bcrypt.compare on correct password", async () => {
    mockFindFirst.mockResolvedValue({ id: 1, passwordHash: "hashed_correct" });
    mockBcryptCompare.mockResolvedValue(true);

    const handlers = await getHandlers();
    const req = buildReq({ username: "admin", password: "correctpassword" });
    const res = buildRes();
    await handlers["POST:/api/admin-login"]!(req, res);

    expect(mockBcryptCompare).toHaveBeenCalledWith("correctpassword", "hashed_correct");
    expect(res.lastResponse?.status).toBe(200);
    expect((res.lastResponse?.body as Record<string, unknown>).success).toBe(true);
  });

  it("sets session cookie on successful login", async () => {
    mockFindFirst.mockResolvedValue({ id: 1, passwordHash: "hashed_secret" });
    mockBcryptCompare.mockResolvedValue(true);

    const handlers = await getHandlers();
    const req = buildReq({ username: "admin", password: "secret" });
    const res = buildRes();
    await handlers["POST:/api/admin-login"]!(req, res);

    expect(res._cookies.length).toBeGreaterThan(0);
    expect(res._cookies[0]?.value).toBe("mock-session-token");
  });

  it("returns 401 on incorrect password", async () => {
    mockFindFirst.mockResolvedValue({ id: 1, passwordHash: "hashed_correct" });
    mockBcryptCompare.mockResolvedValue(false);

    const handlers = await getHandlers();
    const req = buildReq({ username: "admin", password: "wrongpassword" });
    const res = buildRes();
    await handlers["POST:/api/admin-login"]!(req, res);

    expect(res.lastResponse?.status).toBe(401);
    expect((res.lastResponse?.body as Record<string, unknown>).success).toBe(false);
  });
});

// ─── Tests: ENV fallback ──────────────────────────────────────────────────────

describe("/api/admin-login ENV fallback (no DB password)", () => {
  const originalAdminPw = process.env.ADMIN_PASSWORD;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue(null); // no DB row
  });

  afterEach(() => {
    if (originalAdminPw !== undefined) {
      process.env.ADMIN_PASSWORD = originalAdminPw;
    } else {
      delete process.env.ADMIN_PASSWORD;
    }
  });

  it("returns 200 when password matches ENV.adminPassword", async () => {
    process.env.ADMIN_PASSWORD = "envpassword";
    const handlers = await getHandlers();
    const req = buildReq({ username: "admin", password: "envpassword" });
    const res = buildRes();
    await handlers["POST:/api/admin-login"]!(req, res);
    expect(res.lastResponse?.status).toBe(200);
    expect((res.lastResponse?.body as Record<string, unknown>).success).toBe(true);
  });

  it("returns 401 when password does not match ENV.adminPassword", async () => {
    process.env.ADMIN_PASSWORD = "envpassword";
    const handlers = await getHandlers();
    const req = buildReq({ username: "admin", password: "wrongpassword" });
    const res = buildRes();
    await handlers["POST:/api/admin-login"]!(req, res);
    expect(res.lastResponse?.status).toBe(401);
    expect((res.lastResponse?.body as Record<string, unknown>).success).toBe(false);
  });

  it("returns 500 when neither DB nor ENV password is configured", async () => {
    delete process.env.ADMIN_PASSWORD;
    const handlers = await getHandlers();
    const req = buildReq({ username: "admin", password: "anything" });
    const res = buildRes();
    await handlers["POST:/api/admin-login"]!(req, res);
    expect(res.lastResponse?.status).toBe(500);
    expect((res.lastResponse?.body as Record<string, unknown>).success).toBe(false);
  });
});

// ─── Tests: error handling ────────────────────────────────────────────────────

describe("/api/admin-login error handling", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 500 when DB throws an unexpected error", async () => {
    mockFindFirst.mockRejectedValue(new Error("DB connection failed"));
    const handlers = await getHandlers();
    const req = buildReq({ username: "admin", password: "secret" });
    const res = buildRes();
    await handlers["POST:/api/admin-login"]!(req, res);
    expect(res.lastResponse?.status).toBe(500);
    expect((res.lastResponse?.body as Record<string, unknown>).success).toBe(false);
  });
});

// ─── Tests: /api/admin/password-status ───────────────────────────────────────

describe("/api/admin/password-status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns { isSet: true } when DB password exists", async () => {
    mockFindFirst.mockResolvedValue({ id: 1, passwordHash: "some_hash" });
    const handlers = await getHandlers();
    const req = buildReq();
    const res = buildRes();
    await handlers["GET:/api/admin/password-status"]!(req, res);
    expect((res.lastResponse?.body as Record<string, unknown>).isSet).toBe(true);
  });

  it("returns { isSet: false } when no DB password configured", async () => {
    mockFindFirst.mockResolvedValue(null);
    const handlers = await getHandlers();
    const req = buildReq();
    const res = buildRes();
    await handlers["GET:/api/admin/password-status"]!(req, res);
    expect((res.lastResponse?.body as Record<string, unknown>).isSet).toBe(false);
  });
});
