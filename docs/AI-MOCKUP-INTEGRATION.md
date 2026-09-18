# AI Mockup Integration

This document describes what Wallpaper AI Studio currently implements and what remains before production deployment.

## Implemented local Fal pipeline

With `RENDER_PROVIDER=fal`, the active flow is:

1. The browser keeps the uploaded wallpaper as the immutable project source.
2. While mask validation is active, `FAL_SINGLE_MOCKUP_TEST` defaults to `true`; `buildMockupBatchRequest()` sends only the first category-specific scene blueprint. Set it to `false` only after the one-image mask test is accepted.
3. Each prompt asks Fal for a photorealistic room with a large, smooth, blank, unobstructed feature wall. It explicitly forbids generated wallpaper, murals, decals, wall art, text, windows, doors, panels, and moulding on that target surface.
4. The browser reads the original upload bytes from its local `blob:` URL and sends them to the application backend as a validated `data:image/...;base64` source field. This request-scoped payload is not written to localStorage or logs and is never sent to Fal.
5. The server-only `FalRenderAdapter` uses `@fal-ai/client` and the configurable `FAL_MODEL` to generate one room per requested slot.
6. The server sends the generated room URL to the server-only `FalWallSegmentationAdapter`. The configurable `FAL_WALL_SEGMENTATION_MODEL` (default `fal-ai/evf-sam`) receives a positive prompt for the visible blank feature-wall surface and a negative prompt excluding furniture, fixtures, openings, trim, decor, and foreground objects.
7. The returned binary semantic mask is downloaded. If it is empty, nearly full-frame, malformed, or too small to represent a usable wall, the request fails without geometric fallback.
8. The compositor derives its perspective plane from the real mask boundary, tiles a seamless pattern or maps a mural once, and clips every written pixel to the semantic mask. Holes and excluded regions remain original scene pixels, keeping foreground objects in front.
9. Per-pixel wall luminance relative to the masked wall mean preserves natural shadows and tonal variation without asking AI to redraw the artwork.
10. One completed PNG data URL is returned in test mode. Approve, Reject, Download, ZIP, and single-slot Regenerate remain available.

Fal mode never calls the browser Canvas placeholder renderer. Provider, source, scene-download, perspective, or compositor errors are returned as safe failures instead of falling back to mock output.

## Provider and API boundaries

- `GET /api/render/health` is the Studio provider source of truth.
- `POST /api/wallpaper/mockups` accepts exactly one Fal scene while `FAL_SINGLE_MOCKUP_TEST=true`. Later, setting it to `false` restores six scenes for a new batch and one scene for Regenerate.
- `integrations/image-generation/fal.ts` contains the server-only Fal adapter.
- `integrations/image-generation/wall-segmentation.ts` contains the server-only semantic wall-mask adapter.
- `integrations/image-generation/wall-compositor.ts` contains the source-preserving, semantic-mask-only compositor.
- `lib/core/mockup-scenes.ts` remains the category, blueprint, and prompt source of truth.
- `RENDER_PROVIDER=mock` continues to use the explicitly labelled development renderer.
- `RENDER_PROVIDER=custom` continues to use the existing external render-service boundary.

`FAL_KEY` is read only on the server. It is never returned by health/config endpoints, logged, added to localStorage, or included in the browser bundle.

## Source transport and pixel preservation

The current local-development bridge accepts JPG, PNG, or WEBP source bytes up to 20 MB as a request-scoped data URL. The decoder samples final wallpaper pixels only from this uploaded source. Fal generates the room but never receives or redraws the product artwork.

For seamless products, the selected small/medium/large pattern scale controls deterministic repeat count. For murals, the source maps once across the selected wall. The geometry, motif arrangement, text, and illustration content come directly from the uploaded file. A deterministic illumination multiplier changes presentation brightness to match room light; it is not a generative edit.

This data-URL transport is not production object storage. Production must replace it with an authenticated upload/finalize endpoint, private bucket storage, server-side hash verification, ownership checks, expiring signed source URLs, and signed output URLs.

## Current wall placement strategy

The scene-role rectangle strategy has been removed. It is not used as a mask, a fallback, or a perspective source.

`FalWallSegmentationAdapter` requests a semantic binary mask of the visible feature-wall surface. Furniture, cribs, beds, shelves, lamps, plants, mirrors, openings, trim, decor, and other foreground objects are explicitly excluded. The compositor writes only where this returned mask is non-zero, so occluders and architectural boundaries remain untouched scene pixels.

Perspective corners are estimated from robust upper and lower boundaries of the detected wall mask rather than scene-role constants. The semantic mask remains the final clipping authority even when its visible outline is irregular.

This is true semantic masking, but not monocular depth reconstruction. It handles planar visible wall surfaces and mask-defined occlusion. Curved walls, multiple disconnected wall planes, severe perspective, reflections, transparent objects, and segmentation mistakes must fail QA or be regenerated; there is deliberately no rectangle fallback.

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
5. Human-reviewed mask acceptance data and stronger wall suitability scoring.
6. Depth-aware mapping for non-planar, multi-plane, or complex surfaces.
7. Dedicated depth/instance occlusion refinement for transparent or reflective foreground objects.
8. Automated source-fidelity, color-delta, repeat-seam, coverage, and perspective QA.
9. Private intermediate/output storage, retention policies, thumbnails, and signed downloads.
10. Rate limits, request-size enforcement at the edge, retry/idempotency hardening, and production observability.

## Environment

- `RENDER_PROVIDER=mock|fal|custom`
- `FAL_KEY`: server-only Fal credential
- `FAL_MODEL`: configurable model ID; current default is `fal-ai/flux-2`
- `FAL_WALL_SEGMENTATION_MODEL`: semantic mask model; current default is `fal-ai/evf-sam`
- `FAL_SINGLE_MOCKUP_TEST=true|false`: defaults to `true` during wall-mask validation
- `RENDER_SERVICE_URL` and `RENDER_SERVICE_TOKEN`: custom provider boundary
- `STORAGE_PROVIDER` and `STORAGE_BUCKET`: future private storage
- `MOCKUP_QUEUE_NAME`: future durable queue

Never use a `NEXT_PUBLIC_` prefix for provider credentials.
