CREATE TABLE `users` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`user_name` varchar(255),
	`password` text NOT NULL,
	`email` varchar(255),
	`phone_number` varchar(16) NOT NULL,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_name_unique` UNIQUE INDEX(`user_name`),
	CONSTRAINT `email_unique` UNIQUE INDEX(`email`)
);
