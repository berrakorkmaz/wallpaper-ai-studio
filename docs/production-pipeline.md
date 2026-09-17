# Production pipeline

`wallpaper-ai-studio` is the only active repository for this pipeline. The legacy connector is not a dependency and receives no mirrored changes.

## State gates

Workflow completion is derived from project records, never navigation history. Render requests require an active immutable master in `QA_PASSED` or `APPROVED`. A replacement upload creates a new version and marks existing slots stale while preserving their original `masterVersionId` lineage.

## Renderer boundary

`MockRenderAdapter` is development-only and returns `productionReady=false`. `RealRenderAdapter` calls a private queue/compositing endpoint, forwards an idempotency key and validates the returned dimensions and format. The provider must apply the approved source by wall mask, perspective/scale transform, displacement, texture blending, controlled lighting and color-safe compositing. Generative redraw of the wallpaper is prohibited.

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
- Queue/worker-based compositing service using libvips, ImageMagick or OpenCV.
- Signed URL implementation backed by `EXPORT_SIGNING_SECRET`.
- Optional Etsy OAuth adapter; draft-only, never publish.
