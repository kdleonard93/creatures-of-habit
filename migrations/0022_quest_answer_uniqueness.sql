-- Ensure uniqueness constraint for quest answers
-- This prevents duplicate answers for the same question in a quest instance
CREATE UNIQUE INDEX IF NOT EXISTS `unique_quest_answer_per_question` ON `quest_answers` (`quest_instance_id`, `question_id`);

-- Also ensure uniqueness for question numbers within a quest instance
CREATE UNIQUE INDEX IF NOT EXISTS `unique_quest_question_number_per_instance` ON `quest_questions` (`quest_instance_id`, `question_number`);
