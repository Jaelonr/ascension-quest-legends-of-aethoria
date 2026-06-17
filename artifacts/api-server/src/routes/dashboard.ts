import { Router } from "express";
import { db } from "@workspace/db";
import {
  nutritionLogsTable, nutritionTargetsTable, questsTable, questTasksTable,
  workoutTemplatesTable, workoutSessionsTable
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreatePlayer, buildPlayerResponse } from "./player";

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

router.get("/dashboard/summary", async (req, res) => {
  try {
    const { player, stats } = await getOrCreatePlayer(req.userId);
    const today = getTodayStr();

    // Nutrition today
    const logs = await db.select().from(nutritionLogsTable)
      .where(and(eq(nutritionLogsTable.playerId, player.id), eq(nutritionLogsTable.date, today)));
    const targets = await db.select().from(nutritionTargetsTable)
      .where(eq(nutritionTargetsTable.playerId, player.id)).limit(1);
    const t = targets[0] || { calories: 2500, protein: 180, carbs: 250, fat: 80 };
    const totals = logs.reduce((acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Daily quest
    let dailyQuest = await db.select().from(questsTable)
      .where(and(eq(questsTable.playerId, player.id), eq(questsTable.type, "daily")))
      .orderBy(desc(questsTable.createdAt)).limit(1);

    if (dailyQuest.length === 0 || dailyQuest[0].createdAt.toISOString().split("T")[0] !== today) {
      const [newQuest] = await db.insert(questsTable).values({
        playerId: player.id,
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
      for (const task of tasks) {
        await db.insert(questTasksTable).values({ questId: newQuest.id, ...task, completed: false });
      }
      dailyQuest = [newQuest];
    }

    const questTasks = await db.select().from(questTasksTable)
      .where(eq(questTasksTable.questId, dailyQuest[0].id))
      .orderBy(questTasksTable.order);

    // Workout recommendation
    const templates = await db.select().from(workoutTemplatesTable).limit(10);
    const recentSessions = await db.select().from(workoutSessionsTable)
      .where(and(eq(workoutSessionsTable.playerId, player.id), eq(workoutSessionsTable.status, "completed")))
      .orderBy(desc(workoutSessionsTable.completedAt)).limit(3);

    // Recommend something different from recent
    const recentTemplateIds = new Set(recentSessions.map(s => s.templateId).filter(Boolean));
    const recommended = templates.find(t => !recentTemplateIds.has(t.id)) || templates[0];

    // Last workout days ago
    const lastSession = recentSessions[0];
    let lastWorkoutDaysAgo: number | null = null;
    if (lastSession?.completedAt) {
      const diff = Date.now() - lastSession.completedAt.getTime();
      lastWorkoutDaysAgo = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    res.json({
      player: buildPlayerResponse(player, stats),
      dailyQuest: {
        ...dailyQuest[0],
        expiresAt: dailyQuest[0].expiresAt?.toISOString() || null,
        completedAt: dailyQuest[0].completedAt?.toISOString() || null,
        claimedAt: dailyQuest[0].claimedAt?.toISOString() || null,
        createdAt: dailyQuest[0].createdAt.toISOString(),
        tasks: questTasks.map(t => ({ ...t, completedAt: t.completedAt?.toISOString() || null })),
      },
      nutrition: {
        date: today,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        targetCalories: t.calories,
        targetProtein: t.protein,
        targetCarbs: t.carbs,
        targetFat: t.fat,
        remainingCalories: t.calories - totals.calories,
        entries: logs.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
      },
      workoutRecommendation: recommended ? {
        templateId: recommended.id,
        templateName: recommended.name,
        reason: lastWorkoutDaysAgo === null
          ? "Start your first quest — forge your legend."
          : lastWorkoutDaysAgo === 0
            ? "You trained today. Recovery session recommended."
            : `${lastWorkoutDaysAgo} day${lastWorkoutDaysAgo > 1 ? "s" : ""} since last session.`,
      } : { templateId: 0, templateName: "Free Training", reason: "No templates yet. Start a free workout." },
      streakDays: player.streakDays,
      lastWorkoutDaysAgo,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get dashboard summary" });
  }
});

export default router;
