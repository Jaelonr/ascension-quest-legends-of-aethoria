import { Router } from "express";
import { db } from "@workspace/db";
import { itemDiscoveriesTable, playerTable, rpgGearTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";

const router = Router();

router.get("/armory", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const gear = await db.select().from(rpgGearTable)
      .where(eq(rpgGearTable.playerId, player.id))
      .orderBy(rpgGearTable.acquiredAt);

    res.json(gear.map(g => ({
      ...g,
      acquiredAt: g.acquiredAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get armory" });
  }
});

router.post("/armory/:id/equip", async (req, res) => {
  try {
    const gearId = parseInt(req.params.id);
    const { player } = await getOrCreatePlayer(req.userId);

    const [gear] = await db.select().from(rpgGearTable).where(eq(rpgGearTable.id, gearId));
    if (!gear || gear.playerId !== player.id) {
      return void res.status(404).json({ error: "Gear not found" });
    }

    const newEquipped = !gear.equipped;

    if (newEquipped) {
      await db.update(rpgGearTable).set({ equipped: false })
        .where(and(eq(rpgGearTable.playerId, player.id), eq(rpgGearTable.slot, gear.slot)));
    }

    const [updated] = await db.update(rpgGearTable)
      .set({ equipped: newEquipped })
      .where(eq(rpgGearTable.id, gearId))
      .returning();

    res.json({
      id: updated.id,
      equipped: updated.equipped,
      slot: updated.slot,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update gear" });
  }
});

const RARITY_RELEASE_GOLD: Record<string, number> = {
  common: 20,
  uncommon: 60,
  rare: 140,
  epic: 280,
  legendary: 500,
};

router.post("/armory/:id/release", async (req, res) => {
  try {
    const gearId = parseInt(req.params.id);
    const { player } = await getOrCreatePlayer(req.userId);

    const [gear] = await db.select().from(rpgGearTable)
      .where(and(eq(rpgGearTable.id, gearId), eq(rpgGearTable.playerId, player.id)));
    if (!gear) {
      return void res.status(404).json({ error: "Gear not found" });
    }

    const goldReceived = RARITY_RELEASE_GOLD[gear.rarity] ?? RARITY_RELEASE_GOLD.common;
    const [updatedPlayer] = await db.update(playerTable)
      .set({ gold: player.gold + goldReceived, updatedAt: new Date() })
      .where(eq(playerTable.id, player.id))
      .returning();

    await db.delete(rpgGearTable).where(eq(rpgGearTable.id, gear.id));
    await db.insert(itemDiscoveriesTable).values({
      playerId: player.id,
      itemName: gear.name,
      rarity: gear.rarity,
      category: gear.slot,
      sourceType: "hall_offering",
      sourceLabel: gear.source ?? "The Hall's Offerings",
      loreText: gear.loreText ?? gear.flavorText,
      currentState: "sold",
    }).onConflictDoUpdate({
      target: [itemDiscoveriesTable.playerId, itemDiscoveriesTable.itemName, itemDiscoveriesTable.sourceType],
      set: { currentState: "sold", updatedAt: new Date() },
    });

    res.json({
      success: true,
      message: `Released ${gear.displayName ?? gear.name}. The Chronicle keeps its discovery record.`,
      goldReceived,
      remainingGold: updatedPlayer.gold,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to release gear" });
  }
});

export default router;
