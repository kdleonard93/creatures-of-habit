ALTER TABLE `quest_answers` ADD `passed_stat_check` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `unique_question_answer` ON `quest_answers` (`quest_instance_id`,`question_id`);--> statement-breakpoint
ALTER TABLE `quest_instances` ADD `stat_checks_passed` integer DEFAULT 0 NOT NULL;