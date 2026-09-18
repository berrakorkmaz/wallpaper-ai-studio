# AI Mockup Integration

This document describes what Wallpaper AI Studio currently implements and what remains before production deployment.

## Implemented local Fal pipeline

With `RENDER_PROVIDER=fal`, the active flow is:

1. The browser keeps the uploaded wallpaper as the immutable project source.
2. `buildMockupBatchRequest()` selects the existing six category-specific scene blueprints and calls `buildMockupPrompt()` for each one.
3. Each prompt asks Fal for a photorealistic room with a large, smooth, blank, unobstructed feature wall. It explicitly forbids generated wallpaper, murals, decals, wall art, text, windows, doors, panels, and moulding on that target surface.
4. The browser reads the original upload bytes from its local `blob:` URL and sends them to the application backend as a validated `data:image/...;base64` source field. This request-scoped payload is not written to localStorage or logs and is never sent to Fal.
5. The server-only `FalRenderAdapter` uses `@fal-ai/client` and the configurable `FAL_MODEL` to generate one room per requested slot.
6. The server downloads each generated room and passes it, the original uploaded bytes, and the matching scene blueprint to the deterministic compositor.
7. The compositor tiles a seamless pattern or maps a mural once, applies a projective homography into the selected wall quadrilateral, clips it to the wall mask, and uses scene luminance for basic light/shadow retention.
8. Six completed PNG data URLs are returned to the existing result cards. Approve, Reject, Download, ZIP, and single-slot Regenerate remain available.

Fal mode never calls the browser Canvas placeholder renderer. Provider, source, scene-download, perspective, or compositor errors are returned as safe failures instead of falling back to mock output.

## Provider and API boundaries

- `GET /api/render/health` is the Studio provider source of truth.
- `POST /api/wallpaper/mockups` runs six Fal scenes for a new batch or one Fal scene for a selected-slot Regenerate.
- `integrations/image-generation/fal.ts` contains the server-only Fal adapter.
- `integrations/image-generation/wall-compositor.ts` contains the source-preserving compositor and `WallDetectionAdapter` interface.
- `lib/core/mockup-scenes.ts` remains the category, blueprint, and prompt source of truth.
- `RENDER_PROVIDER=mock` continues to use the explicitly labelled development renderer.
- `RENDER_PROVIDER=custom` continues to use the existing external render-service boundary.

`FAL_KEY` is read only on the server. It is never returned by health/config endpoints, logged, added to localStorage, or included in the browser bundle.

## Source transport and pixel preservation

The current local-development bridge accepts JPG, PNG, or WEBP source bytes up to 20 MB as a request-scoped data URL. The decoder samples final wallpaper pixels only from this uploaded source. Fal generates the room but never receives or redraws the product artwork.

For seamless products, the selected small/medium/large pattern scale controls deterministic repeat count. For murals, the source maps once across the selected wall. The geometry, motif arrangement, text, and illustration content come directly from the uploaded file. A deterministic illumination multiplier changes presentation brightness to match room light; it is not a generative edit.

This data-URL transport is not production object storage. Production must replace it with an authenticated upload/finalize endpoint, private bucket storage, server-side hash verification, ownership checks, expiring signed source URLs, and signed output URLs.

## Current wall placement strategy

Automatic wall segmentation is **not implemented**.

`BlueprintWallRegionAdapter` currently returns one conservative normalized wall quadrilateral per existing scene role: hero, creative, close-up, wide, editorial, and perspective. Fal prompts are aligned with those roles and request an unobstructed blank feature wall. The compositor calculates an inverse projective homography from the source plane into that quadrilateral and uses the quadrilateral itself as the wall mask.

This temporary strategy cannot understand unexpected windows, furniture, people, plants, mirrors, or other foreground occlusion. It reduces overlap by reserving upper wall regions and instructing Fal to keep furniture below or beside the target wall, but it does not claim true semantic segmentation.

`WallDetectionAdapter` is the explicit replacement boundary for a future segmentation/depth service. A production detector must return a validated wall mask, planar geometry or depth, and foreground occlusion masks. Scenes without a large usable wall must be rejected and regenerated.

## Status and execution model

The existing contract supports `queued`, `generating_scene`, `detecting_wall`, `compositing_wallpaper`, `quality_check`, `completed`, and `failed`. The current local Fal endpoint performs the six generations and composites synchronously. Safe server logs mark provider selection, Fal request start/completion/failure, wallpaper application, wall strategy, and quality-check completion without logging prompts, source bytes, or credentials.

Durable intermediate status polling is not implemented yet. Production must move work into a queue/worker and persist every stage independently so browser refreshes and server restarts cannot lose jobs.

## Regenerate behavior

Regenerate submits only the selected slot. The existing slot version chooses the next blueprint variant for the same scene role, one new Fal room is generated, and the same original source artwork is composited again. Other completed slots are not regenerated or rebilled.

## Still required before production deployment

1. Authenticated source upload/finalize endpoints and private object storage.
2. Server-side source hash verification and project/source/job/output ownership enforcement.
3. Durable batch/output repositories and a real queue/worker.
4. Fal queue submit/status/webhook persistence instead of synchronous API execution.
5. Automatic wall segmentation and wall suitability validation.
6. Depth-aware mapping for non-planar or complex surfaces.
7. Foreground occlusion masks for furniture, fixtures, people, plants, and decor.
8. Automated source-fidelity, color-delta, repeat-seam, coverage, and perspective QA.
9. Private intermediate/output storage, retention policies, thumbnails, and signed downloads.
10. Rate limits, request-size enforcement at the edge, retry/idempotency hardening, and production observability.

## Environment

- `RENDER_PROVIDER=mock|fal|custom`
- `FAL_KEY`: server-only Fal credential
- `FAL_MODEL`: configurable model ID; current default is `fal-ai/flux-2`
- `RENDER_SERVICE_URL` and `RENDER_SERVICE_TOKEN`: custom provider boundary
- `STORAGE_PROVIDER` and `STORAGE_BUCKET`: future private storage
- `MOCKUP_QUEUE_NAME`: future durable queue

Never use a `NEXT_PUBLIC_` prefix for provider credentials.
