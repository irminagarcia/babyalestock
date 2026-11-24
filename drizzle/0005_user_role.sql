-- BA-27: user role so admin survives username changes
ALTER TABLE `users` ADD `role` text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
UPDATE `users` SET `role` = 'admin' WHERE `username` = 'admin';
