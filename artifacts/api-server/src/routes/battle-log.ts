import { Router } from "express";
import { db } from "@workspace/db";
import { combatReplaysTable, playerStyleIdentityTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";
import { buildCombatReplayPayoff } from "../combat-engine";

const router = Router();

router.get("/battle-log", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const replays = await db
      .select()
      .from(combatReplaysTable)
      .where(eq(combatReplaysTable.playerId, player.id))
      .orderBy(desc(combatReplaysTable.createdAt))
      .limit(limit);

    res.json(replays.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      events: r.events as any[],
      styleScores: r.styleScores as Record<string, number>,
      gearDrop: r.gearDrop as any,
      payoff: buildCombatReplayPayoff({
        ...r,
        gearDrop: r.gearDrop as any,
        events: r.events as any[],
      }),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get battle log" });
  }
});

router.get("/player/style-identity", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);

    const [identity] = await db
      .select()
      .from(playerStyleIdentityTable)
      .where(eq(playerStyleIdentityTable.playerId, player.id));

    if (!identity) {
      res.json({
        strength: 0, striking: 0, conditioning: 0, grappling: 0, recovery: 0, discipline: 0,
        totalSessions: 0, hybridArchetype: null,
        percentages: { strength: 0, striking: 0, conditioning: 0, grappling: 0, recovery: 0, discipline: 0 },
        dominantStyle: null,
      });
      return;
    }

    const total = identity.strengthScore + identity.strikingScore + identity.conditioningScore
      + identity.grapplingScore + identity.recoveryScore + identity.disciplineScore;

    const pct = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0;

    res.json({
      strength: identity.strengthScore,
      striking: identity.strikingScore,
      conditioning: identity.conditioningScore,
      grappling: identity.grapplingScore,
      recovery: identity.recoveryScore,
      discipline: identity.disciplineScore,
      totalSessions: identity.totalSessions,
      hybridArchetype: identity.hybridArchetype,
      percentages: {
        strength: pct(identity.strengthScore),
        striking: pct(identity.strikingScore),
        conditioning: pct(identity.conditioningScore),
        grappling: pct(identity.grapplingScore),
        recovery: pct(identity.recoveryScore),
        discipline: pct(identity.disciplineScore),
      },
      dominantStyle: total > 0
        ? (["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const)
            .reduce((best, k) => identity[`${k}Score` as keyof typeof identity] as number
              > (identity[`${best}Score` as keyof typeof identity] as number) ? k : best, "strength" as string)
        : null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get style identity" });
  }
});

export default router;
