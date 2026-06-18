import AsyncStorage from "@react-native-async-storage/async-storage";
import { useClerk } from "@clerk/expo";
import {
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
    id: "technical",
    label: "Technical",
    desc: "Real fitness data. Sets, reps, numbers — no story text.",
  },
  {
    id: "balanced",
    label: "Balanced",
    desc: "Mix of narrative and actual training metrics.",
  },
  {
    id: "immersive",
    label: "Immersive",
    desc: "Full fantasy language. Your workout becomes an epic.",
  },
] as const;

type IntensityId = (typeof INTENSITY_OPTIONS)[number]["id"];
const INTENSITY_KEY = "narrative_intensity";
const UNIT_KEY = "unit_system";
type UnitSystem = "metric" | "imperial";

const CATEGORY_LABELS: Record<string, string> = {
  rack: "Rack", machine: "Machine", barbell: "Barbell",
  free_weights: "Free Weights", striking: "Striking", mat: "Mat / Grappling",
  bench: "Bench", cable: "Cable", cardio: "Cardio", bands: "Bands", other: "Other",
};

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
  const { data: equipment, isLoading: eqLoading } = useGetEquipment();
  const updateBio = useUpdateBiometrics();
  const updateEq  = useUpdateEquipment();
  const qc        = useQueryClient();

  const [units, setUnits] = useState<UnitSystem>("metric");
  const [form, setForm]   = useState<BioForm>(emptyForm);
  const [dirty, setDirty] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

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

  const handleToggleEquipment = (item: Equipment) => {
    setTogglingId(item.id);
    const eqPayload: EquipmentUpdate = { available: !item.available };
    updateEq.mutate(
      { id: item.id, data: eqPayload },
      {
        onSettled: () => {
          setTogglingId(null);
          qc.invalidateQueries({ queryKey: ["/api/equipment"] });
        },
      }
    );
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
        { key: "squat1rm",    label: "Squat",         ph: "e.g. 315" },
        { key: "bench1rm",    label: "Bench",          ph: "e.g. 225" },
        { key: "deadlift1rm", label: "Deadlift",       ph: "e.g. 405" },
        { key: "ohp1rm",      label: "OHP",            ph: "e.g. 155" },
        { key: "row1rm",      label: "Row",            ph: "e.g. 245" },
      ]
    : [
        { key: "squat1rm",    label: "Squat",         ph: "e.g. 140" },
        { key: "bench1rm",    label: "Bench",          ph: "e.g. 100" },
        { key: "deadlift1rm", label: "Deadlift",       ph: "e.g. 180" },
        { key: "ohp1rm",      label: "OHP",            ph: "e.g. 70"  },
        { key: "row1rm",      label: "Row",            ph: "e.g. 110" },
      ];

  const available   = equipment?.filter((e) => e.available)  ?? [];
  const unavailable = equipment?.filter((e) => !e.available) ?? [];

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
              Biometrics & equipment access
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
                  {/* Height */}
                  <View style={m.metricField}>
                    <Text style={[m.fieldLabel, { color: colors.mutedForeground }]}>
                      Height ({hLbl})
                    </Text>
                    <TextInput
                      style={[m.input, { color: colors.foreground, borderColor: form.height ? colors.primary + "60" : colors.border, backgroundColor: colors.background }]}
                      value={form.height}
                      onChangeText={(v) => setField("height", v)}
                      keyboardType="decimal-pad"
                      placeholder={imp ? "e.g. 70" : "e.g. 178"}
                      placeholderTextColor={colors.mutedForeground + "80"}
                    />
                    {heightHint && (
                      <Text style={[m.hint, { color: colors.primary }]}>{heightHint}</Text>
                    )}
                  </View>

                  {/* Weight */}
                  <View style={m.metricField}>
                    <Text style={[m.fieldLabel, { color: colors.mutedForeground }]}>
                      Weight ({wLbl})
                    </Text>
                    <TextInput
                      style={[m.input, { color: colors.foreground, borderColor: form.weight ? colors.primary + "60" : colors.border, backgroundColor: colors.background }]}
                      value={form.weight}
                      onChangeText={(v) => setField("weight", v)}
                      keyboardType="decimal-pad"
                      placeholder={imp ? "e.g. 185" : "e.g. 82"}
                      placeholderTextColor={colors.mutedForeground + "80"}
                    />
                  </View>

                  {/* Body fat */}
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
                  Used to calculate recommended working weights in the planner.
                </Text>
                <View style={m.liftGrid}>
                  {lifts.map(({ key, label, ph }) => (
                    <View key={key} style={m.liftField}>
                      <Text style={[m.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                      <View>
                        <TextInput
                          style={[
                            m.input,
                            {
                              color: colors.foreground,
                              borderColor: form[key] ? colors.primary + "60" : colors.border,
                              backgroundColor: colors.background,
                              paddingRight: 32,
                            },
                          ]}
                          value={form[key] as string}
                          onChangeText={(v) => setField(key, v)}
                          keyboardType="decimal-pad"
                          placeholder={ph}
                          placeholderTextColor={colors.mutedForeground + "80"}
                        />
                        <Text style={[m.unitOverlay, { color: colors.mutedForeground }]}>
                          {wLbl}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Save biometrics */}
              <TouchableOpacity
                style={[
                  m.saveBtn,
                  {
                    backgroundColor: dirty ? colors.primary + "20" : colors.card,
                    borderColor: dirty ? colors.primary : colors.border,
                  },
                ]}
                onPress={handleSave}
                disabled={updateBio.isPending}
                activeOpacity={0.75}
              >
                {updateBio.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[m.saveBtnText, { color: dirty ? colors.primary : colors.mutedForeground }]}>
                    {dirty ? "Save Biometrics" : "Biometrics Saved ✓"}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Equipment */}
              <View style={[m.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[m.sectionLabel, { color: colors.mutedForeground }]}>GYM EQUIPMENT</Text>
                <Text style={[m.hintText, { color: colors.mutedForeground }]}>
                  Toggle the equipment you have access to. This determines exercise selections.
                </Text>

                {available.length > 0 && (
                  <>
                    <Text style={[m.eqGroupLabel, { color: "#22c55e" }]}>
                      AVAILABLE ({available.length})
                    </Text>
                    <View style={m.chipWrap}>
                      {available.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => handleToggleEquipment(item)}
                          disabled={togglingId === item.id}
                          style={[m.chip, { borderColor: "#22c55e50", backgroundColor: "#22c55e15" }]}
                          activeOpacity={0.75}
                        >
                          {togglingId === item.id ? (
                            <ActivityIndicator size={10} color="#22c55e" />
                          ) : (
                            <Text style={[m.chipCheck, { color: "#22c55e" }]}>✓</Text>
                          )}
                          <Text style={[m.chipText, { color: "#22c55e" }]}>{item.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {unavailable.length > 0 && (
                  <>
                    <Text style={[m.eqGroupLabel, { color: colors.mutedForeground }]}>
                      NOT AVAILABLE ({unavailable.length})
                    </Text>
                    <View style={m.chipWrap}>
                      {unavailable.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => handleToggleEquipment(item)}
                          disabled={togglingId === item.id}
                          style={[m.chip, { borderColor: colors.border, backgroundColor: colors.background, opacity: 0.6 }]}
                          activeOpacity={0.75}
                        >
                          {togglingId === item.id ? (
                            <ActivityIndicator size={10} color={colors.mutedForeground} />
                          ) : (
                            <Text style={[m.chipCheck, { color: colors.mutedForeground }]}>+</Text>
                          )}
                          <Text style={[m.chipText, { color: colors.mutedForeground }]}>{item.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {equipment?.length === 0 && (
                  <Text style={[m.hintText, { color: colors.mutedForeground, textAlign: "center", paddingVertical: 12 }]}>
                    No equipment records found. Add equipment on the web app first.
                  </Text>
                )}
              </View>

              {/* Notes */}
              <View style={[m.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[m.sectionLabel, { color: colors.mutedForeground }]}>
                  INJURY / LIMITATION NOTES
                </Text>
                <TextInput
                  style={[
                    m.notesInput,
                    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                  value={form.notes}
                  onChangeText={(v) => setField("notes", v)}
                  placeholder="e.g. Bad lower back, avoid axial loading..."
                  placeholderTextColor={colors.mutedForeground + "60"}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Second save at bottom */}
              <TouchableOpacity
                style={[
                  m.saveBtn,
                  {
                    backgroundColor: dirty ? colors.primary + "20" : colors.card,
                    borderColor: dirty ? colors.primary : colors.border,
                  },
                ]}
                onPress={handleSave}
                disabled={updateBio.isPending}
                activeOpacity={0.75}
              >
                {updateBio.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[m.saveBtnText, { color: dirty ? colors.primary : colors.mutedForeground }]}>
                    {dirty ? "Save Biometrics" : "Biometrics Saved ✓"}
                  </Text>
                )}
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
      if (val === "technical" || val === "balanced" || val === "immersive") {
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

  // Build a quick bio summary string for the card
  const bioSummary = (() => {
    if (!bioData) return "Tap to add your biometrics";
    const parts: string[] = [];
    if (bioData.weightKg) parts.push(`${bioData.weightKg} kg`);
    if (bioData.heightCm) parts.push(`${bioData.heightCm} cm`);
    if (bioData.bodyFatPct) parts.push(`${bioData.bodyFatPct}% BF`);
    return parts.length > 0 ? parts.join(" · ") : "Tap to complete your bio";
  })();

  const has1rm = bioData && (
    bioData.squat1rm || bioData.bench1rm || bioData.deadlift1rm || bioData.ohp1rm
  );

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenLabel, { color: colors.mutedForeground }]}>SETTINGS</Text>

        {/* Player Info */}
        {player && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              HUNTER PROFILE
            </Text>
            <View style={styles.profileRow}>
              <View style={[styles.rankCircle, { borderColor: colors.primary, backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.rankLetter, { color: colors.primary }]}>{player.rank}</Text>
              </View>
              <View>
                <Text style={[styles.profileName, { color: colors.foreground }]}>{player.name}</Text>
                <Text style={[styles.profileLevel, { color: colors.primary }]}>Level {player.level}</Text>
                {player.activeTitle ? (
                  <Text style={[styles.profileTitle, { color: colors.accent }]}>{player.activeTitle}</Text>
                ) : null}
              </View>
            </View>
            <View style={[styles.statRow, { borderColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statItemVal, { color: colors.primary }]}>{(player.xp ?? 0).toLocaleString()}</Text>
                <Text style={[styles.statItemKey, { color: colors.mutedForeground }]}>XP</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statItemVal, { color: colors.accent }]}>{(player.gold ?? 0).toLocaleString()}</Text>
                <Text style={[styles.statItemKey, { color: colors.mutedForeground }]}>Gold</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statItemVal, { color: colors.success }]}>{player.level}</Text>
                <Text style={[styles.statItemKey, { color: colors.mutedForeground }]}>Level</Text>
              </View>
            </View>
          </View>
        )}

        {isLoading && !player && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {/* Hunter Bio card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setBioOpen(true)}
          activeOpacity={0.8}
        >
          <View style={styles.bioCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>HUNTER BIO</Text>
              <Text style={[styles.bioSummaryText, { color: colors.foreground }]}>{bioSummary}</Text>
              {has1rm && (
                <Text style={[styles.bioHint, { color: colors.mutedForeground }]}>
                  1RM: Sq {bioData?.squat1rm ?? "—"} · Bp {bioData?.bench1rm ?? "—"} · DL {bioData?.deadlift1rm ?? "—"}
                </Text>
              )}
            </View>
            <View style={[styles.editChip, { borderColor: colors.primary + "60", backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.editChipText, { color: colors.primary }]}>Edit</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Narrative Intensity */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingHeader}>
            <View>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>Narrative Intensity</Text>
              <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>
                How your workouts are told as battle stories
              </Text>
            </View>
            {saving && <ActivityIndicator color={colors.primary} size="small" />}
          </View>
          <View style={styles.intensityOptions}>
            {INTENSITY_OPTIONS.map((opt) => {
              const active = intensity === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.intensityOption,
                    {
                      borderColor: active ? colors.accent : colors.border,
                      backgroundColor: active ? colors.accent + "15" : colors.secondary,
                    },
                  ]}
                  onPress={() => handleIntensityChange(opt.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.intensityRow}>
                    <Text style={[styles.intensityLabel, { color: active ? colors.accent : colors.foreground }]}>
                      {opt.label}
                    </Text>
                    {active && <View style={[styles.checkDot, { backgroundColor: colors.accent }]} />}
                  </View>
                  <Text style={[styles.intensityDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* App Info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ABOUT</Text>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>Personal Fitness RPG</Text>
            <Text style={[styles.aboutValue, { color: colors.foreground }]}>Isekai Edition</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: colors.foreground }]}>1.0.0</Text>
          </View>
          <Text style={[styles.tagline, { color: colors.primary }]}>
            "Your real-world training determines your power."
          </Text>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: "#ef444444", backgroundColor: "#ef444410" }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <BioModal visible={bioOpen} onClose={() => setBioOpen(false)} colors={colors} />
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 12 },
  screenLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2, marginBottom: 4 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  sectionLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },

  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  rankCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  rankLetter: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 2 },
  profileLevel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  profileTitle: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  statRow: { flexDirection: "row", borderRadius: 8, borderWidth: 1, overflow: "hidden" },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 2 },
  statDivider: { width: 1 },
  statItemVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statItemKey: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  loadingRow: { alignItems: "center", paddingVertical: 20 },

  bioCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  bioSummaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  bioHint: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3 },
  editChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  editChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  settingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  settingTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  settingSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  intensityOptions: { gap: 8 },
  intensityOption: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 4 },
  intensityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  intensityLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  checkDot: { width: 8, height: 8, borderRadius: 4 },
  intensityDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },

  aboutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  aboutLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aboutValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tagline: { fontSize: 11, fontFamily: "Inter_500Medium", fontStyle: "italic", textAlign: "center", paddingTop: 4 },

  signOutBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  signOutText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#ef4444" },
});

const m = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontFamily: "SpecialElite_400Regular", letterSpacing: 0.4 },
  headerSub:   { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  closeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  scroll: { padding: 16, paddingBottom: 60, gap: 12 },
  loading: { paddingVertical: 48, alignItems: "center" },

  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  sectionLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  hintText: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15, marginTop: -4 },

  unitRow: { flexDirection: "row", gap: 8 },
  unitBtn: {
    flex: 1, borderWidth: 1, borderRadius: 8,
    paddingVertical: 8, alignItems: "center",
  },
  unitBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricField: { width: "30%", minWidth: 90 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginBottom: 5 },
  hint: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 3 },
  input: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, fontFamily: "Inter_400Regular",
  },
  unitOverlay: {
    position: "absolute", right: 10,
    top: 0, bottom: 0,
    textAlignVertical: "center",
    fontSize: 10, fontFamily: "Inter_400Regular",
    ...Platform.select({ ios: { lineHeight: 36 }, android: {} }),
  },

  liftGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  liftField: { width: "47%" },

  saveBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  eqGroupLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, marginTop: 4 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  chipCheck: { fontSize: 10, fontFamily: "Inter_700Bold" },
  chipText:  { fontSize: 11, fontFamily: "Inter_500Medium" },

  notesInput: {
    borderWidth: 1, borderRadius: 8,
    padding: 10, minHeight: 72,
    fontSize: 12, fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
