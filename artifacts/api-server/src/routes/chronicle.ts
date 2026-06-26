import { Router } from "express";
import {
  bossRaidsTable,
  combatReplaysTable,
  db,
  guildMasterMemoriesTable,
  guildReportsTable,
  itemDiscoveriesTable,
  personalRecordsTable,
  playerStyleIdentityTable,
  playerTitlesTable,
  questsTable,
  regionProgressTable,
  titlesTable,
  worldEventsTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";
import { buildWorldDanger } from "../domain/world-danger";
import { buildCombatReplayPayoff } from "../combat-engine";

const router = Router();
const STYLE_KEYS = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;
const STYLE_LABELS: Record<string, string> = {
  strength: "Iron Vanguard",
  striking: "Storm Duelist",
  conditioning: "Wayfarer",
  grappling: "Chainwarden",
  recovery: "Verdant Guardian",
  discipline: "Runesage",
};

function serializeStyleIdentity(identity?: typeof playerStyleIdentityTable.$inferSelect | null) {
  if (!identity) return null;
  const scores = {
    strength: identity.strengthScore,
    striking: identity.strikingScore,
    conditioning: identity.conditioningScore,
    grappling: identity.grapplingScore,
    recovery: identity.recoveryScore,
    discipline: identity.disciplineScore,
  };
  const total = STYLE_KEYS.reduce((sum, key) => sum + scores[key], 0);
  const ranked = STYLE_KEYS.map((key) => ({ key, score: scores[key] })).sort((a, b) => b.score - a.score);
  const percentages = Object.fromEntries(STYLE_KEYS.map((key) => [
    key,
    total > 0 ? Math.round((scores[key] / total) * 100) : 0,
  ]));
  return {
    id: identity.id,
    totalSessions: identity.totalSessions,
    dominantStyle: ranked[0]?.score ? ranked[0].key : null,
    secondaryStyle: ranked[1]?.score ? ranked[1].key : null,
    hybridArchetype: identity.hybridArchetype,
    scores,
    percentages,
    updatedAt: identity.updatedAt.toISOString(),
  };
}

type ChronicleMilestone = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  detail?: string | null;
  source: string;
  importance: number;
  occurredAt: string;
};

function dateIso(value?: Date | string | null) {
  if (!value) return new Date(0).toISOString();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function addMilestone(list: ChronicleMilestone[], milestone: ChronicleMilestone | null | undefined) {
  if (!milestone) return;
  list.push(milestone);
}

function startOfWeek(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  return date;
}

function buildWeeklyImpactMilestone(replays: Array<typeof combatReplaysTable.$inferSelect>): ChronicleMilestone | null {
  if (replays.length < 2) return null;

  const latest = replays[0]?.createdAt ?? new Date();
  const weekStart = startOfWeek(latest);
  const recent = replays.filter((replay) => replay.createdAt >= weekStart);
  if (recent.length < 2) return null;

  const styleCounts = new Map<string, number>();
  for (const replay of recent) {
    styleCounts.set(replay.dominantStyle, (styleCounts.get(replay.dominantStyle) ?? 0) + 1);
  }
  const dominantStyle = [...styleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "discipline";
  const dominantLabel = STYLE_LABELS[dominantStyle] ?? dominantStyle;
  const xp = recent.reduce((sum, replay) => sum + (replay.xpEarned ?? 0), 0);
  const gold = recent.reduce((sum, replay) => sum + (replay.goldEarned ?? 0), 0);
  const prs = recent.reduce((sum, replay) => sum + (replay.prCount ?? 0), 0);
  const bosses = recent.filter((replay) => replay.raidImpact).length;
  const victories = recent.filter((replay) => String(replay.verdict).toLowerCase().includes("victory")).length;

  return {
    id: `weekly-impact-${weekStart.toISOString().slice(0, 10)}`,
    kind: "weekly_training_impact",
    title: "Weekly training changed the ledger",
    summary: `${recent.length} recorded battle report${recent.length === 1 ? "" : "s"} this week gave Aethoria ${dominantLabel} pressure, ${xp} XP, and ${gold} gold of proof.`,
    detail: [
      victories ? `${victories} victory mark${victories === 1 ? "" : "s"}` : null,
      prs ? `${prs} personal record${prs === 1 ? "" : "s"}` : null,
      bosses ? `${bosses} boss pressure update${bosses === 1 ? "" : "s"}` : null,
      `Dominant weekly style: ${dominantLabel}`,
    ].filter(Boolean).join(". "),
    source: "Weekly Chronicle",
    importance: recent.length >= 4 || prs > 0 || bosses > 0 ? 5 : 4,
    occurredAt: dateIso(latest),
  };
}

function buildDerivedMilestones(input: {
  memories: Array<typeof guildMasterMemoriesTable.$inferSelect>;
  replays: Array<typeof combatReplaysTable.$inferSelect>;
  discoveries: Array<typeof itemDiscoveriesTable.$inferSelect>;
  raids: Array<typeof bossRaidsTable.$inferSelect>;
  titles: Array<{ id: number; name: string; description: string; rarity: string; equipped: boolean; earnedAt: Date }>;
  records: Array<typeof personalRecordsTable.$inferSelect>;
  worldEvents: Array<typeof worldEventsTable.$inferSelect>;
  styleIdentity?: typeof playerStyleIdentityTable.$inferSelect | null;
}) {
  const milestones: ChronicleMilestone[] = [];
  const identity = serializeStyleIdentity(input.styleIdentity);
  addMilestone(milestones, buildWeeklyImpactMilestone(input.replays));

  if (identity?.dominantStyle) {
    const dominant = STYLE_LABELS[identity.dominantStyle] ?? identity.dominantStyle;
    const secondary = identity.secondaryStyle ? STYLE_LABELS[identity.secondaryStyle] ?? identity.secondaryStyle : null;
    addMilestone(milestones, {
      id: `style-${identity.id}`,
      kind: "style_identity",
      title: `${dominant} identity recorded`,
      summary: secondary
        ? `The Chronicle now reads your combat identity as ${dominant}, with ${secondary} forming beneath it.`
        : `The Chronicle now reads your combat identity as ${dominant}.`,
      detail: identity.hybridArchetype
        ? `Hybrid archetype: ${identity.hybridArchetype}. Built from ${identity.totalSessions} recorded training session${identity.totalSessions === 1 ? "" : "s"}.`
        : `Built from ${identity.totalSessions} recorded training session${identity.totalSessions === 1 ? "" : "s"}.`,
      source: "Training record",
      importance: 4,
      occurredAt: identity.updatedAt,
    });
  }

  for (const replay of input.replays.slice(0, 4)) {
    const gearDrop = replay.gearDrop as { name?: string; rarity?: string; slot?: string } | null;
    addMilestone(milestones, {
      id: `replay-${replay.id}`,
      kind: "combat_replay",
      title: `Battle recorded: ${replay.encounterName}`,
      summary: `${replay.verdict} against ${replay.enemyName}. ${replay.xpEarned} XP and ${replay.goldEarned} gold became part of the Guild ledger.${gearDrop?.name ? ` Recovered: ${gearDrop.name}.` : ""}`,
      detail: replay.raidImpact ?? `Dominant style: ${STYLE_LABELS[replay.dominantStyle] ?? replay.dominantStyle}.`,
      source: "Combat replay",
      importance: replay.prCount > 0 || gearDrop?.name ? 4 : 2,
      occurredAt: dateIso(replay.createdAt),
    });

    if (gearDrop?.name) {
      addMilestone(milestones, {
        id: `replay-gear-${replay.id}`,
        kind: "earned_relic",
        title: `Relic recovered: ${gearDrop.name}`,
        summary: `The Hall recorded ${gearDrop.name} as proof recovered from ${replay.encounterName}, not purchased power.`,
        detail: `${gearDrop.rarity ?? "common"} ${String(gearDrop.slot ?? "relic").replace(/_/g, " ")}. It changes the story around the adventurer while real strength remains earned through training.`,
        source: "Combat spoils",
        importance: ["epic", "legendary", "rare"].includes(String(gearDrop.rarity)) ? 5 : 3,
        occurredAt: dateIso(replay.createdAt),
      });
    }
  }

  const prReplay = input.replays.find((replay) => replay.prCount > 0);
  if (prReplay) {
    addMilestone(milestones, {
      id: `replay-pr-${prReplay.id}`,
      kind: "personal_record",
      title: "Strength record carried into battle",
      summary: `${prReplay.prCount} personal record${prReplay.prCount === 1 ? "" : "s"} changed the shape of ${prReplay.encounterName}.`,
      detail: "The Chronicle treats real physical progress as permanent proof, even when the story turns harsh.",
      source: "Training proof",
      importance: 5,
      occurredAt: dateIso(prReplay.createdAt),
    });
  }

  for (const record of input.records.slice(0, 3)) {
    addMilestone(milestones, {
      id: `record-${record.id}`,
      kind: "personal_record",
      title: `Personal record: ${record.exerciseName}`,
      summary: `${record.weight} ${record.weightUnit} x ${record.reps} entered the Hall's training ledger.`,
      detail: record.estimatedOneRepMax ? `Estimated 1RM: ${Math.round(record.estimatedOneRepMax)} ${record.weightUnit}.` : null,
      source: "Personal record",
      importance: 4,
      occurredAt: dateIso(record.achievedAt),
    });
  }

  for (const raid of input.raids.slice(0, 4)) {
    const status = String(raid.status);
    const title = status === "failed"
      ? `Forced retreat: ${raid.title}`
      : status === "claimed" || status === "completed"
        ? `Boss defeated: ${raid.title}`
        : `Guild Directive opened: ${raid.title}`;
    const summary = status === "failed"
      ? "A stronger threat forced withdrawal. Training progress remains earned, and the rematch now matters."
      : status === "claimed" || status === "completed"
        ? `Aethoria's pressure eased after the Guild recorded this victory.${raid.titleReward ? ` Title prepared: ${raid.titleReward}.` : ""}`
        : "Other adventurers hold the line while your recorded work presses against the threat.";
    addMilestone(milestones, {
      id: `raid-${raid.id}`,
      kind: `raid_${status}`,
      title,
      summary,
      detail: raid.lore ?? raid.description,
      source: "Guild Directive",
      importance: status === "failed" ? 6 : status === "claimed" || status === "completed" ? 6 : 5,
      occurredAt: dateIso(raid.claimedAt ?? raid.completedAt ?? raid.startedAt),
    });
  }

  for (const event of input.worldEvents.slice(0, 5)) {
    addMilestone(milestones, {
      id: `world-${event.id}`,
      kind: `world_${event.severity}`,
      title: event.title,
      summary: event.description,
      detail: event.reversible ? "The Chronicle marks this as changeable through future action." : "The Chronicle marks this as a lasting scar.",
      source: "World state",
      importance: event.severity === "critical" ? 6 : event.severity === "major" ? 5 : 3,
      occurredAt: dateIso(event.occurredAt),
    });
  }

  for (const discovery of input.discoveries.slice(0, 4)) {
    addMilestone(milestones, {
      id: `item-${discovery.id}`,
      kind: "item_discovery",
      title: `Relic discovered: ${discovery.itemName}`,
      summary: discovery.loreText ?? `${discovery.itemName} entered the permanent discovery ledger.`,
      detail: `${discovery.rarity} ${discovery.category}. Current state: ${discovery.currentState}.`,
      source: discovery.sourceLabel ?? "Item discovery",
      importance: ["legendary", "epic"].includes(discovery.rarity) ? 4 : 2,
      occurredAt: dateIso(discovery.discoveredAt),
    });
  }

  for (const title of input.titles.slice(0, 3)) {
    addMilestone(milestones, {
      id: `title-${title.id}`,
      kind: "title_earned",
      title: `Title earned: ${title.name}`,
      summary: title.description,
      detail: `${title.rarity} title${title.equipped ? ", currently displayed" : ""}.`,
      source: "Guild recognition",
      importance: 3,
      occurredAt: dateIso(title.earnedAt),
    });
  }

  for (const memory of input.memories.slice(0, 5)) {
    addMilestone(milestones, {
      id: `memory-${memory.id}`,
      kind: memory.kind,
      title: "Aldric remembered this",
      summary: memory.summary,
      detail: null,
      source: "Grandmaster Aldric",
      importance: memory.importance,
      occurredAt: dateIso(memory.occurredAt),
    });
  }

  const seen = new Set<string>();
  return milestones
    .filter((milestone) => {
      const key = `${milestone.kind}:${milestone.title}:${milestone.summary}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const importanceDelta = b.importance - a.importance;
      if (importanceDelta !== 0) return importanceDelta;
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    })
    .slice(0, 16);
}

router.get("/chronicle/summary", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const [replays, reports, discoveries, raids, titles, records, milestones, worldEvents, campaign, styleIdentity, regionProgress] = await Promise.all([
      db.select().from(combatReplaysTable).where(eq(combatReplaysTable.playerId, player.id)).orderBy(desc(combatReplaysTable.createdAt)).limit(20),
      db.select().from(guildReportsTable).where(eq(guildReportsTable.playerId, player.id)).orderBy(desc(guildReportsTable.generatedAt)).limit(12),
      db.select().from(itemDiscoveriesTable).where(eq(itemDiscoveriesTable.playerId, player.id)).orderBy(desc(itemDiscoveriesTable.discoveredAt)).limit(50),
      db.select().from(bossRaidsTable).where(eq(bossRaidsTable.playerId, player.id)).orderBy(desc(bossRaidsTable.startedAt)).limit(20),
      db.select({
        id: playerTitlesTable.id,
        name: titlesTable.name,
        description: titlesTable.description,
        rarity: titlesTable.rarity,
        equipped: playerTitlesTable.equipped,
        earnedAt: playerTitlesTable.earnedAt,
      }).from(playerTitlesTable)
        .innerJoin(titlesTable, eq(playerTitlesTable.titleId, titlesTable.id))
        .where(eq(playerTitlesTable.playerId, player.id))
        .orderBy(desc(playerTitlesTable.earnedAt)),
      db.select().from(personalRecordsTable).where(eq(personalRecordsTable.playerId, player.id)).orderBy(desc(personalRecordsTable.achievedAt)).limit(20),
      db.select().from(guildMasterMemoriesTable).where(eq(guildMasterMemoriesTable.playerId, player.id))
        .orderBy(desc(guildMasterMemoriesTable.importance), desc(guildMasterMemoriesTable.occurredAt)).limit(20),
      db.select().from(worldEventsTable).where(eq(worldEventsTable.playerId, player.id)).orderBy(desc(worldEventsTable.occurredAt)).limit(20),
      db.select().from(questsTable).where(and(eq(questsTable.playerId, player.id), eq(questsTable.type, "main"))).orderBy(desc(questsTable.createdAt)).limit(10),
      db.select().from(playerStyleIdentityTable).where(eq(playerStyleIdentityTable.playerId, player.id)).limit(1),
      db.select().from(regionProgressTable).where(eq(regionProgressTable.playerId, player.id)).orderBy(desc(regionProgressTable.visited), desc(regionProgressTable.lastVisitedAt)),
    ]);

    res.json({
      worldDanger: buildWorldDanger(raids),
      styleIdentity: serializeStyleIdentity(styleIdentity[0]),
      battleReplays: replays.map((replay) => ({
        ...replay,
        createdAt: replay.createdAt.toISOString(),
        events: replay.events as unknown[],
        styleScores: replay.styleScores as Record<string, number>,
        gearDrop: replay.gearDrop as any,
        payoff: buildCombatReplayPayoff({
          ...replay,
          gearDrop: replay.gearDrop as any,
          events: replay.events as any[],
        }),
      })),
      guildReports: reports.map((report) => ({ ...report, generatedAt: report.generatedAt.toISOString() })),
      campaignProgress: campaign.map((quest) => ({
        id: quest.id,
        title: quest.title,
        description: quest.description,
        status: quest.status,
        difficulty: quest.difficulty,
        createdAt: quest.createdAt.toISOString(),
        completedAt: quest.completedAt?.toISOString() ?? null,
      })),
      discoveredItems: discoveries.map((item) => ({
        ...item,
        discoveredAt: item.discoveredAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      bossesDefeated: raids.filter((raid) => raid.status === "claimed" || raid.status === "completed").map((raid) => ({
        id: raid.id,
        title: raid.title,
        difficulty: raid.difficulty,
        completedAt: raid.completedAt?.toISOString() ?? raid.claimedAt?.toISOString() ?? null,
        titleReward: raid.titleReward,
      })),
      titlesEarned: titles.map((title) => ({ ...title, earnedAt: title.earnedAt.toISOString() })),
      personalRecords: records.map((record) => ({ ...record, achievedAt: record.achievedAt.toISOString() })),
      map: {
        status: "Known Routes",
        title: "Map of Aethoria",
        description: "The Hall's records have begun charting your passage through Aethoria. Regions, Gates, roads, and battle sites will appear here as your Chronicle grows. For now, only the routes most often spoken of in the Guild's ledgers are clear.",
      },
      regionProgress: regionProgress.map((region) => ({
        ...region,
        lastVisitedAt: region.lastVisitedAt?.toISOString() ?? null,
        createdAt: region.createdAt.toISOString(),
        updatedAt: region.updatedAt.toISOString(),
      })),
      majorMilestones: buildDerivedMilestones({
        memories: milestones,
        replays,
        discoveries,
        raids,
        titles,
        records,
        worldEvents,
        styleIdentity: styleIdentity[0],
      }),
      worldEvents: worldEvents.map((event) => ({
        ...event,
        occurredAt: event.occurredAt.toISOString(),
        resolvedAt: event.resolvedAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    req.log.error(err, "chronicle summary error");
    res.status(500).json({ error: "Failed to open the Chronicle" });
  }
});

export default router;
