---
name: Clerk auth integration
description: How multi-user Clerk auth was wired into the Fitness RPG — schema, middleware, route update pattern, and Expo mobile setup
---

## What was done

- Added `clerkId text("clerk_id")` column to `playerTable` (nullable, unique index via raw SQL since drizzle-kit interactive prompt blocks in non-TTY)
- `getOrCreatePlayer(clerkId: string)` in `progression.ts` now looks up by `clerkId` and sets it on new records
- `requireAuth` middleware in `routes/index.ts` calls `getAuth(req).userId` and sets `req.userId`; health route is public (mounted before requireAuth)
- All 60+ `getOrCreatePlayer()` calls bulk-replaced via sed: `getOrCreatePlayer(req.userId)`
- Express Request type augmented in `artifacts/api-server/src/types/express.d.ts`

**Why:** Single-player `limit(1)` approach meant all users shared one DB row.

**How to apply:** Any new route that calls `getOrCreatePlayer` must pass `req.userId` (set by requireAuth middleware). requireAuth is already mounted router-wide so no per-route setup needed.

## Frontend (web)

- `ClerkProvider` wraps the app in `App.tsx`; `clerkPubKey` uses `publishableKeyFromHost` from `@clerk/react/internal`
- Landing page at `/` for signed-out users; signed-in users see `AppRoutes` (existing onboarding guard still works)
- `/sign-in/*?` and `/sign-up/*?` routes use Clerk `<SignIn>` / `<SignUp>` with `routing="path"`
- Appearance: `dark` base theme from `@clerk/themes`, RPG cyan palette (`#00d4e8`), `cssLayerName: "clerk"`
- `index.css` has `@layer theme, base, clerk, components, utilities;` BEFORE `@import "tailwindcss"`
- `vite.config.ts` uses `tailwindcss({ optimize: false })` to prevent Clerk layer reordering in prod

## Mobile (Expo)

- Packages: `@clerk/expo`, `expo-secure-store@~15.0.8`, `expo-auth-session@~7.0.10`, `expo-crypto@~15.0.8` — all SDK 54 pinned
- `ClerkProvider` + `ClerkLoaded` wraps everything in `app/_layout.tsx`; `tokenCache` from `@clerk/expo/token-cache`
- `publishableKey` from `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (forwarded via `$CLERK_PUBLISHABLE_KEY` in dev script); `proxyUrl` from `EXPO_PUBLIC_CLERK_PROXY_URL`
- `AuthGuard` component in `_layout.tsx`: uses `useAuth`, `useSegments`, `useRouter` — redirects unauthenticated to `/(auth)/sign-in`, redirects authenticated away from `/(auth)` to `/(tabs)`
- `setAuthTokenGetter(() => getToken())` wired in `AuthGuard` so ALL generated API hooks attach `Authorization: Bearer` header
- Auth screens in `app/(auth)/sign-in.tsx` (email/password + Google SSO via `useSSO`) and `app/(auth)/sign-up.tsx` (email/password + email verification)
- Settings tab has sign-out button using `useClerk().signOut()` with confirmation alert
- `build.js` updated: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_CLERK_PROXY_URL` forwarded to Metro env

**Expo routing gotcha:** `segments[0]` type from `useSegments` doesn't include `"(auth)"` — must cast: `(segments[0] as string) === "(auth)"`. Also `Link href` doesn't accept `(auth)` group paths — use `router.push("/(auth)/sign-in" as never)` instead.

**Web vs Mobile auth transport:** Web uses Clerk session cookies (do NOT call `setAuthTokenGetter` on web). Mobile uses Bearer tokens — `setAuthTokenGetter` is ONLY for mobile/Expo.

## DB migration gotcha

Adding a unique constraint to a non-empty table via `drizzle-kit push` prompts interactively — fails in non-TTY. Use raw SQL instead:
```sql
ALTER TABLE player ADD COLUMN IF NOT EXISTS clerk_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS player_clerk_id_unique ON player(clerk_id) WHERE clerk_id IS NOT NULL;
```

## "Development mode" badge

The orange "Development mode" badge on the Clerk sign-in card is expected in dev (test keys). It disappears automatically when the app is published to production with live keys.
