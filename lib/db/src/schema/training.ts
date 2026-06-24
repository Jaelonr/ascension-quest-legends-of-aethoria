import { pgTable, serial, text, integer, real, boolean, timestamp, json, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playerTable } from "./player";
import { weightUnitEnum } from "./nutrition";

export const exerciseCategoryEnum = pgEnum("exercise_category", [
  "barbell", "dumbbell", "machine", "bodyweight", "cable", "cardio", "martial_arts"
]);

export const workoutCategoryEnum = pgEnum("workout_category", [
  "strength", "conditioning", "striking", "grappling", "recovery", "mixed"
]);

export const sessionStatusEnum = pgEnum("session_status", ["active", "completed", "abandoned"]);

export const exercisesTable = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  category: exerciseCategoryEnum("category").notNull(),
  instructions: text("instructions"),
  equipmentIds: json("equipment_ids").$type<number[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workoutTemplatesTable = pgTable("workout_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: workoutCategoryEnum("category").notNull().default("strength"),
  description: text("description"),
  exercises: json("exercises").$type<Array<{
    exerciseId: number;
    exerciseName: string;
    sets: number;
    reps: string;
    restSeconds?: number | null;
    order: number;
    notes?: string | null;
  }>>().notNull().default([]),
  estimatedDuration: integer("estimated_duration"),
  xpReward: integer("xp_reward").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workoutSessionsTable = pgTable("workout_sessions", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  name: text("name").notNull(),
  templateId: integer("template_id"),
  status: sessionStatusEnum("status").notNull().default("active"),
  xpEarned: integer("xp_earned"),
  goldEarned: integer("gold_earned"),
  notes: text("notes"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  durationMinutes: integer("duration_minutes"),
});

export const workoutSetsTable = pgTable("workout_sets", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => workoutSessionsTable.id),
  exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id),
  exerciseName: text("exercise_name").notNull(),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps").notNull(),
  weight: real("weight").notNull(),
  weightUnit: weightUnitEnum("weight_unit").notNull().default("lbs"),
  rpe: real("rpe"),
  isPr: boolean("is_pr").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const personalRecordsTable = pgTable("personal_records", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id),
  exerciseName: text("exercise_name").notNull(),
  weight: real("weight").notNull(),
  reps: integer("reps").notNull(),
  weightUnit: weightUnitEnum("weight_unit").notNull().default("lbs"),
  estimatedOneRepMax: real("estimated_one_rep_max"),
  achievedAt: timestamp("achieved_at").notNull().defaultNow(),
});

export const playerTrainingProfilesTable = pgTable("player_training_profiles", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  primaryGoal: text("primary_goal"),
  secondaryGoal: text("secondary_goal"),
  preferredTrainingStyles: text("preferred_training_styles").array().notNull().default([]),
  avoidedTrainingStyles: text("avoided_training_styles").array().notNull().default([]),
  favoriteExercises: text("favorite_exercises").array().notNull().default([]),
  frequentlySkippedExercises: text("frequently_skipped_exercises").array().notNull().default([]),
  strongestMovementPatterns: text("strongest_movement_patterns").array().notNull().default([]),
  weakestMovementPatterns: text("weakest_movement_patterns").array().notNull().default([]),
  preferredEquipment: text("preferred_equipment").array().notNull().default([]),
  preferredSessionLength: integer("preferred_session_length"),
  averageTrainingFrequency: real("average_training_frequency").notNull().default(0),
  recentProgressTrend: text("recent_progress_trend").notNull().default("insufficient_data"),
  fatigueTrend: text("fatigue_trend").notNull().default("unknown"),
  injuryFlags: text("injury_flags").array().notNull().default([]),
  progressiveOverloadReadiness: text("progressive_overload_readiness").notNull().default("observe"),
  deloadRecommended: boolean("deload_recommended").notNull().default(false),
  summary: text("summary"),
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
}, (table) => ({
  playerUnique: uniqueIndex("player_training_profiles_player_id_unique").on(table.playerId),
}));

export const exerciseProgressionsTable = pgTable("exercise_progressions", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id),
  exerciseName: text("exercise_name").notNull(),
  movementPattern: text("movement_pattern").notNull().default("general"),
  lastPerformedAt: timestamp("last_performed_at"),
  recentSessions: integer("recent_sessions").notNull().default(0),
  lastWeight: real("last_weight"),
  lastReps: integer("last_reps"),
  lastSets: integer("last_sets"),
  weightUnit: weightUnitEnum("weight_unit").notNull().default("lbs"),
  bestWeight: real("best_weight"),
  bestVolume: real("best_volume"),
  estimatedOneRepMax: real("estimated_one_rep_max"),
  averageRpe: real("average_rpe"),
  successfulSessionsInRow: integer("successful_sessions_in_row").notNull().default(0),
  missedTargetsInRow: integer("missed_targets_in_row").notNull().default(0),
  trend: text("trend").notNull().default("insufficient_data"),
  recommendationType: text("recommendation_type").notNull().default("observe"),
  recommendedNextWeight: real("recommended_next_weight"),
  recommendedNextReps: integer("recommended_next_reps"),
  recommendedNextSets: integer("recommended_next_sets"),
  targetRpe: real("target_rpe").notNull().default(8),
  recommendationReason: text("recommendation_reason").notNull().default("Insufficient history to recommend progression."),
  safetyNote: text("safety_note"),
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
}, (table) => ({
  playerExerciseUnique: uniqueIndex("exercise_progressions_player_exercise_unique").on(table.playerId, table.exerciseId),
}));

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessionsTable).omit({ id: true, startedAt: true });
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type WorkoutSession = typeof workoutSessionsTable.$inferSelect;
export type WorkoutSet = typeof workoutSetsTable.$inferSelect;
export type Exercise = typeof exercisesTable.$inferSelect;
export type WorkoutTemplate = typeof workoutTemplatesTable.$inferSelect;
export type PersonalRecord = typeof personalRecordsTable.$inferSelect;
export type PlayerTrainingProfile = typeof playerTrainingProfilesTable.$inferSelect;
export type ExerciseProgression = typeof exerciseProgressionsTable.$inferSelect;
