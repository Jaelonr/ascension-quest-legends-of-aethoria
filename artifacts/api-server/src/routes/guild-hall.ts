import { Router } from "express";
import {
  bossRaidsTable,
  aethoriaLocationsTable,
  dailyCommissionsTable,
  db,
  equipmentTable,
  guildMasterMemoriesTable,
  nutritionLogsTable,
  nutritionTargetsTable,
  playerBiometricsTable,
  personalRecordsTable,
  playerTable,
  playerStyleIdentityTable,
  questTasksTable,
  questsTable,
  rpgGearTable,
  storeItemsTable,
  storyConsequencesTable,
  wearableEntriesTable,
  workoutSessionsTable,
  worldEventsTable,
} from "@workspace/db";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { applyXpEvent, getOrCreatePlayer } from "../progression";
import { buildQuestResponse, ensureDailyQuest, getTodayStr } from "./quests";
import { buildWorldDanger } from "../domain/world-danger";
import { buildCommissionTravelPlan, chooseCommissionLocation, type AethoriaLocation } from "../domain/aethoria-locations";

const router = Router();
const RANK_ORDER = ["E", "D", "C", "B", "A", "S", "National-Level"];
const STYLE_KEYS = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;

type StyleKey = typeof STYLE_KEYS[number];

interface GuildPlayerContext {
  sleepHours: number | null;
  steps: number;
  activeMinutes: number;
  proteinToday: number;
  proteinTarget: number;
  mealsToday: number;
  equipment: string[];
  injuryNotes: string | null;
  recentWorkoutCount: number;
  recentPrCount: number;
  missedCommissions: number;
  dominantStyle: StyleKey | null;
  neglectedStyle: StyleKey | null;
  activeRaidTitle: string | null;
  lastRecommendation: string | null;
}

interface CommissionPlan {
  category: string;
  readiness: string;
  rationale: string;
  counsel: string;
  tasks: Array<{ description: string; targetValue: number; currentValue?: number; unit: string; order: number }>;
  context: Record<string, unknown>;
}

function attachCommissionLocation(plan: CommissionPlan, seed: number, locations: Parameters<typeof chooseCommissionLocation>[2] = []): CommissionPlan {
  const location = chooseCommissionLocation(plan.category, seed, locations);
  const travel = buildCommissionTravelPlan(plan.category, location);
  return {
    ...plan,
    rationale: `${plan.rationale} Location: ${location.name}, ${location.region}.`,
    context: {
      ...plan.context,
      location,
      travel,
    },
  };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function rankStyle(identity: typeof playerStyleIdentityTable.$inferSelect | undefined) {
  if (!identity) return { dominant: null as StyleKey | null, neglected: "conditioning" as StyleKey };
  const scores: Record<StyleKey, number> = {
    strength: identity.strengthScore,
    striking: identity.strikingScore,
    conditioning: identity.conditioningScore,
    grappling: identity.grapplingScore,
    recovery: identity.recoveryScore,
    discipline: identity.disciplineScore,
  };
  const sorted = STYLE_KEYS.map((key) => ({ key, score: scores[key] })).sort((a, b) => b.score - a.score);
  return {
    dominant: sorted[0]?.score ? sorted[0].key : null,
    neglected: sorted[sorted.length - 1]?.key ?? "conditioning",
  };
}

function hasAnyEquipment(equipment: string[], keys: string[]) {
  const source = equipment.join(" ").toLowerCase();
  return keys.some((key) => source.includes(key));
}

function buildDailyCommissionPlan(input: GuildPlayerContext): CommissionPlan {
  const hasInjuryFlag = !!input.injuryNotes && /pain|injur|ache|shoulder|back|knee|hip|impingement|strain/i.test(input.injuryNotes);
  if (hasInjuryFlag || (input.sleepHours != null && input.sleepHours < 6)) {
    return {
      category: "recovery",
      readiness: hasInjuryFlag ? "limited" : "recovery",
      rationale: hasInjuryFlag
        ? "Your notes mention a limitation, so the Guild is assigning work that builds consistency without gambling with pain."
        : "Your recovery is thin today, so the Guild is treating restoration as the mission.",
      counsel: "Restoration is still duty. Move carefully, eat like you intend to heal, and do not confuse courage with ignoring pain.",
      tasks: [
        { description: "Complete a recovery, mobility, or easy walk session", targetValue: 1, unit: "session", order: 1 },
        { description: "Reach today's protein target for repair", targetValue: input.proteinTarget || 1, unit: "g", order: 2 },
        { description: "Log sleep or recovery notes honestly", targetValue: 1, unit: "check-in", order: 3 },
      ],
      context: { reason: "recovery_flag", sleepHours: input.sleepHours, injuryNotesPresent: hasInjuryFlag },
    };
  }

  if (input.missedCommissions > 0) {
    return {
      category: "penalty_restoration",
      readiness: "ready",
      rationale: "A recent commission was missed, so Aldric is assigning a restoration duty that is firm but achievable.",
      counsel: "A missed day is not exile. It is a debt of attention. Pay it with one clean, honest return to the path.",
      tasks: [
        { description: "Complete one purposeful training or recovery session", targetValue: 1, unit: "session", order: 1 },
        { description: "Log 3 meals to restore the supply ledger", targetValue: 3, unit: "meals", order: 2 },
        { description: "Walk 6000 scouting steps", targetValue: 6000, unit: "steps", order: 3 },
      ],
      context: { reason: "recent_miss", missedCommissions: input.missedCommissions },
    };
  }

  if (input.neglectedStyle === "conditioning" || (input.dominantStyle === "strength" && input.steps < 5000)) {
    return {
      category: "conditioning",
      readiness: "ready",
      rationale: "Your record leans toward force, but the road still tests lungs and legs.",
      counsel: "Iron wins clashes. Endurance wins campaigns. Scout the perimeter and teach your body to keep moving after the first strike.",
      tasks: [
        { description: "Complete an endurance scouting session", targetValue: 1, unit: "session", order: 1 },
        { description: "Walk 7500 scouting steps", targetValue: 7500, unit: "steps", order: 2 },
        { description: "Reach today's protein target", targetValue: input.proteinTarget || 1, unit: "g", order: 3 },
      ],
      context: { reason: "conditioning_gap", dominantStyle: input.dominantStyle, neglectedStyle: input.neglectedStyle },
    };
  }

  if (hasAnyEquipment(input.equipment, ["heavy bag", "fightcamp", "speed bag", "double-end"])) {
    return {
      category: "skill_practice",
      readiness: "ready",
      rationale: "Your equipment supports striking practice, so the Guild is assigning a precision commission.",
      counsel: "Fast hands are only useful when the feet and breath obey. Keep the rounds sharp, not reckless.",
      tasks: [
        { description: "Complete a striking skill practice session", targetValue: 1, unit: "session", order: 1 },
        { description: "Log 3 meals to keep the provisions steady", targetValue: 3, unit: "meals", order: 2 },
        { description: "Reach today's protein target", targetValue: input.proteinTarget || 1, unit: "g", order: 3 },
      ],
      context: { reason: "striking_equipment", equipment: input.equipment },
    };
  }

  if (hasAnyEquipment(input.equipment, ["wrestling mat", "yoga mat"])) {
    return {
      category: "grappling",
      readiness: "ready",
      rationale: "Your mat access makes control work practical today.",
      counsel: "Control is quiet strength. Drill positions, protect the joints, and leave the floor better than you found it.",
      tasks: [
        { description: "Complete grappling, control, or mobility skill practice", targetValue: 1, unit: "session", order: 1 },
        { description: "Complete 20 active minutes", targetValue: 20, unit: "minutes", order: 2 },
        { description: "Reach today's protein target", targetValue: input.proteinTarget || 1, unit: "g", order: 3 },
      ],
      context: { reason: "mat_equipment", equipment: input.equipment },
    };
  }

  return {
    category: input.activeRaidTitle ? "story_linked" : "training",
    readiness: "ready",
    rationale: input.activeRaidTitle
      ? `An active threat remains on the board: ${input.activeRaidTitle}. Today's commission prepares you for it.`
      : "A balanced daily commission chosen from your current Guild record.",
    counsel: input.activeRaidTitle
      ? "The Gate is still open. Prepare without panic: train, eat, and return with the ledger clean."
      : "Discipline is built in small, honored actions. Finish today's commission, then report to me.",
    tasks: [
      { description: "Complete one workout or recovery session", targetValue: 1, unit: "session", order: 1 },
      { description: "Reach today's protein target", targetValue: input.proteinTarget || 1, unit: "g", order: 2 },
      { description: "Log 3 meals for the Guild ledger", targetValue: 3, unit: "meals", order: 3 },
    ],
    context: { reason: input.activeRaidTitle ? "active_raid" : "balanced", activeRaidTitle: input.activeRaidTitle },
  };
}

function buildCounsel(input: { sleepHours: number | null; equipment: string[]; incomplete: number; plan?: CommissionPlan }) {
  if (input.plan) return input.plan.counsel;
  if (input.sleepHours != null && input.sleepHours < 6) {
    return "Your recovery is thin today. Complete the work, but choose restoration over bravado. A disciplined adventurer knows when resilience is the mission.";
  }
  if (input.incomplete === 0) {
    return "The commission is complete. Report plainly, claim what you earned, and carry the lesson forward.";
  }
  const tools = input.equipment.length > 0
    ? `Your available equipment is accounted for: ${input.equipment.slice(0, 3).join(", ")}.`
    : "No special equipment is required; bodyweight work is acceptable.";
  return `Discipline is built in small, honored actions. ${tools} Finish today's commission, then report to me.`;
}

async function getAethoriaLocations() {
  try {
    const rows = await db.select().from(aethoriaLocationsTable);
    return rows.map((row) => ({
      key: row.key,
      name: row.name,
      kind: row.kind as AethoriaLocation["kind"],
      realm: row.realm,
      region: row.region,
      primaryFaction: row.primaryFaction,
      distanceFromGuildHallMiles: row.distanceFromGuildHallMiles,
      knownAtStart: row.knownAtStart,
      summary: row.summary,
      bestFor: row.bestFor,
    }));
  } catch {
    return [];
  }
}

async function getGuildPlayerContext(playerId: number): Promise<GuildPlayerContext> {
  const today = getTodayStr();
  const [biometrics, wearable, nutrition, targets, recentWorkouts, prs, identityRows, misses, raids, memories, equipmentRows] = await Promise.all([
    db.select().from(playerBiometricsTable).where(eq(playerBiometricsTable.playerId, playerId)).limit(1),
    db.select().from(wearableEntriesTable).where(and(eq(wearableEntriesTable.playerId, playerId), eq(wearableEntriesTable.date, today))).limit(1),
    db.select().from(nutritionLogsTable).where(and(eq(nutritionLogsTable.playerId, playerId), eq(nutritionLogsTable.date, today))),
    db.select().from(nutritionTargetsTable).where(eq(nutritionTargetsTable.playerId, playerId)).limit(1),
    db.select().from(workoutSessionsTable).where(and(
      eq(workoutSessionsTable.playerId, playerId),
      eq(workoutSessionsTable.status, "completed"),
      gte(workoutSessionsTable.completedAt, daysAgo(14)),
    )),
    db.select().from(personalRecordsTable).where(and(
      eq(personalRecordsTable.playerId, playerId),
      gte(personalRecordsTable.achievedAt, daysAgo(30)),
    )),
    db.select().from(playerStyleIdentityTable).where(eq(playerStyleIdentityTable.playerId, playerId)).limit(1),
    db.select({ count: sql<number>`count(*)` }).from(storyConsequencesTable).where(and(
      eq(storyConsequencesTable.playerId, playerId),
      eq(storyConsequencesTable.tier, "minor"),
      gte(storyConsequencesTable.occurredAt, daysAgo(14)),
    )),
    db.select().from(bossRaidsTable).where(and(eq(bossRaidsTable.playerId, playerId), eq(bossRaidsTable.status, "active"))).limit(1),
    db.select().from(guildMasterMemoriesTable).where(eq(guildMasterMemoriesTable.playerId, playerId))
      .orderBy(desc(guildMasterMemoriesTable.occurredAt)).limit(1),
    db.select().from(equipmentTable).where(and(eq(equipmentTable.owned, true), eq(equipmentTable.available, true))),
  ]);
  const proteinToday = nutrition.reduce((total, entry) => total + entry.protein, 0);
  const ranked = rankStyle(identityRows[0]);
  const bioEquipment = biometrics[0]?.equipmentTypes ?? [];
  const realEquipment = equipmentRows.map((item) => item.name);
  return {
    sleepHours: wearable[0]?.sleepHours ?? null,
    steps: wearable[0]?.steps ?? 0,
    activeMinutes: wearable[0]?.activeMinutes ?? 0,
    proteinToday,
    proteinTarget: targets[0]?.protein ?? 0,
    mealsToday: nutrition.length,
    equipment: [...new Set([...bioEquipment, ...realEquipment])],
    injuryNotes: biometrics[0]?.notes ?? null,
    recentWorkoutCount: recentWorkouts.length,
    recentPrCount: prs.length,
    missedCommissions: Number(misses[0]?.count ?? 0),
    dominantStyle: ranked.dominant,
    neglectedStyle: ranked.neglected,
    activeRaidTitle: raids[0]?.title ?? null,
    lastRecommendation: memories[0]?.summary ?? null,
  };
}

async function applyCommissionPlan(questId: number, plan: CommissionPlan) {
  const tasks = await db.select().from(questTasksTable).where(eq(questTasksTable.questId, questId));
  const byOrder = new Map(tasks.map((task) => [task.order, task]));
  for (const planned of plan.tasks) {
    const existing = byOrder.get(planned.order);
    if (!existing) continue;
    await db.update(questTasksTable).set({
      description: planned.description,
      targetValue: planned.targetValue,
      currentValue: planned.currentValue ?? 0,
      unit: planned.unit,
      completed: false,
      completedAt: null,
    }).where(eq(questTasksTable.id, existing.id));
  }
}

function buildAldricReport(input: {
  reported: boolean;
  remainingTasks: Array<{ description: string }>;
  context: GuildPlayerContext;
  commissionCategory: string;
  rewards?: { xp: number; gold: number; statPoints?: number };
}) {
  const memoryReferences = [
    input.context.recentPrCount > 0 ? `${input.context.recentPrCount} recent PR${input.context.recentPrCount === 1 ? "" : "s"}` : null,
    input.context.dominantStyle ? `${input.context.dominantStyle} style history` : null,
    input.context.lastRecommendation ? "previous counsel on record" : null,
  ].filter(Boolean) as string[];
  const injuryFlag = !!input.context.injuryNotes && /pain|injur|ache|shoulder|back|knee|hip|impingement|strain/i.test(input.context.injuryNotes);
  if (!input.reported) {
    const next = input.remainingTasks[0]?.description ?? "finish the next safe duty";
    return {
      tone: injuryFlag ? "protective" : "firm",
      counsel: injuryFlag
        ? `You reported honestly. Good. Do not chase punishment work through pain. Finish only what can be done safely: ${next}.`
        : `You have reported honestly, but the commission remains open. Start with this: ${next}. Then return without ceremony.`,
      memoryReferences,
      practicalRecommendation: injuryFlag
        ? "Choose recovery, mobility, walking, or a reduced session and stop if pain escalates."
        : "Complete the smallest remaining duty first, then log it before the day gets away from you.",
      warning: injuryFlag ? "This is not medical advice. Persistent or sharp pain belongs with a qualified professional." : null,
      rewardSummary: "No reward is claimed until the commission is complete.",
      nextStep: next,
    };
  }
  const rewardSummary = input.rewards
    ? `${input.rewards.xp} XP, ${input.rewards.gold} gold${input.rewards.statPoints ? `, ${input.rewards.statPoints} stat point${input.rewards.statPoints === 1 ? "" : "s"}` : ""}`
    : "Rewards recorded.";
  const trend = input.context.recentWorkoutCount >= 3
    ? "You are stacking days into a real pattern now."
    : "The work is recorded; now make the next return easier.";
  return {
    tone: "grizzled_kind",
    counsel: `Good. The work is recorded, and the reward is earned. ${trend}`,
    memoryReferences,
    practicalRecommendation: input.context.proteinToday < input.context.proteinTarget
      ? "Before sleep, close the nutrition gap if it can be done sensibly."
      : "Recover with the same discipline you brought to the task.",
    warning: injuryFlag ? "Keep training around pain, not through it. Escalating symptoms need a qualified professional." : null,
    rewardSummary,
    nextStep: input.commissionCategory === "conditioning" ? "Take an easy walk tomorrow if your legs are heavy." : "Return tomorrow for a fresh commission.",
  };
}

async function syncCommissionProgress(playerId: number, questId: number) {
  const today = getTodayStr();
  const [sessions, nutrition, targets, tasks, wearable, biometrics] = await Promise.all([
    db.select().from(workoutSessionsTable).where(and(
      eq(workoutSessionsTable.playerId, playerId),
      eq(workoutSessionsTable.status, "completed"),
      gte(workoutSessionsTable.completedAt, startOfToday()),
    )),
    db.select().from(nutritionLogsTable).where(and(
      eq(nutritionLogsTable.playerId, playerId),
      eq(nutritionLogsTable.date, today),
    )),
    db.select().from(nutritionTargetsTable).where(eq(nutritionTargetsTable.playerId, playerId)).limit(1),
    db.select().from(questTasksTable).where(eq(questTasksTable.questId, questId)),
    db.select().from(wearableEntriesTable).where(and(
      eq(wearableEntriesTable.playerId, playerId),
      eq(wearableEntriesTable.date, today),
    )).limit(1),
    db.select().from(playerBiometricsTable).where(eq(playerBiometricsTable.playerId, playerId)).limit(1),
  ]);

  const protein = nutrition.reduce((total, entry) => total + entry.protein, 0);
  const proteinTarget = targets[0]?.protein ?? 0;
  const progress = tasks.map((task) => {
    const description = task.description.toLowerCase();
    if (description.includes("workout") || description.includes("recovery session")) {
      return { task, value: sessions.length, target: 1, unit: "session", completed: sessions.length >= 1 };
    }
    if (description.includes("training") || description.includes("striking") || description.includes("grappling") || description.includes("skill practice") || description.includes("scouting session")) {
      return { task, value: sessions.length, target: 1, unit: "session", completed: sessions.length >= 1 };
    }
    if (description.includes("protein")) {
      return { task, value: Math.round(protein), target: proteinTarget || task.targetValue || 1, unit: "g", completed: proteinTarget > 0 && protein >= proteinTarget };
    }
    if (description.includes("3 meals")) {
      return { task, value: nutrition.length, target: 3, unit: "meals", completed: nutrition.length >= 3 };
    }
    if (description.includes("steps")) {
      const steps = wearable[0]?.steps ?? 0;
      const target = task.targetValue ?? 1;
      return { task, value: steps, target, unit: "steps", completed: steps >= target };
    }
    if (description.includes("active minutes")) {
      const activeMinutes = wearable[0]?.activeMinutes ?? 0;
      const target = task.targetValue ?? 1;
      return { task, value: activeMinutes, target, unit: "minutes", completed: activeMinutes >= target };
    }
    if (description.includes("sleep") || description.includes("recovery notes")) {
      const done = !!wearable[0]?.sleepHours || !!biometrics[0]?.notes;
      return { task, value: done ? 1 : 0, target: 1, unit: "check-in", completed: done };
    }
    return { task, value: task.currentValue ?? 0, target: task.targetValue, unit: task.unit, completed: task.completed };
  });

  for (const item of progress) {
    await db.update(questTasksTable).set({
      currentValue: item.value,
      targetValue: item.target ?? item.task.targetValue,
      unit: item.unit ?? item.task.unit,
      completed: item.completed,
      completedAt: item.completed ? item.task.completedAt ?? new Date() : null,
    }).where(eq(questTasksTable.id, item.task.id));
  }
  const allDone = progress.length > 0 && progress.every((item) => item.completed);
  if (allDone) {
    await db.update(questsTable).set({ status: "completed", completedAt: new Date() })
      .where(and(eq(questsTable.id, questId), eq(questsTable.status, "active")));
  }
  return { incomplete: progress.filter((item) => !item.completed).length };
}

async function settleExpiredDuties(playerId: number) {
  const now = new Date();
  const expiredDaily = await db.select().from(questsTable).where(and(
    eq(questsTable.playerId, playerId),
    eq(questsTable.type, "daily"),
    eq(questsTable.status, "active"),
    lt(questsTable.expiresAt, now),
  ));
  for (const quest of expiredDaily) {
    await db.update(questsTable).set({ status: "failed" }).where(eq(questsTable.id, quest.id));
    await db.insert(storyConsequencesTable).values({
      playerId,
      questId: quest.id,
      sourceKey: `daily:${quest.id}`,
      tier: "minor",
      outcome: "A commission was left unfinished. Aldric recorded the lapse and expects a direct return to duty.",
      canRestore: false,
    }).onConflictDoNothing();
    await db.insert(guildMasterMemoriesTable).values({
      playerId,
      kind: "failure",
      sourceKey: `daily:${quest.id}`,
      summary: `Did not complete the daily commission on ${quest.createdAt.toISOString().slice(0, 10)}.`,
      importance: 1,
    }).onConflictDoNothing();
  }

  const expiredRaids = await db.select().from(bossRaidsTable).where(and(
    eq(bossRaidsTable.playerId, playerId),
    eq(bossRaidsTable.status, "active"),
    lt(bossRaidsTable.expiresAt, now),
  ));
  for (const raid of expiredRaids) {
    const critical = RANK_ORDER.indexOf(raid.difficulty) >= RANK_ORDER.indexOf("B");
    const locationLost = /village|siege|city|valley|forest/i.test(`${raid.title} ${raid.description}`);
    const sourceKey = `raid:${raid.id}`;
    await db.update(bossRaidsTable).set({ status: "failed" }).where(eq(bossRaidsTable.id, raid.id));
    const inserted = await db.insert(worldEventsTable).values({
      playerId,
      worldKey: sourceKey,
      title: critical ? `The cost of ${raid.title}` : `A failed expedition: ${raid.title}`,
      description: locationLost
        ? "The threatened location was lost. The map will remember this outcome."
        : "Lives were lost during the failed expedition. An extraordinary restoration campaign may yet answer for them.",
      status: "lost",
      severity: critical ? "critical" : "major",
      reversible: !locationLost,
      metadata: { raidId: raid.id, locationLost },
    }).onConflictDoNothing().returning();
    const worldEvent = inserted[0] ?? (await db.select().from(worldEventsTable)
      .where(and(eq(worldEventsTable.playerId, playerId), eq(worldEventsTable.worldKey, sourceKey))).limit(1))[0];
    await db.insert(storyConsequencesTable).values({
      playerId,
      worldEventId: worldEvent?.id,
      sourceKey,
      tier: critical ? "critical" : "major",
      outcome: worldEvent?.description ?? "The Guild recorded a serious expedition failure.",
      canRestore: !locationLost,
    }).onConflictDoNothing();
  }
}

async function getGuildHallSnapshot(userId: string) {
  const { player, stats } = await getOrCreatePlayer(userId);
  await settleExpiredDuties(player.id);
  const quest = await ensureDailyQuest(player.id);
  const today = getTodayStr();
  const [playerContext, existingCommission, memories, consequences, worldEvents, gear, offerings, raids, locations] = await Promise.all([
    getGuildPlayerContext(player.id),
    db.select().from(dailyCommissionsTable).where(and(eq(dailyCommissionsTable.playerId, player.id), eq(dailyCommissionsTable.date, today))).limit(1),
    db.select().from(guildMasterMemoriesTable).where(eq(guildMasterMemoriesTable.playerId, player.id))
      .orderBy(desc(guildMasterMemoriesTable.importance), desc(guildMasterMemoriesTable.occurredAt)).limit(5),
    db.select().from(storyConsequencesTable).where(eq(storyConsequencesTable.playerId, player.id))
      .orderBy(desc(storyConsequencesTable.occurredAt)).limit(5),
    db.select().from(worldEventsTable).where(eq(worldEventsTable.playerId, player.id))
      .orderBy(desc(worldEventsTable.occurredAt)).limit(5),
    db.select().from(rpgGearTable).where(and(eq(rpgGearTable.playerId, player.id), eq(rpgGearTable.equipped, true))),
    db.select().from(storeItemsTable).where(eq(storeItemsTable.available, true)).limit(3),
    db.select({ status: bossRaidsTable.status, difficulty: bossRaidsTable.difficulty }).from(bossRaidsTable).where(eq(bossRaidsTable.playerId, player.id)),
    getAethoriaLocations(),
  ]);

  const plan = attachCommissionLocation(buildDailyCommissionPlan(playerContext), player.id + today.length + playerContext.recentWorkoutCount, locations);
  let commission = existingCommission[0];
  if (!commission) {
    await applyCommissionPlan(quest.id, plan);
    [commission] = await db.insert(dailyCommissionsTable).values({
      playerId: player.id,
      questId: quest.id,
      date: today,
      category: plan.category,
      rationale: plan.rationale,
      readiness: plan.readiness,
      counsel: plan.counsel,
      context: plan.context,
    }).onConflictDoNothing().returning();
  } else if (
    !commission.category ||
    !commission.rationale ||
    !(commission.context as any)?.location ||
    !(commission.context as any)?.travel ||
    (commission.context as any)?.travel?.continentSquareMiles !== 2_000_000
  ) {
    const existingTravel = (commission.context as any)?.travel;
    const nextContext = {
      ...(commission.context ?? {}),
      location: existingTravel?.continentSquareMiles === 2_000_000 ? (commission.context as any)?.location : (plan.context as any).location,
      travel: existingTravel?.continentSquareMiles === 2_000_000 ? existingTravel : (plan.context as any).travel,
    };
    [commission] = await db.update(dailyCommissionsTable).set({
      category: commission.category || plan.category,
      rationale: commission.rationale || plan.rationale,
      context: nextContext,
    })
      .where(eq(dailyCommissionsTable.id, commission.id)).returning();
  }

  const progress = await syncCommissionProgress(player.id, quest.id);
  const counsel = buildCounsel({
    sleepHours: playerContext.sleepHours,
    equipment: playerContext.equipment,
    incomplete: progress.incomplete,
    plan: commission ? {
      category: commission.category,
      readiness: commission.readiness,
      rationale: commission.rationale,
      counsel: commission.counsel,
      tasks: [],
      context: commission.context,
    } : plan,
  });
  if (commission && commission.counsel !== counsel) {
    [commission] = await db.update(dailyCommissionsTable).set({ counsel })
      .where(eq(dailyCommissionsTable.id, commission.id)).returning();
  }

  const [freshQuest] = await db.select().from(questsTable).where(eq(questsTable.id, quest.id)).limit(1);
  return {
    date: today,
    player: { ...player, stats },
    worldDanger: buildWorldDanger(raids),
    commission: {
      id: commission?.id ?? 0,
      category: commission?.category ?? plan.category,
      rationale: commission?.rationale ?? plan.rationale,
      readiness: commission?.readiness ?? "ready",
      reportedAt: commission?.reportedAt?.toISOString() ?? null,
      location: ((commission?.context ?? plan.context) as any).location ?? null,
      travel: ((commission?.context ?? plan.context) as any).travel ?? null,
      quest: await buildQuestResponse(freshQuest),
    },
    counsel: {
      name: "Grandmaster Aldric",
      message: counsel,
      memories,
      trendSummary: {
        recentWorkouts: playerContext.recentWorkoutCount,
        recentPrs: playerContext.recentPrCount,
        dominantStyle: playerContext.dominantStyle,
        neglectedStyle: playerContext.neglectedStyle,
        proteinToday: Math.round(playerContext.proteinToday),
        proteinTarget: playerContext.proteinTarget,
        mealsToday: playerContext.mealsToday,
      },
      guardrails: {
        injuryNotesPresent: !!playerContext.injuryNotes,
        recoveryFirst: plan.readiness === "recovery" || plan.readiness === "limited",
      },
    },
    campaign: { chapter: 1, title: "The Awakening" },
    equippedGear: gear.map((item) => ({
      id: item.id,
      name: item.name,
      elementalAffinity: item.elementalAffinity,
      narrativeModifiers: item.narrativeModifiers,
      xpBonusPercent: Math.min(10, Math.max(0, item.xpBonusPercent)),
    })),
    hallOfferings: {
      title: "The Hall's Offerings",
      lore: "The Hall remembers what Aldric once bound, spared, and brought home. Its shelves reveal tools when an adventurer has earned the right to use them.",
      preview: offerings.map((item) => ({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
        category: item.category,
        goldCost: item.goldCost,
        loreText: item.description,
      })),
    },
    readiness: {
      sleepHours: playerContext.sleepHours,
      steps: playerContext.steps,
      activeMinutes: playerContext.activeMinutes,
      injuryNotesPresent: !!playerContext.injuryNotes,
    },
    consequences,
    worldEvents,
  };
}

router.get("/guild-hall/today", async (req, res) => {
  try {
    res.json(await getGuildHallSnapshot(req.userId));
  } catch (error) {
    req.log.error(error, "guild hall snapshot error");
    res.status(500).json({ error: "Failed to prepare the Guild Hall" });
  }
});

router.post("/guild-hall/report", async (req, res) => {
  try {
    const snapshot = await getGuildHallSnapshot(req.userId);
    const { player } = await getOrCreatePlayer(req.userId);
    const playerContext = await getGuildPlayerContext(player.id);
    const quest = snapshot.commission.quest;
    if (quest.status === "claimed") {
      const aldric = buildAldricReport({
        reported: true,
        remainingTasks: [],
        context: playerContext,
        commissionCategory: snapshot.commission.category,
        rewards: { xp: quest.xpReward, gold: quest.goldReward },
      });
      res.json({ reported: true, alreadyReported: true, rewards: { xp: quest.xpReward, gold: quest.goldReward }, counsel: aldric.counsel, aldric, snapshot });
      return;
    }
    const remainingTasks = quest.tasks.filter((task: { completed: boolean }) => !task.completed);
    if (remainingTasks.length > 0) {
      const aldric = buildAldricReport({
        reported: false,
        remainingTasks,
        context: playerContext,
        commissionCategory: snapshot.commission.category,
      });
      await db.insert(guildMasterMemoriesTable).values({
        playerId: player.id,
        kind: "report",
        sourceKey: `incomplete-report:${quest.id}:${getTodayStr()}`,
        summary: `Reported an incomplete ${snapshot.commission.category} commission; next duty was "${aldric.nextStep}".`,
        importance: 1,
      }).onConflictDoNothing();
      res.json({
        reported: false,
        alreadyReported: false,
        remainingTasks: remainingTasks.map((task: { id: number; description: string }) => ({ id: task.id, description: task.description })),
        counsel: aldric.counsel,
        aldric,
        snapshot,
      });
      return;
    }

    const [claimed] = await db.update(questsTable).set({ status: "claimed", claimedAt: new Date() })
      .where(and(eq(questsTable.id, quest.id), eq(questsTable.status, "completed"))).returning();
    if (claimed) {
      await db.update(playerTable).set({
        gold: player.gold + quest.goldReward,
        freeStatPoints: player.freeStatPoints + quest.bonusStatPoints,
        totalQuests: player.totalQuests + 1,
        updatedAt: new Date(),
      }).where(eq(playerTable.id, player.id));
      await applyXpEvent(player.id, quest.xpReward, "Guild Commission Report", "quest", getTodayStr());
      await db.update(dailyCommissionsTable).set({ reportedAt: new Date() })
        .where(eq(dailyCommissionsTable.id, snapshot.commission.id));
      await db.insert(guildMasterMemoriesTable).values({
        playerId: player.id,
        kind: "accomplishment",
        sourceKey: `commission:${quest.id}`,
        summary: `Completed and reported a ${snapshot.commission.category} commission on ${getTodayStr()}.`,
        importance: 2,
      }).onConflictDoNothing();
      if (playerContext.recentPrCount > 0) {
        await db.insert(guildMasterMemoriesTable).values({
          playerId: player.id,
          kind: "milestone",
          sourceKey: `prs:${getTodayStr()}`,
          summary: `Recent record shows ${playerContext.recentPrCount} personal record${playerContext.recentPrCount === 1 ? "" : "s"} in the last month.`,
          importance: 3,
        }).onConflictDoNothing();
      }
    }

    const aldric = buildAldricReport({
      reported: true,
      remainingTasks: [],
      context: playerContext,
      commissionCategory: snapshot.commission.category,
      rewards: { xp: quest.xpReward, gold: quest.goldReward, statPoints: quest.bonusStatPoints },
    });
    res.json({
      reported: true,
      alreadyReported: !claimed,
      rewards: { xp: quest.xpReward, gold: quest.goldReward, statPoints: quest.bonusStatPoints },
      counsel: aldric.counsel,
      aldric,
      snapshot: await getGuildHallSnapshot(req.userId),
    });
  } catch (error) {
    req.log.error(error, "guild hall report error");
    res.status(500).json({ error: "The Guild could not record this report" });
  }
});

router.post("/guild-hall/consequences/:id/restoration", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const [consequence] = await db.select().from(storyConsequencesTable).where(and(
      eq(storyConsequencesTable.id, Number(req.params.id)),
      eq(storyConsequencesTable.playerId, player.id),
    ));
    if (!consequence) return void res.status(404).json({ error: "Consequence not found" });
    if (!consequence.canRestore) return void res.status(409).json({ error: "This loss cannot be reversed" });
    if (consequence.restorationQuestId) {
      const [existing] = await db.select().from(questsTable).where(eq(questsTable.id, consequence.restorationQuestId));
      res.json(await buildQuestResponse(existing));
      return;
    }
    const [quest] = await db.insert(questsTable).values({
      playerId: player.id,
      title: "A Labor Beyond the Gate",
      description: "A restoration campaign of exceptional effort. The Guild offers no promise, only a path.",
      type: "main",
      status: "active",
      difficulty: "S",
      xpReward: 2500,
      goldReward: 0,
      bonusStatPoints: 5,
    }).returning();
    await db.insert(questTasksTable).values([
      { questId: quest.id, description: "Complete 5 purposeful training sessions", targetValue: 5, currentValue: 0, unit: "sessions", order: 1 },
      { questId: quest.id, description: "Meet recovery targets for 7 days", targetValue: 7, currentValue: 0, unit: "days", order: 2 },
      { questId: quest.id, description: "Complete the final restoration trial", targetValue: 1, currentValue: 0, unit: "trial", order: 3 },
    ]);
    await db.update(storyConsequencesTable).set({ restorationQuestId: quest.id })
      .where(eq(storyConsequencesTable.id, consequence.id));
    res.status(201).json(await buildQuestResponse(quest));
  } catch (error) {
    req.log.error(error, "restoration quest error");
    res.status(500).json({ error: "Failed to begin the restoration campaign" });
  }
});

export default router;
