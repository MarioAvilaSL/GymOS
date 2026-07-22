<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project

GymOS — gym management SaaS prototype (Spanish UI). TanStack Start + React 19 + Vite 8 + Tailwind CSS v4 + PostgreSQL.

## Commands

| Task | Command |
| --- | --- |
| Install | `bun install` |
| Dev server | `bun run dev` (opens http://localhost:8080) |
| Build | `bun run build` |
| Build (dev mode) | `bun run build:dev` |
| Lint | `bun run lint` (ESLint 9 flat config) |
| Format | `bun run format` (Prettier) |

No typecheck or test scripts are configured. `bun run lint` is the primary verification step.

## Architecture

- **File-based routing** in `src/routes/`. `routeTree.gen.ts` is auto-generated — never edit.
- **Server functions** use `createServerFn` from `@tanstack/react-start`. Place in `src/lib/*.functions.ts`.
- **Server-only code** uses `.server.ts` suffix (e.g. `db.server.ts`, `session.server.ts`). Do NOT import these from client components.
- **Two session types**: admin session (`session.server.ts`, cookie `gymos_session`) and member/client session (`client-session.server.ts`, cookie `gymos_member_session`).
- **Database**: PostgreSQL via `pg` Pool singleton in `src/lib/db.server.ts`. Schema at `db/schema.sql`, migrations in `db/migrations/`.
- **SSR entry**: `src/server.ts` wraps TanStack Start's server entry with h3 error normalization.
- **Vite config**: `@lovable.dev/vite-tanstack-config` handles all plugins (React, Tailwind, Nitro, path aliases). Do NOT add duplicate plugins.

## Key conventions

- Path alias: `@/*` → `./src/*` (defined in `tsconfig.json`).
- shadcn/ui components (new-york style) live in `src/components/ui/`. Do not create ad-hoc UI primitives.
- Colors use oklch format in `src/styles.css`. Add new semantic colors in `:root`/`.dark` blocks AND register in `@theme inline`.
- Prettier: 100 char width, double quotes, trailing commas, semicolons.
- ESLint forbids `server-only` import — use `.server.ts` suffix or `@tanstack/react-start/server-only` instead.
- Auth routes live under `src/routes/_authenticated/` (layout route with sidebar). Portal routes under `src/routes/portal/`.

## Gotchas

- The Lovable preview runs on Cloudflare Workers and cannot reach `localhost`. Use `bun run dev` locally.
- `bunfig.toml` enforces a 24h minimum release age for npm packages (supply-chain guard). Only bypass for `@lovable.dev/*` packages.
- h3 (used by Nitro) swallows server errors into generic `{"unhandled":true,"message":"HTTPError"}`. The custom `server.ts` entry and `error-capture.ts` work around this.
- `noUnusedLocals` and `noUnusedParameters` are OFF in tsconfig — lint won't catch them.
- Database requires `pgcrypto` extension (`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).

## Setup prerequisites

- Node.js 20+ / Bun
- PostgreSQL 14+ running locally
- Copy `.env.example` to `.env`, set `DATABASE_URL` and `SESSION_SECRET`
- Run `createdb gymos && psql -d gymos -f db/schema.sql` to initialize DB
