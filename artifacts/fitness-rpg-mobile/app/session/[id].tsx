import {
  customFetch,
  useGetWorkoutSession,
  useLogSet,
  useUpdateWorkoutSession,
  WorkoutSetInputWeightUnit,
  WorkoutSessionUpdateNarrativeIntensity,
} from "@workspace/api-client-react";
import { loadMobileSettings, type WeightUnit } from "@/utils/mobile-settings";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
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

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface CompletionData {
  xpEarned: number;
  goldEarned: number;
  durationMinutes: number;
  prCount: number;
  totalSets: number;
  combatReplay: any;
  sessionName: string;
  missionClaimed?: {
    title?: string;
    xpReward?: number;
    goldReward?: number;
  } | null;
}

type ExerciseProgressionRecommendation = {
  exerciseId: number;
  exerciseName: string;
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
};

const STYLE_META: Record<string, { label: string; color: string }> = {
  strength: { label: "Iron Vanguard", color: "#ef4444" },
  striking: { label: "Storm Duelist", color: "#f97316" },
  conditioning: { label: "Wayfarer", color: "#0dcef5" },
  grappling: { label: "Chainwarden", color: "#c084fc" },
  recovery: { label: "Verdant Guardian", color: "#22c55e" },
  discipline: { label: "Runesage", color: "#eab308" },
};

function convertWeight(value: number, from: string | null | undefined, to: WeightUnit) {
  if (from === to) return value;
  if (from === "kg" && to === "lbs") return Math.round(value * 2.20462 * 10) / 10;
  if (from === "lbs" && to === "kg") return Math.round((value / 2.20462) * 10) / 10;
  return value;
}

function CombatReplayModal({
  data,
  visible,
  onClose,
}: {
  data: CompletionData;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [revealedCount, setRevealedCount] = useState(0);
  const replay = data.combatReplay;
  const events: Array<{ text: string; type: string }> = replay?.events ?? [];
  const styleScores = replay?.styleScores && typeof replay.styleScores === "object"
    ? replay.styleScores as Record<string, number>
    : {};
  const styleRows = Object.entries(STYLE_META)
    .map(([key, meta]) => ({
      key,
      ...meta,
      value: Math.max(0, Math.min(100, Number(styleScores[key] ?? 0))),
    }))
    .filter((row) => row.value > 0);
  const gearDrop = replay?.gearDrop;
  const raidImpact = replay?.raidImpact;
  const narrativeConsequence = replay?.narrativeConsequence;

  useEffect(() => {
    if (!visible) { setRevealedCount(0); return; }
    const t = setTimeout(() => setRevealedCount(0), 100);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (!visible || revealedCount >= events.length) return;
    const t = setTimeout(() => setRevealedCount((c) => c + 1), 700);
    return () => clearTimeout(t);
  }, [visible, revealedCount, events.length]);

  const allRevealed = revealedCount >= events.length;

  const VERDICT_COLOR: Record<string, string> = {
    "Victory": "#ffbf00",
    "Narrow Victory": "#0dcef5",
    "Strategic Retreat": "#f97316",
    "Training Complete": "#22c55e",
  };
  const verdictColor = VERDICT_COLOR[replay?.verdict] ?? "#22c55e";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={[s.replayBg, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView
          contentContainerStyle={s.replayScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={s.replayLabel}>BATTLE REPORT</Text>
          <Text style={s.replayTitle}>{replay?.encounterName ?? "Battle Complete"}</Text>
          <Text style={s.replayEnemy}>vs. {replay?.enemyName ?? data.sessionName}</Text>

          {/* Narrative events */}
          {events.slice(0, revealedCount).map((ev, i) => (
            <View key={i} style={s.eventCard}>
              <Text style={s.eventText}>{ev.text}</Text>
            </View>
          ))}
          {!allRevealed && events.length > 0 && (
            <View style={s.dotsRow}>
              <Text style={s.dots}>• • •</Text>
            </View>
          )}

          {/* Stats — show after all events */}
          {(allRevealed || events.length === 0) && (
            <View style={s.statsBlock}>
              <View style={s.statsRow}>
                <View style={[s.statCard, { borderColor: "#0dcef540" }]}>
                  <Text style={[s.statIcon]}>⚡</Text>
                  <Text style={[s.statValue, { color: "#0dcef5" }]}>+{data.xpEarned}</Text>
                  <Text style={s.statLabel}>XP Earned</Text>
                </View>
                <View style={[s.statCard, { borderColor: "#ffbf0040" }]}>
                  <Text style={s.statIcon}>🪙</Text>
                  <Text style={[s.statValue, { color: "#ffbf00" }]}>+{data.goldEarned}</Text>
                  <Text style={s.statLabel}>Gold</Text>
                </View>
              </View>

              <View style={s.miniStatsRow}>
                <View style={s.miniStat}>
                  <Text style={s.miniStatValue}>{data.durationMinutes}m</Text>
                  <Text style={s.miniStatLabel}>Duration</Text>
                </View>
                <View style={s.miniStat}>
                  <Text style={s.miniStatValue}>{data.totalSets}</Text>
                  <Text style={s.miniStatLabel}>Sets</Text>
                </View>
                <View style={s.miniStat}>
                  <Text style={[s.miniStatValue, { color: "#ffbf00" }]}>{data.prCount}</Text>
                  <Text style={s.miniStatLabel}>PRs</Text>
                </View>
              </View>

              {styleRows.length > 0 && (
                <View style={s.styleBreakdown}>
                  <Text style={s.panelKicker}>COMBAT STYLE</Text>
                  <Text style={s.panelTitle}>{replay?.playerArchetype ?? "Earned Archetype"}</Text>
                  {styleRows.map((row) => (
                    <View key={row.key} style={s.styleRow}>
                      <Text style={[s.styleLabel, { color: row.color }]}>{row.label}</Text>
                      <View style={s.styleTrack}>
                        <View style={[s.styleFill, { width: `${row.value}%`, backgroundColor: row.color }]} />
                      </View>
                      <Text style={s.stylePct}>{row.value}%</Text>
                    </View>
                  ))}
                </View>
              )}

              {gearDrop && (
                <View style={s.replayInfoCard}>
                  <Text style={s.panelKicker}>DISCOVERED RELIC</Text>
                  <Text style={s.replayInfoTitle}>{gearDrop.name ?? "Uncatalogued Gear"}</Text>
                  <Text style={s.replayInfoText}>
                    {gearDrop.description ?? "The Chronicle records this discovery even if it is later sold, salvaged, or replaced."}
                  </Text>
                </View>
              )}

              {data.missionClaimed && (
                <View style={s.missionCard}>
                  <Text style={s.panelKicker}>COMMISSION REWARD</Text>
                  <Text style={s.replayInfoTitle}>
                    {data.missionClaimed.title ?? "Guild duty completed"}
                  </Text>
                  <View style={s.missionRewards}>
                    <Text style={s.missionRewardText}>+{data.missionClaimed.xpReward ?? 0} XP</Text>
                    <Text style={s.missionRewardText}>+{data.missionClaimed.goldReward ?? 0} Gold</Text>
                  </View>
                </View>
              )}

              {raidImpact && (
                <View style={s.replayInfoCard}>
                  <Text style={s.panelKicker}>CAMPAIGN PRESSURE</Text>
                  <Text style={s.replayInfoTitle}>
                    {raidImpact.title ?? "The Guild records the result"}
                  </Text>
                  <Text style={s.replayInfoText}>
                    {raidImpact.description ?? "Your field work has been added to the campaign ledger."}
                  </Text>
                </View>
              )}

              {narrativeConsequence && (
                <View style={s.replayInfoCard}>
                  <Text style={s.panelKicker}>CHRONICLE MARK</Text>
                  <Text style={s.replayInfoTitle}>
                    {narrativeConsequence.title ?? "A consequence is recorded"}
                  </Text>
                  <Text style={s.replayInfoText}>
                    {narrativeConsequence.description ?? String(narrativeConsequence)}
                  </Text>
                </View>
              )}

              <View style={[s.verdictBadge, { borderColor: verdictColor + "60" }]}>
                <Text style={[s.verdictText, { color: verdictColor }]}>
                  {replay?.verdict ?? "Training Complete"}
                </Text>
              </View>

              <TouchableOpacity style={s.returnBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={s.returnBtnText}>RETURN TO THE HALL</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ActiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = parseInt(id ?? "0", 10);
  const router = useRouter();
  const queryClient = useQueryClient();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [openExId, setOpenExId] = useState<number | null>(null);
  const [weight, setWeight] = useState("45");
  const [reps, setReps] = useState("10");
  const [rpe, setRpe] = useState("8");
  const [restSecs, setRestSecs] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [prFlash, setPrFlash] = useState<number | null>(null);
  const [completion, setCompletion] = useState<CompletionData | null>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("lbs");
  const [progressionRecs, setProgressionRecs] = useState<Map<number, ExerciseProgressionRecommendation>>(new Map());
  const [narrativeIntensity, setNarrativeIntensity] =
    useState<WorkoutSessionUpdateNarrativeIntensity>(WorkoutSessionUpdateNarrativeIntensity.balanced);

  useEffect(() => {
    let mounted = true;
    loadMobileSettings()
      .then((settings) => {
        if (!mounted) return;
        setWeightUnit(settings.weightUnit);
        if (
          settings.narrativeMode === WorkoutSessionUpdateNarrativeIntensity.technical ||
          settings.narrativeMode === WorkoutSessionUpdateNarrativeIntensity.balanced ||
          settings.narrativeMode === WorkoutSessionUpdateNarrativeIntensity.immersive
        ) {
          setNarrativeIntensity(settings.narrativeMode as WorkoutSessionUpdateNarrativeIntensity);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: session, isLoading } = useGetWorkoutSession(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: ["/api/workouts/sessions", sessionId],
      refetchInterval: false,
    },
  });

  const logSet = useLogSet();
  const finishSession = useUpdateWorkoutSession();

  useEffect(() => {
    let cancelled = false;
    customFetch<{ recommendations: ExerciseProgressionRecommendation[] }>("/api/training/intelligence")
      .then((data) => {
        if (cancelled) return;
        setProgressionRecs(new Map((data.recommendations ?? []).map((rec) => [rec.exerciseId, rec])));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (!session?.startedAt) return;
    const startMs = new Date(session.startedAt).getTime();
    elapsedRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [session?.startedAt]);

  // Rest timer
  useEffect(() => {
    if (restRef.current) clearInterval(restRef.current);
    if (restSecs <= 0) return;
    restRef.current = setInterval(() => {
      setRestSecs((prev) => {
        if (prev <= 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, [restSecs > 0]);

  const setsByExercise = useMemo(() => {
    const map = new Map<number, NonNullable<typeof session>["sets"]>();
    if (!session) return map;
    for (const set of session.sets) {
      if (!map.has(set.exerciseId)) map.set(set.exerciseId, []);
      map.get(set.exerciseId)!.push(set);
    }
    return map;
  }, [session?.sets]);

  const exercises = useMemo(() => {
    if (!session) return [];
    if (session.templateExercises && session.templateExercises.length > 0) {
      return session.templateExercises as Array<{
        exerciseId?: number; name?: string; sets?: number; reps?: string; muscleGroup?: string;
      }>;
    }
    const seen = new Set<number>();
    return session.sets
      .filter((s) => { if (seen.has(s.exerciseId)) return false; seen.add(s.exerciseId); return true; })
      .map((s) => ({ exerciseId: s.exerciseId, name: s.exerciseName, sets: 3, reps: "10", muscleGroup: undefined }));
  }, [session?.templateExercises, session?.sets]);

  // Prefill inputs when opening an exercise
  useEffect(() => {
    if (!openExId || !session) return;
    const exSets = setsByExercise.get(openExId) ?? [];
    if (exSets.length > 0) {
      const last = exSets[exSets.length - 1];
      setWeight(String(convertWeight(Number(last.weight), (last as any).weightUnit, weightUnit)));
      setReps(String(last.reps));
      setRpe(String((last as any).rpe ?? 8));
    } else {
      const rec = progressionRecs.get(openExId);
      if (rec?.recommendedNextWeight != null && rec.recommendedNextWeight > 0) {
        setWeight(String(convertWeight(Number(rec.recommendedNextWeight), rec.weightUnit, weightUnit)));
      } else {
        setWeight(weightUnit === "kg" ? "20" : "45");
      }
      if (rec?.recommendedNextReps != null && rec.recommendedNextReps > 0) {
        setReps(String(rec.recommendedNextReps));
      }
      if (rec?.targetRpe != null) {
        setRpe(String(Math.round(rec.targetRpe)));
      }
      const tmpl = exercises.find((e) => e.exerciseId === openExId);
      if (!rec?.recommendedNextReps && tmpl?.reps) {
        const m = String(tmpl.reps).match(/\d+/);
        if (m) setReps(m[0]);
      }
    }
  }, [openExId, weightUnit, progressionRecs]);

  const handleLogSet = (exerciseId: number) => {
    Keyboard.dismiss();
    const exSets = setsByExercise.get(exerciseId) ?? [];
    logSet.mutate(
      {
        id: sessionId,
        data: {
          exerciseId,
          setNumber: exSets.length + 1,
          reps: parseInt(reps, 10) || 1,
          weight: parseFloat(weight) || 0,
          weightUnit: weightUnit as WorkoutSetInputWeightUnit,
          rpe: Math.max(1, Math.min(10, parseInt(rpe, 10) || 8)),
        },
      },
      {
        onSuccess: (newSet) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setRestSecs(90);
          setOpenExId(null);
          queryClient.invalidateQueries({ queryKey: ["/api/workouts/sessions", sessionId] });
          if ((newSet as any).isPr) {
            setPrFlash(exerciseId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => setPrFlash(null), 3000);
          }
        },
        onError: () => {
          Alert.alert("Error", "Could not log set. Try again.");
        },
      }
    );
  };

  const handleFinish = () => {
    Alert.alert(
      "⚔️ Finish Battle?",
      "This will complete your session and generate your combat report.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          style: "destructive",
          onPress: () => {
            finishSession.mutate(
              {
                id: sessionId,
                data: {
                  status: "completed",
                  narrativeIntensity,
                },
              },
              {
                onSuccess: (data: any) => {
                  queryClient.invalidateQueries({ queryKey: ["/api/workouts/sessions"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/player"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/battle-log"] });
                  const prCount = session?.sets.filter((s: any) => s.isPr).length ?? 0;
                  setCompletion({
                    xpEarned: data.xpEarned ?? 0,
                    goldEarned: data.goldEarned ?? 0,
                    durationMinutes: data.session?.durationMinutes ?? Math.floor(elapsedSec / 60),
                    prCount,
                    totalSets: session?.sets.length ?? 0,
                    combatReplay: data.combatReplay ?? null,
                    sessionName: session?.name ?? "Battle",
                    missionClaimed: data.missionClaimed ?? null,
                  });
                  setShowReplay(true);
                },
                onError: () => {
                  Alert.alert("Error", "Could not complete session.");
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleReplayClose = () => {
    setShowReplay(false);
    router.back();
  };

  const totalPlanned = exercises.reduce((n, e) => n + (e.sets ?? 3), 0);
  const totalLogged = session?.sets.length ?? 0;
  const progress = totalPlanned > 0 ? totalLogged / totalPlanned : 0;

  if (isLoading) {
    return (
      <View style={[s.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[s.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.mutedForeground }}>Session not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Text style={[s.backText, { color: colors.mutedForeground }]}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {session.name}
          </Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
            Combat in progress
          </Text>
        </View>
        <View style={s.elapsedBlock}>
          <Text style={[s.elapsedTime, { color: colors.primary }]}>{formatTime(elapsedSec)}</Text>
          <Text style={[s.elapsedLabel, { color: colors.mutedForeground }]}>ELAPSED</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[s.progressRow, { paddingHorizontal: 16, paddingTop: 8 }]}>
        <Text style={[s.progressLabel, { color: colors.mutedForeground }]}>
          {totalLogged} / {totalPlanned} sets
        </Text>
        <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[s.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]}
          />
        </View>
        <Text style={{ color: "#f97316", fontSize: 14 }}>🔥</Text>
      </View>

      {/* Rest Timer */}
      {restSecs > 0 && (
        <View style={[s.restCard, { backgroundColor: "#ffbf0014", borderColor: "#ffbf0040", marginHorizontal: 16, marginTop: 8 }]}>
          <Text style={s.restLabel}>⏱ Resting...</Text>
          <Text style={s.restTime}>{formatTime(restSecs)}</Text>
          <TouchableOpacity onPress={() => setRestSecs(0)} hitSlop={8}>
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Exercise List */}
      <FlatList
        data={exercises}
        keyExtractor={(ex) => String(ex.exerciseId ?? 0)}
        contentContainerStyle={[
          s.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: ex }) => {
          const exId = ex.exerciseId ?? 0;
          const exSets = setsByExercise.get(exId) ?? [];
          const planned = ex.sets ?? 3;
          const done = exSets.length;
          const isComplete = done >= planned;
          const isOpen = openExId === exId;
          const isPrEx = prFlash === exId;
          const progression = progressionRecs.get(exId);

          let borderColor = colors.border;
          let bgColor = colors.card;
          if (isPrEx) { borderColor = "#ffbf0060"; bgColor = "#ffbf0010"; }
          else if (isComplete) { borderColor = "#22c55e30"; bgColor = "#22c55e08"; }
          else if (isOpen) { borderColor = colors.primary + "60"; bgColor = colors.primary + "08"; }

          return (
            <View style={[s.exCard, { borderColor, backgroundColor: bgColor }]}>
              {/* Exercise header row */}
              <TouchableOpacity
                style={s.exHeader}
                onPress={() => setOpenExId(isOpen ? null : exId)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <View style={s.exTitleRow}>
                    <Text style={{ fontSize: 16, marginRight: 6 }}>
                      {isComplete ? "✅" : "⚔️"}
                    </Text>
                    <Text style={[s.exName, { color: colors.foreground }]} numberOfLines={1}>
                      {ex.name ?? `Exercise ${exId}`}
                    </Text>
                    {isPrEx && (
                      <View style={s.prBadge}>
                        <Text style={s.prBadgeText}>⭐ PR!</Text>
                      </View>
                    )}
                  </View>
                  {(ex.muscleGroup || ex.reps) && (
                    <Text style={[s.exMeta, { color: colors.mutedForeground }]}>
                      {ex.muscleGroup ? `${ex.muscleGroup} · ` : ""}{planned} × {ex.reps ?? "—"} reps
                    </Text>
                  )}
                  {progression ? (
                    <Text style={[s.progressionInline, { color: progression.recommendationType === "recovery" || progression.recommendationType === "deload" ? "#f09983" : "#7ddce4" }]}>
                      {progression.label}: {progression.trend.replace(/_/g, " ")}
                    </Text>
                  ) : null}
                </View>
                <Text style={[s.exCount, { color: isComplete ? "#22c55e" : colors.primary }]}>
                  {done}/{planned}
                </Text>
              </TouchableOpacity>

              {/* Completed sets */}
              {exSets.length > 0 && (
                <View style={s.setsList}>
                  {exSets.map((set, i) => (
                    <View key={set.id} style={[s.setRow, { backgroundColor: colors.background }]}>
                      <Text style={[s.setNum, { color: colors.mutedForeground }]}>{i + 1}.</Text>
                      <Text style={[s.setWeight, { color: colors.foreground }]}>
                        {set.weight}{set.weightUnit} × {set.reps}
                      </Text>
                      {(set as any).rpe && (
                        <Text style={[s.setRpe, { color: colors.mutedForeground }]}>RPE {(set as any).rpe}</Text>
                      )}
                      {(set as any).isPr && (
                        <View style={s.prMini}>
                          <Text style={s.prMiniText}>⭐ PR</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Log input — expanded */}
              {isOpen && (
                <View style={[s.inputBlock, { borderTopColor: colors.border }]}>
                  {progression ? (
                    <View style={s.progressionBox}>
                      <Text style={s.progressionBoxKicker}>ALDRIC'S TRAINING NOTE</Text>
                      <Text style={s.progressionBoxTitle}>{progression.label}</Text>
                      <Text style={s.progressionBoxText}>{progression.recommendationReason}</Text>
                      {progression.safetyNote ? <Text style={s.progressionBoxSafety}>{progression.safetyNote}</Text> : null}
                    </View>
                  ) : null}
                  <View style={s.inputRow}>
                    <View style={s.inputGroup}>
                      <Text style={[s.inputLabel, { color: colors.mutedForeground }]}>WEIGHT ({weightUnit})</Text>
                      <TextInput
                        style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={weight}
                        onChangeText={setWeight}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        returnKeyType="next"
                      />
                    </View>
                    <View style={s.inputGroup}>
                      <Text style={[s.inputLabel, { color: colors.mutedForeground }]}>REPS</Text>
                      <TextInput
                        style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={reps}
                        onChangeText={setReps}
                        keyboardType="number-pad"
                        selectTextOnFocus
                        returnKeyType="done"
                        onSubmitEditing={() => handleLogSet(exId)}
                      />
                    </View>
                    <View style={s.rpeInputGroup}>
                      <Text style={[s.inputLabel, { color: colors.mutedForeground }]}>RPE</Text>
                      <TextInput
                        style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={rpe}
                        onChangeText={setRpe}
                        keyboardType="number-pad"
                        maxLength={2}
                        selectTextOnFocus
                        returnKeyType="done"
                        onSubmitEditing={() => handleLogSet(exId)}
                      />
                    </View>
                  </View>
                  <View style={s.logBtnRow}>
                    <TouchableOpacity
                      style={[s.logBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "18" }]}
                      onPress={() => handleLogSet(exId)}
                      disabled={logSet.isPending}
                      activeOpacity={0.8}
                    >
                      {logSet.isPending ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={[s.logBtnText, { color: colors.primary }]}>＋ LOG SET</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.cancelBtn, { borderColor: colors.border }]}
                      onPress={() => setOpenExId(null)}
                    >
                      <Text style={[s.cancelBtnText, { color: colors.mutedForeground }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Quick "Add Set" button when closed and incomplete */}
              {!isOpen && !isComplete && (
                <TouchableOpacity
                  style={[s.addSetBtn, { borderColor: colors.primary + "30" }]}
                  onPress={() => setOpenExId(exId)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.addSetText, { color: colors.primary + "aa" }]}>＋ Add Set</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {/* Finish button */}
      <View
        style={[
          s.finishBar,
          { paddingBottom: insets.bottom + 8, borderTopColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity
          style={[s.finishBtn, finishSession.isPending && { opacity: 0.6 }]}
          onPress={handleFinish}
          disabled={finishSession.isPending}
          activeOpacity={0.8}
        >
          {finishSession.isPending ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Text style={s.finishBtnText}>✓ FINISH BATTLE</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Combat Replay Modal */}
      {completion && (
        <CombatReplayModal
          data={completion}
          visible={showReplay}
          onClose={handleReplayClose}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { paddingBottom: 2 },
  backText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  elapsedBlock: { alignItems: "flex-end", paddingBottom: 2 },
  elapsedTime: { fontSize: 20, fontFamily: "Inter_700Bold" },
  elapsedLabel: { fontSize: 8, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressLabel: { fontSize: 10, fontFamily: "Inter_500Medium", width: 70 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  restCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  restLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#ffbf00" },
  restTime: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#ffbf00" },
  skipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#888" },
  list: { padding: 16, gap: 10 },
  exCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  exHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 8,
  },
  exTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  exName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  exMeta: { fontSize: 10, fontFamily: "Inter_400Regular", marginLeft: 22 },
  progressionInline: { fontSize: 10, fontFamily: "Inter_700Bold", marginLeft: 22, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.8 },
  exCount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  prBadge: {
    backgroundColor: "#ffbf0020",
    borderWidth: 1,
    borderColor: "#ffbf0060",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  prBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#ffbf00" },
  setsList: { paddingHorizontal: 14, paddingBottom: 8, gap: 4 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  setNum: { fontSize: 11, fontFamily: "Inter_500Medium", width: 18 },
  setWeight: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  setRpe: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  prMini: {
    backgroundColor: "#ffbf0015",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  prMiniText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#ffbf00" },
  inputBlock: {
    borderTopWidth: 1,
    padding: 14,
    gap: 10,
  },
  progressionBox: { borderWidth: 1, borderColor: "#235e66", backgroundColor: "#071615", padding: 10, borderRadius: 8 },
  progressionBoxKicker: { color: "#7ddce4", fontSize: 9, letterSpacing: 1.4, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  progressionBoxTitle: { color: "#d9ad63", fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 4 },
  progressionBoxText: { color: "#d8c4a5", fontSize: 11, lineHeight: 16, marginTop: 4 },
  progressionBoxSafety: { color: "#f09983", fontSize: 10, lineHeight: 15, marginTop: 5 },
  inputRow: { flexDirection: "row", gap: 10 },
  inputGroup: { flex: 1, gap: 4 },
  rpeInputGroup: { width: 74, gap: 4 },
  inputLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    height: 52,
  },
  logBtnRow: { flexDirection: "row", gap: 8 },
  logBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  logBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  cancelBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 16 },
  addSetBtn: {
    borderTopWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  addSetText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  finishBar: {
    borderTopWidth: 1,
    padding: 12,
    paddingHorizontal: 16,
  },
  finishBtn: {
    backgroundColor: "#ef444418",
    borderWidth: 1,
    borderColor: "#ef444460",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  finishBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#ef4444",
    letterSpacing: 1.5,
  },
  // Combat Replay Modal
  replayBg: {
    flex: 1,
    backgroundColor: "#050608",
  },
  replayScroll: {
    padding: 24,
    paddingTop: 32,
    gap: 12,
    alignItems: "stretch",
  },
  replayLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#0dcef5",
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 4,
  },
  replayTitle: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
    lineHeight: 38,
  },
  replayEnemy: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  eventCard: {
    backgroundColor: "#ffffff08",
    borderWidth: 1,
    borderColor: "#ffffff10",
    borderRadius: 12,
    padding: 14,
  },
  eventText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#e0e0e0",
    lineHeight: 21,
  },
  dotsRow: { alignItems: "center", paddingVertical: 8 },
  dots: { fontSize: 16, color: "#444", letterSpacing: 4 },
  statsBlock: { gap: 12, marginTop: 8 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666" },
  miniStatsRow: { flexDirection: "row", gap: 10 },
  miniStat: {
    flex: 1,
    backgroundColor: "#ffffff06",
    borderWidth: 1,
    borderColor: "#ffffff10",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 3,
  },
  miniStatValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  miniStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#555" },
  styleBreakdown: {
    borderWidth: 1,
    borderColor: "#b58a4a55",
    backgroundColor: "#120d08cc",
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  panelKicker: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#b58a4a",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  panelTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#f6d08a",
    marginBottom: 2,
  },
  styleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  styleLabel: {
    width: 118,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  styleTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#ffffff14",
    overflow: "hidden",
    borderRadius: 99,
  },
  styleFill: {
    height: 6,
    borderRadius: 99,
  },
  stylePct: {
    width: 34,
    textAlign: "right",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#d6c2a0",
  },
  replayInfoCard: {
    borderWidth: 1,
    borderColor: "#6f4b2a88",
    backgroundColor: "#090807",
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  replayInfoTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#f2c36b",
  },
  replayInfoText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#c8bfae",
    lineHeight: 18,
  },
  missionCard: {
    borderWidth: 1,
    borderColor: "#22c55e55",
    backgroundColor: "#07120bcc",
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  missionRewards: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  missionRewardText: {
    borderWidth: 1,
    borderColor: "#22c55e44",
    backgroundColor: "#22c55e12",
    color: "#86efac",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verdictBadge: {
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#ffffff06",
    paddingVertical: 14,
    alignItems: "center",
  },
  verdictText: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  returnBtn: {
    backgroundColor: "#0dcef520",
    borderWidth: 1,
    borderColor: "#0dcef550",
    borderRadius: 12,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  returnBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#0dcef5",
    letterSpacing: 2,
  },
});

