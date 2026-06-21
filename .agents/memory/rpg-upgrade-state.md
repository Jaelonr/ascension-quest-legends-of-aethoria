---
name: RPG upgrade state
description: What's already built for the fitness-driven RPG upgrade vs. what was added
---

## Already existed before the upgrade session
- `artifacts/api-server/src/combat-engine.ts` — full 6-style engine (strength/striking/conditioning/grappling/recovery/discipline), 3 narrative intensities, hybrid archetypes, raid style bonuses. Do not rebuild this.
- `lib/db/src/schema/combat.ts` — `combat_replays` and `player_style_identity` tables, all columns.
- `lib/db/src/schema/inventory.ts` — `store_items` (with `style_affinity`, `section`, `category`) and `player_inventory` tables.
- 145 store items seeded (13 daily / 79 permanent / 23 raid / 30 weekly); 41 items have `style_affinity`.
- API routes: `battle-log.ts` (GET /battle-log, GET /player/style-identity), `inventory.ts` (GET /store/sections with daily rotation, POST /store/purchase, POST /inventory/:id/sell).
- `training.ts` — full combat replay generation on session complete, upserts `player_style_identity`.
- `artifacts/fitness-rpg/src/pages/battle-log.tsx` — Chronicle page with style identity bar chart, hybrid archetype, percentages, replay history.
- `artifacts/fitness-rpg/src/pages/active-session.tsx` — `CombatReplayModal` with staggered event reveal + count-up animations.
- Narrative intensity setting in `settings.tsx`, read by `active-session.tsx` on session complete.
- Bottom nav: Hall / Training / Nutrition / Chronicle / Character.

## Added in upgrade session (session plan T001-T006)
- **Narrative Consequence** (new concept): `generateNarrativeConsequence()` in `combat-engine.ts` — generates forward-looking consequence text per verdict × intensity × context (raids, gear drops, nutrition, PRs). Added `narrativeConsequence: string | null` to `CombatReplayData`.
- **CombatReplayModal enhancements** (`active-session.tsx`): ⚙ Gear Drop panel with rarity-color styling, ⚔ Raid Progress callout, ↠ Consequence banner (italic, after verdict).
- **OpenAPI** `CombatReplayEntry`: added `gearDrop` (nullable object with name/rarity/slot) and `narrativeConsequence` (nullable string). Codegen run — all hooks regenerated.
- Previous session: `CombatReplayModal` animated style score breakdown bars; `inventory.tsx` personalized featured row; `openapi.yaml` RpgGear schema 9 missing fields.

## Mobile workspace (artifacts/fitness-rpg-mobile)
- tsconfig paths: `"@/*": ["./*"]` — maps to root of mobile project, NOT `./app/*`
- `hooks/useColors.ts` at root — includes: background, card, **secondary**, foreground, mutedForeground, primary, primaryForeground, border, accent, tabBar, tabBarBorder, danger, success, warning, info. The `secondary` key is critical — records.tsx uses it for achievement tile backgrounds.
- `components/ErrorBoundary.tsx` — React class boundary wrapping ErrorFallback.
- Narrative intensity enum: **`technical | balanced | immersive`** — matches server and OpenAPI spec. Mobile previously had wrong `minimal/dramatic` values (fixed in session/[id].tsx).
- Expo SDK 54 deps installed: expo-dev-client ~6.0.21, expo-router ~6.0.24, react-native-reanimated ~4.1.7, react-native-screens ~4.16.0, react-native-worklets, @expo-google-fonts/inter, etc.

**Why:** These keep web + server + mobile in sync on the same enum values and color system. All 4 artifacts typecheck clean; deploy:build passes.

## GitHub
- Canonical repo: `Jaelonr/ascension-quest-legends-of-aethoria`
- Direct URL push (not `git remote add` — that operation is blocked in main agent).
