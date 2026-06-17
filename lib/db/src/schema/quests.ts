import { pgTable, serial, text, integer, boolean, timestamp, real, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playerTable } from "./player";

export const questTypeEnum = pgEnum("quest_type", [
  "daily", "weekly", "main", "side", "penalty", "boss_raid", "gate_dungeon"
]);

export const questStatusEnum = pgEnum("quest_status", [
  "active", "completed", "claimed", "failed", "locked"
]);

export const questDifficultyEnum = pgEnum("quest_difficulty", ["E", "D", "C", "B", "A", "S"]);

export const questsTable = pgTable("quests", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: questTypeEnum("type").notNull(),
  status: questStatusEnum("status").notNull().default("active"),
  xpReward: integer("xp_reward").notNull().default(100),
  goldReward: integer("gold_reward").notNull().default(50),
  bonusStatPoints: integer("bonus_stat_points").notNull().default(0),
  difficulty: questDifficultyEnum("difficulty").notNull().default("E"),
  titleReward: text("title_reward"),
  expiresAt: timestamp("expires_at"),
  completedAt: timestamp("completed_at"),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questTasksTable = pgTable("quest_tasks", {
  id: serial("id").primaryKey(),
  questId: integer("quest_id").notNull().references(() => questsTable.id),
  description: text("description").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  targetValue: real("target_value"),
  currentValue: real("current_value"),
  unit: text("unit"),
  order: integer("order").notNull().default(0),
});

export const bossRaidsTable = pgTable("boss_raids", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  lore: text("lore"),
  difficulty: questDifficultyEnum("difficulty").notNull().default("D"),
  status: questStatusEnum("status").notNull().default("active"),
  timeLimitHours: integer("time_limit_hours").notNull().default(72),
  xpReward: integer("xp_reward").notNull().default(500),
  goldReward: integer("gold_reward").notNull().default(300),
  bonusStatPoints: integer("bonus_stat_points").notNull().default(5),
  titleReward: text("title_reward"),
  tasks: json("tasks").$type<Array<{
    id: string;
    description: string;
    completed: boolean;
    targetValue?: number;
    currentValue?: number;
    unit?: string;
  }>>().notNull().default([]),
  triggerCondition: text("trigger_condition"),
  isRepeatable: boolean("is_repeatable").notNull().default(false),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  completedAt: timestamp("completed_at"),
  claimedAt: timestamp("claimed_at"),
});

export type Quest = typeof questsTable.$inferSelect;
export type QuestTask = typeof questTasksTable.$inferSelect;
export type BossRaid = typeof bossRaidsTable.$inferSelect;
