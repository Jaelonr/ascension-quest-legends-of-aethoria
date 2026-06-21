ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "mission_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "abandoned_narrative" text;
