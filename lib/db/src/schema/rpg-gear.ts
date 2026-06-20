import { pgTable, serial, text, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { playerTable } from "./player";

export const gearSlotEnum = pgEnum("gear_slot", [
  "weapon", "offhand", "helmet", "chest", "gloves", "boots", "ring", "necklace",
  "armor", "wraps", "relic", "cloak", "title", "aura_cosmetic",
  "head", "neck", "shoulders", "back", "arms", "hands", "waist", "legs", "feet",
  "ring_left", "ring_right", "main_hand", "off_hand", "aura_effect", "banner"
]);

export const rpgGearTable = pgTable("rpg_gear", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  name: text("name").notNull(),
  displayName: text("display_name"),
  slot: gearSlotEnum("slot").notNull(),
  rarity: text("rarity").notNull().default("common"),
  iconUrl: text("icon_url"),
  iconKey: text("icon_key"),
  mannequinLayerUrl: text("mannequin_layer_url"),
  mannequinLayerKey: text("mannequin_layer_key"),
  layerOrder: integer("layer_order").notNull().default(0),
  statBonuses: json("stat_bonuses").$type<{
    strength?: number; agility?: number; stamina?: number;
    vitality?: number; discipline?: number; sense?: number;
  }>().notNull().default({}),
  flavorText: text("flavor_text"),
  loreText: text("lore_text"),
  source: text("source"),
  affinity: text("affinity"),
  elementalAffinity: text("elemental_affinity").notNull().default("physical"),
  narrativeModifiers: json("narrative_modifiers").$type<string[]>().notNull().default([]),
  xpBonusPercent: integer("xp_bonus_percent").notNull().default(0),
  cosmeticKey: text("cosmetic_key"),
  cosmeticVariant: text("cosmetic_variant"),
  equipped: boolean("equipped").notNull().default(false),
  acquiredAt: timestamp("acquired_at").notNull().defaultNow(),
});

export type RpgGear = typeof rpgGearTable.$inferSelect;
