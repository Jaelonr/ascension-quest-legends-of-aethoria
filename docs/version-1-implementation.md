# Ascension Quest Version 1 Implementation Notes

## Architecture And Parity

- Web: React/Vite routes now send signed-in players to Guild Hall first. The primary navigation is Hall, Training, Nutrition, Chronicle, Character.
- Mobile: Expo tabs mirror the same five destinations. Legacy quests, raids, skills, and settings routes remain available but hidden from the primary tab bar.
- API: Express exposes a consolidated Guild Hall contract while retaining legacy quests, battle-log, Guildmaster, inventory, and wearable routes.
- Data: Drizzle/PostgreSQL now includes durable daily commissions, Guildmaster memories, world events, story consequences, and health import receipts.
- State: TanStack Query and the generated OpenAPI client remain the shared client data layer on web and mobile.

## New API Surface

- `GET /api/guild-hall/today`: returns the full daily Guild Hall snapshot, including player state, commission, Aldric counsel, memories, campaign summary, equipped gear effects, consequences, and world events.
- `POST /api/guild-hall/report`: reports commission progress, claims earned rewards idempotently when all tasks are complete, and opens a proportional accountability response when work remains.
- `POST /api/guild-hall/consequences/:id/restoration`: starts a restoration campaign only for reversible serious losses.
- `POST /api/health/import`: imports Apple Health or Health Connect events with source/external-id deduplication before updating daily wearable summaries.

## Data And Progression Rules

- Workout completion is guarded against duplicate rewards and duplicate combat replays.
- Equipped fantasy gear can add capped XP pacing, elemental affinity, and narrative modifiers, but it does not replace earned real-world progress.
- Direct stat-boost store items are hidden from the launch store; over-cap XP boost items are also unavailable.
- Minor daily misses become recorded accountability. Serious expired raid failures can create lasting world events, with locations remaining lost and non-location losses eligible for restoration quests.

## Deployment

- Required production environment: `DATABASE_URL`, Clerk publishable/secret configuration, deployed API/web domain configuration, and OpenAI configuration for live Guildmaster AI.
- Development bypasses remain gated behind non-production checks: `DEV_AUTH_BYPASS`, `DEV_MOCK_API`, and `VITE_DEV_AUTH_BYPASS` / `EXPO_PUBLIC_DEV_AUTH_BYPASS`.
- Database migrations are generated under `lib/db/drizzle`. Because this repository did not previously contain migration history, the generated file is a fresh baseline for new databases. For an existing database with the old schema already present, review the SQL first and use `pnpm --filter @workspace/db run push` or create an environment-specific alteration migration instead of blindly applying the baseline.
- OpenAPI-generated clients were regenerated after adding the Guild Hall and health import contracts.

## Verification

- `pnpm run typecheck` passed across libraries, API, web, mobile, mockup sandbox, and scripts.
- `pnpm run build` passed, including Vite web, API bundle, and Expo iOS/Android static bundles.
- Local API smoke passed for `/api/healthz` and `/api/guild-hall/today` on port `5055`.
- Browser QA passed for mobile `390x844` and desktop `1440x1024`; see `design-qa.md`.

## Known Follow-Up Polish

- Chronicle can be expanded from the existing battle log into a richer tab for combat replays, monthly Guild reports, campaign history, records, and story consequences.
- Character can be expanded from the existing inventory/profile surface into a unified gear, skills, titles, biometrics, and settings hub.
- Native Apple Health and Health Connect collectors should call the normalized `/api/health/import` contract once platform permissions are implemented.
