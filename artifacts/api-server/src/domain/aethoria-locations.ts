export type AethoriaLocation = {
  key: string;
  name: string;
  kind: "city" | "town" | "village" | "gate" | "ruin" | "wilds";
  realm: string;
  region: string;
  primaryFaction: string;
  distanceFromGuildHallMiles: number;
  knownAtStart: boolean;
  summary: string;
  bestFor: string[];
};

export type RegionTrainingIdentity = {
  regionId: string;
  regionName: string;
  theme: string[];
  trainingStyles: string[];
  briefingTone: string;
  knownAtStart: boolean;
};

export type CommissionCompletionPath = {
  id: string;
  label: string;
  kind: "workout_builder" | "template" | "program" | "steps" | "nutrition" | "recovery";
  intendedStyle: string;
  completionPath: string;
  narrative: string;
  recommended?: boolean;
};

export type CommissionExpeditionDetail = {
  commissionTitle: string;
  region: RegionTrainingIdentity;
  narrativeBriefing: string;
  threat: string;
  recommendedPath: CommissionCompletionPath;
  alternativePaths: CommissionCompletionPath[];
  travelMethod: string;
  returnStoneNote: string;
  realWorldAction: string;
  aldricReason: string;
};

export type CommissionTravelPlan = {
  location: AethoriaLocation;
  continentSquareMiles: number;
  onFootMiles: number;
  caravanMiles: number;
  mountMiles: number;
  returnStoneMiles: number;
  routeNote: string;
  narrativeReason: string;
  travelMethod: string;
};

export const REGION_TRAINING_IDENTITIES: Record<string, RegionTrainingIdentity> = {
  "Frostveil Peaks": {
    regionId: "frostveil-peaks",
    regionName: "Frostveil Peaks",
    theme: ["cold", "altitude", "mountain travel", "survival", "endurance"],
    trainingStyles: ["conditioning", "walking", "zone_2", "mobility"],
    briefingTone: "Frostveil does not forgive arrogance. The pass tests lungs before it tests blades.",
    knownAtStart: false,
  },
  Frostvale: {
    regionId: "frostvale",
    regionName: "Frostvale",
    theme: ["cold", "discipline", "outposts", "winter roads"],
    trainingStyles: ["conditioning", "walking", "mobility"],
    briefingTone: "Frostvale measures discipline by who keeps moving when the air bites back.",
    knownAtStart: false,
  },
  "Silver Coast": {
    regionId: "silver-coast",
    regionName: "Silver Coast",
    theme: ["wealth", "trade", "harbors", "diplomacy", "long roads"],
    trainingStyles: ["walking", "mobility", "light_conditioning", "nutrition", "active_recovery"],
    briefingTone: "The road is safe enough for fools to call it safe, which is precisely when trouble comes.",
    knownAtStart: false,
  },
  "The Ember Plains": {
    regionId: "ember-plains",
    regionName: "Ember Plains",
    theme: ["heat", "open battlefields", "clans", "fire", "hard labor"],
    trainingStyles: ["strength", "hypertrophy", "progressive_overload", "lower_body"],
    briefingTone: "Heat rolls across the Ember Plains like a living thing. Direct work answers direct threats.",
    knownAtStart: false,
  },
  "The Wild Frontier": {
    regionId: "wild-frontier",
    regionName: "Wild Frontier",
    theme: ["wilderness", "hunters", "beasts", "frontier settlements", "survival"],
    trainingStyles: ["grappling", "functional_strength", "carries", "bodyweight", "mixed_conditioning"],
    briefingTone: "The frontier rewards control. Not every creature must be slain to end a threat.",
    knownAtStart: true,
  },
  "The Sunken Kingdom": {
    regionId: "sunken-kingdom",
    regionName: "Sunken Kingdom",
    theme: ["underwater districts", "Tidebound Courts", "mystery", "breath", "adaptation"],
    trainingStyles: ["recovery", "mobility", "breathing", "low_impact_cardio", "core_stability"],
    briefingTone: "N'Thaloris receives few surface adventurers. The docks are open; trust is not.",
    knownAtStart: false,
  },
  "Blackstone Highlands": {
    regionId: "blackstone-highlands",
    regionName: "Blackstone Highlands",
    theme: ["ruins", "heavy stone", "old fortresses", "dungeons", "resilience"],
    trainingStyles: ["heavy_strength", "loaded_carries", "posterior_chain", "grip", "boss_prep"],
    briefingTone: "Blackstone does not ask for elegance. It asks whether you can move what refuses to move.",
    knownAtStart: false,
  },
  "Verdant Basin": {
    regionId: "verdant-basin",
    regionName: "Verdant Basin",
    theme: ["farmland", "medicine", "herbs", "villages", "restoration"],
    trainingStyles: ["recovery", "mobility", "walking", "nutrition", "hydration", "beginner_friendly"],
    briefingTone: "The Basin teaches that consistency can heal more than steel can break.",
    knownAtStart: true,
  },
  Valecrest: {
    regionId: "valecrest",
    regionName: "Valecrest",
    theme: ["guild roads", "patrols", "training grounds", "city approaches"],
    trainingStyles: ["training", "recovery", "conditioning"],
    briefingTone: "Near the Hall, small duties become the proof that larger ones can be trusted.",
    knownAtStart: true,
  },
};

export const AETHORIA_LOCATIONS: AethoriaLocation[] = [
  {
    key: "frostgate-pass",
    name: "Frostgate Pass",
    kind: "gate",
    realm: "Frostveil Mountain Holds",
    region: "Frostveil Peaks",
    primaryFaction: "Frostveil Wardens",
    distanceFromGuildHallMiles: 910,
    knownAtStart: false,
    summary: "A high-altitude pass where caravans vanish when Gate pressure rises.",
    bestFor: ["conditioning", "exploration", "mobility"],
  },
  {
    key: "snowbound-outpost",
    name: "Snowbound Outpost",
    kind: "town",
    realm: "Frostvale March",
    region: "Frostvale",
    primaryFaction: "Winter Road Compact",
    distanceFromGuildHallMiles: 840,
    knownAtStart: false,
    summary: "A remote cold-weather outpost where supply carries matter more than bravado.",
    bestFor: ["conditioning", "recovery", "exploration"],
  },
  {
    key: "valecrest-outskirts",
    name: "Valecrest Outskirts",
    kind: "wilds",
    realm: "Valecrest Crownlands",
    region: "Valecrest",
    primaryFaction: "Valecrest Adventurer's Guild",
    distanceFromGuildHallMiles: 12,
    knownAtStart: true,
    summary: "Training roads, watch posts, and Guild patrol routes just beyond the city walls.",
    bestFor: ["training", "recovery", "conditioning", "penalty_restoration"],
  },
  {
    key: "briarwatch",
    name: "Briarwatch",
    kind: "village",
    realm: "Freeholds of the Verdant Basin",
    region: "Verdant Basin",
    primaryFaction: "Basin Wardens",
    distanceFromGuildHallMiles: 96,
    knownAtStart: true,
    summary: "A farming village on the western road where supply ledgers often go missing.",
    bestFor: ["conditioning", "nutrition", "exploration", "story_linked"],
  },
  {
    key: "galehollow",
    name: "Galehollow",
    kind: "town",
    realm: "Silver Coast Merchant Republics",
    region: "Silver Coast",
    primaryFaction: "Chartered Road Companies",
    distanceFromGuildHallMiles: 418,
    knownAtStart: false,
    summary: "A trade-road town known to the Guild, but not yet fully charted in the player's Chronicle.",
    bestFor: ["conditioning", "skill_practice", "exploration"],
  },
  {
    key: "lumenhall",
    name: "Lumenhall",
    kind: "city",
    realm: "Silver Coast Merchant Republics",
    region: "Silver Coast",
    primaryFaction: "Lumenhall Banking Houses",
    distanceFromGuildHallMiles: 760,
    knownAtStart: false,
    summary: "The Radiant Port, wealthiest trade city in Aethoria.",
    bestFor: ["nutrition", "story_linked", "skill_practice"],
  },
  {
    key: "port-aurelien",
    name: "Port Aurelien",
    kind: "city",
    realm: "Principality of Port Aurelien",
    region: "Silver Coast",
    primaryFaction: "Aurelien Diplomatic Court",
    distanceFromGuildHallMiles: 835,
    knownAtStart: false,
    summary: "Crown of the Coast, a city of noble estates, embassies, and coastal fortifications.",
    bestFor: ["story_linked", "training", "skill_practice"],
  },
  {
    key: "thornfield-way",
    name: "Thornfield Way",
    kind: "wilds",
    realm: "Frontier Marches",
    region: "The Wild Frontier",
    primaryFaction: "Frontier Rangers",
    distanceFromGuildHallMiles: 185,
    knownAtStart: true,
    summary: "A rough frontier road where scouts earn every mile.",
    bestFor: ["conditioning", "grappling", "training", "penalty_restoration"],
  },
  {
    key: "emberford",
    name: "Emberford",
    kind: "town",
    realm: "Ember Plains Clans",
    region: "The Ember Plains",
    primaryFaction: "Ashroad Caravan Compact",
    distanceFromGuildHallMiles: 470,
    knownAtStart: false,
    summary: "A hard road through dry wind and old battle smoke.",
    bestFor: ["training", "conditioning", "story_linked"],
  },
  {
    key: "blackstone-keep",
    name: "Blackstone Keep",
    kind: "ruin",
    realm: "Blackstone Highlands",
    region: "Blackstone Highlands",
    primaryFaction: "Highland Garrison Remnants",
    distanceFromGuildHallMiles: 520,
    knownAtStart: false,
    summary: "A ruined fortress of heavy stone, old armor, and dungeon scars.",
    bestFor: ["training", "strength", "story_linked"],
  },
  {
    key: "whitecap-shrine",
    name: "Whitecap Shrine",
    kind: "ruin",
    realm: "Silver Coast Merchant Republics",
    region: "Silver Coast",
    primaryFaction: "Coastal Shrine Keepers",
    distanceFromGuildHallMiles: 690,
    knownAtStart: false,
    summary: "A half-charted shrine on the sea road, mostly known through item lore.",
    bestFor: ["recovery", "mobility", "exploration"],
  },
  {
    key: "ntaloris-surface-docks",
    name: "N'Thaloris Surface Docks",
    kind: "city",
    realm: "The Sunken Kingdom",
    region: "The Sunken Kingdom",
    primaryFaction: "N'Thaloris Tidebound Courts",
    distanceFromGuildHallMiles: 1180,
    knownAtStart: false,
    summary: "The visible docks of a city the surface does not truly understand.",
    bestFor: ["story_linked", "nutrition", "exploration"],
  },
];

function scoreLocation(location: AethoriaLocation, category: string, seed: number) {
  const categoryScore = location.bestFor.includes(category) ? 12 : 0;
  const startScore = location.knownAtStart ? 4 : 0;
  const styleForCategory: Record<string, string[]> = {
    training: ["strength", "heavy_strength", "hypertrophy"],
    conditioning: ["conditioning", "walking", "zone_2"],
    recovery: ["recovery", "mobility", "active_recovery"],
    mobility: ["mobility", "recovery"],
    grappling: ["grappling", "functional_strength"],
    skill_practice: ["striking", "walking", "mobility"],
    nutrition: ["nutrition", "recovery"],
    story_linked: ["boss_prep", "heavy_strength", "walking"],
    penalty_restoration: ["walking", "conditioning", "recovery"],
    exploration: ["walking", "conditioning", "mixed_conditioning"],
  };
  const region = REGION_TRAINING_IDENTITIES[location.region];
  const regionStyleScore = region?.trainingStyles.some((style) => (styleForCategory[category] ?? []).includes(style)) ? 8 : 0;
  const distanceFit = category === "conditioning"
    ? Math.max(0, 8 - Math.abs(location.distanceFromGuildHallMiles - 140) / 45)
    : category === "recovery"
      ? Math.max(0, 8 - location.distanceFromGuildHallMiles / 35)
      : Math.max(0, 8 - Math.abs(location.distanceFromGuildHallMiles - 420) / 120);
  return categoryScore + regionStyleScore + startScore + distanceFit + ((seed + location.key.length) % 5);
}

export function chooseCommissionLocation(category: string, seed: number, locations: AethoriaLocation[] = AETHORIA_LOCATIONS): AethoriaLocation {
  const source = locations.length ? locations : AETHORIA_LOCATIONS;
  return [...source]
    .sort((a, b) => scoreLocation(b, category, seed) - scoreLocation(a, category, seed))[0] ?? AETHORIA_LOCATIONS[0];
}

export function buildCommissionTravelPlan(category: string, location: AethoriaLocation): CommissionTravelPlan {
  const distance = location.distanceFromGuildHallMiles;
  const cardioHeavy = category === "conditioning" || category === "exploration" || category === "penalty_restoration";
  const recovery = category === "recovery" || category === "mobility";
  const activeFieldMiles = cardioHeavy
    ? Math.min(13.5, Math.max(3.5, distance * 0.055))
    : recovery
      ? Math.min(2.5, Math.max(0.6, distance * 0.012))
      : Math.min(6, Math.max(1.2, distance * 0.018));
  const mountMiles = Math.round(Math.min(distance * 0.24, cardioHeavy ? 38 : recovery ? 24 : 80) * 10) / 10;
  const onFootMiles = Math.round(activeFieldMiles * 10) / 10;
  const caravanMiles = Math.max(0, Math.round((distance - onFootMiles - mountMiles) * 10) / 10);
  const returnStoneMiles = distance;
  const travelMethod = recovery
    ? "Guild caravan with a short restorative field leg"
    : cardioHeavy
      ? "Guild caravan, then on-foot scouting route"
      : category === "story_linked"
        ? "Guild expedition escort"
        : category === "skill_practice"
          ? location.region === "Silver Coast" ? "Ship and coastal road" : "Mount and road escort"
          : "Caravan and field approach";
  return {
    location,
    continentSquareMiles: 2_000_000,
    onFootMiles,
    caravanMiles,
    mountMiles,
    returnStoneMiles,
    routeNote: cardioHeavy
      ? "Aethoria is vast, so the caravan covers the continent-scale road. Aldric shortens the final support leg so the scouting run itself becomes the mission."
      : recovery
        ? "The Guild uses caravan support for the long road so restoration remains the duty, not a punishment march."
        : "The expedition uses caravan roads for continental scale, then finishes with a practical field approach.",
    narrativeReason: cardioHeavy
      ? `A runner is needed to verify the route near ${location.name} before slower wagons commit.`
      : recovery
        ? `${location.name} requires a steady presence, not a reckless march.`
        : `The commission board points toward ${location.name}; the road work supports the real training duty.`,
    travelMethod,
  };
}

function pathsFor(category: string, region: RegionTrainingIdentity): CommissionCompletionPath[] {
  const map: Record<string, CommissionCompletionPath[]> = {
    conditioning: [
      { id: "build_endurance", label: "Scout the long road", kind: "workout_builder", intendedStyle: "conditioning", completionPath: "endurance_workout", narrative: "A clean endurance session proves the route can be held after the caravan breaks camp.", recommended: true },
      { id: "start_cardio", label: "Run the final approach", kind: "template", intendedStyle: "conditioning", completionPath: "cardio_session", narrative: "The wagons stop short. The last stretch needs lungs, rhythm, and patience." },
      { id: "log_steps", label: "Walk the scout line", kind: "steps", intendedStyle: "conditioning", completionPath: "walking", narrative: "Measured steps can still count as field work when the route itself is the test." },
      { id: "open_conditioning_plan", label: "Follow the roadwarden plan", kind: "program", intendedStyle: "conditioning", completionPath: "eight_week_conditioning", narrative: "Use the longer conditioning plan if today fits the campaign road." },
    ],
    training: [
      { id: "build_strength", label: "Break the barricade", kind: "workout_builder", intendedStyle: "strength", completionPath: "strength_workout", narrative: "The Guild needs force applied carefully: lift, brace, carry, and leave the road usable.", recommended: true },
      { id: "full_body_strength", label: "Answer with full-body work", kind: "template", intendedStyle: "strength", completionPath: "full_body_strength", narrative: "A broad field threat calls for the whole body, not a single favored weapon." },
      { id: "lower_strength", label: "Drive through the ash road", kind: "template", intendedStyle: "strength", completionPath: "lower_body_strength", narrative: "The footing is poor. Legs and trunk decide whether the line holds." },
      { id: "open_strength_plan", label: "Follow the forge plan", kind: "program", intendedStyle: "strength", completionPath: "eight_week_strength", narrative: "Use the strength campaign if today belongs to the forge rather than the road." },
    ],
    recovery: [
      { id: "build_recovery", label: "Tend the field camp", kind: "workout_builder", intendedStyle: "recovery", completionPath: "recovery_mobility", narrative: "The assignment calls for restoration: joints, breath, and enough restraint to return stronger.", recommended: true },
      { id: "mobility", label: "Move through the healer's forms", kind: "template", intendedStyle: "recovery", completionPath: "mobility", narrative: "Slow work is still work when the body needs repair more than spectacle." },
      { id: "low_impact", label: "Keep the tide moving", kind: "template", intendedStyle: "conditioning", completionPath: "low_impact_cardio", narrative: "Low impact movement keeps the expedition alive without turning recovery into punishment." },
      { id: "hydration", label: "Prepare the recovery stores", kind: "nutrition", intendedStyle: "discipline", completionPath: "nutrition_preparation", narrative: "Food, water, and consistency are sometimes the whole commission." },
    ],
    grappling: [
      { id: "build_control", label: "Take it alive", kind: "workout_builder", intendedStyle: "grappling", completionPath: "subdue_control", narrative: "Control is the cleaner answer if the creature can be stopped without slaughter.", recommended: true },
      { id: "mat_work", label: "Drill the binding forms", kind: "template", intendedStyle: "grappling", completionPath: "mat_work", narrative: "The Guild values position, pressure, and patience when a blade would make things worse." },
      { id: "functional_circuit", label: "Carry the frontier burden", kind: "template", intendedStyle: "strength", completionPath: "functional_strength", narrative: "If control fails, practical strength keeps the trail from becoming a grave marker." },
      { id: "mixed_conditioning", label: "Outlast the chase", kind: "template", intendedStyle: "conditioning", completionPath: "mixed_conditioning", narrative: "Some beasts cannot be met head-on. Make the pursuit the training." },
    ],
    skill_practice: [
      { id: "build_skill", label: "Move like dockside trouble", kind: "workout_builder", intendedStyle: region.trainingStyles.includes("walking") ? "conditioning" : "striking", completionPath: "skill_practice", narrative: "The roads are narrow, the eyes are many, and clean timing prevents a larger incident.", recommended: true },
      { id: "mobility_roads", label: "Practice quiet footwork", kind: "template", intendedStyle: "recovery", completionPath: "mobility_footwork", narrative: "A careful step can do more than a loud swing on diplomatic ground." },
      { id: "log_steps", label: "Walk the trade route", kind: "steps", intendedStyle: "conditioning", completionPath: "walking", narrative: "The job is movement, observation, and arriving with the seal intact." },
      { id: "provisions", label: "Set the convoy stores", kind: "nutrition", intendedStyle: "discipline", completionPath: "nutrition_preparation", narrative: "Some missions fail before they begin because no one packed properly." },
    ],
    penalty_restoration: [
      { id: "restore_oath", label: "Settle the restoration oath", kind: "template", intendedStyle: "discipline", completionPath: "restoration_oath", narrative: "A missed commission leaves a mark in the ledger. Aldric offers one clean way to close it.", recommended: true },
    ],
    story_linked: [
      { id: "boss_prep", label: "Prepare for the Gate", kind: "workout_builder", intendedStyle: region.trainingStyles[0] ?? "strength", completionPath: "boss_preparation", narrative: "The larger threat is moving. The Guild narrows the work because hesitation costs lives.", recommended: true },
      { id: "field_session", label: "Run the assigned field drill", kind: "template", intendedStyle: region.trainingStyles[1] ?? region.trainingStyles[0] ?? "conditioning", completionPath: "field_drill", narrative: "Aldric has chosen the drill that best fits the pressure around this Gate." },
    ],
  };
  return map[category] ?? map.training;
}

function choiceLimitFor(category: string, context: { injuryNotesPresent?: boolean; readiness?: string; neglectedStyle?: string | null }) {
  if (category === "penalty_restoration" || context.injuryNotesPresent || context.readiness === "limited") return 1;
  if (category === "story_linked" || category === "conditioning" || category === "recovery" || context.neglectedStyle) return 2;
  return 3;
}

export function buildCommissionExpeditionDetail(category: string, location: AethoriaLocation, travel: CommissionTravelPlan, context: {
  dominantStyle?: string | null;
  neglectedStyle?: string | null;
  readiness?: string;
  injuryNotesPresent?: boolean;
} = {}): CommissionExpeditionDetail {
  const region = REGION_TRAINING_IDENTITIES[location.region] ?? REGION_TRAINING_IDENTITIES.Valecrest;
  const paths = pathsFor(category, region).slice(0, choiceLimitFor(category, context));
  const recommendedPath = paths.find((path) => path.recommended) ?? paths[0];
  const threatByCategory: Record<string, string> = {
    conditioning: location.region === "Frostveil Peaks" || location.region === "Frostvale"
      ? "Mountain pass pressure, thin air, and a scouting route that must be verified before the caravan commits."
      : "A long approach route where fatigue is the real enemy.",
    training: location.region === "The Ember Plains"
      ? "A raider barricade and hard labor under open heat."
      : location.region === "Blackstone Highlands"
        ? "Stonebound resistance, grip demand, and armor-breaking work."
        : "A direct field threat requiring practical strength.",
    recovery: location.region === "The Sunken Kingdom"
      ? "Unfamiliar tide pressure, breath control, and recovery discipline at the surface docks."
      : "A restoration duty where patience is the challenge.",
    grappling: "A frightened or corrupted beast that should be controlled if your training allows it.",
    skill_practice: location.region === "Silver Coast"
      ? "Narrow dock roads, tense negotiations, and trouble hidden beneath trade etiquette."
      : "A technical duty where clean timing matters more than force.",
    penalty_restoration: "A restoration debt: simple, honest work to rebuild momentum after a missed commission.",
    story_linked: "Gate pressure tied to the active campaign. Preparation matters before the larger threat moves.",
  };
  const realWorldByStyle: Record<string, string> = {
    conditioning: "Complete endurance, cardio, steps, or conditioning work.",
    strength: "Complete a strength, hypertrophy, or progressive overload session.",
    recovery: "Complete recovery, mobility, low-impact cardio, hydration, or nutrition support.",
    grappling: "Complete grappling, control, mat work, or functional strength.",
    striking: "Complete striking, footwork, precision, or skill-practice work.",
    discipline: "Complete nutrition, provisioning, hydration, or consistency tasks.",
  };
  const style = recommendedPath.intendedStyle;
  const aldricReason = context.injuryNotesPresent || context.readiness === "limited"
    ? "You are not lesser for needing recovery. You are alive. The assignment must build you without gambling with pain."
    : context.dominantStyle === "strength" && (category === "conditioning" || region.regionId === "frostveil-peaks")
      ? "Frostveil does not care how hard a person can strike if the pass outlasts their breath. This road asks for a different kind of steel."
      : context.neglectedStyle
        ? "The Guild has chosen ground that will round the edge of your current legend. Take the lesson the road is offering."
        : "This commission fits the tools, record, and road in front of you.";
  return {
    commissionTitle: `${location.name} Commission`,
    region,
    narrativeBriefing: region.briefingTone,
    threat: threatByCategory[category] ?? threatByCategory.training,
    recommendedPath,
    alternativePaths: paths.filter((path) => path.id !== recommendedPath.id),
    travelMethod: travel.travelMethod,
    returnStoneNote: `Upon completion, your Return Stone will draw you back to the Guild Hall. Your real steps contribute to the expedition, but Aethoria spans about 2,000,000 square miles.`,
    realWorldAction: realWorldByStyle[style] ?? "Complete a valid workout, recovery, nutrition, or walking action.",
    aldricReason,
  };
}
