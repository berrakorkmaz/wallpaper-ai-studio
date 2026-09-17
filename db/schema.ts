import { integer, real, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), projectName: text("project_name").notNull(),
  projectSequenceNumber: integer("project_sequence_number").notNull(), isProjectNameManuallyEdited: integer("is_project_name_manually_edited", { mode: "boolean" }).notNull().default(false),
  projectNameGeneratedAt: integer("project_name_generated_at", { mode: "timestamp_ms" }).notNull(), productType: text("product_type").notNull(),
  primaryTargetRoom: text("primary_target_room").notNull(), secondaryTargetRoom: text("secondary_target_room"), patternScale: text("pattern_scale"),
  physicalWidth: real("physical_width"), physicalHeight: real("physical_height"), measurementUnit: text("measurement_unit"), calculatedAspectRatio: text("calculated_aspect_ratio"),
  targetPrintPpi: integer("target_print_ppi").notNull().default(150), requiredPixelWidth: integer("required_pixel_width").notNull().default(0), requiredPixelHeight: integer("required_pixel_height").notNull().default(0),
  masterStatus: text("master_status").notNull().default("AWAITING_UPLOAD"), activeMasterVersionId: text("active_master_version_id"), artDirection: text("art_direction", { mode: "json" }),
  status: text("status").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(), updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_projects_user_updated").on(table.userId, table.updatedAt)]);

export const promptSpecs = sqliteTable("prompt_specs", {
  id: text("id").primaryKey(), projectId: text("project_id").notNull().references(() => projects.id), theme: text("theme").notNull(), style: text("style").notNull(), palette: text("palette").notNull(), motifs: text("motifs").notNull(), exclusions: text("exclusions").notNull(), density: text("density").notNull(), aspectRatio: text("aspect_ratio").notNull(), promptText: text("prompt_text").notNull(), parameters: text("parameters", { mode: "json" }).notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_prompt_specs_project").on(table.projectId)]);

export const designAssets = sqliteTable("design_assets", {
  id: text("id").primaryKey(), projectId: text("project_id").notNull().references(() => projects.id), userId: text("user_id").notNull().references(() => users.id), role: text("role").notNull(), fileUrl: text("file_url").notNull(), fileName: text("file_name").notNull(), mimeType: text("mime_type").notNull(), fileSize: integer("file_size").notNull(), width: integer("width").notNull(), height: integer("height").notNull(), fileHash: text("file_hash").notNull(), version: integer("version").notNull(), masterStatus: text("master_status"), immutable: integer("immutable", { mode: "boolean" }).notNull().default(true), approvedAt: integer("approved_at", { mode: "timestamp_ms" }), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_design_assets_owner_project").on(table.userId, table.projectId), uniqueIndex("design_assets_project_version_unique").on(table.projectId, table.version)]);

export const renderJobs = sqliteTable("render_jobs", {
  id: text("id").primaryKey(), projectId: text("project_id").notNull().references(() => projects.id), userId: text("user_id").notNull().references(() => users.id), masterVersionId: text("master_version_id").notNull().references(() => designAssets.id), slotId: text("slot_id").notNull(), slotRole: text("slot_role").notNull(), sceneTemplateId: text("scene_template_id").notNull(), renderProvider: text("render_provider").notNull(), status: text("status").notNull(), progress: integer("progress").notNull().default(0), correlationId: text("correlation_id").notNull(), idempotencyKey: text("idempotency_key").notNull(), outputAssetId: text("output_asset_id"), errorCode: text("error_code"), retryCount: integer("retry_count").notNull().default(0), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(), completedAt: integer("completed_at", { mode: "timestamp_ms" }),
}, (table) => [index("idx_render_jobs_owner_project").on(table.userId, table.projectId), uniqueIndex("render_jobs_idempotency_unique").on(table.idempotencyKey)]);

export const outputAssets = sqliteTable("output_assets", {
  id: text("id").primaryKey(), projectId: text("project_id").notNull().references(() => projects.id), userId: text("user_id").notNull().references(() => users.id), masterVersionId: text("master_version_id").notNull().references(() => designAssets.id), slotId: text("slot_id").notNull(), role: text("role").notNull(), storageKey: text("storage_key").notNull(), fileName: text("file_name").notNull(), width: integer("width").notNull(), height: integer("height").notNull(), format: text("format").notNull(), fileSize: integer("file_size").notNull(), productionReady: integer("production_ready", { mode: "boolean" }).notNull().default(false), renderProvider: text("render_provider").notNull(), sceneTemplateId: text("scene_template_id").notNull(), approved: integer("approved", { mode: "boolean" }).notNull().default(false), rejected: integer("rejected", { mode: "boolean" }).notNull().default(false), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_output_assets_owner_project").on(table.userId, table.projectId)]);

export const exportJobs = sqliteTable("export_jobs", {
  id: text("id").primaryKey(), projectId: text("project_id").notNull().references(() => projects.id), userId: text("user_id").notNull().references(() => users.id), packageType: text("package_type").notNull(), status: text("status").notNull(), idempotencyKey: text("idempotency_key").notNull(), storageKey: text("storage_key"), signedDownloadUrl: text("signed_download_url"), expiresAt: integer("expires_at", { mode: "timestamp_ms" }), errorCode: text("error_code"), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(), completedAt: integer("completed_at", { mode: "timestamp_ms" }),
}, (table) => [index("idx_export_jobs_owner_project").on(table.userId, table.projectId), uniqueIndex("export_jobs_idempotency_unique").on(table.idempotencyKey)]);

export const etsyConnections = sqliteTable("etsy_connections", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), shopId: text("shop_id").notNull(), encryptedAccessToken: text("encrypted_access_token").notNull(), encryptedRefreshToken: text("encrypted_refresh_token").notNull(), expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("etsy_connections_user_shop_unique").on(table.userId, table.shopId)]);

export const listingDrafts = sqliteTable("listing_drafts", {
  id: text("id").primaryKey(), projectId: text("project_id").notNull().references(() => projects.id), userId: text("user_id").notNull().references(() => users.id), shopId: text("shop_id"), title: text("title").notNull(), description: text("description").notNull(), tags: text("tags", { mode: "json" }).notNull(), price: text("price").notNull(), quantity: integer("quantity").notNull().default(999), productionPartner: text("production_partner"), variations: text("variations"), shippingProfileId: text("shipping_profile_id"), status: text("status").notNull(), etsyListingId: text("etsy_listing_id"), idempotencyKey: text("idempotency_key"), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_listing_drafts_owner_project").on(table.userId, table.projectId), uniqueIndex("listing_drafts_idempotency_unique").on(table.idempotencyKey)]);
