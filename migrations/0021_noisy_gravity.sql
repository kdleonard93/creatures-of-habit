CREATE UNIQUE INDEX `creature_stats_creature_id_unique` ON `creature_stats` (`creature_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_quest_question_answer` ON `quest_answers` (`quest_instance_id`,`question_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_quest_question_number` ON `quest_questions` (`quest_instance_id`,`question_number`);