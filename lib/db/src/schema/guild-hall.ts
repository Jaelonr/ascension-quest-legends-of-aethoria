import { boolean, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { playerTable } from "./player";
import { questsTable } from "./quests";
import { storeItemsTable } from "./inventory";

export const dailyCommissionsTable = pgTable("daily_commissions", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  questId: integer("quest_id").notNull().references(() => questsTable.id),
  date: text("date").notNull(),
  category: text("category").notNull().default("training"),
  rationale: text("rationale").notNull().default("A balanced commission chosen from your current Guild record."),
  readiness: text("readiness").notNull().default("ready"),
  counsel: text("counsel").notNull(),
  context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
  reportedAt: timestamp("reported_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("daily_commissions_player_date_idx").on(table.playerId, table.date),
  uniqueIndex("daily_commissions_quest_idx").on(table.questId),
]);

export const guildMasterMemoriesTable = pgTable("guild_master_memories", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  kind: text("kind").notNull(),
  sourceKey: text("source_key").notNull(),
  summary: text("summary").notNull(),
  importance: integer("importance").notNull().default(1),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("guild_master_memories_source_idx").on(table.playerId, table.sourceKey),
]);

export const worldEventsTable = pgTable("world_events", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  worldKey: text("world_key").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("active"),
  severity: text("severity").notNull().default("minor"),
  reversible: boolean("reversible").notNull().default(true),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  uniqueIndex("world_events_player_key_idx").on(table.playerId, table.worldKey),
]);

export const storyConsequencesTable = pgTable("story_consequences", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  questId: integer("quest_id").references(() => questsTable.id),
  worldEventId: integer("world_event_id").references(() => worldEventsTable.id),
  sourceKey: text("source_key").notNull(),
  tier: text("tier").notNull(),
  outcome: text("outcome").notNull(),
  canRestore: boolean("can_restore").notNull().default(false),
  restorationQuestId: integer("restoration_quest_id").references(() => questsTable.id),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("story_consequences_source_idx").on(table.playerId, table.sourceKey),
]);

export const healthImportsTable = pgTable("health_imports", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  source: text("source").notNull(),
  externalId: text("external_id").notNull(),
  recordedAt: timestamp("recorded_at").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("health_imports_dedupe_idx").on(table.playerId, table.source, table.externalId),
]);

export const aethoriaLocationsTable = pgTable("aethoria_locations", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  realm: text("realm").notNull().default("Unknown Realm"),
  region: text("region").notNull(),
  primaryFaction: text("primary_faction").notNull().default("Uncharted faction"),
  distanceFromGuildHallMiles: integer("distance_from_guild_hall_miles").notNull(),
  knownAtStart: boolean("known_at_start").notNull().default(false),
  summary: text("summary").notNull(),
  bestFor: text("best_for").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("aethoria_locations_key_idx").on(table.key),
]);

export const regionProgressTable = pgTable("region_progress", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  regionId: text("region_id").notNull(),
  regionName: text("region_name").notNull(),
  known: boolean("known").notNull().default(false),
  discovered: boolean("discovered").notNull().default(false),
  visited: boolean("visited").notNull().default(false),
  commissionsCompleted: integer("commissions_completed").notNull().default(0),
  bossesDefeated: integer("bosses_defeated").notNull().default(0),
  explorationPercent: integer("exploration_percent").notNull().default(0),
  dominantStyleUsed: text("dominant_style_used"),
  lastVisitedAt: timestamp("last_visited_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("region_progress_player_region_idx").on(table.playerId, table.regionId),
]);

export const itemDiscoveriesTable = pgTable("item_discoveries", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  itemId: integer("item_id").references(() => storeItemsTable.id),
  itemName: text("item_name").notNull(),
  rarity: text("rarity").notNull().default("common"),
  category: text("category").notNull().default("gear"),
  sourceType: text("source_type").notNull().default("guild_hall"),
  sourceLabel: text("source_label"),
  loreText: text("lore_text"),
  currentState: text("current_state").notNull().default("owned"),
  discoveredAt: timestamp("discovered_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("item_discoveries_player_item_idx").on(table.playerId, table.itemName, table.sourceType),
]);

export type DailyCommission = typeof dailyCommissionsTable.$inferSelect;
export type GuildMasterMemory = typeof guildMasterMemoriesTable.$inferSelect;
export type WorldEvent = typeof worldEventsTable.$inferSelect;
export type StoryConsequence = typeof storyConsequencesTable.$inferSelect;
export type HealthImport = typeof healthImportsTable.$inferSelect;
export type AethoriaLocation = typeof aethoriaLocationsTable.$inferSelect;
export type RegionProgress = typeof regionProgressTable.$inferSelect;
export type ItemDiscovery = typeof itemDiscoveriesTable.$inferSelect;
