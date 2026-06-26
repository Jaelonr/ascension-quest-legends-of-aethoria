export type CombatStyle = "strength" | "striking" | "conditioning" | "grappling" | "recovery" | "discipline";
export type NarrativeIntensity = "technical" | "balanced" | "immersive";

export interface StyleScores {
  strength: number;
  striking: number;
  conditioning: number;
  grappling: number;
  recovery: number;
  discipline: number;
}

export interface WorkoutSetData {
  exerciseName: string;
  muscleGroup: string;
  reps: number;
  weightKg: number;
  rpe: number;
  isPr: boolean;
}

export interface CombatInput {
  sessionName: string;
  durationMinutes: number;
  sets: WorkoutSetData[];
  prCount: number;
  xpEarned: number;
  goldEarned: number;
  nutritionMet: boolean;
  activeRaidTitles: string[];
  gearDrop: { name: string; rarity: string; slot: string } | null;
  playerRank: string;
  baseClass: string;
  playerName: string;
  narrativeIntensity: NarrativeIntensity;
  elementalAffinity?: string;
  narrativeModifiers?: string[];
  commission?: CommissionCombatContext | null;
}

export interface CommissionCombatContext {
  commissionId?: number | string | null;
  regionId?: string | null;
  regionName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  completionPath?: string | null;
  completionLabel?: string | null;
  completionNarrative?: string | null;
  intendedStyle?: string | null;
  narrativeThreat?: string | null;
  travelMethod?: string | null;
  flavorKind?: string | null;
  flavorTitle?: string | null;
  flavorObjective?: string | null;
  flavorStakes?: string | null;
}

export interface CombatEvent {
  text: string;
  type: "strike" | "pr" | "stat" | "raid" | "gear" | "nutrition" | "special";
}

export interface CombatReplayData {
  encounterName: string;
  enemyName: string;
  dominantStyle: CombatStyle;
  secondaryStyle: CombatStyle | null;
  hybridArchetype: string | null;
  verdict: string;
  events: CombatEvent[];
  styleScores: StyleScores;
  gearDrop: { name: string; rarity: string; slot: string } | null;
  raidImpact: string | null;
  narrativeConsequence: string | null;
  payoff: CombatReplayPayoff;
}

export interface CombatReplayPayoff {
  headline: string;
  fitnessTranslation: string;
  worldEffect: string;
  nextHook: string;
  pathEffect: string | null;
}

const STRENGTH_KEYWORDS = [
  "squat", "deadlift", "bench", "barbell", "rack", "smith machine", "leg press",
  "pendlay", "sumo", "hex bar", "trap bar", "t-bar", "incline press", "decline press",
  "flat press", "power clean", "hang clean", "push press", "military press", "ohp",
  "overhead", "pull-up", "pullup", "chin-up", "chinup", "dip", "row", "pulldown",
  "cable row", "seated row", "chest press", "shoulder press", "lunge", "rdl",
  "romanian", "good morning", "hip thrust", "glute bridge",
];

const STRIKING_KEYWORDS = [
  "bag", "heavy bag", "boxing", "punch", "jab", "cross", "hook", "uppercut",
  "combo", "shadowbox", "shadow box", "kickbox", "kick", "muay thai", "strike",
  "pad", "spar", "round", "fightcamp", "fight camp", "mitt", "speed bag",
  "double end", "reflex", "footwork", "weave", "slip", "bob",
];

const GRAPPLING_KEYWORDS = [
  "wrestl", "sprawl", "shrimp", "bridge", "guard", "takedown", "clinch",
  "bjj", "jiu", "submission", "pin", "shoot", "grappl", "grip",
  "armbar", "triangle", "choke", "kimura", "americana", "double leg",
  "single leg", "slam", "pummeling", "underhook", "overhook",
];

const CONDITIONING_KEYWORDS = [
  "run", "jog", "sprint", "treadmill", "elliptical", "cycle", "bike", "cycling",
  "rowing machine", "erg", "jump rope", "jumprope", "burpee", "step", "stair",
  "swim", "cardio", "sled", "air bike", "assault bike", "echo bike", "tabata",
  "circuit", "hiit", "interval", "walk", "incline walk", "march",
];

const RECOVERY_KEYWORDS = [
  "stretch", "foam roll", "foam roller", "yoga", "mobility", "band stretch",
  "hip flexor", "rehab", "recovery", "deload", "cooldown", "cool down",
  "warmup", "warm up", "active recovery", "pigeon", "downward dog",
  "child pose", "cat cow", "dynamic stretch", "static stretch",
];

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function scoreExercise(set: WorkoutSetData): Partial<StyleScores> {
  const name = set.exerciseName.toLowerCase();
  const mg = set.muscleGroup.toLowerCase();
  const scores: Partial<StyleScores> = {};

  if (matchesKeywords(name, STRENGTH_KEYWORDS) || matchesKeywords(mg, ["chest", "back", "legs", "glutes", "hamstring", "quad", "shoulder"])) {
    const isHeavy = set.reps <= 6 && set.weightKg > 40;
    const isModerate = set.reps <= 10 && set.weightKg > 20;
    scores.strength = isHeavy ? 3 : isModerate ? 2 : 1;
  }

  if (matchesKeywords(name, STRIKING_KEYWORDS)) {
    scores.striking = 3;
  }

  if (matchesKeywords(name, GRAPPLING_KEYWORDS)) {
    scores.grappling = 3;
  }

  if (matchesKeywords(name, CONDITIONING_KEYWORDS) || set.reps > 20) {
    scores.conditioning = set.reps > 20 ? 2 : 3;
  }

  if (matchesKeywords(name, RECOVERY_KEYWORDS) || (set.rpe <= 4 && set.weightKg === 0)) {
    scores.recovery = 2;
  }

  if (set.isPr) {
    scores.strength = (scores.strength ?? 0) + 2;
  }

  return scores;
}

export function classifyWorkoutStyle(input: CombatInput): { dominant: CombatStyle; secondary: CombatStyle | null; scores: StyleScores } {
  const totals: StyleScores = { strength: 0, striking: 0, conditioning: 0, grappling: 0, recovery: 0, discipline: 0 };

  const sessionLower = input.sessionName.toLowerCase();

  if (matchesKeywords(sessionLower, STRIKING_KEYWORDS)) totals.striking += 10;
  if (matchesKeywords(sessionLower, GRAPPLING_KEYWORDS)) totals.grappling += 10;
  if (matchesKeywords(sessionLower, CONDITIONING_KEYWORDS) || sessionLower.includes("cardio")) totals.conditioning += 8;
  if (matchesKeywords(sessionLower, RECOVERY_KEYWORDS) || sessionLower.includes("mobility") || sessionLower.includes("deload")) totals.recovery += 8;
  if (matchesKeywords(sessionLower, STRENGTH_KEYWORDS) || sessionLower.includes("strength") || sessionLower.includes("power")) totals.strength += 6;

  for (const set of input.sets) {
    const partial = scoreExercise(set);
    for (const [k, v] of Object.entries(partial)) {
      totals[k as CombatStyle] += v ?? 0;
    }
  }

  if (input.durationMinutes > 50 && totals.conditioning < 5) totals.conditioning += 4;
  if (input.durationMinutes < 20) totals.recovery += 3;

  if (input.nutritionMet) totals.discipline += 8;

  if (input.prCount > 0) totals.strength += input.prCount * 3;

  const avgRpe = input.sets.length > 0
    ? input.sets.reduce((s, x) => s + x.rpe, 0) / input.sets.length
    : 0;
  if (avgRpe >= 8.5) totals.strength += 4;
  if (avgRpe <= 4 && input.sets.length > 0) totals.recovery += 3;

  const sorted = (Object.entries(totals) as [CombatStyle, number][]).sort((a, b) => b[1] - a[1]);

  const dominant = sorted[0][0];
  const secondary = sorted[1][1] > 0 && sorted[1][0] !== dominant ? sorted[1][0] : null;

  return { dominant, secondary, scores: totals };
}

export function getHybridArchetype(scores: StyleScores): string | null {
  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  const pcts: StyleScores = {
    strength: scores.strength / total,
    striking: scores.striking / total,
    conditioning: scores.conditioning / total,
    grappling: scores.grappling / total,
    recovery: scores.recovery / total,
    discipline: scores.discipline / total,
  };

  if (pcts.strength > 0.35 && pcts.striking > 0.2 && pcts.discipline > 0.15) return "Runeblade Champion";
  if (pcts.strength > 0.35 && pcts.grappling > 0.2 && pcts.discipline > 0.1) return "Stonebound Warden";
  if (pcts.strength > 0.4 && pcts.striking > 0.2) return "Warbreaker";
  if (pcts.strength > 0.4 && pcts.conditioning > 0.2) return "Iron Vanguard";
  if (pcts.striking > 0.3 && pcts.conditioning > 0.2) return "Storm Duelist";
  if (pcts.grappling > 0.3 && pcts.strength > 0.2) return "Chainwarden";
  if (pcts.grappling > 0.25 && pcts.conditioning > 0.2) return "Wilds Warden";
  if (pcts.discipline > 0.2 && pcts.recovery > 0.15) return "Iron Monk";
  if (pcts.conditioning > 0.25 && pcts.recovery > 0.2) return "Wind Guardian";

  const dominant = Math.max(...Object.values(pcts));
  if (dominant < 0.3) return "Pathfinder";

  return null;
}

const RANK_ENEMIES: Record<string, string[][]> = {
  E: [
    ["Crumbling Dungeon", "Rabid Stone Golem"], ["Goblin Outpost", "Feral Horde Leader"],
    ["Rusted Gate", "Iron Scarecrow"], ["Hollow Cave", "Cave Lurker"], ["Forgotten Shrine", "Cursed Guardian"],
  ],
  D: [
    ["Ancient Forest Gate", "Shadow Wolf Alpha"], ["Abandoned Fortress", "Iron Sentinel"],
    ["Cursed Mine", "Stone Drake"], ["Crimson Swamp", "Blood Toad King"], ["Thunder Ridge", "Storm Boar"],
  ],
  C: [
    ["Corrupted Tower", "Shadow Wraith"], ["Dark Labyrinth", "Mirror Demon"], ["Frozen Abyss", "Frost Revenant"],
    ["Burning Wastes", "Ember Tyrant"], ["Sunken Ruins", "Deep One"],
  ],
  B: [
    ["Void Fracture", "Void Chimera"], ["Iron Keep", "The Iron Monarch"], ["Dark Gate B-52", "Twin Blade Cursed Knight"],
    ["Celestial Prison", "Fallen Apostle"], ["Demon Steppe", "Chaos Archon"],
  ],
  A: [
    ["Demon King's Palace", "Abyssal Hydra"], ["Dimensional Rift", "The Shattered God"],
    ["Shadow Realm", "Shadow Sovereign"], ["Eternal Gate", "Ancient Leviathan"], ["Sky Fortress", "Aerial Warlord"],
  ],
  S: [
    ["National-Level Gate", "The Void Incarnate"], ["Mythic Dungeon: Abyss Core", "Ancient Dragon"],
    ["The Final Gate", "World-Level Threat"], ["Infinite Tower Floor 100", "Monarch of Ruin"],
  ],
};

function pickEnemy(rank: string, style: CombatStyle): [string, string] {
  const bucket = RANK_ENEMIES[rank] ?? RANK_ENEMIES["E"];
  const styleIndex: Record<CombatStyle, number> = { strength: 0, striking: 1, conditioning: 2, grappling: 3, recovery: 4, discipline: 4 };
  const baseIdx = styleIndex[style] % bucket.length;
  return (bucket[baseIdx] ?? bucket[0]) as [string, string];
}

const STYLE_EVENTS: Record<CombatStyle, Record<NarrativeIntensity, string[]>> = {
  strength: {
    technical: [
      "Heavy compound lifts dominated the session.",
      "Significant loading across major muscle groups.",
      "Progressive overload applied.",
    ],
    balanced: [
      "You drove through heavy compound work, each rep a hammer strike against the enemy's defenses.",
      "Raw strength output overwhelmed the enemy's guards.",
      "Iron discipline under the bar translated into crushing blows.",
    ],
    immersive: [
      "With earth-shaking resolve, you drove the barbell through every rep — each repetition shattering the enemy's armor like paper.",
      "The dungeon walls trembled as your raw output reached critical mass. The enemy's guard broke under the pressure.",
      "You became an unmovable force. The enemy could not withstand your crushing power and staggered backward.",
    ],
  },
  striking: {
    technical: [
      "Striking-focused session completed.",
      "High output across punch/kick combinations.",
      "Speed and precision maintained.",
    ],
    balanced: [
      "Your relentless combo output left no room for the enemy to recover.",
      "Swift footwork and precision strikes kept the enemy off balance throughout.",
      "You slipped the counterattack and returned fire with a brutal combination.",
    ],
    immersive: [
      "You unleashed a storm of precision — jab, cross, hook — the enemy barely registered the first hit before the third had already landed.",
      "Moving like smoke, you slipped beneath the enemy's guard and detonated an elbow strike that rocked the encounter.",
      "A flurry of footwork and controlled aggression dismantled the enemy's strategy. They had no answer for your tempo.",
    ],
  },
  conditioning: {
    technical: [
      "Cardio/conditioning session logged.",
      "Sustained effort across full session duration.",
      "Endurance output maintained.",
    ],
    balanced: [
      "You refused to let the enemy set the pace, outlasting it through sheer attrition.",
      "Where others would have slowed, you accelerated — the enemy's stamina failed first.",
      "High-tempo output wore the enemy down before the final exchange.",
    ],
    immersive: [
      "You circled the enemy like wind — never stopping, never tiring, always pressuring. When it finally slowed, you were still fresh.",
      "Your conditioning outlasted everything the dungeon threw at you. The enemy exhausted itself trying to keep up.",
      "The encounter stretched on, but you had trained for this. While the enemy gasped, you moved through it like water.",
    ],
  },
  grappling: {
    technical: [
      "Grappling/mat work session completed.",
      "Control and positioning work logged.",
      "Takedown and ground work practiced.",
    ],
    balanced: [
      "You closed the distance and took the enemy to the ground, negating its striking threat entirely.",
      "Control over positioning denied the enemy any chance to counter.",
      "A precise takedown entry and relentless ground pressure sealed the outcome.",
    ],
    immersive: [
      "The moment the enemy committed to an attack, you shot in — a perfect level change, a thunderous double-leg. It had no answer.",
      "You pinned it to the ground with methodical control. No matter how it struggled, your weight and technique held fast.",
      "From your back you worked — shrimping, framing, regaining guard. When the opening came, the submission was already inevitable.",
    ],
  },
  recovery: {
    technical: [
      "Recovery/mobility session completed.",
      "Active rest and tissue work logged.",
      "Readiness maintained.",
    ],
    balanced: [
      "You shielded yourself from fatigue, entering the encounter with full readiness.",
      "Mobility and recovery work replenished your combat reserves before the next Gate opens.",
      "Proactive recovery is how champions sustain — today you invested in tomorrow's victories.",
    ],
    immersive: [
      "Like a fortress preparing for siege, you reinforced every joint and restored every muscle. The next Gate will face a fully recharged adventurer.",
      "Your guard regenerated. Fatigue cleansed. The Shadow within you receded — replaced by pristine combat readiness.",
      "Smart adventurers know: a weapon that is never maintained becomes dull. Today you sharpened the blade.",
    ],
  },
  discipline: {
    technical: [
      "Nutrition targets met. Discipline bonus applied.",
      "Calorie and protein adherence tracked.",
    ],
    balanced: [
      "Your precision with nutrition translated into focus and energy — the enemy felt the difference.",
      "Hitting your nutrition targets is a form of combat. Your body had exactly what it needed.",
      "Discipline off the mat is discipline on it. Your fuel management granted a hidden edge.",
    ],
    immersive: [
      "While others crumbled under hunger and poor fueling, your calculated nutrition kept your aura burning at full intensity.",
      "The Corruption could not take hold. Your mental discipline held the line — every macro accounted for, every temptation resisted.",
      "Your nutritional precision was a secret weapon. The enemy never expected an adventurer this prepared.",
    ],
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function kgToLb(value: number): number {
  return value * 2.20462;
}

function summarizeSetGroup(sets: WorkoutSetData[]) {
  const reps = sets.reduce((sum, set) => sum + Math.max(0, set.reps), 0);
  const volumeKg = sets.reduce((sum, set) => sum + Math.max(0, set.weightKg) * Math.max(0, set.reps), 0);
  const topWeightKg = sets.reduce((best, set) => Math.max(best, set.weightKg), 0);
  const avgRpe = sets.length ? sets.reduce((sum, set) => sum + (set.rpe || 0), 0) / sets.length : 0;
  const prs = sets.filter((set) => set.isPr).length;
  return { reps, volumeKg, topWeightKg, avgRpe, prs };
}

function groupedExerciseEvidence(input: CombatInput) {
  const grouped = new Map<string, WorkoutSetData[]>();
  for (const set of input.sets) {
    const key = set.exerciseName || "Recorded work";
    grouped.set(key, [...(grouped.get(key) ?? []), set]);
  }

  return [...grouped.entries()]
    .map(([exerciseName, sets]) => ({ exerciseName, sets, ...summarizeSetGroup(sets) }))
    .sort((a, b) => {
      const aScore = a.volumeKg || a.reps;
      const bScore = b.volumeKg || b.reps;
      return bScore - aScore;
    });
}

function exerciseBattleVerb(style: CombatStyle) {
  const verbs: Record<CombatStyle, string> = {
    strength: "broke guard",
    striking: "created openings",
    conditioning: "kept pressure",
    grappling: "stole position",
    recovery: "restored defense",
    discipline: "held formation",
  };
  return verbs[style];
}

function buildRealEffortBattleBeats(input: CombatInput, dominant: CombatStyle, secondary: CombatStyle | null): CombatEvent[] {
  const evidence = groupedExerciseEvidence(input);
  const events: CombatEvent[] = [];

  if (evidence.length === 0) {
    const text = dominant === "recovery"
      ? "No heavy sets were needed. The session became restoration work: guard repaired, breath steadied, and tomorrow's blade kept sharp."
      : "The Hall recorded the session as field work even without set data. Add exercises, reps, load, and RPE next time to sharpen the replay.";
    return [{ type: "stat", text }];
  }

  const totalVolumeKg = evidence.reduce((sum, item) => sum + item.volumeKg, 0);
  const totalReps = evidence.reduce((sum, item) => sum + item.reps, 0);
  const avgRpe = input.sets.length
    ? input.sets.reduce((sum, set) => sum + (set.rpe || 0), 0) / input.sets.length
    : 0;

  const volumePhrase = totalVolumeKg > 0
    ? `${Math.round(kgToLb(totalVolumeKg)).toLocaleString()} lb of recorded volume`
    : `${totalReps.toLocaleString()} recorded reps`;
  events.push({
    type: "stat",
    text: `System conversion: ${volumePhrase} became ${styleTitle(dominant)} pressure over ${input.durationMinutes} minutes. Average effort registered at RPE ${round1(avgRpe)}.`,
  });

  for (const item of evidence.slice(0, 4)) {
    const loadPhrase = item.topWeightKg > 0
      ? `top load ${round1(kgToLb(item.topWeightKg))} lb`
      : "bodyweight or skill work";
    const prPhrase = item.prs > 0 ? ` ${item.prs} PR seal${item.prs === 1 ? "" : "s"} flared during the exchange.` : "";
    events.push({
      type: item.prs > 0 ? "pr" : "strike",
      text: `${item.exerciseName}: ${item.sets.length} set${item.sets.length === 1 ? "" : "s"}, ${item.reps} reps, ${loadPhrase}. The work ${exerciseBattleVerb(dominant)} against the enemy.${prPhrase}`,
    });
  }

  if (secondary) {
    events.push({
      type: "special",
      text: `Secondary pattern detected: ${styleTitle(secondary)}. The fight did not belong to one trait alone; your training is beginning to layer into a hybrid path.`,
    });
  }

  return events;
}

function present(value?: string | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function styleTitle(style: CombatStyle): string {
  const labels: Record<CombatStyle, string> = {
    strength: "Iron Vanguard",
    striking: "Storm Duelist",
    conditioning: "Wayfarer",
    grappling: "Chainwarden",
    recovery: "Verdant Guardian",
    discipline: "Runesage",
  };
  return labels[style];
}

function commissionEnemyName(context: CommissionCombatContext): string {
  const threat = present(context.narrativeThreat);
  if (threat) return threat;

  const objective = present(context.flavorObjective);
  if (objective) return objective;

  const kind = present(context.flavorKind);
  if (kind === "bounty") return "Wanted bandit company";
  if (kind === "hunt") return "Corrupted wild beast";
  if (kind === "escort") return "Roadside ambush";
  if (kind === "relief") return "Gate-scarred relief route";
  if (kind === "errand") return "Unfinished village duty";
  if (kind === "main_quest") return "Major Gate threat";

  return `${present(context.regionName) ?? "Aethoria"} field threat`;
}

function pickCommissionEncounter(input: CombatInput, dominant: CombatStyle): [string, string] | null {
  const context = input.commission;
  if (!context) return null;

  const title = present(context.flavorTitle);
  const regionName = present(context.regionName);
  const locationName = present(context.locationName);
  const pathLabel = present(context.completionLabel) ?? present(context.completionPath);
  const encounterName = title
    ? locationName ? `${locationName}: ${title}` : title
    : locationName && regionName ? `${locationName} ${styleTitle(dominant)} Duty`
      : regionName ? `${regionName} ${styleTitle(dominant)} Commission`
        : pathLabel ? `${pathLabel} Commission`
          : `${styleTitle(dominant)} Field Duty`;

  return [encounterName, commissionEnemyName(context)];
}

function completionPathOutcome(context: CommissionCombatContext | null | undefined, dominant?: CombatStyle | null): string | null {
  if (!context) return null;
  const path = `${present(context.completionPath) ?? ""} ${present(context.completionLabel) ?? ""} ${present(context.completionNarrative) ?? ""} ${present(context.flavorKind) ?? ""}`.toLowerCase();
  const region = present(context.regionName) ?? "Aethoria";
  const threat = commissionEnemyName(context);
  if (path.includes("subdue") || path.includes("control") || path.includes("mat") || path.includes("binding") || path.includes("grappl")) {
    return `Tactical outcome: you chose control over slaughter. The ${threat} was contained through leverage, patience, and disciplined restraint in ${region}.`;
  }
  if (path.includes("strength") || path.includes("barricade") || path.includes("forge") || path.includes("lower") || path.includes("boss")) {
    return `Tactical outcome: you chose direct force. The ${threat} yielded because your real strength work became pressure the field could understand.`;
  }
  if (path.includes("endurance") || path.includes("cardio") || path.includes("conditioning") || path.includes("walk") || path.includes("road") || path.includes("chase")) {
    return `Tactical outcome: you chose movement as the weapon. The route through ${region} advanced because your real steps and conditioning carried the expedition past the danger.`;
  }
  if (path.includes("recovery") || path.includes("mobility") || path.includes("low_impact") || path.includes("nutrition") || path.includes("hydration") || path.includes("reduced") || path.includes("restoration")) {
    return `Tactical outcome: you chose preservation. The Guild gained useful progress without gambling your body against the ${threat}.`;
  }
  if (path.includes("skill") || path.includes("footwork") || path.includes("strike") || path.includes("dock")) {
    return `Tactical outcome: you chose precision. Clean timing and careful footwork kept the commission from becoming louder than it needed to be.`;
  }
  if (path.includes("field_drill")) {
    return `Tactical outcome: you accepted Aldric's narrowed field drill. The work was not glamorous, but it answered the pressure around ${threat}.`;
  }
  if (dominant) {
    return `Tactical outcome: you answered the commission through ${styleTitle(dominant)} work. The path mattered because the training was real.`;
  }
  return null;
}

function buildCommissionOpening(input: CombatInput, dominant: CombatStyle): CombatEvent[] {
  const context = input.commission;
  if (!context) return [];

  const intensity = input.narrativeIntensity;
  const regionName = present(context.regionName) ?? "Aethoria";
  const locationName = present(context.locationName);
  const place = locationName ? `${locationName}, ${regionName}` : regionName;
  const travel = present(context.travelMethod) ?? "Guild route";
  const threat = commissionEnemyName(context);
  const pathLabel = present(context.completionLabel) ?? present(context.completionPath) ?? present(context.intendedStyle);
  const pathNarrative = present(context.completionNarrative);
  const stakes = present(context.flavorStakes);
  const archetype = styleTitle(dominant);
  const pathOutcome = completionPathOutcome(context, dominant);

  if (intensity === "technical") {
    return [{
      type: "special",
      text: `Commission context: ${place}. Travel: ${travel}. Completion path: ${pathLabel ?? "recorded training"}. Threat: ${threat}.`,
    }, ...(pathOutcome ? [{ type: "special" as const, text: pathOutcome }] : [])];
  }

  const opening = intensity === "immersive"
    ? `The Guild carried you by ${travel} to ${place}. Your Return Stone waited cold at your belt while ${threat} stood between you and the commission seal. The day's ${archetype} work decided what happened next.`
    : `The commission route led by ${travel} to ${place}. Your real training became the answer to ${threat}.`;

  const events: CombatEvent[] = [{ type: "special", text: opening }];

  if (pathLabel || pathNarrative) {
    events.push({
      type: "special",
      text: pathNarrative
        ? `${pathLabel ?? "Chosen path"}: ${pathNarrative}`
        : `Chosen path: ${pathLabel}.`,
    });
  }

  if (pathOutcome) {
    events.push({ type: "special", text: pathOutcome });
  }

  if (stakes) {
    events.push({
      type: "special",
      text: intensity === "immersive" ? `Stakes recorded in the Hall ledger: ${stakes}` : stakes,
    });
  }

  return events;
}

function generateNarrativeConsequence(input: CombatInput, verdict: string): string {
  const { narrativeIntensity: intensity, prCount, nutritionMet, activeRaidTitles, gearDrop } = input;

  const parts: string[] = [];

  if (intensity === "technical") {
    if (prCount > 0) parts.push(`PR registered. Baseline updated for next session.`);
    else if (nutritionMet) parts.push("Nutrition targets met. Ready for next gate.");
    else parts.push("Session logged.");
    if (activeRaidTitles.length > 0) parts.push(`"${activeRaidTitles[0]}" raid updated.`);
    if (gearDrop) parts.push(`${gearDrop.name} (${gearDrop.rarity}) added to inventory.`);
    if (input.commission) parts.push(`Commission advanced in ${present(input.commission.regionName) ?? "Aethoria"}.`);
    return parts.join(" ");
  }

  if (verdict === "Victory" && prCount > 0) {
    parts.push(intensity === "immersive"
      ? "A threshold broken cannot be unbroken. The next Gate opens to an adventurer of greater power. Your name has been noted in the dungeon's ledger."
      : "You broke a record today. Carry that proof into the next session — you are stronger than you were.");
  } else if (verdict === "Victory") {
    parts.push(intensity === "immersive"
      ? "The Gate has been cleared. Your aura strengthens. The next encounter will feel what you have become."
      : "Victory secured. Arrive at the next session with momentum on your side.");
  } else if (verdict === "Narrow Victory") {
    parts.push(intensity === "immersive"
      ? "A close fight leaves marks on both sides. Rest well. The next Gate will not expect an adventurer who recovers this fast."
      : "Hard-fought win. Take what you need to recover and come back sharper.");
  } else if (verdict === "Recovery Secured") {
    parts.push(intensity === "immersive"
      ? "The Guild does not call this retreat. You restored the weapon before it broke, and that decision keeps tomorrow's Gate within reach."
      : "Recovery secured. You protected readiness instead of spending it recklessly.");
  } else if (verdict === "Strategic Retreat") {
    parts.push(intensity === "immersive"
      ? "You withdrew when others would have broken. That choice is a form of mastery. Your body enters the next session with elevated recovery — full MP restored."
      : "Smart decision to step back today. Show up fresh — your discipline carries forward.");
  } else {
    if (nutritionMet) {
      parts.push(intensity === "immersive"
        ? "No drama, no theater — just the work and the fuel to sustain it. Consistency is how adventurers outlast every obstacle."
        : "Steady session, nutrition on point. That is how streaks are built.");
    } else {
      parts.push(intensity === "immersive"
        ? "You showed up. In a world that rewards those who return, showing up is already a victory of its own kind."
        : "Session complete. Every rep compounds. Keep the streak alive.");
    }
  }

  if (activeRaidTitles.length > 0) {
    parts.push(intensity === "immersive"
      ? `The ${activeRaidTitles[0]} has registered your presence. Continue to press the advantage — the boss does not get stronger while you do.`
      : `Raid "${activeRaidTitles[0]}" damage dealt. Return to maintain pressure.`);
  }

  if (input.commission) {
    const regionName = present(input.commission.regionName) ?? "Aethoria";
    const locationName = present(input.commission.locationName);
    const place = locationName ? `${locationName} in ${regionName}` : regionName;
    parts.push(intensity === "immersive"
      ? `The Return Stone drew you back to the Hall from ${place}. The commission is no longer an item on a board; it is a mark in Aethoria's record.`
      : `Commission route advanced in ${place}. The Return Stone brought you back to the Hall.`);
  }

  if (gearDrop) {
    parts.push(intensity === "immersive"
      ? `The ${gearDrop.name} bound itself to you as the dungeon fell. Equip it — and let the next Gate feel the difference.`
      : `${gearDrop.name} (${gearDrop.rarity}) acquired. Equip it before your next session.`);
  }

  return parts.join(" ");
}

const STYLE_PAYOFFS: Record<CombatStyle, { action: string; trait: string }> = {
  strength: { action: "devastating force", trait: "raw power" },
  striking: { action: "clean combinations and sharp footwork", trait: "precision" },
  conditioning: { action: "relentless pressure", trait: "endurance" },
  grappling: { action: "control, leverage, and positional dominance", trait: "battlefield control" },
  recovery: { action: "restoration and guarded resilience", trait: "durability" },
  discipline: { action: "measured execution", trait: "discipline" },
};

export function buildCombatReplayPayoff(replay: {
  verdict?: string | null;
  dominantStyle?: string | null;
  secondaryStyle?: string | null;
  hybridArchetype?: string | null;
  enemyName?: string | null;
  xpEarned?: number | null;
  goldEarned?: number | null;
  prCount?: number | null;
  gearDrop?: { name?: string; rarity?: string; slot?: string } | null;
  raidImpact?: string | null;
  narrativeConsequence?: string | null;
  events?: Array<{ text?: string | null }> | null;
  commission?: CommissionCombatContext | null;
}): CombatReplayPayoff {
  const dominant = (replay.dominantStyle && replay.dominantStyle in STYLE_PAYOFFS
    ? replay.dominantStyle
    : "discipline") as CombatStyle;
  const secondary = replay.secondaryStyle && replay.secondaryStyle in STYLE_PAYOFFS
    ? replay.secondaryStyle as CombatStyle
    : null;
  const primary = STYLE_PAYOFFS[dominant];
  const secondaryPhrase = secondary ? `, reinforced by ${STYLE_PAYOFFS[secondary].trait}` : "";
  const enemy = replay.enemyName ?? "the enemy";
  const verdict = replay.verdict ?? "Training Complete";
  const prPhrase = replay.prCount && replay.prCount > 0
    ? ` ${replay.prCount} personal record${replay.prCount === 1 ? "" : "s"} turned the fight in your favor.`
    : "";
  const gearPhrase = replay.gearDrop?.name
    ? ` The Hall also recorded a recovered item: ${replay.gearDrop.name}.`
    : "";
  const pathEffect = completionPathOutcome(replay.commission, dominant)
    ?? replay.events?.find((event) => typeof event?.text === "string" && event.text.startsWith("Tactical outcome:"))?.text
    ?? null;

  return {
    headline: `${verdict} against ${enemy}`,
    fitnessTranslation: `Your completed session became ${primary.action}${secondaryPhrase}.${prPhrase}`.replace(/\s+/g, " ").trim(),
    worldEffect: replay.raidImpact
      ? replay.raidImpact
      : replay.narrativeConsequence
        ? replay.narrativeConsequence
        : `Aethoria changed by a small but real measure: XP and gold were earned because the work happened in the real world.${gearPhrase}`,
    nextHook: replay.hybridArchetype
      ? `Repeated sessions are shaping the ${replay.hybridArchetype} path.`
      : "Repeat the pattern and the Chronicle will learn what kind of adventurer you are becoming.",
    pathEffect,
  };
}

export function generateCombatReplay(input: CombatInput): CombatReplayData {
  const { dominant, secondary, scores } = classifyWorkoutStyle(input);
  const hybridArchetype = getHybridArchetype(scores);

  const [encounterName, enemyName] = pickCommissionEncounter(input, dominant) ?? pickEnemy(input.playerRank, dominant);

  const events: CombatEvent[] = [];
  const intensity = input.narrativeIntensity;
  events.push(...buildCommissionOpening(input, dominant));
  events.push(...buildRealEffortBattleBeats(input, dominant, secondary));

  if (intensity === "technical") {
    events.push({ type: "strike", text: pick(STYLE_EVENTS[dominant][intensity]) });
    if (input.prCount > 0) {
      events.push({ type: "pr", text: `${input.prCount} personal record${input.prCount > 1 ? "s" : ""} set this session.` });
    }
    if (input.nutritionMet) {
      events.push({ type: "nutrition", text: pick(STYLE_EVENTS.discipline[intensity]) });
    }
  } else {
    events.push({ type: "strike", text: pick(STYLE_EVENTS[dominant][intensity]) });

    if (secondary && secondary !== "discipline") {
      events.push({ type: "strike", text: pick(STYLE_EVENTS[secondary][intensity]) });
    }

    if (input.prCount > 0) {
      const prEvents: Record<NarrativeIntensity, string> = {
        technical: `PR: ${input.prCount} new record${input.prCount > 1 ? "s" : ""} set.`,
        balanced: input.prCount === 1
          ? "You set a new personal record — the numbers don't lie. You are stronger today than you were before."
          : `You shattered ${input.prCount} personal records in a single session. The System registered each breakthrough.`,
        immersive: input.prCount === 1
          ? "The System flashed a notification: PERSONAL RECORD BROKEN. Your body crossed a threshold it had never reached before. The Gate shuddered."
          : `In a display of raw potential, you obliterated ${input.prCount} personal records. The enemy recoiled. The dungeon itself registered the shift in power.`,
      };
      events.push({ type: "pr", text: prEvents[intensity] });
    }

    if (input.durationMinutes >= 60) {
      const durationEvents: Record<NarrativeIntensity, string> = {
        technical: `${input.durationMinutes} minutes of continuous effort.`,
        balanced: `A full ${input.durationMinutes}-minute session — your endurance reserves proved deeper than the enemy anticipated.`,
        immersive: `${input.durationMinutes} minutes of unbroken combat. Most adventurers would have retreated. You pushed forward into the dungeon's depths.`,
      };
      events.push({ type: "stat", text: durationEvents[intensity] });
    }

    if (input.nutritionMet) {
      events.push({ type: "nutrition", text: pick(STYLE_EVENTS.discipline[intensity]) });
    }
  }

  if (input.gearDrop) {
    const gearEvents: Record<NarrativeIntensity, string> = {
      technical: `Gear drop: ${input.gearDrop.name} (${input.gearDrop.rarity}).`,
      balanced: `The dungeon yielded its tribute: ${input.gearDrop.name} — a ${input.gearDrop.rarity} ${input.gearDrop.slot} materialized in your inventory.`,
      immersive: `As the enemy dissolved into shadow, a single item remained. The ${input.gearDrop.name} (${input.gearDrop.rarity.toUpperCase()}) — forged in the dungeon's core — bound itself to you.`,
    };
    events.push({ type: "gear", text: gearEvents[intensity] });
  }

  if (input.elementalAffinity && input.elementalAffinity !== "physical") {
    const affinity = input.elementalAffinity.charAt(0).toUpperCase() + input.elementalAffinity.slice(1);
    const modifier = input.narrativeModifiers?.[0];
    events.push({
      type: "special",
      text: modifier
        ? `${affinity} mana answered your equipped relic: ${modifier}`
        : `${affinity} mana gathered around your technique, changing how the enemy received the blow.`,
    });
  }

  let raidImpact: string | null = null;
  if (input.activeRaidTitles.length > 0) {
    const raidName = input.activeRaidTitles[0]!;
    const raidEvents: Record<NarrativeIntensity, string> = {
      technical: `Raid progress: "${raidName}" updated.`,
      balanced: `Your effort dealt damage to the ${raidName} raid. The boss is weakening.`,
      immersive: `Your ${dominant} output cracked the ${raidName}'s outer defense. The boss could feel the shift — your adventurer's aura growing stronger with each session.`,
    };
    raidImpact = raidEvents[intensity];
    events.push({ type: "raid", text: raidImpact });
  }

  let verdict: string;
  if (input.prCount > 0 && input.durationMinutes >= 45) {
    verdict = "Victory";
  } else if (input.sets.length === 0 || input.durationMinutes < 10) {
    verdict = "Training Complete";
  } else if (dominant === "recovery" && input.durationMinutes >= 10) {
    verdict = "Recovery Secured";
  } else if (input.durationMinutes < 20) {
    verdict = "Strategic Retreat";
  } else {
    verdict = input.prCount > 0 ? "Victory" : "Narrow Victory";
  }

  const narrativeConsequence = generateNarrativeConsequence(input, verdict);

  const replay = {
    encounterName,
    enemyName,
    dominantStyle: dominant,
    secondaryStyle: secondary,
    hybridArchetype,
    verdict,
    events,
    styleScores: scores,
    gearDrop: input.gearDrop,
    raidImpact,
    narrativeConsequence,
  };

  return {
    ...replay,
    payoff: buildCombatReplayPayoff({
      ...replay,
      xpEarned: input.xpEarned,
      goldEarned: input.goldEarned,
      prCount: input.prCount,
      gearDrop: input.gearDrop,
      commission: input.commission,
      events: replay.events,
    }),
  };
}

export function getRaidStyleBonus(dominantStyle: CombatStyle, raidDifficulty: string): { multiplier: number; narrative: string } {
  const styleWeaknesses: Record<string, CombatStyle[]> = {
    E: ["conditioning", "strength"],
    D: ["strength", "conditioning"],
    C: ["striking", "grappling"],
    B: ["discipline", "recovery"],
    A: ["grappling", "striking"],
    S: ["discipline", "strength"],
  };

  const weaknesses = styleWeaknesses[raidDifficulty] ?? [];
  if (weaknesses.includes(dominantStyle)) {
    const narratives: Record<CombatStyle, string> = {
      strength: "Your heavy training cracked the boss's armor plating. Strength damage +35% due to boss weakness.",
      striking: "Your striking precision found the gaps in the boss's defense. Striking damage +35% due to boss weakness.",
      conditioning: "Your conditioning allowed you to outlast the boss's initial burst. Attrition damage +35% due to boss weakness.",
      grappling: "You negated the boss's mobility entirely. Control bonus +35% due to boss weakness.",
      recovery: "Your restoration disrupted the boss's corruption aura. Defense bonus +35% due to boss resistance.",
      discipline: "Your disciplined approach overcame the boss's mental pressure. Discipline bonus +35% due to boss weakness.",
    };
    return { multiplier: 1.35, narrative: narratives[dominantStyle] };
  }

  return { multiplier: 1.0, narrative: "" };
}
