CREATE TABLE `supplier_deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`delivery_date` text NOT NULL,
	`reference` text,
	`shipping_cost` real DEFAULT 0 NOT NULL,
	`other_costs` real DEFAULT 0 NOT NULL,
	`allocation_method` text DEFAULT 'by_net_value' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`notes` text,
	`created_by_user_id` integer,
	`confirmed_at` text,
	`confirmed_by_user_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`confirmed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `supplier_deliveries_supplier_idx` ON `supplier_deliveries` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `supplier_deliveries_status_idx` ON `supplier_deliveries` (`status`);--> statement-breakpoint
CREATE INDEX `supplier_deliveries_date_idx` ON `supplier_deliveries` (`delivery_date`);--> statement-breakpoint
CREATE TABLE `supplier_delivery_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`delivery_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_purchase_net` real NOT NULL,
	`vat_rate` real DEFAULT 21 NOT NULL,
	`vat_recoverable` integer DEFAULT true NOT NULL,
	`line_net` real DEFAULT 0 NOT NULL,
	`vat_amount` real DEFAULT 0 NOT NULL,
	`allocated_overhead` real DEFAULT 0 NOT NULL,
	`non_recoverable_tax` real DEFAULT 0 NOT NULL,
	`landed_unit_cost` real DEFAULT 0 NOT NULL,
	`stock_movement_id` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`delivery_id`) REFERENCES `supplier_deliveries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stock_movement_id`) REFERENCES `stock_movements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `supplier_delivery_lines_delivery_idx` ON `supplier_delivery_lines` (`delivery_id`);--> statement-breakpoint
CREATE INDEX `supplier_delivery_lines_product_idx` ON `supplier_delivery_lines` (`product_id`);--> statement-breakpoint
ALTER TABLE `products` ADD `landed_cost` real;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `source_type` text;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `source_id` integer;--> statement-breakpoint
CREATE INDEX `stock_movements_source_idx` ON `stock_movements` (`source_type`,`source_id`);