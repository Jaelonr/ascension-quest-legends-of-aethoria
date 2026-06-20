# Ascension Quest: Legends of Aethoria

A fitness RPG where real training, nutrition, recovery, and consistency become character growth and expeditions through Aethoria.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` - run the API server for local development
- `pnpm run typecheck` - full typecheck across all packages
- `pnpm run build` - typecheck and build all packages
- `pnpm run deploy:build` - production-focused web/API build for Replit
- `pnpm run deploy:migrate` - run Drizzle migrations against `DATABASE_URL`
- `pnpm run deploy:start` - start the production API, which also serves the built web app
- `pnpm run deploy:run` - run migrations first, then start production; this is what `.replit` uses
- `SMOKE_BASE_URL=https://your-domain pnpm --filter @workspace/scripts run smoke:replit` - verify Replit secrets and core page availability
- `pnpm --filter @workspace/api-spec run codegen` - regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` - push DB schema changes for dev only
- Required env: `DATABASE_URL` - Postgres connection string

## Replit Production Setup

Use a single Replit deployment/domain for the web app and API. The Express API serves `/api/*`, Clerk proxy traffic remains at `/api/__clerk`, and all other browser routes fall back to the built Vite app.

1. Back up the existing Replit database before changing migrations or production secrets.
2. Add the values from `.env.example` to Replit Secrets. Do not commit real secret values.
3. Keep production bypasses disabled: `DEV_MOCK_API=false`, `DEV_AUTH_BYPASS=false`, and `VITE_DEV_AUTH_BYPASS=false`.
4. Deploy with the `.replit` production build/run commands. The run command executes `pnpm run deploy:run`, which applies Drizzle migrations before starting the API.
5. If Hall, Chronicle, or Character fail to load after a pull, manually run `pnpm run deploy:migrate` once and redeploy; those pages depend on the newer Guild Hall, Chronicle, item discovery, and paper-doll gear tables.
6. In Clerk/Replit Auth, allow the deployed domain for sign-in/sign-up redirects and enable Google as a provider.
7. For Expo/mobile testing, set `EXPO_PUBLIC_API_BASE_URL` to the deployed `https://...` origin.

Persistence check: create two Google accounts, complete setup for each, save nutrition/workout/equipment data, refresh, sign out, sign back in, and confirm each account sees only its own records.

Samsung wearable testing should start only after this persistence check passes. Use Samsung Health through Health Connect; see `docs/samsung-health-connect.md`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React/Vite
- Mobile: Expo
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk with Google sign-in
- Validation: Zod and drizzle-zod
- API codegen: Orval from OpenAPI
- Build: Vite for web, esbuild for API

## Where Things Live

- Web app: `artifacts/fitness-rpg`
- Mobile app: `artifacts/fitness-rpg-mobile`
- API server: `artifacts/api-server`
- Database schema and migrations: `lib/db`

## Architecture Decisions

- Production uses one origin for web and API to avoid cross-domain auth/cookie complexity.
- Mock API and auth bypasses are development-only and must be false in production.
- PostgreSQL is the source of truth for user progress; object storage is reserved for future media/assets.
- Drizzle migrations are used for production schema changes. Do not reset production data.

## Product

Core destinations are Guild Hall, Training, Nutrition, Chronicle, and Character. The app turns real activity into commissions, combat replays, rewards, character identity, gear, and story progress.

## User Preferences

- Do not rewrite from scratch.
- Optimize for making the player excited to come back tomorrow.
- Preserve and migrate user data in place.
- Player-created guilds stay hidden for launch.

## Gotchas

- If `DEV_MOCK_API=true`, API calls can be handled by mock routes and may not persist to Postgres.
- If `DATABASE_URL` is missing outside mock mode, the API/database layer should fail rather than silently use fake storage.
- Hall, Chronicle, and Character depend on the latest migrations. If these tabs fail in Replit while older pages load, check the Replit logs for missing relation/table errors and run `pnpm run deploy:migrate`.
- The web app needs `VITE_CLERK_PUBLISHABLE_KEY` and the API needs `CLERK_SECRET_KEY` for authenticated production routes.
