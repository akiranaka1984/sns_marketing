import { getAnalyticsByAccount, getAccountById, db } from './db';
import { notifyOwner } from './_core/notification';
import { createLogger } from "./utils/logger";
import { eq, and, gte } from "drizzle-orm";
import * as schema from "../drizzle/schema";

const logger = createLogger("alert-system");

/**
 * Alert System
 * Monitors account metrics and sends notifications for anomalies
 */

interface AlertThresholds {
  followerDropPercentage: number; // Alert if followers drop by this percentage
  engagementDropPercentage: number; // Alert if engagement drops by this percentage
  checkIntervalHours: number; // How often to check for alerts
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  followerDropPercentage: 10, // Alert if 10% drop
  engagementDropPercentage: 20, // Alert if 20% drop
  checkIntervalHours: 24, // Check every 24 hours
};

/**
 * Check for follower count drop
 */
async function checkFollowerDrop(accountId: number, thresholds: AlertThresholds = DEFAULT_THRESHOLDS): Promise<boolean> {
  try {
    const analytics = await getAnalyticsByAccount(accountId);
    if (!analytics || analytics.length < 2) {
      // Not enough data to compare
      return false;
    }

    // Sort by date (most recent first)
    const sortedAnalytics = analytics.sort((a: any, b: any) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    const latest = sortedAnalytics[0];
    const previous = sortedAnalytics[1];

    // Calculate percentage drop
    const dropPercentage = ((previous.followersCount - latest.followersCount) / previous.followersCount) * 100;

    if (dropPercentage >= thresholds.followerDropPercentage) {
      const account = await getAccountById(accountId);
      if (account) {
        await notifyOwner({
          title: '⚠️ Follower Count Drop Alert',
          content: `Account @${account.username} (${account.platform}) has lost ${dropPercentage.toFixed(1)}% of followers.\n\nPrevious: ${previous.followersCount}\nCurrent: ${latest.followersCount}\nDrop: ${previous.followersCount - latest.followersCount} followers`,
        });
        logger.info({ accountId }, "Follower drop alert sent");
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error({ err: error, accountId }, "Error checking follower drop");
    return false;
  }
}

/**
 * Check for engagement rate drop
 */
async function checkEngagementDrop(accountId: number, thresholds: AlertThresholds = DEFAULT_THRESHOLDS): Promise<boolean> {
  try {
    const analytics = await getAnalyticsByAccount(accountId);
    if (!analytics || analytics.length < 2) {
      // Not enough data to compare
      return false;
    }

    // Sort by date (most recent first)
    const sortedAnalytics = analytics.sort((a: any, b: any) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    const latest = sortedAnalytics[0];
    const previous = sortedAnalytics[1];

    // Calculate percentage drop (engagement rate is stored as basis points)
    const dropPercentage = ((previous.engagementRate - latest.engagementRate) / previous.engagementRate) * 100;

    if (dropPercentage >= thresholds.engagementDropPercentage) {
      const account = await getAccountById(accountId);
      if (account) {
        await notifyOwner({
          title: '⚠️ Engagement Rate Drop Alert',
          content: `Account @${account.username} (${account.platform}) has experienced a ${dropPercentage.toFixed(1)}% drop in engagement rate.\n\nPrevious: ${(previous.engagementRate / 100).toFixed(2)}%\nCurrent: ${(latest.engagementRate / 100).toFixed(2)}%`,
        });
        logger.info({ accountId }, "Engagement drop alert sent");
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error({ err: error, accountId }, "Error checking engagement drop");
    return false;
  }
}

/**
 * Check for account suspension/freeze
 * This is a placeholder - actual implementation would need to check account status
 */
async function checkAccountSuspension(accountId: number): Promise<boolean> {
  try {
    const account = await getAccountById(accountId);
    if (!account) {
      return false;
    }

    // Check freeze_detections table for recent freeze events (within last 24 hours)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
    const recentFreezes = await db
      .select()
      .from(schema.freezeDetections)
      .where(
        and(
          eq(schema.freezeDetections.accountId, accountId),
          eq(schema.freezeDetections.freezeType, "account_freeze"),
          gte(schema.freezeDetections.createdAt, since)
        )
      );

    if (recentFreezes.length > 0) {
      const latestFreeze = recentFreezes[recentFreezes.length - 1];
      await notifyOwner({
        title: '🚨 Account Freeze Detected',
        content: `Account @${account.username} (${account.platform}) was flagged as frozen.\n\nFreeze type: ${latestFreeze.freezeType}\nStatus: ${latestFreeze.status}\nDetected at: ${latestFreeze.createdAt}\n${latestFreeze.errorMessage ? `Error: ${latestFreeze.errorMessage}` : ''}`,
      });
      logger.info({ accountId, freezeId: latestFreeze.id }, "Account freeze alert sent");
      return true;
    }

    if (account.status === 'suspended') {
      await notifyOwner({
        title: '🚨 Account Suspension Alert',
        content: `Account @${account.username} (${account.platform}) appears to be suspended or frozen.\n\nImmediate action required!`,
      });
      logger.info({ accountId }, "Suspension alert sent");
      return true;
    }

    return false;
  } catch (error) {
    logger.error({ err: error, accountId }, "Error checking account suspension");
    return false;
  }
}

/**
 * Check all alerts for a single account
 */
export async function checkAccountAlerts(accountId: number, thresholds?: AlertThresholds): Promise<void> {
  try {
    logger.info({ accountId }, "Checking alerts for account");
    
    await Promise.all([
      checkFollowerDrop(accountId, thresholds),
      checkEngagementDrop(accountId, thresholds),
      checkAccountSuspension(accountId),
    ]);
  } catch (error) {
    logger.error({ err: error, accountId }, "Error checking alerts for account");
  }
}

/**
 * Check alerts for all active accounts
 */
export async function checkAllAccountsAlerts(thresholds?: AlertThresholds): Promise<void> {
  try {
    logger.info("Starting alert check for all accounts");

    // Fetch all active accounts from the database
    const activeAccounts = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.status, "active"));

    logger.info({ count: activeAccounts.length }, "Starting batch alert check for active accounts");

    const results = await Promise.allSettled(
      activeAccounts.map(async (account) => {
        await checkAccountAlerts(account.id, thresholds);

        // Record a check entry in alertHistory for audit trail
        await db.insert(schema.alertHistory).values({
          userId: account.userId,
          alertType: "account_issue",
          accountId: account.id,
          title: "Scheduled alert check",
          message: `Routine alert check completed for account @${account.username} (${account.platform}).`,
          severity: "low",
          status: "resolved",
          notificationSent: 0,
          triggeredAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        });
      })
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      logger.warn({ failedCount: failed.length }, "Some accounts failed during batch alert check");
    }

    logger.info({ total: activeAccounts.length, failed: failed.length }, "Batch alert check complete");
  } catch (error) {
    logger.error({ err: error }, "Error in batch alert checking");
  }
}

/**
 * Schedule alert checks (to be called by cron job)
 */
export async function scheduleAlertChecks(): Promise<void> {
  logger.info("Scheduled alert check started");
  await checkAllAccountsAlerts();
}
