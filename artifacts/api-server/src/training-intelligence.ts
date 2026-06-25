import { db } from "@workspace/db";
import {
  exerciseProgressionsTable,
  exercisesTable,
  playerBiometricsTable,
  playerTrainingProfilesTable,
  workoutSessionsTable,
  workoutSetsTable,
} from "@workspace/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  SYSTEM_CITATIONS,
  confidencePercent,
  createSystemRecommendation,
  type SystemConfidenceLevel,
  type SystemRecommendation,
} from "./system-recommendations";

type WeightUnit = "lbs" | "kg";
type MovementPattern =
  | "squat"
  | "hinge"
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "carry"
  | "core"
  | "conditioning"
  | "striking"
  | "grappling"
  | "mobility"
  | "general";

type RecommendationType =
  | "add_weight"
  | "add_reps"
  | "add_sets"
  | "increase_duration"
  | "increase_complexity"
  | "hold"
  | "deload"
  | "recovery"
  | "observe";

const PAIN_RE = /\b(pain|injury|injured|ache|sharp|strain|sprain|tweak|hurt)\b/i;

function toLbs(weight: number, unit: string | null | undefined) {
  return unit === "kg" ? weight * 2.20462 : weight;
}

function fromLbs(weight: number, unit: WeightUnit) {
  return unit === "kg" ? Math.round((weight / 2.20462) * 2) / 2 : Math.round(weight * 2) / 2;
}

function estimateOneRepMax(weight: number, reps: number) {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

function movementPatternFor(exercise: { name: string; muscleGroup: string; category: string }): MovementPattern {
  const name = exercise.name.toLowerCase();
  const muscle = exercise.muscleGroup.toLowerCase();
  const category = exercise.category.toLowerCase();
  if (category === "cardio" || name.includes("run") || name.includes("bike") || name.includes("rower")) return "conditioning";
  if (category === "martial_arts" && /box|bag|strike|punch|kick|shadow/.test(name)) return "striking";
  if (category === "martial_arts" && /wrestl|grappl|sprawl|bridge|shoot|takedown/.test(name)) return "grappling";
  if (/mobility|stretch|yoga|foam|recovery/.test(name)) return "mobility";
  if (/carry|farmer|suitcase|yoke/.test(name)) return "carry";
  if (/plank|crunch|sit.?up|core|ab|hollow|dead bug/.test(name) || muscle.includes("core")) return "core";
  if (/deadlift|hinge|rdl|good morning|hip thrust/.test(name)) return "hinge";
  if (/squat|lunge|leg press|split squat|step.?up/.test(name) || muscle.includes("leg") || muscle.includes("quad")) return "squat";
  if (/overhead|shoulder press|military press|push press/.test(name)) return "vertical_push";
  if (/pull.?up|chin.?up|pulldown/.test(name)) return "vertical_pull";
  if (/row|face pull/.test(name) || muscle.includes("back")) return "horizontal_pull";
  if (/bench|push.?up|press|fly/.test(name) || muscle.includes("chest")) return "horizontal_push";
  return "general";
}

function styleForPattern(pattern: MovementPattern) {
  if (["squat", "hinge", "horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "carry"].includes(pattern)) return "strength";
  if (pattern === "conditioning") return "conditioning";
  if (pattern === "striking") return "striking";
  if (pattern === "grappling") return "grappling";
  if (pattern === "mobility") return "recovery";
  return "discipline";
}

function smallWeightJump(pattern: MovementPattern) {
  if (["squat", "hinge", "carry"].includes(pattern)) return 5;
  if (["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull"].includes(pattern)) return 2.5;
  return 0;
}

function formatPattern(pattern: string) {
  return pattern.replace(/_/g, " ");
}

function summarizeTrend(current: number, previous: number) {
  if (previous <= 0) return "insufficient_data";
  const ratio = current / previous;
  if (ratio >= 1.05) return "improving";
  if (ratio >= 0.97) return "stable";
  if (ratio >= 0.9) return "stalled";
  return "regressing";
}

function recommendationLabel(type: RecommendationType) {
  switch (type) {
    case "add_weight": return "Recommended next load";
    case "add_reps": return "Add reps";
    case "add_sets": return "Add one set";
    case "increase_duration": return "Extend gradually";
    case "increase_complexity": return "Increase complexity";
    case "hold": return "Hold steady";
    case "deload": return "Deload suggested";
    case "recovery": return "Recovery recommended";
    default: return "Observe pattern";
  }
}

function confidenceForProgression(rec: typeof exerciseProgressionsTable.$inferSelect): SystemConfidenceLevel {
  if (rec.safetyNote) return "moderate";
  if (rec.recommendationType === "observe" || rec.recentSessions < 2) return "insufficient_data";
  if (rec.recentSessions >= 3 && rec.averageRpe != null) return "high";
  return "moderate";
}

function progressionAction(rec: typeof exerciseProgressionsTable.$inferSelect) {
  if (rec.recommendationType === "add_weight" && rec.recommendedNextWeight != null) {
    return `Use ${rec.recommendedNextWeight} ${rec.weightUnit} next time if warm-ups feel normal.`;
  }
  if (rec.recommendationType === "add_reps" && rec.recommendedNextReps != null) {
    return `Add 1-2 reps, targeting about ${rec.recommendedNextReps} reps on the strongest set.`;
  }
  if (rec.recommendationType === "add_sets" && rec.recommendedNextSets != null) {
    return `Add one set only if recovery remains normal, targeting ${rec.recommendedNextSets} sets.`;
  }
  if (rec.recommendationType === "deload") return "Reduce volume or load for the next exposure.";
  if (rec.recommendationType === "recovery") return "Do not progress this movement today; choose recovery or a safer variation.";
  if (rec.recommendationType === "hold") return "Hold the current target steady for another clean session.";
  if (rec.recommendationType === "increase_duration") return "Increase duration gradually without a sudden spike.";
  if (rec.recommendationType === "increase_complexity") return "Increase drill complexity slightly while keeping technique clean.";
  return "Continue collecting training history before changing the target.";
}

function toSystemProgressionRecommendation(rec: typeof exerciseProgressionsTable.$inferSelect): SystemRecommendation {
  const confidenceLevel = confidenceForProgression(rec);
  const dataPoints = Math.max(0, rec.recentSessions + rec.successfulSessionsInRow);
  return createSystemRecommendation({
    id: `progressive-overload:${rec.exerciseId}`,
    domain: "progressive_overload",
    recommendation: recommendationLabel(rec.recommendationType as RecommendationType),
    action: progressionAction(rec),
    confidenceLevel,
    confidencePercent: confidencePercent(confidenceLevel, dataPoints),
    reasoning: [
      rec.recommendationReason,
      `Recent sessions observed: ${rec.recentSessions}.`,
      rec.averageRpe != null ? `Average RPE: ${rec.averageRpe}.` : "RPE history is incomplete.",
      `Trend: ${rec.trend}.`,
    ],
    playerDataUsed: [
      `${rec.exerciseName}`,
      rec.lastWeight != null ? `Last top load: ${rec.lastWeight} ${rec.weightUnit}` : "Last top load unavailable",
      rec.lastReps != null ? `Last reps: ${rec.lastReps}` : "Last reps unavailable",
      rec.lastSets != null ? `Last sets: ${rec.lastSets}` : "Last sets unavailable",
      `Successful sessions in row: ${rec.successfulSessionsInRow}`,
    ],
    evidence: [
      "Progression should be conservative and based on repeated successful exposures, not a single workout.",
      "High effort, pain notes, or regression should hold or reduce progression.",
    ],
    citations: [SYSTEM_CITATIONS.acsmResistanceTraining2025, SYSTEM_CITATIONS.acsmProgressionModels2009],
    safetyNote: rec.safetyNote,
    insufficientData: confidenceLevel === "insufficient_data",
  });
}

export async function recomputeTrainingIntelligence(playerId: number) {
  const sessions = await db.select().from(workoutSessionsTable)
    .where(and(eq(workoutSessionsTable.playerId, playerId), eq(workoutSessionsTable.status, "completed")))
    .orderBy(desc(workoutSessionsTable.completedAt))
    .limit(30);

  const sessionIds = sessions.map((session) => session.id);
  if (sessionIds.length === 0) {
    await db.insert(playerTrainingProfilesTable).values({
      playerId,
      recentProgressTrend: "insufficient_data",
      progressiveOverloadReadiness: "observe",
      summary: "The Hall's ledger has not observed enough training to recommend progression yet.",
      lastUpdatedAt: new Date(),
    }).onConflictDoUpdate({
      target: playerTrainingProfilesTable.playerId,
      set: {
        recentProgressTrend: "insufficient_data",
        progressiveOverloadReadiness: "observe",
        summary: "The Hall's ledger has not observed enough training to recommend progression yet.",
        lastUpdatedAt: new Date(),
      },
    });
    return;
  }

  const sets = await db.select().from(workoutSetsTable).where(inArray(workoutSetsTable.sessionId, sessionIds));
  const exerciseIds = [...new Set(sets.map((set) => set.exerciseId))];
  const exercises = exerciseIds.length
    ? await db.select().from(exercisesTable).where(inArray(exercisesTable.id, exerciseIds))
    : [];
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const setsByExercise = new Map<number, typeof sets>();

  for (const set of sets) {
    if (!setsByExercise.has(set.exerciseId)) setsByExercise.set(set.exerciseId, []);
    setsByExercise.get(set.exerciseId)!.push(set);
  }

  const patternScores = new Map<MovementPattern, number>();
  const exerciseScores = new Map<string, number>();
  let highRpeCount = 0;
  let totalRpe = 0;
  let rpeCount = 0;
  const injuryFlags = new Set<string>();
  const recommendationTypes: RecommendationType[] = [];

  for (const [exerciseId, exerciseSets] of setsByExercise.entries()) {
    const exercise = exerciseMap.get(exerciseId);
    if (!exercise) continue;
    const pattern = movementPatternFor(exercise);
    patternScores.set(pattern, (patternScores.get(pattern) ?? 0) + exerciseSets.length);
    exerciseScores.set(exercise.name, (exerciseScores.get(exercise.name) ?? 0) + exerciseSets.length);

    const grouped = new Map<number, typeof exerciseSets>();
    for (const set of exerciseSets) {
      if (!grouped.has(set.sessionId)) grouped.set(set.sessionId, []);
      grouped.get(set.sessionId)!.push(set);
      if (set.rpe != null) {
        totalRpe += Number(set.rpe);
        rpeCount++;
        if (Number(set.rpe) >= 9) highRpeCount++;
      }
      if (PAIN_RE.test(set.notes ?? "")) injuryFlags.add(pattern);
    }

    const recent = [...grouped.entries()]
      .map(([sessionId, sessionSets]) => ({
        sessionId,
        completedAt: sessionMap.get(sessionId)?.completedAt ?? sessionMap.get(sessionId)?.startedAt ?? new Date(),
        sets: sessionSets,
      }))
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
      .slice(0, 4);

    const last = recent[0];
    if (!last) continue;
    const lastUnit = (last.sets[0]?.weightUnit ?? "lbs") as WeightUnit;
    const lastTop = last.sets.reduce((best, set) => toLbs(set.weight, set.weightUnit) > toLbs(best.weight, best.weightUnit) ? set : best, last.sets[0]);
    const lastVolume = last.sets.reduce((sum, set) => sum + toLbs(set.weight, set.weightUnit) * set.reps, 0);
    const previousVolume = recent[1]?.sets.reduce((sum, set) => sum + toLbs(set.weight, set.weightUnit) * set.reps, 0) ?? 0;
    const bestWeightLbs = Math.max(...exerciseSets.map((set) => toLbs(set.weight, set.weightUnit)), 0);
    const bestVolume = Math.max(...recent.map((entry) => entry.sets.reduce((sum, set) => sum + toLbs(set.weight, set.weightUnit) * set.reps, 0)), lastVolume);
    const avgRpe = exerciseSets.filter((set) => set.rpe != null).reduce((sum, set) => sum + Number(set.rpe), 0) /
      Math.max(1, exerciseSets.filter((set) => set.rpe != null).length);
    const bestE1rmLbs = Math.max(...exerciseSets.map((set) => estimateOneRepMax(toLbs(set.weight, set.weightUnit), set.reps)), 0);
    const trend = recent.length < 2 ? "insufficient_data" : summarizeTrend(lastVolume, previousVolume);
    const painFlag = recent.some((entry) => entry.sets.some((set) => PAIN_RE.test(set.notes ?? "")));
    const lastAvgRpe = last.sets.reduce((sum, set) => sum + Number(set.rpe ?? 7), 0) / Math.max(1, last.sets.length);
    const previousAvgRpe = recent[1]
      ? recent[1].sets.reduce((sum, set) => sum + Number(set.rpe ?? 7), 0) / Math.max(1, recent[1].sets.length)
      : 7;
    const successfulRecent = recent.slice(0, 2).filter((entry) => {
      const avg = entry.sets.reduce((sum, set) => sum + Number(set.rpe ?? 7), 0) / Math.max(1, entry.sets.length);
      return entry.sets.length >= Math.max(1, last.sets.length - 1) && avg <= 8;
    }).length;

    let recommendationType: RecommendationType = "observe";
    let nextWeight: number | null = null;
    let nextReps: number | null = Math.max(...last.sets.map((set) => set.reps), 0) || null;
    let nextSets: number | null = last.sets.length || null;
    let reason = "Insufficient history to recommend progression. Complete two more sessions before the System adjusts this movement.";
    let safetyNote: string | null = null;

    if (painFlag) {
      recommendationType = "recovery";
      reason = `${exercise.name} has a recent pain or injury note. Hold progression and choose a safer variation until the signal clears.`;
      safetyNote = "Do not progress painful movements. Seek qualified guidance for sharp or persistent pain.";
    } else if (recent.length < 2) {
      recommendationType = "observe";
    } else if (lastAvgRpe >= 9 || previousAvgRpe >= 9) {
      recommendationType = "hold";
      reason = `Recent ${exercise.name} work reached high RPE. Hold the line before advancing.`;
      safetyNote = "High effort detected. Avoid adding load until reps are repeatable at RPE 7-8.";
    } else if (trend === "regressing" || trend === "stalled") {
      recommendationType = trend === "regressing" ? "deload" : "hold";
      reason = `${exercise.name} is ${trend}. Aldric would keep the load steady or reduce volume before pushing again.`;
      safetyNote = trend === "regressing" ? "Regression over multiple sessions can mean fatigue. Consider less volume today." : null;
    } else if (["conditioning", "mobility"].includes(pattern)) {
      recommendationType = pattern === "conditioning" ? "increase_duration" : "add_reps";
      nextReps = (nextReps ?? 0) + 1;
      reason = `The Hall's ledger shows steady ${formatPattern(pattern)} work. Add a small amount of duration or quality, not a sudden spike.`;
    } else if (["striking", "grappling"].includes(pattern)) {
      recommendationType = "increase_complexity";
      nextReps = (nextReps ?? 0) + 1;
      reason = `${exercise.name} is stable enough for a slightly harder drill or one cleaner round. Technique remains the priority.`;
    } else if (successfulRecent >= 2 && bestWeightLbs > 0) {
      recommendationType = "add_weight";
      nextWeight = fromLbs(toLbs(lastTop.weight, lastTop.weightUnit) + smallWeightJump(pattern), lastUnit);
      reason = `Last two ${exercise.name} sessions were completed with room to spare. Recommend a small increase next time.`;
    } else if (successfulRecent >= 1) {
      recommendationType = "add_reps";
      nextReps = (nextReps ?? 0) + 1;
      reason = `${exercise.name} is steady. Add 1-2 reps before adding more load.`;
    } else {
      recommendationType = "hold";
      reason = `${exercise.name} needs another clean session before progression. Hold steady and master the target.`;
    }

    recommendationTypes.push(recommendationType);

    await db.insert(exerciseProgressionsTable).values({
      playerId,
      exerciseId,
      exerciseName: exercise.name,
      movementPattern: pattern,
      lastPerformedAt: last.completedAt,
      recentSessions: recent.length,
      lastWeight: fromLbs(toLbs(lastTop.weight, lastTop.weightUnit), lastUnit),
      lastReps: lastTop.reps,
      lastSets: last.sets.length,
      weightUnit: lastUnit,
      bestWeight: fromLbs(bestWeightLbs, lastUnit),
      bestVolume,
      estimatedOneRepMax: fromLbs(bestE1rmLbs, lastUnit),
      averageRpe: Number.isFinite(avgRpe) ? Math.round(avgRpe * 10) / 10 : null,
      successfulSessionsInRow: successfulRecent,
      missedTargetsInRow: recommendationType === "hold" || recommendationType === "deload" ? 1 : 0,
      trend,
      recommendationType,
      recommendedNextWeight: nextWeight,
      recommendedNextReps: nextReps,
      recommendedNextSets: nextSets,
      targetRpe: recommendationType === "recovery" || recommendationType === "deload" ? 6 : 8,
      recommendationReason: reason,
      safetyNote,
      lastUpdatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [exerciseProgressionsTable.playerId, exerciseProgressionsTable.exerciseId],
      set: {
        exerciseName: exercise.name,
        movementPattern: pattern,
        lastPerformedAt: last.completedAt,
        recentSessions: recent.length,
        lastWeight: fromLbs(toLbs(lastTop.weight, lastTop.weightUnit), lastUnit),
        lastReps: lastTop.reps,
        lastSets: last.sets.length,
        weightUnit: lastUnit,
        bestWeight: fromLbs(bestWeightLbs, lastUnit),
        bestVolume,
        estimatedOneRepMax: fromLbs(bestE1rmLbs, lastUnit),
        averageRpe: Number.isFinite(avgRpe) ? Math.round(avgRpe * 10) / 10 : null,
        successfulSessionsInRow: successfulRecent,
        missedTargetsInRow: recommendationType === "hold" || recommendationType === "deload" ? 1 : 0,
        trend,
        recommendationType,
        recommendedNextWeight: nextWeight,
        recommendedNextReps: nextReps,
        recommendedNextSets: nextSets,
        targetRpe: recommendationType === "recovery" || recommendationType === "deload" ? 6 : 8,
        recommendationReason: reason,
        safetyNote,
        lastUpdatedAt: new Date(),
      },
    });
  }

  const sortedPatterns = [...patternScores.entries()].sort((a, b) => b[1] - a[1]);
  const strongest = sortedPatterns.slice(0, 3).map(([pattern]) => pattern);
  const knownPatterns: MovementPattern[] = ["squat", "hinge", "horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "carry", "core", "conditioning", "striking", "grappling", "mobility"];
  const weakest = knownPatterns.filter((pattern) => !patternScores.has(pattern)).slice(0, 3);
  const favoriteExercises = [...exerciseScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name);
  const preferredStyles = [...new Set(strongest.map(styleForPattern))].slice(0, 3);
  const avgDuration = sessions.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0) / Math.max(1, sessions.filter((session) => session.durationMinutes).length);
  const recent28 = sessions.filter((session) => (Date.now() - (session.completedAt ?? session.startedAt).getTime()) <= 28 * 86400000).length;
  const averageTrainingFrequency = Math.round((recent28 / 4) * 10) / 10;
  const avgRpe = totalRpe / Math.max(1, rpeCount);
  const deloadRecommended = highRpeCount >= 4 || [...injuryFlags].length > 0;
  const recentProgressTrend = recommendationTypes.includes("add_weight") || recommendationTypes.includes("add_reps")
    ? "improving"
    : recommendationTypes.includes("deload")
      ? "regressing"
      : sessions.length >= 2
        ? "stable"
        : "insufficient_data";
  const readiness = deloadRecommended
    ? "recovery_first"
    : recommendationTypes.some((type) => type === "add_weight" || type === "add_reps")
      ? "ready"
      : "observe";
  const summary = deloadRecommended
    ? "Aldric has marked recovery before progression. The ledger shows fatigue or pain signals."
    : readiness === "ready"
      ? "The System has observed a stable pattern. One or more movements are ready for modest progression."
      : "The Hall's ledger is still observing. One day does not make a trend.";

  const [bio] = await db.select().from(playerBiometricsTable).where(eq(playerBiometricsTable.playerId, playerId)).limit(1);

  await db.insert(playerTrainingProfilesTable).values({
    playerId,
    primaryGoal: bio?.notes?.toLowerCase().includes("strength") ? "strength" : preferredStyles[0] ?? null,
    preferredTrainingStyles: preferredStyles,
    favoriteExercises,
    strongestMovementPatterns: strongest,
    weakestMovementPatterns: weakest,
    preferredEquipment: bio?.equipmentTypes ?? [],
    preferredSessionLength: Number.isFinite(avgDuration) && avgDuration > 0 ? Math.round(avgDuration) : null,
    averageTrainingFrequency,
    recentProgressTrend,
    fatigueTrend: avgRpe >= 8.5 ? "high" : avgRpe >= 7.5 ? "moderate" : "manageable",
    injuryFlags: [...injuryFlags],
    progressiveOverloadReadiness: readiness,
    deloadRecommended,
    summary,
    lastUpdatedAt: new Date(),
  }).onConflictDoUpdate({
    target: playerTrainingProfilesTable.playerId,
    set: {
      primaryGoal: bio?.notes?.toLowerCase().includes("strength") ? "strength" : preferredStyles[0] ?? null,
      preferredTrainingStyles: preferredStyles,
      favoriteExercises,
      strongestMovementPatterns: strongest,
      weakestMovementPatterns: weakest,
      preferredEquipment: bio?.equipmentTypes ?? [],
      preferredSessionLength: Number.isFinite(avgDuration) && avgDuration > 0 ? Math.round(avgDuration) : null,
      averageTrainingFrequency,
      recentProgressTrend,
      fatigueTrend: avgRpe >= 8.5 ? "high" : avgRpe >= 7.5 ? "moderate" : "manageable",
      injuryFlags: [...injuryFlags],
      progressiveOverloadReadiness: readiness,
      deloadRecommended,
      summary,
      lastUpdatedAt: new Date(),
    },
  });
}

export async function getTrainingIntelligence(playerId: number) {
  await recomputeTrainingIntelligence(playerId);
  const [profile] = await db.select().from(playerTrainingProfilesTable)
    .where(eq(playerTrainingProfilesTable.playerId, playerId)).limit(1);
  const recommendations = await db.select().from(exerciseProgressionsTable)
    .where(eq(exerciseProgressionsTable.playerId, playerId))
    .orderBy(desc(exerciseProgressionsTable.lastUpdatedAt))
    .limit(12);

  const systemRecommendations = recommendations.map(toSystemProgressionRecommendation);

  return {
    profile: profile ? {
      ...profile,
      lastUpdatedAt: profile.lastUpdatedAt.toISOString(),
    } : null,
    recommendations: recommendations.map((rec) => ({
      ...rec,
      label: recommendationLabel(rec.recommendationType as RecommendationType),
      systemRecommendation: toSystemProgressionRecommendation(rec),
      lastPerformedAt: rec.lastPerformedAt?.toISOString() ?? null,
      lastUpdatedAt: rec.lastUpdatedAt.toISOString(),
    })),
    systemRecommendations,
  };
}
