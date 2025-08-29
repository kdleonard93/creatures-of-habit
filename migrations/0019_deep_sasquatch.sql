CREATE TABLE `generated_quest` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`habit_id` text,
	`title` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`experience_reward` integer DEFAULT 10 NOT NULL,
	`required_completions` integer DEFAULT 1 NOT NULL,
	`current_completions` integer DEFAULT 0 NOT NULL,
	`starts_at` text NOT NULL,
	`expires_at` text,
	`completed_at` text,
	`claimed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`habit_id`) REFERENCES `habit`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_quest_user_status` ON `generated_quest` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_quest_type_expires` ON `generated_quest` (`type`,`expires_at`);