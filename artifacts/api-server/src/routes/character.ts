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
import { buildPlayerResponse, getOrCreatePlayer } from "../progression";

const router = Router();

const LAUNCH_SLOTS = [
  "head",
  "neck",
  "shoulders",
  "arms",
  "waist",
  "legs",
  "feet",
  "cloak",
  "chest",
  "hands",
  "ring_left",
  "ring_right",
  "weapon",
  "offhand",
  "relic",
  "title",
  "aura_cosmetic",
] as const;

const STYLE_KEYS = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;

const STYLE_LABELS: Record<typeof STYLE_KEYS[number], string> = {
  strength: "Iron Vanguard",
  striking: "Storm Duelist",
  conditioning: "Wayfarer",
  grappling: "Chainwarden",
  recovery: "Verdant Guardian",
  discipline: "Runesage",
};

const STYLE_NARRATIVES: Record<typeof STYLE_KEYS[number], string> = {
  strength: "Your record leans toward force, armor-breaking pressure, and direct confrontation. Aethoria reads you as the adventurer who moves what refuses to move.",
  striking: "Your record leans toward timing, footwork, and clean openings. Aethoria reads you as the adventurer who ends danger before it can settle.",
  conditioning: "Your record leans toward endurance, travel, and attrition. Aethoria reads you as the adventurer who keeps moving when the road turns hostile.",
  grappling: "Your record leans toward control, subdual, and battlefield restraint. Aethoria reads you as the adventurer who can end a fight without wasting motion.",
  recovery: "Your record leans toward restoration, resilience, and wise restraint. Aethoria reads you as the adventurer who survives long enough to matter.",
  discipline: "Your record leans toward consistency, preparation, and deliberate execution. Aethoria reads you as the adventurer whose legend is built one kept promise at a time.",
};

function displaySlot(slot: string) {
  if (slot === "armor") return "chest";
  if (slot === "helmet") return "head";
  if (slot === "necklace") return "neck";
  if (slot === "back") return "cloak";
  if (slot === "gloves" || slot === "wraps") return "hands";
  if (slot === "boots") return "feet";
  if (slot === "ring") return "ring_left";
  if (slot === "main_hand") return "weapon";
  if (slot === "off_hand") return "offhand";
  if (slot === "aura_effect") return "aura_cosmetic";
  if (slot === "banner") return "title";
  return slot;
}

function displayClassName(value?: string | null) {
  const key = (value ?? "").trim().toLowerCase();
  const labels: Record<string, string> = {
    warrior: "Iron Knight",
    "iron knight": "Iron Knight",
    striker: "Spellblade",
    spellblade: "Spellblade",
    ranger: "Ranger",
    adventurer: "Pathfinder",
    pathfinder: "Pathfinder",
  };
  return labels[key] ?? value ?? null;
}

function serializeStyleIdentity(identity?: typeof playerStyleIdentityTable.$inferSelect | null) {
  if (!identity) {
    return {
      totalSessions: 0,
      dominantStyle: null,
      dominantStyleLabel: "Still forming",
      secondaryStyle: null,
      secondaryStyleLabel: null,
      hybridArchetype: null,
      scores: { strength: 0, striking: 0, conditioning: 0, grappling: 0, recovery: 0, discipline: 0 },
      percentages: { strength: 0, striking: 0, conditioning: 0, grappling: 0, recovery: 0, discipline: 0 },
      narrative: "Complete training sessions to let Aethoria discover how you fight. Your class is earned through behavior, not chosen from a menu.",
    };
  }

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
  const dominantStyle = ranked[0]?.score ? ranked[0].key : null;
  const secondaryStyle = ranked[1]?.score ? ranked[1].key : null;
  const percentages = Object.fromEntries(STYLE_KEYS.map((key) => [
    key,
    total > 0 ? Math.round((scores[key] / total) * 100) : 0,
  ])) as Record<typeof STYLE_KEYS[number], number>;

  return {
    totalSessions: identity.totalSessions,
    dominantStyle,
    dominantStyleLabel: dominantStyle ? STYLE_LABELS[dominantStyle] : "Still forming",
    secondaryStyle,
    secondaryStyleLabel: secondaryStyle ? STYLE_LABELS[secondaryStyle] : null,
    hybridArchetype: identity.hybridArchetype,
    scores,
    percentages,
    narrative: dominantStyle
      ? STYLE_NARRATIVES[dominantStyle]
      : "Complete training sessions to let Aethoria discover how you fight. Your class is earned through behavior, not chosen from a menu.",
    updatedAt: identity.updatedAt.toISOString(),
  };
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

    const playerSummary = buildPlayerResponse(player, stats);
    const styleIdentity = serializeStyleIdentity(identity[0]);

    res.json({
      player: playerSummary,
      identity: {
        class: displayClassName(player.baseClass) ?? styleIdentity.hybridArchetype ?? "Unclassed Adventurer",
        rank: playerSummary.rank,
        activeTitle: player.activeTitle,
        styleIdentity,
        dominantStyle: {
          ...styleIdentity.scores,
          totalSessions: styleIdentity.totalSessions,
          hybridArchetype: styleIdentity.hybridArchetype,
          style: styleIdentity.dominantStyle,
          label: styleIdentity.dominantStyleLabel,
          secondaryStyle: styleIdentity.secondaryStyle,
          secondaryStyleLabel: styleIdentity.secondaryStyleLabel,
          percentages: styleIdentity.percentages,
          narrative: styleIdentity.narrative,
        },
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
