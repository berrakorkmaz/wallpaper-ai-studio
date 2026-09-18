# Production pipeline

`wallpaper-ai-studio` is the only active repository for this pipeline. The legacy connector is not a dependency and receives no mirrored changes.

## State gates

Workflow completion is derived from project records, never navigation history. Render requests require an active immutable master in `QA_PASSED` or `APPROVED`. A replacement upload creates a new version and marks existing slots stale while preserving their original `masterVersionId` lineage.

Prompt Studio is optional. `artworkSource=user_upload` records the step as skipped rather than completed, removes prompt requirements from later gates, and stores the source label in project export metadata. Uploaded artwork still passes the identical master QA and versioning pipeline.

## Renderer boundaries

`MockRenderAdapter` is development-only and returns `productionReady=false`. The active `RENDER_PROVIDER=fal` path is server-only and uses `fal-ai/flux-2` for each clean interior followed by `fal-ai/flux-2-pro/edit` with the interior and original wallpaper as ordered references. Six slots run with controlled concurrency, real streamed stages and slot-level failure isolation. `RealRenderAdapter` and its external compositing boundary remain isolated behind `RENDER_PROVIDER=custom` for backward compatibility.

## Output profiles

- Production Master: original bytes, dimensions and SHA-256 retained; no recompression.
- Marketing images: 3000px minimum long edge, sRGB, JPG quality 93 by default, metadata stripped.
- PNG: used only when output transparency is required.
- Development renderer: 3000×2250 JPG for scene/guide previews and 3000×3000 for clean/repeat views; never sale-ready.

## Export and access

Every export is modeled as a user-owned job. Production storage paths must begin with the authenticated user ID. Download URLs are signed, expire, and are resolved only after project/asset ownership checks. ZIP metadata is recursively stripped of token, OAuth, key, secret, authorization and cookie fields.

## Production services still required

- Auth provider capable of producing a stable server-side user ID.
- SQLite/Postgres database and application of both migrations.
- Private R2/S3-compatible object storage.
- Server-side Fal credential and sufficient provider credit.
- Durable job/queue infrastructure for deployment-scale resumability; local production currently streams request-scoped slot progress.
- Signed URL implementation backed by `EXPORT_SIGNING_SECRET`.
- Optional Etsy OAuth adapter; draft-only, never publish.
