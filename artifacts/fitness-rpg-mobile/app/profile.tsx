import { useGetBiometrics, useGetPlayer, useSetupPlayer, useUpdateBiometrics } from "@workspace/api-client-react";
import { loadMobileSettings, type Units } from "@/utils/mobile-settings";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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

function toForm(data: any, units: Units): FormState {
  const metric = units === "metric";
  const lift = (value: number | null | undefined) => value == null ? "" : String(metric ? value : kgToLbs(value));
  return {
    name: "",
    ageYears: "",
    sex: "",
    activityLevel: "",
    weightGoal: "maintain",
    goalFocus: "",
    height: data?.heightCm != null ? String(metric ? data.heightCm : cmToIn(data.heightCm)) : "",
    weight: data?.weightKg != null ? String(metric ? data.weightKg : kgToLbs(data.weightKg)) : "",
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
  const router = useRouter();
  const { data: player, isLoading: playerLoading } = useGetPlayer();
  const { data, isLoading } = useGetBiometrics();
  const update = useUpdateBiometrics();
  const setupPlayer = useSetupPlayer();
  const [form, setForm] = useState<FormState>(empty);
  const [dirty, setDirty] = useState(false);
  const [unitSystem, setUnitSystem] = useState<Units>("imperial");

  useEffect(() => {
    let mounted = true;
    loadMobileSettings()
      .then((settings) => {
        if (mounted) setUnitSystem(settings.units);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (data) {
      setForm((prev) => ({ ...prev, ...toForm(data, unitSystem), name: prev.name || player?.name || "" }));
      setDirty(false);
    }
  }, [data, player?.name, unitSystem]);

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
  const startingStats = (() => {
    const base = { strength: 1, agility: 1, stamina: 1, vitality: 1, discipline: 1, sense: 1 };
    if (chosenGoal) {
      Object.entries(chosenGoal.bonuses).forEach(([key, value]) => {
        base[key as keyof typeof base] += value;
      });
    }
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
    !!form.goalFocus;

  const save = () => {
    const toKg = (value: string) => {
      const parsed = numOrNull(value);
      return parsed == null ? null : unitSystem === "metric" ? parsed : lbsToKg(parsed);
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
      Alert.alert("Scan incomplete", "Enter name, age, sex, activity level, and your first path before completing the scan.");
      return;
    }
    const toKg = (value: string) => {
      const parsed = numOrNull(value);
      return parsed == null ? null : unitSystem === "metric" ? parsed : lbsToKg(parsed);
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
          setDirty(false);
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
  const weightUnit = unitSystem === "metric" ? "kg" : "lbs";
  const lifts: Array<{ field: keyof FormState; label: string; placeholder: string }> = [
    { field: "squat1rm", label: "Squat", placeholder: "315" },
    { field: "bench1rm", label: "Bench Press", placeholder: "225" },
    { field: "deadlift1rm", label: "Deadlift", placeholder: "405" },
    { field: "ohp1rm", label: "Overhead Press", placeholder: "155" },
    { field: "row1rm", label: "Barbell Row", placeholder: "245" },
  ];

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }}>
      <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>Back to Character</Text></TouchableOpacity>
      <Text style={s.kicker}>SYSTEM RECORD</Text>
      <Text style={s.title}>System Record</Text>
      <Text style={s.subtitle}>Biometrics, strength marks, and equipment access.</Text>

      <View style={s.unitCard}>
        <Text style={s.unitLabel}>Unit System</Text>
        <Text style={s.unitValue}>{unitSystem === "metric" ? "Metric: kg / cm" : "Imperial default: lbs / inches"}</Text>
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
              <Text style={player?.setupCompleted ? s.completeBadge : s.openBadge}>{player?.setupCompleted ? "Complete" : "Open"}</Text>
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
              <Field label="Weight" value={form.weight} onChangeText={(v) => setField("weight", v)} placeholder={unitSystem === "metric" ? "86" : "190"} suffix={weightUnit} />
            </View>
            <Field label="Body Fat" value={form.bodyFatPct} onChangeText={(v) => setField("bodyFatPct", v)} placeholder="18" suffix="%" />
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Strength Marks</Text>
            <Text style={s.cardMeta}>These help the planner recommend reasonable loads. Leave unknown lifts blank.</Text>
            {lifts.map((lift) => (
              <Field key={lift.field} label={lift.label} value={String(form[lift.field] ?? "")} onChangeText={(v) => setField(lift.field, v)} placeholder={unitSystem === "metric" ? String(Math.round(Number(lift.placeholder) / 2.20462)) : lift.placeholder} suffix={weightUnit} />
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

          {!player?.setupCompleted && (
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
  back: { color: "#d9ad63", fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 18 },
  kicker: { color: "#9d8f80", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  title: { color: "#eee5d7", fontSize: 26, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2 },
  subtitle: { color: "#9f9586", fontSize: 12, marginTop: 4, marginBottom: 16, fontFamily: "Inter_400Regular" },
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
