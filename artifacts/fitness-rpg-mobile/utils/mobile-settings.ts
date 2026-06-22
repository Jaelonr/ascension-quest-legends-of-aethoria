import AsyncStorage from "@react-native-async-storage/async-storage";

export type Units = "imperial" | "metric";
export type WeightUnit = "lbs" | "kg";
export type DistanceUnit = "mi" | "km";
export type NarrativeMode = "balanced" | "immersive" | "technical";
export type AccentColor = "gold" | "cyan" | "green" | "orange" | "red" | "purple";

export type MobileSettings = {
  units: Units;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  narrativeMode: NarrativeMode;
  accentColor: AccentColor;
  soundsEnabled: boolean;
  reducedMotion: boolean;
  compactMode: boolean;
  notificationsEnabled: boolean;
  workoutReminder: boolean;
  reminderTime: string;
  achievementAlerts: boolean;
  raidAlerts: boolean;
  streakAlerts: boolean;
  biometricLock: boolean;
  autoLock: boolean;
  analyticsEnabled: boolean;
  crashReports: boolean;
};

export const MOBILE_SETTINGS_KEY = "ascension-quest-mobile-settings";

export const DEFAULT_MOBILE_SETTINGS: MobileSettings = {
  units: "imperial",
  weightUnit: "lbs",
  distanceUnit: "mi",
  narrativeMode: "balanced",
  accentColor: "gold",
  soundsEnabled: true,
  reducedMotion: false,
  compactMode: false,
  notificationsEnabled: false,
  workoutReminder: false,
  reminderTime: "18:00",
  achievementAlerts: true,
  raidAlerts: true,
  streakAlerts: true,
  biometricLock: false,
  autoLock: false,
  analyticsEnabled: true,
  crashReports: true,
};

export function mergeMobileSettings(value: Partial<MobileSettings> | null): MobileSettings {
  const merged = { ...DEFAULT_MOBILE_SETTINGS, ...(value ?? {}) };
  if (!value?.weightUnit) merged.weightUnit = merged.units === "metric" ? "kg" : "lbs";
  if (!value?.distanceUnit) merged.distanceUnit = merged.units === "metric" ? "km" : "mi";
  return merged;
}

export async function loadMobileSettings(): Promise<MobileSettings> {
  const raw = await AsyncStorage.getItem(MOBILE_SETTINGS_KEY);
  return mergeMobileSettings(raw ? JSON.parse(raw) : null);
}

export async function saveMobileSettings(settings: MobileSettings): Promise<void> {
  await AsyncStorage.setItem(MOBILE_SETTINGS_KEY, JSON.stringify(settings));
}
