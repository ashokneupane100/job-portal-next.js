CREATE TABLE `sessions` (
	`id` varchar(255) PRIMARY KEY,
	`user_id` int NOT NULL,
	`user_agent` text NOT NULL,
	`ip` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_user_id_users_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN `user_name` TO `username`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `username` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `phone_number` varchar(18) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `role` enum('admin','applicant','employer') DEFAULT 'applicant' NOT NULL;