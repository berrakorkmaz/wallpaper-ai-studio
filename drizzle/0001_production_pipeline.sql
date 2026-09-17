ALTER TABLE design_assets ADD COLUMN file_name text NOT NULL DEFAULT 'master.bin';
ALTER TABLE design_assets ADD COLUMN mime_type text NOT NULL DEFAULT 'application/octet-stream';
ALTER TABLE design_assets ADD COLUMN file_size integer NOT NULL DEFAULT 0;
ALTER TABLE design_assets ADD COLUMN master_status text;
ALTER TABLE design_assets ADD COLUMN immutable integer NOT NULL DEFAULT 1;
ALTER TABLE design_assets ADD COLUMN approved_at integer;
CREATE UNIQUE INDEX design_assets_project_version_unique ON design_assets(project_id, version);
ALTER TABLE projects ADD COLUMN master_status text NOT NULL DEFAULT 'AWAITING_UPLOAD';
ALTER TABLE projects ADD COLUMN active_master_version_id text;
ALTER TABLE projects ADD COLUMN art_direction text;
ALTER TABLE listing_drafts ADD COLUMN quantity integer NOT NULL DEFAULT 999;
ALTER TABLE listing_drafts ADD COLUMN production_partner text;
ALTER TABLE listing_drafts ADD COLUMN variations text;
ALTER TABLE listing_drafts ADD COLUMN shipping_profile_id text;

CREATE TABLE render_jobs (
  id text PRIMARY KEY NOT NULL, project_id text NOT NULL, user_id text NOT NULL, master_version_id text NOT NULL,
  slot_id text NOT NULL, slot_role text NOT NULL, scene_template_id text NOT NULL, render_provider text NOT NULL,
  status text NOT NULL, progress integer NOT NULL DEFAULT 0, correlation_id text NOT NULL, idempotency_key text NOT NULL,
  output_asset_id text, error_code text, retry_count integer NOT NULL DEFAULT 0, created_at integer NOT NULL, completed_at integer,
  FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(master_version_id) REFERENCES design_assets(id)
);
CREATE INDEX idx_render_jobs_owner_project ON render_jobs(user_id, project_id);
CREATE UNIQUE INDEX render_jobs_idempotency_unique ON render_jobs(idempotency_key);

CREATE TABLE output_assets (
  id text PRIMARY KEY NOT NULL, project_id text NOT NULL, user_id text NOT NULL, master_version_id text NOT NULL,
  slot_id text NOT NULL, role text NOT NULL, storage_key text NOT NULL, file_name text NOT NULL, width integer NOT NULL,
  height integer NOT NULL, format text NOT NULL, file_size integer NOT NULL, production_ready integer NOT NULL DEFAULT 0,
  render_provider text NOT NULL, scene_template_id text NOT NULL, approved integer NOT NULL DEFAULT 0, rejected integer NOT NULL DEFAULT 0,
  created_at integer NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(master_version_id) REFERENCES design_assets(id)
);
CREATE INDEX idx_output_assets_owner_project ON output_assets(user_id, project_id);

CREATE TABLE export_jobs (
  id text PRIMARY KEY NOT NULL, project_id text NOT NULL, user_id text NOT NULL, package_type text NOT NULL, status text NOT NULL,
  idempotency_key text NOT NULL, storage_key text, signed_download_url text, expires_at integer, error_code text,
  created_at integer NOT NULL, completed_at integer, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX idx_export_jobs_owner_project ON export_jobs(user_id, project_id);
CREATE UNIQUE INDEX export_jobs_idempotency_unique ON export_jobs(idempotency_key);
