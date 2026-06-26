import { Router } from "express";
import { db } from "@workspace/db";
import {
  bossRaidsTable,
  guildMasterMemoriesTable,
  itemDiscoveriesTable,
  playerTable,
  playerTitlesTable,
  rpgGearTable,
  titlesTable,
  worldEventsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getOrCreatePlayer, buildPlayerResponse, applyXpEvent } from "../progression";

const router = Router();

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

// ── Gear Catalog ──────────────────────────────────────────────────────────────

const GEAR_CATALOG: Record<string, Record<string, string[]>> = {
  weapon: {
    common: ["Crude Iron Blade", "Worn Training Shortsword", "Dull Bronze Knife"],
    uncommon: ["Adventurer's Curved Blade", "Reinforced War Pick", "Iron Hunting Spear"],
    rare: ["Dungeon-Forged Longsword", "Shadow-Etched Curved Blade", "Gate-Touched Greatsword"],
    epic: ["Crimson Gate Saber", "Rift-Scarred Cleaver", "Dungeon Sovereign's Edge"],
    legendary: ["Monarch's Rift Blade", "Aether-Born Greatsword", "Edge of the Sovereign"],
  },
  offhand: {
    common: ["Cracked Wooden Buckler", "Worn Iron Parrying Dagger"],
    uncommon: ["Adventurer's Reinforced Shield", "Carved Bone Ward"],
    rare: ["Dungeon Warden's Shield", "Shadow-Forged Aegis"],
    epic: ["Crimson Gate Bulwark", "Rift-Tempered War Shield"],
    legendary: ["Sovereign's Unbreakable Aegis", "Aether-Bound Protector"],
  },
  helmet: {
    common: ["Leather Cap", "Bronze Skullcap"],
    uncommon: ["Adventurer's Reinforced Helm", "Carved Bone Circlet"],
    rare: ["Dungeon Guardian's Helm", "Shadow-Forged Crown"],
    epic: ["Crimson Warlord's Visor", "Rift-Blessed War Helm"],
    legendary: ["Sovereign's Iron Crown", "Aether-Wreathed Battle Helm"],
  },
  chest: {
    common: ["Tattered Leather Vest", "Basic Iron Chainmail"],
    uncommon: ["Adventurer's Reinforced Leathers", "Iron Scale Hauberk"],
    rare: ["Dungeon Warden's Breastplate", "Shadow-Woven Chain Coat"],
    epic: ["Crimson Gate Cuirass", "Rift-Tempered Battle Armor"],
    legendary: ["Sovereign's Ironclad Plate", "Aether-Forged Exosuit"],
  },
  gloves: {
    common: ["Rough Leather Wraps", "Basic Iron Gauntlets"],
    uncommon: ["Adventurer's Grip Bracers", "Reinforced Combat Gloves"],
    rare: ["Dungeon Forged Gauntlets", "Shadow-Threaded Iron Gloves"],
    epic: ["Crimson Gate Crushers", "Rift-Scarred Battle Fists"],
    legendary: ["Sovereign's Iron Grasp", "Aether-Wreathed War Gauntlets"],
  },
  boots: {
    common: ["Worn Traveler's Boots", "Basic Iron Greaves"],
    uncommon: ["Adventurer's Swift Boots", "Reinforced Leather Greaves"],
    rare: ["Dungeon Walker's Greaves", "Shadow-Forged Pursuit Boots"],
    epic: ["Crimson Gate Striders", "Rift-Tempered Warboots"],
    legendary: ["Sovereign's Unstoppable Treads", "Aether-Blessed Swift Greaves"],
  },
  ring: {
    common: ["Copper Band", "Rough Stone Ring"],
    uncommon: ["Adventurer's Lucky Ring", "Carved Bone Ring"],
    rare: ["Dungeon-Forged Iron Ring", "Shadow-Etched Signet"],
    epic: ["Crimson Gate Ring of Power", "Rift-Touched Battle Signet"],
    legendary: ["Sovereign's Ring of Dominion", "Aether-Bound Eternal Ring"],
  },
  necklace: {
    common: ["Hemp Cord Pendant", "Dull Stone Charm"],
    uncommon: ["Adventurer's Lucky Charm", "Carved Bone Pendant"],
    rare: ["Dungeon Crystal Necklace", "Shadow-Infused Amulet"],
    epic: ["Crimson Gate Medallion", "Rift-Blessed Power Amulet"],
    legendary: ["Sovereign's Amulet of Command", "Aether-Core Eternal Pendant"],
  },
};

const FLAVOR_TEXTS: Record<string, string> = {
  common: "A basic piece of equipment salvaged from the outer training zones.",
  uncommon: "Crafted by a skilled artisan of Aethoria, bearing subtle enchantments.",
  rare: "Forged deep within a dungeon, imbued with residual mana crystals.",
  epic: "An artifact of legend, feared and revered across the known zones.",
  legendary: "An ancient relic. Its power transcends mortal understanding.",
};

const GEAR_SLOTS = ["weapon", "offhand", "helmet", "chest", "gloves", "boots", "ring", "necklace"] as const;
const STAT_KEYS = ["strength", "agility", "stamina", "vitality", "discipline", "sense"] as const;

function difficultyToRarity(difficulty: string): string {
  const map: Record<string, string> = { E: "common", D: "uncommon", C: "rare", B: "epic", A: "epic", S: "legendary" };
  return map[difficulty] ?? "common";
}

function generateStatBonuses(rarity: string): Record<string, number> {
  const configs: Record<string, { total: number; count: number }> = {
    common: { total: 1, count: 1 },
    uncommon: { total: 2, count: 2 },
    rare: { total: 4, count: 3 },
    epic: { total: 6, count: 4 },
    legendary: { total: 10, count: 6 },
  };
  const cfg = configs[rarity] ?? configs.common;
  const chosen = [...STAT_KEYS].sort(() => Math.random() - 0.5).slice(0, cfg.count);
  const result: Record<string, number> = {};
  let remaining = cfg.total;
  for (let i = 0; i < chosen.length; i++) {
    if (i === chosen.length - 1) {
      result[chosen[i]] = Math.max(1, remaining);
    } else {
      const pts = Math.max(1, Math.round(remaining / (chosen.length - i)));
      result[chosen[i]] = pts;
      remaining -= pts;
    }
  }
  return result;
}

function generateGearDrop(difficulty: string, source: string) {
  const rarity = difficultyToRarity(difficulty);
  const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
  const names = GEAR_CATALOG[slot]?.[rarity] ?? GEAR_CATALOG[slot]?.common ?? ["Unknown Artifact"];
  const name = names[Math.floor(Math.random() * names.length)];
  return { name, slot, rarity, statBonuses: generateStatBonuses(rarity), flavorText: FLAVOR_TEXTS[rarity], source };
}

function raidSeverity(difficulty: string) {
  if (difficulty === "S" || difficulty === "A") return "critical";
  if (difficulty === "B" || difficulty === "C") return "major";
  return "moderate";
}

function raidRelief(difficulty: string) {
  const relief: Record<string, number> = { E: 4, D: 6, C: 8, B: 10, A: 12, S: 16 };
  return relief[difficulty] ?? 4;
}

function raidStakeLine(difficulty: string, title: string) {
  if (difficulty === "S" || difficulty === "A") {
    return `${title} is a campaign-level threat. Other adventurers hold the line, but the summoned adventurer's recorded work gives the Guild its sharpest opening.`;
  }
  if (difficulty === "B" || difficulty === "C") {
    return `${title} is strong enough to bend a region if left unanswered. The Guild can contain it, but victory requires repeated, real effort.`;
  }
  return `${title} is not the end of the war, but small Gates become disasters when ignored. The Guild records this as a proving threat.`;
}

async function recordRaidWorldEvent(input: {
  playerId: number;
  raidId: number;
  title: string;
  difficulty: string;
  phase: "started" | "completed" | "claimed" | "failed";
  description?: string | null;
  gearDropName?: string | null;
}) {
  const severity = raidSeverity(input.difficulty);
  const relief = raidRelief(input.difficulty);
  const titleByPhase = {
    started: `Guild Directive Accepted: ${input.title}`,
    completed: `Boss Forced Back: ${input.title}`,
    claimed: `Boss Defeated: ${input.title}`,
    failed: `Forced Retreat: ${input.title}`,
  } as const;
  const statusByPhase = {
    started: "active",
    completed: "resolved",
    claimed: "resolved",
    failed: "unresolved",
  } as const;
  const descriptionByPhase = {
    started: `${raidStakeLine(input.difficulty, input.title)} The Hall has opened a raid ledger; every qualifying session now presses against this threat.`,
    completed: `${input.title} has been driven to its knees. The Guild still needs the reward claim recorded before the Chronicle closes the victory.`,
    claimed: `${input.title} has fallen. World danger recedes by roughly ${relief} points in the System's reading, while the Guild only sees the pressure ease across scout reports and Gate behavior.${input.gearDropName ? ` Loot recovered: ${input.gearDropName}.` : ""}`,
    failed: `${input.title} forced a retreat. This does not erase training progress, but the world remembers the loss and the pressure rises.`,
  } as const;

  await db.insert(worldEventsTable).values({
    playerId: input.playerId,
    worldKey: `raid-${input.phase}:${input.raidId}`,
    title: titleByPhase[input.phase],
    description: input.description ?? descriptionByPhase[input.phase],
    status: statusByPhase[input.phase],
    severity,
    reversible: input.phase === "failed",
    metadata: {
      raidId: input.raidId,
      difficulty: input.difficulty,
      phase: input.phase,
      worldDangerRelief: input.phase === "claimed" ? relief : 0,
      gearDropName: input.gearDropName ?? null,
      otherAdventurersPresent: true,
    },
    resolvedAt: input.phase === "completed" || input.phase === "claimed" ? new Date() : null,
  }).onConflictDoNothing();

  await db.insert(guildMasterMemoriesTable).values({
    playerId: input.playerId,
    kind: input.phase === "failed" ? "failure" : "raid",
    sourceKey: `raid-${input.phase}:${input.raidId}`,
    summary: input.phase === "claimed"
      ? `The adventurer helped defeat ${input.title}; the Guild felt pressure ease after the raid.`
      : input.phase === "failed"
        ? `${input.title} forced a retreat. The adventurer's earned progress remains, but Aethoria remembers the loss.`
        : `${input.title} entered the Guild's raid ledger at phase ${input.phase}.`,
    importance: input.phase === "claimed" || severity === "critical" ? 3 : 2,
    occurredAt: new Date(),
  }).onConflictDoNothing();
}

// ── Raid Task Auto-Progression ────────────────────────────────────────────────

export async function progressRaidTasks(playerId: number, taskType: string, amount: number): Promise<void> {
  const raids = await db.select().from(bossRaidsTable)
    .where(and(eq(bossRaidsTable.playerId, playerId), eq(bossRaidsTable.status, "active")));

  for (const raid of raids) {
    const tasks = (raid.tasks as any[]);
    let changed = false;

    const updatedTasks = tasks.map((t: any) => {
      if (t.taskType !== taskType || t.completed) return t;
      const newValue = (t.currentValue ?? 0) + amount;
      const isCompleted = t.targetValue ? newValue >= t.targetValue : false;
      if (newValue !== t.currentValue || isCompleted !== t.completed) changed = true;
      return { ...t, currentValue: newValue, completed: isCompleted };
    });

    if (changed) {
      const allDone = updatedTasks.every((t: any) => t.completed);
      await db.update(bossRaidsTable).set({
        tasks: updatedTasks,
        status: allDone ? "completed" : "active",
        completedAt: allDone ? new Date() : undefined,
      }).where(eq(bossRaidsTable.id, raid.id));
      if (allDone) {
        await recordRaidWorldEvent({
          playerId,
          raidId: raid.id,
          title: raid.title,
          difficulty: raid.difficulty,
          phase: "completed",
        });
      }
    }
  }
}

// ── Raid Templates ────────────────────────────────────────────────────────────

interface RaidTask {
  id: string;
  description: string;
  targetValue?: number;
  unit?: string;
  taskType: "workout_sessions" | "prs" | "streak_days" | "nutrition_days" | "skill_unlocks" | "manual";
}

interface RaidTemplate {
  title: string;
  description: string;
  lore: string;
  difficulty: "E" | "D" | "C" | "B" | "A" | "S";
  timeLimitHours: number;
  xpReward: number;
  goldReward: number;
  bonusStatPoints: number;
  titleReward?: string;
  triggerCondition: string;
  isRepeatable: boolean;
  tasks: RaidTask[];
}

const RAID_TEMPLATES: RaidTemplate[] = [
  {
    title: "The First Gate",
    description: "Prove yourself worthy of ascending beyond Wood Grade. Complete the entry-level challenge.",
    lore: "A pulsing Gate has appeared near the training grounds. The Hall records this as a proving threat: answer it within 72 hours, or the Guild will be forced to contain the breach without you.",
    difficulty: "E",
    timeLimitHours: 72,
    xpReward: 600,
    goldReward: 250,
    bonusStatPoints: 5,
    titleReward: "Gate Opener",
    triggerCondition: "streak_7",
    isRepeatable: false,
    tasks: [
      { id: "t1", description: "Complete 3 workout sessions", targetValue: 3, unit: "sessions", taskType: "workout_sessions" },
      { id: "t2", description: "Hit calorie targets 3 days in a row", targetValue: 3, unit: "days", taskType: "nutrition_days" },
      { id: "t3", description: "Log a personal record on any lift", targetValue: 1, unit: "PRs", taskType: "prs" },
    ],
  },
  {
    title: "Shadow Boxing Championship",
    description: "The striking arena opens. Dominate 10 rounds of intense bag work to claim your place.",
    lore: "A challenger emerges from the darkness beyond the arena lamps. The crowd sees a duel; you see your real training translated into violence Aethoria can understand.",
    difficulty: "D",
    timeLimitHours: 48,
    xpReward: 1000,
    goldReward: 400,
    bonusStatPoints: 7,
    titleReward: "Shadow Striker",
    triggerCondition: "rank_D",
    isRepeatable: false,
    tasks: [
      { id: "t1", description: "Complete 10 heavy bag rounds (3 min each)", targetValue: 10, unit: "rounds", taskType: "manual" },
      { id: "t2", description: "Complete 3 striking sessions in 48 hours", targetValue: 3, unit: "sessions", taskType: "workout_sessions" },
      { id: "t3", description: "Maintain a 2-day streak during the raid", targetValue: 2, unit: "days", taskType: "streak_days" },
    ],
  },
  {
    title: "Iron Dungeon: The Proving Chamber",
    description: "A hidden dungeon has manifested. Break through it with raw power — or be crushed.",
    lore: "The dungeon gates seal behind you. Iron mechanisms test your resolve while the Guild holds the outer passage and waits for your signal.",
    difficulty: "C",
    timeLimitHours: 96,
    xpReward: 2000,
    goldReward: 750,
    bonusStatPoints: 10,
    titleReward: "Dungeon Breaker",
    triggerCondition: "rank_C",
    isRepeatable: false,
    tasks: [
      { id: "t1", description: "Complete 5 strength training sessions", targetValue: 5, unit: "sessions", taskType: "workout_sessions" },
      { id: "t2", description: "Set 3 new personal records", targetValue: 3, unit: "PRs", taskType: "prs" },
      { id: "t3", description: "Hit all macro targets for 5 days", targetValue: 5, unit: "days", taskType: "nutrition_days" },
      { id: "t4", description: "Maintain streak throughout the dungeon", targetValue: 4, unit: "days", taskType: "streak_days" },
    ],
  },
  {
    title: "The Steel Grade Gauntlet",
    description: "A true test of a warrior's endurance and mental fortitude. Four disciplines. Four days.",
    lore: "The Gauntlet has no mercy. Four chambers, four types of pain. Iron Will. Striking. Grappling. Endurance. Complete them all.",
    difficulty: "B",
    timeLimitHours: 96,
    xpReward: 4000,
    goldReward: 1500,
    bonusStatPoints: 15,
    titleReward: "Gauntlet Survivor",
    triggerCondition: "rank_B",
    isRepeatable: false,
    tasks: [
      { id: "t1", description: "Complete an upper body strength session", targetValue: 1, unit: "sessions", taskType: "workout_sessions" },
      { id: "t2", description: "Complete a striking session", targetValue: 1, unit: "sessions", taskType: "workout_sessions" },
      { id: "t3", description: "Complete a grappling session", targetValue: 1, unit: "sessions", taskType: "workout_sessions" },
      { id: "t4", description: "Complete a conditioning session", targetValue: 1, unit: "sessions", taskType: "workout_sessions" },
      { id: "t5", description: "Hit all nutrition targets throughout the gauntlet", targetValue: 4, unit: "days", taskType: "nutrition_days" },
    ],
  },
  {
    title: "The Monthly Reckoning",
    description: "Prove you belong at the top — a monthly mega-challenge for consistent warriors.",
    lore: "Once per month the Hall opens the Reckoning ledger. Only adventurers with enough consistency are trusted to carry so much pressure at once.",
    difficulty: "A",
    timeLimitHours: 168,
    xpReward: 8000,
    goldReward: 3000,
    bonusStatPoints: 20,
    titleReward: "The Reckoned",
    triggerCondition: "streak_30",
    isRepeatable: true,
    tasks: [
      { id: "t1", description: "Complete 12 workout sessions in 7 days", targetValue: 12, unit: "sessions", taskType: "workout_sessions" },
      { id: "t2", description: "Set 5 new personal records", targetValue: 5, unit: "PRs", taskType: "prs" },
      { id: "t3", description: "Hit all macro targets every day for 7 days", targetValue: 7, unit: "days", taskType: "nutrition_days" },
      { id: "t4", description: "Complete all 7 daily quests", targetValue: 7, unit: "quests", taskType: "manual" },
      { id: "t5", description: "Unlock 2 new skill tree nodes", targetValue: 2, unit: "nodes", taskType: "skill_unlocks" },
    ],
  },
  {
    title: "Mythril Grade Sovereign Trial",
    description: "The Guild's highest pre-Diamond trial. Only the elite complete this.",
    lore: "Seven sealed routes open beneath the Hall. Aldric does not call this glorious. He calls it necessary: seven days, seven trials, and no room for false pride.",
    difficulty: "S",
    timeLimitHours: 168,
    xpReward: 20000,
    goldReward: 8000,
    bonusStatPoints: 30,
    titleReward: "Sovereign of Iron",
    triggerCondition: "rank_S",
    isRepeatable: false,
    tasks: [
      { id: "t1", description: "Complete 20 total sets of compound lifts (squat/bench/deadlift/press)", targetValue: 20, unit: "sets", taskType: "manual" },
      { id: "t2", description: "Complete 10 striking rounds", targetValue: 10, unit: "rounds", taskType: "manual" },
      { id: "t3", description: "Complete 3 grappling sessions", targetValue: 3, unit: "sessions", taskType: "workout_sessions" },
      { id: "t4", description: "Set 10 new personal records", targetValue: 10, unit: "PRs", taskType: "prs" },
      { id: "t5", description: "Hit all nutrition targets all 7 days", targetValue: 7, unit: "days", taskType: "nutrition_days" },
      { id: "t6", description: "Maintain a 7-day streak", targetValue: 7, unit: "days", taskType: "streak_days" },
      { id: "t7", description: "Unlock the final tier of any skill tree", targetValue: 1, unit: "node", taskType: "skill_unlocks" },
    ],
  },
];

// ── Serializer ────────────────────────────────────────────────────────────────

function serializeRaid(raid: any) {
  return {
    ...raid,
    startedAt: raid.startedAt?.toISOString() || null,
    expiresAt: raid.expiresAt?.toISOString() || null,
    completedAt: raid.completedAt?.toISOString() || null,
    claimedAt: raid.claimedAt?.toISOString() || null,
    tasks: raid.tasks || [],
    timeRemainingHours: raid.expiresAt
      ? Math.max(0, (new Date(raid.expiresAt).getTime() - Date.now()) / 3600000)
      : null,
    isExpired: raid.expiresAt ? new Date(raid.expiresAt) < new Date() : false,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get("/boss-raids", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const raids = await db.select().from(bossRaidsTable)
      .where(eq(bossRaidsTable.playerId, player.id));

    const now = new Date();
    for (const raid of raids) {
      if (raid.status === "active" && raid.expiresAt && raid.expiresAt < now) {
        await db.update(bossRaidsTable).set({ status: "failed" }).where(eq(bossRaidsTable.id, raid.id));
        raid.status = "failed";
        await recordRaidWorldEvent({
          playerId: player.id,
          raidId: raid.id,
          title: raid.title,
          difficulty: raid.difficulty,
          phase: "failed",
        });
      }
    }

    res.json(raids.map(serializeRaid));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get boss raids" });
  }
});

router.get("/boss-raids/available", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const existingRaids = await db.select().from(bossRaidsTable)
      .where(eq(bossRaidsTable.playerId, player.id));

    const completedTitles = new Set(existingRaids.filter(r => r.status !== "failed").map(r => r.title));

    const available = RAID_TEMPLATES.filter(t => {
      if (t.isRepeatable) return true;
      return !completedTitles.has(t.title);
    });

    const triggered = available.filter(t => {
      const cond = t.triggerCondition;
      if (cond === "streak_7") return player.streakDays >= 7 || player.longestStreak >= 7;
      if (cond === "streak_30") return player.streakDays >= 30 || player.longestStreak >= 30;
      if (cond === "rank_D") return ["D", "C", "B", "A", "S", "National-Level"].includes(player.rank);
      if (cond === "rank_C") return ["C", "B", "A", "S", "National-Level"].includes(player.rank);
      if (cond === "rank_B") return ["B", "A", "S", "National-Level"].includes(player.rank);
      if (cond === "rank_S") return ["S", "National-Level"].includes(player.rank);
      return player.rank !== "E";
    });

    res.json(triggered.map(t => ({
      ...t,
      alreadyCompleted: completedTitles.has(t.title),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get available raids" });
  }
});

router.post("/boss-raids/start", async (req, res) => {
  try {
    const { templateTitle } = req.body;
    const { player } = await getOrCreatePlayer(req.userId);

    const template = RAID_TEMPLATES.find(t => t.title === templateTitle);
    if (!template) return void res.status(404).json({ error: "Raid template not found" });

    const existing = await db.select().from(bossRaidsTable)
      .where(and(eq(bossRaidsTable.playerId, player.id)));
    const activeRaid = existing.find(r => r.title === template.title && (r.status === "active" || r.status === "completed"));
    if (activeRaid && !template.isRepeatable) {
      return void res.status(400).json({ error: "This raid has already been started or completed" });
    }

    const expiresAt = new Date(Date.now() + template.timeLimitHours * 3600000);
    const tasks = template.tasks.map(t => ({ ...t, completed: false, currentValue: 0 }));

    const [raid] = await db.insert(bossRaidsTable).values({
      playerId: player.id,
      title: template.title,
      description: template.description,
      lore: template.lore,
      difficulty: template.difficulty,
      status: "active",
      timeLimitHours: template.timeLimitHours,
      xpReward: template.xpReward,
      goldReward: template.goldReward,
      bonusStatPoints: template.bonusStatPoints,
      titleReward: template.titleReward,
      triggerCondition: template.triggerCondition,
      isRepeatable: template.isRepeatable,
      expiresAt,
      tasks,
    }).returning();

    await recordRaidWorldEvent({
      playerId: player.id,
      raidId: raid.id,
      title: raid.title,
      difficulty: raid.difficulty,
      phase: "started",
    });

    res.status(201).json(serializeRaid(raid));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to start raid" });
  }
});

router.get("/boss-raids/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { player } = await getOrCreatePlayer(req.userId);
    const [raid] = await db.select().from(bossRaidsTable)
      .where(and(eq(bossRaidsTable.id, id), eq(bossRaidsTable.playerId, player.id)));
    if (!raid) return void res.status(404).json({ error: "Raid not found" });
    res.json(serializeRaid(raid));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get raid" });
  }
});

router.patch("/boss-raids/:id/task", async (req, res) => {
  try {
    const raidId = parseInt(req.params.id);
    const { taskId, currentValue, completed } = req.body;
    const { player } = await getOrCreatePlayer(req.userId);

    const [raid] = await db.select().from(bossRaidsTable)
      .where(and(eq(bossRaidsTable.id, raidId), eq(bossRaidsTable.playerId, player.id)));
    if (!raid) return void res.status(404).json({ error: "Raid not found" });
    if (raid.status !== "active") return void res.status(400).json({ error: "Raid is not active" });

    const tasks = (raid.tasks as any[]).map((t: any) => {
      if (t.id === taskId) {
        if (t.taskType !== "manual") return t;
        const newValue = currentValue ?? t.currentValue;
        const isCompleted = completed ?? (t.targetValue ? newValue >= t.targetValue : completed);
        return { ...t, currentValue: newValue, completed: isCompleted };
      }
      return t;
    });

    const allDone = tasks.every((t: any) => t.completed);
    const newStatus = allDone ? "completed" : "active";

    const [updated] = await db.update(bossRaidsTable).set({
      tasks,
      status: newStatus,
      completedAt: allDone ? new Date() : undefined,
    }).where(eq(bossRaidsTable.id, raidId)).returning();

    if (allDone) {
      await recordRaidWorldEvent({
        playerId: player.id,
        raidId: raid.id,
        title: raid.title,
        difficulty: raid.difficulty,
        phase: "completed",
      });
    }

    res.json(serializeRaid(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update raid task" });
  }
});

router.post("/boss-raids/:id/claim", async (req, res) => {
  try {
    const raidId = parseInt(req.params.id);
    const { player, stats } = await getOrCreatePlayer(req.userId);

    const [raid] = await db.select().from(bossRaidsTable)
      .where(and(eq(bossRaidsTable.id, raidId), eq(bossRaidsTable.playerId, player.id)));
    if (!raid) return void res.status(404).json({ error: "Raid not found" });
    if (raid.status !== "completed") return void res.status(400).json({ error: "Raid not completed" });
    if (raid.claimedAt) return void res.status(400).json({ error: "Already claimed" });

    await db.update(bossRaidsTable).set({ status: "claimed", claimedAt: new Date() })
      .where(eq(bossRaidsTable.id, raidId));

    await db.update(playerTable).set({
      gold: player.gold + raid.goldReward,
      freeStatPoints: player.freeStatPoints + (raid.bonusStatPoints || 0),
      updatedAt: new Date(),
    }).where(eq(playerTable.id, player.id));

    const xpResult = await applyXpEvent(
      player.id, raid.xpReward,
      `Boss Raid: ${raid.title}`, "boss_raid",
      getTodayStr()
    );

    let titleGranted = null;
    if (raid.titleReward) {
      const [title] = await db.select().from(titlesTable)
        .where(eq(titlesTable.name, raid.titleReward));
      if (title) {
        const existing = await db.select().from(playerTitlesTable)
          .where(and(eq(playerTitlesTable.playerId, player.id), eq(playerTitlesTable.titleId, title.id)));
        if (existing.length === 0) {
          await db.insert(playerTitlesTable).values({ playerId: player.id, titleId: title.id, equipped: false });
          titleGranted = title;
        }
      }
    }

    const drop = generateGearDrop(raid.difficulty, `Raid: ${raid.title}`);
    const [gearDrop] = await db.insert(rpgGearTable).values({
      playerId: player.id,
      ...drop,
    }).returning();

    await db.insert(itemDiscoveriesTable).values({
      playerId: player.id,
      itemId: null,
      itemName: gearDrop.name,
      rarity: gearDrop.rarity,
      category: gearDrop.slot,
      sourceType: "raid_drop",
      sourceLabel: `Raid: ${raid.title}`,
      loreText: gearDrop.loreText ?? gearDrop.flavorText,
      currentState: "owned",
    }).onConflictDoUpdate({
      target: [itemDiscoveriesTable.playerId, itemDiscoveriesTable.itemName, itemDiscoveriesTable.sourceType],
      set: { currentState: "owned", updatedAt: new Date() },
    });

    await recordRaidWorldEvent({
      playerId: player.id,
      raidId: raid.id,
      title: raid.title,
      difficulty: raid.difficulty,
      phase: "claimed",
      gearDropName: gearDrop.name,
    });

    const { player: freshPlayer, stats: freshStats } = await getOrCreatePlayer(req.userId);

    res.json({
      xpEarned: xpResult.totalXpAwarded,
      goldEarned: raid.goldReward,
      bonusStatPoints: raid.bonusStatPoints || 0,
      leveledUp: xpResult.leveledUp,
      levelsGained: xpResult.levelsGained,
      rankedUp: xpResult.rankedUp,
      newRank: xpResult.newRank,
      newAchievements: xpResult.newAchievements,
      titleGranted,
      gearDrop: { ...gearDrop, acquiredAt: gearDrop.acquiredAt.toISOString() },
      player: buildPlayerResponse(freshPlayer, freshStats),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to claim raid reward" });
  }
});

export default router;
