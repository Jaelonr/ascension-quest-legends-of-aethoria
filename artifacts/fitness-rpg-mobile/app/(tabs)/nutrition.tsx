import {
  useGetTodayNutrition,
  useGetNutritionTargets,
  useGetNutritionLogs,
  useCreateNutritionLog,
  useDeleteNutritionLog,
  useUpdateNutritionTargets,
  searchFood,
} from "@workspace/api-client-react";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

const QUICK_ADDS = [
  { name: "Protein Shake", mealType: "post_workout", calories: 150, protein: 25, carbs: 8, fat: 3 },
  { name: "Chicken & Rice", mealType: "lunch", calories: 480, protein: 45, carbs: 52, fat: 8 },
  { name: "Eggs (3 whole)", mealType: "breakfast", calories: 210, protein: 18, carbs: 1, fat: 14 },
  { name: "Greek Yogurt", mealType: "snack", calories: 130, protein: 15, carbs: 12, fat: 2 },
  { name: "Oatmeal", mealType: "breakfast", calories: 300, protein: 10, carbs: 54, fat: 6 },
  { name: "Salmon + Veg", mealType: "dinner", calories: 420, protein: 40, carbs: 18, fat: 18 },
];

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout"] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner",
  snack: "Snack", pre_workout: "Pre-Workout", post_workout: "Post-Workout",
};

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary", desc: "Desk job, little exercise" },
  { id: "light", label: "Light", desc: "1-3 workouts/week" },
  { id: "moderate", label: "Moderate", desc: "3-5 workouts/week" },
  { id: "active", label: "Active", desc: "6-7 workouts/week" },
  { id: "very_active", label: "Very Active", desc: "Twice a day" },
] as const;

const WEIGHT_GOALS = [
  { id: "lose", label: "Fat Loss", desc: "-500 kcal" },
  { id: "maintain", label: "Maintain", desc: "TDEE" },
  { id: "gain", label: "Gain Muscle", desc: "+300 kcal" },
] as const;

function nutritionGoalLabel(goal?: string | null) {
  if (goal === "lose") return "fat loss";
  if (goal === "gain") return "muscle gain";
  return "maintenance";
}

function activityLabel(activity?: string | null) {
  return ACTIVITY_LEVELS.find((level) => level.id === activity)?.label ?? "profile";
}

type MacroKey = "calories" | "protein" | "carbs" | "fat";
const MACRO_META: Array<{ key: MacroKey; label: string; unit: string; color: string }> = [
  { key: "calories", label: "Calories", unit: "kcal", color: "#d9ad63" },
  { key: "protein",  label: "Protein",  unit: "g",    color: "#0dcef5" },
  { key: "carbs",    label: "Carbs",    unit: "g",    color: "#a855f7" },
  { key: "fat",      label: "Fat",      unit: "g",    color: "#f97316" },
];

function MacroBar({ label, current, target, unit, color }: { label: string; current: number; target: number; unit: string; color: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const over = current > target;
  return (
    <View style={mb.row}>
      <View style={mb.labelRow}>
        <Text style={mb.label}>{label}</Text>
        <Text style={[mb.value, { color: over ? "#ef4444" : color }]}>
          {Math.round(current)}<Text style={mb.unit}> / {target}{unit}</Text>
        </Text>
      </View>
      <View style={[mb.track, { backgroundColor: "#2a2520" }]}>
        <View
          style={[mb.fill, { width: `${pct}%`, backgroundColor: over ? "#ef4444" : color }]}
        />
      </View>
    </View>
  );
}
const mb = StyleSheet.create({
  row: { marginBottom: 10 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { fontSize: 11, color: "#9d8f80", fontFamily: "Inter_400Regular" },
  value: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  unit: { fontSize: 10, color: "#9d8f80", fontWeight: "400" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
});

function CalorieGoalCard({ targets, onSaved }: { targets: any; onSaved: () => void }) {
  const qc = useQueryClient();
  const updateTargets = useUpdateNutritionTargets();
  const [open, setOpen] = useState(!targets?.autoCalc);
  const [sex, setSex] = useState<"male" | "female" | "">((targets?.sex as "male" | "female") ?? "");
  const [age, setAge] = useState(targets?.ageYears ? String(targets.ageYears) : "");
  const [activity, setActivity] = useState<string>(targets?.activityLevel ?? "");
  const [goal, setGoal] = useState<string>(targets?.weightGoal ?? "");

  const canSave = Boolean(sex && age && activity && goal);

  const handleSave = () => {
    const ageYears = parseInt(age, 10);
    if (!sex || !activity || !goal || Number.isNaN(ageYears) || ageYears < 10 || ageYears > 100) {
      Alert.alert("Check target details", "Choose sex, age, activity, and goal. Age should be between 10 and 100.");
      return;
    }

    updateTargets.mutate(
      { data: { sex, ageYears, activityLevel: activity, weightGoal: goal } as any },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/nutrition/targets"] });
          qc.invalidateQueries({ queryKey: ["/api/nutrition/today"] });
          setOpen(false);
          onSaved();
        },
        onError: () => Alert.alert("Could not update target", "The Guild ledger could not save this goal yet."),
      }
    );
  };

  return (
    <View style={cg.card}>
      <TouchableOpacity style={cg.summaryRow} onPress={() => setOpen((value) => !value)} activeOpacity={0.8}>
        <View style={cg.iconBox}>
          <Text style={cg.iconText}>#</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cg.title}>Calorie Goal</Text>
          <Text style={cg.subtitle}>
            {targets?.autoCalc ? "Calculated from profile data" : "Set sex, age, activity, and goal"}
          </Text>
        </View>
        <Text style={cg.chevron}>{open ? "HIDE" : "EDIT"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={cg.body}>
          <Text style={cg.note}>
            Targets use your height and weight from the Adventurer Profile when available. If those are missing, the ledger saves your preferences and keeps the current macro targets.
          </Text>

          <Text style={cg.fieldLabel}>Sex used for calorie formula</Text>
          <View style={cg.twoCol}>
            {(["male", "female"] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[cg.pill, sex === option && cg.pillActive]}
                onPress={() => setSex(option)}
                activeOpacity={0.8}
              >
                <Text style={[cg.pillText, sex === option && cg.pillTextActive]}>{option === "male" ? "Male" : "Female"}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={cg.fieldLabel}>Age</Text>
          <TextInput
            style={cg.input}
            value={age}
            onChangeText={setAge}
            placeholder="e.g. 28"
            placeholderTextColor="#6f6559"
            keyboardType="number-pad"
          />

          <Text style={cg.fieldLabel}>Activity Level</Text>
          <View style={cg.optionStack}>
            {ACTIVITY_LEVELS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[cg.optionRow, activity === option.id && cg.optionRowActive]}
                onPress={() => setActivity(option.id)}
                activeOpacity={0.8}
              >
                <View style={[cg.dot, activity === option.id && cg.dotActive]} />
                <View>
                  <Text style={[cg.optionTitle, activity === option.id && cg.optionTitleActive]}>{option.label}</Text>
                  <Text style={cg.optionDesc}>{option.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={cg.fieldLabel}>Goal</Text>
          <View style={cg.goalGrid}>
            {WEIGHT_GOALS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[cg.goalBox, goal === option.id && cg.goalBoxActive]}
                onPress={() => setGoal(option.id)}
                activeOpacity={0.8}
              >
                <Text style={[cg.goalTitle, goal === option.id && cg.goalTitleActive]}>{option.label}</Text>
                <Text style={cg.goalDesc}>{option.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[cg.saveBtn, (!canSave || updateTargets.isPending) && { opacity: 0.55 }]}
            onPress={handleSave}
            disabled={!canSave || updateTargets.isPending}
            activeOpacity={0.85}
          >
            {updateTargets.isPending
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={cg.saveText}>CALCULATE & SAVE GOAL</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const cg = StyleSheet.create({
  card: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", marginTop: 12 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  iconBox: { width: 32, height: 32, borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#15130f", alignItems: "center", justifyContent: "center" },
  iconText: { color: "#22c55e", fontSize: 14, fontFamily: "Inter_700Bold" },
  title: { color: "#eee5d7", fontSize: 13, fontFamily: "Inter_700Bold" },
  subtitle: { color: "#22c55e", fontSize: 10, marginTop: 2, fontFamily: "Inter_400Regular" },
  chevron: { color: "#9d8f80", fontSize: 9, letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  body: { borderTopWidth: 1, borderTopColor: "#2a2520", padding: 12, gap: 10 },
  note: { color: "#9d8f80", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  fieldLabel: { color: "#8f887d", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "Inter_400Regular", marginTop: 2 },
  twoCol: { flexDirection: "row", gap: 8 },
  pill: { flex: 1, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#171510", paddingVertical: 9, alignItems: "center" },
  pillActive: { borderColor: "#d9ad63", backgroundColor: "#d9ad6318" },
  pillText: { color: "#9d8f80", fontSize: 12, fontFamily: "Inter_700Bold" },
  pillTextActive: { color: "#d9ad63" },
  input: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", color: "#eee5d7", padding: 10, fontSize: 13, fontFamily: "Inter_400Regular" },
  optionStack: { gap: 6 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 9 },
  optionRowActive: { borderColor: "#d9ad63", backgroundColor: "#d9ad6310" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#3b3328" },
  dotActive: { backgroundColor: "#d9ad63" },
  optionTitle: { color: "#eee5d7", fontSize: 12, fontFamily: "Inter_700Bold" },
  optionTitleActive: { color: "#d9ad63" },
  optionDesc: { color: "#8f887d", fontSize: 10, marginTop: 1, fontFamily: "Inter_400Regular" },
  goalGrid: { flexDirection: "row", gap: 6 },
  goalBox: { flex: 1, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 8, alignItems: "center" },
  goalBoxActive: { borderColor: "#d9ad63", backgroundColor: "#d9ad6318" },
  goalTitle: { color: "#eee5d7", fontSize: 10, textAlign: "center", fontFamily: "Inter_700Bold" },
  goalTitleActive: { color: "#d9ad63" },
  goalDesc: { color: "#8f887d", fontSize: 9, marginTop: 2, fontFamily: "Inter_400Regular" },
  saveBtn: { backgroundColor: "#d9ad63", alignItems: "center", justifyContent: "center", minHeight: 42, marginTop: 2 },
  saveText: { color: "#000", fontSize: 12, letterSpacing: 1.2, fontFamily: "Inter_700Bold" },
});

function LogEntryRow({ entry, onDelete }: { entry: any; onDelete: (id: number) => void }) {
  const colors = useColors();
  return (
    <View style={[le.row, { borderColor: "#2a2520" }]}>
      <View style={{ flex: 1 }}>
        <Text style={[le.name, { color: colors.foreground }]} numberOfLines={1}>{entry.name}</Text>
        <Text style={[le.meta, { color: colors.mutedForeground }]}>
          {Math.round(entry.calories)} kcal · {Math.round(entry.protein)}g protein
        </Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(entry.id)} hitSlop={8}>
        <Text style={{ color: "#6b5d4f", fontSize: 18 }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}
const le = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, paddingVertical: 10 },
  name: { fontSize: 13, fontWeight: "600" },
  meta: { fontSize: 11, marginTop: 1 },
});

function AddFoodModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const createLog = useCreateNutritionLog();

  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<string>("lunch");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [foodResults, setFoodResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [portionGrams, setPortionGrams] = useState("100");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => { setName(""); setCalories(""); setProtein(""); setCarbs(""); setFat(""); };

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchQ.trim().length < 3) {
      setFoodResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchFood({ q: searchQ.trim() });
        setFoodResults(results as any[]);
      } catch {
        setFoodResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 450);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQ]);

  const applyFoodResult = (item: any) => {
    const grams = parseFloat(portionGrams) || 100;
    const ratio = grams / 100;
    const displayName = String(item.name ?? "").split(" · ")[0].split(" Â· ")[0].split(" Ã‚Â· ")[0];
    setName(displayName);
    setCalories(String(Math.round((item.calories100g ?? 0) * ratio)));
    setProtein(String(Math.round((item.protein100g ?? 0) * ratio * 10) / 10));
    setCarbs(String(Math.round((item.carbs100g ?? 0) * ratio * 10) / 10));
    setFat(String(Math.round((item.fat100g ?? 0) * ratio * 10) / 10));
    setSearchQ("");
    setFoodResults([]);
  };

  const handleQuickAdd = (q: typeof QUICK_ADDS[0]) => {
    createLog.mutate(
      {
        data: {
          mealName: q.name, mealType: q.mealType as any,
          calories: q.calories, protein: q.protein, carbs: q.carbs, fat: q.fat,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/nutrition/today"] });
          qc.invalidateQueries({ queryKey: ["/api/nutrition/logs"] });
          onClose();
        },
        onError: () => Alert.alert("Error", "Could not add food."),
      }
    );
  };

  const handleManualAdd = () => {
    if (!name.trim() || !calories) { Alert.alert("Required", "Name and calories are required."); return; }
    createLog.mutate(
      {
        data: {
          mealName: name.trim(), mealType: mealType as any,
          calories: parseFloat(calories) || 0,
          protein: parseFloat(protein) || 0,
          carbs: parseFloat(carbs) || 0,
          fat: parseFloat(fat) || 0,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/nutrition/today"] });
          qc.invalidateQueries({ queryKey: ["/api/nutrition/logs"] });
          reset();
          onClose();
        },
        onError: () => Alert.alert("Error", "Could not add food."),
      }
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[af.root, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[af.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
          <Text style={[af.title, { color: "#d9ad63" }]}>Add Food</Text>
          <TouchableOpacity onPress={onClose} style={af.closeBtn}>
            <Text style={{ color: colors.mutedForeground, fontSize: 22 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          {/* Quick adds */}
          <View>
            <Text style={[af.sectionLabel, { color: colors.mutedForeground }]}>QUICK ADD</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {QUICK_ADDS.map((q) => (
                <TouchableOpacity
                  key={q.name}
                  style={[af.quickBtn, { borderColor: "#3b3328", backgroundColor: "#171510" }]}
                  onPress={() => handleQuickAdd(q)}
                  disabled={createLog.isPending}
                  activeOpacity={0.7}
                >
                  <Text style={[af.quickBtnText, { color: colors.foreground }]}>{q.name}</Text>
                  <Text style={[af.quickBtnMeta, { color: colors.mutedForeground }]}>{q.calories} kcal</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Food search */}
          <View>
            <Text style={[af.sectionLabel, { color: colors.mutedForeground }]}>GUILD FOOD DATABASE</Text>
            <Text style={af.searchHelp}>Search common foods and dishes, then adjust the serving size before logging.</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[af.input, { flex: 1, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="Search chicken rice, oats, yogurt..."
                placeholderTextColor={colors.mutedForeground}
                value={searchQ}
                onChangeText={setSearchQ}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[af.input, af.gramsInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="100g"
                placeholderTextColor={colors.mutedForeground}
                value={portionGrams}
                onChangeText={setPortionGrams}
                keyboardType="decimal-pad"
              />
            </View>
            {isSearching && <ActivityIndicator color="#d9ad63" style={{ marginVertical: 8 }} />}
            {foodResults.length > 0 && (
              <View style={af.resultList}>
                {foodResults.slice(0, 8).map((item, index) => (
                  <TouchableOpacity key={`${item.name}-${index}`} style={af.resultRow} onPress={() => applyFoodResult(item)} activeOpacity={0.75}>
                    <View style={{ flex: 1 }}>
                      <Text style={af.resultName} numberOfLines={1}>{String(item.name ?? "Food").split(" · ")[0]}</Text>
                      <Text style={af.resultMeta}>
                        {Math.round(item.calories100g ?? 0)} kcal · {Math.round((item.protein100g ?? 0) * 10) / 10}g protein / 100g
                      </Text>
                    </View>
                    <Text style={af.resultSource}>{item.source === "open_food_facts" ? "OFF" : "Guild"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Manual entry */}
          <View>
            <Text style={[af.sectionLabel, { color: colors.mutedForeground }]}>MANUAL ENTRY</Text>
            <TextInput
              style={[af.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Food name" placeholderTextColor={colors.mutedForeground}
              value={name} onChangeText={setName}
            />
            {/* Meal type */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {MEAL_TYPES.map((mt) => (
                  <TouchableOpacity
                    key={mt}
                    style={[af.mealTypeBtn, { borderColor: mealType === mt ? "#d9ad63" : "#3b3328", backgroundColor: mealType === mt ? "#d9ad6318" : "#171510" }]}
                    onPress={() => setMealType(mt)}
                  >
                    <Text style={[af.mealTypeText, { color: mealType === mt ? "#d9ad63" : "#9d8f80" }]}>{MEAL_LABELS[mt]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { label: "Calories", value: calories, set: setCalories },
                { label: "Protein (g)", value: protein, set: setProtein },
              ].map((f) => (
                <View key={f.label} style={{ flex: 1 }}>
                  <Text style={[af.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                  <TextInput
                    style={[af.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                    placeholder="0" placeholderTextColor={colors.mutedForeground}
                    value={f.value} onChangeText={f.set} keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { label: "Carbs (g)", value: carbs, set: setCarbs },
                { label: "Fat (g)", value: fat, set: setFat },
              ].map((f) => (
                <View key={f.label} style={{ flex: 1 }}>
                  <Text style={[af.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                  <TextInput
                    style={[af.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                    placeholder="0" placeholderTextColor={colors.mutedForeground}
                    value={f.value} onChangeText={f.set} keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[af.addBtn, createLog.isPending && { opacity: 0.6 }]}
              onPress={handleManualAdd}
              disabled={createLog.isPending}
              activeOpacity={0.8}
            >
              {createLog.isPending
                ? <ActivityIndicator size="small" color="#000" />
                : <Text style={af.addBtnText}>+ ADD FOOD</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const af = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  closeBtn: {},
  sectionLabel: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, fontFamily: "Inter_400Regular" },
  quickBtn: { borderWidth: 1, padding: 10, borderRadius: 4, minWidth: "30%" },
  quickBtnText: { fontSize: 12, fontWeight: "600" },
  quickBtnMeta: { fontSize: 10, marginTop: 2 },
  searchHelp: { color: "#9d8f80", fontSize: 11, lineHeight: 16, marginBottom: 8, fontFamily: "Inter_400Regular" },
  gramsInput: { width: 76, textAlign: "center" },
  resultList: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", marginBottom: 8 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: "#2a2520", padding: 10 },
  resultName: { color: "#eee5d7", fontSize: 12, fontFamily: "Inter_700Bold" },
  resultMeta: { color: "#9d8f80", fontSize: 10, marginTop: 2, fontFamily: "Inter_400Regular" },
  resultSource: { color: "#d9ad63", fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: 4, padding: 10, fontSize: 14, marginBottom: 8 },
  mealTypeBtn: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
  mealTypeText: { fontSize: 11, fontWeight: "600" },
  fieldLabel: { fontSize: 10, marginBottom: 4, fontFamily: "Inter_400Regular" },
  addBtn: { backgroundColor: "#d9ad63", padding: 12, alignItems: "center", borderRadius: 4, marginTop: 4 },
  addBtnText: { color: "#000", fontWeight: "700", fontSize: 13, letterSpacing: 1 },
});

export default function NutritionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: today, isLoading: loadingToday } = useGetTodayNutrition();
  const { data: targets } = useGetNutritionTargets();
  const { data: logs, isLoading: loadingLogs } = useGetNutritionLogs();
  const deleteLog = useDeleteNutritionLog();

  const handleDelete = (id: number) => {
    Alert.alert("Remove?", "Remove this food from today's log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          deleteLog.mutate(
            { id },
            {
              onSuccess: () => {
                qc.invalidateQueries({ queryKey: ["/api/nutrition/today"] });
                qc.invalidateQueries({ queryKey: ["/api/nutrition/logs"] });
              },
            }
          );
        },
      },
    ]);
  };

  const macroTargets = {
    calories: (targets as any)?.calories ?? 2000,
    protein: (targets as any)?.protein ?? 150,
    carbs: (targets as any)?.carbs ?? 200,
    fat: (targets as any)?.fat ?? 65,
  };

  const current = {
    calories: (today as any)?.calories ?? 0,
    protein: (today as any)?.protein ?? 0,
    carbs: (today as any)?.carbs ?? 0,
    fat: (today as any)?.fat ?? 0,
  };

  const logsByMeal: Record<string, any[]> = {};
  for (const entry of (logs ?? []) as any[]) {
    const m = entry.mealType ?? "other";
    if (!logsByMeal[m]) logsByMeal[m] = [];
    logsByMeal[m].push(entry);
  }
  const mealSections = MEAL_TYPES.filter((m) => logsByMeal[m]?.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0908" }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={ns.header}>
          <Text style={ns.headerSub}>GUILD PROVISIONS</Text>
          <Text style={ns.headerTitle}>Guild Provisions</Text>
          <Text style={ns.headerDesc}>Fuel the body that carries the legend.</Text>
        </View>

        <View style={ns.ledgerCard}>
          <Text style={ns.ledgerTitle}>Healer's Ledger</Text>
          <Text style={ns.ledgerText}>
            Food is not bookkeeping in Aethoria. It is recovery, preparation, and the raw material the System turns into endurance.
          </Text>
          <View style={ns.ledgerGrid}>
            <View style={ns.ledgerBox}>
              <Text style={ns.ledgerLabel}>Goal basis</Text>
              <Text style={ns.ledgerValue}>
                {nutritionGoalLabel((targets as any)?.weightGoal)} - {activityLabel((targets as any)?.activityLevel)}
              </Text>
            </View>
            <View style={ns.ledgerBox}>
              <Text style={ns.ledgerLabel}>Commission effect</Text>
              <Text style={ns.ledgerValue}>Meals and protein update Guild duty progress.</Text>
            </View>
            <View style={ns.ledgerBox}>
              <Text style={ns.ledgerLabel}>Food sources</Text>
              <Text style={ns.ledgerValue}>Guild database first; reputable lookup when available.</Text>
            </View>
          </View>
        </View>

        {/* Macro summary */}
        <View style={[ns.card, { backgroundColor: "#171510", borderColor: "#3b3328" }]}>
          <View style={ns.targetHeader}>
            <Text style={ns.sectionLabel}>DAILY TARGETS</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={ns.remainingValue}>{Math.max(0, Math.round(macroTargets.calories - current.calories))}</Text>
              <Text style={ns.remainingLabel}>kcal remaining</Text>
            </View>
          </View>
          {loadingToday ? (
            <ActivityIndicator color="#d9ad63" style={{ marginVertical: 16 }} />
          ) : (
            MACRO_META.map((m) => (
              <MacroBar
                key={m.key}
                label={m.label}
                current={current[m.key]}
                target={macroTargets[m.key]}
                unit={m.unit}
                color={m.color}
              />
            ))
          )}
          {(targets as any)?.autoCalc && (
            <Text style={ns.autoCalcNote}>
              {(targets as any)?.calories ?? macroTargets.calories} kcal - {nutritionGoalLabel((targets as any)?.weightGoal)} goal
            </Text>
          )}
        </View>

        <CalorieGoalCard
          targets={targets as any}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["/api/nutrition/targets"] });
            qc.invalidateQueries({ queryKey: ["/api/nutrition/today"] });
          }}
        />

        {/* Add food button */}
        <TouchableOpacity
          style={ns.addFoodBtn}
          onPress={() => setAddModalOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={ns.addFoodText}>+ RECORD PROVISIONS</Text>
        </TouchableOpacity>

        {/* Food log by meal */}
        {loadingLogs ? (
          <ActivityIndicator color="#d9ad63" style={{ marginTop: 20 }} />
        ) : mealSections.length > 0 ? (
          mealSections.map((meal) => (
            <View key={meal} style={{ marginTop: 16 }}>
              <Text style={ns.mealHeader}>{MEAL_LABELS[meal]}</Text>
              {logsByMeal[meal].map((entry) => (
                <LogEntryRow key={entry.id} entry={entry} onDelete={handleDelete} />
              ))}
            </View>
          ))
        ) : (
          <View style={[ns.empty, { borderColor: "#3b3328" }]}>
            <Text style={{ fontSize: 24 }}>🍖</Text>
            <Text style={[ns.emptyTitle, { color: colors.foreground }]}>No food logged yet</Text>
            <Text style={[ns.emptyDesc, { color: colors.mutedForeground }]}>
              Track your nutrition to fuel the fight.
            </Text>
          </View>
        )}
      </ScrollView>

      <AddFoodModal visible={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </View>
  );
}

const ns = StyleSheet.create({
  header: { marginBottom: 16 },
  headerSub: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#eee5d7", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2 },
  headerDesc: { color: "#9f9586", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Inter_400Regular", marginTop: 2 },
  card: { borderWidth: 1, padding: 14 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", textTransform: "uppercase", marginBottom: 12, fontFamily: "Inter_400Regular" },
  ledgerCard: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 14, marginBottom: 16 },
  ledgerTitle: { color: "#d9ad63", fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  ledgerText: { color: "#cfc5b8", fontSize: 13, lineHeight: 20, marginTop: 6, fontFamily: "Inter_400Regular" },
  ledgerGrid: { gap: 8, marginTop: 12 },
  ledgerBox: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 10 },
  ledgerLabel: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_400Regular", marginBottom: 4 },
  ledgerValue: { color: "#d8c4a5", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  targetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 },
  remainingValue: { color: "#eee5d7", fontSize: 24, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  remainingLabel: { color: "#9d8f80", fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  autoCalcNote: { color: "#22c55e", fontSize: 10, marginTop: 2, fontFamily: "Inter_400Regular" },
  mealHeader: { fontSize: 9, letterSpacing: 2, color: "#9d8f80", textTransform: "uppercase", marginBottom: 6, fontFamily: "Inter_400Regular" },
  addFoodBtn: { backgroundColor: "#d9ad63", padding: 14, alignItems: "center", marginTop: 12 },
  addFoodText: { color: "#000", fontWeight: "700", fontSize: 13, letterSpacing: 2, fontFamily: "Inter_700Bold" },
  empty: { borderWidth: 1, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 8, marginTop: 16 },
  emptyTitle: { fontSize: 15, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  emptyDesc: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});

