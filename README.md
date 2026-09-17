# Wallpaper AI Studio

Open-source workflow for generating wallpaper prompts, production masters, categorized mockups and Etsy-ready listing drafts.

Wallpaper AI Studio turns one uploaded wallpaper artwork into a controlled Etsy mockup workflow. The core application works without Etsy: choose a seamless pattern or custom mural, upload and validate immutable source artwork, direct six independent room mockups, prepare marketplace copy, and download focused or complete ZIP packages. Prompt Studio remains optional.

> The public demo uses the clearly labeled development renderer. Its previews are not marked production-ready. A real mask/perspective/displacement compositing service must be connected for commercial scene renders. Etsy remains optional and draft-only.

## Features

- Mobile-first six-step workflow: Project, Prompt Studio, Design Master, Art Direction, Render Queue, Listing Studio
- Optional Prompt Studio with two starting paths: create a prompt or provide existing artwork
- `artworkSource` tracking for generated prompts, user uploads, imports and other sources
- PNG, JPEG, WEBP and TIFF master intake (TIFF requires a server-side decoder when the browser cannot preview it)
- Seamless prompts with `--tile --ar 1:1`
- Mural aspect ratio detected from the uploaded artwork with Smart Fit, no stretching and optional focal-point placement
- Automatic private project names that never become marketplace titles without explicit opt-in
- Source Artwork and Mockup Output asset separation
- Immutable Production Master versions with upload, QA, failure, pass and approval states
- File type, pixels, ratio, size, transparency, hash, repeat-edge and mural-safe-area QA
- Six independently renewable mockup roles: Hero room, Alternate room, Close-up detail, Wide room view, Styled room view and Clean wall presentation
- Render jobs with ownership, idempotency, progress, retry metadata and master-version lineage
- Explicit `RENDER_PROVIDER=mock` / `RENDER_PROVIDER=real` separation
- Listing title, description and tag editor
- Central `ETSY_MOCKUP_SQUARE` profile: 3000 × 3000 JPG, sRGB, quality 92, no watermark, English labels
- Partial and complete ZIP exports containing actual assets, prompts, metadata and listing content
- Expiring signed-download contract and user-specific storage paths
- Adapter interfaces for marketplace, image generation, storage, authentication and export
- Synthetic demo mode with no marketplace account or credentials
- Multi-user schema and ownership-scoped repository queries
- Draft-only, idempotent mock marketplace adapter

## Screenshots

Add screenshots to `docs/screenshots/` and reference them here. Do not commit user uploads or private marketplace data.

## Technology stack

- Next.js App Router
- React and TypeScript
- Vinext/Vite compatibility for Cloudflare deployments
- Drizzle ORM schema for SQLite-compatible databases
- JSZip for local project exports
- Node test runner and ESLint

## Local setup

```bash
git clone https://github.com/berrakorkmaz/wallpaper-ai-studio.git
cd wallpaper-ai-studio
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

All values in `.env.example` are intentionally empty.

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Public application origin |
| `DATABASE_URL` | Your database connection |
| `AUTH_SECRET` | Server-side authentication secret |
| `ETSY_API_KEY` | Your own Etsy app keystring |
| `ETSY_SHARED_SECRET` | Your own Etsy app shared secret |
| `ETSY_REDIRECT_URI` | Callback URL registered for this installation |
| `STORAGE_PROVIDER` | Storage adapter name |
| `STORAGE_BUCKET` | Private upload bucket |
| `RENDER_PROVIDER` | `mock` or `real` |
| `RENDER_SERVICE_URL` | Server-side mask/perspective compositing queue endpoint |
| `RENDER_SERVICE_TOKEN` | Private service credential; never expose to the browser |
| `EXPORT_SIGNING_SECRET` | Secret used to sign expiring download URLs |
| `OUTPUT_PROFILE` | Central output profile; defaults to `ETSY_MOCKUP_SQUARE` |
| `FAL_KEY` | Server-only Fal.ai credential |
| `FAL_MODEL` | Fal.ai scene-generation model used before source-preserving compositing |
| `OUTPUT_JPEG_QUALITY` | JPEG quality; defaults to `93` |
| `DEMO_MODE` | `true` keeps all external calls mocked |

Never prefix Etsy secrets with `NEXT_PUBLIC_`. Never expose tokens to the browser.

## Database setup

The normalized multi-user schema is in `db/schema.ts`. Base tables are in `drizzle/0000_wallpaper_ai_studio.sql`; immutable master, render asset and export-job tables are added by `drizzle/0001_production_pipeline.sql`.

```bash
npm run db:generate
```

Run the generated migration with the tooling for your chosen SQLite-compatible provider. All user-owned queries must include `user_id`; examples are provided in `lib/server/ownership-repository.ts`.

## Run the application

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## Run tests

```bash
npm test
npm run lint
```

## Deploy to Vercel

1. Import this repository as a new Vercel project.
2. Use the project name `wallpaper-ai-studio`.
3. Add only the environment variables required by the adapters you enable.
4. Keep `DEMO_MODE=true` until authentication, database, storage and marketplace credentials are configured.
5. Register the new deployment URL as a separate OAuth callback. Do not reuse callbacks from another application.

CLI deployment:

```bash
npx vercel
npx vercel --prod
```

## Enable Etsy integration

1. Create your own Etsy developer application.
2. Set `ETSY_API_KEY`, `ETSY_SHARED_SECRET`, and `ETSY_REDIRECT_URI` only in the host's encrypted environment settings.
3. Implement the real server-side OAuth and draft methods behind `MarketplaceAdapter` in `integrations/etsy`.
4. Encrypt access and refresh tokens at rest and scope every lookup by authenticated `userId`.
5. Request only the permissions your implementation needs.
6. Keep listing creation draft-only. There is intentionally no publish method in the adapter contract.

The repository does not contain a real key, shared secret, token, shop ID, callback, or personal account data.

## Render providers

- `RENDER_PROVIDER=mock` uses the development renderer. It creates 3000 × 3000 browser-downloadable previews but always records `productionReady=false`.
- `RENDER_PROVIDER=real` calls the server-side scene/compositing adapter in `integrations/image-generation`. A valid result must match the central 3000 × 3000 JPG profile and retain the approved source asset ID/hash.
- The real provider receives a strict `mask-perspective-displacement-composite-only` source policy. It must not use generative image synthesis on the wallpaper artwork.

The real renderer should operate through a queue and private object storage. Recommended building blocks are Cloudflare Queues + R2, AWS SQS + S3, or an equivalent worker and object-store combination. ImageMagick/libvips/OpenCV can implement masks, perspective transforms, displacement maps, controlled lighting and color-safe compositing.

## Export packages

The app supports Production Files, Mockups Only, Listing Images Only, Prompt Package, Listing Content and Complete Project ZIP. The complete archive is structured as:

```text
project-slug/
  01-production-master/
  02-mockups/
  03-listing-guides/
  04-prompts/
  05-listing-content/
  06-project-data/
  README.txt
```

Secret-like fields are stripped from JSON metadata. Production storage implementations must verify the authenticated session and ownership before issuing a short-lived signed download URL. Physical print sizing remains isolated behind `lib/print-production` and is disabled in the active mockup product.

When `artworkSource=user_upload`, the Prompt Studio step is recorded as `Skipped · Artwork provided`. No empty prompt or Design DNA files are added to the ZIP; `project.json` records `Artwork source: User upload`. Promptless projects continue through QA, Art Direction, rendering, listing export and optional Etsy draft creation normally.

## Use without Etsy

Keep `DEMO_MODE=true`. Prompt generation, upload/QA, art direction, development renders, listing copy and ZIP export work without Etsy. “Create Etsy Draft” remains disabled until a real server-side connection exists.

## Add an adapter

Implement the relevant interface and inject it at the application boundary:

- `MarketplaceAdapter`
- `RenderAdapter`
- `StorageAdapter`
- `AuthAdapter`
- `ExportAdapter`

Adapters must verify ownership, avoid logging secrets, and return only safe public fields. Do not put provider logic inside core project or prompt modules.

## Security notes

- Treat browser storage as demo-only and non-authoritative.
- Use durable server storage for production projects and R2/S3-compatible object storage for assets.
- Store OAuth tokens only on the server using encryption or a secure credentials reference.
- Never return encrypted token fields in API responses.
- Scope every project, asset, listing and connection query by `userId`.
- Run a secret scan before every public release.
- Automatic marketplace publishing is out of scope.

See [SECURITY.md](SECURITY.md) for reporting instructions.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), open a focused pull request, and include tests for behavior changes.

## License

Wallpaper AI Studio is available under the [MIT License](LICENSE). You may use, modify and distribute it in personal or commercial projects subject to the license terms.
