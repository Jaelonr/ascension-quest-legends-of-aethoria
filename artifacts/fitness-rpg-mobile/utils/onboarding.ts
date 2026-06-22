import AsyncStorage from "@react-native-async-storage/async-storage";

export const MOBILE_ONBOARDING_KEY = "ascension_quest_mobile_onboarding_v1";

export async function hasCompletedMobileOnboarding(): Promise<boolean> {
  return (await AsyncStorage.getItem(MOBILE_ONBOARDING_KEY)) === "true";
}

export async function markMobileOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(MOBILE_ONBOARDING_KEY, "true");
}

export async function clearMobileOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(MOBILE_ONBOARDING_KEY);
}
