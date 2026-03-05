-- Add X API v2 posting support
-- 1. Extend accounts.postingMethod enum to include 'api_v2'
-- 2. Add OAuth 1.0a fields to x_api_settings
-- 3. Add apiTier field to x_api_settings

ALTER TABLE `accounts` MODIFY COLUMN `postingMethod` enum('duoplus','playwright','api_v2') NOT NULL DEFAULT 'playwright';

ALTER TABLE `x_api_settings` ADD COLUMN `accessToken` varchar(500) NULL;
ALTER TABLE `x_api_settings` ADD COLUMN `accessTokenSecret` varchar(500) NULL;
ALTER TABLE `x_api_settings` ADD COLUMN `apiTier` enum('free','basic','pro','enterprise') DEFAULT 'free';
