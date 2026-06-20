CREATE TYPE "public"."equipment_category" AS ENUM('barbell', 'rack', 'machine', 'free_weights', 'cardio', 'mat', 'striking', 'cable', 'bench', 'other');--> statement-breakpoint
CREATE TYPE "public"."rank" AS ENUM('E', 'D', 'C', 'B', 'A', 'S', 'National-Level');--> statement-breakpoint
CREATE TYPE "public"."rarity" AS ENUM('common', 'uncommon', 'rare', 'epic', 'legendary');--> statement-breakpoint
CREATE TYPE "public"."activity_level" AS ENUM('sedentary', 'light', 'moderate', 'active', 'very_active');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."weight_goal" AS ENUM('lose', 'maintain', 'gain');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('lbs', 'kg');--> statement-breakpoint
CREATE TYPE "public"."exercise_category" AS ENUM('barbell', 'dumbbell', 'machine', 'bodyweight', 'cable', 'cardio', 'martial_arts');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."workout_category" AS ENUM('strength', 'conditioning', 'striking', 'grappling', 'recovery', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."skill_category" AS ENUM('strength', 'striking', 'grappling', 'conditioning', 'discipline', 'recovery', 'nutrition');--> statement-breakpoint
CREATE TYPE "public"."quest_difficulty" AS ENUM('E', 'D', 'C', 'B', 'A', 'S');--> statement-breakpoint
CREATE TYPE "public"."quest_status" AS ENUM('active', 'completed', 'claimed', 'failed', 'locked');--> statement-breakpoint
CREATE TYPE "public"."quest_type" AS ENUM('daily', 'weekly', 'main', 'side', 'penalty', 'boss_raid', 'gate_dungeon');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('title', 'recovery_token', 'streak_shield', 'workout_theme', 'recipe_unlock', 'deload_pass', 'reward_box', 'xp_boost', 'stat_boost', 'cosmetic', 'consumable', 'loot_crate', 'training_scroll', 'boss_key', 'prestige_token', 'equipment_skin');--> statement-breakpoint
CREATE TYPE "public"."gear_slot" AS ENUM('weapon', 'offhand', 'helmet', 'chest', 'gloves', 'boots', 'ring', 'necklace');--> statement-breakpoint
CREATE TABLE "combat_replays" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"session_id" integer,
	"encounter_name" text NOT NULL,
	"enemy_name" text NOT NULL,
	"dominant_style" text NOT NULL,
	"secondary_style" text,
	"hybrid_archetype" text,
	"verdict" text NOT NULL,
	"events" jsonb NOT NULL,
	"style_scores" jsonb NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"gold_earned" integer DEFAULT 0 NOT NULL,
	"pr_count" integer DEFAULT 0 NOT NULL,
	"gear_drop" jsonb,
	"elemental_affinity" text DEFAULT 'physical' NOT NULL,
	"narrative_modifiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raid_impact" text,
	"narrative_intensity" text DEFAULT 'balanced' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_style_identity" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"strength_score" integer DEFAULT 0 NOT NULL,
	"striking_score" integer DEFAULT 0 NOT NULL,
	"conditioning_score" integer DEFAULT 0 NOT NULL,
	"grappling_score" integer DEFAULT 0 NOT NULL,
	"recovery_score" integer DEFAULT 0 NOT NULL,
	"discipline_score" integer DEFAULT 0 NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"hybrid_archetype" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_style_identity_player_id_unique" UNIQUE("player_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"context" text,
	"player_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_logins" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"claimed_date" text NOT NULL,
	"streak_day" integer NOT NULL,
	"reward_type" text NOT NULL,
	"reward_amount" integer,
	"reward_label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "equipment_category" NOT NULL,
	"description" text,
	"owned" boolean DEFAULT true NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"max_weight" real,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"quest_id" integer NOT NULL,
	"date" text NOT NULL,
	"readiness" text DEFAULT 'ready' NOT NULL,
	"counsel" text NOT NULL,
	"reported_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_master_memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"kind" text NOT NULL,
	"source_key" text NOT NULL,
	"summary" text NOT NULL,
	"importance" integer DEFAULT 1 NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"recorded_at" timestamp NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_consequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"quest_id" integer,
	"world_event_id" integer,
	"source_key" text NOT NULL,
	"tier" text NOT NULL,
	"outcome" text NOT NULL,
	"can_restore" boolean DEFAULT false NOT NULL,
	"restoration_quest_id" integer,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"world_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"severity" text DEFAULT 'minor' NOT NULL,
	"reversible" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "guild_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"report_text" text NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" integer NOT NULL,
	"player_id" integer,
	"activity_type" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guild_members_player_id_unique" UNIQUE("player_id")
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"emblem" text DEFAULT '⚔️' NOT NULL,
	"invite_code" text NOT NULL,
	"max_members" integer DEFAULT 10 NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guilds_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"xp_reward" integer DEFAULT 0 NOT NULL,
	"check_key" text,
	"check_threshold" integer
);
--> statement-breakpoint
CREATE TABLE "player_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"achievement_id" integer NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_biometrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"height_cm" real,
	"weight_kg" real,
	"body_fat_pct" real,
	"squat_1rm" integer,
	"bench_1rm" integer,
	"deadlift_1rm" integer,
	"ohp_1rm" integer,
	"row_1rm" integer,
	"equipment_types" text[],
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"strength" integer DEFAULT 5 NOT NULL,
	"agility" integer DEFAULT 5 NOT NULL,
	"stamina" integer DEFAULT 5 NOT NULL,
	"vitality" integer DEFAULT 5 NOT NULL,
	"discipline" integer DEFAULT 5 NOT NULL,
	"sense" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" text,
	"name" text DEFAULT 'Hunter' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"rank" "rank" DEFAULT 'E' NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"hp" integer DEFAULT 100 NOT NULL,
	"max_hp" integer DEFAULT 100 NOT NULL,
	"mp" integer DEFAULT 100 NOT NULL,
	"max_mp" integer DEFAULT 100 NOT NULL,
	"gold" integer DEFAULT 0 NOT NULL,
	"free_stat_points" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"active_title" text,
	"penalty_quest_active" boolean DEFAULT false NOT NULL,
	"total_xp_earned" integer DEFAULT 0 NOT NULL,
	"total_workouts" integer DEFAULT 0 NOT NULL,
	"total_quests" integer DEFAULT 0 NOT NULL,
	"total_prs" integer DEFAULT 0 NOT NULL,
	"prestige_level" integer DEFAULT 0 NOT NULL,
	"prestige_count" integer DEFAULT 0 NOT NULL,
	"xp_multiplier" integer DEFAULT 100 NOT NULL,
	"base_class" text,
	"setup_completed" boolean DEFAULT false NOT NULL,
	"last_activity_date" text,
	"login_streak" integer DEFAULT 0 NOT NULL,
	"last_login_date" text,
	"guild_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "player_titles" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"title_id" integer NOT NULL,
	"equipped" boolean DEFAULT false NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"rarity" "rarity" DEFAULT 'common' NOT NULL,
	"unlock_condition" text
);
--> statement-breakpoint
CREATE TABLE "xp_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"source" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"date" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"date" text NOT NULL,
	"meal_name" text NOT NULL,
	"calories" integer NOT NULL,
	"protein" real NOT NULL,
	"carbs" real NOT NULL,
	"fat" real NOT NULL,
	"meal_type" "meal_type" DEFAULT 'snack' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"calories" integer DEFAULT 2500 NOT NULL,
	"protein" integer DEFAULT 180 NOT NULL,
	"carbs" integer DEFAULT 250 NOT NULL,
	"fat" integer DEFAULT 80 NOT NULL,
	"sex" "sex",
	"age_years" integer,
	"activity_level" "activity_level",
	"weight_goal" "weight_goal",
	"auto_calc" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"name" text NOT NULL,
	"calories" integer NOT NULL,
	"protein" real NOT NULL,
	"carbs" real NOT NULL,
	"fat" real NOT NULL,
	"meal_type" "meal_type",
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"weight" real NOT NULL,
	"date" text NOT NULL,
	"unit" "weight_unit" DEFAULT 'lbs' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"muscle_group" text NOT NULL,
	"category" "exercise_category" NOT NULL,
	"instructions" text,
	"equipment_ids" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"exercise_name" text NOT NULL,
	"weight" real NOT NULL,
	"reps" integer NOT NULL,
	"weight_unit" "weight_unit" DEFAULT 'lbs' NOT NULL,
	"estimated_one_rep_max" real,
	"achieved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"name" text NOT NULL,
	"template_id" integer,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"xp_earned" integer,
	"gold_earned" integer,
	"notes" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_minutes" integer
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"exercise_name" text NOT NULL,
	"set_number" integer NOT NULL,
	"reps" integer NOT NULL,
	"weight" real NOT NULL,
	"weight_unit" "weight_unit" DEFAULT 'lbs' NOT NULL,
	"rpe" real,
	"is_pr" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "workout_category" DEFAULT 'strength' NOT NULL,
	"description" text,
	"exercises" json DEFAULT '[]'::json NOT NULL,
	"estimated_duration" integer,
	"xp_reward" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_skill_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"node_id" integer NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tree_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"tier" integer DEFAULT 1 NOT NULL,
	"xp_cost" integer DEFAULT 100 NOT NULL,
	"stat_requirements" json DEFAULT '{"strength":0,"agility":0,"stamina":0,"vitality":0,"discipline":0,"sense":0}'::json NOT NULL,
	"prerequisite_node_ids" json DEFAULT '[]'::json NOT NULL,
	"effect" text,
	"equipment_required" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_trees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" "skill_category" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boss_raids" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"lore" text,
	"difficulty" "quest_difficulty" DEFAULT 'D' NOT NULL,
	"status" "quest_status" DEFAULT 'active' NOT NULL,
	"time_limit_hours" integer DEFAULT 72 NOT NULL,
	"xp_reward" integer DEFAULT 500 NOT NULL,
	"gold_reward" integer DEFAULT 300 NOT NULL,
	"bonus_stat_points" integer DEFAULT 5 NOT NULL,
	"title_reward" text,
	"tasks" json DEFAULT '[]'::json NOT NULL,
	"trigger_condition" text,
	"is_repeatable" boolean DEFAULT false NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"completed_at" timestamp,
	"claimed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "quest_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"quest_id" integer NOT NULL,
	"description" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"target_value" real,
	"current_value" real,
	"unit" text,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quests" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" "quest_type" NOT NULL,
	"status" "quest_status" DEFAULT 'active' NOT NULL,
	"xp_reward" integer DEFAULT 100 NOT NULL,
	"gold_reward" integer DEFAULT 50 NOT NULL,
	"bonus_stat_points" integer DEFAULT 0 NOT NULL,
	"difficulty" "quest_difficulty" DEFAULT 'E' NOT NULL,
	"title_reward" text,
	"expires_at" timestamp,
	"completed_at" timestamp,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"equipped" boolean DEFAULT false NOT NULL,
	"acquired_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"type" "item_type" NOT NULL,
	"gold_cost" integer NOT NULL,
	"rarity" "rarity" DEFAULT 'common' NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"rank_required" text,
	"level_required" integer,
	"effect_value" integer,
	"section" text DEFAULT 'permanent' NOT NULL,
	"category" text DEFAULT 'consumable' NOT NULL,
	"style_affinity" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rpg_gear" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"name" text NOT NULL,
	"slot" "gear_slot" NOT NULL,
	"rarity" text DEFAULT 'common' NOT NULL,
	"stat_bonuses" json DEFAULT '{}'::json NOT NULL,
	"flavor_text" text,
	"source" text,
	"elemental_affinity" text DEFAULT 'physical' NOT NULL,
	"narrative_modifiers" json DEFAULT '[]'::json NOT NULL,
	"xp_bonus_percent" integer DEFAULT 0 NOT NULL,
	"cosmetic_key" text,
	"equipped" boolean DEFAULT false NOT NULL,
	"acquired_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wearable_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"date" text NOT NULL,
	"steps" integer,
	"sleep_hours" real,
	"hrv" real,
	"resting_hr" integer,
	"calories_burned" integer,
	"active_minutes" integer,
	"weight" real,
	"source" text DEFAULT 'manual' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "combat_replays" ADD CONSTRAINT "combat_replays_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combat_replays" ADD CONSTRAINT "combat_replays_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_style_identity" ADD CONSTRAINT "player_style_identity_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logins" ADD CONSTRAINT "daily_logins_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_commissions" ADD CONSTRAINT "daily_commissions_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_commissions" ADD CONSTRAINT "daily_commissions_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_master_memories" ADD CONSTRAINT "guild_master_memories_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_imports" ADD CONSTRAINT "health_imports_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_consequences" ADD CONSTRAINT "story_consequences_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_consequences" ADD CONSTRAINT "story_consequences_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_consequences" ADD CONSTRAINT "story_consequences_world_event_id_world_events_id_fk" FOREIGN KEY ("world_event_id") REFERENCES "public"."world_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_consequences" ADD CONSTRAINT "story_consequences_restoration_quest_id_quests_id_fk" FOREIGN KEY ("restoration_quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_events" ADD CONSTRAINT "world_events_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_reports" ADD CONSTRAINT "guild_reports_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_activity" ADD CONSTRAINT "guild_activity_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_activity" ADD CONSTRAINT "guild_activity_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_created_by_player_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_biometrics" ADD CONSTRAINT "player_biometrics_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_titles" ADD CONSTRAINT "player_titles_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_titles" ADD CONSTRAINT "player_titles_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_history" ADD CONSTRAINT "xp_history_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_targets" ADD CONSTRAINT "nutrition_targets_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_meals" ADD CONSTRAINT "saved_meals_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_entries" ADD CONSTRAINT "weight_entries_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_skill_nodes" ADD CONSTRAINT "player_skill_nodes_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_skill_nodes" ADD CONSTRAINT "player_skill_nodes_node_id_skill_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."skill_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_nodes" ADD CONSTRAINT "skill_nodes_tree_id_skill_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."skill_trees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boss_raids" ADD CONSTRAINT "boss_raids_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_tasks" ADD CONSTRAINT "quest_tasks_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_inventory" ADD CONSTRAINT "player_inventory_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_inventory" ADD CONSTRAINT "player_inventory_item_id_store_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."store_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rpg_gear" ADD CONSTRAINT "rpg_gear_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_entries" ADD CONSTRAINT "wearable_entries_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "combat_replays_session_idx" ON "combat_replays" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_commissions_player_date_idx" ON "daily_commissions" USING btree ("player_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_commissions_quest_idx" ON "daily_commissions" USING btree ("quest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guild_master_memories_source_idx" ON "guild_master_memories" USING btree ("player_id","source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "health_imports_dedupe_idx" ON "health_imports" USING btree ("player_id","source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_consequences_source_idx" ON "story_consequences" USING btree ("player_id","source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "world_events_player_key_idx" ON "world_events" USING btree ("player_id","world_key");