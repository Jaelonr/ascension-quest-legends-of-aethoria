# Android Development Build

Use an Android development build before adding Samsung wearable support. Expo Go cannot load native Health Connect modules.

## Project

- Mobile app: `artifacts/fitness-rpg-mobile`
- Android package: `com.jaelonr.ascensionquest`
- EAS profile for phone testing: `development`
- Backend: deployed Replit/custom domain

## One-Time Setup

1. Install and sign in to EAS CLI:

   ```sh
   npm install -g eas-cli
   eas login
   ```

2. Enter the mobile project:

   ```sh
   cd artifacts/fitness-rpg-mobile
   ```

3. Configure EAS project metadata if it has not been created yet:

   ```sh
   eas build:configure
   ```

4. Install the development client and commit the updated `package.json` and `pnpm-lock.yaml`:

   ```sh
   pnpm exec expo install expo-dev-client
   ```

5. Add required build secrets. Use the real deployed domain and Clerk publishable key:

   ```sh
   eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value https://your-domain.example
   eas secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_...
   eas secret:create --scope project --name EXPO_PUBLIC_CLERK_PROXY_URL --value /api/__clerk
   ```

## Build And Install

1. Build the Android development APK:

   ```sh
   eas build --platform android --profile development
   ```

2. Install the APK on the Samsung phone from the EAS QR/download link.

3. Start the local development server when testing code changes:

   ```sh
   pnpm exec expo start --dev-client
   ```

4. Open the installed Ascension Quest development app on the phone and connect it to the dev server if prompted.

## Product Smoke Test

Before adding Health Connect, verify:

- Google sign-in works.
- Hall, Training, Nutrition, Chronicle, Character, and Armory load.
- The app talks to the Replit API.
- Setup and saved data persist after refresh/sign-out/sign-in.
- Two Google accounts stay separate.

## Samsung Health Connect Gate

After the Android development build works, add Health Connect native support and follow `docs/samsung-health-connect.md`.
