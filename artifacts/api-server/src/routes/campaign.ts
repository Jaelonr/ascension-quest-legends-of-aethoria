import { Router } from "express";
import { db } from "@workspace/db";
import { questsTable, questTasksTable, playerTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getOrCreatePlayer, applyXpEvent } from "../progression";
import { CAMPAIGN_QUESTS } from "../data/campaign-quests";

const router = Router();

type AbandonSeverity = "slight" | "moderate" | "severe";

function computeAbandonSeverity(missionStartedAt: Date): AbandonSeverity {
  const minutesSinceStart = (Date.now() - missionStartedAt.getTime()) / 60000;
  if (minutesSinceStart < 20) return "slight";
  if (minutesSinceStart < 90) return "moderate";
  return "severe";
}

const ABANDON_NARRATIVES: Record<AbandonSeverity, string[]> = {
  slight: [
    "You turned back before the first trial was met. The commission remains open, your hesitation recorded quietly in the Guild register. Aldric has said nothing — yet.",
    "The path was abandoned at the threshold. No blood, no sweat, no forward motion. The Guild marks it: a commission accepted and then refused. Return when you are ready to act.",
    "The seal was not earned today. You were given the commission — you set it down before lifting it. Aethoria does not forgive delay, but it does allow another chance.",
  ],
  moderate: [
    "You entered the field and retreated when the work grew heavy. The commission remains open. Aldric's message arrives late in the evening: 'Orderly retreat is not shame. Staying home is.' Return tomorrow.",
    "The mission was active when you stopped. Not at the end — somewhere in the middle, when finishing still seemed possible. The Guild notes your effort but marks the commission incomplete. The bounty is forfeit.",
    "A warrior who survives to fight again has not truly lost — but the commission remains unclaimed. Your retreat was recorded. The Guild respects survival. It does not reward it.",
  ],
  severe: [
    "So close. The commission was within reach — and the ground gave out. Aldric reads the report without expression. 'You were there,' he says. 'That counts for something. The reward does not.' Return and finish it.",
    "The hardest failure is the one that happens near the end. You had the commission in your grasp and could not hold it. The Guild records your effort and files the bounty unclaimed. One more attempt remains.",
    "The final stretch broke you. Not the beginning — the end. That is the most honest failure Aethoria produces. Aldric leaves a note on the board: 'Prove it wasn't the last time you tried.'",
  ],
};

function pickNarrative(severity: AbandonSeverity): string {
  const pool = ABANDON_NARRATIVES[severity];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

router.get("/campaign/story", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId!);

    const dbMainQuests = await db
      .select()
      .from(questsTable)
      .where(and(eq(questsTable.playerId, player.id), eq(questsTable.type, "main")));

    const byTitle = new Map(dbMainQuests.map((q) => [q.title, q]));

    const chapterMap = new Map<number, { chapter: number; chapterName: string; quests: any[] }>();

    for (const def of CAMPAIGN_QUESTS) {
      if (!chapterMap.has(def.chapter)) {
        chapterMap.set(def.chapter, { chapter: def.chapter, chapterName: def.chapterName, quests: [] });
      }
      const dbQuest = byTitle.get(def.title);
      const status: string = dbQuest?.status ?? "locked";
      const revealed = status !== "locked";

      chapterMap.get(def.chapter)!.quests.push({
        campaignId: def.campaignId,
        dbId: dbQuest?.id ?? null,
        title: revealed ? def.title : "???",
        description: revealed ? def.description : "This commission has not yet been revealed. Complete earlier duties to unlock it.",
        lore: status === "claimed" ? def.lore : null,
        difficulty: revealed ? def.difficulty : null,
        fitnessMapping: revealed ? def.fitnessMapping : null,
        xpReward: def.xpReward,
        goldReward: def.goldReward,
        status,
        missionStartedAt: dbQuest?.missionStartedAt?.toISOString() ?? null,
        abandonedNarrative: dbQuest?.abandonedNarrative ?? null,
      });
    }

    const chapters = Array.from(chapterMap.values()).map((ch) => {
      const statuses = ch.quests.map((q: any) => q.status);
      let chapterStatus: "completed" | "active" | "locked";
      if (statuses.every((s: string) => s === "claimed")) chapterStatus = "completed";
      else if (statuses.some((s: string) => s !== "locked")) chapterStatus = "active";
      else chapterStatus = "locked";
      return { ...ch, status: chapterStatus };
    });

    const allQuests = chapters.flatMap((ch) => ch.quests);
    const activeChapter = chapters.find((ch) => ch.status === "active");
    const currentChapter = activeChapter?.chapter ?? 1;
    const activeQuest = allQuests.find((q: any) => q.status === "active" || q.status === "completed");
    const activeMissionQuest = allQuests.find((q: any) => q.missionStartedAt !== null);

    res.json({
      currentChapter,
      currentQuestTitle: activeQuest?.title ?? null,
      totalChapters: chapters.length,
      chapters,
      activeMission: activeMissionQuest
        ? { dbId: activeMissionQuest.dbId, title: activeMissionQuest.title, missionStartedAt: activeMissionQuest.missionStartedAt }
        : null,
    });
  } catch (err) {
    req.log.error(err, "campaign story error");
    res.status(500).json({ error: "Failed to load campaign story" });
  }
});

router.post("/campaign/missions/start", async (req, res) => {
  try {
    const { dbId } = req.body as { dbId: number };
    if (!dbId) return void res.status(400).json({ error: "dbId is required" });

    const { player } = await getOrCreatePlayer(req.userId!);

    const [quest] = await db.select().from(questsTable)
      .where(and(eq(questsTable.id, dbId), eq(questsTable.playerId, player.id)));

    if (!quest) return void res.status(404).json({ error: "Quest not found" });
    if (quest.status !== "active") return void res.status(400).json({ error: "Quest is not available for a mission" });

    const [updated] = await db.update(questsTable)
      .set({ missionStartedAt: new Date(), abandonedNarrative: null })
      .where(eq(questsTable.id, dbId))
      .returning();

    res.json({
      success: true,
      questId: updated.id,
      title: updated.title,
      missionStartedAt: updated.missionStartedAt!.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "mission start error");
    res.status(500).json({ error: "Failed to start mission" });
  }
});

router.post("/campaign/missions/abandon", async (req, res) => {
  try {
    const { dbId } = req.body as { dbId: number };
    if (!dbId) return void res.status(400).json({ error: "dbId is required" });

    const { player } = await getOrCreatePlayer(req.userId!);

    const [quest] = await db.select().from(questsTable)
      .where(and(eq(questsTable.id, dbId), eq(questsTable.playerId, player.id)));

    if (!quest) return void res.status(404).json({ error: "Quest not found" });
    if (!quest.missionStartedAt) return void res.status(400).json({ error: "No active mission on this quest" });

    const severity = computeAbandonSeverity(quest.missionStartedAt);
    const narrative = pickNarrative(severity);

    await db.update(questsTable)
      .set({ missionStartedAt: null, abandonedNarrative: narrative })
      .where(eq(questsTable.id, dbId));

    res.json({ severity, narrative, questTitle: quest.title });
  } catch (err) {
    req.log.error(err, "mission abandon error");
    res.status(500).json({ error: "Failed to abandon mission" });
  }
});

export async function autoClaimActiveMission(
  playerId: number,
  today: string,
): Promise<{ title: string; xpReward: number; goldReward: number } | null> {
  const rows = await db.select().from(questsTable)
    .where(and(
      eq(questsTable.playerId, playerId),
      eq(questsTable.status, "active"),
      eq(questsTable.type, "main"),
    ))
    .limit(10);

  const mission = rows.find((q) => q.missionStartedAt !== null);
  if (!mission) return null;

  await db.update(questTasksTable)
    .set({ completed: true, completedAt: new Date() })
    .where(eq(questTasksTable.questId, mission.id));

  await db.update(questsTable)
    .set({ status: "claimed", completedAt: new Date(), claimedAt: new Date(), missionStartedAt: null })
    .where(eq(questsTable.id, mission.id));

  await db.update(playerTable)
    .set({ gold: sql`${playerTable.gold} + ${mission.goldReward}` })
    .where(eq(playerTable.id, playerId));

  await applyXpEvent(playerId, mission.xpReward, `Mission Complete: ${mission.title}`, "campaign", today);

  return { title: mission.title, xpReward: mission.xpReward, goldReward: mission.goldReward };
}

export default router;
