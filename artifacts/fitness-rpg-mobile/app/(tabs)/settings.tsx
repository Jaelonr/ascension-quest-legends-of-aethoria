import AsyncStorage from "@react-native-async-storage/async-storage";
import { useClerk } from "@clerk/expo";
import {
  customFetch,
  useGetDashboardSummary,
  useGetBiometrics,
  useUpdateBiometrics,
  getGetBiometricsQueryKey,
  useGetEquipment,
  useUpdateEquipment,
  type Equipment,
  type PlayerBiometrics,
  type EquipmentUpdate,
} from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

// ── Constants ─────────────────────────────────────────────────────────────────

const INTENSITY_OPTIONS = [
  {
    id: "minimal",
    label: "Technical",
    desc: "Real fitness data. Sets, reps, numbers — no story text.",
  },
  {
    id: "balanced",
    label: "Balanced",
    desc: "Mix of narrative and actual training metrics.",
  },
  {
    id: "dramatic",
    label: "Immersive",
    desc: "Full fantasy language. Your workout becomes an epic.",
  },
] as const;

type IntensityId = (typeof INTENSITY_OPTIONS)[number]["id"];
const INTENSITY_KEY = "narrative_intensity";
const UNIT_KEY = "unit_system";
type UnitSystem = "metric" | "imperial";

// ── Full equipment catalogue ───────────────────────────────────────────────────

interface EquipmentDef { id: string; name: string; category: string; }

const EQUIPMENT_CATALOGUE: { category: string; label: string; items: EquipmentDef[] }[] = [
  {
    category: "rack",
    label: "Racks & Stands",
    items: [
      { id: "power_rack",    name: "Power Rack",          category: "rack" },
      { id: "squat_rack",    name: "Squat Stand",          category: "rack" },
      { id: "smith_machine", name: "Smith Machine",        category: "rack" },
    ],
  },
  {
    category: "barbell",
    label: "Barbells & Plates",
    items: [
      { id: "barbell",    name: "Barbell",     category: "barbell" },
      { id: "plates",     name: "Plates",      category: "barbell" },
      { id: "ez_bar",     name: "EZ Bar",      category: "barbell" },
      { id: "trap_bar",   name: "Trap Bar",    category: "barbell" },
    ],
  },
  {
    category: "free_weights",
    label: "Free Weights",
    items: [
      { id: "dumbbells",            name: "Dumbbells",             category: "free_weights" },
      { id: "adjustable_dumbbells", name: "Adjustable Dumbbells",  category: "free_weights" },
      { id: "kettlebells",          name: "Kettlebells",           category: "free_weights" },
      { id: "medicine_ball",        name: "Medicine Ball",         category: "free_weights" },
      { id: "slam_ball",            name: "Slam Ball",             category: "free_weights" },
    ],
  },
  {
    category: "bench",
    label: "Benches",
    items: [
      { id: "flat_bench",     name: "Flat Bench",      category: "bench" },
      { id: "adjustable_bench", name: "Adjustable Bench", category: "bench" },
      { id: "incline_bench",  name: "Incline Bench",   category: "bench" },
    ],
  },
  {
    category: "cable",
    label: "Cable & Machines",
    items: [
      { id: "cable_machine",      name: "Cable Machine",       category: "cable" },
      { id: "functional_trainer", name: "Functional Trainer",  category: "cable" },
      { id: "lat_pulldown",       name: "Lat Pulldown",        category: "cable" },
      { id: "leg_press",          name: "Leg Press",           category: "cable" },
      { id: "hack_squat",         name: "Hack Squat Machine",  category: "cable" },
      { id: "belt_squat",         name: "Belt Squat",          category: "cable" },
    ],
  },
  {
    category: "bodyweight",
    label: "Bodyweight / Functional",
    items: [
      { id: "pull_up_bar",   name: "Pull-Up Bar",          category: "bodyweight" },
      { id: "dip_station",   name: "Dip Station",          category: "bodyweight" },
      { id: "resistance_bands", name: "Resistance Bands",  category: "bodyweight" },
      { id: "trx",           name: "TRX / Suspension Trainer", category: "bodyweight" },
      { id: "battle_ropes",  name: "Battle Ropes",         category: "bodyweight" },
      { id: "sled",          name: "Sled",                 category: "bodyweight" },
      { id: "foam_roller",   name: "Foam Roller",          category: "bodyweight" },
    ],
  },
  {
    category: "cardio",
    label: "Cardio",
    items: [
      { id: "treadmill",      name: "Treadmill",       category: "cardio" },
      { id: "bike",           name: "Bike",            category: "cardio" },
      { id: "rowing_machine", name: "Rowing Machine",  category: "cardio" },
      { id: "elliptical",     name: "Elliptical",      category: "cardio" },
      { id: "stair_climber",  name: "Stair Climber",   category: "cardio" },
      { id: "jump_rope",      name: "Jump Rope",       category: "cardio" },
    ],
  },
  {
    category: "striking",
    label: "Combat & Striking",
    items: [
      { id: "heavy_bag",      name: "Heavy Bag",          category: "striking" },
      { id: "fightcamp",      name: "FightCamp",          category: "striking" },
      { id: "speed_bag",      name: "Speed Bag",          category: "striking" },
      { id: "double_end_bag", name: "Double-End Bag",     category: "striking" },
    ],
  },
  {
    category: "mat",
    label: "Mat & Grappling",
    items: [
      { id: "wrestling_mat",  name: "Wrestling Mat",   category: "mat" },
      { id: "yoga_mat",       name: "Yoga Mat",        category: "mat" },
    ],
  },
  {
    category: "other",
    label: "Other",
    items: [
      { id: "future_equipment", name: "Future Equipment (placeholder)", category: "other" },
    ],
  },
];

// Wearable providers ─────────────────────────────────────────────────────────

const WEARABLE_PROVIDERS = [
  { id: "apple_health",    name: "Apple Health",    platform: "iOS",     icon: "🍎", comingSoon: true },
  { id: "health_connect",  name: "Health Connect",  platform: "Android", icon: "🤖", comingSoon: true },
  { id: "samsung_health",  name: "Samsung Health",  platform: "Android", icon: "📱", comingSoon: true },
  { id: "fitbit",          name: "Fitbit",          platform: "All",     icon: "⌚", comingSoon: true },
  { id: "garmin",          name: "Garmin Connect",  platform: "All",     icon: "🏃", comingSoon: true },
  { id: "smart_scale",     name: "Smart Scale",     platform: "All",     icon: "⚖️", comingSoon: true },
];

// ── Unit conversion helpers ───────────────────────────────────────────────────

const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number) => Math.round((lbs / 2.20462) * 100) / 100;
const cmToIn  = (cm: number)  => Math.round((cm / 2.54) * 10) / 10;
const inToCm  = (i: number)   => Math.round(i * 2.54 * 10) / 10;
function inToFtIn(inches: number) {
  const ft  = Math.floor(inches / 12);
  const rem = Math.round(inches % 12);
  return `${ft}'${rem}"`;
}

function numOrNull(s: string): number | null {
  const n = parseFloat(s);
  return isNaN(n) || s.trim() === "" ? null : n;
}

interface BioForm {
  height: string;
  weight: string;
  bodyFatPct: string;
  squat1rm: string;
  bench1rm: string;
  deadlift1rm: string;
  ohp1rm: string;
  row1rm: string;
  notes: string;
}

const emptyForm: BioForm = {
  height: "", weight: "", bodyFatPct: "",
  squat1rm: "", bench1rm: "", deadlift1rm: "", ohp1rm: "", row1rm: "", notes: "",
};

function dataToForm(data: PlayerBiometrics | undefined, imp: boolean): BioForm {
  if (!data) return emptyForm;
  const h1rm = (v?: number | null) =>
    v == null ? "" : imp ? String(kgToLbs(v)) : String(v);
  return {
    height: data.heightCm != null
      ? imp ? String(cmToIn(data.heightCm)) : String(data.heightCm)
      : "",
    weight: data.weightKg != null
      ? imp ? String(kgToLbs(data.weightKg)) : String(data.weightKg)
      : "",
    bodyFatPct: data.bodyFatPct != null ? String(data.bodyFatPct) : "",
    squat1rm:    h1rm(data.squat1rm),
    bench1rm:    h1rm(data.bench1rm),
    deadlift1rm: h1rm(data.deadlift1rm),
    ohp1rm:      h1rm(data.ohp1rm),
    row1rm:      h1rm(data.row1rm),
    notes: data.notes ?? "",
  };
}

// ── Hunter Bio modal ───────────────────────────────────────────────────────────

function BioModal({
  visible,
  onClose,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { data: bioData, isLoading: bioLoading } = useGetBiometrics();
  const { data: dbEquipment, isLoading: eqLoading, refetch: refetchEq } = useGetEquipment();
  const updateBio = useUpdateBiometrics();
  const updateEq  = useUpdateEquipment();
  const qc        = useQueryClient();

  const [units, setUnits] = useState<UnitSystem>("metric");
  const [form, setForm]   = useState<BioForm>(emptyForm);
  const [dirty, setDirty] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const imp  = units === "imperial";
  const wLbl = imp ? "lbs" : "kg";
  const hLbl = imp ? "in"  : "cm";

  useEffect(() => {
    AsyncStorage.getItem(UNIT_KEY).then((v) => {
      if (v === "imperial" || v === "metric") setUnits(v);
    });
  }, []);

  useEffect(() => {
    if (bioData) {
      setForm(dataToForm(bioData, imp));
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bioData]);

  useEffect(() => {
    if (bioData) {
      setForm(dataToForm(bioData, imp));
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imp]);

  const setField = (k: keyof BioForm, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const toggleUnits = async (u: UnitSystem) => {
    setUnits(u);
    await AsyncStorage.setItem(UNIT_KEY, u);
  };

  // Match DB equipment to predefined catalogue by name (case-insensitive)
  const dbByName = new Map<string, Equipment>();
  for (const e of (dbEquipment ?? [])) {
    dbByName.set(e.name.toLowerCase(), e);
  }

  const handleEquipmentTap = async (def: EquipmentDef) => {
    const key = def.name.toLowerCase();
    const existing = dbByName.get(key);
    setTogglingId(def.id);

    try {
      if (existing) {
        // Toggle availability
        const payload: EquipmentUpdate = { available: !existing.available };
        await updateEq.mutateAsync({ id: existing.id, data: payload });
      } else {
        // Create new equipment entry
        await customFetch("/api/equipment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: def.name, category: def.category, available: true, owned: true }),
        });
      }
      qc.invalidateQueries({ queryKey: ["/api/equipment"] });
      await refetchEq();
    } catch {
      Alert.alert("Error", `Could not update ${def.name}.`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleSave = () => {
    const toKg = (s: string) => {
      const n = numOrNull(s);
      if (n == null) return null;
      return imp ? lbsToKg(n) : n;
    };
    const toCm = (s: string) => {
      const n = numOrNull(s);
      if (n == null) return null;
      return imp ? inToCm(n) : n;
    };
    const r1rm = (s: string) => {
      const v = toKg(s);
      return v != null ? Math.round(v) : null;
    };

    updateBio.mutate(
      {
        data: {
          heightCm:    toCm(form.height),
          weightKg:    toKg(form.weight),
          bodyFatPct:  numOrNull(form.bodyFatPct),
          squat1rm:    r1rm(form.squat1rm),
          bench1rm:    r1rm(form.bench1rm),
          deadlift1rm: r1rm(form.deadlift1rm),
          ohp1rm:      r1rm(form.ohp1rm),
          row1rm:      r1rm(form.row1rm),
          notes:       form.notes || null,
        },
      },
      {
        onSuccess: () => {
          setDirty(false);
          qc.invalidateQueries({ queryKey: getGetBiometricsQueryKey() });
        },
        onError: () => {
          Alert.alert("Error", "Failed to save biometrics.");
        },
      }
    );
  };

  const heightNum  = parseFloat(form.height);
  const heightHint = imp && !isNaN(heightNum) && heightNum > 0 ? inToFtIn(heightNum) : null;

  const lifts: { key: keyof BioForm; label: string; ph: string }[] = imp
    ? [
        { key: "squat1rm",    label: "Squat",   ph: "e.g. 315" },
        { key: "bench1rm",    label: "Bench",   ph: "e.g. 225" },
        { key: "deadlift1rm", label: "Deadlift",ph: "e.g. 405" },
        { key: "ohp1rm",      label: "OHP",     ph: "e.g. 155" },
        { key: "row1rm",      label: "Row",     ph: "e.g. 245" },
      ]
    : [
        { key: "squat1rm",    label: "Squat",   ph: "e.g. 140" },
        { key: "bench1rm",    label: "Bench",   ph: "e.g. 100" },
        { key: "deadlift1rm", label: "Deadlift",ph: "e.g. 180" },
        { key: "ohp1rm",      label: "OHP",     ph: "e.g. 70"  },
        { key: "row1rm",      label: "Row",     ph: "e.g. 110" },
      ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Modal header */}
        <View style={[m.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[m.headerTitle, { color: colors.foreground }]}>Hunter Bio</Text>
            <Text style={[m.headerSub, { color: colors.mutedForeground }]}>
              Biometrics, equipment & gear access
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[m.closeBtn, { borderColor: colors.border }]}
            activeOpacity={0.75}
          >
            <Text style={[m.closeBtnText, { color: colors.mutedForeground }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={m.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {(bioLoading || eqLoading) ? (
            <View style={m.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <>
              {/* Unit system toggle */}
              <View style={[m.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[m.sectionLabel, { color: colors.mutedForeground }]}>UNIT SYSTEM</Text>
                <View style={m.unitRow}>
                  {(["metric", "imperial"] as UnitSystem[]).map((u) => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => toggleUnits(u)}
                      style={[
                        m.unitBtn,
                        {
                          borderColor: units === u ? colors.primary : colors.border,
                          backgroundColor: units === u ? colors.primary + "20" : "transparent",
                        },
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text style={[m.unitBtnText, { color: units === u ? colors.primary : colors.mutedForeground }]}>
                        {u === "metric" ? "Metric (kg / cm)" : "Imperial (lbs / in)"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Body metrics */}
              <View style={[m.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[m.sectionLabel, { color: colors.mutedForeground }]}>BODY METRICS</Text>
                <View style={m.metricsGrid}>
                  <View style={m.metricField}>
                    <Text style={[m.fieldLabel, { color: colors.mutedForeground }]}>Height ({hLbl})</Text>
                    <TextInput
                      style={[m.input, { color: colors.foreground, borderColor: form.height ? colors.primary + "60" : colors.border, backgroundColor: colors.background }]}
                      value={form.height}
                      onChangeText={(v) => setField("height", v)}
                      keyboardType="decimal-pad"
                      placeholder={imp ? "e.g. 70" : "e.g. 178"}
                      placeholderTextColor={colors.mutedForeground + "80"}
                    />
                    {heightHint && <Text style={[m.hint, { color: colors.primary }]}>{heightHint}</Text>}
                  </View>
                  <View style={m.metricField}>
                    <Text style={[m.fieldLabel, { color: colors.mutedForeground }]}>Weight ({wLbl})</Text>
                    <TextInput
                      style={[m.input, { color: colors.foreground, borderColor: form.weight ? colors.primary + "60" : colors.border, backgroundColor: colors.background }]}
                      value={form.weight}
                      onChangeText={(v) => setField("weight", v)}
                      keyboardType="decimal-pad"
                      placeholder={imp ? "e.g. 185" : "e.g. 82"}
                      placeholderTextColor={colors.mutedForeground + "80"}
                    />
                  </View>
                  <View style={m.metricField}>
                    <Text style={[m.fieldLabel, { color: colors.mutedForeground }]}>Body Fat %</Text>
                    <TextInput
                      style={[m.input, { color: colors.foreground, borderColor: form.bodyFatPct ? colors.primary + "60" : colors.border, backgroundColor: colors.background }]}
                      value={form.bodyFatPct}
                      onChangeText={(v) => setField("bodyFatPct", v)}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 15"
                      placeholderTextColor={colors.mutedForeground + "80"}
                    />
                  </View>
                </View>
              </View>

              {/* 1RM maxes */}
              <View style={[m.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[m.sectionLabel, { color: colors.mutedForeground }]}>
                  STRENGTH MAXES (1RM · {wLbl})
                </Text>
                <Text style={[m.hintText, { color: colors.mutedForeground }]}>
                  Used to calculate recommended working weights.
                </Text>
                <View style={m.liftGrid}>
                  {lifts.map(({ key, label, ph }) => (
                    <View key={key} style={m.liftField}>
                      <Text style={[m.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                      <View>
                        <TextInput
                          style={[m.input, { color: colors.foreground, borderColor: form[key] ? colors.primary + "60" : colors.border, backgroundColor: colors.background, paddingRight: 32 }]}
                          value={form[key] as string}
                          onChangeText={(v) => setField(key, v)}
                          keyboardType="decimal-pad"
                          placeholder={ph}
                          placeholderTextColor={colors.mutedForeground + "80"}
                        />
                        <Text style={[m.unitOverlay, { color: colors.mutedForeground }]}>{wLbl}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Save biometrics */}
              <TouchableOpacity
                style={[m.saveBtn, { backgroundColor: dirty ? colors.primary + "20" : colors.card, borderColor: dirty ? colors.primary : colors.border }]}
                onPress={handleSave}
                disabled={updateBio.isPending}
                activeOpacity={0.75}
              >
                {updateBio.isPending
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={[m.saveBtnText, { color: dirty ? colors.primary : colors.mutedForeground }]}>
                      {dirty ? "Save Biometrics" : "Biometrics Saved ✓"}
                    </Text>
                }
              </TouchableOpacity>

              {/* Equipment — full predefined catalogue */}
              <View style={[m.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[m.sectionLabel, { color: colors.mutedForeground }]}>GYM EQUIPMENT</Text>
                <Text style={[m.hintText, { color: colors.mutedForeground }]}>
                  Tap to add equipment. Tap again to mark as unavailable. This determines exercise and workout plan selections.
                </Text>

                {EQUIPMENT_CATALOGUE.map((group) => (
                  <View key={group.category} style={{ marginTop: 10 }}>
                    <Text style={[m.eqGroupLabel, { color: colors.mutedForeground }]}>
                      {group.label.toUpperCase()}
                    </Text>
                    <View style={m.chipWrap}>
                      {group.items.map((def) => {
                        const dbItem = dbByName.get(def.name.toLowerCase());
                        const isAdded     = !!dbItem;
                        const isAvailable = dbItem?.available ?? false;
                        const isToggling  = togglingId === def.id;

                        let chipBorder  = colors.border;
                        let chipBg      = "transparent";
                        let chipOpacity = 0.65;
                        let textColor   = colors.mutedForeground;
                        let checkSymbol = "+";

                        if (isAdded && isAvailable) {
                          chipBorder  = "#22c55e50";
                          chipBg      = "#22c55e15";
                          chipOpacity = 1;
                          textColor   = "#22c55e";
                          checkSymbol = "✓";
                        } else if (isAdded && !isAvailable) {
                          chipBorder  = colors.border;
                          chipBg      = "transparent";
                          chipOpacity = 0.5;
                          textColor   = colors.mutedForeground;
                          checkSymbol = "✕";
                        }

                        return (
                          <TouchableOpacity
                            key={def.id}
                            onPress={() => handleEquipmentTap(def)}
                            disabled={isToggling}
                            style={[m.chip, { borderColor: chipBorder, backgroundColor: chipBg, opacity: chipOpacity }]}
                            activeOpacity={0.75}
                          >
                            {isToggling
                              ? <ActivityIndicator size={10} color={textColor} />
                              : <Text style={[m.chipCheck, { color: textColor }]}>{checkSymbol}</Text>
                            }
                            <Text style={[m.chipText, { color: textColor }]}>{def.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>

              {/* Notes */}
              <View style={[m.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[m.sectionLabel, { color: colors.mutedForeground }]}>INJURY / LIMITATION NOTES</Text>
                <TextInput
                  style={[m.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={form.notes}
                  onChangeText={(v) => setField("notes", v)}
                  placeholder="e.g. Bad lower back, avoid axial loading..."
                  placeholderTextColor={colors.mutedForeground + "60"}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Second save */}
              <TouchableOpacity
                style={[m.saveBtn, { backgroundColor: dirty ? colors.primary + "20" : colors.card, borderColor: dirty ? colors.primary : colors.border }]}
                onPress={handleSave}
                disabled={updateBio.isPending}
                activeOpacity={0.75}
              >
                {updateBio.isPending
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={[m.saveBtnText, { color: dirty ? colors.primary : colors.mutedForeground }]}>
                      {dirty ? "Save Biometrics" : "Biometrics Saved ✓"}
                    </Text>
                }
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main settings screen ───────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { signOut } = useClerk();

  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: bioData }            = useGetBiometrics();

  const [intensity, setIntensity] = useState<IntensityId>("balanced");
  const [saving, setSaving]       = useState(false);
  const [bioOpen, setBioOpen]     = useState(false);

  const player = summary?.player;

  useEffect(() => {
    AsyncStorage.getItem(INTENSITY_KEY).then((val) => {
      if (val === "minimal" || val === "balanced" || val === "dramatic") {
        setIntensity(val);
      }
    });
  }, []);

  const handleIntensityChange = async (id: IntensityId) => {
    setSaving(true);
    setIntensity(id);
    await AsyncStorage.setItem(INTENSITY_KEY, id);
    setSaving(false);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const bioSummary = (() => {
    if (!bioData) return "Tap to add your biometrics";
    const parts: string[] = [];
    if (bioData.weightKg) parts.push(`${bioData.weightKg} kg`);
    if (bioData.heightCm) parts.push(`${bioData.heightCm} cm`);
    if (bioData.bodyFatPct) parts.push(`${bioData.bodyFatPct}% BF`);
    return parts.length > 0 ? parts.join("  ·  ") : "Tap to edit your biometrics";
  })();

  return (
    <View style={[t.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[t.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[t.screenLabel, { color: colors.mutedForeground }]}>SETTINGS</Text>

        {/* Player card */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 16 }} />
        ) : player ? (
          <View style={[t.playerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[t.rankBadge, { borderColor: colors.primary }]}>
              <Text style={[t.rankText, { color: colors.primary }]}>{player.rank ?? "E"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.playerName, { color: colors.foreground }]}>{player.name ?? "Hunter"}</Text>
              <Text style={[t.playerMeta, { color: colors.mutedForeground }]}>
                Level {player.level ?? 1}  ·  {player.activeTitle ?? "Initiate"}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Narrative intensity */}
        <View style={[t.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[t.sectionTitle, { color: colors.mutedForeground }]}>NARRATIVE MODE</Text>
          <Text style={[t.sectionDesc, { color: colors.mutedForeground }]}>
            Controls how combat replays and battle narratives are written.
          </Text>
          {INTENSITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => handleIntensityChange(opt.id)}
              style={[
                t.intensityBtn,
                {
                  borderColor: intensity === opt.id ? colors.primary : colors.border,
                  backgroundColor: intensity === opt.id ? colors.primary + "15" : "transparent",
                },
              ]}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={[t.intensityLabel, { color: intensity === opt.id ? colors.primary : colors.foreground }]}>
                  {opt.label}
                </Text>
                <Text style={[t.intensityDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
              </View>
              {intensity === opt.id && (
                <View style={[t.checkCircle, { borderColor: colors.primary, backgroundColor: colors.primary + "20" }]}>
                  <Text style={[t.checkMark, { color: colors.primary }]}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Hunter Bio */}
        <TouchableOpacity
          style={[t.section, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setBioOpen(true)}
          activeOpacity={0.75}
        >
          <Text style={[t.sectionTitle, { color: colors.mutedForeground }]}>HUNTER BIO</Text>
          <View style={t.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[t.sectionMainLabel, { color: colors.foreground }]}>Biometrics & Equipment</Text>
              <Text style={[t.sectionDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                {bioSummary}
              </Text>
            </View>
            <Text style={[t.chevron, { color: colors.mutedForeground }]}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Connected devices / Wearables */}
        <View style={[t.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[t.sectionTitle, { color: colors.mutedForeground }]}>CONNECTED DEVICES</Text>
          <Text style={[t.sectionDesc, { color: colors.mutedForeground }]}>
            Future wearable integrations. Synced data will automatically update your vitals and stats.
          </Text>
          {WEARABLE_PROVIDERS.map((provider) => (
            <View
              key={provider.id}
              style={[t.wearableRow, { borderColor: colors.border }]}
            >
              <Text style={t.wearableIcon}>{provider.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[t.wearableName, { color: colors.foreground }]}>{provider.name}</Text>
                <Text style={[t.wearablePlatform, { color: colors.mutedForeground }]}>{provider.platform}</Text>
              </View>
              <View style={[t.comingSoonBadge, { borderColor: colors.border }]}>
                <Text style={[t.comingSoonText, { color: colors.mutedForeground }]}>COMING SOON</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={[t.signOutBtn, { borderColor: "#ef444440", backgroundColor: "#ef444410" }]}
          onPress={handleSignOut}
          activeOpacity={0.75}
        >
          <Text style={[t.signOutText, { color: "#ef4444" }]}>Sign Out</Text>
        </TouchableOpacity>

        {/* App version */}
        <Text style={[t.version, { color: colors.mutedForeground }]}>Personal Fitness RPG · v1.0</Text>
      </ScrollView>

      <BioModal visible={bioOpen} onClose={() => setBioOpen(false)} colors={colors} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const t = StyleSheet.create({
  root:            { flex: 1 },
  content:         { paddingHorizontal: 16, gap: 12 },
  screenLabel:     { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2, marginBottom: 4 },
  playerCard:      { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12,
                     borderWidth: 1, padding: 14 },
  rankBadge:       { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: "center",
                     justifyContent: "center" },
  rankText:        { fontSize: 16, fontFamily: "Inter_700Bold" },
  playerName:      { fontSize: 16, fontFamily: "Inter_700Bold" },
  playerMeta:      { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  section:         { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  sectionTitle:    { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  sectionMainLabel:{ fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sectionDesc:     { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  rowBetween:      { flexDirection: "row", alignItems: "center" },
  chevron:         { fontSize: 22, fontFamily: "Inter_400Regular" },
  intensityBtn:    { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1,
                     padding: 12, gap: 10 },
  intensityLabel:  { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  intensityDesc:   { fontSize: 11, fontFamily: "Inter_400Regular" },
  checkCircle:     { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center",
                     justifyContent: "center" },
  checkMark:       { fontSize: 11, fontFamily: "Inter_700Bold" },
  wearableRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10,
                     borderBottomWidth: StyleSheet.hairlineWidth },
  wearableIcon:    { fontSize: 22, width: 32, textAlign: "center" },
  wearableName:    { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  wearablePlatform:{ fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  comingSoonBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  comingSoonText:  { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  signOutBtn:      { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center" },
  signOutText:     { fontSize: 14, fontFamily: "Inter_700Bold" },
  version:         { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
});

const m = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                 paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center",
                 justifyContent: "center" },
  closeBtnText:{ fontSize: 14, fontFamily: "Inter_700Bold" },
  scroll:      { padding: 16, gap: 12, paddingBottom: 40 },
  loading:     { padding: 40, alignItems: "center" },
  card:        { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  sectionLabel:{ fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  hintText:    { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  hint:        { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  unitRow:     { flexDirection: "row", gap: 8 },
  unitBtn:     { flex: 1, borderRadius: 8, borderWidth: 1, padding: 10, alignItems: "center" },
  unitBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricField: { width: "47%" },
  fieldLabel:  { fontSize: 10, fontFamily: "Inter_500Medium", marginBottom: 4 },
  input:       { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9,
                 fontSize: 14, fontFamily: "Inter_400Regular" },
  liftGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  liftField:   { width: "47%" },
  unitOverlay: { position: "absolute", right: 10, top: 11, fontSize: 11,
                 fontFamily: "Inter_500Medium" },
  saveBtn:     { borderRadius: 10, borderWidth: 1, padding: 13, alignItems: "center" },
  saveBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  eqGroupLabel:{ fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, marginBottom: 6 },
  chipWrap:    { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip:        { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1,
                 borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  chipCheck:   { fontSize: 10, fontFamily: "Inter_700Bold" },
  chipText:    { fontSize: 12, fontFamily: "Inter_500Medium" },
  notesInput:  { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                 fontSize: 13, fontFamily: "Inter_400Regular", minHeight: 80 },
});
