import { Router } from "express";
import { db } from "@workspace/db";
import { rpgGearTable } from "@workspace/db";
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

export default router;
