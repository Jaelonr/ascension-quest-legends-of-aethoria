import {
  useGetTodayNutrition,
  useGetNutritionTargets,
  useGetNutritionLogs,
  useCreateNutritionLog,
  useDeleteNutritionLog,
} from "@workspace/api-client-react";
import React, { useState } from "react";
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

  const reset = () => { setName(""); setCalories(""); setProtein(""); setCarbs(""); setFat(""); };

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
          <Text style={ns.headerSub}>NUTRITION</Text>
          <Text style={ns.headerTitle}>Daily Rations</Text>
        </View>

        {/* Macro summary */}
        <View style={[ns.card, { backgroundColor: "#171510", borderColor: "#3b3328" }]}>
          <Text style={ns.sectionLabel}>TODAY'S MACROS</Text>
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
        </View>

        {/* Add food button */}
        <TouchableOpacity
          style={ns.addFoodBtn}
          onPress={() => setAddModalOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={ns.addFoodText}>+ ADD FOOD</Text>
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
  card: { borderWidth: 1, padding: 14 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", textTransform: "uppercase", marginBottom: 12, fontFamily: "Inter_400Regular" },
  mealHeader: { fontSize: 9, letterSpacing: 2, color: "#9d8f80", textTransform: "uppercase", marginBottom: 6, fontFamily: "Inter_400Regular" },
  addFoodBtn: { backgroundColor: "#d9ad63", padding: 14, alignItems: "center", marginTop: 12 },
  addFoodText: { color: "#000", fontWeight: "700", fontSize: 13, letterSpacing: 2, fontFamily: "Inter_700Bold" },
  empty: { borderWidth: 1, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 8, marginTop: 16 },
  emptyTitle: { fontSize: 15, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  emptyDesc: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});

