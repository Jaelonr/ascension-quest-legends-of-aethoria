import { useState, useEffect, useCallback } from "react";

export interface AppSettings {
  notifications: {
    enabled: boolean;
    workoutReminder: boolean;
    reminderTime: string;
    achievements: boolean;
    raids: boolean;
    streakAlert: boolean;
  };
  security: {
    biometricEnabled: boolean;
    autoLock: boolean;
    autoLockTimeout: number;
  };
  units: {
    weight: "kg" | "lbs";
    distance: "km" | "mi";
  };
  appearance: {
    accentColor: string;
    reducedMotion: boolean;
    compactMode: boolean;
  };
  sounds: {
    enabled: boolean;
  };
  privacy: {
    analyticsEnabled: boolean;
    crashReports: boolean;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    enabled: false,
    workoutReminder: false,
    reminderTime: "08:00",
    achievements: true,
    raids: true,
    streakAlert: true,
  },
  security: {
    biometricEnabled: false,
    autoLock: false,
    autoLockTimeout: 5,
  },
  units: {
    weight: "lbs",
    distance: "mi",
  },
  appearance: {
    accentColor: "cyan",
    reducedMotion: false,
    compactMode: false,
  },
  sounds: {
    enabled: true,
  },
  privacy: {
    analyticsEnabled: true,
    crashReports: true,
  },
};

const STORAGE_KEY = "fitness-rpg-settings";

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
      security: { ...DEFAULT_SETTINGS.security, ...parsed.security },
      units: { ...DEFAULT_SETTINGS.units, ...parsed.units },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...parsed.appearance },
      sounds: { ...DEFAULT_SETTINGS.sounds, ...parsed.sounds },
      privacy: { ...DEFAULT_SETTINGS.privacy, ...parsed.privacy },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings);

  const updateSettings = useCallback((updater: (prev: AppSettings) => AppSettings) => {
    setSettingsState(prev => {
      const next = updater(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setSetting = useCallback(<K extends keyof AppSettings, SK extends keyof AppSettings[K]>(
    section: K,
    key: SK,
    value: AppSettings[K][SK]
  ) => {
    updateSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }, [updateSettings]);

  return { settings, setSetting, updateSettings };
}
