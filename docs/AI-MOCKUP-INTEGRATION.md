# AI Mockup Integration

This document is the production handoff for Wallpaper AI Studio's mockup pipeline. The repository intentionally ships without a live AI credential, queue worker, segmentation service, compositor, or production object-storage implementation. Demo outputs are not production renders.

## 1. Current architecture

The product already separates immutable source artwork, six render slots, render jobs, output assets, approval state, and export state. `lib/core/mockup-scenes.ts` owns the category and scene-blueprint system. `lib/core/mockup-request.ts` converts a project into the backend batch contract. `lib/core/mockup-api.ts` contains transport-safe types. Browser code talks only to `/api/wallpaper/mockups`; it never talks to an AI provider.

The current development renderer remains in `app/StudioApp.tsx`. It uses Canvas to demonstrate distinct compositions and always marks outputs `productionReady=false`.

## 2. Mock versus production rendering

- `RENDER_PROVIDER=mock` or `DEMO_MODE=true`: the public config endpoint returns demo mode and the existing local Canvas renderer is used.
- `RENDER_PROVIDER=fal` or `custom`, `DEMO_MODE=false`, and all required server configuration present: the frontend submits a backend batch and polls its status. Canvas is not used.
- If production mode is selected but configuration is incomplete, the backend returns an explicit configuration error. It never falls back to Canvas.
- Production API jobs remain queued until a real queue worker is connected. The repository does not pretend that a provider completed work.

Provider selection is implemented in `lib/server/render-provider.ts`. Provider secrets are read only in server modules.

## 3. Category → scene → prompt flow

`MOCKUP_CATEGORIES` is the category source of truth. Each category defines visual direction, room type, furniture, props, architecture, lighting, mood, palette, and negative constraints. Six role blueprints define camera, lens, distance, height, composition, and wallpaper coverage.

`buildMockupBatchRequest(project)` selects the six blueprints and calls `buildMockupPrompt()` once per scene. The production request therefore carries six distinct scene IDs, full blueprints, and six distinct prompts.

## 4. Mockup API contract

- `GET /api/wallpaper/mockups/config`: public-safe mode/provider readiness; never returns secrets.
- `POST /api/wallpaper/mockups`: creates one six-slot batch with an idempotency key.
- `GET /api/wallpaper/mockups/:jobId`: returns batch and per-slot status/output metadata.
- `POST /api/wallpaper/mockups/:jobId/retry`: requeues only failed, explicitly retryable slots.

Transport types live in `lib/core/mockup-api.ts`. The more detailed JSON example is in `docs/etsy-okulu-fal-mockup-contract.md`.

## 5. Source artwork storage requirements

Production requires `assetId`, `storageKey`, `signedSourceUrl`, `fileHash`, `mimeType`, `width`, and `height`. A browser `blob:` URL is accepted only by demo mode and must never be sent to a remote worker.

Implement an authenticated upload/finalize route that writes the original bytes to a private bucket, calculates or verifies the hash server-side, records ownership, and returns an expiring source URL. Populate `DesignAsset.storageKey` and `DesignAsset.signedSourceUrl`. Refresh the signed URL when a queued worker starts rather than relying on a URL that may expire while waiting.

## 6. AI scene-generation pipeline

The required production stages are:

1. Load and verify the immutable source record.
2. Generate a photorealistic interior scene from the category/scene prompt. Prefer a neutral or clean target wall.
3. Detect and validate a suitable wall/surface.
4. Derive mask, perspective, depth, and occlusion information.
5. Apply the original wallpaper deterministically.
6. Blend illumination, shadows, surface texture, and foreground occlusion without changing source colors or motifs.
7. Run automated quality checks.
8. Store the final output privately and issue signed output/thumbnail URLs.

## 7. Fal/provider integration point

`integrations/image-generation/index.ts` defines provider-facing interfaces. `RealRenderAdapter` calls a private render service, not Fal directly. The service receives the full source descriptor, scene blueprint, generated prompt, placement rules, output profile, and explicit pipeline/source policy.

This boundary allows Fal, another image provider, wall segmentation, and the deterministic compositor to be deployed independently from the web application.

## 8. Wallpaper preservation/compositing pipeline

The AI provider must primarily generate the interior. It must not redraw the wallpaper as the final product surface. The exact source bytes are applied after scene generation. Optional reference-image conditioning may help scene planning but cannot replace deterministic compositing.

Preserve motif identity, color values, line work, repeat geometry, scale, and mural composition. Record the source hash on every job and output. Recommended QA includes source color delta, feature matching, repeat-seam checks, wall coverage, occlusion percentage, and perspective plausibility.

## 9. Wall mask, depth, and perspective requirements

The production worker needs a wall mask plus either a planar homography or depth-aware surface mapping. It also needs foreground/occlusion masks for furniture and fixtures. Reject scenes with no sufficiently large wall, severe obstruction, impossible geometry, or windows/doors occupying the product area. A manual mask-correction workflow can be added later without changing the API contract.

## 10. Queue/worker architecture

`MockupJobQueue` and `MockupJobRepository` are defined in `lib/server/mockup-jobs.ts`. Their development implementations are intentionally process-local and non-executing. `drizzle/0003_ai_mockup_architecture.sql` and `db/schema.ts` define durable batch/output storage for the production repository. Connect those tables to Cloudflare Queues, SQS, or an equivalent system.

Each output moves independently through `queued`, `generating_scene`, `detecting_wall`, `compositing_wallpaper`, `quality_check`, `completed`, or `failed`. The worker must update aggregate batch status, persist provider job IDs, use idempotency keys, and make retry safe from duplicate billing.

## 11. Storage architecture

Use a private bucket for source artwork, intermediate scenes, masks/depth maps, full outputs, and thumbnails. Database rows store ownership and storage keys; public responses contain only short-lived signed URLs. Do not expose internal bucket paths or provider responses. Define retention rules for intermediates separately from approved source and final assets.

## 12. Environment variables

- `RENDER_PROVIDER=mock|fal|custom`
- `DEMO_MODE=true|false`
- `RENDER_SERVICE_URL` and `RENDER_SERVICE_TOKEN`: private worker/service boundary.
- `FAL_KEY` and `FAL_MODEL`: server-only Fal configuration used by the future render service.
- `STORAGE_PROVIDER` and `STORAGE_BUCKET`: private object storage.
- `SOURCE_URL_TTL_SECONDS`: source URL lifetime.
- `MOCKUP_QUEUE_NAME`: production queue identifier.
- `OUTPUT_PROFILE`, `OUTPUT_JPEG_QUALITY`, and `EXPORT_SIGNING_SECRET`: output and delivery configuration.

Never use a `NEXT_PUBLIC_` prefix for secrets.

## 13. Security requirements

Authenticate every create/status/retry request. Derive the user ID from the server session rather than trusting the request body. Verify project, source, job, slot, and output ownership. Encrypt provider credentials at rest. Redact provider headers and raw responses from logs. Apply rate limits, input size/type validation, SSRF-safe signed URL handling, idempotency, and expiring downloads.

The current routes define the integration boundary but use demo identity data and process-local state; authentication and durable repositories are activation blockers.

## 14. Frontend job/status flow

The frontend reads the public config endpoint. Demo mode runs Canvas. Production mode posts the six-scene batch, stores the returned job, and polls status. UI labels map stages to Queued, Generating scene, Applying wallpaper, Quality check, Completed, and Failed. Completed signed URLs become normal output assets, preserving Approve, Reject, Download, and export behavior.

## 15. Retry and error handling

Only failed outputs with `error.retryable=true` may be retried. A retry retains category, scene role, source asset identity, and source hash while allowing a new blueprint variation/seed. Map provider timeouts, rate limits, insufficient credit, unsafe output, missing wall, compositor failure, and QA rejection to stable public error codes. Never expose provider payloads or credentials.

## 16. Exact TODO list to activate real AI generation

1. Add authenticated source upload/finalize endpoints and durable source metadata.
2. Replace the development job repository with the production database.
3. Replace the no-op development queue with a real queue producer.
4. Implement the render worker and private service `/v1/render` endpoint.
5. Select and integrate an interior scene-generation model.
6. Implement provider submit/status/webhook handling and persist provider job IDs.
7. Implement wall segmentation, depth/perspective, and occlusion extraction.
8. Implement deterministic source compositing with libvips/ImageMagick/OpenCV or an equivalent engine.
9. Implement source-preservation and scene-quality checks.
10. Add private intermediate/output storage and signed URL refresh.
11. Add authentication, ownership enforcement, rate limits, and encrypted credential lookup.
12. Add durable worker integration tests and real-provider contract tests.
13. Configure production environment variables and set `DEMO_MODE=false` only after the complete pipeline passes QA.

## HOW TO CONNECT FAL

Do not add `FAL_KEY` to client code. Implement Fal inside the private render service or a server-only provider module behind `SceneGenerationProvider`.

1. Choose a Fal model suitable for photorealistic interior generation and record its exact model ID in `FAL_MODEL`.
2. In the render worker, translate `MockupSceneInput.prompt` and `blueprint` into that model's inputs.
3. Submit one provider job per slot with the slot idempotency key; save the returned provider job ID.
4. Use Fal's supported webhook or status API to advance `generating_scene` to the next stage.
5. Store the generated room scene privately. Do not treat it as the final mockup.
6. Run wall detection and deterministic original-wallpaper compositing.
7. Run QA, store final/thumbnail files, and return only signed URLs.
8. Map Fal errors to stable public error codes and mark retryability explicitly.

If reference conditioning is supported, pass the wallpaper only as optional context. The final visible wallpaper must still come from the immutable stored source during compositing.
