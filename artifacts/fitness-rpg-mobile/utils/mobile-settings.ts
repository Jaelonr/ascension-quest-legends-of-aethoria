import AsyncStorage from "@react-native-async-storage/async-storage";

export type Units = "imperial" | "metric";
export type NarrativeMode = "balanced" | "immersive" | "technical";

export type MobileSettings = {
  units: Units;
  narrativeMode: NarrativeMode;
  soundsEnabled: boolean;
  reducedMotion: boolean;
  compactMode: boolean;
  analyticsEnabled: boolean;
  crashReports: boolean;
};

export const MOBILE_SETTINGS_KEY = "ascension-quest-mobile-settings";

export const DEFAULT_MOBILE_SETTINGS: MobileSettings = {
  units: "imperial",
  narrativeMode: "balanced",
  soundsEnabled: true,
  reducedMotion: false,
  compactMode: false,
  analyticsEnabled: true,
  crashReports: true,
};

export function mergeMobileSettings(value: Partial<MobileSettings> | null): MobileSettings {
  return { ...DEFAULT_MOBILE_SETTINGS, ...(value ?? {}) };
}

export async function loadMobileSettings(): Promise<MobileSettings> {
  const raw = await AsyncStorage.getItem(MOBILE_SETTINGS_KEY);
  return mergeMobileSettings(raw ? JSON.parse(raw) : null);
}

export async function saveMobileSettings(settings: MobileSettings): Promise<void> {
  await AsyncStorage.setItem(MOBILE_SETTINGS_KEY, JSON.stringify(settings));
}
