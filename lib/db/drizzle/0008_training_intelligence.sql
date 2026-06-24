CREATE TABLE IF NOT EXISTS "player_training_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"primary_goal" text,
	"secondary_goal" text,
	"preferred_training_styles" text[] DEFAULT '{}' NOT NULL,
	"avoided_training_styles" text[] DEFAULT '{}' NOT NULL,
	"favorite_exercises" text[] DEFAULT '{}' NOT NULL,
	"frequently_skipped_exercises" text[] DEFAULT '{}' NOT NULL,
	"strongest_movement_patterns" text[] DEFAULT '{}' NOT NULL,
	"weakest_movement_patterns" text[] DEFAULT '{}' NOT NULL,
	"preferred_equipment" text[] DEFAULT '{}' NOT NULL,
	"preferred_session_length" integer,
	"average_training_frequency" real DEFAULT 0 NOT NULL,
	"recent_progress_trend" text DEFAULT 'insufficient_data' NOT NULL,
	"fatigue_trend" text DEFAULT 'unknown' NOT NULL,
	"injury_flags" text[] DEFAULT '{}' NOT NULL,
	"progressive_overload_readiness" text DEFAULT 'observe' NOT NULL,
	"deload_recommended" boolean DEFAULT false NOT NULL,
	"summary" text,
	"last_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exercise_progressions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"exercise_name" text NOT NULL,
	"movement_pattern" text DEFAULT 'general' NOT NULL,
	"last_performed_at" timestamp,
	"recent_sessions" integer DEFAULT 0 NOT NULL,
	"last_weight" real,
	"last_reps" integer,
	"last_sets" integer,
	"weight_unit" "weight_unit" DEFAULT 'lbs' NOT NULL,
	"best_weight" real,
	"best_volume" real,
	"estimated_one_rep_max" real,
	"average_rpe" real,
	"successful_sessions_in_row" integer DEFAULT 0 NOT NULL,
	"missed_targets_in_row" integer DEFAULT 0 NOT NULL,
	"trend" text DEFAULT 'insufficient_data' NOT NULL,
	"recommendation_type" text DEFAULT 'observe' NOT NULL,
	"recommended_next_weight" real,
	"recommended_next_reps" integer,
	"recommended_next_sets" integer,
	"target_rpe" real DEFAULT 8 NOT NULL,
	"recommendation_reason" text DEFAULT 'Insufficient history to recommend progression.' NOT NULL,
	"safety_note" text,
	"last_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_training_profiles" ADD CONSTRAINT "player_training_profiles_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "exercise_progressions" ADD CONSTRAINT "exercise_progressions_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "exercise_progressions" ADD CONSTRAINT "exercise_progressions_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "player_training_profiles_player_id_unique" ON "player_training_profiles" USING btree ("player_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "exercise_progressions_player_exercise_unique" ON "exercise_progressions" USING btree ("player_id","exercise_id");
