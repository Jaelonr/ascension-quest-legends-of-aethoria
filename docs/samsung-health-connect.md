# Samsung Wearables Through Health Connect

Ascension Quest should support Samsung wearables first through Android Health Connect:

`Galaxy wearable -> Samsung Health -> Health Connect -> Ascension Quest mobile -> /api/health/import`

Do not use the direct Samsung Health Data SDK for Version 1 unless Health Connect cannot expose a needed record type. Health Connect keeps the app Android-standard and avoids a Samsung-only backend path.

## Current App Readiness

- The API already accepts normalized Health Connect batches at `POST /api/health/import`.
- The accepted source value is `health_connect`.
- Records are deduplicated by player, source, and `externalId`.
- Imported records roll up into daily wearable summaries used by readiness and Guild Hall logic.
- Replit remains the API/database host; the phone performs Health Connect collection.

## Android Test Setup

1. Pair the Galaxy Watch or Galaxy Ring to the Android phone.
2. Install or update Samsung Health.
3. Install or update Health Connect if it is not already available on the phone.
4. In Samsung Health, enable Health Connect sharing.
5. In Android Health Connect settings, confirm Samsung Health can write steps, activity, sleep, heart rate, and calories.
6. Install an Ascension Quest Android development build. Expo Go is not enough for native Health Connect permissions.
7. Grant Ascension Quest read permissions when requested.

## Mobile Implementation Requirements

- Add a native Health Connect-capable package to the Expo mobile app and build with an Android development client.
- Request read permissions for:
  - steps
  - distance
  - exercise sessions
  - heart rate
  - sleep sessions
  - active energy or total calories where available
- Normalize records into the existing import shape:

```json
{
  "source": "health_connect",
  "events": [
    {
      "externalId": "health-connect-record-id",
      "recordedAt": "2026-06-20T12:00:00.000Z",
      "steps": 4200,
      "sleepHours": null,
      "hrv": null,
      "restingHr": null,
      "caloriesBurned": 230,
      "activeMinutes": 35,
      "weight": null
    }
  ]
}
```

- Use stable Health Connect record IDs when available. If a record type lacks an ID, create a deterministic ID from record type, start time, end time, and value.
- Sync in bounded windows, such as today plus the previous 7 days, to avoid slow first-run imports.
- Keep Samsung Health labeled as "Samsung Health via Health Connect" in UI copy.

## Replit Requirements

- Replit must already pass production smoke checks before wearable imports are tested.
- Required secrets:
  - `DATABASE_URL`
  - `CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `VITE_CLERK_PUBLISHABLE_KEY`
  - `VITE_CLERK_PROXY_URL=/api/__clerk`
- Production bypasses must be false:
  - `DEV_MOCK_API=false`
  - `DEV_AUTH_BYPASS=false`
  - `VITE_DEV_AUTH_BYPASS=false`

Run this against the deployed app:

```sh
SMOKE_BASE_URL=https://your-domain.example pnpm --filter @workspace/scripts run smoke:replit
```

## Acceptance Tests

- Samsung Health shows recent wearable data.
- Health Connect shows Samsung Health as a source.
- Ascension Quest requests and receives Health Connect permissions.
- Manual sync imports at least one step or activity record.
- Refresh/sign out/sign in preserves imported data.
- Running sync twice reports duplicates instead of double-counting progress.
- Missing permissions show a helpful message and do not crash.
