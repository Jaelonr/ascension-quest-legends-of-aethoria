import { Router } from "express";
import { db } from "@workspace/db";
import {
  workoutSessionsTable, workoutSetsTable, nutritionLogsTable,
  weightEntriesTable, personalRecordsTable, xpHistoryTable, exercisesTable
} from "@workspace/db";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { getOrCreatePlayer } from "./player";

const router = Router();

router.get("/analytics/overview", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);

    const totalWorkouts = await db.select({ count: sql<number>`count(*)` })
      .from(workoutSessionsTable)
      .where(and(eq(workoutSessionsTable.playerId, player.id), eq(workoutSessionsTable.status, "completed")));

    const totalXpEarned = await db.select({ sum: sql<number>`coalesce(sum(amount), 0)` })
      .from(xpHistoryTable)
      .where(eq(xpHistoryTable.playerId, player.id));

    const totalPrs = await db.select({ count: sql<number>`count(*)` })
      .from(personalRecordsTable)
      .where(eq(personalRecordsTable.playerId, player.id));

    // Last 7 days nutrition
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const recentNutrition = await db.select().from(nutritionLogsTable)
      .where(and(eq(nutritionLogsTable.playerId, player.id), gte(nutritionLogsTable.date, sevenDaysAgoStr)));

    const uniqueDays = new Set(recentNutrition.map(n => n.date)).size;
    const divisor = uniqueDays || 1;
    const totalCalories = recentNutrition.reduce((s, n) => s + n.calories, 0);
    const totalProtein = recentNutrition.reduce((s, n) => s + n.protein, 0);

    const weightTrend = await db.select().from(weightEntriesTable)
      .where(eq(weightEntriesTable.playerId, player.id))
      .orderBy(weightEntriesTable.date)
      .limit(30);

    const recentPrs = await db.select().from(personalRecordsTable)
      .where(eq(personalRecordsTable.playerId, player.id))
      .orderBy(desc(personalRecordsTable.achievedAt))
      .limit(5);

    res.json({
      totalWorkouts: Number(totalWorkouts[0]?.count || 0),
      totalXpEarned: Number(totalXpEarned[0]?.sum || player.totalXpEarned || 0),
      currentStreak: player.streakDays,
      longestStreak: player.longestStreak,
      totalPrs: Number(totalPrs[0]?.count || 0),
      avgCaloriesLast7Days: totalCalories / divisor,
      avgProteinLast7Days: totalProtein / divisor,
      weightTrend: weightTrend.map(w => ({ ...w, createdAt: w.createdAt?.toISOString?.() })),
      recentPrs: recentPrs.map(pr => ({ ...pr, achievedAt: pr.achievedAt.toISOString() })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get analytics overview" });
  }
});

router.get("/analytics/volume", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const weeks = parseInt(req.query.weeks as string) || 4;

    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - weeks * 7);

    const sessions = await db.select().from(workoutSessionsTable)
      .where(and(
        eq(workoutSessionsTable.playerId, player.id),
        eq(workoutSessionsTable.status, "completed"),
        gte(workoutSessionsTable.startedAt, weeksAgo)
      ));

    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length === 0) return void res.json([]);

    const sets = await db.select({
      exerciseId: workoutSetsTable.exerciseId,
      exerciseName: workoutSetsTable.exerciseName,
      reps: workoutSetsTable.reps,
      weight: workoutSetsTable.weight,
    }).from(workoutSetsTable)
      .where(sql`${workoutSetsTable.sessionId} = ANY(ARRAY[${sql.raw(sessionIds.join(','))}]::int[])`);

    const exercises = await db.select().from(exercisesTable);
    const exerciseMap = new Map(exercises.map(e => [e.id, e]));

    const groupMap = new Map<string, { totalSets: number; totalReps: number; totalVolume: number }>();
    for (const set of sets) {
      const ex = exerciseMap.get(set.exerciseId);
      const group = ex?.muscleGroup || "Other";
      const existing = groupMap.get(group) || { totalSets: 0, totalReps: 0, totalVolume: 0 };
      groupMap.set(group, {
        totalSets: existing.totalSets + 1,
        totalReps: existing.totalReps + set.reps,
        totalVolume: existing.totalVolume + set.weight * set.reps,
      });
    }

    res.json(Array.from(groupMap.entries()).map(([muscleGroup, data]) => ({
      muscleGroup,
      ...data,
    })).sort((a, b) => b.totalVolume - a.totalVolume));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get volume" });
  }
});

router.get("/analytics/xp", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const history = await db.select().from(xpHistoryTable)
      .where(eq(xpHistoryTable.playerId, player.id));

    const categoryMap = new Map<string, number>();
    const total = history.reduce((sum, h) => {
      categoryMap.set(h.category, (categoryMap.get(h.category) || 0) + h.amount);
      return sum + h.amount;
    }, 0);

    const divisor = total || 1;
    res.json(Array.from(categoryMap.entries()).map(([category, xpEarned]) => ({
      category,
      xpEarned,
      percentage: (xpEarned / divisor) * 100,
    })).sort((a, b) => b.xpEarned - a.xpEarned));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get XP by category" });
  }
});

router.get("/analytics/rank-progress", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const history = await db.select().from(xpHistoryTable)
      .where(eq(xpHistoryTable.playerId, player.id))
      .orderBy(xpHistoryTable.createdAt);

    const rankForLevel = (level: number): string => {
      if (level >= 100) return "National-Level";
      if (level >= 75) return "S";
      if (level >= 50) return "A";
      if (level >= 35) return "B";
      if (level >= 20) return "C";
      if (level >= 10) return "D";
      return "E";
    };

    // Group by date and compute cumulative XP/level
    const dayMap = new Map<string, number>();
    let cumXp = 0;
    for (const h of history) {
      cumXp += h.amount;
      dayMap.set(h.date, cumXp);
    }

    const xpForLevel = (level: number): number => {
      let total = 0;
      for (let l = 1; l < level; l++) {
        if (l < 10) total += l * 100;
        else if (l < 20) total += 1000 + (l - 9) * 200;
        else total += 3000 + (l - 19) * 300;
      }
      return total;
    };

    const result = Array.from(dayMap.entries()).map(([date, cumXp]) => {
      let level = 1;
      while (xpForLevel(level + 1) <= cumXp) level++;
      return { date, level, xp: cumXp, rank: rankForLevel(level) };
    });

    // Add current state if no history
    if (result.length === 0) {
      result.push({
        date: new Date().toISOString().split("T")[0],
        level: player.level,
        xp: player.xp,
        rank: player.rank,
      });
    }

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get rank progress" });
  }
});

export default router;
