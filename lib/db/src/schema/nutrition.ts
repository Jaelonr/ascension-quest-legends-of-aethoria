import { pgTable, serial, text, integer, real, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playerTable } from "./player";

export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout"]);
export const weightUnitEnum = pgEnum("weight_unit", ["lbs", "kg"]);
export const sexEnum = pgEnum("sex", ["male", "female"]);
export const activityLevelEnum = pgEnum("activity_level", ["sedentary", "light", "moderate", "active", "very_active"]);
export const weightGoalEnum = pgEnum("weight_goal", ["lose", "maintain", "gain"]);

export const nutritionTargetsTable = pgTable("nutrition_targets", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  calories: integer("calories").notNull().default(2500),
  protein: integer("protein").notNull().default(180),
  carbs: integer("carbs").notNull().default(250),
  fat: integer("fat").notNull().default(80),
  sex: sexEnum("sex"),
  ageYears: integer("age_years"),
  activityLevel: activityLevelEnum("activity_level"),
  weightGoal: weightGoalEnum("weight_goal"),
  autoCalc: boolean("auto_calc").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const nutritionLogsTable = pgTable("nutrition_logs", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  date: text("date").notNull(),
  mealName: text("meal_name").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  mealType: mealTypeEnum("meal_type").notNull().default("snack"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const savedMealsTable = pgTable("saved_meals", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  name: text("name").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  mealType: mealTypeEnum("meal_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const weightEntriesTable = pgTable("weight_entries", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  weight: real("weight").notNull(),
  date: text("date").notNull(),
  unit: weightUnitEnum("unit").notNull().default("lbs"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNutritionLogSchema = createInsertSchema(nutritionLogsTable).omit({ id: true, createdAt: true });
export type InsertNutritionLog = z.infer<typeof insertNutritionLogSchema>;
export type NutritionLog = typeof nutritionLogsTable.$inferSelect;
export type NutritionTargets = typeof nutritionTargetsTable.$inferSelect;
export type SavedMeal = typeof savedMealsTable.$inferSelect;
export type WeightEntry = typeof weightEntriesTable.$inferSelect;
