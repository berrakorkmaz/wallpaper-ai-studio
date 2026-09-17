# Wallpaper AI Studio

Open-source workflow for generating wallpaper prompts, production masters, categorized mockups and Etsy-ready listing drafts.

Wallpaper AI Studio turns a wallpaper idea into a controlled production workflow. The core application works without Etsy: prepare a seamless pattern or custom mural, compile a Midjourney-ready prompt, upload and inspect a Production Master, organize art direction, prepare six mockup roles, draft marketplace copy, and download the project as a ZIP.

> The included Etsy implementation is a safe mock adapter. It never calls Etsy and never publishes a listing. Bring your own Etsy application and server-side credentials when enabling the optional real adapter.

## Features

- Mobile-first six-step workflow: Project, Prompt Studio, Design Master, Art Direction, Render Queue, Listing Studio
- Seamless prompts with `--tile --ar 1:1`
- Mural ratios calculated from wall width and height
- Automatic private project names that never become marketplace titles without explicit opt-in
- Production Master and Marketing Mockup asset separation
- Six independently renewable mockup roles
- Listing title, description and tag editor
- Local ZIP export with prompts, metadata, master asset, mockup manifests and listing content
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
| `DEMO_MODE` | `true` keeps all external calls mocked |

Never prefix Etsy secrets with `NEXT_PUBLIC_`. Never expose tokens to the browser.

## Database setup

The normalized multi-user schema is in `db/schema.ts`; the starter migration is in `drizzle/0000_wallpaper_ai_studio.sql`.

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

## Use without Etsy

Keep `DEMO_MODE=true`. Every core step works locally, including prompt generation, upload/QA, art direction, mockup role preparation, listing copy and ZIP export. “Create demo draft” uses an in-memory mock and sends no network request.

## Add an adapter

Implement the relevant interface and inject it at the application boundary:

- `MarketplaceAdapter`
- `ImageGenerationAdapter`
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
