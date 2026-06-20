import { Router } from "express";
import { db } from "@workspace/db";
import { storeItemsTable, playerInventoryTable, playerTable, itemDiscoveriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getOrCreatePlayer, buildPlayerResponse } from "./player";

const router = Router();
const isLaunchStoreItem = (item: typeof storeItemsTable.$inferSelect) =>
  item.type !== "stat_boost" && !(item.type === "xp_boost" && (item.effectValue ?? 0) > 10);

function loreForItem(item: typeof storeItemsTable.$inferSelect) {
  if (item.description.length > 12) return item.description;
  return `The Hall revealed ${item.name} from a shelf that was empty a moment before. Aldric says useful things prefer useful hands.`;
}

router.get("/inventory", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const items = await db.select({
      id: playerInventoryTable.id,
      itemId: playerInventoryTable.itemId,
      quantity: playerInventoryTable.quantity,
      equipped: playerInventoryTable.equipped,
      itemName: storeItemsTable.name,
      itemType: storeItemsTable.type,
      rarity: storeItemsTable.rarity,
      description: storeItemsTable.description,
    })
    .from(playerInventoryTable)
    .innerJoin(storeItemsTable, eq(playerInventoryTable.itemId, storeItemsTable.id))
    .where(eq(playerInventoryTable.playerId, player.id));

    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get inventory" });
  }
});

router.post("/inventory/:id/use", async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.id);
    const { player, stats } = await getOrCreatePlayer(req.userId);

    const [item] = await db.select({
      inv: playerInventoryTable,
      store: storeItemsTable,
    })
    .from(playerInventoryTable)
    .innerJoin(storeItemsTable, eq(playerInventoryTable.itemId, storeItemsTable.id))
    .where(eq(playerInventoryTable.id, inventoryId));

    if (!item) return void res.status(404).json({ error: "Item not found" });
    if (item.inv.quantity <= 0) return void res.status(400).json({ error: "No items remaining" });

    let message = `Used ${item.store.name}`;
    let updatedPlayer = player;

    if (item.store.type === "recovery_token") {
      const [up] = await db.update(playerTable)
        .set({ hp: Math.min(player.maxHp, player.hp + 30), updatedAt: new Date() })
        .where(eq(playerTable.id, player.id))
        .returning();
      updatedPlayer = up;
      message = "Recovery Token used. HP restored by 30.";
    } else if (item.store.type === "streak_shield") {
      message = "Streak Shield activated. Your streak is protected for 1 day.";
    } else if (item.store.type === "deload_pass") {
      const [up] = await db.update(playerTable)
        .set({ mp: player.maxMp, updatedAt: new Date() })
        .where(eq(playerTable.id, player.id))
        .returning();
      updatedPlayer = up;
      message = "Deload Pass used. MP fully restored.";
    } else if (item.store.type === "reward_box") {
      const bonus = Math.floor(Math.random() * 200) + 50;
      const [up] = await db.update(playerTable)
        .set({ gold: player.gold + bonus, updatedAt: new Date() })
        .where(eq(playerTable.id, player.id))
        .returning();
      updatedPlayer = up;
      message = `Reward Box opened! Received ${bonus} Gold.`;
    }

    // Decrement quantity
    if (item.inv.quantity <= 1) {
      await db.delete(playerInventoryTable).where(eq(playerInventoryTable.id, inventoryId));
    } else {
      await db.update(playerInventoryTable)
        .set({ quantity: item.inv.quantity - 1 })
        .where(eq(playerInventoryTable.id, inventoryId));
    }

    res.json({
      success: true,
      message,
      player: buildPlayerResponse(updatedPlayer, stats),
      bonusReward: item.store.type === "reward_box" ? message : null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to use item" });
  }
});

router.get("/store/items", async (req, res) => {
  try {
    const items = await db.select().from(storeItemsTable).where(eq(storeItemsTable.available, true));
    res.json(items.filter(isLaunchStoreItem).map(i => ({ ...i, createdAt: undefined })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get store items" });
  }
});

const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];

router.get("/store/sections", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const allItems = (await db.select().from(storeItemsTable).where(eq(storeItemsTable.available, true)))
      .filter(isLaunchStoreItem);

    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const weekOfYear = Math.floor(dayOfYear / 7);

    const fmt = (item: typeof allItems[0]) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      meetsRequirements:
        (!item.levelRequired || player.level >= item.levelRequired) &&
        (!item.rankRequired || RANK_ORDER.indexOf(player.rank ?? "E") >= RANK_ORDER.indexOf(item.rankRequired)),
    });

    const dailyPool = allItems.filter(i => i.section === "daily");
    const weeklyPool = allItems.filter(i => i.section === "weekly");

    const rotate = <T>(arr: T[], offset: number, count: number): T[] => {
      if (arr.length === 0) return [];
      const start = offset % arr.length;
      return [...arr.slice(start), ...arr.slice(0, start)].slice(0, count);
    };

    res.json({
      hall: {
        title: "The Hall's Offerings",
        lore: "The Hall is no mere shop. Aldric once faced the thing beneath its stones, bound it with mercy instead of pride, and now it reveals tools for adventurers who keep returning.",
      },
      permanent: allItems.filter(i => i.section === "permanent").map(fmt),
      daily: rotate(dailyPool, dayOfYear, 5).map(fmt),
      weekly: rotate(weeklyPool, weekOfYear, 6).map(fmt),
      raid: allItems.filter(i => i.section === "raid").map(fmt),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get store sections" });
  }
});

router.post("/store/purchase", async (req, res) => {
  try {
    const { itemId, quantity = 1 } = req.body;
    const { player, stats } = await getOrCreatePlayer(req.userId);

    const [item] = await db.select().from(storeItemsTable).where(eq(storeItemsTable.id, itemId));
    if (!item) return void res.status(404).json({ error: "Item not found" });
    if (!item.available) return void res.status(400).json({ error: "Item not available" });
    if (!isLaunchStoreItem(item)) {
      return void res.status(400).json({ error: "This item is not available in the launch store" });
    }

    const totalCost = item.goldCost * quantity;
    if (player.gold < totalCost) {
      return void res.status(400).json({ error: "Insufficient gold" });
    }

    const [updatedPlayer] = await db.update(playerTable)
      .set({ gold: player.gold - totalCost, updatedAt: new Date() })
      .where(eq(playerTable.id, player.id))
      .returning();

    // Add to inventory
    const existing = await db.select().from(playerInventoryTable)
      .where(and(eq(playerInventoryTable.playerId, player.id), eq(playerInventoryTable.itemId, itemId)));

    if (existing.length > 0) {
      await db.update(playerInventoryTable)
        .set({ quantity: existing[0].quantity + quantity })
        .where(eq(playerInventoryTable.id, existing[0].id));
    } else {
      await db.insert(playerInventoryTable).values({
        playerId: player.id,
        itemId,
        quantity,
        equipped: false,
      });
    }
    await db.insert(itemDiscoveriesTable).values({
      playerId: player.id,
      itemId: item.id,
      itemName: item.name,
      rarity: item.rarity,
      category: item.category,
      sourceType: "hall_offering",
      sourceLabel: "The Hall's Offerings",
      loreText: loreForItem(item),
      currentState: "owned",
    }).onConflictDoUpdate({
      target: [itemDiscoveriesTable.playerId, itemDiscoveriesTable.itemName, itemDiscoveriesTable.sourceType],
      set: { currentState: "owned", updatedAt: new Date() },
    });

    res.json({
      success: true,
      message: `Purchased ${item.name} x${quantity}`,
      goldSpent: totalCost,
      remainingGold: updatedPlayer.gold,
      player: buildPlayerResponse(updatedPlayer, stats),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to purchase item" });
  }
});

router.post("/inventory/:id/sell", async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.id);
    const { player, stats } = await getOrCreatePlayer(req.userId);
    const [item] = await db.select({ inv: playerInventoryTable, store: storeItemsTable })
      .from(playerInventoryTable)
      .innerJoin(storeItemsTable, eq(playerInventoryTable.itemId, storeItemsTable.id))
      .where(and(eq(playerInventoryTable.id, inventoryId), eq(playerInventoryTable.playerId, player.id)));
    if (!item) return void res.status(404).json({ error: "Item not found" });
    const quantity = Math.max(1, Number(req.body?.quantity ?? 1));
    const sold = Math.min(quantity, item.inv.quantity);
    const goldReturned = Math.max(1, Math.floor(item.store.goldCost * 0.25)) * sold;
    const [updatedPlayer] = await db.update(playerTable)
      .set({ gold: player.gold + goldReturned, updatedAt: new Date() })
      .where(eq(playerTable.id, player.id))
      .returning();
    if (item.inv.quantity <= sold) {
      await db.delete(playerInventoryTable).where(eq(playerInventoryTable.id, inventoryId));
    } else {
      await db.update(playerInventoryTable)
        .set({ quantity: item.inv.quantity - sold })
        .where(eq(playerInventoryTable.id, inventoryId));
    }
    await db.insert(itemDiscoveriesTable).values({
      playerId: player.id,
      itemId: item.store.id,
      itemName: item.store.name,
      rarity: item.store.rarity,
      category: item.store.category,
      sourceType: "hall_offering",
      sourceLabel: "The Hall's Offerings",
      loreText: loreForItem(item.store),
      currentState: "sold",
    }).onConflictDoUpdate({
      target: [itemDiscoveriesTable.playerId, itemDiscoveriesTable.itemName, itemDiscoveriesTable.sourceType],
      set: { currentState: "sold", updatedAt: new Date() },
    });
    res.json({
      success: true,
      message: `Sold ${item.store.name} x${sold}. The Chronicle keeps its discovery record.`,
      goldReceived: goldReturned,
      player: buildPlayerResponse(updatedPlayer, stats),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to sell item" });
  }
});

export default router;
