# Etsy Okulu → Wallpaper Mockup API Contract

This document defines the future production boundary between Wallpaper AI Studio and the Etsy Okulu backend. The current browser application remains in clearly labelled demo mode until this adapter is connected.

## Security boundary

- The browser never receives, requests, stores, logs, or transmits a Fal.ai API key.
- Fal.ai credentials belong to the signed-in Etsy Okulu user and are encrypted at rest on the Etsy Okulu backend.
- Every request is authenticated with the existing Etsy Okulu session.
- The backend resolves the user credential, checks ownership of the project and source asset, and pays from that user's Fal.ai balance.
- Responses contain only job identifiers, public-safe status metadata, and short-lived/signed output URLs.
- API keys, access tokens, provider headers, raw provider responses, and internal storage paths are never returned.
- The backend must use idempotency keys so a repeated request cannot charge the user twice.

## POST `/api/wallpaper/mockups`

Creates one batch containing six independently tracked mockup jobs.

Request:

```json
{
  "projectId": "project_123",
  "masterVersionId": "master_456",
  "source": {
    "assetId": "master_456",
    "storageKey": "user_1/sources/master_456.png",
    "signedSourceUrl": "https://storage.example/signed/source",
    "fileHash": "sha256...",
    "mimeType": "image/png",
    "width": 4000,
    "height": 4000
  },
  "productType": "seamless",
  "primaryRoom": "Nursery",
  "secondaryRoom": "Kids Room",
  "patternScale": "medium",
  "placement": {
    "mode": "smart_fit",
    "focalPoint": { "x": 50, "y": 50 }
  },
  "scenes": [{
    "slotId": "mockup-1",
    "sceneId": "nursery-hero-v1",
    "category": "Nursery",
    "prompt": "Create a photorealistic modern nursery...",
    "blueprint": { "role": "hero", "cameraAngle": "frontal three-quarter", "lighting": "broad soft morning window light" }
  }],
  "output": { "width": 3000, "height": 3000, "aspectRatio": "1:1", "format": "jpg", "quality": 93 },
  "idempotencyKey": "project_123:master_456:batch:1"
}
```

Response (`202`):

```json
{
  "jobId": "wallpaper_job_789",
  "status": "queued",
  "slots": [
    { "slotId": "mockup-1", "sceneId": "nursery-hero-v1", "status": "queued", "providerJobId": null }
  ],
  "estimatedCost": { "amount": "0.00", "currency": "USD", "available": false }
}
```

`estimatedCost.available` remains `false` when the selected provider/model does not expose a reliable estimate. The UI must not invent a price.

## GET `/api/wallpaper/mockups/:jobId`

Returns the safe state of the batch and each slot.

Response (`200`):

```json
{
  "jobId": "wallpaper_job_789",
  "status": "generating",
  "slots": [
    { "slotId": "mockup-1", "status": "completed", "outputUrl": "https://signed.example/output-1.jpg", "expiresAt": "2026-09-17T12:00:00Z" },
    { "slotId": "mockup-2", "status": "generating" },
    { "slotId": "mockup-3", "status": "failed", "errorCode": "PROVIDER_TIMEOUT", "retryable": true }
  ]
}
```

Allowed public statuses: `queued`, `generating_scene`, `applying_wallpaper`, `detecting_wall`, `compositing_wallpaper`, `quality_check`, `completed`, `failed`. The active Fal path uses `generating_scene` and `applying_wallpaper`; mask/compositing statuses remain only for the isolated legacy custom-provider contract.

## POST `/api/wallpaper/mockups/:jobId/retry`

Retries only failed or user-rejected slots. Completed, non-rejected slots must be refused.

Request:

```json
{
  "slotIds": ["mockup-3"],
  "rejectedSlotIds": [],
  "idempotencyKey": "wallpaper_job_789:mockup-3:retry:1"
}
```

Response (`202`):

```json
{
  "jobId": "wallpaper_job_789",
  "slots": [
    { "slotId": "mockup-3", "status": "queued" }
  ]
}
```

## Error envelope

```json
{
  "error": {
    "code": "FAL_CONNECTION_REQUIRED",
    "message": "Connect Fal.ai in your Etsy Okulu account.",
    "retryable": false
  }
}
```

Suggested codes: `UNAUTHENTICATED`, `RESOURCE_NOT_FOUND`, `FAL_CONNECTION_REQUIRED`, `INSUFFICIENT_PROVIDER_CREDIT`, `INVALID_MASTER`, `SLOT_NOT_RETRYABLE`, `RATE_LIMITED`, `PROVIDER_TIMEOUT`, `INTERNAL_ERROR`.

## Source preservation

The active Fal adapter sends the generated clean interior as Image 1 and the approved original wallpaper as Image 2 to `fal-ai/flux-2-pro/edit`. The preservation prompt requires the wallpaper's colors, motifs, characters, proportions and identity to remain faithful while the model handles wall perspective, lighting and foreground occlusion. No browser or server-side rectangle/mask compositor runs after the edit.
