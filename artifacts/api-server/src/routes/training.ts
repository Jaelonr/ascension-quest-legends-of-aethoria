import { Router } from "express";
import { db } from "@workspace/db";
import {
  exercisesTable, workoutTemplatesTable, workoutSessionsTable,
  workoutSetsTable, personalRecordsTable, playerTable, nutritionLogsTable,
  nutritionTargetsTable, playerBiometricsTable, bossRaidsTable,
  combatReplaysTable, playerStyleIdentityTable, rpgGearTable,
  guildMasterMemoriesTable, worldEventsTable,
} from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { autoClaimActiveMission } from "./campaign";
import { getOrCreatePlayer, buildPlayerResponse } from "../progression";
import { applyXpEvent, updateStreak } from "../progression";
import { progressRaidTasks } from "./boss-raids";
import {
  classifyWorkoutStyle, generateCombatReplay, getRaidStyleBonus,
  type CombatInput, type NarrativeIntensity, type WorkoutSetData,
} from "../combat-engine";
import { getTrainingIntelligence, recomputeTrainingIntelligence } from "../training-intelligence";

const router = Router();
const COMMISSION_NOTE_PREFIX = "[commission-context]";

function parseCommissionContext(notes: string | null | undefined): any | null {
  if (!notes?.includes(COMMISSION_NOTE_PREFIX)) return null;
  const raw = notes
    .split("\n")
    .find((line) => line.trim().startsWith(COMMISSION_NOTE_PREFIX))
    ?.replace(COMMISSION_NOTE_PREFIX, "")
    .trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function normalizeRegionKey(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/n['’]thaloris/g, "sunken kingdom")
    .replace(/frostvale/g, "frostveil peaks")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function calculateRegionalGearGoldBonus(
  equippedGear: Array<{ narrativeModifiers: string[] }>,
  regionName: string | null | undefined,
) {
  const regionKey = normalizeRegionKey(regionName);
  if (!regionKey) return { percent: 0, gold: 0, tags: [] as string[] };

  const matched: string[] = [];
  let percent = 0;
  for (const item of equippedGear) {
    for (const modifier of item.narrativeModifiers ?? []) {
      const match = modifier.match(/^regional_gold_bonus:([^:]+):(\d+)$/);
      if (!match) continue;
      const [, modifierRegion, rawPercent] = match;
      if (modifierRegion === regionKey) {
        const bonus = Math.max(0, Math.min(Number(rawPercent), 3));
        percent += bonus;
        matched.push(modifier);
      }
    }
  }

  return {
    percent: Math.min(percent, 6),
    gold: 0,
    tags: matched,
  };
}

function styleLabel(style: string | null | undefined) {
  if (!style) return "Unknown";
  const labels: Record<string, string> = {
    strength: "Iron Vanguard",
    striking: "Storm Duelist",
    conditioning: "Wayfarer",
    grappling: "Chainwarden",
    recovery: "Verdant Guardian",
    discipline: "Runesage",
  };
  return labels[style] ?? style.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const STYLE_KEYS = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;
type StyleKey = typeof STYLE_KEYS[number];
type StyleScoreMap = Record<StyleKey, number>;

function emptyStyleScores(): StyleScoreMap {
  return { strength: 0, striking: 0, conditioning: 0, grappling: 0, recovery: 0, discipline: 0 };
}

function scoresFromIdentity(identity: typeof playerStyleIdentityTable.$inferSelect | undefined): StyleScoreMap {
  if (!identity) return emptyStyleScores();
  return {
    strength: identity.strengthScore,
    striking: identity.strikingScore,
    conditioning: identity.conditioningScore,
    grappling: identity.grapplingScore,
    recovery: identity.recoveryScore,
    discipline: identity.disciplineScore,
  };
}

function addStyleScores(a: StyleScoreMap, b: StyleScoreMap): StyleScoreMap {
  return {
    strength: a.strength + b.strength,
    striking: a.striking + b.striking,
    conditioning: a.conditioning + b.conditioning,
    grappling: a.grappling + b.grappling,
    recovery: a.recovery + b.recovery,
    discipline: a.discipline + b.discipline,
  };
}

function dominantStyleFromScores(scores: StyleScoreMap): StyleKey | null {
  const ranked = STYLE_KEYS
    .map((key) => ({ key, score: scores[key] }))
    .sort((a, b) => b.score - a.score);
  return ranked[0] && ranked[0].score > 0 ? ranked[0].key : null;
}

async function recordStyleIdentityMilestones(input: {
  playerId: number;
  sessionId: number;
  replayId: number | null;
  sessionName: string;
  previousDominantStyle: StyleKey | null;
  dominantStyle: StyleKey | null;
  previousHybridArchetype: string | null;
  hybridArchetype: string | null;
  totalSessions: number;
}) {
  if (input.dominantStyle && !input.previousDominantStyle) {
    const label = styleLabel(input.dominantStyle);
    await db.insert(worldEventsTable).values({
      playerId: input.playerId,
      worldKey: `style-identity:first:${input.dominantStyle}`,
      title: `Combat Identity Emerges: ${label}`,
      description: `${input.sessionName} gave the Chronicle enough evidence to name the adventurer's first dominant combat pattern: ${label}.`,
      status: "recorded",
      severity: "moderate",
      reversible: false,
      metadata: {
        replayId: input.replayId,
        sessionId: input.sessionId,
        dominantStyle: input.dominantStyle,
        totalSessions: input.totalSessions,
      },
    }).onConflictDoNothing();
  }

  if (input.dominantStyle && input.previousDominantStyle && input.dominantStyle !== input.previousDominantStyle) {
    const previous = styleLabel(input.previousDominantStyle);
    const next = styleLabel(input.dominantStyle);
    await db.insert(worldEventsTable).values({
      playerId: input.playerId,
      worldKey: `style-identity:shift:${input.sessionId}`,
      title: `Combat Identity Shift: ${next}`,
      description: `The Chronicle records a shift from ${previous} toward ${next}. The player's real training has changed how Aethoria reads their fighting style.`,
      status: "recorded",
      severity: "moderate",
      reversible: true,
      metadata: {
        replayId: input.replayId,
        sessionId: input.sessionId,
        previousDominantStyle: input.previousDominantStyle,
        dominantStyle: input.dominantStyle,
        totalSessions: input.totalSessions,
      },
    }).onConflictDoNothing();
  }

  if (input.hybridArchetype && input.hybridArchetype !== input.previousHybridArchetype) {
    const key = input.hybridArchetype.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    await db.insert(worldEventsTable).values({
      playerId: input.playerId,
      worldKey: `style-archetype:${key}`,
      title: `Archetype Formed: ${input.hybridArchetype}`,
      description: `Repeated field records have begun forming the ${input.hybridArchetype}. This was earned through behavior, not chosen from a menu.`,
      status: "recorded",
      severity: "major",
      reversible: false,
      metadata: {
        replayId: input.replayId,
        sessionId: input.sessionId,
        hybridArchetype: input.hybridArchetype,
        dominantStyle: input.dominantStyle,
        totalSessions: input.totalSessions,
      },
    }).onConflictDoNothing();

    await db.insert(guildMasterMemoriesTable).values({
      playerId: input.playerId,
      kind: "style_identity",
      sourceKey: `style-archetype:${key}`,
      summary: `The adventurer's training has begun forming the ${input.hybridArchetype} archetype.`,
      importance: 3,
      occurredAt: new Date(),
    }).onConflictDoNothing();
  }
}

function selectRaidPressureFields(playerId: number, statuses = ["active"]) {
  return db.select({
    id: bossRaidsTable.id,
    title: bossRaidsTable.title,
    difficulty: bossRaidsTable.difficulty,
    status: bossRaidsTable.status,
    tasks: bossRaidsTable.tasks,
  })
    .from(bossRaidsTable)
    .where(and(eq(bossRaidsTable.playerId, playerId), inArray(bossRaidsTable.status, statuses as any)));
}

async function recordCombatChronicleMilestones(input: {
  playerId: number;
  replayId: number | null;
  sessionId: number;
  sessionName: string;
  replay: NonNullable<ReturnType<typeof generateCombatReplay>>;
  commissionContext: any | null;
  activeRaids: Array<{ id: number; title: string; difficulty: string; status: string; tasks: unknown }>;
  xpEarned: number;
  goldEarned: number;
  prCount: number;
  nutritionMet: boolean;
}) {
  const regionName = input.commissionContext?.regionName ?? null;
  const locationName = input.commissionContext?.locationName ?? null;
  const completionPath = input.commissionContext?.completionPath ?? null;
  const style = styleLabel(input.replay.dominantStyle);
  const regionPhrase = regionName ? ` in ${regionName}${locationName ? ` near ${locationName}` : ""}` : "";
  const consequence = input.replay.narrativeConsequence ? ` ${input.replay.narrativeConsequence}` : "";

  await db.insert(worldEventsTable).values({
    playerId: input.playerId,
    worldKey: `combat-replay:${input.sessionId}`,
    title: `${input.replay.verdict}: ${input.replay.encounterName}`,
    description: `${input.sessionName} became a ${style} encounter against ${input.replay.enemyName}${regionPhrase}.${consequence}`,
    status: "recorded",
    severity: input.prCount > 0 || input.replay.verdict === "Victory" ? "major" : "minor",
    reversible: false,
    metadata: {
      replayId: input.replayId,
      sessionId: input.sessionId,
      dominantStyle: input.replay.dominantStyle,
      secondaryStyle: input.replay.secondaryStyle,
      hybridArchetype: input.replay.hybridArchetype,
      xpEarned: input.xpEarned,
      goldEarned: input.goldEarned,
      prCount: input.prCount,
      nutritionMet: input.nutritionMet,
      regionName,
      locationName,
      completionPath,
    },
  }).onConflictDoNothing();

  await db.insert(guildMasterMemoriesTable).values({
    playerId: input.playerId,
    kind: input.prCount > 0 ? "accomplishment" : "combat_replay",
    sourceKey: `combat-replay:${input.sessionId}`,
    summary: input.prCount > 0
      ? `Set ${input.prCount} personal record${input.prCount === 1 ? "" : "s"} during ${input.sessionName}; the Chronicle recorded ${input.replay.verdict.toLowerCase()} against ${input.replay.enemyName}.`
      : `Completed ${input.sessionName}; the Chronicle recorded a ${input.replay.dominantStyle} style encounter against ${input.replay.enemyName}.`,
    importance: input.prCount > 0 ? 3 : 2,
    occurredAt: new Date(),
  }).onConflictDoNothing();

  if (input.replay.hybridArchetype) {
    await db.insert(guildMasterMemoriesTable).values({
      playerId: input.playerId,
      kind: "style_identity",
      sourceKey: `style-identity:${input.replay.hybridArchetype}`,
      summary: `Repeated training patterns have begun forming the ${input.replay.hybridArchetype} archetype.`,
      importance: 3,
      occurredAt: new Date(),
    }).onConflictDoNothing();
  }

  if (regionName) {
    await db.insert(worldEventsTable).values({
      playerId: input.playerId,
      worldKey: `region-visit:${normalizeRegionKey(regionName)}:${input.sessionId}`,
      title: `Field Duty: ${regionName}`,
      description: `A real training session advanced a commission route through ${regionName}${locationName ? ` at ${locationName}` : ""}. The Return Stone brought the adventurer back after the work was logged.`,
      status: "recorded",
      severity: "minor",
      reversible: false,
      metadata: {
        replayId: input.replayId,
        sessionId: input.sessionId,
        regionName,
        locationName,
        travelMethod: input.commissionContext?.travelMethod ?? null,
        completionPath,
      },
    }).onConflictDoNothing();
  }

  for (const raid of input.activeRaids) {
    const tasks = Array.isArray(raid.tasks) ? raid.tasks as any[] : [];
    const completedTasks = tasks.filter((task) => task?.completed).length;
    const totalTasks = tasks.length;
    const bonus = getRaidStyleBonus(input.replay.dominantStyle, raid.difficulty);
    const progressLabel = totalTasks > 0 ? `${completedTasks}/${totalTasks} raid duties complete` : "raid pressure recorded";
    const advantageText = bonus.multiplier > 1
      ? bonus.narrative
      : `${style} pressure tested the raid's defenses while other adventurers held the wider line.`;

    await db.insert(worldEventsTable).values({
      playerId: input.playerId,
      worldKey: `raid-pressure:${raid.id}:${input.sessionId}`,
      title: `Raid Pressure: ${raid.title}`,
      description: `${input.sessionName} pushed against ${raid.title}. ${progressLabel}. ${advantageText}`,
      status: totalTasks > 0 && completedTasks >= totalTasks ? "resolved" : "active",
      severity: raid.difficulty === "A" || raid.difficulty === "S" ? "major" : "moderate",
      reversible: true,
      metadata: {
        raidId: raid.id,
        replayId: input.replayId,
        sessionId: input.sessionId,
        difficulty: raid.difficulty,
        dominantStyle: input.replay.dominantStyle,
        styleMultiplier: bonus.multiplier,
        completedTasks,
        totalTasks,
      },
      resolvedAt: totalTasks > 0 && completedTasks >= totalTasks ? new Date() : null,
    }).onConflictDoNothing();

    await db.insert(guildMasterMemoriesTable).values({
      playerId: input.playerId,
      kind: "raid_pressure",
      sourceKey: `raid-pressure:${raid.id}:${input.sessionId}`,
      summary: `${input.sessionName} applied ${style} pressure against ${raid.title}; ${progressLabel}.`,
      importance: raid.difficulty === "A" || raid.difficulty === "S" ? 3 : 2,
      occurredAt: new Date(),
    }).onConflictDoNothing();
  }
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

router.get("/training/intelligence", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    res.json(await getTrainingIntelligence(player.id));
  } catch (err) {
    req.log.error(err, "training intelligence error");
    res.status(500).json({ error: "Failed to read training intelligence" });
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
    if (!template) return void res.status(404).json({ error: "Template not found" });
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
    const { player } = await getOrCreatePlayer(req.userId);
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
    const { player } = await getOrCreatePlayer(req.userId);
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
    if (!session) return void res.status(404).json({ error: "Session not found" });
    const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.sessionId, id)).orderBy(workoutSetsTable.createdAt);
    let templateExercises: Array<{ exerciseId: number; name: string; sets: number; reps: string; muscleGroup?: string }> = [];
    if (session.templateId) {
      const [template] = await db.select().from(workoutTemplatesTable).where(eq(workoutTemplatesTable.id, session.templateId));
      if (template) templateExercises = (template.exercises as any[]) || [];
    }
    res.json({
      ...session,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() || null,
      sets: sets.map(ws => ({ ...ws, createdAt: ws.createdAt.toISOString() })),
      templateExercises,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get session" });
  }
});

router.patch("/training/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { player, stats } = await getOrCreatePlayer(req.userId);
    const { status, notes, completedAt } = req.body;
    const narrativeIntensity: NarrativeIntensity =
      (req.body.narrativeIntensity as NarrativeIntensity) || "balanced";

    const updates: Record<string, any> = {};
    if (notes !== undefined) updates.notes = notes;

    let xpResult: any = null;
    let goldEarned = 0;
    let combatReplay: any = null;
    let missionClaimed: { title: string; xpReward: number; goldReward: number } | null = null;

    if (status === "completed") {
      const finishedAt = completedAt ? new Date(completedAt) : new Date();
      updates.completedAt = finishedAt;
      updates.status = "completed";
      const [session] = await db.select().from(workoutSessionsTable).where(and(
        eq(workoutSessionsTable.id, id),
        eq(workoutSessionsTable.playerId, player.id),
      ));

      if (session) {
        if (session.status === "completed") {
          const [existingReplay] = await db.select().from(combatReplaysTable)
            .where(eq(combatReplaysTable.sessionId, session.id)).limit(1);
          const existingSets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.sessionId, id));
          return void res.json({
            session: {
              ...session,
              startedAt: session.startedAt.toISOString(),
              completedAt: session.completedAt?.toISOString() || null,
              sets: existingSets.map(ws => ({ ...ws, createdAt: ws.createdAt.toISOString() })),
            },
            alreadyCompleted: true,
            xpEarned: 0,
            goldEarned: 0,
            combatReplay: existingReplay ?? null,
          });
        }
        const durationMs = finishedAt.getTime() - session.startedAt.getTime();
        const durationMinutes = Math.round(durationMs / 60000);
        updates.durationMinutes = durationMinutes;

        const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.sessionId, id));
        const prCount = sets.filter(s => s.isPr).length;
        const baseXp = 150 + Math.min(durationMinutes, 60) * 2 + prCount * 20;

        // Build exercise map once — used for volume calc AND combat engine
        const exerciseIds = [...new Set(sets.map(s => s.exerciseId))];
        const exList = exerciseIds.length > 0
          ? await db.select().from(exercisesTable).where(inArray(exercisesTable.id, exerciseIds))
          : [];
        const exerciseMap = new Map(exList.map(e => [e.id, e]));

        // Build WorkoutSetData for combat engine
        const workoutSetData: WorkoutSetData[] = sets.map(s => ({
          exerciseName: s.exerciseName,
          muscleGroup: exerciseMap.get(s.exerciseId)?.muscleGroup ?? "general",
          reps: s.reps,
          weightKg: s.weightUnit === "lbs" ? s.weight * 0.453592 : s.weight,
          rpe: s.rpe ?? 7,
          isPr: s.isPr,
        }));

        // Volume bonus
        let volumeBonus = 0;
        let volumeBonusBreakdown = "";
        const [bio] = await db.select().from(playerBiometricsTable).where(eq(playerBiometricsTable.playerId, player.id));
        if (bio && sets.length > 0) {
          let totalVolumeKg = 0;
          let heaviestRelativeIntensity = 0;

          for (const s of sets) {
            const weightKg = s.weightUnit === "lbs" ? s.weight * 0.453592 : s.weight;
            totalVolumeKg += weightKg * s.reps;

            const ex = exerciseMap.get(s.exerciseId);
            if (ex) {
              const name = ex.name.toLowerCase();
              const mg = ex.muscleGroup.toLowerCase();
              let orm: number | null = null;
              if (name.includes("deadlift")) orm = bio.deadlift1rm;
              else if (mg.includes("leg") || mg.includes("quad") || name.includes("squat")) orm = bio.squat1rm;
              else if (mg.includes("chest") || name.includes("bench")) orm = bio.bench1rm;
              else if (mg.includes("shoulder") || name.includes("overhead") || name.includes("ohp")) orm = bio.ohp1rm;
              else if (mg.includes("back") || name.includes("row")) orm = bio.row1rm;

              if (orm && weightKg > 0) {
                const intensity = weightKg / orm;
                heaviestRelativeIntensity = Math.max(heaviestRelativeIntensity, intensity);
              }
            }
          }

          const volumeXp = Math.min(150, Math.floor(totalVolumeKg / 100));
          const intensityXp = heaviestRelativeIntensity >= 0.9 ? 100
            : heaviestRelativeIntensity >= 0.8 ? 60
            : heaviestRelativeIntensity >= 0.7 ? 30
            : 0;

          volumeBonus = volumeXp + intensityXp;
          volumeBonusBreakdown = `Volume: +${volumeXp} XP (${Math.round(totalVolumeKg)}kg lifted)${intensityXp > 0 ? `, Intensity: +${intensityXp} XP (${Math.round(heaviestRelativeIntensity * 100)}% of 1RM)` : ""}`;
        }

        const commissionContext = parseCommissionContext(session.notes);
        const equippedGear = await db.select().from(rpgGearTable).where(and(
          eq(rpgGearTable.playerId, player.id),
          eq(rpgGearTable.equipped, true),
        ));
        const xpBonusPercent = Math.min(10, equippedGear.reduce(
          (total, item) => total + Math.max(0, item.xpBonusPercent), 0,
        ));
        const totalXp = Math.round((baseXp + volumeBonus) * (1 + xpBonusPercent / 100));
        goldEarned = 25 + Math.floor(durationMinutes / 5) * 5 + prCount * 15 + Math.floor(volumeBonus / 10);
        const regionalGold = calculateRegionalGearGoldBonus(equippedGear, commissionContext?.regionName);
        const regionalGoldBonus = regionalGold.percent > 0
          ? Math.max(1, Math.floor(goldEarned * (regionalGold.percent / 100)))
          : 0;
        goldEarned += regionalGoldBonus;

        updates.xpEarned = totalXp;
        updates.goldEarned = goldEarned;
        const priorNotes = session.notes ?? "";
        const preservedCommissionLine = priorNotes
          .split("\n")
          .find((line) => line.trim().startsWith(COMMISSION_NOTE_PREFIX));
        updates.notes = [preservedCommissionLine, volumeBonusBreakdown || updates.notes]
          .filter(Boolean)
          .join("\n");

        const today = getTodayStr();

        await updateStreak(player.id, today);
        await db.update(playerTable).set({
          gold: player.gold + goldEarned,
          totalWorkouts: (player.totalWorkouts || 0) + 1,
          updatedAt: new Date(),
        }).where(eq(playerTable.id, player.id));

        xpResult = await applyXpEvent(player.id, totalXp, "Workout Completed", "training", today);

        const raidsBeforeProgress = await selectRaidPressureFields(player.id, ["active"]);
        await progressRaidTasks(player.id, "workout_sessions", 1);
        if (prCount > 0) await progressRaidTasks(player.id, "prs", prCount);
        const progressedRaidIds = new Set(raidsBeforeProgress.map((raid) => raid.id));
        const activeRaids = (await selectRaidPressureFields(player.id, ["active", "completed"]))
          .filter((raid) => progressedRaidIds.has(raid.id));

        // Nutrition bonus
        const nutritionLogs = await db.select().from(nutritionLogsTable)
          .where(and(eq(nutritionLogsTable.playerId, player.id), eq(nutritionLogsTable.date, today)));
        const targets = await db.select().from(nutritionTargetsTable)
          .where(eq(nutritionTargetsTable.playerId, player.id));

        let nutritionMet = false;
        if (nutritionLogs.length > 0 && targets.length > 0) {
          const totalCals = nutritionLogs.reduce((s, n) => s + n.calories, 0);
          const calTarget = targets[0]!.calories;
          nutritionMet = Math.abs(totalCals - calTarget) <= 200;
          if (nutritionMet) {
            await applyXpEvent(player.id, 50, "Nutrition Target Met", "nutrition", today);
          }
        }

        const { player: freshPlayer } = await getOrCreatePlayer(req.userId);

        // Generate Combat Replay
        const combatInput: CombatInput = {
          sessionName: commissionContext?.intendedStyle
            ? `${session.name} - ${commissionContext.regionName ?? "Aethoria"} ${commissionContext.intendedStyle}`
            : session.name,
          durationMinutes,
          sets: workoutSetData,
          prCount,
          xpEarned: totalXp,
          goldEarned,
          nutritionMet,
          activeRaidTitles: activeRaids.map(r => r.title),
          gearDrop: null,
          playerRank: xpResult?.newRank ?? freshPlayer.rank ?? "E",
          baseClass: freshPlayer.baseClass ?? "Iron Knight",
          playerName: freshPlayer.name ?? "Adventurer",
          narrativeIntensity,
          elementalAffinity: equippedGear.find((item) => item.elementalAffinity !== "physical")?.elementalAffinity ?? "physical",
          narrativeModifiers: [
            ...equippedGear.flatMap((item) => item.narrativeModifiers).filter((modifier) => !modifier.includes(":")).slice(0, 3),
            ...(regionalGoldBonus > 0 && commissionContext?.regionName
              ? [`Local gear helped in ${commissionContext.regionName}; +${regionalGoldBonus} gold from regional credibility.`]
              : []),
          ],
          commission: commissionContext ? {
            commissionId: commissionContext.commissionId,
            regionId: commissionContext.regionId,
            regionName: commissionContext.regionName,
            locationId: commissionContext.locationId,
            locationName: commissionContext.locationName,
            completionPath: commissionContext.completionPath,
            completionLabel: commissionContext.completionLabel,
            completionNarrative: commissionContext.completionNarrative,
            intendedStyle: commissionContext.intendedStyle,
            narrativeThreat: commissionContext.narrativeThreat,
            travelMethod: commissionContext.travelMethod,
            flavorKind: commissionContext.flavorKind,
            flavorTitle: commissionContext.flavorTitle,
            flavorObjective: commissionContext.flavorObjective,
            flavorStakes: commissionContext.flavorStakes,
          } : null,
        };

        combatReplay = generateCombatReplay(combatInput);

        // Save combat replay
        const [savedReplay] = await db.insert(combatReplaysTable).values({
          playerId: player.id,
          sessionId: id,
          encounterName: combatReplay.encounterName,
          enemyName: combatReplay.enemyName,
          dominantStyle: combatReplay.dominantStyle,
          secondaryStyle: combatReplay.secondaryStyle,
          hybridArchetype: combatReplay.hybridArchetype,
          verdict: combatReplay.verdict,
          events: combatReplay.events,
          styleScores: combatReplay.styleScores,
          xpEarned: totalXp,
          goldEarned,
          prCount,
          elementalAffinity: combatInput.elementalAffinity,
          narrativeModifiers: combatInput.narrativeModifiers,
          raidImpact: combatReplay.raidImpact,
          narrativeIntensity,
        }).returning();

        if (savedReplay) {
          combatReplay = {
            id: savedReplay.id,
            createdAt: savedReplay.createdAt.toISOString(),
            ...combatReplay,
          };
        }

        // Upsert player style identity
        const { scores } = classifyWorkoutStyle(combatInput);
        const [existingIdentity] = await db.select()
          .from(playerStyleIdentityTable)
          .where(eq(playerStyleIdentityTable.playerId, player.id));
        const previousScores = scoresFromIdentity(existingIdentity);
        const nextScores = addStyleScores(previousScores, scores);
        const previousDominantStyle = dominantStyleFromScores(previousScores);
        const nextDominantStyle = dominantStyleFromScores(nextScores);
        const previousHybridArchetype = existingIdentity?.hybridArchetype ?? null;
        const nextTotalSessions = (existingIdentity?.totalSessions ?? 0) + 1;

        if (existingIdentity) {
          await db.update(playerStyleIdentityTable).set({
            strengthScore: nextScores.strength,
            strikingScore: nextScores.striking,
            conditioningScore: nextScores.conditioning,
            grapplingScore: nextScores.grappling,
            recoveryScore: nextScores.recovery,
            disciplineScore: nextScores.discipline,
            totalSessions: nextTotalSessions,
            hybridArchetype: combatReplay.hybridArchetype,
            updatedAt: new Date(),
          }).where(eq(playerStyleIdentityTable.playerId, player.id));
        } else {
          await db.insert(playerStyleIdentityTable).values({
            playerId: player.id,
            strengthScore: nextScores.strength,
            strikingScore: nextScores.striking,
            conditioningScore: nextScores.conditioning,
            grapplingScore: nextScores.grappling,
            recoveryScore: nextScores.recovery,
            disciplineScore: nextScores.discipline,
            totalSessions: nextTotalSessions,
            hybridArchetype: combatReplay.hybridArchetype,
          });
        }

        await recordStyleIdentityMilestones({
          playerId: player.id,
          replayId: savedReplay?.id ?? null,
          sessionId: session.id,
          sessionName: session.name,
          previousDominantStyle,
          dominantStyle: nextDominantStyle,
          previousHybridArchetype,
          hybridArchetype: combatReplay.hybridArchetype,
          totalSessions: nextTotalSessions,
        });

        await recordCombatChronicleMilestones({
          playerId: player.id,
          replayId: savedReplay?.id ?? null,
          sessionId: session.id,
          sessionName: session.name,
          replay: combatReplay,
          commissionContext,
          activeRaids,
          xpEarned: totalXp,
          goldEarned,
          prCount,
          nutritionMet,
        });

        // Auto-claim any active campaign mission when workout is complete
        missionClaimed = await autoClaimActiveMission(player.id, today);

        try {
          await recomputeTrainingIntelligence(player.id);
        } catch (err) {
          req.log.warn(err, "training intelligence update failed");
        }
      }
    } else {
      updates.status = status;
    }

    const [updated] = await db.update(workoutSessionsTable).set(updates).where(eq(workoutSessionsTable.id, id)).returning();
    const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.sessionId, id));

    const { player: freshPlayer, stats: freshStats } = await getOrCreatePlayer(req.userId);

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
      combatReplay,
      missionClaimed,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update session" });
  }
});

router.post("/training/sessions/:id/sets", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { player } = await getOrCreatePlayer(req.userId);
    const { exerciseId, setNumber, reps, weight, weightUnit, rpe, notes } = req.body;

    const [exercise] = await db.select().from(exercisesTable).where(eq(exercisesTable.id, exerciseId));
    if (!exercise) return void res.status(404).json({ error: "Exercise not found" });

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
    const { player } = await getOrCreatePlayer(req.userId);
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
