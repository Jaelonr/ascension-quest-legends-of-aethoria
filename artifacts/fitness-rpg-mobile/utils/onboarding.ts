import AsyncStorage from "@react-native-async-storage/async-storage";

export const MOBILE_ONBOARDING_KEY = "ascension_quest_mobile_onboarding_v1";
export const MOBILE_FORCE_SETUP_KEY = "ascension_quest_force_setup_v1";

export async function hasCompletedMobileOnboarding(): Promise<boolean> {
  return (await AsyncStorage.getItem(MOBILE_ONBOARDING_KEY)) === "true";
}

export async function markMobileOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(MOBILE_ONBOARDING_KEY, "true");
}

export async function clearMobileOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(MOBILE_ONBOARDING_KEY);
}

export async function hasForcedMobileSetup(): Promise<boolean> {
  return (await AsyncStorage.getItem(MOBILE_FORCE_SETUP_KEY)) === "true";
}

export async function forceMobileSetup(): Promise<void> {
  await AsyncStorage.setItem(MOBILE_FORCE_SETUP_KEY, "true");
}

export async function clearForcedMobileSetup(): Promise<void> {
  await AsyncStorage.removeItem(MOBILE_FORCE_SETUP_KEY);
}
