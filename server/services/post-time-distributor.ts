/**
 * Post Time Distributor
 *
 * Distributes posting times across multiple accounts to avoid
 * detection as coordinated behavior and to stay within X API rate limits.
 *
 * Covers three concerns:
 *   1. Temporal spreading — accounts post at staggered intervals, not simultaneously
 *   2. API capacity guard — blocks or warns when monthly tweet budget is nearly exhausted
 *   3. Daily window planning — pre-computes slots spread across active JST hours (8–23)
 */

import { createLogger } from "../utils/logger";

const logger = createLogger("post-time-distributor");

// ─── Public Types ────────────────────────────────────────────────────────────

export interface ScheduledPostTime {
  accountId: number;
  scheduledAt: Date;
  /** Net milliseconds of jitter applied relative to the base time */
  jitterMs: number;
}

export interface DailyWindow {
  hour: number;
  minute: number;
  /** Optional pre-assigned account IDs for this window */
  accountIds?: number[];
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Return a random integer in the range [min, max] (inclusive).
 */
function randomIntInclusive(min: number, max: number): number {
  if (min > max) {
    [min, max] = [max, min];
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Fisher-Yates in-place shuffle.
 */
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── distributePostTimes ─────────────────────────────────────────────────────

/**
 * Given a list of account IDs and a base time, calculate distributed post times.
 *
 * Algorithm
 * ---------
 * 1. Optionally shuffle the account order.
 * 2. Assign each account an incremental offset: `index * gap`, where `gap` is
 *    sampled uniformly from [minGapMs, maxGapMs].
 * 3. Add human-like jitter: a small random offset in [−humanJitterMs/2, +humanJitterMs/2].
 * 4. Guarantee the seconds field is never exactly :00 by forcing a 1–59 s offset
 *    when the result lands on a whole minute.
 * 5. Return results sorted chronologically.
 *
 * @param accountIds  - Accounts that need to post.
 * @param baseTime    - Intended base posting time (modified copies are returned).
 * @param options     - Tuning knobs; all are optional with sensible defaults.
 */
export function distributePostTimes(
  accountIds: number[],
  baseTime: Date,
  options: {
    /** Minimum gap between consecutive posts. Default: 30 000 ms (30 s). */
    minGapMs?: number;
    /** Maximum gap between consecutive posts. Default: 300 000 ms (5 min). */
    maxGapMs?: number;
    /** Symmetric random jitter window. Default: 15 000 ms (15 s). */
    humanJitterMs?: number;
    /** Randomise account order before scheduling. Default: true. */
    shuffle?: boolean;
  } = {}
): ScheduledPostTime[] {
  const {
    minGapMs = 30_000,
    maxGapMs = 300_000,
    humanJitterMs = 15_000,
    shuffle = true,
  } = options;

  if (accountIds.length === 0) {
    logger.debug("distributePostTimes called with empty accountIds — returning []");
    return [];
  }

  // Work on a copy so we don't mutate the caller's array.
  const ordered = shuffle ? shuffleArray([...accountIds]) : [...accountIds];

  logger.info(
    `Distributing post times for ${ordered.length} accounts. ` +
      `Base: ${baseTime.toISOString()}, ` +
      `gap: [${minGapMs}–${maxGapMs}] ms, jitter: ±${humanJitterMs / 2} ms, ` +
      `shuffle: ${shuffle}`
  );

  const results: ScheduledPostTime[] = [];
  let cumulativeOffsetMs = 0;

  for (let i = 0; i < ordered.length; i++) {
    const accountId = ordered[i];

    // Gap for this position (first account gets 0 base offset).
    if (i > 0) {
      cumulativeOffsetMs += randomIntInclusive(minGapMs, maxGapMs);
    }

    // Human jitter: symmetric around 0 in the range [−half, +half].
    const halfJitter = Math.floor(humanJitterMs / 2);
    const jitter = randomIntInclusive(-halfJitter, halfJitter);

    let totalOffsetMs = cumulativeOffsetMs + jitter;

    // Build the candidate Date.
    let scheduledAt = new Date(baseTime.getTime() + totalOffsetMs);

    // Guarantee seconds are never exactly :00 to avoid machine-like patterns.
    if (scheduledAt.getSeconds() === 0) {
      const secondsNudge = randomIntInclusive(1, 59);
      scheduledAt = new Date(scheduledAt.getTime() + secondsNudge * 1_000);
      totalOffsetMs += secondsNudge * 1_000;
    }

    results.push({ accountId, scheduledAt, jitterMs: totalOffsetMs });

    logger.debug(
      `Account ${accountId} → ${scheduledAt.toISOString()} ` +
        `(offset ${totalOffsetMs} ms)`
    );
  }

  // Sort chronologically (shuffle already broke original order; re-sort by time).
  results.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const first = results[0].scheduledAt.toISOString();
  const last = results[results.length - 1].scheduledAt.toISOString();
  const spanMs = results[results.length - 1].scheduledAt.getTime() - results[0].scheduledAt.getTime();

  logger.info(
    `Scheduled ${results.length} posts between ${first} and ${last} ` +
      `(total span: ${Math.round(spanMs / 1_000)} s)`
  );

  return results;
}

// ─── checkApiCapacity ────────────────────────────────────────────────────────

/**
 * Evaluate whether sending `pendingPosts` more tweets is safe given current
 * monthly usage and the plan's monthly limit.
 *
 * Thresholds
 * ----------
 * - 80 % of limit: log a warning, still allow posting.
 * - 95 % of limit: block posting and return safe=false.
 *
 * @param currentMonthUsage - Tweets already posted this month.
 * @param monthlyLimit      - Maximum tweets allowed per month on the current plan.
 * @param pendingPosts      - Number of tweets about to be sent.
 */
export function checkApiCapacity(
  currentMonthUsage: number,
  monthlyLimit: number,
  pendingPosts: number
): { safe: boolean; reason?: string; remainingCapacity: number } {
  const remainingCapacity = Math.max(0, monthlyLimit - currentMonthUsage);
  const projectedUsage = currentMonthUsage + pendingPosts;
  const usageRatio = projectedUsage / monthlyLimit;

  logger.debug(
    `API capacity check — current: ${currentMonthUsage}, pending: ${pendingPosts}, ` +
      `limit: ${monthlyLimit}, projected ratio: ${(usageRatio * 100).toFixed(1)}%`
  );

  // Hard block at 95 %.
  if (usageRatio > 0.95) {
    const reason = `API上限の95%に到達 (${projectedUsage}/${monthlyLimit})`;
    logger.warn(
      `Posting BLOCKED — ${reason}. remaining capacity: ${remainingCapacity}`
    );
    return { safe: false, reason, remainingCapacity };
  }

  // Soft warning at 80 %.
  if (usageRatio > 0.80) {
    logger.warn(
      `API使用量が月間上限の80%を超過 (${projectedUsage}/${monthlyLimit}). ` +
        `remaining capacity: ${remainingCapacity}`
    );
  } else {
    logger.info(
      `API capacity OK — projected ${projectedUsage}/${monthlyLimit} ` +
        `(${(usageRatio * 100).toFixed(1)}%). remaining: ${remainingCapacity}`
    );
  }

  return { safe: true, remainingCapacity };
}

// ─── calculateDailyWindows ───────────────────────────────────────────────────

/** JST is UTC+9. */
const JST_OFFSET_MS = 9 * 60 * 60 * 1_000;

/** Active posting window in JST: 08:00 – 23:00 (inclusive start, exclusive end). */
const ACTIVE_HOUR_START_JST = 8;
const ACTIVE_HOUR_END_JST = 23; // posts will not be placed at or after this hour

/**
 * Calculate optimal posting windows for a day based on account count and
 * desired posts-per-account frequency. Posts are spread evenly across the
 * active JST hours (08:00–23:00) with slight randomisation to avoid
 * predictable, machine-like patterns.
 *
 * Returns an array of `{ hour, minute }` objects sorted chronologically.
 * If `accountIds` are supplied they are also round-robin-assigned to each slot.
 *
 * @param accountCount    - Number of accounts that will post.
 * @param postsPerAccount - How many posts each account makes per day. Default: 2.
 * @returns               - Array of time windows.
 */
export function calculateDailyWindows(
  accountCount: number,
  postsPerAccount: number = 2
): DailyWindow[] {
  if (accountCount <= 0) {
    logger.warn("calculateDailyWindows called with accountCount <= 0");
    return [];
  }

  const totalPosts = accountCount * postsPerAccount;
  const activeHours = ACTIVE_HOUR_END_JST - ACTIVE_HOUR_START_JST; // 15 hours

  // Total minutes available in the active window.
  const totalActiveMinutes = activeHours * 60; // 900 minutes

  // Even spacing between posts (in minutes), clamped to at least 1 minute.
  const spacingMinutes = Math.max(1, Math.floor(totalActiveMinutes / totalPosts));

  logger.info(
    `Calculating ${totalPosts} daily windows for ${accountCount} accounts × ${postsPerAccount} posts/day. ` +
      `Active window: ${ACTIVE_HOUR_START_JST}:00–${ACTIVE_HOUR_END_JST}:00 JST. ` +
      `Base spacing: ${spacingMinutes} min.`
  );

  const windows: DailyWindow[] = [];

  for (let i = 0; i < totalPosts; i++) {
    // Base minute offset from start of active window.
    const baseMinuteOffset = i * spacingMinutes;

    // Add up to ±25 % of spacing as randomisation so posts don't cluster on
    // exact-minute boundaries, but still stay within the active window.
    const maxJitterMinutes = Math.max(1, Math.floor(spacingMinutes * 0.25));
    const jitterMinutes = randomIntInclusive(-maxJitterMinutes, maxJitterMinutes);

    let minuteOffset = baseMinuteOffset + jitterMinutes;

    // Clamp to the active window [0, totalActiveMinutes).
    minuteOffset = Math.max(0, Math.min(totalActiveMinutes - 1, minuteOffset));

    const absoluteMinuteFromMidnight =
      ACTIVE_HOUR_START_JST * 60 + minuteOffset;
    const hour = Math.floor(absoluteMinuteFromMidnight / 60);
    const minute = absoluteMinuteFromMidnight % 60;

    // Safety: never schedule at or after the end hour.
    if (hour >= ACTIVE_HOUR_END_JST) {
      // Push back into the last valid minute of the window.
      windows.push({ hour: ACTIVE_HOUR_END_JST - 1, minute: 59 });
    } else {
      windows.push({ hour, minute });
    }
  }

  // Sort chronologically.
  windows.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

  logger.debug(
    `Daily windows: ${windows.map((w) => `${String(w.hour).padStart(2, "0")}:${String(w.minute).padStart(2, "0")}`).join(", ")}`
  );

  return windows;
}
