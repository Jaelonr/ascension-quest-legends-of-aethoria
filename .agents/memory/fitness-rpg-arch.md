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

## Achievement check system

`check_key` maps to player counters (`total_workouts`, `total_prs`, `total_quests`, `streak_days`, `gold`, `level`, `skills_unlocked`). The progression engine checks these automatically inside `applyXpEvent` after every XP grant.

## achievements table

No unique constraint on `name` column — cannot use `ON CONFLICT (name) DO NOTHING`. Use `WHERE NOT EXISTS` pattern instead.

## Boss raids trigger conditions

Raids unlock based on `triggerCondition` field: `streak_7`, `streak_30`, `rank_D`, `rank_C`, `rank_B`, `rank_S`.

## Frontend routing

8-item bottom nav: Status, Nutrition, Training, Quests, Raids, World, Records, Profile. Planner and Program are sub-routes of Training.

## Isekai story system

Story state in `src/hooks/use-story.ts` (client-side). localStorage keys:
- `rpg_onboarding_v2` — cinematic intro seen
- `rpg_setup_v1` — character questionnaire completed
- `rpg_class_base_v1` — assigned base class id

## Onboarding trigger fix (server-authoritative)

`player.setupCompleted` (boolean, DB column) set by `POST /api/player/setup`. `PlayerSetupSync` in `App.tsx` redirects to `/onboarding` if false. Runs once per `player.id` using a ref guard.

## Class system (server-side)

`baseClass` column on `playerTable`. Set by setup + change-class routes. Dashboard/class page prefer `player.baseClass`, fall back to localStorage.

## Level-up detection

`useLevelUpDetector` hook compares `player.level` prev vs current via ref. Wired in `MainLayout` via `LevelUpWatcher`. Overlay renders at `z-[200]`.

## Class Awakening Overlay

`useAwakeningDetector` hook detects when player.level crosses evolution thresholds (15, 30, 50, 70, 90). Fires `AwakeningOverlay` at `z-[300]` — more dramatic than level-up (class-colored radial glow, cinematic phases: flash→reveal→abilities→done). Wired via `AwakeningWatcher` in `MainLayout`.

**Why:** Must use the same prev-ref pattern as level-up detector so it only fires on transitions, not on initial page load.

## Visual Skill Tree (Tier 2)

`skills.tsx` uses `useLayoutEffect` + `ResizeObserver` + a `Map<nodeId, HTMLDivElement>` of refs to calculate SVG connector line coordinates dynamically. Tree tabs use `CATEGORY_META` for per-discipline icons/colors/glows. Selecting a node opens an inline detail panel with unlock button.

**Why:** Calculating SVG line positions requires DOM layout info — must use `useLayoutEffect` after mount, not `useMemo` during render.

## Raid Task Auto-Tracking (Tier 2)

Each task in `RAID_TEMPLATES` now has a `taskType` field:
- `"workout_sessions"`, `"prs"` — auto-incremented from `POST /training/sessions/:id` (PATCH with status=completed)
- `"nutrition_days"` — auto-incremented when nutrition target met
- `"streak_days"`, `"skill_unlocks"` — currently manual, reserved for future hooks
- `"manual"` — only tappable in the UI

`progressRaidTasks(playerId, taskType, amount)` exported from `boss-raids.ts`, called from `training.ts` after session completion. The task update endpoint now silently ignores updates to non-manual tasks.

## RPG Armory (Tier 2)

`rpg_gear` table (DB: `gear_slot` enum + rarity text + stat_bonuses JSONB). Gear drops on raid claim from `generateGearDrop(difficulty, source)`. Difficulty maps to rarity: E→common, D→uncommon, C→rare, B→epic, A→epic, S→legendary. Stat bonuses scale by rarity (1 pt common → 10 pts legendary). Armory tab added to inventory.tsx (tab order: Armory, Items, Store). Equip toggles per slot — equipping a new item automatically unequips the previous item in that slot.

## Food Search (Tier 3)

`GET /api/nutrition/food-search?q=` proxies Open Food Facts (no key needed). Backend fetches with `AbortSignal.timeout(6000)` and normalizes fields to `{ id, name, calories100g, protein100g, carbs100g, fat100g, servingSize }`. Frontend uses the raw `searchFood` fetcher (not the hook) with a `useEffect` + 500ms debounce timer to avoid react-query `UseQueryOptions` requiring `queryKey`.

**Why:** `useSearchFood(params, { query: { enabled: ... } })` throws TS2741 because react-query v5 requires `queryKey` in `UseQueryOptions`. Use the raw `searchFood` fetcher + manual debounce instead.

## Daily Login Reward System (Tier 3)

`daily_logins` table tracks claim history. `login_streak` + `last_login_date` columns on `playerTable` (text date, e.g. "2026-06-17"). Streak resets if `lastLoginDate < yesterday`. Milestone bonuses at days 7/14/30 (rotate: `streakDay % 30`, `% 14`, `% 7`). `DailyRewardCard` component on dashboard shows 7-day calendar strip and claim button.

## Guild System (Tier 4)

`guilds` + `guild_members` (UNIQUE on `player_id` — one guild per player) + `guild_activity` tables. `player.guildId` FK links player to their guild. Invite code is 6-char alphanumeric, generated server-side. Leader leaving with no other members disbands the guild. Guild page at `/guilds`, accessible from bottom nav (9th item). Activity feed auto-appended on join/leave/creation.

## Push Notifications (Tier 4)

`push_subscriptions` table stores `endpoint` (UNIQUE), `p256dh`, `auth`. VAPID keys set as shared env vars `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`. Service worker at `artifacts/fitness-rpg/public/sw.js`. Registered in `main.tsx` via `navigator.serviceWorker.register('/sw.js')` on window load.

## Tier 5 Polish

**Animations** — `useCountUp(target, duration, delay)` hook uses `requestAnimationFrame` + ease-out cubic. Used in: dashboard stat grid (`AnimatedStat` wrapper component), level-up overlay (level number rolls up on mount), session summary (XP + Gold count up from 0 with staggered delay).

**Sound engine** — `useSoundEngine()` returns `playSound(type)`. Uses Web Audio API synthesis (no files, no deps). 7 sound types: `level-up`, `gold`, `daily-reward`, `workout-complete`, `boss-defeated`, `set-logged`, `claim`. Respects `settings.sounds.enabled` (default true) and `settings.appearance.reducedMotion`. AudioContext created lazily on first call to avoid "suspended context" browser restriction. Toggle in Settings → Appearance → Sound Effects.

**Offline mode** — `useOfflineSync()` wraps `navigator.onLine` + `online`/`offline` events. Queues failed mutations to IndexedDB (`fitness-rpg-offline` DB, `pending` store). Auto-syncs queue on reconnect. `OfflineBanner` component shows orange strip when offline, green "Back online" after reconnect. Banner only shows on offline→online transition (tracked via `prevOnlineRef`), not on initial mount.

**Service worker** — Updated `public/sw.js` with app shell caching (cache-first for static assets, navigation fallback to `/index.html`). Old caches cleaned on activate.

## Active session page

Rebuilt to full set-by-set tracker: template exercises from `session.templateExercises`, per-set PR badge, 90s rest timer, elapsed timer, end-of-session `SessionSummary` overlay.

## Player initial state

New players: level 1, all stats at 1, freeStatPoints 0, gold 500.
