-- Milestone 3: gift-basket assembly (additive; preserves M1/M2 data)
ALTER TABLE `gift_baskets` ADD `finished_stock` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `gift_basket_assemblies` ADD `recipe_name_snapshot` text;--> statement-breakpoint
ALTER TABLE `gift_basket_assemblies` ADD `assembly_mode` text DEFAULT 'preassembled' NOT NULL;--> statement-breakpoint
ALTER TABLE `gift_basket_assemblies` ADD `assembled_by_user_id` integer;--> statement-breakpoint
ALTER TABLE `gift_basket_assemblies` ADD `idempotency_key` text;--> statement-breakpoint
ALTER TABLE `gift_basket_assemblies` ADD `cancelled_at` text;--> statement-breakpoint
ALTER TABLE `gift_basket_assemblies` ADD `cancelled_by_user_id` integer;--> statement-breakpoint
UPDATE `gift_basket_assemblies` SET `idempotency_key` = 'legacy-assembly:' || CAST(`id` AS TEXT) WHERE `idempotency_key` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `gift_basket_assemblies_idempotency_uidx` ON `gift_basket_assemblies` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `gift_basket_assemblies_basket_idx` ON `gift_basket_assemblies` (`basket_id`);--> statement-breakpoint
CREATE INDEX `gift_basket_assemblies_assembled_idx` ON `gift_basket_assemblies` (`assembled_at`);--> statement-breakpoint
CREATE INDEX `gift_basket_assemblies_status_idx` ON `gift_basket_assemblies` (`status`);--> statement-breakpoint
ALTER TABLE `gift_basket_assembly_lines` ADD `recipe_qty_per_unit` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `gift_basket_assembly_lines` ADD `stock_movement_id` integer;
