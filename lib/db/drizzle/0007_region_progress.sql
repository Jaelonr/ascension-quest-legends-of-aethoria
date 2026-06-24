CREATE TABLE IF NOT EXISTS "region_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"region_id" text NOT NULL,
	"region_name" text NOT NULL,
	"known" boolean DEFAULT false NOT NULL,
	"discovered" boolean DEFAULT false NOT NULL,
	"visited" boolean DEFAULT false NOT NULL,
	"commissions_completed" integer DEFAULT 0 NOT NULL,
	"bosses_defeated" integer DEFAULT 0 NOT NULL,
	"exploration_percent" integer DEFAULT 0 NOT NULL,
	"dominant_style_used" text,
	"last_visited_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "region_progress" ADD CONSTRAINT "region_progress_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "region_progress_player_region_idx" ON "region_progress" USING btree ("player_id","region_id");
