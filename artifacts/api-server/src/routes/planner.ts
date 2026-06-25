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

type WorkoutGoal = "strength" | "hypertrophy" | "conditioning" | "striking" | "grappling" | "recovery" | "mobility" | "skill_practice" | "commission" | "back_friendly_lower";

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
    label: "Spellblade Protocol (Striking)",
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
  grappling: {
    label: "Warden Protocol (Grappling)",
    category: "grappling",
    mainSets: 5, mainReps: "2-3 min rounds", mainRpe: 7.5,
    accessorySets: 3, accessoryReps: "8-12", accessoryRpe: 7,
    rest: 75, accessoryRest: 75,
    xpBase: 175, estimatedMinutes: 50,
    targetMuscles: ["Core", "Back", "Legs"],
    categories: ["martial_arts", "bodyweight"],
    warmupNotes: "Move through bridges, sprawls, and hip escapes before harder control work.",
    finisherNotes: "Controlled positional round: keep pressure without rushing or grinding.",
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
  mobility: {
    label: "Restoration Protocol (Mobility)",
    category: "recovery",
    mainSets: 2, mainReps: "45-60 sec", mainRpe: 4.5,
    accessorySets: 2, accessoryReps: "8-12 slow reps", accessoryRpe: 4,
    rest: 45, accessoryRest: 45,
    xpBase: 90, estimatedMinutes: 30,
    targetMuscles: ["Mobility", "Core", "Glutes", "Shoulders"],
    categories: ["bodyweight"],
    warmupNotes: "Move slowly enough that breathing stays calm.",
    finisherNotes: "Close with 3 minutes of quiet nasal breathing.",
  },
  skill_practice: {
    label: "Skill Practice Protocol",
    category: "mixed",
    mainSets: 5, mainReps: "2 min practice", mainRpe: 6.5,
    accessorySets: 3, accessoryReps: "quality reps", accessoryRpe: 6,
    rest: 60, accessoryRest: 60,
    xpBase: 150, estimatedMinutes: 40,
    targetMuscles: ["Cardio", "Core", "Back"],
    categories: ["martial_arts", "bodyweight", "cardio"],
    warmupNotes: "Technique comes before fatigue. Keep the first rounds clean.",
    finisherNotes: "Final round is quality under fatigue, not a brawl.",
  },
  commission: {
    label: "Commission Duty Protocol",
    category: "mixed",
    mainSets: 4, mainReps: "8-12 or 2 min", mainRpe: 7,
    accessorySets: 3, accessoryReps: "10-15", accessoryRpe: 6.5,
    rest: 90, accessoryRest: 60,
    xpBase: 175, estimatedMinutes: 45,
    targetMuscles: ["Legs", "Back", "Cardio", "Core"],
    categories: ["bodyweight", "cardio", "dumbbell", "martial_arts"],
    warmupNotes: "Prepare for the commission without empty bravado.",
    finisherNotes: "Close with the task that best proves the commission's purpose.",
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

const DEFAULT_EQUIPMENT_CATALOG = [
  ["Power Rack", "rack", "power_rack rack barbell strength"],
  ["Squat Rack", "rack", "squat_rack rack barbell strength"],
  ["Smith Machine", "machine", "smith_machine machine strength"],
  ["Barbell", "barbell", "barbell plates strength"],
  ["Dumbbells", "free_weights", "dumbbells adjustable_dumbbells strength hypertrophy"],
  ["Kettlebells", "free_weights", "kettlebells carries conditioning"],
  ["Adjustable Bench", "bench", "adjustable_bench flat_bench incline_bench bench"],
  ["Cable Machine", "cable", "cable_machine functional_trainer cable lat_pulldown"],
  ["Leg Press", "machine", "leg_press hack_squat belt_squat legs"],
  ["Pull-Up Bar", "other", "pull_up_bar dip_station bodyweight back"],
  ["Resistance Bands", "other", "resistance_bands bands mobility recovery"],
  ["Treadmill", "cardio", "treadmill run walk conditioning"],
  ["Bike", "cardio", "bike cycling conditioning"],
  ["Rower", "cardio", "rower rowing conditioning"],
  ["Elliptical", "cardio", "elliptical conditioning"],
  ["Stair Climber", "cardio", "stair_climber conditioning legs"],
  ["Jump Rope", "cardio", "jump_rope conditioning footwork"],
  ["Heavy Bag", "striking", "heavy_bag fightcamp striking boxing"],
  ["Speed Bag", "striking", "speed_bag double_end_bag striking timing"],
  ["Wrestling Mat", "mat", "wrestling_mat grappling mat"],
  ["Yoga Mat", "mat", "yoga_mat mobility recovery bodyweight"],
  ["Medicine Ball", "other", "medicine_ball slam_ball core power"],
  ["Sled", "other", "sled conditioning strength"],
  ["Battle Ropes", "other", "battle_ropes conditioning"],
  ["Foam Roller", "other", "foam_roller recovery mobility"],
] as const;

const SEEDED_EXERCISES = [
  ["Back Squat", "Legs", "barbell", "Brace, descend under control, drive through midfoot.", ["barbell", "power_rack", "squat_rack"]],
  ["Front Squat", "Legs", "barbell", "Keep torso tall and elbows high.", ["barbell", "power_rack", "squat_rack"]],
  ["Romanian Deadlift", "Hamstrings", "barbell", "Hinge at the hips and keep lats tight.", ["barbell"]],
  ["Deadlift", "Back", "barbell", "Brace hard before the pull.", ["barbell", "plates"]],
  ["Bench Press", "Chest", "barbell", "Control the descent and press with stable shoulders.", ["barbell", "flat_bench"]],
  ["Overhead Press", "Shoulders", "barbell", "Brace ribs down and press overhead.", ["barbell"]],
  ["Barbell Row", "Back", "barbell", "Pull elbows toward hips.", ["barbell"]],
  ["Smith Machine Squat", "Legs", "machine", "Use a steady stance and controlled depth.", ["smith_machine"]],
  ["Leg Press", "Legs", "machine", "Control the sled and avoid locking knees hard.", ["leg_press"]],
  ["Hack Squat", "Legs", "machine", "Keep hips and back set against the pad.", ["hack_squat"]],
  ["Lat Pulldown", "Back", "cable", "Pull elbows down and keep chest tall.", ["lat_pulldown", "cable_machine"]],
  ["Cable Row", "Back", "cable", "Pause each rep with shoulder blades back.", ["cable_machine", "functional_trainer"]],
  ["Cable Chest Press", "Chest", "cable", "Press forward with even control.", ["cable_machine", "functional_trainer"]],
  ["Dumbbell Bench Press", "Chest", "dumbbell", "Move through a controlled range.", ["dumbbells", "adjustable_dumbbells", "flat_bench"]],
  ["Incline Dumbbell Press", "Chest", "dumbbell", "Drive smoothly without flaring elbows.", ["dumbbells", "adjustable_dumbbells", "incline_bench", "adjustable_bench"]],
  ["Dumbbell Row", "Back", "dumbbell", "Pull toward your hip and pause.", ["dumbbells", "adjustable_dumbbells"]],
  ["Goblet Squat", "Legs", "dumbbell", "Sit between the hips and stay tall.", ["dumbbells", "adjustable_dumbbells", "kettlebells"]],
  ["Dumbbell Romanian Deadlift", "Hamstrings", "dumbbell", "Hinge with control and keep weights close.", ["dumbbells", "adjustable_dumbbells"]],
  ["Dumbbell Shoulder Press", "Shoulders", "dumbbell", "Press without arching hard.", ["dumbbells", "adjustable_dumbbells"]],
  ["Kettlebell Swing", "Glutes", "dumbbell", "Snap hips; do not squat the bell.", ["kettlebells"]],
  ["Farmer Carry", "Core", "dumbbell", "Walk tall with heavy hands and quiet steps.", ["dumbbells", "adjustable_dumbbells", "kettlebells"]],
  ["Push-Up", "Chest", "bodyweight", "Keep a straight line and full control.", []],
  ["Bodyweight Squat", "Legs", "bodyweight", "Control depth and tempo.", []],
  ["Reverse Lunge", "Legs", "bodyweight", "Step back softly and drive through front foot.", []],
  ["Glute Bridge", "Glutes", "bodyweight", "Pause at the top without overextending.", []],
  ["Plank", "Core", "bodyweight", "Brace and breathe.", []],
  ["Side Plank", "Core", "bodyweight", "Keep hips tall and steady.", []],
  ["Mountain Climber", "Core", "bodyweight", "Move knees fast while shoulders stay stacked.", []],
  ["Burpee", "Cardio", "bodyweight", "Move with rhythm; scale as needed.", []],
  ["Bear Crawl", "Core", "bodyweight", "Crawl low with quiet hips.", []],
  ["Pull-Up", "Back", "bodyweight", "Pull chest toward bar with control.", ["pull_up_bar"]],
  ["Band Pull-Apart", "Shoulders", "bodyweight", "Open the chest and squeeze shoulder blades.", ["resistance_bands"]],
  ["Band Face Pull", "Shoulders", "bodyweight", "Pull toward eyes with elbows high.", ["resistance_bands"]],
  ["Treadmill Walk", "Cardio", "cardio", "Walk at an honest pace you can sustain.", ["treadmill"]],
  ["Incline Treadmill Walk", "Cardio", "cardio", "Use incline for steady effort without sprinting.", ["treadmill"]],
  ["Treadmill Intervals", "Cardio", "cardio", "Alternate controlled hard efforts with recovery.", ["treadmill"]],
  ["Stationary Bike", "Cardio", "cardio", "Keep cadence smooth.", ["bike"]],
  ["Bike Intervals", "Cardio", "cardio", "Push short hard intervals with full control.", ["bike"]],
  ["Rowing Machine", "Cardio", "cardio", "Drive legs, swing hips, pull arms.", ["rower"]],
  ["Elliptical Tempo", "Cardio", "cardio", "Sustain smooth effort without impact.", ["elliptical"]],
  ["Stair Climber", "Cardio", "cardio", "Step tall and steady.", ["stair_climber"]],
  ["Jump Rope Rounds", "Cardio", "cardio", "Keep jumps low and wrists relaxed.", ["jump_rope"]],
  ["Sled Push", "Legs", "cardio", "Drive powerfully with a neutral spine.", ["sled"]],
  ["Battle Rope Waves", "Arms", "cardio", "Keep ribs down and waves even.", ["battle_ropes"]],
  ["Shadow Boxing", "Cardio", "martial_arts", "Work footwork, guard, and clean punches.", []],
  ["Heavy Bag Rounds", "Cardio", "martial_arts", "Strike with structure, not wild effort.", ["heavy_bag", "fightcamp"]],
  ["Jab-Cross Footwork", "Cardio", "martial_arts", "Step after combinations and reset guard.", ["heavy_bag", "fightcamp"]],
  ["Hook-Cross Rounds", "Cardio", "martial_arts", "Rotate hips and protect the return.", ["heavy_bag", "fightcamp"]],
  ["Speed Bag Timing", "Cardio", "martial_arts", "Relax shoulders and keep rhythm.", ["speed_bag"]],
  ["Double-End Bag Defense", "Cardio", "martial_arts", "Slip, reset, and answer cleanly.", ["double_end_bag"]],
  ["Sprawls", "Core", "martial_arts", "Drop hips back and recover stance.", ["wrestling_mat", "yoga_mat"]],
  ["Hip Escapes", "Core", "martial_arts", "Make space with hips, not panic.", ["wrestling_mat", "yoga_mat"]],
  ["Bridges", "Glutes", "martial_arts", "Bridge through feet and shoulders.", ["wrestling_mat", "yoga_mat"]],
  ["Technical Stand-Up", "Core", "martial_arts", "Protect yourself while standing.", ["wrestling_mat", "yoga_mat"]],
  ["Pummeling Drill", "Back", "martial_arts", "Hand fight for inside control.", ["wrestling_mat"]],
  ["Shot Entries", "Legs", "martial_arts", "Step deep, level change, recover stance.", ["wrestling_mat"]],
  ["Dead Bug", "Core", "bodyweight", "Brace while limbs move slowly.", []],
  ["Bird Dog", "Core", "bodyweight", "Reach long without rotating.", []],
  ["Cat Cow", "Core", "bodyweight", "Move spine gently through range.", ["yoga_mat"]],
  ["World's Greatest Stretch", "Mobility", "bodyweight", "Open hips, hamstrings, and thoracic spine.", ["yoga_mat"]],
  ["Hip Flexor Stretch", "Mobility", "bodyweight", "Tuck pelvis and breathe.", ["yoga_mat"]],
  ["Couch Stretch", "Mobility", "bodyweight", "Scale intensity and breathe.", ["yoga_mat"]],
  ["Thoracic Open Book", "Mobility", "bodyweight", "Rotate gently through upper back.", ["yoga_mat"]],
  ["Foam Roll Quads", "Mobility", "bodyweight", "Slow pressure, no rushing.", ["foam_roller"]],
  ["Foam Roll Upper Back", "Mobility", "bodyweight", "Roll slowly and breathe.", ["foam_roller"]],
] as const;

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

async function ensurePlannerCatalog() {
  const existingEquipment = await db.select().from(equipmentTable);
  const existingEquipmentNames = new Set(existingEquipment.map((item) => item.name));
  const missingEquipment = DEFAULT_EQUIPMENT_CATALOG
    .filter(([name]) => !existingEquipmentNames.has(name))
    .map(([name, category, notes]) => ({
      name,
      category: category as any,
      description: `${name} available for the Guild planner.`,
      owned: true,
      available: true,
      notes,
    }));
  if (missingEquipment.length > 0) {
    await db.insert(equipmentTable).values(missingEquipment);
  }

  const allEquipment = await db.select().from(equipmentTable);
  const equipmentByKey = new Map<string, number>();
  for (const item of allEquipment) {
    const haystack = `${item.name} ${item.category} ${item.notes ?? ""}`.toLowerCase();
    for (const [name, category, notes] of DEFAULT_EQUIPMENT_CATALOG) {
      const keys = `${name} ${category} ${notes}`.split(/\s+/).map(normalizeKey);
      if (keys.some((key) => key && haystack.includes(key))) {
        for (const key of keys) equipmentByKey.set(key, item.id);
      }
    }
    equipmentByKey.set(normalizeKey(item.name), item.id);
    equipmentByKey.set(normalizeKey(item.category), item.id);
  }

  const existingExercises = await db.select({ name: exercisesTable.name }).from(exercisesTable);
  const existingExerciseNames = new Set(existingExercises.map((item) => item.name));
  const missingExercises = SEEDED_EXERCISES
    .filter(([name]) => !existingExerciseNames.has(name))
    .map(([name, muscleGroup, category, instructions, equipmentKeys]) => ({
      name,
      muscleGroup,
      category: category as any,
      instructions,
      equipmentIds: [...new Set(equipmentKeys.map((key) => equipmentByKey.get(normalizeKey(key))).filter((id): id is number => Boolean(id)))],
    }));
  if (missingExercises.length > 0) {
    await db.insert(exercisesTable).values(missingExercises);
  }
}

function equipmentMatchesProfile(equipment: any, profileEquipmentTypes: string[]) {
  if (profileEquipmentTypes.length === 0) return equipment.owned && equipment.available;
  const selected = new Set(profileEquipmentTypes.map(normalizeKey));
  if (selected.size === 1 && selected.has("bodyweight")) return false;
  const haystack = `${equipment.name} ${equipment.category} ${equipment.notes ?? ""}`.toLowerCase();
  return [...selected].some((key) => haystack.includes(key));
}

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
    await ensurePlannerCatalog();
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

    const requestedGoal = GOAL_CONFIGS[goal] ? goal : "commission";
    if (!GOAL_CONFIGS[requestedGoal]) {
      return void res.status(400).json({ error: `Unknown goal. Valid: ${Object.keys(GOAL_CONFIGS).join(", ")}` });
    }

    const config = GOAL_CONFIGS[requestedGoal];

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
    const profileEquipmentTypes = (bioRow?.equipmentTypes ?? []).map(normalizeKey);
    const availableIds = new Set(
      allEquipment
        .filter(e => equipmentMatchesProfile(e, profileEquipmentTypes) && !excludeEquipmentIds.includes(e.id))
        .map(e => e.id)
    );

    const allExercises = await db.select().from(exercisesTable);

    const avoidAll = [...avoidMuscleGroups, ...(config.avoidMuscles || [])];

    // Warmup: 2-3 bodyweight / light movements
    const warmupExercises = pickExercises(allExercises, availableIds, requestedGoal, 2, ["Core", "Cardio", "Mobility"], avoidAll, ["bodyweight", "cardio"]);

    // Main: 2-4 compound movements
    const mainExercises = pickExercises(allExercises, availableIds, requestedGoal, 3, config.targetMuscles, avoidAll, config.categories);

    // Accessories: 3-4 isolation / secondary
    const usedIds = new Set([...warmupExercises, ...mainExercises].map(e => e.id));
    const accessoryPool = allExercises.filter(e => !usedIds.has(e.id));
    const accessoryExercises = pickExercises(accessoryPool, availableIds, requestedGoal, 3, config.targetMuscles, avoidAll);

    // Finisher: 1 high-intensity close
    const finisherPool = allExercises.filter(e => !usedIds.has(e.id) && !accessoryExercises.find(a => a.id === e.id));
    const finisher = pickExercises(finisherPool, availableIds, requestedGoal, 1, ["Cardio", "Core", "Mobility"], avoidAll, ["bodyweight", "cardio", "martial_arts"]);

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
      grappling: "Protect joints and neck. Control matters more than force.",
    };

    res.json({
      planName: config.label,
      goal: requestedGoal,
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
      equipmentUsed: allEquipment
        .filter((item) => availableIds.has(item.id))
        .map((item) => item.name)
        .slice(0, 12),
      equipmentFallbackNote: availableIds.size === 0
        ? "No matching equipment was found in your profile, so the System generated a bodyweight-safe session."
        : null,
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
      category: goal === "striking" ? "striking"
        : goal === "grappling" ? "grappling"
          : goal === "conditioning" ? "conditioning"
            : goal === "recovery" || goal === "mobility" ? "recovery"
              : goal === "skill_practice" || goal === "commission" ? "mixed"
                : "strength",
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
