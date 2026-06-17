import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playerTable } from "./player";
import { rarityEnum } from "./player";

export const itemTypeEnum = pgEnum("item_type", [
  "title",
  "recovery_token",
  "streak_shield",
  "workout_theme",
  "recipe_unlock",
  "deload_pass",
  "reward_box",
  "xp_boost",
  "stat_boost",
  "cosmetic",
  "consumable",
  "loot_crate",
  "training_scroll",
  "boss_key",
  "prestige_token",
  "equipment_skin",
]);

export const storeItemsTable = pgTable("store_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: itemTypeEnum("type").notNull(),
  goldCost: integer("gold_cost").notNull(),
  rarity: rarityEnum("rarity").notNull().default("common"),
  available: boolean("available").notNull().default(true),
  rankRequired: text("rank_required"),
  levelRequired: integer("level_required"),
  effectValue: integer("effect_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const playerInventoryTable = pgTable("player_inventory", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  itemId: integer("item_id").notNull().references(() => storeItemsTable.id),
  quantity: integer("quantity").notNull().default(1),
  equipped: boolean("equipped").notNull().default(false),
  acquiredAt: timestamp("acquired_at").notNull().defaultNow(),
});

export type StoreItem = typeof storeItemsTable.$inferSelect;
export type PlayerInventory = typeof playerInventoryTable.$inferSelect;
