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
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`creature_id`) REFERENCES `creature`(`id`) ON UPDATE no action ON DELETE cascade
);
