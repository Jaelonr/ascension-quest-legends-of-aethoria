import { useGetBiometrics, useGetPlayer, useSetupPlayer, useUpdateBiometrics } from "@workspace/api-client-react";
import { loadMobileSettings, type Units, type WeightUnit } from "@/utils/mobile-settings";
import { clearForcedMobileSetup, hasForcedMobileSetup } from "@/utils/onboarding";
import { useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Easing, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, Vibration, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EQUIPMENT_TYPES = [
  { id: "power_rack", label: "Power Rack" },
  { id: "squat_rack", label: "Squat Rack" },
  { id: "smith_machine", label: "Smith Machine" },
  { id: "barbell", label: "Barbell" },
  { id: "plates", label: "Plates" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "adjustable_dumbbells", label: "Adjustable Dumbbells" },
  { id: "kettlebells", label: "Kettlebells" },
  { id: "adjustable_bench", label: "Adjustable Bench" },
  { id: "flat_bench", label: "Flat Bench" },
  { id: "incline_bench", label: "Incline Bench" },
  { id: "cable_machine", label: "Cable Machine" },
  { id: "functional_trainer", label: "Functional Trainer" },
  { id: "lat_pulldown", label: "Lat Pulldown" },
  { id: "leg_press", label: "Leg Press" },
  { id: "hack_squat", label: "Hack Squat" },
  { id: "belt_squat", label: "Belt Squat" },
  { id: "pull_up_bar", label: "Pull-Up Bar" },
  { id: "dip_station", label: "Dip Station" },
  { id: "resistance_bands", label: "Resistance Bands" },
  { id: "treadmill", label: "Treadmill" },
  { id: "bike", label: "Bike" },
  { id: "rower", label: "Rower" },
  { id: "elliptical", label: "Elliptical" },
  { id: "stair_climber", label: "Stair Climber" },
  { id: "jump_rope", label: "Jump Rope" },
  { id: "heavy_bag", label: "Heavy Bag" },
  { id: "fightcamp", label: "FightCamp" },
  { id: "speed_bag", label: "Speed Bag" },
  { id: "double_end_bag", label: "Double-End Bag" },
  { id: "wrestling_mat", label: "Wrestling Mat" },
  { id: "yoga_mat", label: "Yoga Mat" },
  { id: "medicine_ball", label: "Medicine Ball" },
  { id: "slam_ball", label: "Slam Ball" },
  { id: "sled", label: "Sled" },
  { id: "battle_ropes", label: "Battle Ropes" },
  { id: "foam_roller", label: "Foam Roller" },
  { id: "bodyweight", label: "Bodyweight Only" },
];

type FormState = {
  name: string;
  ageYears: string;
  sex: "male" | "female" | "other" | "";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active" | "";
  weightGoal: "lose" | "maintain" | "gain";
  goalFocus: "strength" | "allround" | "combat" | "endurance" | "";
  originFocus: "warrior" | "swift" | "precise" | "unawakened" | "";
  trainingFrequency: "daily" | "regular" | "occasional" | "none" | "";
  combatInstinct: "force" | "tactical" | "endure" | "speed" | "";
  height: string;
  weight: string;
  bodyFatPct: string;
  squat1rm: string;
  bench1rm: string;
  deadlift1rm: string;
  ohp1rm: string;
  row1rm: string;
  equipmentTypes: string[];
  notes: string;
};

const empty: FormState = {
  name: "",
  ageYears: "",
  sex: "",
  activityLevel: "",
  weightGoal: "maintain",
  goalFocus: "",
  originFocus: "",
  trainingFrequency: "",
  combatInstinct: "",
  height: "",
  weight: "",
  bodyFatPct: "",
  squat1rm: "",
  bench1rm: "",
  deadlift1rm: "",
  ohp1rm: "",
  row1rm: "",
  equipmentTypes: [],
  notes: "",
};

const SEX_OPTIONS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
] as const;

const ACTIVITY_OPTIONS = [
  { id: "sedentary", label: "Low", desc: "Mostly deskbound or returning carefully." },
  { id: "light", label: "Light", desc: "Some walking or 1-2 easy sessions weekly." },
  { id: "moderate", label: "Moderate", desc: "3-4 sessions or regular active days." },
  { id: "active", label: "Active", desc: "Hard training most weeks." },
  { id: "very_active", label: "Very Active", desc: "Daily training, sport, or physical work." },
] as const;

const GOAL_OPTIONS = [
  { id: "strength", label: "Forge Power", desc: "Strength and size.", baseClass: "warrior", weightGoal: "gain" as const, bonuses: { strength: 4, agility: 0, stamina: 0, vitality: 2, discipline: 1, sense: 0 } },
  { id: "allround", label: "All-Around Adventurer", desc: "Balanced fitness and discipline.", baseClass: "adventurer", weightGoal: "maintain" as const, bonuses: { strength: 2, agility: 1, stamina: 1, vitality: 1, discipline: 2, sense: 0 } },
  { id: "combat", label: "Combat Arts", desc: "Striking, grappling, and skill practice.", baseClass: "striker", weightGoal: "gain" as const, bonuses: { strength: 1, agility: 2, stamina: 1, vitality: 0, discipline: 2, sense: 1 } },
  { id: "endurance", label: "Endurance Path", desc: "Conditioning, resilience, and recovery.", baseClass: "ranger", weightGoal: "maintain" as const, bonuses: { strength: 0, agility: 1, stamina: 4, vitality: 1, discipline: 1, sense: 1 } },
] as const;

const ORIGIN_OPTIONS = [
  { id: "warrior", label: "Iron Warrior", desc: "Heavy iron was your calling before the summoning.", tag: "STR / VIT", bonuses: { strength: 3, agility: 0, stamina: 0, vitality: 2, discipline: 0, sense: 0 } },
  { id: "swift", label: "Swift Shadow", desc: "Speed and endurance defined the body you brought here.", tag: "AGI / STA", bonuses: { strength: 0, agility: 3, stamina: 2, vitality: 0, discipline: 0, sense: 0 } },
  { id: "precise", label: "Precise Tactician", desc: "Technique, consistency, and careful form shaped you.", tag: "DIS / SEN", bonuses: { strength: 0, agility: 0, stamina: 0, vitality: 0, discipline: 3, sense: 2 } },
  { id: "unawakened", label: "The Unawakened", desc: "Untested, but ready to become more than you were.", tag: "Balanced", bonuses: { strength: 1, agility: 1, stamina: 1, vitality: 1, discipline: 1, sense: 0 } },
] as const;

const FREQUENCY_OPTIONS = [
  { id: "daily", label: "Every Day", desc: "Training was already part of your daily life.", tag: "All +2", bonuses: { strength: 2, agility: 2, stamina: 2, vitality: 2, discipline: 2, sense: 2 } },
  { id: "regular", label: "3-4x Per Week", desc: "Consistent effort. You showed up more often than not.", tag: "All +1", bonuses: { strength: 1, agility: 1, stamina: 1, vitality: 1, discipline: 1, sense: 1 } },
  { id: "occasional", label: "1-2x Per Week", desc: "You were finding rhythm before the summoning.", tag: "Baseline", bonuses: { strength: 0, agility: 0, stamina: 0, vitality: 0, discipline: 0, sense: 0 } },
  { id: "none", label: "Not Yet", desc: "This body begins untested, and hungry for change.", tag: "Baseline", bonuses: { strength: 0, agility: 0, stamina: 0, vitality: 0, discipline: 0, sense: 0 } },
] as const;

const INSTINCT_OPTIONS = [
  { id: "force", label: "Raw Force", desc: "You overwhelm with power. Every rep is a war.", tag: "STR +2", bonuses: { strength: 2, agility: 0, stamina: 0, vitality: 0, discipline: 0, sense: 0 } },
  { id: "tactical", label: "Calculated Precision", desc: "Every movement is intentional and measured.", tag: "DIS +2 / SEN +1", bonuses: { strength: 0, agility: 0, stamina: 0, vitality: 0, discipline: 2, sense: 1 } },
  { id: "endure", label: "Relentless Pressure", desc: "You outlast what stands in front of you.", tag: "STA +2 / VIT +1", bonuses: { strength: 0, agility: 0, stamina: 2, vitality: 1, discipline: 0, sense: 0 } },
  { id: "speed", label: "Blinding Speed", desc: "Fast, unpredictable, and hard to pin down.", tag: "AGI +2 / SEN +1", bonuses: { strength: 0, agility: 2, stamina: 0, vitality: 0, discipline: 0, sense: 1 } },
] as const;

const RITE_SOUNDS = {
  select: require("../assets/sounds/system-select.wav"),
  advance: require("../assets/sounds/system-select.wav"),
  warning: require("../assets/sounds/system-warning.wav"),
  complete: require("../assets/sounds/system-complete.wav"),
} as const;

const CLASS_PATHS = [
  {
    id: "warrior",
    name: "Warrior",
    specialty: "Iron Vanguard",
    desc: "Power first. Heavy work and hard-earned resilience open the frontline path.",
    weights: { strength: 4, vitality: 2, discipline: 1, stamina: 1, agility: 0, sense: 0 },
  },
  {
    id: "striker",
    name: "Striker",
    specialty: "Aether Duelist",
    desc: "Speed, combat practice, and discipline shape a fighter who wins exchanges.",
    weights: { agility: 3, discipline: 2, sense: 2, strength: 1, stamina: 1, vitality: 0 },
  },
  {
    id: "ranger",
    name: "Ranger",
    specialty: "Wayfarer",
    desc: "Conditioning and recovery make long expeditions possible.",
    weights: { stamina: 4, sense: 2, discipline: 1, vitality: 1, agility: 1, strength: 0 },
  },
  {
    id: "adventurer",
    name: "Adventurer",
    specialty: "Mythril Pathfinder",
    desc: "Balanced effort keeps multiple class doors open until your record chooses one.",
    weights: { discipline: 2, strength: 1, agility: 1, stamina: 1, vitality: 1, sense: 1 },
  },
] as const;

const ACTIVITY_BONUS: Record<Exclude<FormState["activityLevel"], "">, Partial<Record<keyof (typeof GOAL_OPTIONS)[number]["bonuses"], number>>> = {
  sedentary: {},
  light: { discipline: 1 },
  moderate: { strength: 1, stamina: 1, discipline: 1 },
  active: { strength: 1, agility: 1, stamina: 1, vitality: 1, discipline: 1 },
  very_active: { strength: 2, agility: 1, stamina: 2, vitality: 1, discipline: 1, sense: 1 },
};

const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number) => Math.round((lbs / 2.20462) * 100) / 100;
const cmToIn = (cm: number) => Math.round((cm / 2.54) * 10) / 10;
const inToCm = (inches: number) => Math.round(inches * 2.54 * 10) / 10;
const numOrNull = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && value.trim() !== "" ? parsed : null;
};

function inToFtIn(inches: number) {
  const ft = Math.floor(inches / 12);
  const rem = Math.round(inches % 12);
  return `${ft}'${rem}"`;
}

function toForm(data: any, units: Units, weightUnit: WeightUnit): FormState {
  const metricHeight = units === "metric";
  const metricWeight = weightUnit === "kg";
  const lift = (value: number | null | undefined) => value == null ? "" : String(metricWeight ? value : kgToLbs(value));
  return {
    name: "",
    ageYears: "",
    sex: "",
    activityLevel: "",
    weightGoal: "maintain",
    goalFocus: "",
    originFocus: "",
    trainingFrequency: "",
    combatInstinct: "",
    height: data?.heightCm != null ? String(metricHeight ? data.heightCm : cmToIn(data.heightCm)) : "",
    weight: data?.weightKg != null ? String(metricWeight ? data.weightKg : kgToLbs(data.weightKg)) : "",
    bodyFatPct: data?.bodyFatPct != null ? String(data.bodyFatPct) : "",
    squat1rm: lift(data?.squat1rm),
    bench1rm: lift(data?.bench1rm),
    deadlift1rm: lift(data?.deadlift1rm),
    ohp1rm: lift(data?.ohp1rm),
    row1rm: lift(data?.row1rm),
    equipmentTypes: data?.equipmentTypes ?? [],
    notes: data?.notes ?? "",
  };
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: player, isLoading: playerLoading } = useGetPlayer();
  const { data, isLoading } = useGetBiometrics();
  const update = useUpdateBiometrics();
  const setupPlayer = useSetupPlayer();
  const [form, setForm] = useState<FormState>(empty);
  const [dirty, setDirty] = useState(false);
  const [unitSystem, setUnitSystem] = useState<Units>("imperial");
  const [weightUnitSetting, setWeightUnitSetting] = useState<WeightUnit>("lbs");
  const [scanStep, setScanStep] = useState(0);
  const [sonicRiteEnabled, setSonicRiteEnabled] = useState(true);
  const [forceSetup, setForceSetup] = useState(false);
  const scanPulse = useRef(new Animated.Value(0)).current;
  const scanReveal = useRef(new Animated.Value(1)).current;
  const transitionFlash = useRef(new Animated.Value(0)).current;
  const systemSweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    loadMobileSettings()
      .then((settings) => {
        if (!mounted) return;
        setUnitSystem(settings.units);
        setWeightUnitSetting(settings.weightUnit);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    hasForcedMobileSetup()
      .then((forced) => {
        if (mounted) setForceSetup(forced);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    scanPulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanPulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanPulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanPulse]);

  useEffect(() => {
    scanReveal.setValue(0);
    systemSweep.setValue(0);
    Animated.timing(scanReveal, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.sequence([
      Animated.timing(transitionFlash, {
        toValue: 1,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(transitionFlash, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    Animated.timing(systemSweep, {
      toValue: 1,
      duration: 980,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [scanReveal, scanStep, systemSweep, transitionFlash]);

  const signalRite = (type: "advance" | "select" | "warning" | "complete" = "select") => {
    if (!sonicRiteEnabled) return;
    Audio.Sound.createAsync(RITE_SOUNDS[type], { shouldPlay: true, volume: type === "complete" ? 0.42 : 0.28 })
      .then(({ sound }) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => undefined);
          }
        });
      })
      .catch(() => undefined);
    if (type === "complete") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate([0, 45, 80, 70]);
      return;
    }
    if (type === "warning") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Vibration.vibrate([0, 30, 50, 30]);
      return;
    }
    Haptics.impactAsync(type === "advance" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    if (data) {
      setForm((prev) => ({ ...prev, ...toForm(data, unitSystem, weightUnitSetting), name: prev.name || player?.name || "" }));
      setDirty(false);
    }
  }, [data, player?.name, unitSystem, weightUnitSetting]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const toggleEquipment = (id: string) => {
    setForm((prev) => ({
      ...prev,
      equipmentTypes: prev.equipmentTypes.includes(id)
        ? prev.equipmentTypes.filter((item) => item !== id)
        : [...prev.equipmentTypes, id],
    }));
    setDirty(true);
  };

  const chooseGoal = (id: FormState["goalFocus"]) => {
    const goal = GOAL_OPTIONS.find((item) => item.id === id);
    setForm((prev) => ({
      ...prev,
      goalFocus: id,
      weightGoal: goal?.weightGoal ?? prev.weightGoal,
    }));
    setDirty(true);
  };

  const chosenGoal = GOAL_OPTIONS.find((item) => item.id === form.goalFocus);
  const chosenOrigin = ORIGIN_OPTIONS.find((item) => item.id === form.originFocus);
  const chosenFrequency = FREQUENCY_OPTIONS.find((item) => item.id === form.trainingFrequency);
  const chosenInstinct = INSTINCT_OPTIONS.find((item) => item.id === form.combatInstinct);
  const startingStats = (() => {
    const base = { strength: 1, agility: 1, stamina: 1, vitality: 1, discipline: 1, sense: 1 };
    [chosenGoal, chosenOrigin, chosenFrequency, chosenInstinct].forEach((source) => {
      Object.entries(source?.bonuses ?? {}).forEach(([key, value]) => {
        base[key as keyof typeof base] += value;
      });
    });
    if (form.activityLevel) {
      Object.entries(ACTIVITY_BONUS[form.activityLevel]).forEach(([key, value]) => {
        base[key as keyof typeof base] += value ?? 0;
      });
    }
    return base;
  })();

  const classForecast = CLASS_PATHS
    .map((path) => ({
      ...path,
      score: Object.entries(path.weights).reduce(
        (total, [key, weight]) => total + startingStats[key as keyof typeof startingStats] * weight,
        0
      ),
    }))
    .sort((a, b) => b.score - a.score);
  const primaryPath = classForecast[0];
  const maxForecastScore = Math.max(primaryPath?.score ?? 1, 1);

  const scanReady =
    form.name.trim().length > 1 &&
    Number(form.ageYears) >= 10 &&
    Number(form.ageYears) <= 100 &&
    !!form.sex &&
    !!form.activityLevel &&
    !!form.goalFocus &&
    !!form.originFocus &&
    !!form.trainingFrequency &&
    !!form.combatInstinct;
  const scanRequirements = [
    { label: "Name", complete: form.name.trim().length > 1 },
    { label: "Age", complete: Number(form.ageYears) >= 10 && Number(form.ageYears) <= 100 },
    { label: "Sex", complete: !!form.sex },
    { label: "Activity", complete: !!form.activityLevel },
    { label: "Path", complete: !!form.goalFocus },
    { label: "Origin", complete: !!form.originFocus },
    { label: "History", complete: !!form.trainingFrequency },
    { label: "Style", complete: !!form.combatInstinct },
  ];
  const completedScanRequirements = scanRequirements.filter((item) => item.complete).length;
  const scanProgress = completedScanRequirements / scanRequirements.length;

  const save = () => {
    const toKg = (value: string) => {
      const parsed = numOrNull(value);
      return parsed == null ? null : weightUnitSetting === "kg" ? parsed : lbsToKg(parsed);
    };
    const toCm = (value: string) => {
      const parsed = numOrNull(value);
      return parsed == null ? null : unitSystem === "metric" ? parsed : inToCm(parsed);
    };
    update.mutate(
      {
        data: {
          heightCm: toCm(form.height),
          weightKg: toKg(form.weight),
          bodyFatPct: numOrNull(form.bodyFatPct),
          squat1rm: toKg(form.squat1rm) != null ? Math.round(toKg(form.squat1rm)!) : null,
          bench1rm: toKg(form.bench1rm) != null ? Math.round(toKg(form.bench1rm)!) : null,
          deadlift1rm: toKg(form.deadlift1rm) != null ? Math.round(toKg(form.deadlift1rm)!) : null,
          ohp1rm: toKg(form.ohp1rm) != null ? Math.round(toKg(form.ohp1rm)!) : null,
          row1rm: toKg(form.row1rm) != null ? Math.round(toKg(form.row1rm)!) : null,
          equipmentTypes: form.equipmentTypes,
          notes: form.notes || null,
        },
      },
      {
        onSuccess: () => {
          setDirty(false);
          Alert.alert("System Record saved", "The Guild planner will use these details.");
        },
        onError: () => Alert.alert("Save failed", "The System Record could not be updated."),
      }
    );
  };

  const completeInitialScan = () => {
    if (!scanReady || !chosenGoal) {
      signalRite("warning");
      Alert.alert("Scan incomplete", "Enter name, age, sex, activity, first path, origin, training history, and combat instinct before completing the scan.");
      return;
    }
    const toKg = (value: string) => {
      const parsed = numOrNull(value);
      return parsed == null ? null : weightUnitSetting === "kg" ? parsed : lbsToKg(parsed);
    };
    const toCm = (value: string) => {
      const parsed = numOrNull(value);
      return parsed == null ? null : unitSystem === "metric" ? parsed : inToCm(parsed);
    };

    setupPlayer.mutate(
      {
        data: {
          name: form.name.trim(),
          statBonuses: startingStats,
          equipmentIds: [],
          baseClass: chosenGoal.baseClass,
          systemScan: {
            ageYears: Number(form.ageYears),
            sex: form.sex || undefined,
            heightCm: toCm(form.height),
            weightKg: toKg(form.weight),
            activityLevel: form.activityLevel || undefined,
            weightGoal: form.weightGoal,
            equipmentTypes: form.equipmentTypes,
          },
        },
      },
      {
        onSuccess: () => {
          signalRite("complete");
          setDirty(false);
          clearForcedMobileSetup().catch(() => undefined);
          setForceSetup(false);
          queryClient.setQueryData(["/api/player"], (existing: any) =>
            existing
              ? { ...existing, name: form.name.trim(), baseClass: chosenGoal.baseClass, setupCompleted: true }
              : existing
          );
          queryClient.invalidateQueries({ queryKey: ["/api/player"] }).catch(() => undefined);
          Alert.alert("System Scan complete", "Aethoria has accepted your first record.", [
            { text: "Enter the Hall", onPress: () => router.replace("/(tabs)" as any) },
          ]);
        },
        onError: () => Alert.alert("Scan failed", "The System could not finish the initial record. Try again in a moment."),
      }
    );
  };

  const heightNum = parseFloat(form.height);
  const heightHint = unitSystem === "imperial" && Number.isFinite(heightNum) && heightNum > 0 ? inToFtIn(heightNum) : null;
  const heightUnit = unitSystem === "metric" ? "cm" : "in";
  const displayWeightUnit = weightUnitSetting;
  const lifts: Array<{ field: keyof FormState; label: string; placeholder: string }> = [
    { field: "squat1rm", label: "Squat", placeholder: "315" },
    { field: "bench1rm", label: "Bench Press", placeholder: "225" },
    { field: "deadlift1rm", label: "Deadlift", placeholder: "405" },
    { field: "ohp1rm", label: "Overhead Press", placeholder: "155" },
    { field: "row1rm", label: "Barbell Row", placeholder: "245" },
  ];
  const scanSteps = [
    { id: "threshold", label: "Threshold", title: "The Gate Has Not Closed", complete: true },
    { id: "identity", label: "Identity", title: "Name The Summoned", complete: form.name.trim().length > 1 && Number(form.ageYears) >= 10 && Number(form.ageYears) <= 100 && !!form.sex },
    { id: "vessel", label: "Vessel", title: "Measure The Vessel", complete: !!form.activityLevel },
    { id: "path", label: "Path", title: "Declare The First Pull", complete: !!form.goalFocus && !!form.originFocus },
    { id: "instinct", label: "Instinct", title: "Reveal The Pattern", complete: !!form.trainingFrequency && !!form.combatInstinct },
    { id: "arsenal", label: "Arsenal", title: "Mark What Crossed With You", complete: true },
    { id: "forecast", label: "Forecast", title: "The System Converges", complete: scanReady },
  ] as const;
  const currentScan = scanSteps[scanStep] ?? scanSteps[0];
  const canAdvanceScan = currentScan.complete;
  const advanceScan = () => {
    if (!canAdvanceScan) {
      signalRite("warning");
      Alert.alert("Signal incomplete", "The System waits for this answer before the rite can continue.");
      return;
    }
    signalRite("advance");
    setScanStep((prev) => Math.min(prev + 1, scanSteps.length - 1));
  };
  const retreatScan = () => {
    signalRite("select");
    setScanStep((prev) => Math.max(prev - 1, 0));
  };
  const scanOpacity = scanReveal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const scanTranslate = scanReveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const pulseScale = scanPulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] });
  const pulseOpacity = scanPulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.72] });
  const sweepTranslate = systemSweep.interpolate({ inputRange: [0, 1], outputRange: [-260, 260] });
  const riteProgress = (scanStep + 1) / scanSteps.length;

  const renderInterrogationStep = () => {
    if (currentScan.id === "threshold") {
      return (
        <View style={s.riteCard}>
          <Text style={s.riteWhisper}>OTHERWORLD TRANSFER CONFIRMED</Text>
          <Text style={s.riteTitle}>You stand between two laws of reality.</Text>
          <Text style={s.riteBody}>
            Aethoria has received you. The Guild will see a summoned adventurer. Only you see the hidden mechanism writing over the dark.
          </Text>
          <View style={s.systemWarning}>
            <Text style={s.systemWarningText}>WORLD DANGER: CRITICAL</Text>
            <Text style={s.systemWarningSub}>The first record must be made before the Hall can assign your duty.</Text>
          </View>
        </View>
      );
    }

    if (currentScan.id === "identity") {
      return (
        <View style={s.riteCard}>
          <Text style={s.riteWhisper}>IDENTITY THREAD REQUIRED</Text>
          <Text style={s.riteTitle}>Name the one who crossed.</Text>
          <Field label="Adventurer Name" value={form.name} onChangeText={(v) => setField("name", v)} placeholder="Jaelon" suffix="" keyboardType="default" />
          <Field label="Age" value={form.ageYears} onChangeText={(v) => setField("ageYears", v)} placeholder="30" suffix="years" />
          <Text style={s.groupLabel}>Sex</Text>
          <View style={s.optionRow}>
            {SEX_OPTIONS.map((option) => {
              const selected = form.sex === option.id;
              return (
                <TouchableOpacity key={option.id} style={[s.optionChip, selected && s.optionChipActive]} onPress={() => { signalRite("select"); setField("sex", option.id); }}>
                  <Text style={[s.optionText, selected && s.optionTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    if (currentScan.id === "vessel") {
      return (
        <View style={s.riteCard}>
          <Text style={s.riteWhisper}>VESSEL READINGS</Text>
          <Text style={s.riteTitle}>The System measures what survived the crossing.</Text>
          <View style={s.fieldRow}>
            <Field label={`Height ${heightHint ? `(${heightHint})` : ""}`} value={form.height} onChangeText={(v) => setField("height", v)} placeholder={unitSystem === "metric" ? "178" : "70"} suffix={heightUnit} />
            <Field label="Weight" value={form.weight} onChangeText={(v) => setField("weight", v)} placeholder={displayWeightUnit === "kg" ? "86" : "190"} suffix={displayWeightUnit} />
          </View>
          <Field label="Body Fat" value={form.bodyFatPct} onChangeText={(v) => setField("bodyFatPct", v)} placeholder="18" suffix="%" />
          <Text style={s.groupLabel}>Current Activity Signal</Text>
          <View style={s.stack}>
            {ACTIVITY_OPTIONS.map((option) => {
              const selected = form.activityLevel === option.id;
              return (
                <TouchableOpacity key={option.id} style={[s.choiceCard, selected && s.choiceCardActive]} onPress={() => { signalRite("select"); setField("activityLevel", option.id); }}>
                  <Text style={[s.choiceTitle, selected && s.choiceTitleActive]}>{option.label}</Text>
                  <Text style={s.choiceDesc}>{option.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    if (currentScan.id === "path") {
      return (
        <View style={s.riteCard}>
          <Text style={s.riteWhisper}>FIRST PATH FORECAST</Text>
          <Text style={s.riteTitle}>A class is not chosen. It is revealed by pressure.</Text>
          <View style={s.stack}>
            {GOAL_OPTIONS.map((option) => {
              const selected = form.goalFocus === option.id;
              return (
                <TouchableOpacity key={option.id} style={[s.choiceCard, selected && s.choiceCardActive]} onPress={() => { signalRite("select"); chooseGoal(option.id); }}>
                  <View style={s.choiceTop}>
                    <Text style={[s.choiceTitle, selected && s.choiceTitleActive]}>{option.label}</Text>
                    <Text style={s.classTag}>{option.baseClass}</Text>
                  </View>
                  <Text style={s.choiceDesc}>{option.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.groupLabel}>Origin Signal</Text>
          <View style={s.stack}>
            {ORIGIN_OPTIONS.map((option) => {
              const selected = form.originFocus === option.id;
              return (
                <TouchableOpacity key={option.id} style={[s.choiceCard, selected && s.choiceCardActive]} onPress={() => { signalRite("select"); setField("originFocus", option.id); }}>
                  <View style={s.choiceTop}>
                    <Text style={[s.choiceTitle, selected && s.choiceTitleActive]}>{option.label}</Text>
                    <Text style={s.classTag}>{option.tag}</Text>
                  </View>
                  <Text style={s.choiceDesc}>{option.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    if (currentScan.id === "instinct") {
      return (
        <View style={s.riteCard}>
          <Text style={s.riteWhisper}>PATTERN RECOGNITION</Text>
          <Text style={s.riteTitle}>The System watches how you endured before arrival.</Text>
          <Text style={s.groupLabel}>Training History</Text>
          <View style={s.stack}>
            {FREQUENCY_OPTIONS.map((option) => {
              const selected = form.trainingFrequency === option.id;
              return (
                <TouchableOpacity key={option.id} style={[s.choiceCard, selected && s.choiceCardActive]} onPress={() => { signalRite("select"); setField("trainingFrequency", option.id); }}>
                  <View style={s.choiceTop}>
                    <Text style={[s.choiceTitle, selected && s.choiceTitleActive]}>{option.label}</Text>
                    <Text style={s.classTag}>{option.tag}</Text>
                  </View>
                  <Text style={s.choiceDesc}>{option.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.groupLabel}>Combat Instinct</Text>
          <View style={s.stack}>
            {INSTINCT_OPTIONS.map((option) => {
              const selected = form.combatInstinct === option.id;
              return (
                <TouchableOpacity key={option.id} style={[s.choiceCard, selected && s.choiceCardActive]} onPress={() => { signalRite("select"); setField("combatInstinct", option.id); }}>
                  <View style={s.choiceTop}>
                    <Text style={[s.choiceTitle, selected && s.choiceTitleActive]}>{option.label}</Text>
                    <Text style={s.classTag}>{option.tag}</Text>
                  </View>
                  <Text style={s.choiceDesc}>{option.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    if (currentScan.id === "arsenal") {
      return (
        <View style={s.riteCard}>
          <Text style={s.riteWhisper}>ARSENAL TRANSLATION</Text>
          <Text style={s.riteTitle}>Mark the tools your first commissions may safely invoke.</Text>
          <Text style={s.riteBody}>The System will not demand a barbell from an empty room. Leave unknown lifts blank; equipment can be changed later.</Text>
          <View style={s.equipmentGrid}>
            {EQUIPMENT_TYPES.map((item) => {
              const selected = form.equipmentTypes.includes(item.id);
              return (
                <TouchableOpacity key={item.id} style={[s.equipmentChip, selected && s.equipmentChipActive]} onPress={() => { signalRite("select"); toggleEquipment(item.id); }}>
                  <Text style={[s.equipmentText, selected && s.equipmentTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View style={s.riteCard}>
        <Text style={s.riteWhisper}>FORECAST CONVERGENCE</Text>
        <Text style={s.riteTitle}>{primaryPath?.name ?? "Adventurer"} Path Detected</Text>
        <View style={s.forecastBox}>
          <Text style={s.forecastTitle}>Starting Attribute Forecast</Text>
          <View style={s.forecastGrid}>
            {Object.entries(startingStats).map(([key, value]) => (
              <View key={key} style={s.forecastStat}>
                <Text style={s.forecastValue}>{value}</Text>
                <Text style={s.forecastLabel}>{key.slice(0, 3).toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={s.pathBox}>
          <View style={s.pathHeader}>
            <View>
              <Text style={s.pathKicker}>System Forecast</Text>
              <Text style={s.pathTitle}>{primaryPath?.name ?? "Adventurer"} Path</Text>
            </View>
            <Text style={s.pathBadge}>{primaryPath?.specialty ?? "Pathfinder"}</Text>
          </View>
          <Text style={s.pathDesc}>This is a projection, not a sentence. Your real training will decide what you become.</Text>
          <View style={s.pathRows}>
            {classForecast.map((path, index) => (
              <View key={path.id} style={s.pathRow}>
                <Text style={s.pathRank}>#{index + 1}</Text>
                <View style={{ flex: 1 }}>
                  <View style={s.pathNameRow}>
                    <Text style={s.pathName}>{path.name}</Text>
                    <Text style={s.pathScore}>{Math.round(path.score)} affinity</Text>
                  </View>
                  <View style={s.pathTrack}>
                    <View style={[s.pathFill, { width: `${Math.max(8, Math.min(100, (path.score / maxForecastScore) * 100))}%` }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const setupIncomplete = forceSetup || !player?.setupCompleted;

  if (setupIncomplete && !isLoading && !playerLoading) {
    return (
      <View style={[s.interrogationRoot, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <Animated.View pointerEvents="none" style={[s.transitionFlash, { opacity: transitionFlash }]} />
        <View style={s.riteHeader}>
          <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>Back</Text></TouchableOpacity>
          <TouchableOpacity style={s.soundToggle} onPress={() => { setSonicRiteEnabled((value) => !value); signalRite("select"); }}>
            <Text style={s.soundToggleText}>{sonicRiteEnabled ? "Rite Sound: On" : "Rite Sound: Muted"}</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.summoningStage, { minHeight: Math.max(190, Math.min(270, windowHeight * 0.28)) }]}>
          <Animated.View style={[s.outerRing, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
          <Animated.View style={[s.innerRing, { opacity: pulseOpacity }]} />
          <View style={s.verticalSigil} />
          <View style={s.horizontalSigil} />
          <Text style={s.systemSigil}>SYSTEM</Text>
          <Text style={s.systemLine}>INITIAL SCAN / SUMMONED VESSEL</Text>
          <Animated.View pointerEvents="none" style={[s.scanSweep, { transform: [{ translateX: sweepTranslate }] }]} />
        </View>
        <View style={s.riteProgressWrap}>
          <View style={s.riteProgressTrack}>
            <View style={[s.riteProgressFill, { width: `${Math.round(riteProgress * 100)}%` }]} />
          </View>
          <Text style={s.riteProgressText}>{scanStep + 1}/{scanSteps.length} SIGNALS</Text>
        </View>
        <Animated.View style={{ opacity: scanOpacity, transform: [{ translateY: scanTranslate }] }}>
          <Text style={s.kicker}>AWE RITE IN PROGRESS</Text>
          <Text style={s.title}>{currentScan.title}</Text>
          <Text style={s.subtitle}>Answer carefully. The System records facts; Aethoria will answer with consequences.</Text>
          <ScrollView
            style={s.riteStageScroll}
            contentContainerStyle={s.riteStageContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderInterrogationStep()}
          </ScrollView>
        </Animated.View>
        <View style={s.riteNav}>
          <TouchableOpacity style={[s.riteNavBtn, scanStep === 0 && s.riteNavDisabled]} onPress={retreatScan} disabled={scanStep === 0}>
            <Text style={s.riteNavText}>Previous Signal</Text>
          </TouchableOpacity>
          {scanStep === scanSteps.length - 1 ? (
            <TouchableOpacity style={[s.scanBtn, (!scanReady || setupPlayer.isPending) && { opacity: 0.55 }]} onPress={completeInitialScan} disabled={!scanReady || setupPlayer.isPending}>
              {setupPlayer.isPending ? <ActivityIndicator color="#0a0908" /> : <Text style={s.scanText}>Seal The First Record</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.riteNavPrimary, !canAdvanceScan && s.riteNavDisabled]} onPress={advanceScan}>
              <Text style={s.riteNavPrimaryText}>Continue The Rite</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }}>
      <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>Back to Character</Text></TouchableOpacity>
      <Text style={s.kicker}>SYSTEM RECORD</Text>
      <Text style={s.title}>System Record</Text>
      <Text style={s.subtitle}>Biometrics, strength marks, and equipment access.</Text>

      <View style={s.assessmentCard}>
        <View style={s.assessmentTop}>
          <View>
            <Text style={s.assessmentKicker}>Adventurer Assessment</Text>
            <Text style={s.assessmentTitle}>{setupIncomplete ? "Initial Scan Pending" : "Record Established"}</Text>
          </View>
          <Text style={scanReady || !setupIncomplete ? s.assessmentReady : s.assessmentOpen}>
            {completedScanRequirements}/{scanRequirements.length}
          </Text>
        </View>
        <View style={s.assessmentTrack}>
          <View style={[s.assessmentFill, { width: `${Math.round(scanProgress * 100)}%` }]} />
        </View>
        <View style={s.requirementRow}>
          {scanRequirements.map((item) => (
            <View key={item.label} style={[s.requirementChip, item.complete && s.requirementChipDone]}>
              <Text style={[s.requirementText, item.complete && s.requirementTextDone]}>
                {item.complete ? "OK " : ""}{item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.unitCard}>
        <Text style={s.unitLabel}>Unit System</Text>
        <Text style={s.unitValue}>
          {unitSystem === "metric" ? "Height: cm" : "Height: inches"} / Weight: {displayWeightUnit}
        </Text>
      </View>

      <View style={s.infoCard}>
        <Text style={s.infoText}>
          The System uses this record to set fair commissions and recommend training loads. The Guild ledger receives only the practical details needed to avoid unsafe work.
        </Text>
      </View>

      {isLoading || playerLoading ? (
        <ActivityIndicator color="#d9ad63" style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={s.card}>
            <View style={s.scanHeader}>
              <View>
                <Text style={s.cardTitle}>Initial System Scan</Text>
                <Text style={s.cardMeta}>Name, age, sex, activity, and first path shape the starting record. Your class is still earned through action.</Text>
              </View>
              <Text style={setupIncomplete ? s.openBadge : s.completeBadge}>{setupIncomplete ? "Open" : "Complete"}</Text>
            </View>
            <Field label="Adventurer Name" value={form.name} onChangeText={(v) => setField("name", v)} placeholder="Jaelon" suffix="" keyboardType="default" />
            <Field label="Age" value={form.ageYears} onChangeText={(v) => setField("ageYears", v)} placeholder="30" suffix="years" />

            <Text style={s.groupLabel}>Sex</Text>
            <View style={s.optionRow}>
              {SEX_OPTIONS.map((option) => {
                const selected = form.sex === option.id;
                return (
                  <TouchableOpacity key={option.id} style={[s.optionChip, selected && s.optionChipActive]} onPress={() => setField("sex", option.id)}>
                    <Text style={[s.optionText, selected && s.optionTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.groupLabel}>Current Activity Signal</Text>
            <View style={s.stack}>
              {ACTIVITY_OPTIONS.map((option) => {
                const selected = form.activityLevel === option.id;
                return (
                  <TouchableOpacity key={option.id} style={[s.choiceCard, selected && s.choiceCardActive]} onPress={() => setField("activityLevel", option.id)}>
                    <Text style={[s.choiceTitle, selected && s.choiceTitleActive]}>{option.label}</Text>
                    <Text style={s.choiceDesc}>{option.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.groupLabel}>First Path Forecast</Text>
            <View style={s.stack}>
              {GOAL_OPTIONS.map((option) => {
                const selected = form.goalFocus === option.id;
                return (
                  <TouchableOpacity key={option.id} style={[s.choiceCard, selected && s.choiceCardActive]} onPress={() => chooseGoal(option.id)}>
                    <View style={s.choiceTop}>
                      <Text style={[s.choiceTitle, selected && s.choiceTitleActive]}>{option.label}</Text>
                      <Text style={s.classTag}>{option.baseClass}</Text>
                    </View>
                    <Text style={s.choiceDesc}>{option.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.groupLabel}>Origin Signal</Text>
            <View style={s.stack}>
              {ORIGIN_OPTIONS.map((option) => {
                const selected = form.originFocus === option.id;
                return (
                  <TouchableOpacity key={option.id} style={[s.choiceCard, selected && s.choiceCardActive]} onPress={() => setField("originFocus", option.id)}>
                    <View style={s.choiceTop}>
                      <Text style={[s.choiceTitle, selected && s.choiceTitleActive]}>{option.label}</Text>
                      <Text style={s.classTag}>{option.tag}</Text>
                    </View>
                    <Text style={s.choiceDesc}>{option.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.groupLabel}>Training History</Text>
            <View style={s.stack}>
              {FREQUENCY_OPTIONS.map((option) => {
                const selected = form.trainingFrequency === option.id;
                return (
                  <TouchableOpacity key={option.id} style={[s.choiceCard, selected && s.choiceCardActive]} onPress={() => setField("trainingFrequency", option.id)}>
                    <View style={s.choiceTop}>
                      <Text style={[s.choiceTitle, selected && s.choiceTitleActive]}>{option.label}</Text>
                      <Text style={s.classTag}>{option.tag}</Text>
                    </View>
                    <Text style={s.choiceDesc}>{option.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.groupLabel}>Combat Instinct</Text>
            <View style={s.stack}>
              {INSTINCT_OPTIONS.map((option) => {
                const selected = form.combatInstinct === option.id;
                return (
                  <TouchableOpacity key={option.id} style={[s.choiceCard, selected && s.choiceCardActive]} onPress={() => setField("combatInstinct", option.id)}>
                    <View style={s.choiceTop}>
                      <Text style={[s.choiceTitle, selected && s.choiceTitleActive]}>{option.label}</Text>
                      <Text style={s.classTag}>{option.tag}</Text>
                    </View>
                    <Text style={s.choiceDesc}>{option.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.forecastBox}>
              <Text style={s.forecastTitle}>Starting Attribute Forecast</Text>
              <View style={s.forecastGrid}>
                {Object.entries(startingStats).map(([key, value]) => (
                  <View key={key} style={s.forecastStat}>
                    <Text style={s.forecastValue}>{value}</Text>
                    <Text style={s.forecastLabel}>{key.slice(0, 3).toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={s.pathBox}>
              <View style={s.pathHeader}>
                <View>
                  <Text style={s.pathKicker}>System Forecast</Text>
                  <Text style={s.pathTitle}>{primaryPath?.name ?? "Adventurer"} Path</Text>
                </View>
                <Text style={s.pathBadge}>{primaryPath?.specialty ?? "Pathfinder"}</Text>
              </View>
              <Text style={s.pathDesc}>
                Your selected goal, activity, and starting attributes are shaping this result. Your class is still earned through action.
              </Text>
              <View style={s.pathRows}>
                {classForecast.map((path, index) => (
                  <View key={path.id} style={s.pathRow}>
                    <Text style={s.pathRank}>#{index + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={s.pathNameRow}>
                        <Text style={s.pathName}>{path.name}</Text>
                        <Text style={s.pathScore}>{Math.round(path.score)} affinity</Text>
                      </View>
                      <View style={s.pathTrack}>
                        <View style={[s.pathFill, { width: `${Math.max(8, Math.min(100, (path.score / maxForecastScore) * 100))}%` }]} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
              <View style={s.nextPathBox}>
                <Text style={s.nextPathLabel}>Specialty Glimpse</Text>
                <Text style={s.nextPathTitle}>{primaryPath?.specialty ?? "Mythril Pathfinder"}</Text>
                <Text style={s.nextPathText}>{primaryPath?.desc}</Text>
              </View>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Body Metrics</Text>
            <View style={s.fieldRow}>
              <Field label={`Height ${heightHint ? `(${heightHint})` : ""}`} value={form.height} onChangeText={(v) => setField("height", v)} placeholder={unitSystem === "metric" ? "178" : "70"} suffix={heightUnit} />
              <Field label="Weight" value={form.weight} onChangeText={(v) => setField("weight", v)} placeholder={displayWeightUnit === "kg" ? "86" : "190"} suffix={displayWeightUnit} />
            </View>
            <Field label="Body Fat" value={form.bodyFatPct} onChangeText={(v) => setField("bodyFatPct", v)} placeholder="18" suffix="%" />
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Strength Marks</Text>
            <Text style={s.cardMeta}>These help the planner recommend reasonable loads. Leave unknown lifts blank.</Text>
            {lifts.map((lift) => (
              <Field key={lift.field} label={lift.label} value={String(form[lift.field] ?? "")} onChangeText={(v) => setField(lift.field, v)} placeholder={displayWeightUnit === "kg" ? String(Math.round(Number(lift.placeholder) / 2.20462)) : lift.placeholder} suffix={displayWeightUnit} />
            ))}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Owned Equipment</Text>
            <Text style={s.cardMeta}>Commissions and generated workouts should respect what you can actually use.</Text>
            <View style={s.equipmentGrid}>
              {EQUIPMENT_TYPES.map((item) => {
                const selected = form.equipmentTypes.includes(item.id);
                return (
                  <TouchableOpacity key={item.id} style={[s.equipmentChip, selected && s.equipmentChipActive]} onPress={() => toggleEquipment(item.id)}>
                    <Text style={[s.equipmentText, selected && s.equipmentTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Notes</Text>
            <TextInput
              style={s.notes}
              placeholder="Injuries, preferences, schedule limits..."
              placeholderTextColor="#6b5d4f"
              value={form.notes}
              onChangeText={(v) => setField("notes", v)}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={[s.saveBtn, (!dirty || update.isPending) && { opacity: 0.55 }]} onPress={save} disabled={!dirty || update.isPending}>
            {update.isPending ? <ActivityIndicator color="#0a0908" /> : <Text style={s.saveText}>Save System Record</Text>}
          </TouchableOpacity>

          {setupIncomplete && (
            <TouchableOpacity style={[s.scanBtn, (!scanReady || setupPlayer.isPending) && { opacity: 0.55 }]} onPress={completeInitialScan} disabled={!scanReady || setupPlayer.isPending}>
              {setupPlayer.isPending ? <ActivityIndicator color="#0a0908" /> : <Text style={s.scanText}>Complete Initial Scan</Text>}
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, placeholder, suffix, keyboardType = "decimal-pad" }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; suffix: string; keyboardType?: "decimal-pad" | "default" }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6b5d4f"
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0908" },
  interrogationRoot: { flex: 1, backgroundColor: "#020403", paddingHorizontal: 16 },
  transitionFlash: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, backgroundColor: "#7ddce4" },
  riteHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  soundToggle: { borderWidth: 1, borderColor: "#235e66", backgroundColor: "#061111", paddingHorizontal: 10, paddingVertical: 7 },
  soundToggleText: { color: "#7ddce4", fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  summoningStage: { alignItems: "center", justifyContent: "center", marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: "#123637", backgroundColor: "#030908" },
  outerRing: { position: "absolute", width: 184, height: 184, borderRadius: 92, borderWidth: 1, borderColor: "#7ddce4", backgroundColor: "#092323" },
  innerRing: { position: "absolute", width: 104, height: 104, borderRadius: 52, borderWidth: 1, borderColor: "#d9ad63" },
  verticalSigil: { position: "absolute", width: 1, height: "86%", backgroundColor: "#123637" },
  horizontalSigil: { position: "absolute", height: 1, width: "86%", backgroundColor: "#123637" },
  scanSweep: { position: "absolute", top: 0, bottom: 0, width: 64, backgroundColor: "#7ddce422" },
  systemSigil: { color: "#7ddce4", fontSize: 30, letterSpacing: 6, fontFamily: "Inter_700Bold" },
  systemLine: { color: "#9d8f80", fontSize: 9, letterSpacing: 2.2, textTransform: "uppercase", marginTop: 10, fontFamily: "Inter_700Bold" },
  riteProgressWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  riteProgressTrack: { flex: 1, height: 6, backgroundColor: "#071110", borderWidth: 1, borderColor: "#123637", overflow: "hidden" },
  riteProgressFill: { height: 6, backgroundColor: "#7ddce4" },
  riteProgressText: { color: "#7ddce4", fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  scanTrack: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 18 },
  scanStep: { borderWidth: 1, borderColor: "#26322f", backgroundColor: "#080a09", paddingHorizontal: 8, paddingVertical: 7 },
  scanStepActive: { borderColor: "#7ddce4", backgroundColor: "#071615" },
  scanStepDone: { borderColor: "#6b4d2f" },
  scanStepText: { color: "#6f6559", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  scanStepTextActive: { color: "#7ddce4" },
  riteStageScroll: { maxHeight: "58%" },
  riteStageContent: { paddingBottom: 4 },
  riteCard: { borderWidth: 1, borderColor: "#235e66", backgroundColor: "#071110", padding: 14, marginTop: 2, marginBottom: 8 },
  riteWhisper: { color: "#7ddce4", fontSize: 9, letterSpacing: 2.4, textTransform: "uppercase", fontFamily: "Inter_700Bold", marginBottom: 8 },
  riteTitle: { color: "#eee5d7", fontSize: 21, lineHeight: 28, fontFamily: "PlayfairDisplay_700Bold", marginBottom: 10 },
  riteBody: { color: "#b6aa9c", fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  systemWarning: { borderWidth: 1, borderColor: "#6b2f28", backgroundColor: "#1a0b08", padding: 12, marginTop: 14 },
  systemWarningText: { color: "#f09983", fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  systemWarningSub: { color: "#c8afa8", fontSize: 12, lineHeight: 18, marginTop: 5, fontFamily: "Inter_400Regular" },
  riteNav: { gap: 10, marginTop: "auto" },
  riteNavBtn: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", paddingVertical: 13, alignItems: "center" },
  riteNavPrimary: { borderWidth: 1, borderColor: "#8be2df", backgroundColor: "#49a3a0", paddingVertical: 14, alignItems: "center" },
  riteNavDisabled: { opacity: 0.45 },
  riteNavText: { color: "#d8c4a5", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  riteNavPrimaryText: { color: "#061010", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  back: { color: "#d9ad63", fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 18 },
  kicker: { color: "#9d8f80", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  title: { color: "#eee5d7", fontSize: 26, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2 },
  subtitle: { color: "#9f9586", fontSize: 12, marginTop: 4, marginBottom: 16, fontFamily: "Inter_400Regular" },
  assessmentCard: { borderWidth: 1, borderColor: "#235e66", backgroundColor: "#071615", padding: 12, marginBottom: 12 },
  assessmentTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  assessmentKicker: { color: "#7ddce4", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  assessmentTitle: { color: "#eee5d7", fontSize: 16, marginTop: 3, fontFamily: "PlayfairDisplay_700Bold" },
  assessmentOpen: { color: "#7ddce4", borderWidth: 1, borderColor: "#235e66", paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontFamily: "Inter_700Bold" },
  assessmentReady: { color: "#4ade80", borderWidth: 1, borderColor: "#166534", paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontFamily: "Inter_700Bold" },
  assessmentTrack: { height: 5, backgroundColor: "#020706", overflow: "hidden", marginTop: 12 },
  assessmentFill: { height: 5, backgroundColor: "#7ddce4" },
  requirementRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  requirementChip: { borderWidth: 1, borderColor: "#235e66", backgroundColor: "#020706", paddingHorizontal: 8, paddingVertical: 5 },
  requirementChipDone: { borderColor: "#166534", backgroundColor: "#08210f" },
  requirementText: { color: "#7ddce4", fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  requirementTextDone: { color: "#86efac" },
  unitCard: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 12, marginBottom: 12 },
  unitLabel: { color: "#8f887d", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  unitValue: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold" },
  infoCard: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 14, marginBottom: 12 },
  infoText: { color: "#cfc5b8", fontSize: 12, lineHeight: 18 },
  card: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 14, marginBottom: 12 },
  cardTitle: { color: "#d9ad63", fontSize: 16, fontFamily: "PlayfairDisplay_700Bold", fontWeight: "900", marginBottom: 8 },
  cardMeta: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginBottom: 10 },
  scanHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  openBadge: { color: "#d9ad63", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  completeBadge: { color: "#4ade80", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  groupLabel: { color: "#9d8f80", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 8, fontFamily: "Inter_700Bold" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  optionChip: { flexGrow: 1, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", paddingHorizontal: 10, paddingVertical: 10, alignItems: "center" },
  optionChipActive: { borderColor: "#d9ad63", backgroundColor: "#d9ad6318" },
  optionText: { color: "#8f887d", fontSize: 12, fontFamily: "Inter_700Bold" },
  optionTextActive: { color: "#d9ad63" },
  stack: { gap: 8, marginBottom: 8 },
  choiceCard: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 10 },
  choiceCardActive: { borderColor: "#d9ad63", backgroundColor: "#d9ad6318" },
  choiceTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  choiceTitle: { color: "#d8c4a5", fontSize: 13, fontFamily: "Inter_700Bold" },
  choiceTitleActive: { color: "#d9ad63" },
  choiceDesc: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 4 },
  classTag: { color: "#49a3a0", fontSize: 10, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  forecastBox: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#080706", padding: 10, marginTop: 8 },
  forecastTitle: { color: "#d8c4a5", fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 8 },
  forecastGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  forecastStat: { width: "31.8%", borderWidth: 1, borderColor: "#2a2520", paddingVertical: 8, alignItems: "center" },
  forecastValue: { color: "#d9ad63", fontSize: 16, fontFamily: "Inter_700Bold" },
  forecastLabel: { color: "#8f887d", fontSize: 9, letterSpacing: 1 },
  pathBox: { borderWidth: 1, borderColor: "#235e66", backgroundColor: "#071615", padding: 12, marginTop: 10 },
  pathHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  pathKicker: { color: "#7ddce4", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  pathTitle: { color: "#eee5d7", fontSize: 17, marginTop: 2, fontFamily: "PlayfairDisplay_700Bold" },
  pathBadge: { color: "#d9ad63", borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#14100b", paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_700Bold", maxWidth: 140, textAlign: "center" },
  pathDesc: { color: "#b6aa9c", fontSize: 11, lineHeight: 16, marginTop: 8, fontFamily: "Inter_400Regular" },
  pathRows: { gap: 8, marginTop: 12 },
  pathRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pathRank: { width: 20, color: "#6f6559", fontSize: 10, fontFamily: "Inter_700Bold" },
  pathNameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  pathName: { color: "#d8c4a5", fontSize: 12, fontFamily: "Inter_700Bold" },
  pathScore: { color: "#8f887d", fontSize: 9, fontFamily: "Inter_400Regular" },
  pathTrack: { height: 6, backgroundColor: "#020706", borderRadius: 4, overflow: "hidden", marginTop: 4 },
  pathFill: { height: 6, backgroundColor: "#7ddce4", borderRadius: 4 },
  nextPathBox: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 10, marginTop: 12 },
  nextPathLabel: { color: "#8f887d", fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  nextPathTitle: { color: "#d9ad63", fontSize: 13, marginTop: 3, fontFamily: "PlayfairDisplay_700Bold" },
  nextPathText: { color: "#b6aa9c", fontSize: 10, lineHeight: 15, marginTop: 3, fontFamily: "Inter_400Regular" },
  fieldRow: { flexDirection: "row", gap: 10 },
  field: { flex: 1, marginBottom: 10 },
  fieldLabel: { color: "#8f887d", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09" },
  input: { flex: 1, color: "#eee5d7", padding: 10, fontSize: 14 },
  suffix: { color: "#8f887d", fontSize: 11, paddingRight: 10 },
  equipmentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  equipmentChip: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", paddingHorizontal: 10, paddingVertical: 8 },
  equipmentChipActive: { borderColor: "#d9ad63", backgroundColor: "#d9ad6318" },
  equipmentText: { color: "#8f887d", fontSize: 11, fontFamily: "Inter_700Bold" },
  equipmentTextActive: { color: "#d9ad63" },
  notes: { minHeight: 92, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", color: "#eee5d7", padding: 10, fontSize: 13, lineHeight: 18 },
  saveBtn: { backgroundColor: "#d9ad63", padding: 14, alignItems: "center", marginTop: 4 },
  saveText: { color: "#0a0908", fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  scanBtn: { backgroundColor: "#49a3a0", padding: 14, alignItems: "center", marginTop: 10, borderWidth: 1, borderColor: "#8be2df" },
  scanText: { color: "#061010", fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
});
