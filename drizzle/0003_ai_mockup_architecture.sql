ALTER TABLE `design_assets` ADD `storage_key` text;
--> statement-breakpoint
ALTER TABLE `design_assets` ADD `signed_source_url` text;
--> statement-breakpoint
CREATE TABLE `mockup_batches` (`id` text PRIMARY KEY NOT NULL, `project_id` text NOT NULL, `user_id` text NOT NULL, `master_version_id` text NOT NULL, `provider` text NOT NULL, `status` text NOT NULL, `idempotency_key` text NOT NULL, `created_at` integer NOT NULL, `updated_at` integer NOT NULL, FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`), FOREIGN KEY (`user_id`) REFERENCES `users`(`id`), FOREIGN KEY (`master_version_id`) REFERENCES `design_assets`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_mockup_batches_owner_project` ON `mockup_batches` (`user_id`,`project_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `mockup_batches_idempotency_unique` ON `mockup_batches` (`idempotency_key`);
--> statement-breakpoint
CREATE TABLE `mockup_outputs` (`id` text PRIMARY KEY NOT NULL, `job_id` text NOT NULL, `scene_id` text NOT NULL, `slot_id` text NOT NULL, `category` text NOT NULL, `status` text NOT NULL, `prompt` text NOT NULL, `blueprint` text NOT NULL, `provider` text NOT NULL, `provider_job_id` text, `output_storage_key` text, `thumbnail_storage_key` text, `width` integer NOT NULL, `height` integer NOT NULL, `error` text, `created_at` integer NOT NULL, `updated_at` integer NOT NULL, FOREIGN KEY (`job_id`) REFERENCES `mockup_batches`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_mockup_outputs_job_slot` ON `mockup_outputs` (`job_id`,`slot_id`);
--> statement-breakpoint
CREATE INDEX `idx_mockup_outputs_provider_job` ON `mockup_outputs` (`provider_job_id`);
