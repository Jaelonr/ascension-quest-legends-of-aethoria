import {
  customFetch,
  useCreateWorkoutSession,
  useGenerateWorkoutPlan,
  useSavePlanAsTemplate,
  useGetEquipment,
  useSearchExercisesAi,
  type GeneratedPlan,
  type PlanExercise,
  type ExerciseSearchResultExercisesItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Goal = "strength" | "hypertrophy" | "conditioning" | "striking" | "grappling" | "recovery" | "mobility" | "skill_practice" | "commission" | "back_friendly_lower";

const GOALS: Array<{ value: Goal; label: string; description: string; color: string }> = [
  { value: "strength", label: "Strength", description: "Heavy compounds, 3-5 reps", color: "#ef4444" },
  { value: "hypertrophy", label: "Hypertrophy", description: "Mass building, 8-12 reps", color: "#f97316" },
  { value: "conditioning", label: "Conditioning", description: "Endurance and cardio", color: "#0dcef5" },
  { value: "striking", label: "Striking", description: "Bag work and combat", color: "#a855f7" },
  { value: "grappling", label: "Grappling", description: "Control, carries, and mat work", color: "#c084fc" },
  { value: "recovery", label: "Recovery", description: "Low intensity, sub-maximal", color: "#22c55e" },
  { value: "mobility", label: "Mobility", description: "Range, breath, and joint care", color: "#7cc79b" },
  { value: "skill_practice", label: "Skill Practice", description: "Technique-first combat practice", color: "#49a3a0" },
  { value: "commission", label: "Commission Duty", description: "Balanced field-ready work", color: "#d9ad63" },
  { value: "back_friendly_lower", label: "Back-Safe", description: "No spinal loading", color: "#eab308" },
];

const PHASE_COLORS: Record<string, string> = {
  warmup: "#3b82f6",
  main: "#ef4444",
  accessory: "#f97316",
  finisher: "#a855f7",
};

const PHASE_GROUPS: Array<{ key: string; label: string; color: string }> = [
  { key: "warmup", label: "Warm-Up", color: "#3b82f6" },
  { key: "main", label: "Main Lifts", color: "#ef4444" },
  { key: "accessory", label: "Accessories", color: "#f97316" },
  { key: "finisher", label: "Finisher", color: "#a855f7" },
];

type TrainingIntelligence = {
  profile: null | {
    summary?: string | null;
    progressiveOverloadReadiness?: string;
    recentProgressTrend?: string;
    fatigueTrend?: string;
    deloadRecommended?: boolean;
    strongestMovementPatterns?: string[];
    weakestMovementPatterns?: string[];
  };
  recommendations: Array<{
    exerciseId: number;
    exerciseName: string;
    movementPattern: string;
    label: string;
    trend: string;
    recommendationType: string;
    recommendedNextWeight?: number | null;
    recommendedNextReps?: number | null;
    recommendedNextSets?: number | null;
    weightUnit?: string;
    targetRpe?: number;
    recommendationReason: string;
    safetyNote?: string | null;
  }>;
};

function normalizeGoal(value?: string | string[]): Goal {
  const raw = Array.isArray(value) ? value[0] : value;
  const key = String(raw ?? "").toLowerCase();
  if (key.includes("grappl") || key.includes("control") || key.includes("subdue")) return "grappling";
  if (key.includes("commission") || key.includes("duty")) return "commission";
  if (key.includes("skill") || key.includes("practice")) return "skill_practice";
  if (key.includes("mobility") || key.includes("stretch")) return "mobility";
  if (key.includes("recover") || key.includes("mobility") || key.includes("nutrition") || key.includes("discipline")) return "recovery";
  if (key.includes("condition") || key.includes("cardio") || key.includes("walk") || key.includes("endurance")) return "conditioning";
  if (key.includes("strik") || key.includes("skill")) return "striking";
  if (key.includes("hypertrophy")) return "hypertrophy";
  if (key.includes("back")) return "back_friendly_lower";
  return "strength";
}

function ExerciseCard({ exercise, recommendation }: { exercise: PlanExercise; recommendation?: TrainingIntelligence["recommendations"][number] }) {
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
      {recommendation ? (
        <View style={s.progressionNote}>
          <Text style={s.progressionKicker}>{recommendation.label}</Text>
          <Text style={s.progressionText}>
            {recommendation.recommendedNextWeight
              ? `${recommendation.recommendedNextWeight}${recommendation.weightUnit ?? ""} next target. `
              : recommendation.recommendedNextReps
                ? `${recommendation.recommendedNextReps} reps next target. `
                : ""}
            {recommendation.recommendationReason}
          </Text>
          {recommendation.safetyNote ? <Text style={s.progressionSafety}>{recommendation.safetyNote}</Text> : null}
        </View>
      ) : null}
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

function ExerciseLookupPanel() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [results, setResults] = useState<ExerciseSearchResultExercisesItem[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const search = useSearchExercisesAi();

  const handleSearch = () => {
    const q = query.trim();
    if (!q) return;
    setSubmitted(q);
    setResults([]);
    setSource(null);
    search.mutate(
      { data: { query: q } },
      {
        onSuccess: (data) => {
          setResults(data.exercises ?? []);
          setSource(data.source);
        },
        onError: () => Alert.alert("Lookup failed", "Try a more specific exercise name or check your connection."),
      }
    );
  };

  return (
    <View style={s.lookupCard}>
      <View style={s.lookupHeader}>
        <View>
          <Text style={s.cardTitle}>Exercise Lookup</Text>
          <Text style={s.lookupMeta}>Find movements in the Guild library or retrieve them through the System.</Text>
        </View>
        {source ? <Text style={s.sourceBadge}>{source === "ai" ? "AI" : "Library"}</Text> : null}
      </View>
      <View style={s.lookupRow}>
        <TextInput
          style={s.lookupInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Bulgarian split squat..."
          placeholderTextColor="#6b5d4f"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={[s.lookupBtn, (!query.trim() || search.isPending) && { opacity: 0.55 }]}
          onPress={handleSearch}
          disabled={!query.trim() || search.isPending}
          activeOpacity={0.82}
        >
          {search.isPending ? <ActivityIndicator color="#0a0908" size="small" /> : <Text style={s.lookupBtnText}>Search</Text>}
        </TouchableOpacity>
      </View>
      {search.isPending ? (
        <View style={s.lookupState}>
          <ActivityIndicator color="#d9ad63" size="small" />
          <Text style={s.lookupStateText}>Consulting the System for "{submitted}"...</Text>
        </View>
      ) : null}
      {!search.isPending && submitted && results.length === 0 ? (
        <Text style={s.lookupEmpty}>No results for "{submitted}". Try another exercise name.</Text>
      ) : null}
      {results.length > 0 ? (
        <View style={s.resultStack}>
          {results.slice(0, 6).map((exercise) => (
            <View key={exercise.id} style={s.resultCard}>
              <View style={s.resultTop}>
                <Text style={s.resultCategory}>{exercise.category?.replace(/_/g, " ")}</Text>
                <Text style={s.resultMuscle}>{exercise.muscleGroup}</Text>
              </View>
              <Text style={s.resultName}>{exercise.name}</Text>
              {exercise.recommendedWeightKg != null && exercise.recommendedWeightKg > 0 ? (
                <Text style={s.resultWeight}>{exercise.recommendedWeightKg} kg recommended for you</Text>
              ) : null}
              {exercise.instructions ? <Text style={s.resultInstructions} numberOfLines={2}>{exercise.instructions}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function TrainingPlannerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ goal?: string; commissionNote?: string; commissionTitle?: string; autoGenerate?: string }>();
  const queryClient = useQueryClient();
  const [selectedGoal, setSelectedGoal] = useState<Goal>(() => normalizeGoal(params.goal));
  const [rpeLimit, setRpeLimit] = useState<number | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [intelligence, setIntelligence] = useState<TrainingIntelligence | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(true);
  const generatePlan = useGenerateWorkoutPlan();
  const savePlan = useSavePlanAsTemplate();
  const createSession = useCreateWorkoutSession();
  const { data: equipment } = useGetEquipment();
  const commissionNote = typeof params.commissionNote === "string" ? params.commissionNote : null;
  const commissionTitle = typeof params.commissionTitle === "string" ? params.commissionTitle : null;
  const groupedExercises = PHASE_GROUPS.map((phase) => ({
    ...phase,
    exercises: plan?.exercises.filter((exercise) => exercise.phase === phase.key) ?? [],
  }));
  const recommendationByName = useMemo(() => {
    const map = new Map<string, TrainingIntelligence["recommendations"][number]>();
    for (const rec of intelligence?.recommendations ?? []) {
      map.set(rec.exerciseName.toLowerCase(), rec);
    }
    return map;
  }, [intelligence]);

  useEffect(() => {
    let cancelled = false;
    setIntelligenceLoading(true);
    customFetch<TrainingIntelligence>("/api/training/intelligence")
      .then((data) => { if (!cancelled) setIntelligence(data); })
      .catch(() => { if (!cancelled) setIntelligence(null); })
      .finally(() => { if (!cancelled) setIntelligenceLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const generate = () => {
    generatePlan.mutate(
      { data: { goal: selectedGoal as any, rpeLimit: rpeLimit ?? undefined } },
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

  const autoGeneratedRef = React.useRef(false);
  useEffect(() => {
    if (params.autoGenerate !== "1" || autoGeneratedRef.current) return;
    autoGeneratedRef.current = true;
    generatePlan.mutate(
      { data: { goal: selectedGoal as any, rpeLimit: rpeLimit ?? undefined } },
      {
        onSuccess: (data) => setPlan(data),
        onError: () => Alert.alert("Generation failed", "Could not generate a plan. Check your equipment setup."),
      }
    );
  }, [params.autoGenerate, rpeLimit, selectedGoal]);

  const startGeneratedSession = () => {
    if (!plan) return;
    createSession.mutate(
      {
        data: {
          name: commissionTitle ? `${commissionTitle} - ${plan.planName}` : plan.planName,
          templateId: undefined as any,
          notes: [commissionNote, `Generated plan: ${plan.planName}. Focus: ${plan.goal}.`].filter(Boolean).join("\n"),
        },
      },
      {
        onSuccess: (session: any) => {
          queryClient.invalidateQueries({ queryKey: ["/api/workouts/sessions"] });
          router.push(`/training/session/${session.id}` as any);
        },
        onError: () => Alert.alert("Session failed", "Could not start this generated commission session."),
      },
    );
  };

  const equipmentCount = Array.isArray(equipment) ? equipment.length : Object.values(equipment ?? {}).filter(Boolean).length;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }}>
      <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>Back to Training Yard</Text></TouchableOpacity>
      <Text style={s.kicker}>GUILD DRILL PLANNER</Text>
      <Text style={s.title}>Workout Planner</Text>
      <Text style={s.subtitle}>{commissionTitle ? `Commission route: ${commissionTitle}` : "Equipment-aware plan generation."}</Text>

      <View style={s.intelligenceCard}>
        <Text style={s.intelligenceKicker}>SYSTEM OBSERVATION</Text>
        <Text style={s.intelligenceTitle}>
          {intelligenceLoading
            ? "Reading the Hall's Training Ledger..."
            : intelligence?.profile?.deloadRecommended
              ? "Recovery Before Progression"
              : intelligence?.profile?.progressiveOverloadReadiness === "ready"
                ? "Progression Watch Active"
                : "Observation Phase"}
        </Text>
        <Text style={s.intelligenceText}>
          {intelligenceLoading
            ? "The System is reviewing recent sessions without interrupting your training."
            : intelligence?.profile?.summary ?? "Insufficient history to recommend progression. Complete two more sessions before the System adjusts a lift."}
        </Text>
        {!intelligenceLoading && intelligence?.recommendations?.[0] ? (
          <View style={s.intelligenceHighlight}>
            <Text style={s.intelligenceHighlightLabel}>Aldric's mark</Text>
            <Text style={s.intelligenceHighlightText}>
              {intelligence.recommendations[0].exerciseName}: {intelligence.recommendations[0].label}
            </Text>
          </View>
        ) : null}
      </View>

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
              <TouchableOpacity style={[s.primaryPlanBtn, createSession.isPending && { opacity: 0.65 }]} onPress={startGeneratedSession} disabled={createSession.isPending}>
                {createSession.isPending ? <ActivityIndicator color="#0a0908" size="small" /> : <Text style={s.primaryPlanText}>{commissionNote ? "Start Commission Session" : "Start Session"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
          {plan.rpeGuide?.note ? <Text style={s.guide}>{plan.rpeGuide.note}</Text> : null}
          {groupedExercises.map((phase) => phase.exercises.length > 0 ? (
            <View key={phase.key} style={s.phaseSection}>
              <View style={s.phaseHeader}>
                <View style={[s.phaseDot, { backgroundColor: phase.color }]} />
                <Text style={[s.phaseTitle, { color: phase.color }]}>{phase.label}</Text>
              </View>
              {phase.exercises.map((exercise, index) => (
                <ExerciseCard
                  key={`${phase.key}-${exercise.exerciseName}-${index}`}
                  exercise={exercise}
                  recommendation={recommendationByName.get(exercise.exerciseName.toLowerCase())}
                />
              ))}
            </View>
          ) : null)}
          {!plan.hasBiometrics && (
            <TouchableOpacity style={s.profileNudge} onPress={() => router.push("/profile" as any)} activeOpacity={0.82}>
              <View style={s.profileNudgeIcon}>
                <Text style={s.profileNudgeIconText}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.profileNudgeTitle}>Set up your Adventurer Profile</Text>
                <Text style={s.profileNudgeText}>Add strength marks and biometrics for better working-weight recommendations.</Text>
              </View>
              <Text style={s.profileNudgeArrow}>Open</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!plan && !generatePlan.isPending && (
        <TouchableOpacity style={s.emptyNudge} onPress={() => router.push("/profile" as any)} activeOpacity={0.82}>
          <Text style={s.emptyNudgeTitle}>Set up Adventurer Profile first</Text>
          <Text style={s.emptyNudgeText}>Strength marks help the planner recommend useful loads instead of generic sessions.</Text>
        </TouchableOpacity>
      )}

      <ExerciseLookupPanel />
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
  intelligenceCard: { borderWidth: 1, borderColor: "#235e66", backgroundColor: "#071615", padding: 14, marginBottom: 12 },
  intelligenceKicker: { color: "#7ddce4", fontSize: 9, letterSpacing: 2.4, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  intelligenceTitle: { color: "#eee5d7", fontSize: 18, fontFamily: "PlayfairDisplay_700Bold", marginTop: 5 },
  intelligenceText: { color: "#b6aa9c", fontSize: 12, lineHeight: 18, marginTop: 7 },
  intelligenceHighlight: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#14100b", padding: 10, marginTop: 10 },
  intelligenceHighlightLabel: { color: "#9d8f80", fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  intelligenceHighlightText: { color: "#d9ad63", fontSize: 12, lineHeight: 17, marginTop: 4, fontFamily: "Inter_700Bold" },
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
  planActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: "#6b4d2f", padding: 10, alignItems: "center" },
  secondaryText: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  primaryPlanBtn: { width: "100%", borderWidth: 1, borderColor: "#8be2df", backgroundColor: "#49a3a0", padding: 12, alignItems: "center" },
  primaryPlanText: { color: "#061010", fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  guide: { color: "#9f9586", fontSize: 11, lineHeight: 16, borderLeftWidth: 2, borderLeftColor: "#6b4d2f", paddingLeft: 10 },
  phaseSection: { gap: 8 },
  phaseHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 2 },
  phaseDot: { width: 8, height: 8, borderRadius: 4 },
  phaseTitle: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.6 },
  exerciseCard: { borderWidth: 1, backgroundColor: "#11100e", padding: 12 },
  exerciseTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  phasePill: { borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2, fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  muscle: { color: "#8f887d", fontSize: 9, textTransform: "uppercase" },
  exerciseName: { color: "#eee5d7", fontSize: 14, fontFamily: "Inter_700Bold" },
  exerciseMeta: { color: "#8f887d", fontSize: 11, marginTop: 4 },
  weight: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold", marginTop: 5 },
  progressionNote: { borderWidth: 1, borderColor: "#235e66", backgroundColor: "#071615", padding: 9, marginTop: 8 },
  progressionKicker: { color: "#7ddce4", fontSize: 9, letterSpacing: 1.3, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  progressionText: { color: "#cfc5b8", fontSize: 11, lineHeight: 16, marginTop: 4 },
  progressionSafety: { color: "#f09983", fontSize: 10, lineHeight: 15, marginTop: 5 },
  notes: { color: "#9f9586", fontSize: 11, lineHeight: 16, marginTop: 5, fontStyle: "italic" },
  subBox: { borderTopWidth: 1, borderTopColor: "#2a2520", marginTop: 8, paddingTop: 8 },
  subTitle: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", marginBottom: 4 },
  subText: { color: "#cfc5b8", fontSize: 11, lineHeight: 16 },
  profileNudge: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#8c6a36", backgroundColor: "#18130d", padding: 12 },
  profileNudgeIcon: { width: 28, height: 28, borderWidth: 1, borderColor: "#eab30866", backgroundColor: "#241b08", alignItems: "center", justifyContent: "center" },
  profileNudgeIconText: { color: "#eab308", fontSize: 15, fontFamily: "Inter_700Bold" },
  profileNudgeTitle: { color: "#eab308", fontSize: 12, fontFamily: "Inter_700Bold" },
  profileNudgeText: { color: "#b9a36d", fontSize: 10, lineHeight: 15, marginTop: 2 },
  profileNudgeArrow: { color: "#d9ad63", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  emptyNudge: { borderWidth: 1, borderStyle: "dashed", borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 14, marginBottom: 14 },
  emptyNudgeTitle: { color: "#d9ad63", fontSize: 13, fontFamily: "Inter_700Bold" },
  emptyNudgeText: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 4 },
  lookupCard: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 14, marginTop: 14 },
  lookupHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  lookupMeta: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: -4, maxWidth: 260 },
  sourceBadge: { color: "#49a3a0", borderWidth: 1, borderColor: "#235e66", backgroundColor: "#071615", paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  lookupRow: { flexDirection: "row", gap: 8 },
  lookupInput: { flex: 1, borderWidth: 1, borderColor: "#2a2520", backgroundColor: "#0c0b09", color: "#eee5d7", minHeight: 42, paddingHorizontal: 10, fontSize: 13 },
  lookupBtn: { minWidth: 82, backgroundColor: "#d9ad63", borderWidth: 1, borderColor: "#f0c77a", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  lookupBtnText: { color: "#0a0908", fontSize: 11, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  lookupState: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#18130d", padding: 10, marginTop: 10 },
  lookupStateText: { color: "#d8c4a5", fontSize: 11, flex: 1 },
  lookupEmpty: { color: "#8f887d", fontSize: 11, textAlign: "center", marginTop: 12 },
  resultStack: { gap: 8, marginTop: 12 },
  resultCard: { borderWidth: 1, borderColor: "#2a2520", backgroundColor: "#0c0b09", padding: 10 },
  resultTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  resultCategory: { color: "#d9ad63", borderWidth: 1, borderColor: "#6b4d2f", paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  resultMuscle: { color: "#8f887d", fontSize: 9, textTransform: "uppercase" },
  resultName: { color: "#eee5d7", fontSize: 13, fontFamily: "Inter_700Bold" },
  resultWeight: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold", marginTop: 5 },
  resultInstructions: { color: "#9f9586", fontSize: 11, lineHeight: 16, marginTop: 5 },
});
