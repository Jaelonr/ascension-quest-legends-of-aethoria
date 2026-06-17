import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rankEnum = pgEnum("rank", ["E", "D", "C", "B", "A", "S", "National-Level"]);
export const rarityEnum = pgEnum("rarity", ["common", "uncommon", "rare", "epic", "legendary"]);

export const playerTable = pgTable("player", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Hunter"),
  level: integer("level").notNull().default(1),
  rank: rankEnum("rank").notNull().default("E"),
  xp: integer("xp").notNull().default(0),
  hp: integer("hp").notNull().default(100),
  maxHp: integer("max_hp").notNull().default(100),
  mp: integer("mp").notNull().default(100),
  maxMp: integer("max_mp").notNull().default(100),
  gold: integer("gold").notNull().default(0),
  freeStatPoints: integer("free_stat_points").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  activeTitle: text("active_title"),
  penaltyQuestActive: boolean("penalty_quest_active").notNull().default(false),
  totalXpEarned: integer("total_xp_earned").notNull().default(0),
  totalWorkouts: integer("total_workouts").notNull().default(0),
  totalQuests: integer("total_quests").notNull().default(0),
  totalPrs: integer("total_prs").notNull().default(0),
  prestigeLevel: integer("prestige_level").notNull().default(0),
  prestigeCount: integer("prestige_count").notNull().default(0),
  xpMultiplier: integer("xp_multiplier").notNull().default(100),
  lastActivityDate: text("last_activity_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const playerStatsTable = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  strength: integer("strength").notNull().default(5),
  agility: integer("agility").notNull().default(5),
  stamina: integer("stamina").notNull().default(5),
  vitality: integer("vitality").notNull().default(5),
  discipline: integer("discipline").notNull().default(5),
  sense: integer("sense").notNull().default(5),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const titlesTable = pgTable("titles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  rarity: rarityEnum("rarity").notNull().default("common"),
  unlockCondition: text("unlock_condition"),
});

export const playerTitlesTable = pgTable("player_titles", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  titleId: integer("title_id").notNull().references(() => titlesTable.id),
  equipped: boolean("equipped").notNull().default(false),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  xpReward: integer("xp_reward").notNull().default(0),
  checkKey: text("check_key"),
  checkThreshold: integer("check_threshold"),
});

export const playerAchievementsTable = pgTable("player_achievements", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  achievementId: integer("achievement_id").notNull().references(() => achievementsTable.id),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
});

export const xpHistoryTable = pgTable("xp_history", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  amount: integer("amount").notNull(),
  source: text("source").notNull(),
  category: text("category").notNull().default("general"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(playerTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playerTable.$inferSelect;
export type PlayerStats = typeof playerStatsTable.$inferSelect;
export type Title = typeof titlesTable.$inferSelect;
export type PlayerTitle = typeof playerTitlesTable.$inferSelect;
export type Achievement = typeof achievementsTable.$inferSelect;
export type XpHistory = typeof xpHistoryTable.$inferSelect;
