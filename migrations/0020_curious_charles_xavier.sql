ALTER TABLE `generated_quest` RENAME TO `quest_answers`;--> statement-breakpoint
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
DROP INDEX IF EXISTS `idx_quest_user_status`;--> statement-breakpoint
DROP INDEX IF EXISTS `idx_quest_type_expires`;--> statement-breakpoint
ALTER TABLE `quest_answers` ADD `quest_instance_id` text NOT NULL REFERENCES quest_instances(id);--> statement-breakpoint
ALTER TABLE `quest_answers` ADD `question_id` text NOT NULL REFERENCES quest_questions(id);--> statement-breakpoint
ALTER TABLE `quest_answers` ADD `user_choice` text NOT NULL;--> statement-breakpoint
ALTER TABLE `quest_answers` ADD `was_correct` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `quest_answers` ADD `answered_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_quest_answers_instance` ON `quest_answers` (`quest_instance_id`);--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `user_id`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `habit_id`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `title`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `difficulty`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `experience_reward`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `required_completions`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `current_completions`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `starts_at`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `expires_at`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `completed_at`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `claimed_at`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `quest_answers` DROP COLUMN `updated_at`;--> statement-breakpoint
ALTER TABLE `creature_stats` ADD `stat_boost_points` integer DEFAULT 0 NOT NULL;