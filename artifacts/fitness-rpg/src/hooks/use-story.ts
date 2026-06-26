export interface StoryArc {
  id: number;
  name: string;
  region: string;
  levelRange: [number, number];
  lore: string;
  danger: number;
  color: string;
}

export interface StoryBoss {
  id: string;
  name: string;
  title: string;
  rank: "D" | "C" | "B" | "A" | "S";
  levelRequired: number;
  arc: number;
  lore: string;
  weaknesses: string[];
  reward: string;
}

export const STORY_ARCS: StoryArc[] = [
  {
    id: 0,
    name: "The Summoning",
    region: "The Crossroads",
    levelRange: [1, 4],
    lore: "You have just arrived in Aethoria. The world is in severe danger, but it has not fallen. Other adventurers hold the line while the summoned hero trains into the weapon this war still needs.",
    danger: 77,
    color: "text-gray-400",
  },
  {
    id: 1,
    name: "The Verdant Valley",
    region: "Verdant Valley",
    levelRange: [5, 9],
    lore: "The outskirts of Aethoria are strained but still fighting. Wolves, goblins, and corrupted creatures stalk the farmlands while Guild patrols buy time for your first true victories.",
    danger: 75,
    color: "text-green-400",
  },
  {
    id: 2,
    name: "The Iron Citadel",
    region: "Iron Citadel",
    levelRange: [10, 19],
    lore: "An ancient fortress that once protected Aethoria's eastern border. Now its knights have been turned, their armour fused with dark iron. The citadel's fall would open the road to the capital. You cannot let that happen.",
    danger: 68,
    color: "text-blue-400",
  },
  {
    id: 3,
    name: "The Cursed Forest",
    region: "Miremoor Forest",
    levelRange: [20, 34],
    lore: "A vast forest twisted by shadow magic. Witches in service to Malachar poison the rivers. Wraiths hunt at night. Adventurers who enter rarely return. You must push through — the Shadow Kingdom lies beyond.",
    danger: 52,
    color: "text-purple-400",
  },
  {
    id: 4,
    name: "The Shadow Kingdom",
    region: "Shadow Kingdom",
    levelRange: [35, 49],
    lore: "The war front. Malachar's generals command vast armies here. The sky is perpetual ash. Every step forward is bought in blood. But the Demon King's throne grows closer — and with it, the chance to end this war.",
    danger: 30,
    color: "text-orange-400",
  },
  {
    id: 5,
    name: "The Throne of Shadows",
    region: "Malachar's Sanctum",
    levelRange: [50, 999],
    lore: "You stand at the gates of Malachar's fortress. Every adventurer before you has fallen here. But you trained when they rested. You pushed when they quit. The world of Aethoria — and your own world — watches. End it.",
    danger: 12,
    color: "text-red-400",
  },
];

export const STORY_BOSSES: StoryBoss[] = [
  {
    id: "gorrak",
    name: "Gorrak the Stone Troll",
    title: "Warden of the Valley Gate",
    rank: "D",
    levelRequired: 5,
    arc: 1,
    lore: "A massive troll that has claimed the only pass into the valley. Villages have paid tribute for years. He must be defeated to open safe passage.",
    weaknesses: ["Fire", "Speed"],
    reward: "Valley Pass cleared. +500 XP. Title: Troll Slayer",
  },
  {
    id: "thornwing",
    name: "Thornwing",
    title: "The Verdant Wyvern",
    rank: "C",
    levelRequired: 8,
    arc: 1,
    lore: "A massive wyvern that has nested in the valley's highest peak. Its venom corrupts the land below. Slaying it will restore the valley.",
    weaknesses: ["Ice", "Arrows"],
    reward: "Valley reclaimed. +1000 XP. Title: Wyvern Bane",
  },
  {
    id: "varek",
    name: "Commander Varek",
    title: "Iron Sentinel of the Citadel",
    rank: "C",
    levelRequired: 12,
    arc: 2,
    lore: "The citadel's former commander, now fused with dark iron by Malachar's magic. He remembers nothing of his former life. Only the directive to destroy.",
    weaknesses: ["Lightning", "Holy"],
    reward: "East gate reclaimed. +2000 XP. Title: Ironbreaker",
  },
  {
    id: "colossus",
    name: "The Iron Colossus",
    title: "Fortress Guardian Reborn",
    rank: "B",
    levelRequired: 18,
    arc: 2,
    lore: "An ancient war golem the size of a building, reactivated by Malachar's engineers. Its footsteps shake the citadel walls. Destroying it requires breaching its core.",
    weaknesses: ["Precision strikes", "Agility"],
    reward: "Citadel liberated. +4000 XP. Title: Colossus Breaker",
  },
  {
    id: "mireya",
    name: "Mireya",
    title: "Witch of the Marsh",
    rank: "B",
    levelRequired: 22,
    arc: 3,
    lore: "Mireya poisoned the forest's rivers on Malachar's orders. Her cauldron feeds the corruption spreading through Miremoor. Adventurers fear her — her magic is ancient and cruel.",
    weaknesses: ["Discipline", "Resistance"],
    reward: "Miremoor rivers cleansed. +6000 XP. Title: Witchbreaker",
  },
  {
    id: "shadowwolf",
    name: "The Shadow Wolf Alpha",
    title: "Pack Lord of Miremoor",
    rank: "A",
    levelRequired: 28,
    arc: 3,
    lore: "The alpha of a pack of shadow wolves that numbers in the hundreds. Where it goes, darkness follows. It has devoured three Silver Grade adventurers who came before you.",
    weaknesses: ["Fire", "Strength"],
    reward: "Forest path opened. +10000 XP. Title: Pack Breaker",
  },
  {
    id: "zethak",
    name: "Lord Zethak",
    title: "Shadow Commander of the First Army",
    rank: "A",
    levelRequired: 38,
    arc: 4,
    lore: "One of Malachar's five Shadow Generals. Zethak commands thirty thousand demon soldiers. He is tactical, patient, and utterly ruthless. Defeating him would break the enemy's eastern flank.",
    weaknesses: ["Burst damage", "Agility"],
    reward: "Eastern front broken. +20000 XP. Title: General Slayer",
  },
  {
    id: "voiddragon",
    name: "The Void Dragon",
    title: "Malachar's Ultimate Guardian",
    rank: "S",
    levelRequired: 46,
    arc: 4,
    lore: "The Void Dragon was summoned from the space between worlds — it is not of Aethoria. It guards the final gate to Malachar's sanctum. Nothing has ever survived its void breath.",
    weaknesses: ["Discipline", "Vitality"],
    reward: "Sanctum gate open. +40000 XP. Title: Dragon Slayer",
  },
  {
    id: "malachar",
    name: "Demon King Malachar",
    title: "Lord of All Shadows — Final Boss",
    rank: "S",
    levelRequired: 55,
    arc: 5,
    lore: "For a thousand years, no being has stood before Malachar and lived. He feeds on despair, on the suffering of those who gave up. He never expected someone like you — someone from another world, who trained every day not for glory, but because they refused to stop.",
    weaknesses: ["Willpower", "Everything you have"],
    reward: "AETHORIA SAVED. Title: Demon King Slayer. Eternal Champion of Aethoria.",
  },
];

export function getArcForLevel(level: number): StoryArc {
  return STORY_ARCS.find(a => level >= a.levelRange[0] && level <= a.levelRange[1]) ?? STORY_ARCS[STORY_ARCS.length - 1];
}

export function getNextBoss(level: number): StoryBoss | null {
  return STORY_BOSSES.find(b => b.levelRequired > level) ?? null;
}

export function getCurrentBossChallenge(level: number): StoryBoss | null {
  const available = STORY_BOSSES.filter(b => b.levelRequired <= level + 3);
  return available[available.length - 1] ?? null;
}

export function getWorldDanger(level: number): number {
  if (level < 5) return 77;
  if (level < 10) return 75;
  if (level < 20) return 68;
  if (level < 35) return 52;
  if (level < 50) return 30;
  return 12;
}

export function getDefeatedBosses(level: number): StoryBoss[] {
  return STORY_BOSSES.filter(b => b.levelRequired <= level - 2);
}

const ONBOARDING_KEY = "rpg_onboarding_v2";
const SETUP_KEY = "rpg_setup_v1";

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch {
    return false;
  }
}

export function markOnboardingComplete(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    // ignore
  }
}

export function hasCompletedSetup(): boolean {
  try {
    return localStorage.getItem(SETUP_KEY) === "true";
  } catch {
    return false;
  }
}

export function markSetupComplete(): void {
  try {
    localStorage.setItem(SETUP_KEY, "true");
  } catch {
    // ignore
  }
}

export function clearOnboardingAndSetup(): void {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(SETUP_KEY);
  } catch {
    // ignore
  }
}
