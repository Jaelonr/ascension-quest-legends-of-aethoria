import { Redirect } from "expo-router";

export default function QuestsCompatibilityRedirect() {
  // Launch scope keeps the single-player daily loop centered on the Guild Hall.
  return <Redirect href="/(tabs)" />;
}
