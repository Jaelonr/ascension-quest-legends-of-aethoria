---
name: Fitness RPG architecture
description: Key non-obvious decisions in the Personal Fitness RPG project
---

## Orval codegen: schemas option causes duplicate exports

The orval config's `schemas: { path: "generated/types", type: "typescript" }` option (in the `zod` output block) generates TypeScript types in a `types/` folder AND also generates them as Zod schemas in `api.ts`. When both are re-exported from `index.ts`, TypeScript throws TS2308 (duplicate member). 

**Fix:** Remove `schemas: { path: "generated/types", type: "typescript" }` from the `zod` output in `orval.config.ts`. The Zod schemas in `api.ts` are the source of truth.

**Why:** orval v8.9.x generates duplicate names for inline request body types (e.g. `StartBossRaidBody`) when schemas output is enabled alongside the zod client.

## api-zod index.ts

Must only export from `./generated/api` (not `./generated/types`) since the types folder is no longer generated. File: `lib/api-zod/src/index.ts`.

## Shared progression engine

`artifacts/api-server/src/progression.ts` is the single source of truth for XP, level-up, stat gains, rank promotion, achievement checks, and prestige. All routes must import from here — never inline XP logic in individual routes.

**Why:** Achievement auto-triggers, rank-up detection, and XP multipliers all need consistent state. Duplicating logic caused missed achievement grants.

## Achievement check system

`check_key` maps to player counters (`total_workouts`, `total_prs`, `total_quests`, `streak_days`, `gold`, `level`, `skills_unlocked`). The progression engine checks these automatically inside `applyXpEvent` after every XP grant. If an achievement doesn't have `check_key` + `check_threshold` set in the DB, it won't auto-trigger.

## achievements table

No unique constraint on `name` column — cannot use `ON CONFLICT (name) DO NOTHING`. Use `WHERE NOT EXISTS (SELECT 1 FROM achievements a WHERE a.name = v.name)` pattern instead.

## Boss raids trigger conditions

Raids unlock based on `triggerCondition` field: `streak_7`, `streak_30`, `rank_D`, `rank_C`, `rank_B`, `rank_S`. The available-raids endpoint checks against `player.streakDays` and `player.rank`. New players (Rank E, no streak) won't see any raids.

## Frontend routing

8-item bottom nav: Status, Nutrition, Training, Quests, Raids, World, Records, Profile. Planner and Program are sub-routes of Training. World page is the Isekai story/map at `/world`.

## Isekai story system

Story state lives entirely in `src/hooks/use-story.ts` (client-side, no backend). Two localStorage keys:
- `rpg_onboarding_v2` — whether the user has seen the cinematic intro
- Onboarding guard in `AppRoutes` redirects to `/onboarding` if key unset

Arc and boss progression are computed from player level (from the existing API). No extra DB columns needed — level is the proxy for world progress. World danger = `getWorldDanger(level)`.

**Why:** Keeping story state client-only avoids a DB migration. The story is deterministic from level so it never desynchronizes.

## Player initial state

New players start with: level 1, all stats at 1, freeStatPoints 0, gold 500. The `freeStatPoints: 10` in player routes is intentional — it only applies on prestige (resets to lv1 with a bonus).
