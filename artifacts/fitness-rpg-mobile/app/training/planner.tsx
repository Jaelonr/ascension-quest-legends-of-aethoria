import {
  useGenerateWorkoutPlan,
  useSavePlanAsTemplate,
  useGetEquipment,
  type GeneratedPlan,
  type PlanExercise,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Goal = "strength" | "hypertrophy" | "conditioning" | "striking" | "recovery" | "back_friendly_lower";

const GOALS: Array<{ value: Goal; label: string; description: string; color: string }> = [
  { value: "strength", label: "Strength", description: "Heavy compounds, 3-5 reps", color: "#ef4444" },
  { value: "hypertrophy", label: "Hypertrophy", description: "Mass building, 8-12 reps", color: "#f97316" },
  { value: "conditioning", label: "Conditioning", description: "Endurance and cardio", color: "#0dcef5" },
  { value: "striking", label: "Striking", description: "Bag work and combat", color: "#a855f7" },
  { value: "recovery", label: "Recovery", description: "Low intensity, sub-maximal", color: "#22c55e" },
  { value: "back_friendly_lower", label: "Back-Safe", description: "No spinal loading", color: "#eab308" },
];

const PHASE_COLORS: Record<string, string> = {
  warmup: "#3b82f6",
  main: "#ef4444",
  accessory: "#f97316",
  finisher: "#a855f7",
};

function ExerciseCard({ exercise }: { exercise: PlanExercise }) {
  const phaseColor = PHASE_COLORS[exercise.phase] ?? "#d9ad63";
  return (
    <View style={[s.exerciseCard, { borderColor: phaseColor + "80" }]}>
      <View style={s.exerciseTop}>
        <Text style={[s.phasePill, { color: phaseColor, borderColor: phaseColor + "80" }]}>{exercise.phase}</Text>
        <Text style={s.muscle}>{exercise.muscleGroup}</Text>
      </View>
      <Text style={s.exerciseName}>{exercise.exerciseName}</Text>
      <Text style={s.exerciseMeta}>{exercise.sets} x {exercise.reps} - RPE {exercise.rpe} - {exercise.restSeconds}s rest</Text>
      {exercise.recommendedWeightKg != null && exercise.recommendedWeightKg > 0 && (
        <Text style={s.weight}>{exercise.recommendedWeightKg} kg recommended</Text>
      )}
      {exercise.notes ? <Text style={s.notes}>{exercise.notes}</Text> : null}
      {!!exercise.substitutes?.length && (
        <View style={s.subBox}>
          <Text style={s.subTitle}>Substitutes</Text>
          {exercise.substitutes.slice(0, 2).map((sub, index) => (
            <Text key={`${sub.exerciseName}-${index}`} style={s.subText}>{sub.exerciseName} ({sub.reason})</Text>
          ))}
        </View>
      )}
    </View>
  );
}

export default function TrainingPlannerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedGoal, setSelectedGoal] = useState<Goal>("strength");
  const [rpeLimit, setRpeLimit] = useState<number | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const generatePlan = useGenerateWorkoutPlan();
  const savePlan = useSavePlanAsTemplate();
  const { data: equipment } = useGetEquipment();

  const generate = () => {
    generatePlan.mutate(
      { data: { goal: selectedGoal, rpeLimit: rpeLimit ?? undefined } },
      {
        onSuccess: (data) => setPlan(data),
        onError: () => Alert.alert("Generation failed", "Could not generate a plan. Check your equipment setup."),
      }
    );
  };

  const save = () => {
    if (!plan) return;
    savePlan.mutate(
      {
        data: {
          planName: plan.planName,
          goal: plan.goal,
          exercises: plan.exercises,
          estimatedDuration: plan.estimatedDuration,
          xpPreview: plan.xpPreview,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/training/templates"] });
          Alert.alert("Template saved", `"${plan.planName}" was added to Available Drills.`);
        },
        onError: () => Alert.alert("Save failed", "Could not save this plan as a drill template."),
      }
    );
  };

  const equipmentCount = Array.isArray(equipment) ? equipment.length : Object.values(equipment ?? {}).filter(Boolean).length;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }}>
      <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>Back to Training Yard</Text></TouchableOpacity>
      <Text style={s.kicker}>GUILD DRILL PLANNER</Text>
      <Text style={s.title}>Workout Planner</Text>
      <Text style={s.subtitle}>Equipment-aware plan generation.</Text>

      <View style={s.card}>
        <Text style={s.cardTitle}>Select Training Goal</Text>
        <View style={s.goalGrid}>
          {GOALS.map((goal) => (
            <TouchableOpacity
              key={goal.value}
              style={[s.goalCard, selectedGoal === goal.value && { borderColor: goal.color, backgroundColor: goal.color + "16" }]}
              onPress={() => setSelectedGoal(goal.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.goalTitle, { color: selectedGoal === goal.value ? goal.color : "#eee5d7" }]}>{goal.label}</Text>
              <Text style={s.goalDesc}>{goal.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>RPE Limit</Text>
        <View style={s.rpeRow}>
          {[null, 5, 6, 7, 8, 9].map((rpe) => (
            <TouchableOpacity key={rpe ?? "any"} style={[s.rpeBtn, rpeLimit === rpe && s.rpeBtnActive]} onPress={() => setRpeLimit(rpe)}>
              <Text style={[s.rpeText, rpeLimit === rpe && s.rpeTextActive]}>{rpe === null ? "Any" : `<= ${rpe}`}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.cardMeta}>RPE 5-6 recovery, 7-8 working, 9 near-max. Planner sees {equipmentCount} equipment entries.</Text>
      </View>

      <TouchableOpacity style={[s.generateBtn, generatePlan.isPending && { opacity: 0.65 }]} onPress={generate} disabled={generatePlan.isPending}>
        {generatePlan.isPending ? <ActivityIndicator color="#0a0908" /> : <Text style={s.generateText}>Generate Workout Plan</Text>}
      </TouchableOpacity>

      {plan && !generatePlan.isPending && (
        <View style={s.planStack}>
          <View style={s.planHeader}>
            <Text style={s.planName}>{plan.planName}</Text>
            <View style={s.planStats}>
              <View style={s.planStat}><Text style={s.planStatValue}>{plan.estimatedDuration}m</Text><Text style={s.planStatLabel}>Duration</Text></View>
              <View style={s.planStat}><Text style={s.planStatValue}>{plan.totalSets}</Text><Text style={s.planStatLabel}>Sets</Text></View>
              <View style={s.planStat}><Text style={[s.planStatValue, { color: "#d9ad63" }]}>+{plan.xpPreview}</Text><Text style={s.planStatLabel}>XP</Text></View>
            </View>
            {plan.injuryNotes ? <Text style={s.injury}>{plan.injuryNotes}</Text> : null}
            <View style={s.planActions}>
              <TouchableOpacity style={s.secondaryBtn} onPress={generate}><Text style={s.secondaryText}>Regenerate</Text></TouchableOpacity>
              <TouchableOpacity style={[s.secondaryBtn, savePlan.isPending && { opacity: 0.65 }]} onPress={save} disabled={savePlan.isPending}>
                <Text style={s.secondaryText}>{savePlan.isPending ? "Saving..." : "Save Template"}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {plan.rpeGuide?.note ? <Text style={s.guide}>{plan.rpeGuide.note}</Text> : null}
          {plan.exercises.map((exercise, index) => <ExerciseCard key={`${exercise.exerciseName}-${index}`} exercise={exercise} />)}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0908" },
  back: { color: "#d9ad63", fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 18 },
  kicker: { color: "#9d8f80", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  title: { color: "#eee5d7", fontSize: 26, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2 },
  subtitle: { color: "#9f9586", fontSize: 12, marginTop: 4, marginBottom: 16, fontFamily: "Inter_400Regular" },
  card: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 14, marginBottom: 12 },
  cardTitle: { color: "#d9ad63", fontSize: 15, fontFamily: "PlayfairDisplay_700Bold", fontWeight: "900", marginBottom: 10 },
  cardMeta: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 10 },
  goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  goalCard: { width: "48%", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 10, minHeight: 78 },
  goalTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  goalDesc: { color: "#8f887d", fontSize: 10, lineHeight: 14, marginTop: 4 },
  rpeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rpeBtn: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", paddingHorizontal: 12, paddingVertical: 8 },
  rpeBtnActive: { borderColor: "#d9ad63", backgroundColor: "#d9ad6318" },
  rpeText: { color: "#8f887d", fontSize: 12, fontFamily: "Inter_700Bold" },
  rpeTextActive: { color: "#d9ad63" },
  generateBtn: { backgroundColor: "#d9ad63", padding: 14, alignItems: "center", marginBottom: 14 },
  generateText: { color: "#0a0908", fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  planStack: { gap: 10 },
  planHeader: { borderWidth: 1, borderColor: "#8c6a36", backgroundColor: "#11100e", padding: 14 },
  planName: { color: "#eee5d7", fontSize: 20, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  planStats: { flexDirection: "row", gap: 8, marginTop: 12 },
  planStat: { flex: 1, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 10, alignItems: "center" },
  planStatValue: { color: "#eee5d7", fontSize: 15, fontFamily: "Inter_700Bold" },
  planStatLabel: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", marginTop: 2 },
  injury: { color: "#eab308", fontSize: 11, lineHeight: 16, borderWidth: 1, borderColor: "#eab30855", backgroundColor: "#eab30812", padding: 8, marginTop: 10 },
  planActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: "#6b4d2f", padding: 10, alignItems: "center" },
  secondaryText: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  guide: { color: "#9f9586", fontSize: 11, lineHeight: 16, borderLeftWidth: 2, borderLeftColor: "#6b4d2f", paddingLeft: 10 },
  exerciseCard: { borderWidth: 1, backgroundColor: "#11100e", padding: 12 },
  exerciseTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  phasePill: { borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2, fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  muscle: { color: "#8f887d", fontSize: 9, textTransform: "uppercase" },
  exerciseName: { color: "#eee5d7", fontSize: 14, fontFamily: "Inter_700Bold" },
  exerciseMeta: { color: "#8f887d", fontSize: 11, marginTop: 4 },
  weight: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold", marginTop: 5 },
  notes: { color: "#9f9586", fontSize: 11, lineHeight: 16, marginTop: 5, fontStyle: "italic" },
  subBox: { borderTopWidth: 1, borderTopColor: "#2a2520", marginTop: 8, paddingTop: 8 },
  subTitle: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", marginBottom: 4 },
  subText: { color: "#cfc5b8", fontSize: 11, lineHeight: 16 },
});
