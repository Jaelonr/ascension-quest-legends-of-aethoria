import { Router } from "express";
import {
  db,
  equipmentTable,
  playerBiometricsTable,
  playerInventoryTable,
  playerStyleIdentityTable,
  playerTitlesTable,
  rpgGearTable,
  storeItemsTable,
  titlesTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";

const router = Router();

const LAUNCH_SLOTS = [
  "weapon",
  "armor",
  "gloves_wraps",
  "boots",
  "ring",
  "relic",
  "cloak",
  "title",
  "aura_cosmetic",
] as const;

function displaySlot(slot: string) {
  if (slot === "chest") return "armor";
  if (slot === "necklace" || slot === "offhand") return "relic";
  if (slot === "gloves") return "gloves_wraps";
  return slot;
}

router.get("/character/summary", async (req, res) => {
  try {
    const { player, stats } = await getOrCreatePlayer(req.userId);
    const [biometrics, gear, titles, inventory, equipment, identity] = await Promise.all([
      db.select().from(playerBiometricsTable).where(eq(playerBiometricsTable.playerId, player.id)).limit(1),
      db.select().from(rpgGearTable).where(eq(rpgGearTable.playerId, player.id)).orderBy(desc(rpgGearTable.acquiredAt)),
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
      db.select({
        id: playerInventoryTable.id,
        quantity: playerInventoryTable.quantity,
        equipped: playerInventoryTable.equipped,
        itemName: storeItemsTable.name,
        itemType: storeItemsTable.type,
        rarity: storeItemsTable.rarity,
        category: storeItemsTable.category,
      }).from(playerInventoryTable)
        .innerJoin(storeItemsTable, eq(playerInventoryTable.itemId, storeItemsTable.id))
        .where(eq(playerInventoryTable.playerId, player.id)),
      db.select().from(equipmentTable).where(eq(equipmentTable.owned, true)).orderBy(equipmentTable.category),
      db.select().from(playerStyleIdentityTable).where(eq(playerStyleIdentityTable.playerId, player.id)).limit(1),
    ]);

    const equippedBySlot = new Map<string, typeof gear[number]>();
    for (const item of gear.filter((g) => g.equipped)) {
      equippedBySlot.set(displaySlot(item.slot), item);
    }

    res.json({
      player: { ...player, stats },
      identity: {
        class: player.baseClass ?? identity[0]?.hybridArchetype ?? "Unclassed Adventurer",
        rank: player.rank,
        activeTitle: player.activeTitle,
        dominantStyle: identity[0] ? {
          strength: identity[0].strengthScore,
          striking: identity[0].strikingScore,
          conditioning: identity[0].conditioningScore,
          grappling: identity[0].grapplingScore,
          recovery: identity[0].recoveryScore,
          discipline: identity[0].disciplineScore,
          totalSessions: identity[0].totalSessions,
          hybridArchetype: identity[0].hybridArchetype,
        } : null,
      },
      gearSlots: LAUNCH_SLOTS.map((slot) => {
        const item = equippedBySlot.get(slot);
        return {
          slot,
          label: slot.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          item: item ? {
            id: item.id,
            name: item.name,
            rarity: item.rarity,
            elementalAffinity: item.elementalAffinity,
            cosmeticKey: item.cosmeticKey,
          } : null,
        };
      }),
      titles: titles.map((title) => ({ ...title, earnedAt: title.earnedAt.toISOString() })),
      appearance: {
        aura: equippedBySlot.get("aura_cosmetic")?.cosmeticKey ?? null,
        cosmeticCount: inventory.filter((item) => item.category === "cosmetic" || item.itemType === "cosmetic").length,
      },
      biometrics: biometrics[0] ?? {
        heightCm: null,
        weightKg: null,
        bodyFatPct: null,
        squat1rm: null,
        bench1rm: null,
        deadlift1rm: null,
        ohp1rm: null,
        row1rm: null,
        equipmentTypes: [],
        notes: null,
      },
      realEquipment: equipment.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        available: item.available,
      })),
      inventorySummary: {
        items: inventory.length,
        gear: gear.length,
        equippedGear: gear.filter((item) => item.equipped).length,
      },
      settingsShortcuts: [
        { key: "narrative_mode", label: "Narrative Mode", href: "/settings" },
        { key: "privacy", label: "Privacy", href: "/privacy" },
        { key: "data_export", label: "Export Data", href: "/data" },
        { key: "delete_data", label: "Delete Data", href: "/data" },
      ],
    });
  } catch (err) {
    req.log.error(err, "character summary error");
    res.status(500).json({ error: "Failed to read character record" });
  }
});

export default router;
