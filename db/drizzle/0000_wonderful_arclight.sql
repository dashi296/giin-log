CREATE TABLE `attendances` (
	`id` integer PRIMARY KEY NOT NULL,
	`meeting_id` integer NOT NULL,
	`councilor_id` integer NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`councilor_id`) REFERENCES `councilors`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT `attendances_status_check` CHECK (`status` IN ('present','absent'))
);
--> statement-breakpoint
CREATE TABLE `councilors` (
	`id` integer PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`name_kana` text,
	`photo_url` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` integer PRIMARY KEY NOT NULL,
	`term_id` integer NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`held_on` text NOT NULL,
	`source_url` text NOT NULL,
	FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` integer PRIMARY KEY NOT NULL,
	`councilor_id` integer NOT NULL,
	`term_id` integer NOT NULL,
	`faction` text,
	`election_count` integer,
	`area` text,
	`phone` text,
	`committees` text,
	`roles` text,
	FOREIGN KEY (`councilor_id`) REFERENCES `councilors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `statements` (
	`id` integer PRIMARY KEY NOT NULL,
	`meeting_id` integer NOT NULL,
	`councilor_id` integer NOT NULL,
	`kind` text NOT NULL,
	`sequence` integer NOT NULL,
	`title` text,
	`body` text,
	`body_tokenized` text,
	`topics` text,
	`source_url` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`councilor_id`) REFERENCES `councilors`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT `statements_kind_check` CHECK (`kind` IN ('general_question','question','discussion','other'))
);
--> statement-breakpoint
CREATE TABLE `terms` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_attendances_meeting_councilor` ON `attendances` (`meeting_id`,`councilor_id`);--> statement-breakpoint
CREATE INDEX `idx_attendances_meeting` ON `attendances` (`meeting_id`);--> statement-breakpoint
CREATE INDEX `idx_attendances_councilor` ON `attendances` (`councilor_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `councilors_slug_unique` ON `councilors` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_meetings_natural` ON `meetings` (`term_id`,`kind`,`name`,`held_on`);--> statement-breakpoint
CREATE INDEX `idx_meetings_term` ON `meetings` (`term_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_memberships_councilor_term` ON `memberships` (`councilor_id`,`term_id`);--> statement-breakpoint
CREATE INDEX `idx_memberships_term` ON `memberships` (`term_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_statements_natural` ON `statements` (`meeting_id`,`councilor_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_statements_meeting` ON `statements` (`meeting_id`);--> statement-breakpoint
CREATE INDEX `idx_statements_councilor` ON `statements` (`councilor_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `terms_name_unique` ON `terms` (`name`);