CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`flagged` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `creature` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`class` text NOT NULL,
	`race` text NOT NULL,
	`background` text,
	`custom_background` text,
	`experience` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `creature_equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`creature_id` text NOT NULL,
	`slot` text NOT NULL,
	`item_id` text NOT NULL,
	`equipped` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`creature_id`) REFERENCES `creature`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `creature_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`creature_id` text NOT NULL,
	`strength` integer DEFAULT 10 NOT NULL,
	`dexterity` integer DEFAULT 10 NOT NULL,
	`constitution` integer DEFAULT 10 NOT NULL,
	`intelligence` integer DEFAULT 10 NOT NULL,
	`wisdom` integer DEFAULT 10 NOT NULL,
	`charisma` integer DEFAULT 10 NOT NULL,
	`stat_boost_points` integer DEFAULT 0 NOT NULL,
	`level_stat_points_spent` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`creature_id`) REFERENCES `creature`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `creature_stats_creature_id_unique` ON `creature_stats` (`creature_id`);--> statement-breakpoint
CREATE TABLE `daily_habit_tracker` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`habit_id` text NOT NULL,
	`date` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`habit_id`) REFERENCES `habit`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_daily_tracker_user_date` ON `daily_habit_tracker` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_daily_tracker_habit` ON `daily_habit_tracker` (`habit_id`);--> statement-breakpoint
CREATE INDEX `idx_daily_tracker_date` ON `daily_habit_tracker` (`date`);--> statement-breakpoint
CREATE INDEX `idx_daily_tracker_user_habit_date` ON `daily_habit_tracker` (`user_id`,`habit_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_user_habit_date` ON `daily_habit_tracker` (`user_id`,`habit_id`,`date`);--> statement-breakpoint
CREATE TABLE `email_verification_token` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`email` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `habit` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text,
	`title` text NOT NULL,
	`description` text,
	`frequency_id` text,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`base_experience` integer DEFAULT 10 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `habit_category`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`frequency_id`) REFERENCES `habit_frequency`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `habit_category` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `habit_completion` (
	`id` text PRIMARY KEY NOT NULL,
	`habit_id` text NOT NULL,
	`user_id` text NOT NULL,
	`completed_at` text NOT NULL,
	`value` integer DEFAULT 1 NOT NULL,
	`experience_earned` integer NOT NULL,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habit`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_habit_completion_day` ON `habit_completion` (`habit_id`,`completed_at`);--> statement-breakpoint
CREATE TABLE `habit_frequency` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`days` text,
	`every_x` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `habit_streak` (
	`id` text PRIMARY KEY NOT NULL,
	`habit_id` text NOT NULL,
	`user_id` text NOT NULL,
	`current_streak` integer DEFAULT 0 NOT NULL,
	`longest_streak` integer DEFAULT 0 NOT NULL,
	`last_completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habit`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_key` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`hashed_password` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `password_reset_token` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quest_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`quest_instance_id` text NOT NULL,
	`question_id` text NOT NULL,
	`user_choice` text NOT NULL,
	`was_correct` integer NOT NULL,
	`passed_stat_check` integer DEFAULT false NOT NULL,
	`answered_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`quest_instance_id`) REFERENCES `quest_instances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `quest_questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_quest_answers_instance` ON `quest_answers` (`quest_instance_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_question_answer` ON `quest_answers` (`quest_instance_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `quest_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`narrative` text NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`current_question` integer DEFAULT 0 NOT NULL,
	`correct_answers` integer DEFAULT 0 NOT NULL,
	`stat_checks_passed` integer DEFAULT 0 NOT NULL,
	`total_questions` integer DEFAULT 5 NOT NULL,
	`exp_reward_base` integer DEFAULT 50 NOT NULL,
	`exp_reward_bonus` integer DEFAULT 100 NOT NULL,
	`activated_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `quest_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_quest_instances_user_status` ON `quest_instances` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_quest_instances_user_created` ON `quest_instances` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `quest_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`quest_instance_id` text NOT NULL,
	`question_number` integer NOT NULL,
	`question_text` text NOT NULL,
	`choice_a` text NOT NULL,
	`choice_b` text NOT NULL,
	`correct_choice` text NOT NULL,
	`required_stat` text NOT NULL,
	`difficulty_threshold` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`quest_instance_id`) REFERENCES `quest_instances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_quest_questions_instance` ON `quest_questions` (`quest_instance_id`,`question_number`);--> statement-breakpoint
CREATE TABLE `quest_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`setting` text NOT NULL,
	`difficulty` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`email_verified_at` text,
	`is_admin` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email_notifications` integer DEFAULT 1 NOT NULL,
	`push_notifications` integer DEFAULT 1 NOT NULL,
	`in_app_notifications` integer DEFAULT 1 NOT NULL,
	`reminder_notifications` integer DEFAULT 1 NOT NULL,
	`profile_visibility` integer DEFAULT 0 NOT NULL,
	`activity_sharing` integer DEFAULT 0 NOT NULL,
	`stats_sharing` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_preferences_user_id_unique` ON `user_preferences` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_waitlist` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`referral_source` text,
	`status` text DEFAULT 'new' NOT NULL,
	`flagged` integer DEFAULT false NOT NULL,
	`subscribed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_waitlist_email_unique` ON `user_waitlist` (`email`);--> statement-breakpoint
CREATE INDEX `idx_user_waitlist_subscribed_at` ON `user_waitlist` (`subscribed_at`);--> statement-breakpoint
CREATE INDEX `idx_user_waitlist_referral_source` ON `user_waitlist` (`referral_source`);