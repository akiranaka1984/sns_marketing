/**
 * Auto-Engagement System
 *
 * Automatically performs likes, follows, comments, and unfollows
 * using Playwright browser automation.
 */

import { db } from "./db";
import { engagementTasks, engagementLogs, accounts, freezeDetections } from "../drizzle/schema";
import { eq, and, lt, or, isNull, desc, gte } from "drizzle-orm";
import { detectFreeze, handleFreeze } from "./freeze-detection";
import {
  likePostViaPlaywright,
  commentPostViaPlaywright,
  followUserViaPlaywright,
  unfollowUserViaPlaywright,
  retweetPostViaPlaywright,
  getEngagementRateLimits,
} from "./playwright/engagement-actions";
import { humanPause } from "./utils/human-delay";
import { createLogger } from "./utils/logger";

const logger = createLogger("auto-engagement");

/**
 * Execute pending engagement tasks
 */
export async function executeEngagementTasks() {
  // Get all active tasks
  const activeTasks = await db.query.engagementTasks.findMany({
    where: eq(engagementTasks.isActive, 1),
  });

  logger.info(`[AutoEngagement] Found ${activeTasks.length} active tasks`);

  const results = [];

  for (const task of activeTasks) {
    try {
      // Check if task should be executed based on frequency
      const shouldExecute = await shouldExecuteTask(task);

      if (shouldExecute) {
        const result = await executeTask(task);
        results.push(result);
      }
    } catch (error: any) {
      logger.error(
        `[AutoEngagement] Error executing task ${task.id}:`,
        error
      );
    }
  }

  return results;
}

/** Convert Date to MySQL-compatible timestamp string */
function toMySQLTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Check if task should be executed based on frequency and last execution
 */
async function shouldExecuteTask(task: any): Promise<boolean> {
  if (!task.lastExecutedAt) {
    return true; // Never executed, should execute
  }

  // Get logs for today using MySQL-compatible timestamp format
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayLogs = await db.query.engagementLogs.findMany({
    where: and(
      eq(engagementLogs.taskId, task.id),
      eq(engagementLogs.status, "success"),
      gte(engagementLogs.createdAt, toMySQLTimestamp(today))
    ),
  });

  // Check if we've reached the daily frequency limit
  if (todayLogs.length >= task.frequency) {
    return false;
  }

  // Check if enough time has passed since last execution
  // Distribute actions evenly throughout the day
  const minutesBetweenActions = (24 * 60) / task.frequency;
  // lastExecutedAt is stored as a MySQL timestamp string; convert to Date first
  const lastExecutedDate = new Date(task.lastExecutedAt);
  const minutesSinceLastExecution =
    (Date.now() - lastExecutedDate.getTime()) / (60 * 1000);

  return minutesSinceLastExecution >= minutesBetweenActions;
}

/**
 * Execute a single engagement task
 */
async function executeTask(task: any): Promise<{
  success: boolean;
  message: string;
  taskId: number;
}> {
  try {
    // Get account details
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, task.accountId),
    });

    if (!account) {
      return { success: false, message: "Account not found", taskId: task.id };
    }

    // Check if account is active
    if (account.status !== "active") {
      return {
        success: false,
        message: `Account is ${account.status}`,
        taskId: task.id,
      };
    }

    // Execute based on task type
    let result: { success: boolean; error?: string };

    switch (task.taskType) {
      case "like":
        result = await executeLike(account, task);
        break;
      case "follow":
        result = await executeFollow(account, task);
        break;
      case "comment":
        result = await executeComment(account, task);
        break;
      case "unfollow":
        result = await executeUnfollow(account, task);
        break;
      case "retweet":
        result = await executeRetweet(account, task);
        break;
      default:
        result = { success: false, error: "Unknown task type" };
    }

    // Log the execution
    await db.insert(engagementLogs).values({
      taskId: task.id,
      accountId: task.accountId,
      taskType: task.taskType,
      targetUser: task.targetUser,
      targetPost: task.targetPost,
      status: result.success ? "success" : "failed",
      errorMessage: result.error,
    });

    // Update last executed time
    await db
      .update(engagementTasks)
      .set({ lastExecutedAt: toMySQLTimestamp(new Date()) })
      .where(eq(engagementTasks.id, task.id));

    if (!result.success && result.error) {
      // Detect if this is a freeze
      const freezeResult = await detectFreeze(
        account.id,
        account.deviceId,
        result.error
      );

      if (freezeResult.isFrozen && freezeResult.recommendedAction) {
        // Get the freeze detection ID (last inserted)
        const latestFreeze = await db.query.freezeDetections.findFirst({
          where: eq(freezeDetections.accountId, account.id),
          orderBy: [desc(freezeDetections.createdAt)],
        });

        if (latestFreeze) {
          // Trigger auto-response
          await handleFreeze(
            latestFreeze.id,
            account.id,
            account.deviceId,
            freezeResult.recommendedAction
          );
        }
      }
    }

    return {
      success: result.success,
      message: result.success
        ? `${task.taskType} executed successfully`
        : result.error || "Failed to execute task",
      taskId: task.id,
    };
  } catch (error: any) {
    logger.error(`[AutoEngagement] Error in executeTask:`, error);
    return {
      success: false,
      message: error.message,
      taskId: task.id,
    };
  }
}

/**
 * Execute like action via Playwright
 */
async function executeLike(
  account: any,
  task: any
): Promise<{ success: boolean; error?: string }> {
  if (!task.targetPost) {
    return { success: false, error: "No target post URL provided" };
  }

  logger.info(
    `[AutoEngagement] Liking post ${task.targetPost} with account ${account.username}`
  );

  // Get rate limit settings
  const rateLimits = await getEngagementRateLimits(task.projectId);

  // Add human-like delay before action
  await humanPause(rateLimits.likeDelayMin * 60 * 1000, rateLimits.likeDelayMax * 60 * 1000);

  // Execute via Playwright
  const result = await likePostViaPlaywright(account.id, task.targetPost);
  return { success: result.success, error: result.error };
}

/**
 * Execute follow action via Playwright
 */
async function executeFollow(
  account: any,
  task: any
): Promise<{ success: boolean; error?: string }> {
  if (!task.targetUser) {
    return { success: false, error: "No target user provided" };
  }

  logger.info(
    `[AutoEngagement] Following user ${task.targetUser} with account ${account.username}`
  );

  // Get rate limit settings
  const rateLimits = await getEngagementRateLimits(task.projectId);

  // Add human-like delay before action
  await humanPause(rateLimits.followDelayMin * 60 * 1000, rateLimits.followDelayMax * 60 * 1000);

  // Execute via Playwright
  const result = await followUserViaPlaywright(account.id, task.targetUser);
  return { success: result.success, error: result.error };
}

/**
 * Execute comment action via Playwright
 */
async function executeComment(
  account: any,
  task: any
): Promise<{ success: boolean; error?: string }> {
  if (!task.targetPost) {
    return { success: false, error: "No target post URL provided" };
  }

  if (!task.commentText) {
    return { success: false, error: "No comment text provided" };
  }

  logger.info(
    `[AutoEngagement] Commenting "${task.commentText}" on post ${task.targetPost} with account ${account.username}`
  );

  // Get rate limit settings
  const rateLimits = await getEngagementRateLimits(task.projectId);

  // Add human-like delay before action
  await humanPause(rateLimits.commentDelayMin * 60 * 1000, rateLimits.commentDelayMax * 60 * 1000);

  // Execute via Playwright
  const result = await commentPostViaPlaywright(
    account.id,
    task.targetPost,
    task.commentText
  );
  return { success: result.success, error: result.error };
}

/**
 * Execute unfollow action via Playwright
 */
async function executeUnfollow(
  account: any,
  task: any
): Promise<{ success: boolean; error?: string }> {
  if (!task.targetUser) {
    return { success: false, error: "No target user provided" };
  }

  logger.info(
    `[AutoEngagement] Unfollowing user ${task.targetUser} with account ${account.username}`
  );

  // Get rate limit settings
  const rateLimits = await getEngagementRateLimits(task.projectId);

  // Add human-like delay before action
  await humanPause(rateLimits.followDelayMin * 60 * 1000, rateLimits.followDelayMax * 60 * 1000);

  // Execute via Playwright
  const result = await unfollowUserViaPlaywright(account.id, task.targetUser);
  return { success: result.success, error: result.error };
}

/**
 * Execute retweet action via Playwright
 */
async function executeRetweet(
  account: any,
  task: any
): Promise<{ success: boolean; error?: string }> {
  if (!task.targetPost) {
    return { success: false, error: "No target post URL provided" };
  }

  logger.info(
    `[AutoEngagement] Retweeting post ${task.targetPost} with account ${account.username}`
  );

  // Get rate limit settings
  const rateLimits = await getEngagementRateLimits(task.projectId);

  // Add human-like delay before action
  await humanPause(rateLimits.retweetDelayMin * 60 * 1000, rateLimits.retweetDelayMax * 60 * 1000);

  // Execute via Playwright
  const result = await retweetPostViaPlaywright(account.id, task.targetPost);
  return { success: result.success, error: result.error };
}

/**
 * Register auto-engagement as a BullMQ repeatable job.
 * Call this once at server startup after registerQueueProcessors().
 */
export async function registerAutoEngagementJob(): Promise<void> {
  const { registerAutoEngagementRepeatableJob } = await import('./queue-manager');
  await registerAutoEngagementRepeatableJob();
  logger.info("[AutoEngagement] Repeatable job registered via BullMQ");
}

/**
 * @deprecated Use registerAutoEngagementJob() with BullMQ repeatable jobs instead.
 * Kept for backward compatibility. Will be removed in a future release.
 */
export function startAutoEngagementExecutor() {
  logger.warn("[AutoEngagement] startAutoEngagementExecutor() is deprecated. Use registerAutoEngagementJob() with BullMQ instead.");

  // Run immediately
  executeEngagementTasks();

  // Run every 5 minutes
  setInterval(() => {
    executeEngagementTasks();
  }, 5 * 60 * 1000); // 5 minutes
}
