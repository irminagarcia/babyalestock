-- BA-22: supplier fiscal data + country (additive)
ALTER TABLE `suppliers` ADD `tax_id` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `legal_name` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `fiscal_address` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `country` text DEFAULT 'España';
