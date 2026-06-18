import { Router } from "express";
import { db } from "@workspace/db";
import { skillTreesTable, skillNodesTable, playerSkillNodesTable, playerTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getOrCreatePlayer, applyXpEvent } from "../progression";

const router = Router();

router.get("/skills/trees", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const trees = await db.select().from(skillTreesTable).orderBy(skillTreesTable.id);
    const nodes = await db.select().from(skillNodesTable).orderBy(skillNodesTable.tier);
    const unlockedNodes = await db.select().from(playerSkillNodesTable)
      .where(eq(playerSkillNodesTable.playerId, player.id));
    const unlockedIds = new Set(unlockedNodes.map(n => n.nodeId));

    res.json(trees.map(tree => ({
      id: tree.id,
      name: tree.name,
      description: tree.description,
      category: tree.category,
      nodes: nodes
        .filter(n => n.treeId === tree.id)
        .map(n => {
          const entry = unlockedNodes.find(u => u.nodeId === n.id);
          return {
            id: n.id,
            treeId: n.treeId,
            name: n.name,
            description: n.description,
            tier: n.tier,
            unlocked: unlockedIds.has(n.id),
            unlockedAt: entry?.unlockedAt?.toISOString() || null,
            xpCost: n.xpCost,
            statRequirements: n.statRequirements,
            prerequisiteNodeIds: (n.prerequisiteNodeIds as number[]) || [],
            effect: n.effect,
            equipmentRequired: n.equipmentRequired,
          };
        }),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get skill trees" });
  }
});

router.post("/skills/nodes/:id/unlock", async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const { player, stats } = await getOrCreatePlayer(req.userId);

    const [node] = await db.select().from(skillNodesTable).where(eq(skillNodesTable.id, nodeId));
    if (!node) return void res.status(404).json({ error: "Skill node not found" });

    // Already unlocked?
    const existing = await db.select().from(playerSkillNodesTable)
      .where(and(eq(playerSkillNodesTable.playerId, player.id), eq(playerSkillNodesTable.nodeId, nodeId)));
    if (existing.length > 0) return void res.status(400).json({ error: "Node already unlocked" });

    // XP cost check (uses total XP earned as "mastery points" — never deducted from current XP)
    if (node.xpCost > 0 && (player.totalXpEarned || 0) < node.xpCost) {
      return void res.status(400).json({
        error: `Requires ${node.xpCost} total XP earned. You have ${player.totalXpEarned || 0}.`,
      });
    }

    // Stat requirements
    const reqs = node.statRequirements as Record<string, number> | null;
    if (reqs && stats) {
      const statMap: Record<string, number> = {
        strength: stats.strength,
        agility: stats.agility,
        stamina: stats.stamina,
        vitality: stats.vitality,
        discipline: stats.discipline,
        sense: stats.sense,
      };
      for (const [stat, required] of Object.entries(reqs)) {
        if ((required as number) > 0 && (statMap[stat] || 0) < (required as number)) {
          return void res.status(400).json({
            error: `Requires ${stat} ${required}. Your ${stat}: ${statMap[stat] || 0}.`,
          });
        }
      }
    }

    // Prerequisite nodes
    const prereqs = (node.prerequisiteNodeIds as number[]) || [];
    if (prereqs.length > 0) {
      const unlocked = await db.select().from(playerSkillNodesTable)
        .where(eq(playerSkillNodesTable.playerId, player.id));
      const unlockedSet = new Set(unlocked.map(u => u.nodeId));
      const missing = prereqs.filter(id => !unlockedSet.has(id));
      if (missing.length > 0) {
        return void res.status(400).json({ error: "Prerequisites not met. Unlock earlier nodes first." });
      }
    }

    await db.insert(playerSkillNodesTable).values({ playerId: player.id, nodeId });

    // Grant small XP reward for unlocking
    const xpGrant = Math.max(50, Math.floor(node.xpCost * 0.05));
    await applyXpEvent(
      player.id, xpGrant,
      `Skill Unlocked: ${node.name}`, "skill",
      new Date().toISOString().split("T")[0]
    );

    const { player: freshPlayer, stats: freshStats } = await getOrCreatePlayer(req.userId);

    res.json({
      node: {
        id: node.id,
        treeId: node.treeId,
        name: node.name,
        description: node.description,
        tier: node.tier,
        unlocked: true,
        unlockedAt: new Date().toISOString(),
        xpCost: node.xpCost,
        effect: node.effect,
        prerequisiteNodeIds: prereqs,
        statRequirements: reqs,
        equipmentRequired: node.equipmentRequired,
      },
      xpGranted: xpGrant,
      player: { level: freshPlayer.level, rank: freshPlayer.rank, xp: freshPlayer.xp },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to unlock skill node" });
  }
});

export default router;
