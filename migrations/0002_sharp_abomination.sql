PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_creature` (
	`id` text PRIMARY KEY DEFAULT '2d905bc1-1eab-4c46-9214-ba5771fdcd2c' NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`level` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
PRAGMA foreign_keys=ON; --> statement-breakpoint

PRAGMA foreign_keys=OFF;
INSERT INTO `__new_creature`("id", "user_id", "name", "level", "created_at") SELECT "id", "user_id", "name", "level", "created_at" FROM `creature`;
PRAGMA foreign_keys=ON; --> statement-breakpoint

PRAGMA foreign_keys=OFF;
DROP TABLE `creature`;
PRAGMA foreign_keys=ON; --> statement-breakpoint

PRAGMA foreign_keys=OFF;
ALTER TABLE `__new_creature` RENAME TO `creature`;
PRAGMA foreign_keys=ON; --> statement-breakpoint

PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY DEFAULT '5e55214f-8991-4c74-bb3e-ebccbdbaf974' NOT NULL,
	`age` integer,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
PRAGMA foreign_keys=ON; --> statement-breakpoint

PRAGMA foreign_keys=OFF;
INSERT INTO `__new_user`("id", "age", "email", "username", "password_hash", "created_at") SELECT "id", "age", "email", "username", "password_hash", "created_at" FROM `user`;
PRAGMA foreign_keys=ON; --> statement-breakpoint

PRAGMA foreign_keys=OFF;
DROP TABLE `user`;
PRAGMA foreign_keys=ON;--> statement-breakpoint

PRAGMA foreign_keys=OFF;
ALTER TABLE `__new_user` RENAME TO `user`;
PRAGMA foreign_keys=ON;--> statement-breakpoint

PRAGMA foreign_keys=OFF;
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);
PRAGMA foreign_keys=ON; --> statement-breakpoint