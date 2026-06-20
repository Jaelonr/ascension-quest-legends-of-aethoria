ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'head';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'neck';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'shoulders';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'back';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'arms';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'hands';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'waist';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'legs';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'feet';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'ring_left';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'ring_right';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'main_hand';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'off_hand';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'aura_effect';--> statement-breakpoint
ALTER TYPE "gear_slot" ADD VALUE IF NOT EXISTS 'banner';--> statement-breakpoint
ALTER TABLE "rpg_gear" ADD COLUMN IF NOT EXISTS "display_name" text;--> statement-breakpoint
ALTER TABLE "rpg_gear" ADD COLUMN IF NOT EXISTS "icon_url" text;--> statement-breakpoint
ALTER TABLE "rpg_gear" ADD COLUMN IF NOT EXISTS "icon_key" text;--> statement-breakpoint
ALTER TABLE "rpg_gear" ADD COLUMN IF NOT EXISTS "mannequin_layer_url" text;--> statement-breakpoint
ALTER TABLE "rpg_gear" ADD COLUMN IF NOT EXISTS "mannequin_layer_key" text;--> statement-breakpoint
ALTER TABLE "rpg_gear" ADD COLUMN IF NOT EXISTS "layer_order" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "rpg_gear" ADD COLUMN IF NOT EXISTS "lore_text" text;--> statement-breakpoint
ALTER TABLE "rpg_gear" ADD COLUMN IF NOT EXISTS "affinity" text;--> statement-breakpoint
ALTER TABLE "rpg_gear" ADD COLUMN IF NOT EXISTS "cosmetic_variant" text;
