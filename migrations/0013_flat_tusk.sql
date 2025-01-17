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
