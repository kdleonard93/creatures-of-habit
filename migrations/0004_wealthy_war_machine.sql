PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_creature` (
	`id` text PRIMARY KEY DEFAULT '9ee3f6d1-089a-40d1-81e8-5f3b64f35cad' NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`level` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_creature`("id", "user_id", "name", "level", "created_at") SELECT "id", "user_id", "name", "level", "created_at" FROM `creature`;--> statement-breakpoint
DROP TABLE `creature`;--> statement-breakpoint
ALTER TABLE `__new_creature` RENAME TO `creature`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY DEFAULT '9982fb30-0a8d-45d9-b3ea-6bccd8890ada' NOT NULL,
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