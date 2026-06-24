import { Router } from "express";
import { searchFoodMacroDatabase } from "../data/food-macro-database";

const router = Router();

const nowIso = () => new Date().toISOString();
const tomorrowIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

type MockTask = {
  id: number;
  questId: number;
  description: string;
  order: number;
  completed: boolean;
  completedAt: string | null;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
};

type MockQuest = {
  id: number;
  playerId: number;
  title: string;
  description: string;
  type: string;
  status: string;
  xpReward: number;
  goldReward: number;
  bonusStatPoints: number;
  difficulty: string;
  expiresAt: string | null;
  completedAt: string | null;
  claimedAt: string | null;
  createdAt: string;
  tasks: MockTask[];
};

const player: {
  id: number;
  clerkId: string;
  name: string;
  level: number;
  rank: string;
  xp: number;
  xpToNextLevel: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gold: number;
  freeStatPoints: number;
  streakDays: number;
  longestStreak: number;
  activeTitle: string;
  penaltyQuestActive: boolean;
  totalXpEarned: number;
  totalWorkouts: number;
  totalQuests: number;
  totalPrs: number;
  prestigeLevel: number;
  prestigeCount: number;
  xpMultiplier: number;
  baseClass: string;
  setupCompleted: boolean;
  lastActivityDate: string;
  loginStreak: number;
  lastLoginDate: string | null;
  guildId: number | null;
  createdAt: string;
  updatedAt: string;
  stats: Record<"strength" | "agility" | "stamina" | "vitality" | "discipline" | "sense", number>;
} = {
  id: 1,
  clerkId: "dev-user",
  name: "Jaelon",
  level: 7,
  rank: "E",
  xp: 420,
  xpToNextLevel: 800,
  hp: 125,
  maxHp: 140,
  mp: 90,
  maxMp: 110,
  gold: 850,
  freeStatPoints: 3,
  streakDays: 5,
  longestStreak: 9,
  activeTitle: "The Awakened",
  penaltyQuestActive: false,
  totalXpEarned: 5420,
  totalWorkouts: 18,
  totalQuests: 6,
  totalPrs: 4,
  prestigeLevel: 0,
  prestigeCount: 0,
  xpMultiplier: 1,
  baseClass: "warrior",
  setupCompleted: true,
  lastActivityDate: new Date().toISOString().slice(0, 10),
  loginStreak: 5,
  lastLoginDate: null,
  guildId: null,
  createdAt: nowIso(),
  updatedAt: nowIso(),
  stats: {
    strength: 9,
    agility: 7,
    stamina: 8,
    vitality: 9,
    discipline: 10,
    sense: 6,
  },
};

const dailyQuest: MockQuest = {
  id: 101,
  playerId: player.id,
  title: "Daily Training Protocol",
  description: "Complete today's guild requirements to earn XP, Gold, and bonus stat points.",
  type: "daily",
  status: "active",
  xpReward: 300,
  goldReward: 100,
  bonusStatPoints: 3,
  difficulty: "E",
  expiresAt: tomorrowIso(),
  completedAt: null,
  claimedAt: null,
  createdAt: nowIso(),
  tasks: [
    { id: 1001, questId: 101, description: "Complete a workout session", order: 1, completed: false, completedAt: null, targetValue: 1, currentValue: 0, unit: "session" },
    { id: 1002, questId: 101, description: "Hit your protein target", order: 2, completed: true, completedAt: nowIso(), targetValue: 180, currentValue: 186, unit: "g" },
    { id: 1003, questId: 101, description: "Log at least 3 meals", order: 3, completed: false, completedAt: null, targetValue: 3, currentValue: 2, unit: "meals" },
  ],
};

const weeklyQuest: MockQuest = {
  id: 102,
  playerId: player.id,
  title: "Weekly Proving Grounds",
  description: "Push your limits this week and show the guild your consistency.",
  type: "weekly",
  status: "active",
  xpReward: 1500,
  goldReward: 500,
  bonusStatPoints: 8,
  difficulty: "D",
  expiresAt: tomorrowIso(),
  completedAt: null,
  claimedAt: null,
  createdAt: nowIso(),
  tasks: [
    { id: 1004, questId: 102, description: "Complete 4 workout sessions", order: 1, completed: false, completedAt: null, targetValue: 4, currentValue: 2, unit: "sessions" },
    { id: 1005, questId: 102, description: "Set at least 2 new personal records", order: 2, completed: false, completedAt: null, targetValue: 2, currentValue: 1, unit: "PRs" },
  ],
};

const campaignQuest: MockQuest = {
  id: 201,
  playerId: player.id,
  title: "[Campaign] Q1: The Gate Opens",
  description: "Log your first training session to prove you answered the call.",
  type: "main",
  status: "active",
  xpReward: 120,
  goldReward: 60,
  bonusStatPoints: 1,
  difficulty: "E",
  expiresAt: null,
  completedAt: null,
  claimedAt: null,
  createdAt: nowIso(),
  tasks: [
    { id: 2001, questId: 201, description: "Complete one training session", order: 1, completed: false, completedAt: null, targetValue: 1, currentValue: 0, unit: "session" },
  ],
};

const battleLog = [
  {
    id: 1,
    playerId: player.id,
    sessionId: 1,
    encounterName: "Gate Skirmish",
    enemyName: "Iron Wraith",
    verdict: "Victory",
    xpEarned: 220,
    goldEarned: 75,
    prCount: 1,
    createdAt: nowIso(),
    events: [],
    styleScores: { strength: 4, striking: 1, conditioning: 2, grappling: 0, recovery: 1, discipline: 3 },
    gearDrop: null,
  },
];

const discoveredItems = [
  {
    id: 1,
    itemName: "Emberbound Signet",
    rarity: "rare",
    category: "relic",
    sourceType: "hall_offering",
    sourceLabel: "The Hall's Offerings",
    loreText: "A ring warmed by the Hall's old coals. It remembers every promise made before hard work.",
    currentState: "equipped",
    discoveredAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const mockArmory = [
  {
    id: 1,
    playerId: player.id,
    name: "Emberbound Signet",
    slot: "ring",
    rarity: "rare",
    equipped: true,
    statBonuses: { discipline: 1, vitality: 1 },
    flavorText: "A ring warmed by the Hall's old coals. It remembers every promise made before hard work.",
    source: "The Hall's Offerings",
    elementalAffinity: "fire",
    narrativeModifiers: ["Flame follows committed strikes."],
    xpBonusPercent: 3,
    cosmeticKey: null,
    acquiredAt: nowIso(),
  },
  {
    id: 2,
    playerId: player.id,
    name: "Wayfarer's Wraps",
    slot: "gloves",
    rarity: "uncommon",
    equipped: false,
    statBonuses: { agility: 1 },
    flavorText: "Plain cloth, stubborn magic.",
    source: "Daily Commission",
    elementalAffinity: "physical",
    narrativeModifiers: ["Clean repetitions leave a visible trail in battle."],
    xpBonusPercent: 1,
    cosmeticKey: null,
    acquiredAt: nowIso(),
  },
];

const mockInventory = [
  {
    id: 1,
    itemId: 101,
    quantity: 2,
    equipped: false,
    itemName: "Recovery Draught",
    itemType: "recovery_token",
    rarity: "common",
    description: "A practical restorative issued after hard commissions.",
    goldValue: 25,
    category: "consumable",
  },
  {
    id: 2,
    itemId: 102,
    quantity: 1,
    equipped: false,
    itemName: "Deload Pass",
    itemType: "deload_pass",
    rarity: "uncommon",
    description: "Lets recovery count as honorable duty when the body needs restraint.",
    goldValue: 60,
    category: "utility",
  },
];

const mockStoreItems = [
  {
    id: 201,
    name: "Wayfarer's Wraps",
    description: "Cloth wraps favored by adventurers who train without ceremony.",
    type: "gear",
    category: "gear",
    rarity: "uncommon",
    goldCost: 120,
    available: true,
    section: "permanent",
    styleAffinity: "discipline",
    rankRequired: null,
    levelRequired: 1,
    meetsRequirements: true,
  },
  {
    id: 202,
    name: "Recovery Draught",
    description: "Restores resolve after a difficult training day.",
    type: "recovery_token",
    category: "consumable",
    rarity: "common",
    goldCost: 40,
    available: true,
    section: "daily",
    styleAffinity: "recovery",
    rankRequired: null,
    levelRequired: 1,
    meetsRequirements: true,
  },
  {
    id: 203,
    name: "Gatefire Replay Sigil",
    description: "Adds a fire-touched flourish to combat replays without increasing real stats.",
    type: "cosmetic",
    category: "cosmetic",
    rarity: "rare",
    goldCost: 300,
    available: true,
    section: "weekly",
    styleAffinity: "strength",
    rankRequired: null,
    levelRequired: 5,
    meetsRequirements: true,
  },
  {
    id: 204,
    name: "Wraithbone Relic",
    description: "Raid-tier flavor for adventurers who have faced the outer Gates.",
    type: "gear",
    category: "gear",
    rarity: "epic",
    goldCost: 650,
    available: true,
    section: "raid",
    styleAffinity: "conditioning",
    rankRequired: "E",
    levelRequired: 7,
    meetsRequirements: true,
  },
];

router.get("/player", (_req, res) => {
  res.json(player);
});

router.patch("/player", (req, res) => {
  if (typeof req.body?.name === "string" && req.body.name.trim()) {
    player.name = req.body.name.trim();
  }
  res.json(player);
});

router.post("/player/setup", (req, res) => {
  if (typeof req.body?.name === "string" && req.body.name.trim()) {
    player.name = req.body.name.trim();
  }
  const scan = req.body?.systemScan;
  if (scan && typeof scan === "object") {
    biometrics = {
      ...biometrics,
      heightCm: typeof scan.heightCm === "number" ? scan.heightCm : null,
      weightKg: typeof scan.weightKg === "number" ? scan.weightKg : null,
      equipmentTypes: Array.isArray(scan.equipmentTypes) ? scan.equipmentTypes : [],
      notes: "Recorded during initial System scan.",
    };
    nutritionTargets = {
      ...nutritionTargets,
      sex: scan.sex === "other" ? null : scan.sex ?? null,
      ageYears: scan.ageYears ?? null,
      activityLevel: scan.activityLevel ?? "moderate",
      weightGoal: scan.weightGoal ?? "maintain",
      autoCalc: Boolean(scan.heightCm && scan.weightKg),
    };
  }
  player.setupCompleted = true;
  res.json(player);
});

router.post("/player/allocate-stats", (req, res) => {
  const allocations = req.body?.allocations ?? {};
  let spent = 0;
  for (const key of Object.keys(player.stats) as Array<keyof typeof player.stats>) {
    const amount = Number(allocations[key] ?? 0);
    if (amount > 0 && spent + amount <= player.freeStatPoints) {
      player.stats[key] += amount;
      spent += amount;
    }
  }
  player.freeStatPoints -= spent;
  res.json(player);
});

router.get("/player/daily-reward", (_req, res) => {
  res.json({
    alreadyClaimed: false,
    currentStreak: player.loginStreak,
    nextStreakDay: player.loginStreak + 1,
    reward: { day: 6, type: "xp", amount: 500, label: "500 XP" },
    calendar: [
      { day: 1, reward: { type: "gold", amount: 100, label: "100 Gold" }, claimed: true, isToday: false },
      { day: 2, reward: { type: "xp", amount: 150, label: "150 XP" }, claimed: true, isToday: false },
      { day: 3, reward: { type: "gold", amount: 200, label: "200 Gold" }, claimed: true, isToday: false },
      { day: 4, reward: { type: "xp", amount: 250, label: "250 XP" }, claimed: true, isToday: false },
      { day: 5, reward: { type: "gold", amount: 300, label: "300 Gold" }, claimed: true, isToday: false },
      { day: 6, reward: { type: "xp", amount: 500, label: "500 XP" }, claimed: false, isToday: true },
      { day: 7, reward: { type: "gold", amount: 700, label: "700 Gold" }, claimed: false, isToday: false },
    ],
    lastClaimedDate: player.lastLoginDate,
  });
});

router.post("/player/daily-reward/claim", (_req, res) => {
  player.loginStreak += 1;
  player.lastLoginDate = new Date().toISOString().slice(0, 10);
  res.json({ success: true, streakDay: player.loginStreak, rewardType: "xp", rewardAmount: 500, rewardLabel: "500 XP", isMilestone: false });
});

router.get("/dashboard/summary", (_req, res) => {
  res.json({
    player,
    dailyQuest,
    nutrition: {
      date: new Date().toISOString().slice(0, 10),
      totalCalories: 1840,
      totalProtein: 186,
      totalCarbs: 175,
      totalFat: 58,
      targetCalories: 2500,
      targetProtein: 180,
      targetCarbs: 250,
      targetFat: 80,
      remainingCalories: 660,
      entries: [],
    },
    workoutRecommendation: {
      templateId: 1,
      templateName: "Upper Body Gate Drill",
      reason: "Your last logged emphasis was endurance. Strength work is recommended next.",
    },
    streakDays: player.streakDays,
    lastWorkoutDaysAgo: 1,
  });
});

router.get("/battle-log", (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 50);
  res.json(battleLog.slice(0, limit));
});

router.get("/player/style-identity", (_req, res) => {
  res.json({
    strength: 4,
    striking: 1,
    conditioning: 2,
    grappling: 0,
    recovery: 1,
    discipline: 3,
    totalSessions: 18,
    hybridArchetype: "Disciplined Vanguard",
    percentages: { strength: 36, striking: 9, conditioning: 18, grappling: 0, recovery: 9, discipline: 27 },
    dominantStyle: "strength",
  });
});

router.get("/quests/daily", (_req, res) => {
  res.json(dailyQuest);
});

router.get("/quests", (_req, res) => {
  res.json([dailyQuest, weeklyQuest, campaignQuest]);
});

router.get("/quests/:id", (req, res) => {
  const quest = [dailyQuest, weeklyQuest, campaignQuest].find((item) => item.id === Number(req.params.id));
  if (!quest) {
    res.status(404).json({ error: "Quest not found" });
    return;
  }
  res.json(quest);
});

router.post("/quests/:id/complete-task", (req, res) => {
  const quest = [dailyQuest, weeklyQuest, campaignQuest].find((item) => item.id === Number(req.params.id));
  if (!quest) {
    res.status(404).json({ error: "Quest not found" });
    return;
  }
  const task = quest.tasks.find((item) => item.id === Number(req.body?.taskId));
  if (task) {
    task.completed = true;
    task.completedAt = nowIso();
    task.currentValue = task.targetValue ?? 1;
  }
  if (quest.tasks.every((item) => item.completed)) {
    quest.status = "completed";
    quest.completedAt = nowIso();
  }
  res.json(quest);
});

router.post("/quests/:id/claim", (req, res) => {
  const quest = [dailyQuest, weeklyQuest, campaignQuest].find((item) => item.id === Number(req.params.id));
  if (!quest) {
    res.status(404).json({ error: "Quest not found" });
    return;
  }
  quest.status = "claimed";
  quest.claimedAt = nowIso();
  player.gold += quest.goldReward;
  player.freeStatPoints += quest.bonusStatPoints;
  res.json({ xpEarned: quest.xpReward, goldEarned: quest.goldReward, player, quest });
});

router.get("/boss-raids", (_req, res) => {
  res.json([
    {
      id: 1,
      playerId: player.id,
      title: "Trial of the Iron Wraith",
      description: "A contained Gate threat suitable for Wood Grade adventurers.",
      difficulty: "E",
      status: "available",
      xpReward: 500,
      goldReward: 180,
      createdAt: nowIso(),
      completedAt: null,
    },
  ]);
});

const nutritionEntries = [
  { id: 1, date: new Date().toISOString().slice(0, 10), mealName: "Protein Shake", calories: 150, protein: 25, carbs: 8, fat: 3, mealType: "post_workout", notes: null, createdAt: nowIso() },
  { id: 2, date: new Date().toISOString().slice(0, 10), mealName: "Chicken & Rice", calories: 480, protein: 45, carbs: 52, fat: 8, mealType: "lunch", notes: null, createdAt: nowIso() },
];

let nutritionTargets = { calories: 2400, protein: 180, carbs: 250, fat: 70, sex: null as "male" | "female" | null, ageYears: null as number | null, activityLevel: "moderate", weightGoal: "maintain", autoCalc: false };
let biometrics = { heightCm: 178 as number | null, weightKg: 84 as number | null, bodyFatPct: null, squat1rm: 140, bench1rm: 102, deadlift1rm: 180, ohp1rm: 70, row1rm: 110, equipmentTypes: ["barbell", "heavy_bag"], notes: null as string | null };

router.get("/nutrition/targets", (_req, res) => {
  res.json(nutritionTargets);
});

router.patch("/nutrition/targets", (req, res) => {
  nutritionTargets = { ...nutritionTargets, ...req.body, autoCalc: true };
  res.json(nutritionTargets);
});

router.get("/nutrition/today", (_req, res) => {
  const totalCalories = nutritionEntries.reduce((sum, entry) => sum + entry.calories, 0);
  const totalProtein = nutritionEntries.reduce((sum, entry) => sum + entry.protein, 0);
  const totalCarbs = nutritionEntries.reduce((sum, entry) => sum + entry.carbs, 0);
  const totalFat = nutritionEntries.reduce((sum, entry) => sum + entry.fat, 0);
  res.json({
    date: new Date().toISOString().slice(0, 10),
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    targetCalories: 2400,
    targetProtein: 180,
    targetCarbs: 250,
    targetFat: 70,
    remainingCalories: Math.max(0, 2400 - totalCalories),
    entries: nutritionEntries,
  });
});

router.get("/nutrition/logs", (_req, res) => {
  res.json(nutritionEntries);
});

router.post("/nutrition/logs", (req, res) => {
  const entry = {
    id: 100 + nutritionEntries.length,
    date: req.body?.date ?? new Date().toISOString().slice(0, 10),
    mealName: req.body?.mealName ?? "Field Rations",
    calories: Number(req.body?.calories ?? 250),
    protein: Number(req.body?.protein ?? 20),
    carbs: Number(req.body?.carbs ?? 20),
    fat: Number(req.body?.fat ?? 8),
    mealType: req.body?.mealType ?? "snack",
    notes: req.body?.notes ?? null,
    createdAt: nowIso(),
  };
  nutritionEntries.push(entry);
  res.status(201).json(entry);
});

router.delete("/nutrition/logs/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = nutritionEntries.findIndex((entry) => entry.id === id);
  if (index >= 0) nutritionEntries.splice(index, 1);
  res.status(204).end();
});

router.get("/nutrition/food-search", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  res.json(searchFoodMacroDatabase(q, 24).map(item => ({
    id: item.id,
    name: item.name,
    calories100g: item.calories100g,
    protein100g: item.protein100g,
    carbs100g: item.carbs100g,
    fat100g: item.fat100g,
    fiber100g: item.fiber100g ?? null,
    sugar100g: item.sugar100g ?? null,
    sodiumMg100g: item.sodiumMg100g ?? null,
    servingSize: item.servingSize,
    servingGrams: item.servingGrams,
    category: item.category,
    source: item.source,
  })));
});

const workoutTemplates = [
  {
    id: 1,
    name: "Iron Foundation",
    category: "strength",
    description: "A simple barbell-focused drill for force and discipline.",
    estimatedDuration: 45,
    xpReward: 220,
    createdAt: nowIso(),
    exercises: [
      { exerciseId: 1, exerciseName: "Back Squat", sets: 3, reps: "5", restSeconds: 120, order: 1, notes: null },
      { exerciseId: 2, exerciseName: "Bench Press", sets: 3, reps: "5", restSeconds: 120, order: 2, notes: null },
    ],
  },
  {
    id: 2,
    name: "Roadwork Commission",
    category: "conditioning",
    description: "A conditioning session for stamina before the next Gate.",
    estimatedDuration: 30,
    xpReward: 160,
    createdAt: nowIso(),
    exercises: [
      { exerciseId: 3, exerciseName: "Zone 2 Walk/Jog", sets: 1, reps: "25 min", restSeconds: null, order: 1, notes: null },
    ],
  },
];

router.get("/training/templates", (_req, res) => {
  res.json(workoutTemplates);
});

router.get("/training/sessions", (_req, res) => {
  res.json([
    { id: 1, name: "Gate Skirmish Prep", templateId: 1, status: "completed", sets: [], xpEarned: 220, goldEarned: 75, notes: null, startedAt: nowIso(), completedAt: nowIso(), durationMinutes: 42, templateExercises: [] },
  ]);
});

router.post("/training/sessions", (req, res) => {
  res.status(201).json({ id: 900, name: req.body?.name ?? "Guild Drill", templateId: req.body?.templateId ?? null, status: "active", sets: [], xpEarned: null, goldEarned: null, notes: null, startedAt: nowIso(), completedAt: null, durationMinutes: null, templateExercises: [] });
});

router.get("/guild-master/conversation", (_req, res) => {
  res.json({
    conversationId: 1,
    messages: [
      {
        id: 1,
        role: "assistant",
        content: "Welcome back, adventurer. The board is updated, and your next Gate is waiting.",
        createdAt: nowIso(),
      },
    ],
  });
});

router.post("/guild-master/messages", (req, res) => {
  const content = String(req.body?.content ?? "").trim();
  const lower = content.toLowerCase();
  const reply = !content
    ? "Speak plainly, adventurer. The Guild rewards action."
    : lower.includes("system") || lower.includes("aethoria") || lower.includes("world") || lower.includes("sovereign") || lower.includes("gate")
      ? "Here is the state of Aethoria as the Guild can honestly name it. You were summoned, and the act was no accident: powers and councils moved in ways most citizens will never understand. What I will not pretend to know is the hidden mechanism you call the System. The Sovereign remains the great enemy in our records: not merely a monster, but a force that feeds on stagnation. Your current ledger shows no active catastrophe, which gives us room to speak, plan, and build readiness before the next rupture."
      : `I hear you: "${content}". Good. I can answer plainly about Aethoria, the Gates, your summoning, your record, or the next duty. Then we turn the answer into one completed action before the day ends.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.write(`data: ${JSON.stringify({ content: reply })}\n\n`);
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.get("/guild-master/monthly-report", (req, res) => {
  const month = Number(req.query.month ?? new Date().getMonth() + 1);
  const year = Number(req.query.year ?? new Date().getFullYear());
  res.json({
    month,
    year,
    text: "Field Assessment: consistency is forming. Continue pairing training with recovery, and claim the daily board before chasing harder gates.",
    reportText: "Field Assessment: consistency is forming. Continue pairing training with recovery, and claim the daily board before chasing harder gates.",
  });
});

router.get("/guild-master/campaign-quests", (_req, res) => {
  res.json([
    {
      campaignId: 1,
      questId: campaignQuest.id,
      status: campaignQuest.status,
      title: campaignQuest.title,
      completedAt: campaignQuest.completedAt,
      claimedAt: campaignQuest.claimedAt,
      createdAt: campaignQuest.createdAt,
    },
  ]);
});

router.post("/guild-master/campaign-quests/:campaignId/start", (req, res) => {
  const id = Number(req.params.campaignId);
  if (id === 1) {
    res.status(409).json({ error: "Campaign quest already active", quest: campaignQuest });
    return;
  }
  res.json({
    ...campaignQuest,
    id: 200 + id,
    title: `[Campaign] Q${id}: Mock Campaign Mission`,
    status: "active",
  });
});

const buildMockGuildHall = () => ({
  date: new Date().toISOString().slice(0, 10),
  player,
  worldDanger: {
    value: 96,
    state: "critical",
    label: "Critical",
    defeatedBosses: 0,
    activeThreats: 1,
    failedIncursions: 0,
    systemNote: "Only the summoned adventurer can read this System-level danger index. The Guild senses pressure, but not the exact measure.",
    nextRelief: "Defeating bosses lowers world danger. Failed incursions and active threats raise it.",
  },
  commission: {
    id: 1,
    category: "conditioning",
    rationale: "Your record leans toward force, but the road still tests lungs and legs. Location: Frostgate Pass, Frostveil Peaks.",
    readiness: "ready",
    reportedAt: dailyQuest.status === "claimed" ? nowIso() : null,
    location: {
      key: "frostgate-pass",
      name: "Frostgate Pass",
      kind: "gate",
      realm: "Frostveil Mountain Holds",
      region: "Frostveil Peaks",
      primaryFaction: "Frostveil Wardens",
      distanceFromGuildHallMiles: 910,
      knownAtStart: false,
      summary: "A high-altitude pass where caravans vanish when Gate pressure rises.",
      bestFor: ["conditioning", "exploration", "mobility"],
    },
    travel: {
      continentSquareMiles: 2000000,
      onFootMiles: 13.5,
      caravanMiles: 858.5,
      mountMiles: 38,
      returnStoneMiles: 910,
      travelMethod: "Guild caravan, then on-foot scouting route",
      routeNote: "Aethoria is vast, so the caravan covers the continent-scale road. Aldric shortens the final support leg so the scouting run itself becomes the mission.",
      narrativeReason: "A runner is needed to verify the route near Frostgate Pass before slower wagons commit.",
    },
    expedition: {
      commissionTitle: "Frostgate Pass Commission",
      region: {
        regionId: "frostveil-peaks",
        regionName: "Frostveil Peaks",
        theme: ["cold", "altitude", "mountain travel", "survival", "endurance"],
        trainingStyles: ["conditioning", "walking", "zone_2", "mobility"],
        briefingTone: "Frostveil does not forgive arrogance. The pass tests lungs before it tests blades.",
        knownAtStart: false,
      },
      narrativeFlavor: {
        kind: "escort",
        title: "Escort Writ: The Last Mile to Frostgate Pass",
        patron: "Frostveil Wardens",
        hook: "The caravan can take the long road, but the final leg needs someone who can move when the air turns hostile.",
        objective: "Verify the route, mark the hazards, and keep the support line from walking blind.",
        stakes: "If the path is wrong, slow wagons become stranded wagons.",
        rumor: "A frozen marker stone appeared farther down the pass than it stood yesterday.",
      },
      majorQuest: {
        available: false,
        threshold: 5,
        completedTowardUnlock: 3,
        title: "Gate Pressure: Main Quest Opportunity",
        description: "Complete 2 more Guild commissions to draw the next major threat into reach.",
        routeLabel: "Check Boss Raids",
      },
      narrativeBriefing: "Aldric marks the route with a scarred finger. 'Frostveil does not forgive arrogance. The pass will test your lungs before it tests your blade.'",
      threat: "Mountain pass pressure, thin air, and a scouting route that must be verified before the caravan commits.",
      recommendedPath: { id: "build_endurance", label: "Scout the long road", kind: "workout_builder", intendedStyle: "conditioning", completionPath: "endurance_workout", narrative: "A clean endurance session proves the route can be held after the caravan breaks camp.", recommended: true },
      alternativePaths: [
        { id: "start_cardio", label: "Run the final approach", kind: "template", intendedStyle: "conditioning", completionPath: "cardio_session", narrative: "The wagons stop short. The last stretch needs lungs, rhythm, and patience." },
      ],
      travelMethod: "Guild caravan, then on-foot scouting route",
      returnStoneNote: "Upon completion, your Return Stone will draw you back to the Guild Hall. Your real steps contribute to the expedition, but Aethoria spans about 2,000,000 square miles.",
      realWorldAction: "Complete endurance, cardio, steps, or conditioning work.",
      aldricReason: "You have built power, but this route will not be impressed by power alone. Endurance is the lesson today.",
    },
    regionProgress: {
      regionId: "frostveil-peaks",
      regionName: "Frostveil Peaks",
      known: false,
      discovered: false,
      visited: false,
      commissionsCompleted: 0,
      bossesDefeated: 0,
      explorationPercent: 0,
      dominantStyleUsed: null,
      lastVisitedAt: null,
    },
    quest: dailyQuest,
  },
  counsel: {
    name: "Grandmaster Aldric",
    message: dailyQuest.tasks.every((task) => task.completed)
      ? "The commission is complete. Report plainly, claim what you earned, and carry the lesson forward."
      : "Discipline is built in small, honored actions. Finish today's commission, then report to me.",
    memories: [
      { id: 1, kind: "accomplishment", summary: "Maintained a five-day training streak.", importance: 2, occurredAt: nowIso() },
    ],
    trendSummary: {
      recentWorkouts: 3,
      recentPrs: 1,
      dominantStyle: "strength",
      neglectedStyle: "conditioning",
      proteinToday: 186,
      proteinTarget: 180,
      mealsToday: 2,
    },
    guardrails: { injuryNotesPresent: false, recoveryFirst: false },
  },
  campaign: { chapter: 1, title: "The Awakening" },
  equippedGear: [
    { id: 1, name: "Emberbound Signet", elementalAffinity: "fire", narrativeModifiers: ["Flame follows committed strikes."], xpBonusPercent: 3 },
  ],
  hallOfferings: {
    title: "The Hall's Offerings",
    lore: "The Hall remembers what Aldric once bound, spared, and brought home.",
    preview: [
      { id: 1, name: "Wayfarer's Wraps", rarity: "uncommon", category: "gear", goldCost: 120, loreText: "Plain cloth, stubborn magic." },
    ],
  },
  readiness: { sleepHours: 7, steps: 4200, activeMinutes: 22, injuryNotesPresent: false },
  consequences: [],
  worldEvents: [],
});

router.get("/guild-hall/today", (_req, res) => {
  res.json(buildMockGuildHall());
});

router.post("/guild-hall/report", (_req, res) => {
  const remainingTasks = dailyQuest.tasks.filter((task) => !task.completed);
  if (remainingTasks.length > 0) {
    const aldric = {
      tone: "firm",
      counsel: "You have reported honestly, but the commission remains open. Start with the smallest remaining duty, then return without ceremony.",
      memoryReferences: ["five-day training streak", "strength style history"],
      practicalRecommendation: "Complete the smallest remaining duty first, then log it.",
      warning: null,
      rewardSummary: "No reward is claimed until the commission is complete.",
      nextStep: remainingTasks[0]?.description ?? "Finish the next duty",
    };
    res.json({
      reported: false,
      alreadyReported: false,
      remainingTasks: remainingTasks.map(({ id, description }) => ({ id, description })),
      counsel: aldric.counsel,
      aldric,
      snapshot: buildMockGuildHall(),
    });
    return;
  }
  const alreadyReported = dailyQuest.status === "claimed";
  dailyQuest.status = "claimed";
  dailyQuest.claimedAt = dailyQuest.claimedAt ?? nowIso();
  if (!alreadyReported) {
    player.gold += dailyQuest.goldReward;
    player.xp += dailyQuest.xpReward;
  }
  res.json({
    reported: true,
    alreadyReported,
    rewards: { xp: dailyQuest.xpReward, gold: dailyQuest.goldReward, statPoints: dailyQuest.bonusStatPoints },
    counsel: "Good. The work is recorded, and the reward is earned. You are stacking days into a real pattern now.",
    aldric: {
      tone: "grizzled_kind",
      counsel: "Good. The work is recorded, and the reward is earned. You are stacking days into a real pattern now.",
      memoryReferences: ["five-day training streak", "recent personal record"],
      practicalRecommendation: "Recover with the same discipline you brought to the task.",
      warning: null,
      rewardSummary: `${dailyQuest.xpReward} XP, ${dailyQuest.goldReward} gold, ${dailyQuest.bonusStatPoints} stat points`,
      nextStep: "Return tomorrow for a fresh commission.",
    },
    snapshot: buildMockGuildHall(),
  });
});

router.get("/chronicle/summary", (_req, res) => {
  res.json({
    worldDanger: {
      value: 96,
      state: "critical",
      label: "Critical",
      defeatedBosses: 0,
      activeThreats: 1,
      failedIncursions: 0,
      systemNote: "Only the summoned adventurer can read this System-level danger index. The Guild senses pressure, but not the exact measure.",
      nextRelief: "Defeating bosses lowers world danger. Failed incursions and active threats raise it.",
    },
    battleReplays: battleLog,
    guildReports: [
      { id: 1, month: new Date().getMonth() + 1, year: new Date().getFullYear(), reportText: "The Guild records an adventurer learning consistency.", generatedAt: nowIso() },
    ],
    campaignProgress: [campaignQuest],
    discoveredItems,
    bossesDefeated: [{ id: 1, title: "Iron Wraith", difficulty: "E", completedAt: nowIso(), titleReward: null }],
    titlesEarned: [{ id: 1, name: "The Awakened", description: "Answered the first call.", rarity: "common", equipped: true, earnedAt: nowIso() }],
    personalRecords: [{ id: 1, exerciseName: "Bench Press", weight: 225, reps: 5, weightUnit: "lbs", estimatedOneRepMax: 253, achievedAt: nowIso() }],
    map: {
      status: "Known Routes",
      title: "Map of Aethoria",
      description: "The Hall's records have begun charting your passage through Aethoria. Regions, Gates, roads, and battle sites will appear here as your Chronicle grows. For now, only the routes most often spoken of in the Guild's ledgers are clear.",
    },
    majorMilestones: [{ id: 1, kind: "accomplishment", summary: "Maintained a five-day training streak.", importance: 2, occurredAt: nowIso() }],
    worldEvents: [],
  });
});

router.get("/inventory", (_req, res) => {
  res.json(mockInventory);
});

router.post("/inventory/:id/sell", (req, res) => {
  const id = Number(req.params.id);
  const item = mockInventory.find((entry) => entry.id === id);
  if (!item) return void res.status(404).json({ error: "Item not found" });
  if (item.quantity > 1) item.quantity -= 1;
  else mockInventory.splice(mockInventory.indexOf(item), 1);
  player.gold += Math.max(1, Math.floor((item.goldValue ?? 4) * 0.25));
  res.json({ message: `Sold ${item.itemName}. The Chronicle keeps its discovery record.`, goldReceived: Math.max(1, Math.floor((item.goldValue ?? 4) * 0.25)) });
});

router.get("/armory", (_req, res) => {
  res.json(mockArmory);
});

router.post("/armory/:id/equip", (req, res) => {
  const id = Number(req.params.id);
  const gear = mockArmory.find((entry) => entry.id === id);
  if (!gear) return void res.status(404).json({ error: "Gear not found" });
  const nextEquipped = !gear.equipped;
  if (nextEquipped) {
    for (const item of mockArmory) {
      if (item.slot === gear.slot) item.equipped = false;
    }
  }
  gear.equipped = nextEquipped;
  res.json({ id: gear.id, equipped: gear.equipped, slot: gear.slot });
});

router.get("/store/items", (_req, res) => {
  res.json(mockStoreItems);
});

router.get("/store/sections", (_req, res) => {
  res.json({
    daily: mockStoreItems.filter((item) => item.section === "daily"),
    weekly: mockStoreItems.filter((item) => item.section === "weekly"),
    permanent: mockStoreItems.filter((item) => item.section === "permanent"),
    raid: mockStoreItems.filter((item) => item.section === "raid"),
  });
});

router.post("/store/purchase", (req, res) => {
  const itemId = Number(req.body?.itemId);
  const item = mockStoreItems.find((entry) => entry.id === itemId);
  if (!item) return void res.status(404).json({ error: "Item not found" });
  if (player.gold < item.goldCost) return void res.status(400).json({ error: "Not enough gold" });
  player.gold -= item.goldCost;
  mockInventory.push({
    id: Math.max(0, ...mockInventory.map((entry) => entry.id)) + 1,
    itemId: item.id,
    quantity: 1,
    equipped: false,
    itemName: item.name,
    itemType: item.type,
    rarity: item.rarity,
    description: item.description,
    goldValue: item.goldCost,
    category: item.category,
  });
  res.json({ message: `${item.name} acquired.`, goldRemaining: player.gold });
});

router.get("/character/summary", (_req, res) => {
  const bySlot = new Map(mockArmory.filter((item) => item.equipped).map((item) => {
    const slot = item.slot === "chest" ? "armor" : item.slot === "gloves" ? "gloves_wraps" : item.slot;
    return [slot, item] as const;
  }));
  res.json({
    player,
    identity: {
      class: "Disciplined Vanguard",
      rank: player.rank,
      activeTitle: player.activeTitle,
      dominantStyle: { strength: 4, striking: 1, conditioning: 2, grappling: 0, recovery: 1, discipline: 3, totalSessions: 18, hybridArchetype: "Disciplined Vanguard" },
    },
    gearSlots: [
      { slot: "weapon", label: "Weapon" },
      { slot: "armor", label: "Armor" },
      { slot: "gloves_wraps", label: "Gloves/Wraps" },
      { slot: "boots", label: "Boots" },
      { slot: "ring", label: "Ring" },
      { slot: "relic", label: "Relic" },
      { slot: "cloak", label: "Cloak" },
      { slot: "title", label: "Title" },
      { slot: "aura_cosmetic", label: "Aura/Cosmetic" },
    ].map((slot) => {
      const item = bySlot.get(slot.slot);
      return {
        ...slot,
        item: item ? {
          id: item.id,
          name: item.name,
          rarity: item.rarity,
          elementalAffinity: item.elementalAffinity,
          cosmeticKey: item.cosmeticKey,
        } : slot.slot === "title"
          ? { id: 1, name: "The Awakened", rarity: "common", elementalAffinity: "physical", cosmeticKey: null }
          : null,
      };
    }),
    titles: [{ id: 1, name: "The Awakened", description: "Answered the first call.", rarity: "common", equipped: true, earnedAt: nowIso() }],
    appearance: { aura: null, cosmeticCount: 0 },
    biometrics,
    realEquipment: [
      { id: 1, name: "Barbell", category: "barbell", available: true },
      { id: 2, name: "Heavy Bag", category: "striking", available: true },
    ],
    inventorySummary: { items: mockInventory.length, gear: mockArmory.length, equippedGear: mockArmory.filter((item) => item.equipped).length },
    settingsShortcuts: [
      { key: "narrative_mode", label: "Narrative Mode", href: "/settings" },
      { key: "privacy", label: "Privacy", href: "/privacy" },
      { key: "data_export", label: "Export Data", href: "/data" },
      { key: "delete_data", label: "Delete Data", href: "/data" },
    ],
  });
});

router.post("/health/import", (req, res) => {
  const events = Array.isArray(req.body?.events) ? req.body.events : [];
  res.json({ source: req.body?.source ?? "health_connect", imported: events.length, duplicates: 0, total: events.length });
});

export default router;
