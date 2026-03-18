ALTER TABLE `accounts` ADD COLUMN IF NOT EXISTS `postingMethod` enum('duoplus','playwright','api_v2') NOT NULL DEFAULT 'playwright';
