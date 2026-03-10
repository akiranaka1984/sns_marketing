-- Migration: 0035_add_per_account_oauth
-- Adds per-account OAuth token columns to accounts table and creates api_usage_tracking table.

-- Task 1: Add OAuth columns to accounts table
ALTER TABLE `accounts`
  ADD COLUMN `oauthAccessToken` varchar(500) NULL,
  ADD COLUMN `oauthAccessTokenSecret` varchar(500) NULL,
  ADD COLUMN `oauthTokenStatus` enum('not_connected','active','expired','revoked') NOT NULL DEFAULT 'not_connected',
  ADD COLUMN `oauthConnectedAt` timestamp NULL,
  ADD COLUMN `oauthUsername` varchar(100) NULL;

-- Task 2: Create api_usage_tracking table
CREATE TABLE `api_usage_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `accountId` int NOT NULL,
  `month` varchar(7) NOT NULL,
  `tweetCount` int NOT NULL DEFAULT 0,
  `lastPostedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_api_usage_tracking_accountId_month_unique` (`accountId`, `month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
