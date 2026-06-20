import { pgTable, serial, text, integer, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { playerTable } from "./player";
import { workoutSessionsTable } from "./training";

export const combatReplaysTable = pgTable("combat_replays", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  sessionId: integer("session_id").references(() => workoutSessionsTable.id),
  encounterName: text("encounter_name").notNull(),
  enemyName: text("enemy_name").notNull(),
  dominantStyle: text("dominant_style").notNull(),
  secondaryStyle: text("secondary_style"),
  hybridArchetype: text("hybrid_archetype"),
  verdict: text("verdict").notNull(),
  events: jsonb("events").notNull().$default(() => []),
  styleScores: jsonb("style_scores").notNull().$default(() => ({})),
  xpEarned: integer("xp_earned").notNull().default(0),
  goldEarned: integer("gold_earned").notNull().default(0),
  prCount: integer("pr_count").notNull().default(0),
  gearDrop: jsonb("gear_drop"),
  elementalAffinity: text("elemental_affinity").notNull().default("physical"),
  narrativeModifiers: jsonb("narrative_modifiers").$type<string[]>().notNull().default([]),
  raidImpact: text("raid_impact"),
  narrativeIntensity: text("narrative_intensity").notNull().default("balanced"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("combat_replays_session_idx").on(table.sessionId),
]);

export const playerStyleIdentityTable = pgTable("player_style_identity", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().unique().references(() => playerTable.id),
  strengthScore: integer("strength_score").notNull().default(0),
  strikingScore: integer("striking_score").notNull().default(0),
  conditioningScore: integer("conditioning_score").notNull().default(0),
  grapplingScore: integer("grappling_score").notNull().default(0),
  recoveryScore: integer("recovery_score").notNull().default(0),
  disciplineScore: integer("discipline_score").notNull().default(0),
  totalSessions: integer("total_sessions").notNull().default(0),
  hybridArchetype: text("hybrid_archetype"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CombatReplay = typeof combatReplaysTable.$inferSelect;
export type PlayerStyleIdentity = typeof playerStyleIdentityTable.$inferSelect;
