-- Migration: 0039_comprehensive_schema_sync
-- Description: Comprehensive schema sync - adds all missing columns and tables
--              that exist in drizzle/schema.ts but may be absent from the DB.
--              All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
--              so re-running is safe.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. accounts table - missing columns
-- ─────────────────────────────────────────────────────────────────────────────

-- xHandle, persona (basic fields that may have been added before migration tracking)
ALTER TABLE `accounts`
  ADD COLUMN IF NOT EXISTS `xHandle` varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS `persona` varchar(200) NULL,
  ADD COLUMN IF NOT EXISTS `proxyId` int NULL;

-- Account-level persona fields
ALTER TABLE `accounts`
  ADD COLUMN IF NOT EXISTS `personaRole` varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS `personaTone` enum('formal','casual','friendly','professional','humorous') NULL,
  ADD COLUMN IF NOT EXISTS `personaCharacteristics` text NULL;

-- X (Twitter) plan type
ALTER TABLE `accounts`
  ADD COLUMN IF NOT EXISTS `planType` enum('free','premium','premium_plus') NOT NULL DEFAULT 'free';

-- Posting method (also handled in 0038, this is safe due to IF NOT EXISTS)
ALTER TABLE `accounts`
  ADD COLUMN IF NOT EXISTS `postingMethod` enum('duoplus','playwright','api_v2') NOT NULL DEFAULT 'playwright';

-- Playwright session status
ALTER TABLE `accounts`
  ADD COLUMN IF NOT EXISTS `sessionStatus` enum('active','expired','needs_login') NOT NULL DEFAULT 'needs_login';

-- Growth system fields
ALTER TABLE `accounts`
  ADD COLUMN IF NOT EXISTS `experiencePoints` int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `level` int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `totalLearningsCount` int NOT NULL DEFAULT 0;

-- Per-account OAuth tokens (also in 0035, safe due to IF NOT EXISTS)
ALTER TABLE `accounts`
  ADD COLUMN IF NOT EXISTS `oauthAccessToken` varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS `oauthAccessTokenSecret` varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS `oauthTokenStatus` enum('not_connected','active','expired','revoked') NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS `oauthConnectedAt` timestamp NULL,
  ADD COLUMN IF NOT EXISTS `oauthUsername` varchar(100) NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. agents table - missing columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `agents`
  ADD COLUMN IF NOT EXISTS `projectId` int NULL,
  ADD COLUMN IF NOT EXISTS `postingFrequency` enum('daily','twice_daily','three_times_daily','weekly','custom') NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS `postingTimeSlots` text NULL,
  ADD COLUMN IF NOT EXISTS `skipReview` tinyint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `autoOptimizationSettings` text NULL,
  ADD COLUMN IF NOT EXISTS `imageGenerationEnabled` tinyint NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. proxies table - missing columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `proxies`
  ADD COLUMN IF NOT EXISTS `duoplusProxyId` varchar(255) NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. scheduled_posts table - missing columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `scheduled_posts`
  ADD COLUMN IF NOT EXISTS `agentId` int NULL,
  ADD COLUMN IF NOT EXISTS `generatedByAgent` tinyint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `reviewStatus` enum('draft','pending_review','approved','rejected') NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS `reviewedAt` timestamp NULL,
  ADD COLUMN IF NOT EXISTS `reviewNotes` text NULL,
  ADD COLUMN IF NOT EXISTS `originalContent` text NULL,
  ADD COLUMN IF NOT EXISTS `contentConfidence` int NULL,
  ADD COLUMN IF NOT EXISTS `postUrl` text NULL,
  ADD COLUMN IF NOT EXISTS `screenshotUrl` text NULL,
  ADD COLUMN IF NOT EXISTS `usedLearningIds` text NULL,
  ADD COLUMN IF NOT EXISTS `contentPillar` varchar(50) NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. posts table - missing columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `posts`
  ADD COLUMN IF NOT EXISTS `agentId` int NULL,
  ADD COLUMN IF NOT EXISTS `platform` varchar(50) NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. strategies table - missing columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `strategies`
  ADD COLUMN IF NOT EXISTS `projectId` int NULL,
  ADD COLUMN IF NOT EXISTS `name` varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS `description` text NULL,
  ADD COLUMN IF NOT EXISTS `projectTargetsSnapshot` text NULL,
  ADD COLUMN IF NOT EXISTS `incorporatedBuzzLearnings` text NULL,
  ADD COLUMN IF NOT EXISTS `incorporatedModelPatterns` text NULL,
  ADD COLUMN IF NOT EXISTS `basedOnModelAccounts` text NULL,
  ADD COLUMN IF NOT EXISTS `basedOnBuzzPosts` text NULL,
  ADD COLUMN IF NOT EXISTS `validFrom` timestamp NULL,
  ADD COLUMN IF NOT EXISTS `validUntil` timestamp NULL,
  ADD COLUMN IF NOT EXISTS `isActive` tinyint NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `effectivenessScore` int NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `postsGenerated` int NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `avgPostPerformance` int NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `contentGuidelines` text NULL,
  ADD COLUMN IF NOT EXISTS `timingGuidelines` text NULL,
  ADD COLUMN IF NOT EXISTS `hashtagGuidelines` text NULL,
  ADD COLUMN IF NOT EXISTS `toneGuidelines` text NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. campaigns table - missing columns (also in 0037, safe)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `campaigns`
  ADD COLUMN IF NOT EXISTS `userId` int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `targetUrl` text NULL,
  ADD COLUMN IF NOT EXISTS `utmSource` varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS `utmMedium` varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS `utmCampaign` varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS `budget` decimal(12,2) NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `revenue` decimal(12,2) NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `roi` decimal(8,2) NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `startDate` timestamp NULL,
  ADD COLUMN IF NOT EXISTS `endDate` timestamp NULL;

-- Safely add index if not exists (ignore duplicate key error at the DB level)
ALTER TABLE `campaigns`
  ADD INDEX IF NOT EXISTS `idx_campaigns_userId` (`userId`),
  ADD INDEX IF NOT EXISTS `idx_campaigns_projectId` (`projectId`);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. tracked_trends table - missing columns (also in 0037, safe)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `tracked_trends`
  ADD COLUMN IF NOT EXISTS `userId` int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `projectId` int NULL,
  ADD COLUMN IF NOT EXISTS `source` enum('buzz_analysis','model_account','manual') NULL DEFAULT 'buzz_analysis',
  ADD COLUMN IF NOT EXISTS `volumeEstimate` int NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `expiresAt` timestamp NULL,
  ADD COLUMN IF NOT EXISTS `respondedAt` timestamp NULL,
  ADD COLUMN IF NOT EXISTS `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Extend status enum to include all required values
ALTER TABLE `tracked_trends`
  MODIFY COLUMN `status` enum('detected','evaluating','responding','responded','expired','active','used') NOT NULL DEFAULT 'detected';

-- Extend platform column to typed enum
ALTER TABLE `tracked_trends`
  MODIFY COLUMN `platform` enum('twitter','tiktok','instagram','facebook') NULL;

ALTER TABLE `tracked_trends`
  ADD INDEX IF NOT EXISTS `idx_tracked_trends_userId` (`userId`),
  ADD INDEX IF NOT EXISTS `idx_tracked_trends_projectId` (`projectId`),
  ADD INDEX IF NOT EXISTS `idx_tracked_trends_status` (`status`);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. content_calendar table - missing columns (also in 0037, safe)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `content_calendar`
  ADD COLUMN IF NOT EXISTS `accountId` int NULL,
  ADD COLUMN IF NOT EXISTS `agentId` int NULL,
  ADD COLUMN IF NOT EXISTS `scheduledPostId` int NULL,
  ADD COLUMN IF NOT EXISTS `notes` text NULL;

-- Extend enums
ALTER TABLE `content_calendar`
  MODIFY COLUMN `contentType` enum('educational','engagement','promotional','story','reserved','trend_response','general') NULL,
  MODIFY COLUMN `status` enum('planned','drafted','scheduled','published','content_generated') NOT NULL DEFAULT 'planned';

ALTER TABLE `content_calendar`
  ADD INDEX IF NOT EXISTS `idx_content_calendar_accountId` (`accountId`),
  ADD INDEX IF NOT EXISTS `idx_content_calendar_agentId` (`agentId`);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. growth_loop_actions - add 'failed' status to enum (also in 0037, safe)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `growth_loop_actions`
  MODIFY COLUMN `status` enum('pending','approved','rejected','executed','failed') NOT NULL DEFAULT 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. interaction_settings table - missing columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `interaction_settings`
  ADD COLUMN IF NOT EXISTS `retweetEnabled` tinyint NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `retweetDelayMinMin` int NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS `retweetDelayMinMax` int NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS `followEnabled` tinyint NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `followDelayMinMin` int NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS `followDelayMinMax` int NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS `followTargetUsers` text NULL,
  ADD COLUMN IF NOT EXISTS `reactionProbability` int NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS `maxReactingAccounts` int NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. api_usage_tracking table (also in 0035 without IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `api_usage_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `accountId` int NOT NULL,
  `month` varchar(7) NOT NULL,
  `tweetCount` int NOT NULL DEFAULT 0,
  `lastPostedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_api_usage_tracking_accountId_month_unique` (`accountId`, `month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. admin_settings table (also in 0036 with IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `admin_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. account_relationships table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `account_relationships` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `fromAccountId` int NOT NULL,
  `toAccountId` int NOT NULL,
  `intimacyLevel` int NOT NULL DEFAULT 50,
  `relationshipType` enum('friend','acquaintance','follower','colleague','rival','stranger') NOT NULL DEFAULT 'acquaintance',
  `interactionProbability` int NOT NULL DEFAULT 70,
  `preferredReactionTypes` text NULL,
  `commentStyle` enum('supportive','curious','playful','professional','neutral') NULL DEFAULT 'neutral',
  `notes` text NULL,
  `isActive` tinyint NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_account_relationships_projectId` (`projectId`),
  INDEX `idx_account_relationships_fromAccountId` (`fromAccountId`),
  INDEX `idx_account_relationships_toAccountId` (`toAccountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. account_roles table (also in 0037 with IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `account_roles` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `accountId` int NOT NULL,
  `role` enum('main','amplifier','engagement','support') NOT NULL,
  `priority` int NOT NULL DEFAULT 50,
  `isActive` tinyint NOT NULL DEFAULT 1,
  `config` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_account_roles_projectId` (`projectId`),
  INDEX `idx_account_roles_accountId` (`accountId`),
  INDEX `idx_account_roles_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. account_health table (also in 0037 with IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────

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
  `throttleReason` text NULL,
  `throttleUntil` timestamp NULL,
  `isSuspended` tinyint NOT NULL DEFAULT 0,
  `suspendedReason` text NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. conversion_events table (also in 0037 with IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `conversion_events` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `campaignId` int NULL,
  `accountId` int NULL,
  `postId` int NULL,
  `trackedLinkId` int NULL,
  `eventType` enum('impression','engagement','profile_visit','follow','link_click','page_view','signup','purchase') NOT NULL,
  `eventValue` decimal(12,2) NULL,
  `metadata` text NULL,
  `occurredAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_conversion_events_campaignId` (`campaignId`),
  INDEX `idx_conversion_events_accountId` (`accountId`),
  INDEX `idx_conversion_events_postId` (`postId`),
  INDEX `idx_conversion_events_trackedLinkId` (`trackedLinkId`),
  INDEX `idx_conversion_events_eventType` (`eventType`),
  INDEX `idx_conversion_events_occurredAt` (`occurredAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. tracked_links table (also in 0037 with IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `tracked_links` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `campaignId` int NULL,
  `accountId` int NULL,
  `postId` int NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. orchestration_plans table (also in 0037 with IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `orchestration_plans` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `triggerPostId` int NULL,
  `triggerPostUrl` text NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. trend_response_posts table (also in 0037 with IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `trend_response_posts` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `trendId` int NOT NULL,
  `scheduledPostId` int NULL,
  `accountId` int NULL,
  `trendPostEngagement` int NULL DEFAULT 0,
  `normalAvgEngagement` int NULL DEFAULT 0,
  `performanceLift` int NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_trend_response_posts_trendId` (`trendId`),
  INDEX `idx_trend_response_posts_scheduledPostId` (`scheduledPostId`),
  INDEX `idx_trend_response_posts_accountId` (`accountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 21. account_learnings table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `account_learnings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `accountId` int NOT NULL,
  `projectId` int NULL,
  `learningType` enum(
    'posting_style','comment_style','success_pattern','failure_pattern',
    'hashtag_strategy','timing_pattern','topic_preference','audience_insight'
  ) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `sourceType` enum('post_performance','buzz_analysis','manual','ai_suggestion') NOT NULL,
  `sourcePostId` int NULL,
  `sourceLearningId` int NULL,
  `confidence` int NOT NULL DEFAULT 50,
  `usageCount` int NOT NULL DEFAULT 0,
  `successRate` int NOT NULL DEFAULT 0,
  `isActive` tinyint NOT NULL DEFAULT 1,
  `expiresAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `account_learnings_account_idx` (`accountId`),
  INDEX `account_learnings_type_idx` (`accountId`, `learningType`),
  INDEX `idx_account_learnings_projectId` (`projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 22. model_accounts table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `model_accounts` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `projectId` int NULL,
  `platform` enum('twitter','tiktok','instagram','facebook') NOT NULL,
  `username` varchar(255) NOT NULL,
  `displayName` varchar(255) NULL,
  `profileUrl` text NULL,
  `avatarUrl` text NULL,
  `headerImageUrl` text NULL,
  `bio` text NULL,
  `followersCount` int NULL DEFAULT 0,
  `followingCount` int NULL DEFAULT 0,
  `industryCategory` enum(
    'it_tech','beauty_fashion','food_restaurant','finance_investment',
    'health_fitness','education','entertainment','travel','business','other'
  ) NULL,
  `postingStyle` enum('informative','entertaining','educational','inspirational','promotional') NULL,
  `toneStyle` enum('casual','formal','humorous','professional') NULL,
  `isActive` tinyint NOT NULL DEFAULT 1,
  `collectionFrequency` enum('hourly','daily','weekly') NULL DEFAULT 'daily',
  `lastCollectedAt` timestamp NULL,
  `nextCollectionAt` timestamp NULL,
  `totalCollectedPosts` int NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `model_accounts_user_platform_idx` (`userId`, `platform`),
  INDEX `model_accounts_industry_idx` (`industryCategory`),
  INDEX `idx_model_accounts_projectId` (`projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 23. buzz_posts table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `buzz_posts` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `projectId` int NULL,
  `sourceType` enum('own_account','model_account') NOT NULL,
  `sourceAccountId` int NULL,
  `modelAccountId` int NULL,
  `platform` enum('twitter','tiktok','instagram','facebook') NOT NULL,
  `externalPostId` varchar(255) NULL,
  `postUrl` text NULL,
  `content` text NOT NULL,
  `mediaUrls` text NULL,
  `hashtags` text NULL,
  `postedAt` timestamp NULL,
  `likesCount` int NULL DEFAULT 0,
  `commentsCount` int NULL DEFAULT 0,
  `sharesCount` int NULL DEFAULT 0,
  `viewsCount` int NULL DEFAULT 0,
  `engagementRate` int NULL DEFAULT 0,
  `viralityScore` int NULL DEFAULT 0,
  `industryCategory` enum(
    'it_tech','beauty_fashion','food_restaurant','finance_investment',
    'health_fitness','education','entertainment','travel','business','other'
  ) NULL,
  `postType` enum('announcement','empathy','educational','humor','promotional','question','other') NULL,
  `toneStyle` enum('casual','formal','humorous','inspirational','professional') NULL,
  `contentFormat` enum('text_only','with_image','with_video','with_poll','thread') NULL,
  `successFactors` text NULL,
  `contentStructure` text NULL,
  `hookAnalysis` text NULL,
  `ctaAnalysis` text NULL,
  `isAnalyzed` tinyint NOT NULL DEFAULT 0,
  `analyzedAt` timestamp NULL,
  `isUsedForLearning` tinyint NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `buzz_posts_source_idx` (`sourceType`, `sourceAccountId`),
  INDEX `buzz_posts_model_idx` (`modelAccountId`),
  INDEX `buzz_posts_category_idx` (`industryCategory`, `postType`),
  INDEX `buzz_posts_virality_idx` (`viralityScore`),
  INDEX `idx_buzz_posts_userId` (`userId`),
  INDEX `idx_buzz_posts_projectId` (`projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 24. buzz_learnings table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `buzz_learnings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `projectId` int NULL,
  `agentId` int NULL,
  `industryCategory` enum(
    'it_tech','beauty_fashion','food_restaurant','finance_investment',
    'health_fitness','education','entertainment','travel','business','other'
  ) NULL,
  `postType` enum('announcement','empathy','educational','humor','promotional','question','other') NULL,
  `learningType` enum(
    'hook_pattern','structure_pattern','hashtag_strategy','timing_pattern',
    'cta_pattern','media_usage','tone_pattern','engagement_tactic'
  ) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `patternData` text NULL,
  `examplePostIds` text NULL,
  `confidence` int NOT NULL DEFAULT 50,
  `usageCount` int NULL DEFAULT 0,
  `successRate` int NULL DEFAULT 0,
  `sampleSize` int NULL DEFAULT 0,
  `isActive` tinyint NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `buzz_learnings_agent_idx` (`agentId`),
  INDEX `buzz_learnings_category_idx` (`industryCategory`, `learningType`),
  INDEX `idx_buzz_learnings_userId` (`userId`),
  INDEX `idx_buzz_learnings_projectId` (`projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 25. profile_analyses table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `profile_analyses` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `targetType` enum('own_account','model_account') NOT NULL,
  `accountId` int NULL,
  `modelAccountId` int NULL,
  `bio` text NULL,
  `avatarUrl` text NULL,
  `headerImageUrl` text NULL,
  `bioAnalysis` text NULL,
  `avatarAnalysis` text NULL,
  `headerAnalysis` text NULL,
  `overallScore` int NULL DEFAULT 0,
  `bioSuggestions` text NULL,
  `avatarSuggestions` text NULL,
  `headerSuggestions` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `profile_analyses_target_idx` (`targetType`, `accountId`),
  INDEX `idx_profile_analyses_userId` (`userId`),
  INDEX `idx_profile_analyses_modelAccountId` (`modelAccountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 26. model_account_behavior_patterns table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `model_account_behavior_patterns` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `modelAccountId` int NOT NULL,
  `avgPostsPerDay` decimal(5,2) NULL,
  `avgPostsPerWeek` decimal(5,2) NULL,
  `postingFrequencyStdDev` decimal(5,2) NULL,
  `postingHoursDistribution` text NULL,
  `peakPostingHours` text NULL,
  `postingDaysDistribution` text NULL,
  `avgEngagementRate` decimal(6,2) NULL,
  `engagementRateTrend` text NULL,
  `bestEngagementHours` text NULL,
  `followerGrowthRate` decimal(8,2) NULL,
  `followerHistory` text NULL,
  `avgContentLength` int NULL,
  `emojiUsageRate` decimal(4,2) NULL,
  `hashtagAvgCount` decimal(4,2) NULL,
  `mediaUsageRate` decimal(4,2) NULL,
  `analysisPeriodStart` timestamp NULL,
  `analysisPeriodEnd` timestamp NULL,
  `sampleSize` int NULL,
  `lastAnalyzedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `model_account_behavior_patterns_model_idx` (`modelAccountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 27. project_model_accounts table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `project_model_accounts` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `modelAccountId` int NOT NULL,
  `autoApplyLearnings` tinyint NOT NULL DEFAULT 0,
  `targetAccountIds` text NULL,
  `lastSyncedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `project_model_accounts_project_idx` (`projectId`),
  INDEX `project_model_accounts_model_idx` (`modelAccountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 28. account_model_accounts table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `account_model_accounts` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `accountId` int NOT NULL,
  `modelAccountId` int NOT NULL,
  `autoApplyLearnings` tinyint NOT NULL DEFAULT 0,
  `lastSyncedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `account_model_accounts_account_idx` (`accountId`),
  INDEX `account_model_accounts_model_idx` (`modelAccountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 29. project_kpi_tracking table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `project_kpi_tracking` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `metricType` enum(
    'followers','engagement_rate','impressions',
    'clicks','conversions','posts_count','avg_likes'
  ) NOT NULL,
  `targetValue` decimal(15,2) NULL,
  `targetDeadline` timestamp NULL,
  `currentValue` decimal(15,2) NULL DEFAULT 0,
  `progressPercentage` decimal(5,2) NULL DEFAULT 0,
  `projectedValue` decimal(15,2) NULL,
  `onTrack` tinyint NULL DEFAULT 1,
  `valueHistory` text NULL,
  `recordedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `project_kpi_tracking_project_idx` (`projectId`),
  INDEX `project_kpi_tracking_metric_idx` (`projectId`, `metricType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 30. engagement_tracking_jobs table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `engagement_tracking_jobs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `postUrlId` int NOT NULL,
  `tweetId` varchar(50) NOT NULL,
  `accountId` int NOT NULL,
  `projectId` int NULL,
  `trackingType` enum('1h','24h','48h','72h') NOT NULL,
  `scheduledAt` timestamp NOT NULL,
  `status` enum('pending','processing','completed','failed','skipped') NOT NULL DEFAULT 'pending',
  `executedAt` timestamp NULL,
  `metrics` text NULL,
  `errorMessage` text NULL,
  `retryCount` int NOT NULL DEFAULT 0,
  `learningTriggered` tinyint NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `engagement_tracking_jobs_status_idx` (`status`, `scheduledAt`),
  INDEX `engagement_tracking_jobs_post_idx` (`postUrlId`),
  INDEX `engagement_tracking_jobs_account_idx` (`accountId`),
  INDEX `idx_engagement_tracking_jobs_projectId` (`projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 31. learning_sync_log table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `learning_sync_log` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `sourceLearningType` enum('buzz_learning','agent_knowledge') NOT NULL,
  `sourceLearningId` int NOT NULL,
  `targetAccountId` int NOT NULL,
  `accountLearningId` int NULL,
  `relevanceScore` int NOT NULL DEFAULT 50,
  `autoApplied` tinyint NOT NULL DEFAULT 1,
  `syncedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `learning_sync_log_source_idx` (`sourceLearningType`, `sourceLearningId`),
  INDEX `learning_sync_log_target_idx` (`targetAccountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 32. hashtag_performance table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `hashtag_performance` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `hashtag` varchar(255) NOT NULL,
  `accountId` int NULL,
  `projectId` int NULL,
  `usageCount` int NOT NULL DEFAULT 0,
  `avgLikes` int NOT NULL DEFAULT 0,
  `avgComments` int NOT NULL DEFAULT 0,
  `avgShares` int NOT NULL DEFAULT 0,
  `avgEngagementRate` int NOT NULL DEFAULT 0,
  `bestPerformingPostId` int NULL,
  `trendScore` int NOT NULL DEFAULT 0,
  `lastUsedAt` timestamp NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `hashtag_performance_hashtag_idx` (`hashtag`),
  INDEX `hashtag_performance_account_idx` (`accountId`),
  INDEX `hashtag_performance_project_idx` (`projectId`),
  INDEX `hashtag_performance_trend_idx` (`trendScore`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 33. funnel_events table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `funnel_events` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `accountId` int NOT NULL,
  `projectId` int NULL,
  `eventType` enum('impression','engagement','profile_visit','follow','conversion') NOT NULL,
  `postId` int NULL,
  `sourceType` varchar(100) NULL,
  `value` int NULL DEFAULT 0,
  `metadata` text NULL,
  `recordedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `funnel_events_account_idx` (`accountId`),
  INDEX `funnel_events_project_idx` (`projectId`),
  INDEX `funnel_events_type_idx` (`eventType`, `recordedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 34. growth_loop_state table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `growth_loop_state` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `isRunning` tinyint NOT NULL DEFAULT 0,
  `currentStrategyScore` int NULL DEFAULT 0,
  `consecutiveDeclines` int NULL DEFAULT 0,
  `escalationNeeded` tinyint NOT NULL DEFAULT 0,
  `escalationReason` text NULL,
  `lastKpiCheckAt` timestamp NULL,
  `lastStrategyEvaluationAt` timestamp NULL,
  `lastFullReviewAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_growth_loop_state_projectId` (`projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 35. automation_tasks table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `automation_tasks` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `postUrl` text NOT NULL,
  `action` text NOT NULL,
  `status` text NOT NULL DEFAULT 'pending',
  `deviceId` text NOT NULL,
  `persona` text NULL,
  `generatedComment` text NULL,
  `result` text NULL,
  `executedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 36. x_api_settings table - missing columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `x_api_settings`
  ADD COLUMN IF NOT EXISTS `accessToken` varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS `accessTokenSecret` varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS `apiTier` enum('free','basic','pro','enterprise') NULL DEFAULT 'free';

-- ─────────────────────────────────────────────────────────────────────────────
-- End of migration
-- ─────────────────────────────────────────────────────────────────────────────
