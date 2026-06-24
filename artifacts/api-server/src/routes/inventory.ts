import { Router } from "express";
import { db } from "@workspace/db";
import { storeItemsTable, playerInventoryTable, playerTable, itemDiscoveriesTable, rpgGearTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { getOrCreatePlayer, buildPlayerResponse } from "./player";

const router = Router();
const isLaunchStoreItem = (item: typeof storeItemsTable.$inferSelect) =>
  item.type !== "stat_boost" && !(item.type === "xp_boost" && (item.effectValue ?? 0) > 10);

type HallOfferingSeed = typeof storeItemsTable.$inferInsert;

const HALL_GEAR_OFFERINGS: HallOfferingSeed[] = [
  {
    name: "Wanderer's Linen Tunic",
    description: "Plain travel clothing for a new arrival in Aethoria. It offers no illusion of glory, only a place to begin.",
    type: "equipment_skin",
    goldCost: 75,
    rarity: "common",
    section: "permanent",
    category: "gear:chest:clothing",
    styleAffinity: "discipline",
    effectValue: 0,
  },
  {
    name: "Leather Scout Jerkin",
    description: "Flexible leather armor favored by road scouts and frontier runners. Light enough for long miles.",
    type: "equipment_skin",
    goldCost: 180,
    rarity: "common",
    section: "permanent",
    category: "gear:chest:leather",
    styleAffinity: "conditioning",
    effectValue: 1,
  },
  {
    name: "Iron Hauberk",
    description: "A practical iron mail shirt from the Hall's older armory racks. Heavy work answers heavy threats.",
    type: "equipment_skin",
    goldCost: 420,
    rarity: "uncommon",
    section: "permanent",
    category: "gear:chest:metal",
    styleAffinity: "strength",
    effectValue: 1,
  },
  {
    name: "Apprentice's Travel Robe",
    description: "A dark robe stitched with quiet runes. The cloth responds best to patience, breath, and clean repetition.",
    type: "equipment_skin",
    goldCost: 260,
    rarity: "uncommon",
    section: "permanent",
    category: "gear:chest:robe",
    styleAffinity: "arcane",
    effectValue: 1,
  },
  {
    name: "Mithril Scale Vest",
    description: "A silver-bright vest made for adventurers who must move fast without standing defenseless.",
    type: "equipment_skin",
    goldCost: 950,
    rarity: "rare",
    section: "weekly",
    category: "gear:chest:mithril",
    styleAffinity: "light",
    effectValue: 2,
  },
  {
    name: "Diamondweave Vestment",
    description: "A crystalline ceremonial vestment that bends lamplight into spellwork. Beautiful, strange, and difficult to earn.",
    type: "equipment_skin",
    goldCost: 1600,
    rarity: "epic",
    section: "raid",
    category: "gear:chest:diamondweave",
    styleAffinity: "arcane",
    levelRequired: 5,
    effectValue: 3,
  },
  {
    name: "Iron Longsword",
    description: "A dependable blade with no patience for theatrics. The Hall gives it to those who intend to work.",
    type: "equipment_skin",
    goldCost: 300,
    rarity: "common",
    section: "permanent",
    category: "gear:weapon:sword",
    styleAffinity: "strength",
    effectValue: 1,
  },
  {
    name: "Oak Shortbow",
    description: "A frontier bow suited to steady breathing, clean posture, and a patient eye.",
    type: "equipment_skin",
    goldCost: 260,
    rarity: "common",
    section: "permanent",
    category: "gear:weapon:bow",
    styleAffinity: "conditioning",
    effectValue: 1,
  },
  {
    name: "Hunter's Crossbow",
    description: "A compact crossbow used by caravan guards who know trouble often comes from the treeline.",
    type: "equipment_skin",
    goldCost: 520,
    rarity: "uncommon",
    section: "daily",
    category: "gear:weapon:crossbow",
    styleAffinity: "discipline",
    effectValue: 1,
  },
  {
    name: "Emberstaff",
    description: "A staff warm to the touch. It does not grant fire; it gives shape to effort that already burns.",
    type: "equipment_skin",
    goldCost: 640,
    rarity: "uncommon",
    section: "daily",
    category: "gear:weapon:staff",
    styleAffinity: "fire",
    effectValue: 2,
  },
  {
    name: "Frostglass Staff",
    description: "A pale staff used by healers and wardens near Frostveil. It favors control over force.",
    type: "equipment_skin",
    goldCost: 880,
    rarity: "rare",
    section: "weekly",
    category: "gear:weapon:staff",
    styleAffinity: "frost",
    effectValue: 2,
  },
  {
    name: "Stormbound Spear",
    description: "A spear with brass rings along its haft. It hums after long runs and sharp footwork.",
    type: "equipment_skin",
    goldCost: 920,
    rarity: "rare",
    section: "weekly",
    category: "gear:weapon:spear",
    styleAffinity: "storm",
    effectValue: 2,
  },
  {
    name: "Warden's Buckler",
    description: "A small shield for those who prefer surviving the second strike to boasting after the first.",
    type: "equipment_skin",
    goldCost: 220,
    rarity: "common",
    section: "permanent",
    category: "gear:offhand:shield",
    styleAffinity: "recovery",
    effectValue: 0,
  },
  {
    name: "Wayfarer's Boots",
    description: "Road-worn boots that remember every mile. They are humble, which makes them honest.",
    type: "equipment_skin",
    goldCost: 160,
    rarity: "common",
    section: "permanent",
    category: "gear:feet:clothing",
    styleAffinity: "conditioning",
    effectValue: 0,
  },
  {
    name: "Iron Gauntlets",
    description: "Plain gauntlets for carries, grips, and anything that refuses to move when asked politely.",
    type: "equipment_skin",
    goldCost: 360,
    rarity: "uncommon",
    section: "permanent",
    category: "gear:hands:metal",
    styleAffinity: "strength",
    effectValue: 1,
  },
  {
    name: "Acolyte's Wraps",
    description: "Soft hand wraps marked with low spellwork. They steady the hands before difficult practice.",
    type: "equipment_skin",
    goldCost: 240,
    rarity: "uncommon",
    section: "daily",
    category: "gear:hands:cloth",
    styleAffinity: "arcane",
    effectValue: 1,
  },
  {
    name: "Traveler's Weathercloak",
    description: "A cloak for rain, dust, and the long road between things you understand.",
    type: "equipment_skin",
    goldCost: 200,
    rarity: "common",
    section: "permanent",
    category: "gear:cloak:cloth",
    styleAffinity: "discipline",
    effectValue: 0,
  },
  {
    name: "Tideglass Ring",
    description: "Common among merchants conducting business near N'Thaloris. The sea means something different there.",
    type: "equipment_skin",
    goldCost: 480,
    rarity: "uncommon",
    section: "daily",
    category: "gear:ring_left:ring",
    styleAffinity: "water",
    effectValue: 1,
  },
  {
    name: "Ember Signet",
    description: "A red-gold ring carried by messengers crossing the Ember Plains. It holds warmth without comfort.",
    type: "equipment_skin",
    goldCost: 620,
    rarity: "rare",
    section: "weekly",
    category: "gear:ring_right:ring",
    styleAffinity: "fire",
    effectValue: 2,
  },
  {
    name: "Novice Focus",
    description: "A simple focus charm for adventurers whose discipline is beginning to look like magic.",
    type: "equipment_skin",
    goldCost: 300,
    rarity: "common",
    section: "permanent",
    category: "gear:relic:focus",
    styleAffinity: "arcane",
    effectValue: 1,
  },
  {
    name: "Minor Recovery Potion",
    description: "A bitter red draught for after hard work. It restores health, not pride.",
    type: "recovery_token",
    goldCost: 90,
    rarity: "common",
    section: "permanent",
    category: "consumable:potion",
    styleAffinity: "recovery",
    effectValue: 30,
  },
];

function storeSlotFromCategory(category?: string | null) {
  if (!category?.startsWith("gear:")) return null;
  const [, slot] = category.split(":");
  return slot || null;
}

function isGearOffering(item: typeof storeItemsTable.$inferSelect) {
  return item.type === "equipment_skin" && Boolean(storeSlotFromCategory(item.category));
}

function elementalAffinityFor(item: Pick<typeof storeItemsTable.$inferSelect, "styleAffinity" | "category">) {
  const affinity = (item.styleAffinity ?? "").toLowerCase();
  const map: Record<string, string> = {
    strength: "earth",
    conditioning: "storm",
    discipline: "arcane",
    grappling: "physical",
    striking: "fire",
    recovery: "water",
    arcane: "arcane",
    fire: "fire",
    frost: "frost",
    storm: "storm",
    water: "water",
    light: "light",
    shadow: "shadow",
  };
  return map[affinity] ?? "physical";
}

function iconKeyFor(slot?: string | null, affinity?: string | null) {
  if (!slot) return "package";
  if (slot === "weapon") return affinity === "arcane" || affinity === "fire" || affinity === "frost" ? "staff" : "sword";
  if (slot === "offhand") return "shield";
  if (slot === "chest") return "armor";
  if (slot === "hands") return "gloves";
  if (slot === "feet") return "boots";
  if (slot === "cloak") return "cloak";
  if (slot?.startsWith("ring")) return "ring";
  if (slot === "relic") return "relic";
  return slot;
}

function layerOrderFor(slot?: string | null) {
  const order: Record<string, number> = {
    cloak: 5,
    feet: 10,
    legs: 20,
    chest: 30,
    hands: 40,
    offhand: 50,
    weapon: 60,
    relic: 70,
    ring_left: 80,
    ring_right: 81,
  };
  return order[slot ?? ""] ?? 0;
}

function gearFlavorForItem(item: Pick<typeof storeItemsTable.$inferSelect, "name" | "styleAffinity" | "category">, elementalAffinity: string) {
  const name = item.name.toLowerCase();
  if (name.includes("tideglass")) return "tideglass caught the light, and coastal merchants treated you as someone who understood old sea customs.";
  if (name.includes("ember")) return "embers stirred along the equipment, lending your movements the look of Ember Plains resolve.";
  if (name.includes("frost")) return "cold mana settled into your stance, making each controlled breath look deliberate.";
  if (name.includes("mithril")) return "mithril flashed like a noble charter, opening doors that plain iron would not.";
  if (name.includes("diamondweave")) return "diamondweave bent spell-light around your silhouette, making your discipline look almost ceremonial.";
  if (name.includes("robe") || name.includes("focus") || elementalAffinity === "arcane") return "quiet runes answered your focus, changing the shape of your aura before the strike landed.";
  if (name.includes("bow") || name.includes("crossbow")) return "your equipment marked you as road-capable, the sort of adventurer caravans prefer to hire twice.";
  if (name.includes("leather") || name.includes("cloak") || name.includes("boots")) return "travel-worn gear made you look native to the road, not merely dropped upon it.";
  if (name.includes("iron")) return "iron weight gave your silhouette the blunt authority of someone used to hard labor.";
  return `${elementalAffinity} affinity gathered around your equipped gear, altering the story of the exchange.`;
}

function regionModifierTagsForItem(
  item: Pick<typeof storeItemsTable.$inferSelect, "name" | "styleAffinity" | "category">,
  elementalAffinity: string,
) {
  const name = item.name.toLowerCase();
  const tags: string[] = [`affinity:${elementalAffinity}`, `aura:${elementalAffinity}`, "gear_effect:narrative_first"];
  const addRegion = (region: string, percent = 2) => {
    tags.push(`local_attire:${region}`);
    tags.push(`regional_gold_bonus:${region}:${percent}`);
  };

  if (name.includes("frost")) addRegion("frostveil_peaks", 3);
  if (name.includes("ember")) addRegion("ember_plains", 3);
  if (name.includes("tideglass")) {
    addRegion("sunken_kingdom", 3);
    addRegion("silver_coast", 2);
  }
  if (name.includes("mithril") || name.includes("diamondweave")) {
    addRegion("silver_coast", 3);
    addRegion("valecrest", 2);
  }
  if (name.includes("iron") || name.includes("buckler")) {
    addRegion("blackstone_highlands", 2);
    addRegion("ember_plains", 1);
  }
  if (name.includes("leather") || name.includes("bow") || name.includes("crossbow")) {
    addRegion("wild_frontier", 2);
    addRegion("silver_coast", 1);
  }
  if (name.includes("cloak") || name.includes("boots")) {
    addRegion("verdant_basin", 1);
    addRegion("silver_coast", 1);
  }
  if (name.includes("robe") || name.includes("focus")) {
    addRegion("valecrest", 2);
  }

  return [...new Set(tags)];
}

function toStoreClientItem(item: typeof storeItemsTable.$inferSelect) {
  return {
    ...item,
    slot: storeSlotFromCategory(item.category),
    elementalAffinity: elementalAffinityFor(item),
    isGear: isGearOffering(item),
    createdAt: item.createdAt?.toISOString?.(),
  };
}

export async function ensureHallOfferingCatalog() {
  const names = HALL_GEAR_OFFERINGS.map((item) => item.name);
  const existing = await db.select({ name: storeItemsTable.name })
    .from(storeItemsTable)
    .where(inArray(storeItemsTable.name, names));
  const existingNames = new Set(existing.map((item) => item.name));
  const missing = HALL_GEAR_OFFERINGS.filter((item) => !existingNames.has(item.name));
  if (missing.length > 0) {
    await db.insert(storeItemsTable).values(missing);
  }
}

function loreForItem(item: typeof storeItemsTable.$inferSelect) {
  if (item.description.length > 12) return item.description;
  return `The Hall revealed ${item.name} from a shelf that was empty a moment before. Aldric says useful things prefer useful hands.`;
}

router.get("/inventory", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const [items, gear] = await Promise.all([
      db.select({
      id: playerInventoryTable.id,
      itemId: playerInventoryTable.itemId,
      quantity: playerInventoryTable.quantity,
      equipped: playerInventoryTable.equipped,
      itemName: storeItemsTable.name,
      itemType: storeItemsTable.type,
      rarity: storeItemsTable.rarity,
      description: storeItemsTable.description,
      category: storeItemsTable.category,
      styleAffinity: storeItemsTable.styleAffinity,
    })
    .from(playerInventoryTable)
    .innerJoin(storeItemsTable, eq(playerInventoryTable.itemId, storeItemsTable.id))
        .where(eq(playerInventoryTable.playerId, player.id)),
      db.select().from(rpgGearTable).where(eq(rpgGearTable.playerId, player.id)),
    ]);

    res.json([
      ...items.map((item) => ({
        ...item,
        name: item.itemName,
        displayName: item.itemName,
        slot: null,
        isGear: false,
      })),
      ...gear.map((item) => ({
        id: item.id,
        itemId: null,
        quantity: 1,
        equipped: item.equipped,
        itemName: item.name,
        name: item.name,
        displayName: item.displayName ?? item.name,
        itemType: "gear",
        rarity: item.rarity,
        description: item.loreText ?? item.flavorText,
        category: item.slot,
        slot: item.slot,
        styleAffinity: item.affinity,
        elementalAffinity: item.elementalAffinity,
        loreText: item.loreText,
        statBonuses: item.statBonuses,
        source: item.source,
        iconKey: item.iconKey,
        mannequinLayerUrl: item.mannequinLayerUrl,
        mannequinLayerKey: item.mannequinLayerKey,
        layerOrder: item.layerOrder,
        isGear: true,
      })),
    ]);
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
    await ensureHallOfferingCatalog();
    const items = await db.select().from(storeItemsTable).where(eq(storeItemsTable.available, true));
    res.json(items.filter(isLaunchStoreItem).map(toStoreClientItem));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get store items" });
  }
});

const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];

router.get("/store/sections", async (req, res) => {
  try {
    await ensureHallOfferingCatalog();
    const { player } = await getOrCreatePlayer(req.userId);
    const allItems = (await db.select().from(storeItemsTable).where(eq(storeItemsTable.available, true)))
      .filter(isLaunchStoreItem);

    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const weekOfYear = Math.floor(dayOfYear / 7);

    const fmt = (item: typeof allItems[0]) => ({
      ...toStoreClientItem(item),
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

    let gearCreated = 0;
    if (isGearOffering(item)) {
      const slot = storeSlotFromCategory(item.category)!;
      const elementalAffinity = elementalAffinityFor(item);
      const rows = Array.from({ length: quantity }, () => ({
        playerId: player.id,
        name: item.name,
        displayName: item.name,
        slot: slot as any,
        rarity: item.rarity,
        iconKey: iconKeyFor(slot, elementalAffinity),
        layerOrder: layerOrderFor(slot),
        statBonuses: {},
        flavorText: item.description,
        loreText: loreForItem(item),
        source: "The Hall's Offerings",
        affinity: item.styleAffinity ?? elementalAffinity,
        elementalAffinity,
        narrativeModifiers: [
          gearFlavorForItem(item, elementalAffinity),
          ...regionModifierTagsForItem(item, elementalAffinity),
          `material:${item.category.split(":")[2] ?? "standard"}`,
          "stat_impact:marginal",
        ],
        xpBonusPercent: Math.max(0, Math.min(item.effectValue ?? 0, 3)),
        cosmeticKey: iconKeyFor(slot, elementalAffinity),
        cosmeticVariant: item.category.split(":")[2] ?? elementalAffinity,
        equipped: false,
      }));
      await db.insert(rpgGearTable).values(rows);
      gearCreated = rows.length;
    } else {
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
      gearCreated,
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
