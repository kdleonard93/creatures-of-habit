CREATE TABLE `user_waitlist` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`referral_source` text,
	`subscribed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_waitlist_email_unique` ON `user_waitlist` (`email`);--> statement-breakpoint
CREATE INDEX `idx_user_waitlist_email` ON `user_waitlist` (`email`);--> statement-breakpoint
CREATE INDEX `idx_user_waitlist_subscribed_at` ON `user_waitlist` (`subscribed_at`);--> statement-breakpoint
CREATE INDEX `idx_user_waitlist_referral_source` ON `user_waitlist` (`referral_source`);