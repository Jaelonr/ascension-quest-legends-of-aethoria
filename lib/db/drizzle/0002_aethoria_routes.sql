CREATE TABLE "aethoria_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"realm" text DEFAULT 'Unknown Realm' NOT NULL,
	"region" text NOT NULL,
	"primary_faction" text DEFAULT 'Uncharted faction' NOT NULL,
	"distance_from_guild_hall_miles" integer NOT NULL,
	"known_at_start" boolean DEFAULT false NOT NULL,
	"summary" text NOT NULL,
	"best_for" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "aethoria_locations_key_idx" ON "aethoria_locations" USING btree ("key");
--> statement-breakpoint
INSERT INTO "aethoria_locations" ("key", "name", "kind", "realm", "region", "primary_faction", "distance_from_guild_hall_miles", "known_at_start", "summary", "best_for") VALUES
('valecrest-outskirts', 'Valecrest Outskirts', 'wilds', 'Valecrest Crownlands', 'Valecrest', 'Valecrest Adventurer''s Guild', 12, true, 'Training roads, watch posts, and Guild patrol routes just beyond the city walls.', ARRAY['training','recovery','conditioning','penalty_restoration']),
('briarwatch', 'Briarwatch', 'village', 'Freeholds of the Verdant Basin', 'Verdant Basin', 'Basin Wardens', 96, true, 'A farming village on the western road where supply ledgers often go missing.', ARRAY['conditioning','nutrition','exploration','story_linked']),
('galehollow', 'Galehollow', 'town', 'Silver Coast Merchant Republics', 'Silver Coast', 'Chartered Road Companies', 418, false, 'A trade-road town known to the Guild, but not yet fully charted in the player Chronicle.', ARRAY['conditioning','skill_practice','exploration']),
('lumenhall', 'Lumenhall', 'city', 'Silver Coast Merchant Republics', 'Silver Coast', 'Lumenhall Banking Houses', 760, false, 'The Radiant Port, wealthiest trade city in Aethoria.', ARRAY['nutrition','story_linked','skill_practice']),
('port-aurelien', 'Port Aurelien', 'city', 'Principality of Port Aurelien', 'Silver Coast', 'Aurelien Diplomatic Court', 835, false, 'Crown of the Coast, a city of noble estates, embassies, and coastal fortifications.', ARRAY['story_linked','training','skill_practice']),
('thornfield-way', 'Thornfield Way', 'wilds', 'Frontier Marches', 'The Wild Frontier', 'Frontier Rangers', 185, true, 'A rough frontier road where scouts earn every mile.', ARRAY['conditioning','grappling','training','penalty_restoration']),
('emberford', 'Emberford', 'town', 'Ember Plains Clans', 'The Ember Plains', 'Ashroad Caravan Compact', 470, false, 'A hard road through dry wind and old battle smoke.', ARRAY['training','conditioning','story_linked']),
('whitecap-shrine', 'Whitecap Shrine', 'ruin', 'Silver Coast Merchant Republics', 'Silver Coast', 'Coastal Shrine Keepers', 690, false, 'A half-charted shrine on the sea road, mostly known through item lore.', ARRAY['recovery','mobility','exploration']),
('ntaloris-surface-docks', 'N''Thaloris Surface Docks', 'city', 'The Sunken Kingdom', 'The Sunken Kingdom', 'N''Thaloris Tidebound Courts', 1180, false, 'The visible docks of a city the surface does not truly understand.', ARRAY['story_linked','nutrition','exploration'])
ON CONFLICT ("key") DO UPDATE SET
	"name" = EXCLUDED."name",
	"kind" = EXCLUDED."kind",
	"realm" = EXCLUDED."realm",
	"region" = EXCLUDED."region",
	"primary_faction" = EXCLUDED."primary_faction",
	"distance_from_guild_hall_miles" = EXCLUDED."distance_from_guild_hall_miles",
	"known_at_start" = EXCLUDED."known_at_start",
	"summary" = EXCLUDED."summary",
	"best_for" = EXCLUDED."best_for";
