import { Router } from "express";
import { db } from "@workspace/db";
import {
  exercisesTable, workoutTemplatesTable, workoutSessionsTable,
  workoutSetsTable, personalRecordsTable, playerTable, nutritionLogsTable,
  nutritionTargetsTable
} from "@workspace/db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { getOrCreatePlayer, buildPlayerResponse } from "../progression";
import { applyXpEvent, updateStreak } from "../progression";

const router = Router();

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

router.get("/training/exercises", async (req, res) => {
  try {
    const { muscleGroup, category } = req.query;
    let all = await db.select().from(exercisesTable).orderBy(exercisesTable.name);
    if (muscleGroup) all = all.filter(e => e.muscleGroup.toLowerCase() === (muscleGroup as string).toLowerCase());
    if (category) all = all.filter(e => e.category === category);
    res.json(all.map(e => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
      equipmentIds: (e.equipmentIds as number[]) || [],
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get exercises" });
  }
});

router.post("/training/exercises", async (req, res) => {
  try {
    const { name, muscleGroup, category, instructions, equipmentIds } = req.body;
    const [ex] = await db.insert(exercisesTable)
      .values({ name, muscleGroup, category, instructions, equipmentIds: equipmentIds || [] })
      .returning();
    res.status(201).json({ ...ex, createdAt: ex.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create exercise" });
  }
});

router.get("/training/templates", async (req, res) => {
  try {
    const templates = await db.select().from(workoutTemplatesTable).orderBy(workoutTemplatesTable.name);
    res.json(templates.map(t => ({ ...t, createdAt: t.createdAt.toISOString(), exercises: t.exercises || [] })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get templates" });
  }
});

router.post("/training/templates", async (req, res) => {
  try {
    const { name, category, description, exercises, estimatedDuration } = req.body;
    const [template] = await db.insert(workoutTemplatesTable)
      .values({ name, category: category || "strength", description, exercises: exercises || [], estimatedDuration, xpReward: 150 })
      .returning();
    res.status(201).json({ ...template, createdAt: template.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.get("/training/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [template] = await db.select().from(workoutTemplatesTable).where(eq(workoutTemplatesTable.id, id));
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.json({ ...template, createdAt: template.createdAt.toISOString(), exercises: template.exercises || [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get template" });
  }
});

router.patch("/training/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates: Record<string, any> = {};
    for (const k of ["name", "category", "description", "exercises", "estimatedDuration"]) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const [updated] = await db.update(workoutTemplatesTable).set(updates).where(eq(workoutTemplatesTable.id, id)).returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update template" });
  }
});

router.delete("/training/templates/:id", async (req, res) => {
  try {
    await db.delete(workoutTemplatesTable).where(eq(workoutTemplatesTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

router.get("/training/sessions", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer();
    const limit = parseInt(req.query.limit as string) || 20;
    const sessions = await db.select().from(workoutSessionsTable)
      .where(eq(workoutSessionsTable.playerId, player.id))
      .orderBy(desc(workoutSessionsTable.startedAt))
      .limit(limit);
    const result = await Promise.all(sessions.map(async s => {
      const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.sessionId, s.id));
      return {
        ...s,
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() || null,
        sets: sets.map(ws => ({ ...ws, createdAt: ws.createdAt.toISOString() })),
      };
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

router.post("/training/sessions", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer();
    const { name, templateId, notes } = req.body;
    const [session] = await db.insert(workoutSessionsTable)
      .values({ playerId: player.id, name, templateId, notes, status: "active" })
      .returning();
    res.status(201).json({ ...session, startedAt: session.startedAt.toISOString(), completedAt: null, sets: [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to start session" });
  }
});

router.get("/training/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [session] = await db.select().from(workoutSessionsTable).where(eq(workoutSessionsTable.id, id));
    if (!session) return res.status(404).json({ error: "Session not found" });
    const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.sessionId, id)).orderBy(workoutSetsTable.createdAt);
    res.json({
      ...session,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() || null,
      sets: sets.map(ws => ({ ...ws, createdAt: ws.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get session" });
  }
});

router.patch("/training/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { player, stats } = await getOrCreatePlayer();
    const { status, notes, completedAt } = req.body;

    const updates: Record<string, any> = {};
    if (notes !== undefined) updates.notes = notes;

    let xpResult: any = null;
    let goldEarned = 0;

    if (status === "completed") {
      const finishedAt = completedAt ? new Date(completedAt) : new Date();
      updates.completedAt = finishedAt;
      updates.status = "completed";
      const [session] = await db.select().from(workoutSessionsTable).where(eq(workoutSessionsTable.id, id));
      if (session) {
        const durationMs = finishedAt.getTime() - session.startedAt.getTime();
        const durationMinutes = Math.round(durationMs / 60000);
        updates.durationMinutes = durationMinutes;

        // XP: base 150 + 2 per minute (capped at 60min bonus) + 20 per PR in session
        const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.sessionId, id));
        const prCount = sets.filter(s => s.isPr).length;
        const baseXp = 150 + Math.min(durationMinutes, 60) * 2 + prCount * 20;
        goldEarned = 25 + Math.floor(durationMinutes / 5) * 5 + prCount * 15;

        updates.xpEarned = baseXp;
        updates.goldEarned = goldEarned;

        const today = getTodayStr();

        // Update streak + gold first
        await updateStreak(player.id, today);
        await db.update(playerTable).set({
          gold: player.gold + goldEarned,
          totalWorkouts: (player.totalWorkouts || 0) + 1,
          updatedAt: new Date(),
        }).where(eq(playerTable.id, player.id));

        // Apply XP through progression engine (handles level ups + achievements)
        xpResult = await applyXpEvent(player.id, baseXp, "Workout Completed", "training", today);

        // Check nutrition bonus — if today's calories are within 200 of target, grant bonus XP
        const nutritionLogs = await db.select().from(nutritionLogsTable)
          .where(and(eq(nutritionLogsTable.playerId, player.id), eq(nutritionLogsTable.date, today)));
        const targets = await db.select().from(nutritionTargetsTable)
          .where(eq(nutritionTargetsTable.playerId, player.id));
        if (nutritionLogs.length > 0 && targets.length > 0) {
          const totalCals = nutritionLogs.reduce((s, n) => s + n.calories, 0);
          const calTarget = targets[0].calories;
          if (Math.abs(totalCals - calTarget) <= 200) {
            await applyXpEvent(player.id, 50, "Nutrition Target Met", "nutrition", today);
          }
        }
      }
    } else {
      updates.status = status;
    }

    const [updated] = await db.update(workoutSessionsTable).set(updates).where(eq(workoutSessionsTable.id, id)).returning();
    const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.sessionId, id));

    const { player: freshPlayer, stats: freshStats } = await getOrCreatePlayer();

    res.json({
      session: {
        ...updated,
        startedAt: updated.startedAt.toISOString(),
        completedAt: updated.completedAt?.toISOString() || null,
        sets: sets.map(ws => ({ ...ws, createdAt: ws.createdAt.toISOString() })),
      },
      xpEarned: xpResult?.totalXpAwarded || 0,
      goldEarned,
      leveledUp: xpResult?.leveledUp || false,
      levelsGained: xpResult?.levelsGained || 0,
      rankedUp: xpResult?.rankedUp || false,
      newRank: xpResult?.newRank || null,
      newAchievements: xpResult?.newAchievements || [],
      newTitles: xpResult?.newTitles || [],
      player: buildPlayerResponse(freshPlayer, freshStats),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update session" });
  }
});

router.post("/training/sessions/:id/sets", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { player } = await getOrCreatePlayer();
    const { exerciseId, setNumber, reps, weight, weightUnit, rpe, notes } = req.body;

    const [exercise] = await db.select().from(exercisesTable).where(eq(exercisesTable.id, exerciseId));
    if (!exercise) return res.status(404).json({ error: "Exercise not found" });

    // Check PR
    const prs = await db.select().from(personalRecordsTable)
      .where(and(eq(personalRecordsTable.playerId, player.id), eq(personalRecordsTable.exerciseId, exerciseId)));
    const e1rm = weight > 0 ? weight * (1 + reps / 30) : 0;
    const currentBest = prs.reduce((best, pr) => {
      const prE1rm = pr.estimatedOneRepMax || pr.weight * (1 + pr.reps / 30);
      return prE1rm > best ? prE1rm : best;
    }, 0);
    const isPr = e1rm > currentBest && weight > 0 && reps > 0;

    const [set] = await db.insert(workoutSetsTable).values({
      sessionId, exerciseId, exerciseName: exercise.name,
      setNumber, reps, weight, weightUnit: weightUnit || "lbs", rpe, isPr, notes,
    }).returning();

    if (isPr) {
      await db.insert(personalRecordsTable).values({
        playerId: player.id, exerciseId, exerciseName: exercise.name,
        weight, reps, weightUnit: weightUnit || "lbs", estimatedOneRepMax: e1rm,
      });
      await db.update(playerTable).set({
        totalPrs: sql`${playerTable.totalPrs} + 1`,
        updatedAt: new Date(),
      }).where(eq(playerTable.id, player.id));
    }

    res.status(201).json({ ...set, createdAt: set.createdAt.toISOString(), isPr });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to log set" });
  }
});

router.patch("/training/sessions/:id/sets/:setId", async (req, res) => {
  try {
    const setId = parseInt(req.params.setId);
    const updates: Record<string, any> = {};
    for (const k of ["reps", "weight", "weightUnit", "rpe", "notes"]) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const [updated] = await db.update(workoutSetsTable).set(updates).where(eq(workoutSetsTable.id, setId)).returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update set" });
  }
});

router.delete("/training/sessions/:id/sets/:setId", async (req, res) => {
  try {
    await db.delete(workoutSetsTable).where(eq(workoutSetsTable.id, parseInt(req.params.setId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete set" });
  }
});

router.get("/training/prs", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer();
    const prs = await db.select().from(personalRecordsTable)
      .where(eq(personalRecordsTable.playerId, player.id))
      .orderBy(desc(personalRecordsTable.achievedAt));
    res.json(prs.map(pr => ({ ...pr, achievedAt: pr.achievedAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get PRs" });
  }
});

export default router;
