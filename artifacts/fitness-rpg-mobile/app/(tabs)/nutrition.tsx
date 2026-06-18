import React, { useState, useRef, useEffect } from "react";
import {
  Alert,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTodayNutrition,
  useCreateNutritionLog,
  useDeleteNutritionLog,
  searchFood,
  customFetch,
  getGetTodayNutritionQueryKey,
  type FoodSearchResult,
  type NutritionLog,
  type DailyNutritionSummary,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

// ── Wearables types (no generated hooks — mirrors web wearables.tsx) ──────────

interface WearableEntry {
  id: number;
  date: string;
  steps: number | null;
  sleepHours: number | null;
  hrv: number | null;
  restingHr: number | null;
  caloriesBurned: number | null;
  activeMinutes: number | null;
  weight: number | null;
  source: string;
}

interface WearableSummary {
  days: number;
  avgSteps: number | null;
  avgSleepHours: number | null;
  avgHrv: number | null;
  avgRestingHr: number | null;
  entries: WearableEntry[];
}

// ── Meal type metadata ────────────────────────────────────────────────────────

const MEAL_TYPES = [
  { id: "breakfast",    label: "🌅 Breakfast" },
  { id: "lunch",        label: "☀️ Lunch" },
  { id: "dinner",       label: "🌙 Dinner" },
  { id: "snack",        label: "🍎 Snack" },
  { id: "pre_workout",  label: "⚡ Pre-WO" },
  { id: "post_workout", label: "🔥 Post-WO" },
] as const;

type MealTypeId = typeof MEAL_TYPES[number]["id"];

function mealLabel(id: string): string {
  return MEAL_TYPES.find((m) => m.id === id)?.label ?? id;
}

// ── Macro bar ─────────────────────────────────────────────────────────────────

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  barColor: string;
}

function MacroBar({ label, current, target, unit, barColor }: MacroBarProps) {
  const colors = useColors();
  const pct = target > 0 ? Math.min(current / target, 1) : 0;
  const over = target > 0 && current > target;
  return (
    <View style={s.macroRow}>
      <View style={s.macroLabelRow}>
        <Text style={[s.macroLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[s.macroValue, { color: over ? colors.destructive : colors.foreground }]}>
          {current}
          <Text style={[s.macroTarget, { color: colors.mutedForeground }]}>
            {" "}/ {target}{unit}
          </Text>
        </Text>
      </View>
      <View style={[s.barTrack, { backgroundColor: colors.secondary }]}>
        <View
          style={[
            s.barFill,
            { width: `${pct * 100}%` as `${number}%`, backgroundColor: over ? colors.destructive : barColor },
          ]}
        />
      </View>
    </View>
  );
}

// ── Vitals avg card ───────────────────────────────────────────────────────────

interface VitalCardProps {
  emoji: string;
  label: string;
  value: number | null;
  unit: string;
  color: string;
}

function VitalCard({ emoji, label, value, unit, color }: VitalCardProps) {
  const colors = useColors();
  return (
    <View style={[s.vitalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={s.vitalEmoji}>{emoji}</Text>
      <Text style={[s.vitalLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {value != null ? (
        <Text style={[s.vitalValue, { color }]}>
          {typeof value === "number" ? value.toLocaleString() : value}
          <Text style={[s.vitalUnit, { color: colors.mutedForeground }]}> {unit}</Text>
        </Text>
      ) : (
        <Text style={[s.vitalDash, { color: colors.mutedForeground }]}>—</Text>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type Section = "nutrition" | "vitals";

const DEFAULT_FORM = {
  mealType: "lunch" as MealTypeId,
  mealName: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
};

export default function NutritionScreen() {
  const colors = useColors();
  const qc = useQueryClient();

  const [section, setSection] = useState<Section>("nutrition");

  // ── Nutrition state ──────────────────────────────────────────────────────
  const { data: today, isLoading: loadingToday, error: todayError } =
    useGetTodayNutrition();
  const createLog = useCreateNutritionLog();
  const deleteLog = useDeleteNutritionLog();

  const [logOpen, setLogOpen] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [searchQ, setSearchQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [foodResults, setFoodResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [portionG, setPortionG] = useState("100");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Vitals state ─────────────────────────────────────────────────────────
  const [summary, setSummary] = useState<WearableSummary | null>(null);
  const [loadingVitals, setLoadingVitals] = useState(false);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vForm, setVForm] = useState({
    steps: "",
    sleepHours: "",
    hrv: "",
    restingHr: "",
  });

  // Load vitals summary when section becomes active
  useEffect(() => {
    if (section === "vitals") loadVitals();
  }, [section]);

  async function loadVitals() {
    setLoadingVitals(true);
    try {
      const data = await customFetch<WearableSummary>("/api/wearables/summary");
      setSummary(data);
      // Pre-fill today's vitals if already logged
      const todayEntry = await customFetch<WearableEntry | null>("/api/wearables/today");
      if (todayEntry) {
        setVForm({
          steps:      todayEntry.steps      != null ? String(todayEntry.steps)      : "",
          sleepHours: todayEntry.sleepHours  != null ? String(todayEntry.sleepHours) : "",
          hrv:        todayEntry.hrv         != null ? String(todayEntry.hrv)        : "",
          restingHr:  todayEntry.restingHr   != null ? String(todayEntry.restingHr)  : "",
        });
      }
    } catch {
      // non-fatal — show empty state
    } finally {
      setLoadingVitals(false);
    }
  }

  // ── Food search debounce ─────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchQ.length < 3) { setFoodResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchFood({ q: searchQ });
        setFoodResults(results);
      } catch {
        setFoodResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQ]);

  function applyFoodResult(item: FoodSearchResult) {
    const g = parseFloat(portionG) || 100;
    const r = g / 100;
    setForm((prev) => ({
      ...prev,
      mealName: item.name.split(" · ")[0],
      calories: String(Math.round(item.calories100g * r)),
      protein:  String(Math.round(item.protein100g  * r * 10) / 10),
      carbs:    String(Math.round(item.carbs100g    * r * 10) / 10),
      fat:      String(Math.round(item.fat100g      * r * 10) / 10),
    }));
    setShowSearch(false);
    setSearchQ("");
    setFoodResults([]);
  }

  function invalidateNutrition() {
    qc.invalidateQueries({ queryKey: getGetTodayNutritionQueryKey() });
  }

  function handleLogSubmit() {
    const cal = parseInt(form.calories);
    if (!form.mealName.trim()) {
      Alert.alert("Missing name", "Enter a meal name before logging.");
      return;
    }
    if (isNaN(cal) || cal <= 0) {
      Alert.alert("Invalid calories", "Enter a valid calorie count.");
      return;
    }
    createLog.mutate(
      {
        data: {
          mealName: form.mealName.trim(),
          mealType: form.mealType,
          calories: cal,
          protein:  parseFloat(form.protein)  || 0,
          carbs:    parseFloat(form.carbs)     || 0,
          fat:      parseFloat(form.fat)       || 0,
        },
      },
      {
        onSuccess: () => {
          setForm({ ...DEFAULT_FORM });
          setLogOpen(false);
          invalidateNutrition();
        },
        onError: () => Alert.alert("Error", "Failed to log meal. Try again."),
      }
    );
  }

  function handleDeleteLog(log: NutritionLog) {
    Alert.alert(
      "Remove entry",
      `Remove "${log.mealName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            deleteLog.mutate(
              { id: log.id },
              {
                onSuccess: () => invalidateNutrition(),
                onError: () => Alert.alert("Error", "Could not remove entry."),
              }
            ),
        },
      ]
    );
  }

  async function handleSaveVitals() {
    const body: Record<string, unknown> = {
      date: new Date().toISOString().split("T")[0],
      source: "manual",
    };
    if (vForm.steps)      body.steps      = parseInt(vForm.steps);
    if (vForm.sleepHours) body.sleepHours = parseFloat(vForm.sleepHours);
    if (vForm.hrv)        body.hrv        = parseFloat(vForm.hrv);
    if (vForm.restingHr)  body.restingHr  = parseInt(vForm.restingHr);

    if (Object.keys(body).length === 2) {
      Alert.alert("Nothing to save", "Enter at least one vital metric.");
      return;
    }

    setSaving(true);
    try {
      await customFetch("/api/wearables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setVitalsOpen(false);
      await loadVitals();
    } catch {
      Alert.alert("Error", "Could not save vitals. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Section toggle */}
      <View style={[s.toggleBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[s.togglePill, { backgroundColor: colors.secondary }]}>
          {(["nutrition", "vitals"] as Section[]).map((sec) => (
            <TouchableOpacity
              key={sec}
              onPress={() => setSection(sec)}
              style={[
                s.toggleBtn,
                section === sec && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[
                s.toggleBtnText,
                { color: section === sec ? colors.primaryForeground : colors.mutedForeground },
              ]}>
                {sec === "nutrition" ? "🍎 Nutrition" : "💓 Vitals"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {section === "nutrition"
            ? renderNutrition()
            : renderVitals()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // ── Nutrition section ─────────────────────────────────────────────────────

  function renderNutrition() {
    if (loadingToday) {
      return (
        <View style={s.centerPad}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (todayError || !today) {
      return (
        <View style={s.centerPad}>
          <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
            Could not load nutrition data.
          </Text>
        </View>
      );
    }

    const remaining = today.targetCalories - today.totalCalories;

    return (
      <>
        {/* Daily summary card */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.calorieBanner}>
            <View>
              <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>TODAY'S FUEL</Text>
              <Text style={[s.calorieNumber, { color: remaining >= 0 ? colors.success : colors.destructive }]}>
                {Math.abs(remaining)}
              </Text>
              <Text style={[s.calorieUnit, { color: colors.mutedForeground }]}>
                kcal {remaining >= 0 ? "remaining" : "over target"}
              </Text>
            </View>
            <View style={s.calorieTotalGroup}>
              <Text style={[s.calorieTotalNum, { color: colors.foreground }]}>{today.totalCalories}</Text>
              <Text style={[s.calorieTotalLabel, { color: colors.mutedForeground }]}>
                of {today.targetCalories} kcal
              </Text>
            </View>
          </View>
          <View style={s.macroGrid}>
            <MacroBar label="Calories" current={today.totalCalories} target={today.targetCalories} unit=" kcal" barColor="#22c55e" />
            <MacroBar label="Protein"  current={today.totalProtein}  target={today.targetProtein}  unit="g"     barColor={colors.primary} />
            <MacroBar label="Carbs"    current={today.totalCarbs}    target={today.targetCarbs}    unit="g"     barColor="#f97316" />
            <MacroBar label="Fat"      current={today.totalFat}      target={today.targetFat}      unit="g"     barColor="#ef4444" />
          </View>
        </View>

        {/* Today's meals */}
        <Text style={[s.sectionHeading, { color: colors.foreground }]}>Today's Meals</Text>
        {today.entries.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={s.emptyCardEmoji}>🍽️</Text>
            <Text style={[s.emptyCardText, { color: colors.mutedForeground }]}>
              No meals logged yet. Log your first meal below.
            </Text>
          </View>
        ) : (
          today.entries.map((log) => (
            <MealRow key={log.id} log={log} colors={colors} onDelete={handleDeleteLog} />
          ))
        )}

        {/* Log food */}
        <TouchableOpacity
          onPress={() => setLogOpen((v) => !v)}
          style={[s.logFoodBtn, { borderColor: colors.primary + "66", backgroundColor: colors.primary + "11" }]}
        >
          <Text style={[s.logFoodBtnText, { color: colors.primary }]}>
            {logOpen ? "✕ Close" : "+ Log Food"}
          </Text>
        </TouchableOpacity>

        {logOpen && (
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Meal type chips */}
            <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>MEAL TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
              {MEAL_TYPES.map((mt) => (
                <TouchableOpacity
                  key={mt.id}
                  onPress={() => setForm((p) => ({ ...p, mealType: mt.id }))}
                  style={[
                    s.chip,
                    {
                      borderColor: form.mealType === mt.id ? colors.primary : colors.border,
                      backgroundColor: form.mealType === mt.id ? colors.primary + "22" : "transparent",
                    },
                  ]}
                >
                  <Text style={[s.chipText, { color: form.mealType === mt.id ? colors.primary : colors.mutedForeground }]}>
                    {mt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Search toggle */}
            <TouchableOpacity
              onPress={() => setShowSearch((v) => !v)}
              style={s.searchToggle}
            >
              <Text style={[s.searchToggleText, { color: colors.primary }]}>
                {showSearch ? "🔍 Hide food search" : "🔍 Search food database"}
              </Text>
            </TouchableOpacity>

            {/* Food search */}
            {showSearch && (
              <>
                <View style={s.searchRow}>
                  <TextInput
                    style={[s.input, s.inputFlex, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="Search foods… (e.g. chicken breast)"
                    placeholderTextColor={colors.mutedForeground}
                    value={searchQ}
                    onChangeText={setSearchQ}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={[s.input, s.inputPortion, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="100g"
                    placeholderTextColor={colors.mutedForeground}
                    value={portionG}
                    onChangeText={setPortionG}
                    keyboardType="decimal-pad"
                  />
                </View>
                {searching && (
                  <View style={s.searchStatus}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[s.searchStatusText, { color: colors.mutedForeground }]}>Searching…</Text>
                  </View>
                )}
                {!searching && foodResults.length > 0 && (
                  <View style={[s.resultsList, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    {foodResults.slice(0, 6).map((item) => {
                      const g = parseFloat(portionG) || 100;
                      const r = g / 100;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => applyFoodResult(item)}
                          style={[s.resultRow, { borderBottomColor: colors.border }]}
                        >
                          <Text style={[s.resultName, { color: colors.foreground }]} numberOfLines={1}>
                            {item.name.split(" · ")[0]}
                          </Text>
                          <Text style={[s.resultMacros, { color: colors.mutedForeground }]}>
                            {Math.round(item.calories100g * r)} kcal · P {Math.round(item.protein100g * r)}g · C {Math.round(item.carbs100g * r)}g · F {Math.round(item.fat100g * r)}g
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {!searching && searchQ.length >= 3 && foodResults.length === 0 && (
                  <Text style={[s.noResults, { color: colors.mutedForeground }]}>No results found.</Text>
                )}
              </>
            )}

            {/* Manual fields */}
            <View style={s.fieldGap}>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>MEAL NAME</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Grilled Chicken"
                placeholderTextColor={colors.mutedForeground}
                value={form.mealName}
                onChangeText={(v) => setForm((p) => ({ ...p, mealName: v }))}
              />
            </View>
            <View style={s.macroInputRow}>
              {([
                { key: "calories", label: "KCAL", kbType: "number-pad" as const },
                { key: "protein",  label: "PROTEIN (g)", kbType: "decimal-pad" as const },
                { key: "carbs",    label: "CARBS (g)",   kbType: "decimal-pad" as const },
                { key: "fat",      label: "FAT (g)",     kbType: "decimal-pad" as const },
              ] as { key: keyof typeof form; label: string; kbType: "number-pad" | "decimal-pad" }[]).map(({ key, label, kbType }) => (
                <View key={key} style={s.macroInputCell}>
                  <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    value={form[key]}
                    onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                    keyboardType={kbType}
                  />
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleLogSubmit}
              disabled={createLog.isPending}
              style={[s.submitBtn, { backgroundColor: colors.primary, opacity: createLog.isPending ? 0.6 : 1 }]}
            >
              {createLog.isPending
                ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                : <Text style={[s.submitBtnText, { color: colors.primaryForeground }]}>Log Meal</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  }

  // ── Vitals section ────────────────────────────────────────────────────────

  function renderVitals() {
    return (
      <>
        <Text style={[s.sectionHeading, { color: colors.foreground }]}>7-Day Averages</Text>
        {loadingVitals ? (
          <View style={s.centerPad}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={s.vitalGrid}>
            <VitalCard emoji="👣" label="Avg Steps"     value={summary?.avgSteps     ?? null} unit="steps" color="#22c55e" />
            <VitalCard emoji="🌙" label="Avg Sleep"     value={summary?.avgSleepHours ?? null} unit="hrs"   color="#3b82f6" />
            <VitalCard emoji="💫" label="Avg HRV"       value={summary?.avgHrv        ?? null} unit="ms"    color="#a855f7" />
            <VitalCard emoji="❤️" label="Resting HR"   value={summary?.avgRestingHr  ?? null} unit="bpm"   color="#ef4444" />
          </View>
        )}

        {summary && summary.days > 0 && (
          <Text style={[s.vitalDaysNote, { color: colors.mutedForeground }]}>
            Based on {summary.days} day{summary.days === 1 ? "" : "s"} logged
          </Text>
        )}

        {/* Log today */}
        <TouchableOpacity
          onPress={() => setVitalsOpen((v) => !v)}
          style={[s.logFoodBtn, { borderColor: "#3b82f666", backgroundColor: "#3b82f611" }]}
        >
          <Text style={[s.logFoodBtnText, { color: "#3b82f6" }]}>
            {vitalsOpen ? "✕ Close" : "📋 Log Today's Vitals"}
          </Text>
        </TouchableOpacity>

        {vitalsOpen && (
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>Manual Entry</Text>
            <View style={s.vitalInputGrid}>
              {([
                { key: "steps",      label: "STEPS",       placeholder: "e.g. 8500", kbType: "number-pad" as const },
                { key: "sleepHours", label: "SLEEP (hrs)", placeholder: "e.g. 7.5",  kbType: "decimal-pad" as const },
                { key: "hrv",        label: "HRV (ms)",    placeholder: "e.g. 55",   kbType: "decimal-pad" as const },
                { key: "restingHr",  label: "RESTING HR",  placeholder: "e.g. 60",   kbType: "number-pad" as const },
              ] as { key: keyof typeof vForm; label: string; placeholder: string; kbType: "number-pad" | "decimal-pad" }[]).map(({ key, label, placeholder, kbType }) => (
                <View key={key} style={s.vitalInputCell}>
                  <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={vForm[key]}
                    onChangeText={(v) => setVForm((p) => ({ ...p, [key]: v }))}
                    keyboardType={kbType}
                  />
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleSaveVitals}
              disabled={saving}
              style={[s.submitBtn, { backgroundColor: "#3b82f6", opacity: saving ? 0.6 : 1 }]}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[s.submitBtnText, { color: "#fff" }]}>Save Vitals</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Recent history */}
        {summary && summary.entries.length > 0 && (
          <>
            <Text style={[s.sectionHeading, { color: colors.foreground }]}>Recent History</Text>
            {summary.entries.map((entry) => (
              <VitalHistoryRow key={entry.id} entry={entry} colors={colors} />
            ))}
          </>
        )}

        {/* Flavour note */}
        <View style={[s.gmNote, { borderColor: "#92400e44", backgroundColor: "#78350f18" }]}>
          <Text style={s.gmNoteEmoji}>⚔</Text>
          <Text style={[s.gmNoteText, { color: "#d97706" }]}>
            "The healers watch more than wounds. Log your sleep and heartbeat faithfully — Aldric will know."
          </Text>
        </View>
      </>
    );
  }
}

// ── Meal row component ────────────────────────────────────────────────────────

function MealRow({
  log,
  colors,
  onDelete,
}: {
  log: NutritionLog;
  colors: ReturnType<typeof useColors>;
  onDelete: (log: NutritionLog) => void;
}) {
  return (
    <View style={[s.mealRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.mealMain}>
        <Text style={[s.mealName, { color: colors.foreground }]} numberOfLines={1}>{log.mealName}</Text>
        <Text style={[s.mealType, { color: colors.mutedForeground }]}>{mealLabel(log.mealType)}</Text>
      </View>
      <View style={s.mealMacros}>
        <Text style={[s.mealCal, { color: colors.foreground }]}>{log.calories} kcal</Text>
        <Text style={[s.mealMacroDetail, { color: colors.mutedForeground }]}>
          P {log.protein}g · C {log.carbs}g · F {log.fat}g
        </Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(log)} style={s.mealDeleteBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Vital history row ─────────────────────────────────────────────────────────

function VitalHistoryRow({
  entry,
  colors,
}: {
  entry: WearableEntry;
  colors: ReturnType<typeof useColors>;
}) {
  const dateStr = new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const chips: { emoji: string; value: string; color: string }[] = [];
  if (entry.steps      != null) chips.push({ emoji: "👣", value: `${entry.steps.toLocaleString()} steps`, color: "#22c55e" });
  if (entry.sleepHours != null) chips.push({ emoji: "🌙", value: `${entry.sleepHours}h sleep`,              color: "#3b82f6" });
  if (entry.hrv        != null) chips.push({ emoji: "💫", value: `HRV ${entry.hrv}ms`,                     color: "#a855f7" });
  if (entry.restingHr  != null) chips.push({ emoji: "❤️", value: `${entry.restingHr} bpm`,                 color: "#ef4444" });

  return (
    <View style={[s.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[s.historyDate, { color: colors.mutedForeground }]}>{dateStr}</Text>
      <View style={s.historyChips}>
        {chips.map((c, i) => (
          <Text key={i} style={[s.historyChip, { color: c.color }]}>{c.emoji} {c.value}</Text>
        ))}
        {chips.length === 0 && (
          <Text style={[s.historyChip, { color: colors.mutedForeground }]}>No data</Text>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:           { flex: 1 },
  scroll:         { paddingHorizontal: 16, paddingBottom: 120, gap: 12 },
  centerPad:      { paddingVertical: 48, alignItems: "center" },
  emptyText:      { fontSize: 14, textAlign: "center" },

  toggleBar:      { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  togglePill:     { flexDirection: "row", borderRadius: 20, padding: 3 },
  toggleBtn:      { flex: 1, paddingVertical: 8, borderRadius: 18, alignItems: "center" },
  toggleBtnText:  { fontSize: 13, fontWeight: "700" },

  card:           { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  cardTitle:      { fontSize: 13, fontWeight: "700", marginBottom: 4 },

  calorieBanner:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sectionLabel:   { fontSize: 10, fontWeight: "600", letterSpacing: 1.2 },
  calorieNumber:  { fontSize: 40, fontWeight: "800", fontVariant: ["tabular-nums"] as "tabular-nums"[] },
  calorieUnit:    { fontSize: 11, fontWeight: "500", marginTop: -2 },
  calorieTotalGroup: { alignItems: "flex-end" },
  calorieTotalNum:   { fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] as "tabular-nums"[] },
  calorieTotalLabel: { fontSize: 11 },

  macroGrid:      { gap: 8 },
  macroRow:       { gap: 4 },
  macroLabelRow:  { flexDirection: "row", justifyContent: "space-between" },
  macroLabel:     { fontSize: 11, fontWeight: "600" },
  macroValue:     { fontSize: 11, fontWeight: "700", fontVariant: ["tabular-nums"] as "tabular-nums"[] },
  macroTarget:    { fontWeight: "400" },
  barTrack:       { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill:        { height: "100%", borderRadius: 3 },

  sectionHeading: { fontSize: 13, fontWeight: "700", marginTop: 4 },

  emptyCard:      { borderWidth: 1, borderRadius: 12, padding: 24, alignItems: "center", gap: 8 },
  emptyCardEmoji: { fontSize: 32 },
  emptyCardText:  { fontSize: 12, textAlign: "center", lineHeight: 18 },

  mealRow:        { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12 },
  mealMain:       { flex: 1, gap: 2 },
  mealName:       { fontSize: 13, fontWeight: "600" },
  mealType:       { fontSize: 11 },
  mealMacros:     { alignItems: "flex-end", gap: 2 },
  mealCal:        { fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] as "tabular-nums"[] },
  mealMacroDetail:{ fontSize: 10 },
  mealDeleteBtn:  { paddingLeft: 4 },

  logFoodBtn:     { borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  logFoodBtnText: { fontSize: 13, fontWeight: "700" },

  fieldLabel:     { fontSize: 9, fontWeight: "600", letterSpacing: 1.2, marginBottom: 4 },
  fieldGap:       { gap: 4 },
  input:          { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  inputFlex:      { flex: 1 },
  inputPortion:   { width: 64, textAlign: "center" as const },

  chipRow:        { flexDirection: "row" as const, marginBottom: 4 },
  chip:           { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
  chipText:       { fontSize: 11, fontWeight: "600" },

  searchToggle:   { paddingVertical: 4 },
  searchToggleText: { fontSize: 12, fontWeight: "600" },
  searchRow:      { flexDirection: "row", gap: 6 },
  searchStatus:   { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  searchStatusText: { fontSize: 11 },
  resultsList:    { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  resultRow:      { padding: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  resultName:     { fontSize: 12, fontWeight: "600" },
  resultMacros:   { fontSize: 10, marginTop: 2 },
  noResults:      { fontSize: 11, paddingVertical: 6, textAlign: "center" },

  macroInputRow:  { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  macroInputCell: { width: "47%", gap: 4 },

  submitBtn:      { borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  submitBtnText:  { fontSize: 14, fontWeight: "700" },

  vitalGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vitalCard:      { width: "47%", borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  vitalEmoji:     { fontSize: 22 },
  vitalLabel:     { fontSize: 10, fontWeight: "600", letterSpacing: 0.8 },
  vitalValue:     { fontSize: 20, fontWeight: "800" },
  vitalUnit:      { fontSize: 11, fontWeight: "400" },
  vitalDash:      { fontSize: 20, fontWeight: "400" },

  vitalDaysNote:  { fontSize: 11, textAlign: "center", marginTop: -4 },

  vitalInputGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vitalInputCell: { width: "47%", gap: 4 },

  historyRow:     { flexDirection: "row", gap: 12, alignItems: "flex-start", borderWidth: 1, borderRadius: 10, padding: 12 },
  historyDate:    { width: 44, fontSize: 11, fontWeight: "600", paddingTop: 2 },
  historyChips:   { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  historyChip:    { fontSize: 11, fontWeight: "600" },

  gmNote:         { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 14 },
  gmNoteEmoji:    { fontSize: 16, marginTop: 1 },
  gmNoteText:     { flex: 1, fontSize: 11, fontStyle: "italic", lineHeight: 17 },
});
