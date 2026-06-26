import { Router } from "express";
import { db } from "@workspace/db";
import { storeItemsTable, playerInventoryTable, playerTable, itemDiscoveriesTable, rpgGearTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { getOrCreatePlayer, buildPlayerResponse } from "./player";

const router = Router();
const isLaunchStoreItem = (item: typeof storeItemsTable.$inferSelect) =>
  item.type !== "stat_boost" && !(item.type === "xp_boost" && (item.effectValue ?? 0) > 10);

type HallOfferingSeed = typeof storeItemsTable.$inferInsert;

function hallGear(
  name: string,
  description: string,
  slot: string,
  subtype: string,
  goldCost: number,
  rarity: HallOfferingSeed["rarity"],
  styleAffinity: string,
  section: HallOfferingSeed["section"] = "permanent",
  effectValue = 1,
  levelRequired?: number,
): HallOfferingSeed {
  return {
    name,
    description,
    type: "equipment_skin",
    goldCost,
    rarity,
    section,
    category: `gear:${slot}:${subtype}`,
    styleAffinity,
    effectValue,
    ...(levelRequired ? { levelRequired } : {}),
  };
}

function hallConsumable(
  name: string,
  description: string,
  category: string,
  goldCost: number,
  rarity: HallOfferingSeed["rarity"],
  section: HallOfferingSeed["section"],
  effectValue: number,
): HallOfferingSeed {
  return {
    name,
    description,
    type: "recovery_token",
    goldCost,
    rarity,
    section,
    category,
    styleAffinity: "recovery",
    effectValue,
  };
}

function hallStoreItem(
  name: string,
  description: string,
  type: HallOfferingSeed["type"],
  category: string,
  goldCost: number,
  rarity: HallOfferingSeed["rarity"],
  section: HallOfferingSeed["section"],
  styleAffinity: string,
  effectValue = 0,
  levelRequired?: number,
): HallOfferingSeed {
  return {
    name,
    description,
    type,
    goldCost,
    rarity,
    section,
    category,
    styleAffinity,
    effectValue,
    ...(levelRequired ? { levelRequired } : {}),
  };
}

const EXPANDED_HALL_GEAR_OFFERINGS: HallOfferingSeed[] = [
  hallGear("Padded Initiate Cap", "A soft training cap for new adventurers who are still learning how often the road strikes first.", "head", "cloth", 90, "common", "discipline"),
  hallGear("Leather Trail Hood", "Frontier scouts wear hoods like this when rain and branches make helmets a poor bargain.", "head", "leather", 190, "common", "conditioning"),
  hallGear("Iron Kettle Helm", "Plain iron, dented in the old places. It belongs to adventurers who would rather survive than pose.", "head", "metal", 440, "uncommon", "strength"),
  hallGear("Frostveil Fur Hood", "White fur and blue stitching from the northern passes. It marks the wearer as someone who respects cold roads.", "head", "fur", 620, "uncommon", "frost", "daily", 1),
  hallGear("Sunken Pearl Circlet", "A circlet traded through N'Thaloris surface docks. Its pearl never dries, even beside the Hall fire.", "head", "circlet", 980, "rare", "water", "weekly", 2),
  hallGear("Ember Champion Crown", "A red-brass browguard worn after formal trial bouts in the Ember Plains.", "head", "crown", 1280, "rare", "fire", "weekly", 2),
  hallGear("Diamondwake Halo", "A luminous headpiece that bends spell-light into a calm ring behind the wearer.", "head", "halo", 2100, "epic", "light", "raid", 3, 6),

  hallGear("Corded Training Amulet", "A simple cord charm given to recruits who keep showing up after the easy days end.", "neck", "amulet", 120, "common", "discipline"),
  hallGear("Copper Vitality Chain", "A healer's chain stamped with a grain sheaf, a waterskin, and a closed fist.", "neck", "amulet", 310, "uncommon", "recovery"),
  hallGear("Silver Coast Charter Pendant", "A polished pendant used by merchant envoys to prove they have business worth protecting.", "neck", "pendant", 760, "rare", "discipline", "weekly", 2),
  hallGear("Blackstone Oath Torque", "A heavy neck ring from old fortress garrisons. It makes promises feel heavier.", "neck", "torque", 880, "rare", "earth", "weekly", 2),
  hallGear("Leviathan-Touched Locket", "A sealed locket from the Sunken Kingdom. The inside smells faintly of stormwater.", "neck", "locket", 1460, "epic", "water", "raid", 3, 5),

  hallGear("Quilted Shoulder Guards", "Light guards for training yards, caravan roads, and the first few mistakes every adventurer makes.", "shoulders", "cloth", 150, "common", "discipline"),
  hallGear("Leather Ranger Mantle", "A flexible mantle favored by hunters who need to climb, crawl, and keep moving.", "shoulders", "leather", 330, "uncommon", "conditioning"),
  hallGear("Iron Pauldrons", "Plain pauldrons that make no promise except that the first blow will meet metal.", "shoulders", "metal", 640, "uncommon", "strength"),
  hallGear("Emberplate Shoulders", "Wide red plates made to look larger in torchlight and narrower in a duel.", "shoulders", "plate", 1140, "rare", "fire", "weekly", 2),
  hallGear("Mithril Wing Mantle", "A bright mantle from Lumenhall armorers, cut to suggest noble speed rather than brute mass.", "shoulders", "mithril", 1550, "epic", "light", "raid", 3, 5),

  hallGear("Basin Workshirt", "Sturdy village clothing for honest labor, long walks, and chores that become legend only later.", "chest", "clothing", 110, "common", "recovery"),
  hallGear("Frontier Beast-Hide Vest", "Tough hide armor with claw scars left visible as a warning and a boast.", "chest", "leather", 520, "uncommon", "grappling", "daily", 1),
  hallGear("Blackstone Brigandine", "Layered plates under dark cloth, favored by dungeon crews entering old fortress roads.", "chest", "brigandine", 870, "rare", "earth", "weekly", 2),
  hallGear("Ember Plains Cuirass", "A heat-darkened cuirass worn by champions who settle direct problems directly.", "chest", "plate", 1180, "rare", "fire", "weekly", 2),
  hallGear("Tidecourt Robe", "A formal robe from N'Thaloris surface envoys, embroidered with districts no map has shown you yet.", "chest", "robe", 1320, "rare", "water", "weekly", 2),
  hallGear("Mythril Duel Harness", "Light, expensive, and difficult to mistake for common steel. It is armor that expects witnesses.", "chest", "mithril", 1900, "epic", "light", "raid", 3, 6),
  hallGear("Diamond Oath Plate", "Ceremonial armor faceted like a vow. It does not make you invincible; it makes you visible.", "chest", "diamond", 2800, "legendary", "light", "raid", 4, 8),

  hallGear("Practice Bracers", "Cheap bracers for learning the difference between effort and recklessness.", "arms", "cloth", 100, "common", "discipline"),
  hallGear("Rope-Bound Vambraces", "Frontier arm guards wrapped in climbing rope and old field charms.", "arms", "leather", 260, "common", "grappling"),
  hallGear("Iron Forearm Guards", "Blunt iron guards with enough weight to make every carry feel official.", "arms", "metal", 410, "uncommon", "strength"),
  hallGear("Stormrunner Bracers", "Brass rings click softly when the wearer changes pace.", "arms", "storm", 790, "rare", "storm", "weekly", 2),
  hallGear("Frostline Vambraces", "Cold-blue guards used by scouts who tie discipline to breath control.", "arms", "frost", 930, "rare", "frost", "weekly", 2),

  hallGear("Canvas Training Gloves", "Gloves for ropes, bags, cold handles, and first attempts.", "hands", "cloth", 120, "common", "discipline"),
  hallGear("Dockfighter Wraps", "Salt-stained wraps from the Silver Coast, better for footwork than pride.", "hands", "wraps", 290, "uncommon", "striking", "daily", 1),
  hallGear("Grappler's Grip Gloves", "Fingerless gloves used by frontier handlers who prefer control to slaughter.", "hands", "leather", 360, "uncommon", "grappling"),
  hallGear("Blackstone Crusher Gauntlets", "Heavy gauntlets for breaking doors, carrying stones, and reminding monsters what mass means.", "hands", "metal", 920, "rare", "earth", "weekly", 2),
  hallGear("Ember Fist Wraps", "Red wraps used in clan challenge circles where speed and heat blur together.", "hands", "wraps", 880, "rare", "fire", "weekly", 2),

  hallGear("Plain Leather Belt", "A belt with room for chalk, knife, token, and one poor decision.", "waist", "belt", 80, "common", "discipline"),
  hallGear("Provisioner's Sash", "A broad sash with hidden pockets for salts, notes, and little things that keep expeditions alive.", "waist", "sash", 220, "common", "recovery"),
  hallGear("Iron-Buckled Warbelt", "A belt made to hold weight without complaint.", "waist", "belt", 460, "uncommon", "strength"),
  hallGear("Lumenhall Coin Girdle", "A fashionable girdle whose tiny coins mark the wearer as welcome near serious merchants.", "waist", "girdle", 870, "rare", "discipline", "weekly", 2),
  hallGear("Tideglass Waist Chain", "A decorative chain worn by traders who know which docks in N'Thaloris are above water at dusk.", "waist", "chain", 980, "rare", "water", "weekly", 2),

  hallGear("Traveler's Trousers", "Durable trousers patched in places that suggest the previous owner kept walking.", "legs", "clothing", 100, "common", "conditioning"),
  hallGear("Leather Trail Greaves", "Light greaves for underbrush, gravel roads, and the kind of kneeling that happens after hard rounds.", "legs", "leather", 300, "uncommon", "conditioning"),
  hallGear("Iron Legguards", "Heavy guards for adventurers training the lower body to carry more than its own doubt.", "legs", "metal", 620, "uncommon", "strength"),
  hallGear("Verdant Warden Pants", "Green fieldwear from Basin wardens who patrol slowly, consistently, and longer than expected.", "legs", "cloth", 680, "rare", "recovery", "weekly", 2),
  hallGear("Mithril Runner Greaves", "Bright greaves cut thin enough to suggest speed and expensive enough to cause gossip.", "legs", "mithril", 1320, "epic", "storm", "raid", 3, 5),

  hallGear("Village Sandals", "Simple sandals from a village where chores start before sunrise and end when they are done.", "feet", "sandals", 70, "common", "recovery"),
  hallGear("Harbor Road Boots", "Boots made for wet boards, slick stones, and paperwork that somehow becomes danger.", "feet", "boots", 250, "common", "conditioning"),
  hallGear("Iron March Boots", "Heavy boots that make the floor aware of you.", "feet", "metal", 520, "uncommon", "strength"),
  hallGear("Frostveil Climbing Boots", "Spiked boots for cold passes where arrogance becomes a weather condition.", "feet", "frost", 760, "rare", "frost", "weekly", 2),
  hallGear("Stormstep Boots", "Blue-laced boots that seem to arrive half a beat before the rest of you.", "feet", "storm", 1040, "rare", "storm", "weekly", 2),

  hallGear("Hooded Road Cloak", "A dark cloak for being less interesting to rain, guards, and tavern questions.", "cloak", "cloth", 180, "common", "discipline"),
  hallGear("Verdant Healer's Cloak", "A green cloak with herb pockets and a smell of clean water.", "cloak", "cloth", 520, "uncommon", "recovery"),
  hallGear("Silver Envoy Mantle", "A formal mantle cut for negotiation, status, and being seen entering the correct door.", "cloak", "mantle", 920, "rare", "discipline", "weekly", 2),
  hallGear("Shadowgate Cloak", "A dark cloak whose lining shows stars that do not belong above Aethoria.", "cloak", "shadow", 1550, "epic", "shadow", "raid", 3, 6),
  hallGear("Dawnlit Return Cloak", "A pale cloak that glows faintly whenever a Return Stone wakes.", "cloak", "light", 1880, "epic", "light", "raid", 3, 6),

  hallGear("Training Dagger", "A dull dagger for learning lines, angles, and humility.", "weapon", "dagger", 140, "common", "striking"),
  hallGear("Ashwood Wand", "A simple wand that turns focus into a visible spark and little else.", "weapon", "wand", 220, "common", "arcane"),
  hallGear("Frontier Handaxe", "A practical axe for brush, camp work, and the sort of trouble that ignores warnings.", "weapon", "axe", 340, "uncommon", "strength"),
  hallGear("Blackstone Warhammer", "A blunt hammer for problems that stopped caring about elegance centuries ago.", "weapon", "hammer", 760, "rare", "earth", "weekly", 2),
  hallGear("Silver Coast Rapier", "A narrow blade made for quick feet, clean timing, and trouble that must not become scandal.", "weapon", "rapier", 840, "rare", "striking", "weekly", 2),
  hallGear("Frostveil Longbow", "A pale longbow that teaches patience through cold fingers and distant targets.", "weapon", "bow", 900, "rare", "frost", "weekly", 2),
  hallGear("N'Thalorian Coral Staff", "A coral-forged staff crafted with techniques unavailable outside the Sunken Kingdom.", "weapon", "staff", 1720, "epic", "water", "raid", 3, 6),
  hallGear("Emberglass Greatsword", "A broad blade that glows like banked coals when the wielder has earned the heat.", "weapon", "greatsword", 1840, "epic", "fire", "raid", 3, 6),
  hallGear("Mythril Skybow", "A silver bow from merchant-prince collections, too fine to be common and too useful to be only decorative.", "weapon", "bow", 2050, "epic", "light", "raid", 3, 7),
  hallGear("Diamond Starstaff", "A staff crowned with a faceted stone that splits mana into seven patient colors.", "weapon", "staff", 3100, "legendary", "arcane", "raid", 4, 9),

  hallGear("Training Shield Board", "A wooden board with dents arranged like a beginner's education.", "offhand", "shield", 130, "common", "discipline"),
  hallGear("Iron Tower Shield", "A heavy shield that makes every carry feel like a vote for survival.", "offhand", "shield", 700, "uncommon", "strength"),
  hallGear("Harbor Duel Buckler", "A small buckler used on narrow docks where backing up is sometimes impossible.", "offhand", "buckler", 540, "uncommon", "striking", "daily", 1),
  hallGear("Verdant Ward Shield", "A green-painted shield carried by wardens escorting healers through damaged fields.", "offhand", "shield", 880, "rare", "recovery", "weekly", 2),
  hallGear("Tidecourt Mirror Shield", "A polished shield that reflects water even in dry rooms.", "offhand", "shield", 1460, "epic", "water", "raid", 3, 6),

  hallGear("Iron Promise Ring", "A plain ring for adventurers who need fewer promises and more follow-through.", "ring_left", "ring", 180, "common", "discipline"),
  hallGear("Briarwatch Herb Ring", "A small green ring used by Basin healers to remember which hand gathered which herb.", "ring_left", "ring", 410, "uncommon", "recovery"),
  hallGear("Frostmark Ring", "A cold silver ring that tightens slightly when the wearer lies about being fine.", "ring_left", "ring", 760, "rare", "frost", "weekly", 2),
  hallGear("Lumenhall Banker's Signet", "A ring from the Radiant Port, useful anywhere gold speaks before titles.", "ring_right", "ring", 960, "rare", "discipline", "weekly", 2),
  hallGear("Stormcaller's Band", "A blue ring that hums after sprints, footwork, and sudden decisions.", "ring_right", "ring", 920, "rare", "storm", "weekly", 2),
  hallGear("Sovereign-Scarred Band", "A damaged black ring kept under glass until the Hall decides someone can bear the reminder.", "ring_right", "ring", 2100, "epic", "shadow", "raid", 3, 7),

  hallGear("Chipped Focus Stone", "A little focus stone that makes concentration feel heavier in the hand.", "relic", "focus", 160, "common", "arcane"),
  hallGear("Quartermaster's Ledger Charm", "A brass charm stamped with tiny numbers and a warning against skipping meals.", "relic", "charm", 320, "uncommon", "discipline"),
  hallGear("Return Stone Shard", "A shard from an old Return Stone. It cannot teleport you, but it remembers the direction home.", "relic", "stone", 760, "rare", "light", "weekly", 2),
  hallGear("Blackstone Dungeon Key", "A relic key from a fortress door that no longer exists in one piece.", "relic", "key", 1160, "rare", "earth", "weekly", 2),
  hallGear("Tideglass Compass", "A compass that points toward the nearest safe surface, which is not always north.", "relic", "compass", 1500, "epic", "water", "raid", 3, 5),
  hallGear("Ember Plains War Banner", "A small banner charm awarded to those who choose direct work and survive the heat.", "relic", "banner", 1550, "epic", "fire", "raid", 3, 6),
  hallGear("Aethorian Dawn Sigil", "A rare sigil that brightens when the Chronicle records a hard-won week.", "relic", "sigil", 2600, "legendary", "light", "raid", 4, 8),

  hallGear("Faint Blue Aura", "A cosmetic aura like cold breath at sunrise. It changes the battle's mood, not your real strength.", "aura", "effect", 500, "uncommon", "frost", "daily", 0),
  hallGear("Campfire Aura", "A warm cosmetic glow used by adventurers who want their return to look less lonely.", "aura", "effect", 520, "uncommon", "fire", "daily", 0),
  hallGear("Stormwake Aura", "A cosmetic effect that trails faint sparks after quick movement.", "aura", "effect", 980, "rare", "storm", "weekly", 0),
  hallGear("Deepwater Aura", "A slow blue shimmer associated with Tidebound envoys and uncomfortable silences.", "aura", "effect", 1050, "rare", "water", "weekly", 0),
  hallGear("Mythril Dawn Aura", "A bright aura with the expensive restraint of Lumenhall ceremonial magic.", "aura", "effect", 1780, "epic", "light", "raid", 0, 5),
  hallGear("Shadowed Gate Aura", "A cosmetic darkness that gathers at the feet after difficult victories. It marks danger survived, not power bought.", "aura", "effect", 1960, "epic", "shadow", "raid", 0, 6),
  hallGear("Verdant Mercy Aura", "A soft green glow used by healers and wardens after restoration work.", "aura", "effect", 820, "rare", "recovery", "weekly", 0),

  hallGear("Banner of First Return", "A small back-banner for adventurers who came back through the Hall's stones and kept training anyway.", "title", "banner", 420, "uncommon", "discipline", "daily", 0),
  hallGear("Briarwatch Helper's Banner", "A village banner given for carrying medicine, mending fences, and doing the unglamorous work that keeps people alive.", "title", "banner", 540, "uncommon", "recovery", "daily", 0),
  hallGear("Lumenhall Charter Banner", "A silk banner recognized by port clerks, bankers, and guards who prefer proper documents to hero speeches.", "title", "banner", 1120, "rare", "discipline", "weekly", 1),
  hallGear("Frostveil Pass Standard", "A narrow banner stitched with mountain-white thread. It says the wearer has learned respect for distance.", "title", "banner", 1180, "rare", "frost", "weekly", 1),
  hallGear("Ember Trial Pennant", "A red pennant carried by those who survived direct work under a hard sun.", "title", "banner", 1220, "rare", "fire", "weekly", 1),
  hallGear("Tidebound Guest Pennant", "A blue-green pennant that tells N'Thaloris dock guards you have at least been vouched for once.", "title", "banner", 1380, "rare", "water", "weekly", 1),
  hallGear("Blackstone Delver Standard", "A black-and-gold standard for ruin crews who enter old stone knowing not all doors want to open.", "title", "banner", 1600, "epic", "earth", "raid", 1, 5),
  hallGear("Aethoria Rally Standard", "A campaign banner the Hall only releases when the Guild's comeback has begun to feel possible.", "title", "banner", 3200, "legendary", "light", "raid", 2, 8),

  hallGear("Silver Coast Crossbow", "A compact crossbow built for ship rails, alley corners, and diplomatic escorts that go poorly.", "weapon", "crossbow", 980, "rare", "striking", "weekly", 2),
  hallGear("Verdant Shepherd Staff", "A plain staff used by Basin wardens to guide animals, travelers, and stubborn recruits.", "weapon", "staff", 660, "uncommon", "recovery", "daily", 1),
  hallGear("Blackstone Pike", "A long iron pike made for keeping armored things exactly where you can still breathe.", "weapon", "polearm", 1180, "rare", "strength", "weekly", 2),
  hallGear("Sunken Kingdom Trident", "A three-pronged weapon from surface docks above N'Thaloris. Surface folk call it ceremonial until corrected.", "weapon", "trident", 1680, "epic", "water", "raid", 3, 6),
  hallGear("Valecrest Magecoat", "Formal mage clothing from the capital: sober cut, hidden pockets, and runework that pretends not to be expensive.", "chest", "magecoat", 1260, "rare", "arcane", "weekly", 2),
  hallGear("Silver Coast Court Shoes", "Polished shoes made for estates, embassies, and fleeing very politely when negotiations fail.", "feet", "court", 720, "rare", "discipline", "weekly", 1),

  hallConsumable("Field Recovery Tonic", "A bitter tonic for the day after honest effort. It supports recovery in the story, not reckless training.", "consumable:potion", 140, "common", "daily", 40),
  hallConsumable("Basin Sleep Draught", "A non-magical herbal draught in lore: chamomile, mint, and a reminder to stop pretending rest is weakness.", "consumable:potion", 180, "common", "daily", 35),
  hallConsumable("Tidebound Hydration Salts", "Blue salts used before long docks, hot roads, and sessions where thirst arrives too late.", "consumable:provision", 220, "uncommon", "daily", 45),
  hallConsumable("Ember Plains Heat Balm", "A warming balm used after heavy labor. Aldric insists it is not permission to ignore pain.", "consumable:potion", 360, "uncommon", "weekly", 55),
  hallConsumable("Verdant Basin Meal Token", "A provisioning token redeemable in story for bread, stew, and the kind of meal that keeps patrols moving.", "consumable:provision", 300, "uncommon", "weekly", 50),
  hallConsumable("Return Stone Polish", "A tiny ritual kit for cleaning a Return Stone after a completed expedition.", "consumable:utility", 480, "rare", "weekly", 60),
  hallConsumable("Greater Recovery Tonic", "A stronger tonic kept behind the counter for grueling weeks. It supports recovery; it does not excuse ignoring pain.", "consumable:potion", 520, "rare", "weekly", 70),
  hallConsumable("Sunken Electrolyte Phial", "A clear phial from N'Thaloris surface healers, used before long humid routes and low-impact conditioning.", "consumable:potion", 460, "rare", "weekly", 65),
  hallConsumable("Guild Feast Writ", "A writ for one proper meal after a serious commission. The Hall considers recovery part of the work.", "consumable:provision", 740, "epic", "raid", 80),
  hallStoreItem("Scroll of Steady Progression", "A training scroll that reminds the adventurer to add weight only when the ledger proves readiness.", "training_scroll", "scroll:progression", 360, "uncommon", "daily", "discipline"),
  hallStoreItem("Scroll of Deload Wisdom", "A scroll Aldric keeps near the stubborn recruits. It says that backing off can be strategy, not surrender.", "training_scroll", "scroll:recovery", 420, "uncommon", "daily", "recovery"),
  hallStoreItem("Frostveil Endurance Writ", "A conditioning scroll for long roads, thin air, and the humility of sustained effort.", "training_scroll", "scroll:conditioning", 620, "rare", "weekly", "conditioning", 1),
  hallStoreItem("Ember Strength Writ", "A strength scroll for direct work: carry, press, pull, repeat, and leave pride outside the rack.", "training_scroll", "scroll:strength", 640, "rare", "weekly", "strength", 1),
  hallStoreItem("Wild Frontier Control Writ", "A grappling and control scroll for beasts that should be subdued rather than slain.", "training_scroll", "scroll:grappling", 680, "rare", "weekly", "grappling", 1),
  hallStoreItem("Silver Coast Footwork Theme", "A battle-replay theme of lamps, wet dock boards, and quick steps near expensive trouble.", "workout_theme", "theme:battle_replay", 900, "rare", "weekly", "striking"),
  hallStoreItem("Blackstone Dungeon Theme", "A battle-replay theme of old stone, torch smoke, and something heavy moving beyond the door.", "workout_theme", "theme:battle_replay", 1040, "rare", "weekly", "strength"),
];

const HALL_GEAR_OFFERINGS: HallOfferingSeed[] = [
  {
    name: "Wanderer's Linen Tunic",
    description: "Plain travel clothing for a new arrival in Aethoria. It offers no illusion of glory, only a place to begin.",
    type: "equipment_skin",
    goldCost: 75,
    rarity: "common",
    section: "permanent",
    category: "gear:chest:clothing",
    styleAffinity: "discipline",
    effectValue: 0,
  },
  {
    name: "Leather Scout Jerkin",
    description: "Flexible leather armor favored by road scouts and frontier runners. Light enough for long miles.",
    type: "equipment_skin",
    goldCost: 180,
    rarity: "common",
    section: "permanent",
    category: "gear:chest:leather",
    styleAffinity: "conditioning",
    effectValue: 1,
  },
  {
    name: "Iron Hauberk",
    description: "A practical iron mail shirt from the Hall's older armory racks. Heavy work answers heavy threats.",
    type: "equipment_skin",
    goldCost: 420,
    rarity: "uncommon",
    section: "permanent",
    category: "gear:chest:metal",
    styleAffinity: "strength",
    effectValue: 1,
  },
  {
    name: "Apprentice's Travel Robe",
    description: "A dark robe stitched with quiet runes. The cloth responds best to patience, breath, and clean repetition.",
    type: "equipment_skin",
    goldCost: 260,
    rarity: "uncommon",
    section: "permanent",
    category: "gear:chest:robe",
    styleAffinity: "arcane",
    effectValue: 1,
  },
  {
    name: "Mithril Scale Vest",
    description: "A silver-bright vest made for adventurers who must move fast without standing defenseless.",
    type: "equipment_skin",
    goldCost: 950,
    rarity: "rare",
    section: "weekly",
    category: "gear:chest:mithril",
    styleAffinity: "light",
    effectValue: 2,
  },
  {
    name: "Diamondweave Vestment",
    description: "A crystalline ceremonial vestment that bends lamplight into spellwork. Beautiful, strange, and difficult to earn.",
    type: "equipment_skin",
    goldCost: 1600,
    rarity: "epic",
    section: "raid",
    category: "gear:chest:diamondweave",
    styleAffinity: "arcane",
    levelRequired: 5,
    effectValue: 3,
  },
  {
    name: "Iron Longsword",
    description: "A dependable blade with no patience for theatrics. The Hall gives it to those who intend to work.",
    type: "equipment_skin",
    goldCost: 300,
    rarity: "common",
    section: "permanent",
    category: "gear:weapon:sword",
    styleAffinity: "strength",
    effectValue: 1,
  },
  {
    name: "Oak Shortbow",
    description: "A frontier bow suited to steady breathing, clean posture, and a patient eye.",
    type: "equipment_skin",
    goldCost: 260,
    rarity: "common",
    section: "permanent",
    category: "gear:weapon:bow",
    styleAffinity: "conditioning",
    effectValue: 1,
  },
  {
    name: "Hunter's Crossbow",
    description: "A compact crossbow used by caravan guards who know trouble often comes from the treeline.",
    type: "equipment_skin",
    goldCost: 520,
    rarity: "uncommon",
    section: "daily",
    category: "gear:weapon:crossbow",
    styleAffinity: "discipline",
    effectValue: 1,
  },
  {
    name: "Emberstaff",
    description: "A staff warm to the touch. It does not grant fire; it gives shape to effort that already burns.",
    type: "equipment_skin",
    goldCost: 640,
    rarity: "uncommon",
    section: "daily",
    category: "gear:weapon:staff",
    styleAffinity: "fire",
    effectValue: 2,
  },
  {
    name: "Frostglass Staff",
    description: "A pale staff used by healers and wardens near Frostveil. It favors control over force.",
    type: "equipment_skin",
    goldCost: 880,
    rarity: "rare",
    section: "weekly",
    category: "gear:weapon:staff",
    styleAffinity: "frost",
    effectValue: 2,
  },
  {
    name: "Stormbound Spear",
    description: "A spear with brass rings along its haft. It hums after long runs and sharp footwork.",
    type: "equipment_skin",
    goldCost: 920,
    rarity: "rare",
    section: "weekly",
    category: "gear:weapon:spear",
    styleAffinity: "storm",
    effectValue: 2,
  },
  {
    name: "Warden's Buckler",
    description: "A small shield for those who prefer surviving the second strike to boasting after the first.",
    type: "equipment_skin",
    goldCost: 220,
    rarity: "common",
    section: "permanent",
    category: "gear:offhand:shield",
    styleAffinity: "recovery",
    effectValue: 0,
  },
  {
    name: "Wayfarer's Boots",
    description: "Road-worn boots that remember every mile. They are humble, which makes them honest.",
    type: "equipment_skin",
    goldCost: 160,
    rarity: "common",
    section: "permanent",
    category: "gear:feet:clothing",
    styleAffinity: "conditioning",
    effectValue: 0,
  },
  {
    name: "Iron Gauntlets",
    description: "Plain gauntlets for carries, grips, and anything that refuses to move when asked politely.",
    type: "equipment_skin",
    goldCost: 360,
    rarity: "uncommon",
    section: "permanent",
    category: "gear:hands:metal",
    styleAffinity: "strength",
    effectValue: 1,
  },
  {
    name: "Acolyte's Wraps",
    description: "Soft hand wraps marked with low spellwork. They steady the hands before difficult practice.",
    type: "equipment_skin",
    goldCost: 240,
    rarity: "uncommon",
    section: "daily",
    category: "gear:hands:cloth",
    styleAffinity: "arcane",
    effectValue: 1,
  },
  {
    name: "Traveler's Weathercloak",
    description: "A cloak for rain, dust, and the long road between things you understand.",
    type: "equipment_skin",
    goldCost: 200,
    rarity: "common",
    section: "permanent",
    category: "gear:cloak:cloth",
    styleAffinity: "discipline",
    effectValue: 0,
  },
  {
    name: "Tideglass Ring",
    description: "Common among merchants conducting business near N'Thaloris. The sea means something different there.",
    type: "equipment_skin",
    goldCost: 480,
    rarity: "uncommon",
    section: "daily",
    category: "gear:ring_left:ring",
    styleAffinity: "water",
    effectValue: 1,
  },
  {
    name: "Ember Signet",
    description: "A red-gold ring carried by messengers crossing the Ember Plains. It holds warmth without comfort.",
    type: "equipment_skin",
    goldCost: 620,
    rarity: "rare",
    section: "weekly",
    category: "gear:ring_right:ring",
    styleAffinity: "fire",
    effectValue: 2,
  },
  {
    name: "Novice Focus",
    description: "A simple focus charm for adventurers whose discipline is beginning to look like magic.",
    type: "equipment_skin",
    goldCost: 300,
    rarity: "common",
    section: "permanent",
    category: "gear:relic:focus",
    styleAffinity: "arcane",
    effectValue: 1,
  },
  {
    name: "Minor Recovery Potion",
    description: "A bitter red draught for after hard work. It restores health, not pride.",
    type: "recovery_token",
    goldCost: 90,
    rarity: "common",
    section: "permanent",
    category: "consumable:potion",
    styleAffinity: "recovery",
    effectValue: 30,
  },
  ...EXPANDED_HALL_GEAR_OFFERINGS,
];

function storeSlotFromCategory(category?: string | null) {
  if (!category?.startsWith("gear:")) return null;
  const [, slot] = category.split(":");
  const normalized: Record<string, string> = {
    aura: "aura_cosmetic",
    aura_effect: "aura_cosmetic",
    cosmetic: "aura_cosmetic",
    banner: "title",
    main_hand: "weapon",
    off_hand: "offhand",
    back: "cloak",
    helmet: "head",
    necklace: "neck",
    gloves: "hands",
    boots: "feet",
    armor: "chest",
  };
  return normalized[slot ?? ""] ?? slot ?? null;
}

function isGearOffering(item: typeof storeItemsTable.$inferSelect) {
  return item.type === "equipment_skin" && Boolean(storeSlotFromCategory(item.category));
}

function elementalAffinityFor(item: Pick<typeof storeItemsTable.$inferSelect, "styleAffinity" | "category">) {
  const affinity = (item.styleAffinity ?? "").toLowerCase();
  const map: Record<string, string> = {
    strength: "earth",
    conditioning: "storm",
    discipline: "arcane",
    grappling: "physical",
    striking: "fire",
    recovery: "water",
    arcane: "arcane",
    fire: "fire",
    frost: "frost",
    storm: "storm",
    water: "water",
    light: "light",
    shadow: "shadow",
  };
  return map[affinity] ?? "physical";
}

function iconKeyFor(slot?: string | null, affinity?: string | null) {
  if (!slot) return "package";
  if (slot === "weapon") return affinity === "arcane" || affinity === "fire" || affinity === "frost" ? "staff" : "sword";
  if (slot === "offhand") return "shield";
  if (slot === "chest") return "armor";
  if (slot === "hands") return "gloves";
  if (slot === "feet") return "boots";
  if (slot === "cloak") return "cloak";
  if (slot?.startsWith("ring")) return "ring";
  if (slot === "relic") return "relic";
  if (slot === "title") return "banner";
  if (slot === "aura_cosmetic") return "aura";
  return slot;
}

function layerOrderFor(slot?: string | null) {
  const order: Record<string, number> = {
    cloak: 5,
    feet: 10,
    legs: 20,
    chest: 30,
    hands: 40,
    offhand: 50,
    weapon: 60,
    relic: 70,
    title: 75,
    aura_cosmetic: 76,
    ring_left: 80,
    ring_right: 81,
  };
  return order[slot ?? ""] ?? 0;
}

function gearFlavorForItem(item: Pick<typeof storeItemsTable.$inferSelect, "name" | "styleAffinity" | "category">, elementalAffinity: string) {
  const name = item.name.toLowerCase();
  if (name.includes("tideglass")) return "tideglass caught the light, and coastal merchants treated you as someone who understood old sea customs.";
  if (name.includes("ember")) return "embers stirred along the equipment, lending your movements the look of Ember Plains resolve.";
  if (name.includes("frost")) return "cold mana settled into your stance, making each controlled breath look deliberate.";
  if (name.includes("mithril")) return "mithril flashed like a noble charter, opening doors that plain iron would not.";
  if (name.includes("diamondweave")) return "diamondweave bent spell-light around your silhouette, making your discipline look almost ceremonial.";
  if (name.includes("banner") || name.includes("standard") || name.includes("pennant")) return "your banner changed how witnesses remembered the expedition, turning a workout into a public mark in the Chronicle.";
  if (name.includes("aura")) return "the aura changed the color of the battle around you, adding atmosphere without pretending to change your real body.";
  if (name.includes("robe") || name.includes("focus") || elementalAffinity === "arcane") return "quiet runes answered your focus, changing the shape of your aura before the strike landed.";
  if (name.includes("bow") || name.includes("crossbow") || name.includes("trident") || name.includes("pike")) return "your equipment marked you as road-capable, the sort of adventurer caravans prefer to hire twice.";
  if (name.includes("leather") || name.includes("cloak") || name.includes("boots")) return "travel-worn gear made you look native to the road, not merely dropped upon it.";
  if (name.includes("iron")) return "iron weight gave your silhouette the blunt authority of someone used to hard labor.";
  return `${elementalAffinity} affinity gathered around your equipped gear, altering the story of the exchange.`;
}

function regionModifierTagsForItem(
  item: Pick<typeof storeItemsTable.$inferSelect, "name" | "styleAffinity" | "category">,
  elementalAffinity: string,
) {
  const name = item.name.toLowerCase();
  const tags: string[] = [`affinity:${elementalAffinity}`, `aura:${elementalAffinity}`, "gear_effect:narrative_first"];
  const addRegion = (region: string, percent = 2) => {
    tags.push(`local_attire:${region}`);
    tags.push(`regional_gold_bonus:${region}:${percent}`);
  };

  if (name.includes("frost")) addRegion("frostveil_peaks", 3);
  if (name.includes("ember")) addRegion("ember_plains", 3);
  if (name.includes("blackstone")) addRegion("blackstone_highlands", 3);
  if (name.includes("verdant") || name.includes("briarwatch")) addRegion("verdant_basin", 3);
  if (name.includes("lumenhall") || name.includes("silver coast")) addRegion("silver_coast", 3);
  if (name.includes("tideglass")) {
    addRegion("sunken_kingdom", 3);
    addRegion("silver_coast", 2);
  }
  if (name.includes("sunken") || name.includes("n'")) addRegion("sunken_kingdom", 3);
  if (name.includes("mithril") || name.includes("diamondweave")) {
    addRegion("silver_coast", 3);
    addRegion("valecrest", 2);
  }
  if (name.includes("iron") || name.includes("buckler")) {
    addRegion("blackstone_highlands", 2);
    addRegion("ember_plains", 1);
  }
  if (name.includes("leather") || name.includes("bow") || name.includes("crossbow")) {
    addRegion("wild_frontier", 2);
    addRegion("silver_coast", 1);
  }
  if (name.includes("cloak") || name.includes("boots")) {
    addRegion("verdant_basin", 1);
    addRegion("silver_coast", 1);
  }
  if (name.includes("robe") || name.includes("focus")) {
    addRegion("valecrest", 2);
  }

  return [...new Set(tags)];
}

function toStoreClientItem(item: typeof storeItemsTable.$inferSelect) {
  return {
    ...item,
    slot: storeSlotFromCategory(item.category),
    elementalAffinity: elementalAffinityFor(item),
    isGear: isGearOffering(item),
    createdAt: item.createdAt?.toISOString?.(),
  };
}

export async function ensureHallOfferingCatalog() {
  const names = HALL_GEAR_OFFERINGS.map((item) => item.name);
  const existing = await db.select({ name: storeItemsTable.name })
    .from(storeItemsTable)
    .where(inArray(storeItemsTable.name, names));
  const existingNames = new Set(existing.map((item) => item.name));
  const missing = HALL_GEAR_OFFERINGS.filter((item) => !existingNames.has(item.name));
  if (missing.length > 0) {
    await db.insert(storeItemsTable).values(missing);
  }
}

function loreForItem(item: typeof storeItemsTable.$inferSelect) {
  if (item.description.length > 12) return item.description;
  return `The Hall revealed ${item.name} from a shelf that was empty a moment before. Aldric says useful things prefer useful hands.`;
}

router.get("/inventory", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const [items, gear] = await Promise.all([
      db.select({
      id: playerInventoryTable.id,
      itemId: playerInventoryTable.itemId,
      quantity: playerInventoryTable.quantity,
      equipped: playerInventoryTable.equipped,
      itemName: storeItemsTable.name,
      itemType: storeItemsTable.type,
      rarity: storeItemsTable.rarity,
      description: storeItemsTable.description,
      category: storeItemsTable.category,
      styleAffinity: storeItemsTable.styleAffinity,
    })
    .from(playerInventoryTable)
    .innerJoin(storeItemsTable, eq(playerInventoryTable.itemId, storeItemsTable.id))
        .where(eq(playerInventoryTable.playerId, player.id)),
      db.select().from(rpgGearTable).where(eq(rpgGearTable.playerId, player.id)),
    ]);

    res.json([
      ...items.map((item) => ({
        ...item,
        name: item.itemName,
        displayName: item.itemName,
        slot: null,
        isGear: false,
      })),
      ...gear.map((item) => ({
        id: item.id,
        itemId: null,
        quantity: 1,
        equipped: item.equipped,
        itemName: item.name,
        name: item.name,
        displayName: item.displayName ?? item.name,
        itemType: "gear",
        rarity: item.rarity,
        description: item.loreText ?? item.flavorText,
        category: item.slot,
        slot: item.slot,
        styleAffinity: item.affinity,
        elementalAffinity: item.elementalAffinity,
        loreText: item.loreText,
        statBonuses: item.statBonuses,
        source: item.source,
        iconKey: item.iconKey,
        mannequinLayerUrl: item.mannequinLayerUrl,
        mannequinLayerKey: item.mannequinLayerKey,
        layerOrder: item.layerOrder,
        isGear: true,
      })),
    ]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get inventory" });
  }
});

router.post("/inventory/:id/use", async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.id);
    const { player, stats } = await getOrCreatePlayer(req.userId);

    const [item] = await db.select({
      inv: playerInventoryTable,
      store: storeItemsTable,
    })
    .from(playerInventoryTable)
    .innerJoin(storeItemsTable, eq(playerInventoryTable.itemId, storeItemsTable.id))
    .where(eq(playerInventoryTable.id, inventoryId));

    if (!item) return void res.status(404).json({ error: "Item not found" });
    if (item.inv.quantity <= 0) return void res.status(400).json({ error: "No items remaining" });

    let message = `Used ${item.store.name}`;
    let updatedPlayer = player;

    if (item.store.type === "recovery_token") {
      const [up] = await db.update(playerTable)
        .set({ hp: Math.min(player.maxHp, player.hp + 30), updatedAt: new Date() })
        .where(eq(playerTable.id, player.id))
        .returning();
      updatedPlayer = up;
      message = "Recovery Token used. HP restored by 30.";
    } else if (item.store.type === "streak_shield") {
      message = "Streak Shield activated. Your streak is protected for 1 day.";
    } else if (item.store.type === "deload_pass") {
      const [up] = await db.update(playerTable)
        .set({ mp: player.maxMp, updatedAt: new Date() })
        .where(eq(playerTable.id, player.id))
        .returning();
      updatedPlayer = up;
      message = "Deload Pass used. MP fully restored.";
    } else if (item.store.type === "reward_box") {
      const bonus = Math.floor(Math.random() * 200) + 50;
      const [up] = await db.update(playerTable)
        .set({ gold: player.gold + bonus, updatedAt: new Date() })
        .where(eq(playerTable.id, player.id))
        .returning();
      updatedPlayer = up;
      message = `Reward Box opened! Received ${bonus} Gold.`;
    }

    // Decrement quantity
    if (item.inv.quantity <= 1) {
      await db.delete(playerInventoryTable).where(eq(playerInventoryTable.id, inventoryId));
    } else {
      await db.update(playerInventoryTable)
        .set({ quantity: item.inv.quantity - 1 })
        .where(eq(playerInventoryTable.id, inventoryId));
    }

    res.json({
      success: true,
      message,
      player: buildPlayerResponse(updatedPlayer, stats),
      bonusReward: item.store.type === "reward_box" ? message : null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to use item" });
  }
});

router.get("/store/items", async (req, res) => {
  try {
    await ensureHallOfferingCatalog();
    const items = await db.select().from(storeItemsTable).where(eq(storeItemsTable.available, true));
    res.json(items.filter(isLaunchStoreItem).map(toStoreClientItem));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get store items" });
  }
});

const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];

router.get("/store/sections", async (req, res) => {
  try {
    await ensureHallOfferingCatalog();
    const { player } = await getOrCreatePlayer(req.userId);
    const allItems = (await db.select().from(storeItemsTable).where(eq(storeItemsTable.available, true)))
      .filter(isLaunchStoreItem);

    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const weekOfYear = Math.floor(dayOfYear / 7);

    const fmt = (item: typeof allItems[0]) => ({
      ...toStoreClientItem(item),
      meetsRequirements:
        (!item.levelRequired || player.level >= item.levelRequired) &&
        (!item.rankRequired || RANK_ORDER.indexOf(player.rank ?? "E") >= RANK_ORDER.indexOf(item.rankRequired)),
    });

    const dailyPool = allItems.filter(i => i.section === "daily");
    const weeklyPool = allItems.filter(i => i.section === "weekly");

    const rotate = <T>(arr: T[], offset: number, count: number): T[] => {
      if (arr.length === 0) return [];
      const start = offset % arr.length;
      return [...arr.slice(start), ...arr.slice(0, start)].slice(0, count);
    };

    res.json({
      hall: {
        title: "The Hall's Offerings",
        lore: "The Hall is no mere shop. Aldric once faced the thing beneath its stones, bound it with mercy instead of pride, and now it reveals tools for adventurers who keep returning.",
      },
      permanent: allItems.filter(i => i.section === "permanent").map(fmt),
      daily: rotate(dailyPool, dayOfYear, 5).map(fmt),
      weekly: rotate(weeklyPool, weekOfYear, 6).map(fmt),
      raid: allItems.filter(i => i.section === "raid").map(fmt),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get store sections" });
  }
});

router.post("/store/purchase", async (req, res) => {
  try {
    const { itemId, quantity = 1 } = req.body;
    const { player, stats } = await getOrCreatePlayer(req.userId);

    const [item] = await db.select().from(storeItemsTable).where(eq(storeItemsTable.id, itemId));
    if (!item) return void res.status(404).json({ error: "Item not found" });
    if (!item.available) return void res.status(400).json({ error: "Item not available" });
    if (!isLaunchStoreItem(item)) {
      return void res.status(400).json({ error: "This item is not available in the launch store" });
    }

    const totalCost = item.goldCost * quantity;
    if (player.gold < totalCost) {
      return void res.status(400).json({ error: "Insufficient gold" });
    }

    const [updatedPlayer] = await db.update(playerTable)
      .set({ gold: player.gold - totalCost, updatedAt: new Date() })
      .where(eq(playerTable.id, player.id))
      .returning();

    let gearCreated = 0;
    if (isGearOffering(item)) {
      const slot = storeSlotFromCategory(item.category)!;
      const elementalAffinity = elementalAffinityFor(item);
      const rows = Array.from({ length: quantity }, () => ({
        playerId: player.id,
        name: item.name,
        displayName: item.name,
        slot: slot as any,
        rarity: item.rarity,
        iconKey: iconKeyFor(slot, elementalAffinity),
        layerOrder: layerOrderFor(slot),
        statBonuses: {},
        flavorText: item.description,
        loreText: loreForItem(item),
        source: "The Hall's Offerings",
        affinity: item.styleAffinity ?? elementalAffinity,
        elementalAffinity,
        narrativeModifiers: [
          gearFlavorForItem(item, elementalAffinity),
          ...regionModifierTagsForItem(item, elementalAffinity),
          `material:${item.category.split(":")[2] ?? "standard"}`,
          "stat_impact:marginal",
        ],
        xpBonusPercent: Math.max(0, Math.min(item.effectValue ?? 0, 3)),
        cosmeticKey: iconKeyFor(slot, elementalAffinity),
        cosmeticVariant: item.category.split(":")[2] ?? elementalAffinity,
        equipped: false,
      }));
      await db.insert(rpgGearTable).values(rows);
      gearCreated = rows.length;
    } else {
      const existing = await db.select().from(playerInventoryTable)
        .where(and(eq(playerInventoryTable.playerId, player.id), eq(playerInventoryTable.itemId, itemId)));

      if (existing.length > 0) {
        await db.update(playerInventoryTable)
          .set({ quantity: existing[0].quantity + quantity })
          .where(eq(playerInventoryTable.id, existing[0].id));
      } else {
        await db.insert(playerInventoryTable).values({
          playerId: player.id,
          itemId,
          quantity,
          equipped: false,
        });
      }
    }

    await db.insert(itemDiscoveriesTable).values({
      playerId: player.id,
      itemId: item.id,
      itemName: item.name,
      rarity: item.rarity,
      category: item.category,
      sourceType: "hall_offering",
      sourceLabel: "The Hall's Offerings",
      loreText: loreForItem(item),
      currentState: "owned",
    }).onConflictDoUpdate({
      target: [itemDiscoveriesTable.playerId, itemDiscoveriesTable.itemName, itemDiscoveriesTable.sourceType],
      set: { currentState: "owned", updatedAt: new Date() },
    });

    res.json({
      success: true,
      message: `Purchased ${item.name} x${quantity}`,
      goldSpent: totalCost,
      remainingGold: updatedPlayer.gold,
      gearCreated,
      player: buildPlayerResponse(updatedPlayer, stats),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to purchase item" });
  }
});

router.post("/inventory/:id/sell", async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.id);
    const { player, stats } = await getOrCreatePlayer(req.userId);
    const [item] = await db.select({ inv: playerInventoryTable, store: storeItemsTable })
      .from(playerInventoryTable)
      .innerJoin(storeItemsTable, eq(playerInventoryTable.itemId, storeItemsTable.id))
      .where(and(eq(playerInventoryTable.id, inventoryId), eq(playerInventoryTable.playerId, player.id)));
    if (!item) return void res.status(404).json({ error: "Item not found" });
    const quantity = Math.max(1, Number(req.body?.quantity ?? 1));
    const sold = Math.min(quantity, item.inv.quantity);
    const goldReturned = Math.max(1, Math.floor(item.store.goldCost * 0.25)) * sold;
    const [updatedPlayer] = await db.update(playerTable)
      .set({ gold: player.gold + goldReturned, updatedAt: new Date() })
      .where(eq(playerTable.id, player.id))
      .returning();
    if (item.inv.quantity <= sold) {
      await db.delete(playerInventoryTable).where(eq(playerInventoryTable.id, inventoryId));
    } else {
      await db.update(playerInventoryTable)
        .set({ quantity: item.inv.quantity - sold })
        .where(eq(playerInventoryTable.id, inventoryId));
    }
    await db.insert(itemDiscoveriesTable).values({
      playerId: player.id,
      itemId: item.store.id,
      itemName: item.store.name,
      rarity: item.store.rarity,
      category: item.store.category,
      sourceType: "hall_offering",
      sourceLabel: "The Hall's Offerings",
      loreText: loreForItem(item.store),
      currentState: "sold",
    }).onConflictDoUpdate({
      target: [itemDiscoveriesTable.playerId, itemDiscoveriesTable.itemName, itemDiscoveriesTable.sourceType],
      set: { currentState: "sold", updatedAt: new Date() },
    });
    res.json({
      success: true,
      message: `Sold ${item.store.name} x${sold}. The Chronicle keeps its discovery record.`,
      goldReceived: goldReturned,
      player: buildPlayerResponse(updatedPlayer, stats),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to sell item" });
  }
});

export default router;
