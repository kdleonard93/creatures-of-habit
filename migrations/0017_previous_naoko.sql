CREATE INDEX `idx_daily_tracker_user_date` ON `daily_habit_tracker` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_daily_tracker_habit` ON `daily_habit_tracker` (`habit_id`);--> statement-breakpoint
CREATE INDEX `idx_daily_tracker_date` ON `daily_habit_tracker` (`date`);--> statement-breakpoint
CREATE INDEX `idx_daily_tracker_user_habit_date` ON `daily_habit_tracker` (`user_id`,`habit_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_user_habit_date` ON `daily_habit_tracker` (`user_id`,`habit_id`,`date`);