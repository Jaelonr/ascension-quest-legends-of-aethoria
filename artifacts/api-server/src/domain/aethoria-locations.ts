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

export type CommissionTravelPlan = {
  location: AethoriaLocation;
  continentSquareMiles: number;
  onFootMiles: number;
  caravanMiles: number;
  mountMiles: number;
  returnStoneMiles: number;
  routeNote: string;
  narrativeReason: string;
};

export const AETHORIA_LOCATIONS: AethoriaLocation[] = [
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
  const distanceFit = category === "conditioning"
    ? Math.max(0, 8 - Math.abs(location.distanceFromGuildHallMiles - 140) / 45)
    : category === "recovery"
      ? Math.max(0, 8 - location.distanceFromGuildHallMiles / 35)
      : Math.max(0, 8 - Math.abs(location.distanceFromGuildHallMiles - 420) / 120);
  return categoryScore + startScore + distanceFit + ((seed + location.key.length) % 5);
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
  };
}
