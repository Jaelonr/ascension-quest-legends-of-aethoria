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
  titlesTable,
  worldEventsTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";
import { buildWorldDanger } from "../domain/world-danger";
import { buildCombatReplayPayoff } from "../combat-engine";

const router = Router();
const STYLE_KEYS = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;

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

router.get("/chronicle/summary", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const [replays, reports, discoveries, raids, titles, records, milestones, worldEvents, campaign, styleIdentity] = await Promise.all([
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
      majorMilestones: milestones.map((memory) => ({
        id: memory.id,
        kind: memory.kind,
        summary: memory.summary,
        importance: memory.importance,
        occurredAt: memory.occurredAt.toISOString(),
      })),
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
