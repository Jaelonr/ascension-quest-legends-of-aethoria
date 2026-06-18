import { Router } from "express";
import { db } from "@workspace/db";
import { questsTable, questTasksTable, playerTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreatePlayer, buildPlayerResponse, applyXpEvent } from "../progression";

const router = Router();

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getTomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getNextWeekStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function buildQuestResponse(quest: any) {
  const tasks = await db.select().from(questTasksTable)
    .where(eq(questTasksTable.questId, quest.id))
    .orderBy(questTasksTable.order);
  return {
    ...quest,
    expiresAt: quest.expiresAt?.toISOString() || null,
    completedAt: quest.completedAt?.toISOString() || null,
    claimedAt: quest.claimedAt?.toISOString() || null,
    createdAt: quest.createdAt.toISOString(),
    tasks: tasks.map(t => ({
      ...t,
      completedAt: t.completedAt?.toISOString() || null,
    })),
  };
}

async function ensureDailyQuest(playerId: number) {
  const today = getTodayStr();
  const existing = await db.select().from(questsTable)
    .where(and(eq(questsTable.playerId, playerId), eq(questsTable.type, "daily")))
    .orderBy(desc(questsTable.createdAt))
    .limit(1);

  if (existing.length > 0) {
    const q = existing[0];
    if (q.createdAt.toISOString().split("T")[0] === today && q.status !== "failed") return q;
  }

  const [quest] = await db.insert(questsTable).values({
    playerId,
    title: "Daily Training Protocol",
    description: "Complete your daily fitness requirements to earn XP, Gold, and bonus stat points.",
    type: "daily",
    status: "active",
    xpReward: 300,
    goldReward: 100,
    bonusStatPoints: 3,
    difficulty: "E",
    expiresAt: new Date(getTomorrowStr()),
  }).returning();

  const tasks = [
    { description: "Hit your calorie target (within 200 calories)", order: 1 },
    { description: "Hit your protein target", order: 2 },
    { description: "Complete a workout session", order: 3 },
    { description: "Log at least 3 meals", order: 4 },
    { description: "Stay hydrated — drink at least 8 glasses of water", order: 5 },
  ];
  for (const t of tasks) {
    await db.insert(questTasksTable).values({ questId: quest.id, ...t, completed: false });
  }
  return quest;
}

async function ensureWeeklyQuest(playerId: number) {
  const now = new Date();
  // ISO week start (Monday)
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const existing = await db.select().from(questsTable)
    .where(and(eq(questsTable.playerId, playerId), eq(questsTable.type, "weekly")))
    .orderBy(desc(questsTable.createdAt))
    .limit(1);

  if (existing.length > 0) {
    const q = existing[0];
    if (q.createdAt.toISOString().split("T")[0] >= weekStartStr && q.status !== "failed") return q;
  }

  const [quest] = await db.insert(questsTable).values({
    playerId,
    title: "Weekly Proving Grounds",
    description: "Push your limits this week. Complete all weekly objectives for massive XP, Gold, and rare rewards.",
    type: "weekly",
    status: "active",
    xpReward: 1500,
    goldReward: 500,
    bonusStatPoints: 8,
    difficulty: "D",
    expiresAt: new Date(getNextWeekStr()),
  }).returning();

  const weeklyTasks = [
    { description: "Complete 4 workout sessions", order: 1, targetValue: 4, unit: "sessions" },
    { description: "Hit calorie targets 5 out of 7 days", order: 2, targetValue: 5, unit: "days" },
    { description: "Hit protein targets 5 out of 7 days", order: 3, targetValue: 5, unit: "days" },
    { description: "Maintain streak all 7 days", order: 4, targetValue: 7, unit: "days" },
    { description: "Set at least 2 new personal records", order: 5, targetValue: 2, unit: "PRs" },
    { description: "Complete all 7 daily quests", order: 6, targetValue: 7, unit: "quests" },
  ];
  for (const t of weeklyTasks) {
    await db.insert(questTasksTable).values({ questId: quest.id, ...t, completed: false });
  }
  return quest;
}

router.get("/quests/daily", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const quest = await ensureDailyQuest(player.id);
    res.json(await buildQuestResponse(quest));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get daily quest" });
  }
});

router.get("/quests", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const { type, status } = req.query;

    await ensureDailyQuest(player.id);
    await ensureWeeklyQuest(player.id);

    const all = await db.select().from(questsTable)
      .where(eq(questsTable.playerId, player.id))
      .orderBy(desc(questsTable.createdAt));

    let filtered = all;
    if (type) filtered = filtered.filter(q => q.type === type);
    if (status) filtered = filtered.filter(q => q.status === status);

    res.json(await Promise.all(filtered.map(buildQuestResponse)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get quests" });
  }
});

router.get("/quests/:id", async (req, res) => {
  try {
    const [quest] = await db.select().from(questsTable).where(eq(questsTable.id, parseInt(req.params.id)));
    if (!quest) return void res.status(404).json({ error: "Quest not found" });
    res.json(await buildQuestResponse(quest));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get quest" });
  }
});

router.post("/quests/:id/complete-task", async (req, res) => {
  try {
    const questId = parseInt(req.params.id);
    const { taskId, value } = req.body;

    await db.update(questTasksTable).set({
      completed: true, completedAt: new Date(), currentValue: value,
    }).where(and(eq(questTasksTable.id, taskId), eq(questTasksTable.questId, questId)));

    const allTasks = await db.select().from(questTasksTable).where(eq(questTasksTable.questId, questId));
    const allDone = allTasks.every(t => t.completed);

    if (allDone) {
      await db.update(questsTable).set({ status: "completed", completedAt: new Date() })
        .where(eq(questsTable.id, questId));
    }

    const [quest] = await db.select().from(questsTable).where(eq(questsTable.id, questId));
    res.json(await buildQuestResponse(quest));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to complete task" });
  }
});

router.post("/quests/:id/claim", async (req, res) => {
  try {
    const questId = parseInt(req.params.id);
    const { player, stats } = await getOrCreatePlayer(req.userId);

    const [quest] = await db.select().from(questsTable).where(eq(questsTable.id, questId));
    if (!quest) return void res.status(404).json({ error: "Quest not found" });
    if (quest.status !== "completed") return void res.status(400).json({ error: "Quest not completed yet" });
    if (quest.claimedAt) return void res.status(400).json({ error: "Quest already claimed" });

    await db.update(questsTable).set({ status: "claimed", claimedAt: new Date() })
      .where(eq(questsTable.id, questId));

    // Grant gold + free stat points immediately
    await db.update(playerTable).set({
      gold: player.gold + quest.goldReward,
      freeStatPoints: player.freeStatPoints + (quest.bonusStatPoints || 0),
      totalQuests: (player.totalQuests || 0) + 1,
      updatedAt: new Date(),
    }).where(eq(playerTable.id, player.id));

    // Apply XP through progression engine (handles level ups)
    const xpResult = await applyXpEvent(
      player.id, quest.xpReward,
      `Quest: ${quest.title}`, quest.type,
      new Date().toISOString().split("T")[0]
    );

    const { player: freshPlayer, stats: freshStats } = await getOrCreatePlayer(req.userId);

    res.json({
      xpEarned: xpResult.totalXpAwarded,
      goldEarned: quest.goldReward,
      bonusStatPoints: quest.bonusStatPoints || 0,
      newLevel: freshPlayer.level,
      leveledUp: xpResult.leveledUp,
      levelsGained: xpResult.levelsGained,
      newRank: xpResult.newRank,
      rankedUp: xpResult.rankedUp,
      newAchievements: xpResult.newAchievements,
      newTitles: xpResult.newTitles,
      titleReward: quest.titleReward || null,
      player: buildPlayerResponse(freshPlayer, freshStats),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to claim quest" });
  }
});

// Create custom quest
router.post("/quests", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const { title, description, type, xpReward, goldReward, bonusStatPoints, difficulty, expiresAt, tasks } = req.body;
    const [quest] = await db.insert(questsTable).values({
      playerId: player.id,
      title, description,
      type: type || "side",
      xpReward: xpReward || 200,
      goldReward: goldReward || 75,
      bonusStatPoints: bonusStatPoints || 0,
      difficulty: difficulty || "E",
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    }).returning();

    if (tasks && Array.isArray(tasks)) {
      for (const [i, t] of tasks.entries()) {
        await db.insert(questTasksTable).values({
          questId: quest.id, description: t.description, order: i + 1,
          targetValue: t.targetValue, unit: t.unit, completed: false,
        });
      }
    }

    res.status(201).json(await buildQuestResponse(quest));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create quest" });
  }
});

export default router;
