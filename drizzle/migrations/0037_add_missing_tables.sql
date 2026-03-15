-- Migration: 0037_add_missing_tables
-- Adds 5 missing tables referenced by service files, and missing columns to existing tables.

-- ─── 1. Alter campaigns: add missing columns ──────────────────────────────
ALTER TABLE `campaigns`
  ADD COLUMN IF NOT EXISTS `userId` int NOT NULL DEFAULT 0 AFTER `id`,
  ADD COLUMN IF NOT EXISTS `targetUrl` text AFTER `name`,
  ADD COLUMN IF NOT EXISTS `utmSource` varchar(255) AFTER `targetUrl`,
  ADD COLUMN IF NOT EXISTS `utmMedium` varchar(255) AFTER `utmSource`,
  ADD COLUMN IF NOT EXISTS `utmCampaign` varchar(255) AFTER `utmMedium`;

-- Update goal column to enum (if it exists as text, recreate as enum)
-- NOTE: MySQL does not support ADD COLUMN IF NOT EXISTS on all versions.
-- The statements below use a safe pattern: attempt and ignore duplicate column errors in app startup.

ALTER TABLE `campaigns`
  ADD INDEX `idx_campaigns_userId` (`userId`);

-- ─── 2. Alter tracked_trends: add missing columns ─────────────────────────
ALTER TABLE `tracked_trends`
  ADD COLUMN IF NOT EXISTS `userId` int NOT NULL DEFAULT 0 AFTER `id`,
  ADD COLUMN IF NOT EXISTS `projectId` int AFTER `userId`,
  ADD COLUMN IF NOT EXISTS `source` enum('buzz_analysis','model_account','manual') DEFAULT 'buzz_analysis' AFTER `platform`,
  ADD COLUMN IF NOT EXISTS `volumeEstimate` int DEFAULT 0 AFTER `trendingScore`,
  ADD COLUMN IF NOT EXISTS `expiresAt` timestamp NULL AFTER `volumeEstimate`,
  ADD COLUMN IF NOT EXISTS `respondedAt` timestamp NULL AFTER `expiresAt`,
  ADD COLUMN IF NOT EXISTS `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Modify status column to support all required enum values
ALTER TABLE `tracked_trends`
  MODIFY COLUMN `status` enum('detected','evaluating','responding','responded','expired','active','used') NOT NULL DEFAULT 'detected';

-- Modify platform column to typed enum
ALTER TABLE `tracked_trends`
  MODIFY COLUMN `platform` enum('twitter','tiktok','instagram','facebook');

ALTER TABLE `tracked_trends`
  ADD INDEX IF NOT EXISTS `idx_tracked_trends_userId` (`userId`),
  ADD INDEX IF NOT EXISTS `idx_tracked_trends_projectId` (`projectId`),
  ADD INDEX IF NOT EXISTS `idx_tracked_trends_status` (`status`);

-- ─── 3. Alter content_calendar: add missing columns ───────────────────────
ALTER TABLE `content_calendar`
  ADD COLUMN IF NOT EXISTS `accountId` int AFTER `projectId`,
  ADD COLUMN IF NOT EXISTS `agentId` int AFTER `accountId`,
  ADD COLUMN IF NOT EXISTS `scheduledPostId` int AFTER `agentId`,
  ADD COLUMN IF NOT EXISTS `notes` text AFTER `topic`;

-- Modify contentType and status to extended enums
ALTER TABLE `content_calendar`
  MODIFY COLUMN `contentType` enum('educational','engagement','promotional','story','reserved','trend_response','general'),
  MODIFY COLUMN `status` enum('planned','drafted','scheduled','published','content_generated') NOT NULL DEFAULT 'planned';

ALTER TABLE `content_calendar`
  ADD INDEX IF NOT EXISTS `idx_content_calendar_accountId` (`accountId`),
  ADD INDEX IF NOT EXISTS `idx_content_calendar_agentId` (`agentId`);

-- ─── 3b. Alter growth_loop_actions: add 'failed' status ──────────────────
ALTER TABLE `growth_loop_actions`
  MODIFY COLUMN `status` enum('pending','approved','rejected','executed','failed') NOT NULL DEFAULT 'pending';

-- ─── 4. Create account_roles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `account_roles` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `accountId` int NOT NULL,
  `role` enum('main','amplifier','engagement','support') NOT NULL,
  `priority` int NOT NULL DEFAULT 50,
  `isActive` tinyint NOT NULL DEFAULT 1,
  `config` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_account_roles_projectId` (`projectId`),
  INDEX `idx_account_roles_accountId` (`accountId`),
  INDEX `idx_account_roles_role` (`role`)
);

-- ─── 6. Create account_health ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `account_health` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `accountId` int NOT NULL,
  `healthScore` int NOT NULL DEFAULT 100,
  `loginSuccessRate` int NOT NULL DEFAULT 100,
  `postSuccessRate` int NOT NULL DEFAULT 100,
  `engagementNaturalnessScore` int NOT NULL DEFAULT 100,
  `freezeRiskScore` int NOT NULL DEFAULT 0,
  `accountPhase` enum('warming','growing','mature','cooling','suspended') NOT NULL DEFAULT 'warming',
  `warmingStartedAt` timestamp NULL,
  `warmingCompletedAt` timestamp NULL,
  `postsToday` int NOT NULL DEFAULT 0,
  `maxDailyPosts` int NOT NULL DEFAULT 1,
  `actionsToday` int NOT NULL DEFAULT 0,
  `maxDailyActions` int NOT NULL DEFAULT 10,
  `postsThisHour` int NOT NULL DEFAULT 0,
  `actionsThisHour` int NOT NULL DEFAULT 0,
  `isThrottled` tinyint NOT NULL DEFAULT 0,
  `throttleReason` text,
  `throttleUntil` timestamp NULL,
  `isSuspended` tinyint NOT NULL DEFAULT 0,
  `suspendedReason` text,
  `lastActionAt` timestamp NULL,
  `lastPostAt` timestamp NULL,
  `consecutiveSuccesses` int NOT NULL DEFAULT 0,
  `consecutiveFailures` int NOT NULL DEFAULT 0,
  `totalFreezeCount` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_account_health_accountId` (`accountId`),
  INDEX `idx_account_health_accountPhase` (`accountPhase`),
  INDEX `idx_account_health_healthScore` (`healthScore`)
);

-- ─── 7. Create conversion_events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `conversion_events` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `campaignId` int,
  `accountId` int,
  `postId` int,
  `trackedLinkId` int,
  `eventType` enum('impression','engagement','profile_visit','follow','link_click','page_view','signup','purchase') NOT NULL,
  `eventValue` decimal(12,2),
  `metadata` text,
  `occurredAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_conversion_events_campaignId` (`campaignId`),
  INDEX `idx_conversion_events_accountId` (`accountId`),
  INDEX `idx_conversion_events_postId` (`postId`),
  INDEX `idx_conversion_events_trackedLinkId` (`trackedLinkId`),
  INDEX `idx_conversion_events_eventType` (`eventType`),
  INDEX `idx_conversion_events_occurredAt` (`occurredAt`)
);

-- ─── 8. Create tracked_links ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tracked_links` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `campaignId` int,
  `accountId` int,
  `postId` int,
  `originalUrl` text NOT NULL,
  `trackedUrl` text NOT NULL,
  `clickCount` int NOT NULL DEFAULT 0,
  `uniqueClickCount` int NOT NULL DEFAULT 0,
  `lastClickedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tracked_links_campaignId` (`campaignId`),
  INDEX `idx_tracked_links_accountId` (`accountId`),
  INDEX `idx_tracked_links_postId` (`postId`)
);

-- ─── 9. Create orchestration_plans ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `orchestration_plans` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `triggerPostId` int,
  `triggerPostUrl` text,
  `planType` enum('amplification','conversation','support') NOT NULL DEFAULT 'amplification',
  `status` enum('planned','in_progress','completed','failed') NOT NULL DEFAULT 'planned',
  `actions` text NOT NULL,
  `totalActions` int NOT NULL DEFAULT 0,
  `completedActions` int NOT NULL DEFAULT 0,
  `failedActions` int NOT NULL DEFAULT 0,
  `startedAt` timestamp NULL,
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_orchestration_plans_projectId` (`projectId`),
  INDEX `idx_orchestration_plans_status` (`status`),
  INDEX `idx_orchestration_plans_triggerPostId` (`triggerPostId`)
);

-- ─── 10. Create trend_response_posts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `trend_response_posts` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `trendId` int NOT NULL,
  `scheduledPostId` int,
  `accountId` int,
  `trendPostEngagement` int DEFAULT 0,
  `normalAvgEngagement` int DEFAULT 0,
  `performanceLift` int DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_trend_response_posts_trendId` (`trendId`),
  INDEX `idx_trend_response_posts_scheduledPostId` (`scheduledPostId`),
  INDEX `idx_trend_response_posts_accountId` (`accountId`)
);
