/**
 * Playwright browser automation configuration
 */

import path from 'path';

/** Directory for persisted browser session storage state files */
export const SESSION_DIR = path.resolve(process.cwd(), 'data/playwright-sessions');

/** Maximum concurrent browser contexts */
export const MAX_CONCURRENT_BROWSERS = 3;

/** Default navigation timeout (ms) */
export const NAVIGATION_TIMEOUT = 30_000;

/** Default action timeout (ms) */
export const ACTION_TIMEOUT = 15_000;

/** Wait after page navigation (ms) */
export const POST_NAVIGATION_WAIT = 3_000;

/** Wait between UI actions (ms) */
export const INTER_ACTION_DELAY = 1_000;

/** Wait after posting to verify success (ms) */
export const POST_VERIFY_WAIT = 5_000;

/** Default viewport size */
export const VIEWPORT = { width: 1280, height: 800 } as const;

/** Pool of modern Chrome user-agent strings (Chrome 131–133, Windows/Mac/Linux) */
export const USER_AGENTS: readonly string[] = [
  // Chrome 133 – Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.6943.98 Safari/537.36',
  // Chrome 132 – Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6834.160 Safari/537.36',
  // Chrome 131 – Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.265 Safari/537.36',
  // Chrome 133 – macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.6943.98 Safari/537.36',
  // Chrome 132 – macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6834.160 Safari/537.36',
  // Chrome 131 – macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  // Chrome 133 – Linux
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  // Chrome 132 – Linux
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6834.160 Safari/537.36',
  // Chrome 131 – Linux
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
] as const;

/**
 * Deterministically pick a user-agent for an account using a simple hash.
 * The same accountId always resolves to the same UA, but different accounts
 * spread across the pool.
 */
export function getRandomUA(accountId: number): string {
  // FNV-1a-inspired 32-bit hash for stable, well-distributed bucketing
  let hash = 2166136261;
  hash ^= accountId & 0xff;
  hash = (Math.imul(hash, 16777619) >>> 0);
  hash ^= (accountId >> 8) & 0xff;
  hash = (Math.imul(hash, 16777619) >>> 0);
  const index = hash % USER_AGENTS.length;
  return USER_AGENTS[index];
}

/**
 * Return a viewport for the given account with ±20 px jitter around 1280×800.
 * The jitter is deterministic per account so repeated calls return the same size.
 */
export function getRandomViewport(accountId: number): { width: number; height: number } {
  // Use a different seed from getRandomUA so width/height vary independently
  let hw = 1_000_000_007 ^ accountId;
  hw = (Math.imul(hw, 2654435761) >>> 0);
  let hh = 1_000_000_009 ^ accountId;
  hh = (Math.imul(hh, 2246822519) >>> 0);

  // Map to [-20, +20] range
  const dw = (hw % 41) - 20; // 41 values: -20 … +20
  const dh = (hh % 41) - 20;

  return {
    width: VIEWPORT.width + dw,
    height: VIEWPORT.height + dh,
  };
}

/** X.com selectors */
export const X_SELECTORS = {
  /** Compose tweet button in sidebar */
  composeTweetButton: '[data-testid="SideNav_NewTweet_Button"]',
  /** Tweet text area inside the compose dialog */
  tweetTextArea: '[data-testid="tweetTextArea_0"]',
  /** Inline tweet/post button */
  tweetButton: '[data-testid="tweetButtonInline"]',
  /** File input for media upload */
  mediaInput: '[data-testid="fileInput"]',
  /** Toast notification container (success feedback) */
  toast: '[data-testid="toast"]',
  /** Login form username input */
  loginUsernameInput: 'input[autocomplete="username"]',
  /** Login form password input */
  loginPasswordInput: 'input[autocomplete="current-password"]',
  /** Login next button */
  loginNextButton: '[role="button"]:has-text("Next")',
  /** Login submit button */
  loginSubmitButton: '[data-testid="LoginForm_Login_Button"]',
  /** Profile avatar (indicates logged-in state) */
  profileAvatar: '[data-testid="AppTabBar_Profile_Link"]',

  // ============================================
  // Engagement Action Selectors
  // ============================================

  /** Like button on a tweet (not yet liked) */
  likeButton: '[data-testid="like"]',
  /** Unlike button on a tweet (already liked) */
  unlikeButton: '[data-testid="unlike"]',
  /** Reply button on a tweet */
  replyButton: '[data-testid="reply"]',
  /** Retweet button on a tweet */
  retweetButton: '[data-testid="retweet"]',
  /** Unretweet button (already retweeted) */
  unretweetButton: '[data-testid="unretweet"]',
  /** Confirm retweet option in the menu */
  retweetConfirm: '[data-testid="retweetConfirm"]',
  /** Quote tweet option in the menu */
  quoteButton: '[data-testid="Retweet"]',
  /** Follow button on user profile */
  followButton: '[data-testid="follow"]',
  /** Unfollow button on user profile */
  unfollowButton: '[data-testid="unfollow"]',
  /** Confirm unfollow button in the modal */
  unfollowConfirm: '[data-testid="confirmationSheetConfirm"]',
  /** Reply text area in reply dialog */
  replyTextArea: '[data-testid="tweetTextarea_0"]',
  /** Reply submit button */
  replySubmitButton: '[data-testid="tweetButton"]',
  /** Tweet article container */
  tweetArticle: 'article[data-testid="tweet"]',
  /** User cell (in followers/following list) */
  userCell: '[data-testid="UserCell"]',
  /** Primary column (main content area) */
  primaryColumn: '[data-testid="primaryColumn"]',
} as const;

/** X.com URLs */
export const X_URLS = {
  home: 'https://x.com/home',
  login: 'https://x.com/i/flow/login',
  compose: 'https://x.com/compose/post',
} as const;
