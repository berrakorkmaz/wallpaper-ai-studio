# AI Mockup Integration

## Active Fal pipeline

`RENDER_PROVIDER=fal` uses an independent, server-only two-stage Fal pipeline:

1. The existing category and scene blueprint build a clean interior prompt.
2. `FAL_MODEL` generates a photorealistic room with a large, visible, undecorated wall.
3. The uploaded original wallpaper is sent to the backend as its original PNG, JPG, or WEBP data URI. It is not stored in browser persistence or logged.
4. `FAL_EDIT_MODEL` receives two ordered references through its official `image_urls` input:
   - Image 1: the generated interior URL.
   - Image 2: the original uploaded wallpaper data URI.
5. The edit prompt instructs the model to preserve the wallpaper's identity and apply it only to real wall surfaces, behind furniture and foreground objects.
6. The edited Fal image URL is returned directly as the final mockup.

There is no browser Canvas compositing, wall rectangle, hard-coded wall geometry, homography, semantic-mask post-process, or downloaded-scene overlay in the Fal production path. Fal failures remain visible errors and never fall back to the development renderer.

## Model contracts

- Scene generation defaults to `fal-ai/flux-2` and is configurable with `FAL_MODEL`.
- Multi-reference editing defaults to `fal-ai/flux-2-pro/edit` and is configurable with `FAL_EDIT_MODEL`.
- The edit request uses `prompt`, ordered `image_urls`, `image_size: "auto"`, `safety_tolerance: "2"`, `enable_safety_checker: true`, and `output_format: "jpeg"`.
- The final URL must be HTTPS and come from `images[0].url`.

`FAL_KEY` is read only by server modules. It is never returned by health/config routes, logged, persisted in the browser, or bundled into client JavaScript.

## Category boundary

`lib/core/mockup-scenes.ts` remains the category and scene source of truth. Categories change only room type, art direction, camera, furniture, composition, styling, and lighting for Stage A. Every category uses the same Stage B wallpaper-edit prompt and model contract.

## Test mode and regeneration

`FAL_SINGLE_MOCKUP_TEST` defaults to `true`. In this mode both client and backend enforce exactly one mockup, so one click performs one interior generation and one final edit. Set it to `false` only after the result is approved; the existing six scene blueprints will then each run independently through the same two-stage pipeline.

Regenerate submits only the selected slot. It creates one new room variation and one new edit while leaving all other slots unchanged.

## Source transport

The local workflow accepts PNG, JPG, or WEBP uploads up to 20 MB. The browser reads the original Blob directly into a data URI without re-encoding it through Canvas. Fal officially accepts data URIs in image URL inputs.

For production scale, replace request-scoped data URIs with authenticated private object storage and short-lived signed URLs. That storage change must preserve the same ordered two-reference edit contract.

## Environment

- `RENDER_PROVIDER=fal`
- `FAL_KEY`: server-only credential
- `FAL_MODEL`: optional scene model; default `fal-ai/flux-2`
- `FAL_EDIT_MODEL`: optional edit model; default `fal-ai/flux-2-pro/edit`
- `FAL_SINGLE_MOCKUP_TEST=true|false`: defaults to `true`

The Fal pipeline does not depend on `RENDER_SERVICE_URL`, `/v1/render`, or the legacy custom production service. The custom provider remains isolated for backward compatibility but is not used when `RENDER_PROVIDER=fal`.
