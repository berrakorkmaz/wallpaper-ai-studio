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
  status: text("status").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(), updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_projects_user_updated").on(table.userId, table.updatedAt)]);

export const promptSpecs = sqliteTable("prompt_specs", {
  id: text("id").primaryKey(), projectId: text("project_id").notNull().references(() => projects.id), theme: text("theme").notNull(), style: text("style").notNull(), palette: text("palette").notNull(), motifs: text("motifs").notNull(), exclusions: text("exclusions").notNull(), density: text("density").notNull(), aspectRatio: text("aspect_ratio").notNull(), promptText: text("prompt_text").notNull(), parameters: text("parameters", { mode: "json" }).notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_prompt_specs_project").on(table.projectId)]);

export const designAssets = sqliteTable("design_assets", {
  id: text("id").primaryKey(), projectId: text("project_id").notNull().references(() => projects.id), userId: text("user_id").notNull().references(() => users.id), role: text("role").notNull(), fileUrl: text("file_url").notNull(), width: integer("width").notNull(), height: integer("height").notNull(), fileHash: text("file_hash").notNull(), version: integer("version").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_design_assets_owner_project").on(table.userId, table.projectId)]);

export const etsyConnections = sqliteTable("etsy_connections", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), shopId: text("shop_id").notNull(), encryptedAccessToken: text("encrypted_access_token").notNull(), encryptedRefreshToken: text("encrypted_refresh_token").notNull(), expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("etsy_connections_user_shop_unique").on(table.userId, table.shopId)]);

export const listingDrafts = sqliteTable("listing_drafts", {
  id: text("id").primaryKey(), projectId: text("project_id").notNull().references(() => projects.id), userId: text("user_id").notNull().references(() => users.id), shopId: text("shop_id"), title: text("title").notNull(), description: text("description").notNull(), tags: text("tags", { mode: "json" }).notNull(), price: text("price").notNull(), status: text("status").notNull(), etsyListingId: text("etsy_listing_id"), idempotencyKey: text("idempotency_key"), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_listing_drafts_owner_project").on(table.userId, table.projectId), uniqueIndex("listing_drafts_idempotency_unique").on(table.idempotencyKey)]);
