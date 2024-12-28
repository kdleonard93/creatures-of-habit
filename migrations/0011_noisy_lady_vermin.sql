CREATE TABLE `user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email_notifications` integer DEFAULT 1 NOT NULL,
	`push_notifications` integer DEFAULT 1 NOT NULL,
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
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_key` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`hashed_password` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_key`("id", "user_id", "hashed_password") SELECT "id", "user_id", "hashed_password" FROM `user_key`;--> statement-breakpoint
DROP TABLE `user_key`;--> statement-breakpoint
ALTER TABLE `__new_user_key` RENAME TO `user_key`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_session`("id", "user_id", "expires_at") SELECT "id", "user_id", "expires_at" FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;--> statement-breakpoint
CREATE TABLE `__new_creature` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`class` text NOT NULL,
	`race` text NOT NULL,
	`level` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_creature`("id", "user_id", "name", "class", "race", "level", "created_at") SELECT "id", "user_id", "name", "class", "race", "level", "created_at" FROM `creature`;--> statement-breakpoint
DROP TABLE `creature`;--> statement-breakpoint
ALTER TABLE `__new_creature` RENAME TO `creature`;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "age", "email", "username", "password_hash", "created_at") SELECT "id", "age", "email", "username", "password_hash", "created_at" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);