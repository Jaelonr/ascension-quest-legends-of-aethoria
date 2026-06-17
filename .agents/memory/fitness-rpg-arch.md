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

## Class XP multipliers (server-side)

`getClassXpMultiplier(baseClass, category)` in `progression.ts` returns a 1.15x bonus for the class's specialty category. Applied inside `applyXpEvent` after the prestige multiplier. Classes:
- warrior/berserker: strength + hypertrophy
- ranger/rogue: conditioning + striking
- monk: recovery + flexibility + rehabilitation
- tactician: flat 1.05x on all categories

**Why:** Class must affect server-side XP so it can't be faked from the frontend.

## Achievement check system

`check_key` maps to player counters (`total_workouts`, `total_prs`, `total_quests`, `streak_days`, `gold`, `level`, `skills_unlocked`). The progression engine checks these automatically inside `applyXpEvent` after every XP grant. If an achievement doesn't have `check_key` + `check_threshold` set in the DB, it won't auto-trigger.

## achievements table

No unique constraint on `name` column — cannot use `ON CONFLICT (name) DO NOTHING`. Use `WHERE NOT EXISTS (SELECT 1 FROM achievements a WHERE a.name = v.name)` pattern instead.

## Boss raids trigger conditions

Raids unlock based on `triggerCondition` field: `streak_7`, `streak_30`, `rank_D`, `rank_C`, `rank_B`, `rank_S`. The available-raids endpoint checks against `player.streakDays` and `player.rank`. New players (Rank E, no streak) won't see any raids.

## Frontend routing

8-item bottom nav: Status, Nutrition, Training, Quests, Raids, World, Records, Profile. Planner and Program are sub-routes of Training. World page is the Isekai story/map at `/world`.

## Isekai story system

Story state lives entirely in `src/hooks/use-story.ts` (client-side, no backend). localStorage keys:
- `rpg_onboarding_v2` — cinematic intro seen
- `rpg_setup_v1` — character questionnaire completed
- `rpg_class_base_v1` — assigned base class id (e.g. "warrior")
- Onboarding guard in `AppRoutes`: no onboarding key → /onboarding; no setup key → /setup; else main app

## Onboarding trigger fix (server-authoritative)

`player.setupCompleted` (boolean, DB column) is set to `true` by `POST /api/player/setup`. `PlayerSetupSync` component (in `App.tsx`, inside `ProtectedShell`) fetches player data on sign-in; if `setupCompleted` is false, clears localStorage onboarding keys and redirects to `/onboarding`. Runs once per `player.id` per session using a ref guard.

**Why:** localStorage-only check broke for new devices/browsers. Server flag is the authority; localStorage is just a UI optimization.

## Class system (now server-side)

`baseClass` text column on `playerTable` stores the active class ID. Set by `POST /api/player/setup` (initial) and `POST /api/player/change-class` (reclass, costs 5000 gold). Class data/evolutions still live in `src/hooks/use-class.ts` (client-only, deterministic). Dashboard and class page prefer `player.baseClass` from API, fall back to localStorage.

**Why:** localStorage-only class was invisible to the server, so XP multipliers couldn't be applied correctly.

## Level-up detection

`useLevelUpDetector` hook in `src/hooks/use-level-up.ts` compares `player.level` previous vs current using a ref. Fires `LevelUpOverlay` when level increases. Wired into `MainLayout` via `LevelUpWatcher` component so it fires from any page after any mutation that grants XP. The overlay renders as a `z-[200]` fixed overlay.

## Active session page

Rebuilt from 182-line stub to a full set-by-set tracker:
- Exercises come from `session.templateExercises` (added to GET `/training/sessions/:id` response by joining template)
- Per-exercise expandable cards with planned sets, logged sets list, inline form
- Form pre-fills from last logged set for that exercise
- PR badge fires when `set.isPr` is true
- Rest timer (90s) auto-starts after each logged set
- Session elapsed timer counts up from `session.startedAt`
- End-of-session `SessionSummary` full-screen overlay shows XP, gold, duration, PRs

## Player initial state

New players start with: level 1, all stats at 1, freeStatPoints 0, gold 500. The `freeStatPoints: 10` in player routes is intentional — it only applies on prestige (resets to lv1 with a bonus).

## Arc and boss progression

Computed from player level (from the existing API). No extra DB columns needed — level is the proxy for world progress. World danger = `getWorldDanger(level)`.
