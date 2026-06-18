import { Router } from "express";
import { db } from "@workspace/db";
import { exercisesTable, equipmentTable, workoutTemplatesTable, playerBiometricsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";

// Calculate recommended working weight from 1RM and RPE
function calcWeight(oneRepMax: number | null | undefined, rpe: number): number | null {
  if (!oneRepMax) return null;
  // RPE to % table (simplified)
  const pct = Math.max(0.6, Math.min(1.0, 0.6 + (rpe - 5) * 0.08));
  const kg = Math.round(oneRepMax * pct / 2.5) * 2.5;
  return kg;
}

// Map exercise muscle group + category to a 1RM field
function get1rm(muscleGroup: string, exerciseName: string, bio: Record<string, number | null>): number | null {
  const mg = muscleGroup.toLowerCase();
  const name = exerciseName.toLowerCase();
  if (name.includes("deadlift")) return bio["deadlift1rm"] ?? null;
  if (mg.includes("leg") || mg.includes("quad") || name.includes("squat")) return bio["squat1rm"] ?? null;
  if (mg.includes("hamstring") || mg.includes("glute")) return bio["deadlift1rm"] ?? null;
  if (mg.includes("chest") || name.includes("bench") || name.includes("press") && !name.includes("overhead") && !name.includes("ohp") && !name.includes("shoulder")) return bio["bench1rm"] ?? null;
  if (mg.includes("shoulder") || name.includes("overhead") || name.includes("ohp") || name.includes(" press")) return bio["ohp1rm"] ?? null;
  if (mg.includes("back") || mg.includes("lat") || name.includes("row")) return bio["row1rm"] ?? null;
  return null;
}

const router = Router();

interface PlanExercise {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  category: string;
  sets: number;
  reps: string;
  rpe: number;
  restSeconds: number;
  notes?: string;
  phase: "warmup" | "main" | "accessory" | "finisher";
  substitutes?: Array<{ exerciseId: number; exerciseName: string; reason: string }>;
  recommendedWeightKg?: number | null;
}

type WorkoutGoal = "strength" | "hypertrophy" | "conditioning" | "striking" | "recovery" | "back_friendly_lower";

const GOAL_CONFIGS: Record<WorkoutGoal, {
  label: string;
  category: string;
  mainSets: number;
  mainReps: string;
  mainRpe: number;
  accessorySets: number;
  accessoryReps: string;
  accessoryRpe: number;
  rest: number;
  accessoryRest: number;
  xpBase: number;
  estimatedMinutes: number;
  targetMuscles: string[];
  avoidMuscles?: string[];
  categories: string[];
  warmupNotes: string;
  finisherNotes: string;
}> = {
  strength: {
    label: "Iron Protocol (Strength)",
    category: "strength",
    mainSets: 4, mainReps: "3-5", mainRpe: 8.5,
    accessorySets: 3, accessoryReps: "8-10", accessoryRpe: 7.5,
    rest: 240, accessoryRest: 120,
    xpBase: 220, estimatedMinutes: 65,
    targetMuscles: ["Legs", "Back", "Chest", "Shoulders"],
    categories: ["barbell"],
    warmupNotes: "Ramp up to working weight with 3 warm-up sets at 50%, 70%, 85% of target.",
    finisherNotes: "Last set AMRAP — record reps for next session progression.",
  },
  hypertrophy: {
    label: "Hypertrophy Protocol (Mass)",
    category: "strength",
    mainSets: 4, mainReps: "8-12", mainRpe: 8,
    accessorySets: 3, accessoryReps: "12-15", accessoryRpe: 7.5,
    rest: 120, accessoryRest: 90,
    xpBase: 200, estimatedMinutes: 60,
    targetMuscles: ["Chest", "Back", "Shoulders", "Arms", "Legs"],
    categories: ["barbell", "machine", "dumbbell"],
    warmupNotes: "2 light warm-up sets, then straight into working weight.",
    finisherNotes: "Pump finisher — drop set on last exercise, 50% weight for 20+ reps.",
  },
  conditioning: {
    label: "Endurance Protocol (Conditioning)",
    category: "conditioning",
    mainSets: 5, mainReps: "15-20", mainRpe: 7,
    accessorySets: 3, accessoryReps: "20+", accessoryRpe: 6.5,
    rest: 60, accessoryRest: 45,
    xpBase: 180, estimatedMinutes: 45,
    targetMuscles: ["Cardio", "Core", "Legs"],
    categories: ["bodyweight", "cardio"],
    warmupNotes: "5-minute light jog or shadow boxing to elevate heart rate.",
    finisherNotes: "Tabata finisher: 20s on / 10s off for 4 rounds.",
  },
  striking: {
    label: "Striker's Protocol (Striking)",
    category: "striking",
    mainSets: 6, mainReps: "3 min rounds", mainRpe: 8,
    accessorySets: 3, accessoryReps: "2 min", accessoryRpe: 7,
    rest: 60, accessoryRest: 60,
    xpBase: 175, estimatedMinutes: 50,
    targetMuscles: ["Cardio"],
    categories: ["martial_arts"],
    warmupNotes: "Shadowbox for 5 minutes, focus on footwork and guard position.",
    finisherNotes: "Final round: max intensity combinations, 1 full minute nonstop.",
  },
  recovery: {
    label: "Recovery Protocol (Active Rest)",
    category: "recovery",
    mainSets: 2, mainReps: "15-20", mainRpe: 5,
    accessorySets: 2, accessoryReps: "60 sec hold", accessoryRpe: 4,
    rest: 60, accessoryRest: 60,
    xpBase: 80, estimatedMinutes: 30,
    targetMuscles: ["Core", "Glutes"],
    categories: ["bodyweight"],
    warmupNotes: "Light mobility work and dynamic stretching for 5 minutes.",
    finisherNotes: "5-minute static stretch. Focus on whatever is tightest.",
  },
  back_friendly_lower: {
    label: "Back-Friendly Lower (No Axial Load)",
    category: "strength",
    mainSets: 4, mainReps: "8-12", mainRpe: 7.5,
    accessorySets: 3, accessoryReps: "10-15", accessoryRpe: 7,
    rest: 150, accessoryRest: 90,
    xpBase: 190, estimatedMinutes: 55,
    targetMuscles: ["Legs", "Glutes", "Hamstrings"],
    avoidMuscles: ["Back"],
    categories: ["machine", "barbell"],
    warmupNotes: "Hip circles, glute activation (clamshells, bridges). No axial spinal loading.",
    finisherNotes: "Single-leg work to close — Bulgarian split squats or step-ups.",
  },
};

function pickExercises(
  all: any[],
  availableEquipmentIds: Set<number>,
  goal: WorkoutGoal,
  count: number,
  targetMuscles?: string[],
  avoidMuscles?: string[],
  categories?: string[]
): any[] {
  let candidates = all.filter(e => {
    const eqIds = (e.equipmentIds as number[]) || [];
    // Bodyweight exercises have empty equipment list — always available
    if (eqIds.length === 0) return true;
    return eqIds.some(id => availableEquipmentIds.has(id));
  });

  if (avoidMuscles?.length) {
    candidates = candidates.filter(e => !avoidMuscles.some(m => e.muscleGroup.toLowerCase().includes(m.toLowerCase())));
  }

  if (targetMuscles?.length) {
    const targeted = candidates.filter(e => targetMuscles.some(m => e.muscleGroup.toLowerCase().includes(m.toLowerCase())));
    if (targeted.length >= count) candidates = targeted;
  }

  if (categories?.length) {
    const catFiltered = candidates.filter(e => categories.includes(e.category));
    if (catFiltered.length >= Math.ceil(count / 2)) candidates = catFiltered;
  }

  // Shuffle deterministically by muscle group to get variety
  const shuffled = [...candidates].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function buildSubstitutes(exercise: any, all: any[], availableEquipmentIds: Set<number>): Array<{ exerciseId: number; exerciseName: string; reason: string }> {
  const subs = all.filter(e => {
    if (e.id === exercise.id) return false;
    if (e.muscleGroup !== exercise.muscleGroup) return false;
    const eqIds = (e.equipmentIds as number[]) || [];
    if (eqIds.length === 0) return true;
    return eqIds.some(id => availableEquipmentIds.has(id));
  }).slice(0, 2);

  return subs.map(s => ({
    exerciseId: s.id,
    exerciseName: s.name,
    reason: s.equipmentIds?.length === 0 ? "Bodyweight alternative" : "Same muscle group, different equipment",
  }));
}

router.post("/training/planner/generate", async (req, res) => {
  try {
    const { player, stats } = await getOrCreatePlayer(req.userId);
    const {
      goal,
      excludeEquipmentIds = [],
      rpeLimit,
      avoidMuscleGroups = [],
      customNotes = "",
    } = req.body as {
      goal: WorkoutGoal;
      excludeEquipmentIds?: number[];
      rpeLimit?: number;
      avoidMuscleGroups?: string[];
      customNotes?: string;
    };

    if (!GOAL_CONFIGS[goal]) {
      return void res.status(400).json({ error: `Unknown goal. Valid: ${Object.keys(GOAL_CONFIGS).join(", ")}` });
    }

    const config = GOAL_CONFIGS[goal];

    // Load biometrics for weight recommendations
    const [bioRow] = await db.select().from(playerBiometricsTable).where(eq(playerBiometricsTable.playerId, player.id));
    const bio: Record<string, number | null> = {
      squat1rm: bioRow?.squat1rm ?? null,
      bench1rm: bioRow?.bench1rm ?? null,
      deadlift1rm: bioRow?.deadlift1rm ?? null,
      ohp1rm: bioRow?.ohp1rm ?? null,
      row1rm: bioRow?.row1rm ?? null,
    };
    const hasBiometrics = Object.values(bio).some(v => v !== null);

    // Get available equipment — use biometrics equipmentTypes to pre-filter if set
    const allEquipment = await db.select().from(equipmentTable);
    const availableIds = new Set(
      allEquipment
        .filter(e => e.owned && e.available && !excludeEquipmentIds.includes(e.id))
        .map(e => e.id)
    );

    const allExercises = await db.select().from(exercisesTable);

    const avoidAll = [...avoidMuscleGroups, ...(config.avoidMuscles || [])];

    // Warmup: 2-3 bodyweight / light movements
    const warmupExercises = pickExercises(allExercises, availableIds, goal, 2, ["Core", "Cardio"], avoidAll, ["bodyweight", "cardio"]);

    // Main: 2-4 compound movements
    const mainExercises = pickExercises(allExercises, availableIds, goal, 3, config.targetMuscles, avoidAll, config.categories);

    // Accessories: 3-4 isolation / secondary
    const usedIds = new Set([...warmupExercises, ...mainExercises].map(e => e.id));
    const accessoryPool = allExercises.filter(e => !usedIds.has(e.id));
    const accessoryExercises = pickExercises(accessoryPool, availableIds, goal, 3, config.targetMuscles, avoidAll);

    // Finisher: 1 high-intensity close
    const finisherPool = allExercises.filter(e => !usedIds.has(e.id) && !accessoryExercises.find(a => a.id === e.id));
    const finisher = pickExercises(finisherPool, availableIds, goal, 1, ["Cardio", "Core"], avoidAll, ["bodyweight", "cardio", "martial_arts"]);

    const plan: PlanExercise[] = [];

    for (const ex of warmupExercises) {
      plan.push({
        exerciseId: ex.id, exerciseName: ex.name, muscleGroup: ex.muscleGroup, category: ex.category,
        sets: 2, reps: "10-15", rpe: Math.min(5, rpeLimit || 5), restSeconds: 45, phase: "warmup",
        notes: "Light weight, focus on form and range of motion.",
        recommendedWeightKg: null,
      });
    }

    for (const ex of mainExercises) {
      const rpe = rpeLimit ? Math.min(config.mainRpe, rpeLimit) : config.mainRpe;
      const orm = get1rm(ex.muscleGroup, ex.name, bio);
      plan.push({
        exerciseId: ex.id, exerciseName: ex.name, muscleGroup: ex.muscleGroup, category: ex.category,
        sets: config.mainSets, reps: config.mainReps, rpe, restSeconds: config.rest, phase: "main",
        notes: `Working weight. ${config.warmupNotes}`,
        substitutes: buildSubstitutes(ex, allExercises, availableIds),
        recommendedWeightKg: calcWeight(orm, rpe),
      });
    }

    for (const ex of accessoryExercises) {
      const rpe = rpeLimit ? Math.min(config.accessoryRpe, rpeLimit) : config.accessoryRpe;
      const orm = get1rm(ex.muscleGroup, ex.name, bio);
      plan.push({
        exerciseId: ex.id, exerciseName: ex.name, muscleGroup: ex.muscleGroup, category: ex.category,
        sets: config.accessorySets, reps: config.accessoryReps, rpe, restSeconds: config.accessoryRest, phase: "accessory",
        substitutes: buildSubstitutes(ex, allExercises, availableIds),
        recommendedWeightKg: calcWeight(orm, rpe),
      });
    }

    for (const ex of finisher) {
      plan.push({
        exerciseId: ex.id, exerciseName: ex.name, muscleGroup: ex.muscleGroup, category: ex.category,
        sets: 3, reps: "AMRAP", rpe: Math.min(9, rpeLimit || 9), restSeconds: 30, phase: "finisher",
        notes: config.finisherNotes,
      });
    }

    // Estimate total sets for XP preview
    const totalSets = plan.reduce((s, e) => s + e.sets, 0);
    const xpPreview = config.xpBase + totalSets * 5;

    // RPE adjustment note
    let rpeNote = "";
    if (rpeLimit && rpeLimit <= 6) {
      rpeNote = "Low-RPE session — treat this as a technical practice day. No grinding.";
    } else if (rpeLimit && rpeLimit >= 9) {
      rpeNote = "High-RPE day — this is a max effort session. Ensure full recovery before next heavy session.";
    }

    // Pain / injury notes
    const injuryNotes: Record<string, string> = {
      back_friendly_lower: "⚠️ All exercises selected to avoid spinal compression. Avoid loaded good mornings, deadlifts, or back squats today.",
      recovery: "✅ Sub-maximal effort only. Stop any movement that creates pain (not discomfort).",
      strength: "Focus on technique over load. Don't sacrifice form for numbers.",
      striking: "Wrap hands before bag work. Keep guard up even when fatigued.",
    };

    res.json({
      planName: config.label,
      goal,
      estimatedDuration: config.estimatedMinutes,
      xpPreview,
      totalSets,
      hasBiometrics,
      exercises: plan,
      rpeGuide: {
        target: config.mainRpe,
        limit: rpeLimit || null,
        note: rpeNote,
      },
      injuryNotes: injuryNotes[goal] || null,
      customNotes: customNotes || null,
      availableEquipmentCount: availableIds.size,
      generatedFor: {
        level: player.level,
        rank: player.rank,
        stats: {
          strength: stats?.strength || 5,
          stamina: stats?.stamina || 5,
        },
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to generate workout plan" });
  }
});

// Save generated plan as a template
router.post("/training/planner/save", async (req, res) => {
  try {
    const { planName, goal, exercises, estimatedDuration, xpPreview } = req.body;
    const templateExercises = exercises.map((e: any, i: number) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      sets: e.sets,
      reps: e.reps,
      restSeconds: e.restSeconds,
      order: i + 1,
      notes: e.notes,
    }));

    const [template] = await db.insert(workoutTemplatesTable).values({
      name: planName,
      category: goal === "striking" ? "striking" : goal === "conditioning" ? "conditioning" : "strength",
      description: `Generated plan — ${goal} focus`,
      exercises: templateExercises,
      estimatedDuration,
      xpReward: xpPreview || 200,
    }).returning();

    res.status(201).json({ ...template, createdAt: template.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to save plan as template" });
  }
});

export default router;
