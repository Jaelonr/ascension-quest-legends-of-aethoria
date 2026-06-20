ALTER TYPE "public"."gear_slot" ADD VALUE 'armor';--> statement-breakpoint
ALTER TYPE "public"."gear_slot" ADD VALUE 'wraps';--> statement-breakpoint
ALTER TYPE "public"."gear_slot" ADD VALUE 'relic';--> statement-breakpoint
ALTER TYPE "public"."gear_slot" ADD VALUE 'cloak';--> statement-breakpoint
ALTER TYPE "public"."gear_slot" ADD VALUE 'title';--> statement-breakpoint
ALTER TYPE "public"."gear_slot" ADD VALUE 'aura_cosmetic';--> statement-breakpoint
CREATE TABLE "item_discoveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"item_id" integer,
	"item_name" text NOT NULL,
	"rarity" text DEFAULT 'common' NOT NULL,
	"category" text DEFAULT 'gear' NOT NULL,
	"source_type" text DEFAULT 'guild_hall' NOT NULL,
	"source_label" text,
	"lore_text" text,
	"current_state" text DEFAULT 'owned' NOT NULL,
	"discovered_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_commissions" ADD COLUMN "category" text DEFAULT 'training' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_commissions" ADD COLUMN "rationale" text DEFAULT 'A balanced commission chosen from your current Guild record.' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_commissions" ADD COLUMN "context" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "item_discoveries" ADD CONSTRAINT "item_discoveries_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_discoveries" ADD CONSTRAINT "item_discoveries_item_id_store_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."store_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "item_discoveries_player_item_idx" ON "item_discoveries" USING btree ("player_id","item_name","source_type");