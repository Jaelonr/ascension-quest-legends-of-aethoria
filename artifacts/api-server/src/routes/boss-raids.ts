import { Router } from "express";
import { db } from "@workspace/db";
import { bossRaidsTable, playerTable, titlesTable, playerTitlesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getOrCreatePlayer, buildPlayerResponse, applyXpEvent } from "../progression";

const router = Router();

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
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
  tasks: Array<{ id: string; description: string; targetValue?: number; unit?: string }>;
}

const RAID_TEMPLATES: RaidTemplate[] = [
  {
    title: "The First Gate",
    description: "Prove yourself worthy of ascending beyond Rank E. Complete the entry-level challenge.",
    lore: "A pulsing gate has appeared in your training ground. The system demands proof before it grants passage. Complete the trial within 72 hours or face penalty.",
    difficulty: "E",
    timeLimitHours: 72,
    xpReward: 600,
    goldReward: 250,
    bonusStatPoints: 5,
    titleReward: "Gate Opener",
    triggerCondition: "streak_7",
    isRepeatable: false,
    tasks: [
      { id: "t1", description: "Complete 3 workout sessions", targetValue: 3, unit: "sessions" },
      { id: "t2", description: "Hit calorie targets 3 days in a row", targetValue: 3, unit: "days" },
      { id: "t3", description: "Log a personal record on any lift", targetValue: 1, unit: "PRs" },
    ],
  },
  {
    title: "Shadow Boxing Championship",
    description: "The striking arena opens. Dominate 10 rounds of intense bag work to claim your place.",
    lore: "A challenger emerges from the darkness. The system broadcasts your fight to the hunter network. Win or be forgotten.",
    difficulty: "D",
    timeLimitHours: 48,
    xpReward: 1000,
    goldReward: 400,
    bonusStatPoints: 7,
    titleReward: "Shadow Striker",
    triggerCondition: "rank_D",
    isRepeatable: false,
    tasks: [
      { id: "t1", description: "Complete 10 heavy bag rounds (3 min each)", targetValue: 10, unit: "rounds" },
      { id: "t2", description: "Complete 3 striking sessions in 48 hours", targetValue: 3, unit: "sessions" },
      { id: "t3", description: "Maintain a 2-day streak during the raid", targetValue: 2, unit: "days" },
    ],
  },
  {
    title: "Iron Dungeon: The Proving Chamber",
    description: "A hidden dungeon has manifested. Break through it with raw power — or be crushed.",
    lore: "The dungeon gates seal behind you. Iron mechanisms test your resolve. The system watches every rep.",
    difficulty: "C",
    timeLimitHours: 96,
    xpReward: 2000,
    goldReward: 750,
    bonusStatPoints: 10,
    titleReward: "Dungeon Breaker",
    triggerCondition: "rank_C",
    isRepeatable: false,
    tasks: [
      { id: "t1", description: "Complete 5 strength training sessions", targetValue: 5, unit: "sessions" },
      { id: "t2", description: "Set 3 new personal records", targetValue: 3, unit: "PRs" },
      { id: "t3", description: "Hit all macro targets for 5 days", targetValue: 5, unit: "days" },
      { id: "t4", description: "Maintain streak throughout the dungeon", targetValue: 4, unit: "days" },
    ],
  },
  {
    title: "The B-Rank Gauntlet",
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
      { id: "t1", description: "Complete an upper body strength session", targetValue: 1, unit: "sessions" },
      { id: "t2", description: "Complete a striking session", targetValue: 1, unit: "sessions" },
      { id: "t3", description: "Complete a grappling session", targetValue: 1, unit: "sessions" },
      { id: "t4", description: "Complete a conditioning session", targetValue: 1, unit: "sessions" },
      { id: "t5", description: "Hit all nutrition targets throughout the gauntlet", targetValue: 4, unit: "days" },
    ],
  },
  {
    title: "The Monthly Reckoning",
    description: "Prove you belong at the top — a monthly mega-challenge for consistent warriors.",
    lore: "Once per month the system generates the Reckoning. Only those who complete it earn the right to call themselves true hunters.",
    difficulty: "A",
    timeLimitHours: 168,
    xpReward: 8000,
    goldReward: 3000,
    bonusStatPoints: 20,
    titleReward: "The Reckoned",
    triggerCondition: "streak_30",
    isRepeatable: true,
    tasks: [
      { id: "t1", description: "Complete 12 workout sessions in 7 days", targetValue: 12, unit: "sessions" },
      { id: "t2", description: "Set 5 new personal records", targetValue: 5, unit: "PRs" },
      { id: "t3", description: "Hit all macro targets every day for 7 days", targetValue: 7, unit: "days" },
      { id: "t4", description: "Complete all 7 daily quests", targetValue: 7, unit: "quests" },
      { id: "t5", description: "Unlock 2 new skill tree nodes", targetValue: 2, unit: "nodes" },
    ],
  },
  {
    title: "S-Rank Sovereign Trial",
    description: "The system's ultimate test before National-Level. Only the elite complete this.",
    lore: "The gates of heaven open. A trial born from the system's core intelligence. 7 days. 7 trials. Become Sovereign.",
    difficulty: "S",
    timeLimitHours: 168,
    xpReward: 20000,
    goldReward: 8000,
    bonusStatPoints: 30,
    titleReward: "Sovereign of Iron",
    triggerCondition: "rank_S",
    isRepeatable: false,
    tasks: [
      { id: "t1", description: "Complete 20 total sets of compound lifts (squat/bench/deadlift/press)", targetValue: 20, unit: "sets" },
      { id: "t2", description: "Complete 10 striking rounds", targetValue: 10, unit: "rounds" },
      { id: "t3", description: "Complete 3 grappling sessions", targetValue: 3, unit: "sessions" },
      { id: "t4", description: "Set 10 new personal records", targetValue: 10, unit: "PRs" },
      { id: "t5", description: "Hit all nutrition targets all 7 days", targetValue: 7, unit: "days" },
      { id: "t6", description: "Maintain a 7-day streak", targetValue: 7, unit: "days" },
      { id: "t7", description: "Unlock the final tier of any skill tree", targetValue: 1, unit: "node" },
    ],
  },
];

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

router.get("/boss-raids", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const raids = await db.select().from(bossRaidsTable)
      .where(eq(bossRaidsTable.playerId, player.id));

    // Check for expired raids
    const now = new Date();
    for (const raid of raids) {
      if (raid.status === "active" && raid.expiresAt && raid.expiresAt < now) {
        await db.update(bossRaidsTable).set({ status: "failed" }).where(eq(bossRaidsTable.id, raid.id));
        raid.status = "failed";
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

    // Filter templates player hasn't completed (or repeatable ones)
    const available = RAID_TEMPLATES.filter(t => {
      if (t.isRepeatable) return true;
      return !completedTitles.has(t.title);
    });

    // Check trigger conditions
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
    if (!template) return res.status(404).json({ error: "Raid template not found" });

    // Check if already active
    const existing = await db.select().from(bossRaidsTable)
      .where(and(eq(bossRaidsTable.playerId, player.id)));
    const activeRaid = existing.find(r => r.title === template.title && (r.status === "active" || r.status === "completed"));
    if (activeRaid && !template.isRepeatable) {
      return res.status(400).json({ error: "This raid has already been started or completed" });
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

    res.status(201).json(serializeRaid(raid));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to start raid" });
  }
});

router.get("/boss-raids/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [raid] = await db.select().from(bossRaidsTable).where(eq(bossRaidsTable.id, id));
    if (!raid) return res.status(404).json({ error: "Raid not found" });
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

    const [raid] = await db.select().from(bossRaidsTable).where(eq(bossRaidsTable.id, raidId));
    if (!raid) return res.status(404).json({ error: "Raid not found" });
    if (raid.status !== "active") return res.status(400).json({ error: "Raid is not active" });

    const tasks = (raid.tasks as any[]).map(t => {
      if (t.id === taskId) {
        const newValue = currentValue ?? t.currentValue;
        const isCompleted = completed ?? (t.targetValue ? newValue >= t.targetValue : completed);
        return { ...t, currentValue: newValue, completed: isCompleted };
      }
      return t;
    });

    const allDone = tasks.every(t => t.completed);
    const newStatus = allDone ? "completed" : "active";

    const [updated] = await db.update(bossRaidsTable).set({
      tasks,
      status: newStatus,
      completedAt: allDone ? new Date() : undefined,
    }).where(eq(bossRaidsTable.id, raidId)).returning();

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

    const [raid] = await db.select().from(bossRaidsTable).where(eq(bossRaidsTable.id, raidId));
    if (!raid) return res.status(404).json({ error: "Raid not found" });
    if (raid.status !== "completed") return res.status(400).json({ error: "Raid not completed" });
    if (raid.claimedAt) return res.status(400).json({ error: "Already claimed" });

    await db.update(bossRaidsTable).set({ status: "claimed", claimedAt: new Date() })
      .where(eq(bossRaidsTable.id, raidId));

    // Grant gold + stat points
    await db.update(playerTable).set({
      gold: player.gold + raid.goldReward,
      freeStatPoints: player.freeStatPoints + (raid.bonusStatPoints || 0),
      updatedAt: new Date(),
    }).where(eq(playerTable.id, player.id));

    // Apply XP
    const xpResult = await applyXpEvent(
      player.id, raid.xpReward,
      `Boss Raid: ${raid.title}`, "boss_raid",
      getTodayStr()
    );

    // Grant title reward if specified
    let titleGranted = null;
    if (raid.titleReward) {
      const [title] = await db.select().from(titlesTable)
        .where(eq(titlesTable.name, raid.titleReward));
      if (title) {
        const existing = await db.select().from(playerTitlesTable)
          .where(and(eq(playerTitlesTable.playerId, player.id), eq(playerTitlesTable.titleId, title.id)));
        if (existing.length === 0) {
          await db.insert(playerTitlesTable).values({
            playerId: player.id, titleId: title.id, equipped: false,
          });
          titleGranted = title;
        }
      }
    }

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
      player: buildPlayerResponse(freshPlayer, freshStats),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to claim raid reward" });
  }
});

export default router;
