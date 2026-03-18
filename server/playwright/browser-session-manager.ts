/**
 * Browser Session Manager
 *
 * Manages a pool of Playwright browser contexts with persistent session storage.
 * Each account gets its own storage-state JSON file so cookies/localStorage survive restarts.
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { startScreencast, stopScreencast, setOperationStatus } from './screencast-service';
import { createLogger } from '../utils/logger';

const logger = createLogger('browser-session-manager');
import {
  SESSION_DIR,
  MAX_CONCURRENT_BROWSERS,
  NAVIGATION_TIMEOUT,
  ACTION_TIMEOUT,
  getRandomUA,
  getRandomViewport,
  X_URLS,
  X_SELECTORS,
} from './config';
import { db } from '../db';
import { accounts } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Inject anti-detection scripts into every page opened by this context.
 * Overrides common automation signals without requiring external packages.
 */
async function addStealthScripts(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    // Hide webdriver flag
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
    });

    // Add minimal fake plugin list (empty PluginArray is a bot signal)
    const fakePlugins = [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
    ];
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const arr = fakePlugins as unknown as Plugin[];
        Object.setPrototypeOf(arr, PluginArray.prototype);
        return arr;
      },
      configurable: true,
    });

    // Prefer Japanese locale to match the platform's target audience
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ja-JP', 'ja', 'en-US', 'en'],
      configurable: true,
    });

    // Expose a minimal chrome runtime object (absent in headless without this)
    if (!('chrome' in window)) {
      Object.defineProperty(window, 'chrome', {
        value: {
          runtime: {
            id: undefined,
            connect: () => {},
            sendMessage: () => {},
          },
        },
        writable: false,
        configurable: true,
      });
    }

    // Override permissions.query to avoid headless-specific 'denied' responses
    const originalQuery = window.navigator.permissions?.query?.bind(navigator.permissions);
    if (originalQuery) {
      Object.defineProperty(navigator.permissions, 'query', {
        value: (parameters: PermissionDescriptor) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: 'denied', onchange: null } as PermissionStatus)
            : originalQuery(parameters),
        configurable: true,
      });
    }
  });
}

interface ManagedContext {
  context: BrowserContext;
  accountId: number;
  lastUsed: number;
}

let browser: Browser | null = null;
const activeContexts = new Map<number, ManagedContext>();

// Auto-cleanup idle contexts after 10 minutes
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startIdleCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(async () => {
    const now = Date.now();
    for (const [accountId, mc] of activeContexts) {
      if (now - mc.lastUsed > IDLE_TIMEOUT_MS) {
        logger.info(`[PlaywrightSession] Auto-closing idle context for account ${accountId}`);
        await releaseContext(accountId);
      }
    }
    // If no contexts remain, close the browser process too
    if (activeContexts.size === 0 && browser) {
      logger.info('[PlaywrightSession] No active contexts, closing browser process');
      try {
        await browser.close();
      } catch {
        // ignore
      }
      browser = null;
    }
  }, 60_000); // Check every minute
}

// Cleanup on process exit
function registerExitHandlers(): void {
  const cleanup = async () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
    await shutdownAll();
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });
  process.on('beforeExit', async () => {
    await cleanup();
  });
}

registerExitHandlers();
startIdleCleanup();

/**
 * Ensure the session directory exists
 */
async function ensureSessionDir(): Promise<void> {
  await fs.mkdir(SESSION_DIR, { recursive: true });
}

/**
 * Get path to the storage state file for an account
 */
function sessionPath(accountId: number): string {
  return path.join(SESSION_DIR, `${accountId}.json`);
}

/**
 * Launch or return the shared browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) {
    return browser;
  }
  browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  return browser;
}

/**
 * Evict the least-recently-used context if we are at capacity
 */
async function evictIfNeeded(): Promise<void> {
  if (activeContexts.size < MAX_CONCURRENT_BROWSERS) return;

  let oldest: { accountId: number; lastUsed: number } | null = null;
  for (const [accountId, mc] of activeContexts) {
    if (!oldest || mc.lastUsed < oldest.lastUsed) {
      oldest = { accountId, lastUsed: mc.lastUsed };
    }
  }
  if (oldest) {
    await releaseContext(oldest.accountId);
  }
}

/**
 * Acquire a browser context for the given account.
 * If a stored session exists it will be loaded; otherwise a fresh context is created.
 */
export async function acquireContext(
  accountId: number,
  proxyConfig?: { server: string; username?: string; password?: string }
): Promise<BrowserContext> {
  // Return existing context if available
  const existing = activeContexts.get(accountId);
  if (existing) {
    existing.lastUsed = Date.now();
    return existing.context;
  }

  await evictIfNeeded();
  await ensureSessionDir();

  const b = await getBrowser();
  const storagePath = sessionPath(accountId);

  let storageState: string | undefined;
  try {
    await fs.access(storagePath);
    storageState = storagePath;
  } catch {
    // No stored session – start fresh
  }

  const contextOptions: Parameters<Browser['newContext']>[0] = {
    viewport: getRandomViewport(accountId),
    userAgent: getRandomUA(accountId),
    ...(storageState ? { storageState } : {}),
    ...(proxyConfig ? { proxy: proxyConfig } : {}),
  };

  const context = await b.newContext(contextOptions);
  context.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
  context.setDefaultTimeout(ACTION_TIMEOUT);
  await addStealthScripts(context);

  activeContexts.set(accountId, {
    context,
    accountId,
    lastUsed: Date.now(),
  });

  return context;
}

/**
 * Save current session state and release the context
 */
export async function releaseContext(accountId: number): Promise<void> {
  const mc = activeContexts.get(accountId);
  if (!mc) return;

  try {
    await mc.context.storageState({ path: sessionPath(accountId) });
  } catch (err) {
    logger.error(`[PlaywrightSession] Failed to save session for account ${accountId}:`, err);
  }

  try {
    await mc.context.close();
  } catch {
    // ignore close errors
  }

  activeContexts.delete(accountId);
}

/**
 * Persist the session state without closing the context
 */
export async function saveSession(accountId: number): Promise<void> {
  const mc = activeContexts.get(accountId);
  if (!mc) return;
  await ensureSessionDir();
  await mc.context.storageState({ path: sessionPath(accountId) });
}

/**
 * Check if the stored session for an account is still logged in to X.com.
 * Updates the sessionStatus column in the database accordingly.
 */
export async function checkSessionHealth(
  accountId: number
): Promise<{ healthy: boolean; status: 'active' | 'expired' | 'needs_login' }> {
  let context: BrowserContext | null = null;
  let ownedContext = false;

  try {
    const existing = activeContexts.get(accountId);
    if (existing) {
      context = existing.context;
    } else {
      // Check if a session file exists
      try {
        await fs.access(sessionPath(accountId));
      } catch {
        await db
          .update(accounts)
          .set({ sessionStatus: 'needs_login' })
          .where(eq(accounts.id, accountId));
        return { healthy: false, status: 'needs_login' };
      }
      context = await acquireContext(accountId);
      ownedContext = true;
    }

    const page = await context.newPage();
    await startScreencast(accountId, page);
    try {
      setOperationStatus(accountId, 'health_check', 'navigating_to_home');
      await page.goto(X_URLS.home, { waitUntil: 'domcontentloaded' });

      setOperationStatus(accountId, 'health_check', 'checking_login_status');
      // Check if we see the profile avatar (means logged in)
      const loggedIn = await page
        .locator(X_SELECTORS.profileAvatar)
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      const status = loggedIn ? 'active' : 'expired';
      await db
        .update(accounts)
        .set({ sessionStatus: status })
        .where(eq(accounts.id, accountId));

      return { healthy: loggedIn, status };
    } finally {
      await stopScreencast(accountId);
      await page.close();
    }
  } catch (err) {
    logger.error(`[PlaywrightSession] Health check failed for account ${accountId}:`, err);
    await db
      .update(accounts)
      .set({ sessionStatus: 'expired' })
      .where(eq(accounts.id, accountId));
    return { healthy: false, status: 'expired' };
  } finally {
    if (ownedContext && context) {
      await releaseContext(accountId);
    }
  }
}

/**
 * Delete stored session for an account
 */
export async function deleteSession(accountId: number): Promise<void> {
  await releaseContext(accountId);
  try {
    await fs.unlink(sessionPath(accountId));
  } catch {
    // File may not exist
  }
  await db
    .update(accounts)
    .set({ sessionStatus: 'needs_login' })
    .where(eq(accounts.id, accountId));
}

/**
 * Shut down all contexts and the browser
 */
export async function shutdownAll(): Promise<void> {
  for (const accountId of activeContexts.keys()) {
    await releaseContext(accountId);
  }
  if (browser) {
    await browser.close();
    browser = null;
  }
}
