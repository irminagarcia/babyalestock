CREATE TABLE `gift_basket_assemblies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`basket_id` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`total_component_cost_snapshot` real,
	`selling_price_snapshot` real,
	`assembled_at` text DEFAULT (datetime('now')) NOT NULL,
	`notes` text,
	`status` text DEFAULT 'recorded' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`basket_id`) REFERENCES `gift_baskets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gift_basket_assembly_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assembly_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_landed_cost_snapshot` real NOT NULL,
	`line_cost_snapshot` real NOT NULL,
	FOREIGN KEY (`assembly_id`) REFERENCES `gift_basket_assemblies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `gift_basket_assembly_lines_assembly_idx` ON `gift_basket_assembly_lines` (`assembly_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_gift_baskets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`description` text,
	`assembly_mode` text DEFAULT 'mto' NOT NULL,
	`selling_price` real,
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_gift_baskets`("id", "name", "sku", "description", "assembly_mode", "selling_price", "notes", "status", "created_at", "updated_at")
SELECT "id", "name", "sku", NULL, "assembly_mode", "selling_price", "notes",
  CASE WHEN "status" IS NULL OR "status" = '' THEN 'active' ELSE "status" END,
  "created_at", "created_at"
FROM `gift_baskets`;--> statement-breakpoint
DROP TABLE `gift_baskets`;--> statement-breakpoint
ALTER TABLE `__new_gift_baskets` RENAME TO `gift_baskets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `gift_baskets_sku_uidx` ON `gift_baskets` (`sku`);--> statement-breakpoint
CREATE INDEX `gift_baskets_status_idx` ON `gift_baskets` (`status`);--> statement-breakpoint
ALTER TABLE `gift_basket_components` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `gift_basket_components` ADD `notes` text;--> statement-breakpoint
CREATE INDEX `gift_basket_components_product_idx` ON `gift_basket_components` (`product_id`);
