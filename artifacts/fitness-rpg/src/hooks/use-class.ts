// ── Class system — Solo Leveling-inspired evolution trees ─────────────────

export type BaseClassId =
  | "warrior"
  | "berserker"
  | "ranger"
  | "rogue"
  | "monk"
  | "tactician";

export type ApexClassId =
  | "iron_shadow"
  | "eternal_wrath"
  | "phantom_sovereign"
  | "war_sage"
  | "blood_monk"
  | "eclipse_sovereign";

export interface ClassAbility {
  name: string;
  desc: string;
  type: "passive" | "active";
}

export interface EvolutionTier {
  level: number;
  name: string;
  awakening: string;
  lore: string;
  color: string;
  abilities: ClassAbility[];
}

export interface BaseClass {
  id: BaseClassId;
  name: string;
  lore: string;
  color: string;
  border: string;
  bg: string;
  statWeights: {
    strength: number;
    agility: number;
    stamina: number;
    vitality: number;
    discipline: number;
    sense: number;
  };
  evolutions: EvolutionTier[];
}

export interface ApexClass {
  id: ApexClassId;
  name: string;
  lore: string;
  color: string;
  border: string;
  requiredLevel: number;
  bases: [BaseClassId, BaseClassId];
  abilities: ClassAbility[];
}

// ── Base Class Definitions ──────────────────────────────────────────────────

export const BASE_CLASSES: BaseClass[] = [
  {
    id: "warrior",
    name: "Warrior",
    lore: "Iron and will. You were built to lift, push, and carry more than the world thinks possible.",
    color: "text-red-400",
    border: "border-red-800/60",
    bg: "bg-red-950/20",
    statWeights: { strength: 2.0, agility: 0, stamina: 0, vitality: 1.5, discipline: 0, sense: 0 },
    evolutions: [
      {
        level: 1,
        name: "Warrior",
        awakening: "Origin",
        lore: "Raw strength and iron will. You are built to carry more than others believe possible.",
        color: "text-red-400",
        abilities: [
          { name: "Iron Grip",      desc: "Heavy compound lifts cost you less fatigue than other classes.", type: "passive" },
          { name: "War Cry",        desc: "Before a max-effort set, you may declare a War Cry. +5% output on that attempt.", type: "active" },
          { name: "Unyielding",     desc: "When your body wants to stop, you get one more rep free.", type: "passive" },
        ],
      },
      {
        level: 15,
        name: "Iron Knight",
        awakening: "First Awakening",
        lore: "Your body becomes a fortress. Every rep layers another coat of iron onto your frame.",
        color: "text-red-400",
        abilities: [
          { name: "Fortress Body",  desc: "Your structural integrity increases — joints, tendons, and posture fortify.", type: "passive" },
          { name: "Shield Advance", desc: "Your pressing power carries momentum — every push drives enemies back.", type: "active" },
          { name: "Iron Will",      desc: "Fatigue is halved during the last 20% of any training session.", type: "passive" },
        ],
      },
      {
        level: 30,
        name: "War Marshal",
        awakening: "Second Awakening",
        lore: "Battles are won before they begin. You move the barbell like a general commands an army.",
        color: "text-orange-400",
        abilities: [
          { name: "Command Presence", desc: "Your presence in a gym raises the performance of everyone around you.", type: "passive" },
          { name: "Strategic Load",   desc: "You intuitively know the optimal weight for peak performance at any given time.", type: "active" },
          { name: "Rally",            desc: "After a failed attempt, your next attempt gains +10% drive.", type: "passive" },
        ],
      },
      {
        level: 50,
        name: "Shadow Sovereign",
        awakening: "Elite Class",
        lore: "Darkness and iron unite. Your power takes on a gravity of its own — the air bends around your lifts.",
        color: "text-purple-400",
        abilities: [
          { name: "Dark Momentum",   desc: "Your strength spikes during night training sessions.", type: "passive" },
          { name: "Eclipse Lift",    desc: "Once per session, tap into shadow energy for a transcendent set.", type: "active" },
          { name: "Sovereign Aura",  desc: "You radiate command. Competitors subconsciously yield to your presence.", type: "passive" },
        ],
      },
      {
        level: 70,
        name: "Monarch of Ruin",
        awakening: "Sovereign Class",
        lore: "Kingdoms crumble. Enemies flee. You do not chase PRs — PRs happen because you showed up.",
        color: "text-purple-300",
        abilities: [
          { name: "Ruin's Touch",    desc: "Every set leaves the previous record feeling insufficient.", type: "passive" },
          { name: "Dominion",        desc: "You can hold peak output for 50% longer than any other class.", type: "active" },
          { name: "Monarch's Gaze",  desc: "Opponents feel your strength before you move. Fear precedes contact.", type: "passive" },
        ],
      },
      {
        level: 90,
        name: "Absolute Sovereign",
        awakening: "Apex — Transcendent",
        lore: "Beyond power. Beyond rank. The System itself bows. There is no ceiling left to break.",
        color: "text-amber-300",
        abilities: [
          { name: "World-Ender",       desc: "Your lifts defy physics. The System simply records what you accomplish.", type: "passive" },
          { name: "Absolute Authority",desc: "All limits become suggestions. You decide when you are done.", type: "active" },
          { name: "Legacy",            desc: "Every adventurer you train gains +1 to their starting stat pool.", type: "passive" },
        ],
      },
    ],
  },

  {
    id: "berserker",
    name: "Berserker",
    lore: "Pain is your power source. Where others stop, you ignite. The worse it gets, the stronger you become.",
    color: "text-orange-400",
    border: "border-orange-800/60",
    bg: "bg-orange-950/20",
    statWeights: { strength: 1.5, agility: 0, stamina: 2.0, vitality: 0, discipline: 0, sense: 0 },
    evolutions: [
      {
        level: 1,
        name: "Berserker",
        awakening: "Origin",
        lore: "Pain fuels you. The more your body screams, the louder your output roars.",
        color: "text-orange-400",
        abilities: [
          { name: "Blood Rush",    desc: "As sets accumulate, your power increases rather than decreasing.", type: "passive" },
          { name: "Rage Mode",     desc: "Activate when approaching failure. Performance spikes for final reps.", type: "active" },
          { name: "Scar Tissue",   desc: "Soreness from previous workouts translates to strength this session.", type: "passive" },
        ],
      },
      {
        level: 15,
        name: "Blood Warrior",
        awakening: "First Awakening",
        lore: "Your veins run hot. Training sessions leave you feeling alive in a way nothing else does.",
        color: "text-orange-400",
        abilities: [
          { name: "Bloodlust",       desc: "High-intensity training unlocks temporary stat bonuses unique to this class.", type: "passive" },
          { name: "Crimson Drive",   desc: "When everyone else is resting, you're doing your best work.", type: "active" },
          { name: "Battle Scarred",  desc: "Your body adapts faster from brutal sessions than a standard training cycle.", type: "passive" },
        ],
      },
      {
        level: 30,
        name: "Wrath Incarnate",
        awakening: "Second Awakening",
        lore: "Your rage reaches the System itself. The gods of Aethoria note your name.",
        color: "text-red-400",
        abilities: [
          { name: "Wrath's Fuel",    desc: "Anger converts directly to lifting output. Setbacks become strength.", type: "passive" },
          { name: "Incarnate Surge", desc: "Tripling your perceived max effort unlocks a hidden performance tier.", type: "active" },
          { name: "Unbroken",        desc: "You cannot be mentally broken mid-session. Resolve is automatic.", type: "passive" },
        ],
      },
      {
        level: 50,
        name: "God of Destruction",
        awakening: "Elite Class",
        lore: "Nothing survives your passage. You are calamity made flesh, and every weight room knows it.",
        color: "text-red-400",
        abilities: [
          { name: "Destructive Force",  desc: "Each successive set hits harder than the last, never diminishing.", type: "passive" },
          { name: "Obliterate",         desc: "Once per session, shatter your previous record with overwhelming aggression.", type: "active" },
          { name: "Ruin's Immunity",    desc: "You are immune to psychological fatigue. Only the body can stop you.", type: "passive" },
        ],
      },
      {
        level: 70,
        name: "Asura",
        awakening: "Sovereign Class",
        lore: "Six arms. Six weapons. Six simultaneous wars. The Asura has no end state — only escalation.",
        color: "text-purple-400",
        abilities: [
          { name: "Asura's Flames",   desc: "Your body temperature runs hot. Cold environments boost your output.", type: "passive" },
          { name: "Multi-Front War",  desc: "Training multiple muscle groups in the same session compounds output.", type: "active" },
          { name: "Endless Fury",     desc: "You can extend any session 30% beyond your calculated limit.", type: "passive" },
        ],
      },
      {
        level: 90,
        name: "Transcendent Wrath",
        awakening: "Apex — Transcendent",
        lore: "You have passed beyond rage into something the System cannot classify. A new field was created for you.",
        color: "text-amber-300",
        abilities: [
          { name: "Beyond Classification", desc: "The System's strength ceiling does not apply to your class.", type: "passive" },
          { name: "World Breaker",          desc: "A single max-effort set can shake the foundations of a dungeon.", type: "active" },
          { name: "Eternal Flame",          desc: "Your power grows with age rather than diminishing.", type: "passive" },
        ],
      },
    ],
  },

  {
    id: "ranger",
    name: "Ranger",
    lore: "Speed is your language. Awareness is your weapon. You hunt from angles others can't perceive.",
    color: "text-green-400",
    border: "border-green-800/60",
    bg: "bg-green-950/20",
    statWeights: { strength: 0, agility: 2.0, stamina: 0, vitality: 0, discipline: 0, sense: 1.5 },
    evolutions: [
      {
        level: 1,
        name: "Ranger",
        awakening: "Origin",
        lore: "Fast, aware, dangerous. You see the field before the battle begins.",
        color: "text-green-400",
        abilities: [
          { name: "Eagle Eye",      desc: "Your movement quality is exceptional — form breaks under fatigue are rare.", type: "passive" },
          { name: "Swift Strike",   desc: "Speed-focused training (sprints, plyos) grants double the AGI gains.", type: "active" },
          { name: "Adventurer's Read",  desc: "You can sense optimal training pacing instinctively, avoiding overtraining.", type: "passive" },
        ],
      },
      {
        level: 15,
        name: "Swift Adventurer",
        awakening: "First Awakening",
        lore: "Speed becomes your language. You speak it with your body while others are still processing their first word.",
        color: "text-green-400",
        abilities: [
          { name: "Wind Step",      desc: "Explosive movement training (cleans, jumps) has accelerated recovery.", type: "passive" },
          { name: "Predator's Pace",desc: "You set training tempos that break your prey before contact.", type: "active" },
          { name: "Rangefinder",    desc: "Your sense of distance, timing, and spacing is superhuman.", type: "passive" },
        ],
      },
      {
        level: 30,
        name: "Phantom Striker",
        awakening: "Second Awakening",
        lore: "They see nothing. Then they feel everything. You strike before the gap in their guard fully opens.",
        color: "text-teal-400",
        abilities: [
          { name: "Ghost Step",     desc: "Your footwork becomes imperceptible. Opponents cannot track your movement.", type: "passive" },
          { name: "Phantom Burst",  desc: "Activate maximum speed for a 5-second window of pure explosive output.", type: "active" },
          { name: "Afterimage",     desc: "You move so fast that deceptive movement patterns come naturally.", type: "passive" },
        ],
      },
      {
        level: 50,
        name: "Eclipse Dancer",
        awakening: "Elite Class",
        lore: "Light and shadow both serve you. You dance between them so quickly that you appear in two places at once.",
        color: "text-teal-400",
        abilities: [
          { name: "Solar Flare",    desc: "Explosive training peaks are unreachable by slower classes.", type: "passive" },
          { name: "Eclipse Rush",   desc: "A single all-out sprint that breaks the environment's speed record.", type: "active" },
          { name: "Dancer's Grace", desc: "Your agility translates to combat fluidity — grappling becomes effortless.", type: "passive" },
        ],
      },
      {
        level: 70,
        name: "Void Walker",
        awakening: "Sovereign Class",
        lore: "You step outside the physical realm for microseconds. A ghost that strikes like a god.",
        color: "text-cyan-400",
        abilities: [
          { name: "Void Step",       desc: "You can blink between positions. Lateral quickness is unmatched.", type: "passive" },
          { name: "Dimensional Cut", desc: "Your strikes pass through guards as if they don't exist.", type: "active" },
          { name: "Phase Walk",      desc: "You can sustain top-speed movement 40% longer than other classes.", type: "passive" },
        ],
      },
      {
        level: 90,
        name: "Star Remnant",
        awakening: "Apex — Transcendent",
        lore: "A warrior forged from dying stars. Infinite speed. Infinite fury. You burn everything you touch.",
        color: "text-amber-300",
        abilities: [
          { name: "Starfall",       desc: "Your movement creates visible distortions in the air around you.", type: "passive" },
          { name: "Nova Burst",     desc: "Release compressed speed in a single instant that overwhelms all resistance.", type: "active" },
          { name: "Eternal Sprint", desc: "You do not decelerate. Ever.", type: "passive" },
        ],
      },
    ],
  },

  {
    id: "rogue",
    name: "Rogue",
    lore: "Efficiency is violence. You waste nothing — every movement is a calculated strike toward the optimal result.",
    color: "text-violet-400",
    border: "border-violet-800/60",
    bg: "bg-violet-950/20",
    statWeights: { strength: 0, agility: 1.5, stamina: 0, vitality: 0, discipline: 2.0, sense: 0 },
    evolutions: [
      {
        level: 1,
        name: "Rogue",
        awakening: "Origin",
        lore: "You move like a rumor. You strike like a fact. Nothing you do is wasted.",
        color: "text-violet-400",
        abilities: [
          { name: "Precision Strike", desc: "Every rep has intent. Your technique efficiency is class-leading.", type: "passive" },
          { name: "Exploit Weakness", desc: "You identify and target weak points in any opponent's defense instantly.", type: "active" },
          { name: "Silent Work",      desc: "You train without fanfare. Your results speak exclusively.", type: "passive" },
        ],
      },
      {
        level: 15,
        name: "Shadow Step",
        awakening: "First Awakening",
        lore: "You are gone before they realize you were there. Your presence is optional.",
        color: "text-violet-400",
        abilities: [
          { name: "Invisible Pressure", desc: "Your training creates results that seem impossible given visible effort.", type: "passive" },
          { name: "Vanishing Act",       desc: "You recover from exertion while appearing to still be working.", type: "active" },
          { name: "Feint",               desc: "You can break opponents' rhythm with minimal energy expenditure.", type: "passive" },
        ],
      },
      {
        level: 30,
        name: "Silent Assassin",
        awakening: "Second Awakening",
        lore: "One strike. Perfect placement. The fight ends before the opponent processes the opening.",
        color: "text-indigo-400",
        abilities: [
          { name: "Kill Shot",        desc: "Finishers (last set, last rep) deal disproportionate adaptation stress.", type: "passive" },
          { name: "Assassinate",      desc: "Identify the single highest-leverage movement of a session and double its impact.", type: "active" },
          { name: "Zero Wasted Reps", desc: "Every rep counts toward your goal. Junk volume is automatically filtered.", type: "passive" },
        ],
      },
      {
        level: 50,
        name: "Death's Edge",
        awakening: "Elite Class",
        lore: "You have mastered the boundary between effort and injury, walking it like a tightrope over infinite darkness.",
        color: "text-indigo-400",
        abilities: [
          { name: "Razor's Edge",   desc: "You consistently train at exactly the optimal intensity — never under, never over.", type: "passive" },
          { name: "Death Blow",     desc: "A single technique performed perfectly delivers maximum possible damage.", type: "active" },
          { name: "Cold Read",      desc: "You assess opponents and training variables in under one second.", type: "passive" },
        ],
      },
      {
        level: 70,
        name: "Specter",
        awakening: "Sovereign Class",
        lore: "You haunt the battlefield. Neither living nor dead — just utterly lethal and completely untouchable.",
        color: "text-purple-400",
        abilities: [
          { name: "Haunt",           desc: "Opponents are psychologically unable to predict your next move.", type: "passive" },
          { name: "Spectral Strike", desc: "An attack that cannot be blocked because it has already happened.", type: "active" },
          { name: "Phase",           desc: "You absorb 30% less fatigue from suboptimal training conditions.", type: "passive" },
        ],
      },
      {
        level: 90,
        name: "Rift Walker",
        awakening: "Apex — Transcendent",
        lore: "You cut through dimensions like flesh. The universe itself becomes your most dangerous weapon.",
        color: "text-amber-300",
        abilities: [
          { name: "Reality Cut",      desc: "Your strikes exist in multiple timelines. Blocking one leaves three open.", type: "passive" },
          { name: "Rift Step",        desc: "Teleport behind any opponent. Distance is a convention you ignore.", type: "active" },
          { name: "Dimensional Thief",desc: "You steal energy from opponents and add it to your own pool.", type: "passive" },
        ],
      },
    ],
  },

  {
    id: "monk",
    name: "Monk",
    lore: "Your body is both temple and weapon. Endurance, recovery, and presence forged into one indestructible form.",
    color: "text-teal-400",
    border: "border-teal-800/60",
    bg: "bg-teal-950/20",
    statWeights: { strength: 0, agility: 0, stamina: 2.0, vitality: 1.5, discipline: 0, sense: 0 },
    evolutions: [
      {
        level: 1,
        name: "Monk",
        awakening: "Origin",
        lore: "You need no weapon because you are one. Every surface on your body has been hardened to strike.",
        color: "text-teal-400",
        abilities: [
          { name: "Iron Body",      desc: "Your physical conditioning absorbs more training volume with less damage.", type: "passive" },
          { name: "Inner Calm",     desc: "Under maximum exertion, your heart rate stabilizes faster than others.", type: "active" },
          { name: "Temple Form",    desc: "Your movement mechanics are structurally optimal — injury risk is minimal.", type: "passive" },
        ],
      },
      {
        level: 15,
        name: "Iron Fist",
        awakening: "First Awakening",
        lore: "Your body is your weapon. Every surface a striking surface. Every motion a controlled explosion.",
        color: "text-teal-400",
        abilities: [
          { name: "Hardened Strike", desc: "Striking and grappling conditioning accumulates faster than other classes.", type: "passive" },
          { name: "Iron Palm",       desc: "Your grip and striking power are measured in a class of their own.", type: "active" },
          { name: "Fortify",         desc: "Each training cycle thickens your armor by a measurable amount.", type: "passive" },
        ],
      },
      {
        level: 30,
        name: "Breath Master",
        awakening: "Second Awakening",
        lore: "You control your inner world. When others exhaust themselves panicking, you breathe and advance.",
        color: "text-cyan-400",
        abilities: [
          { name: "Controlled Chaos", desc: "High-intensity work doesn't disrupt your breathing cadence.", type: "passive" },
          { name: "Breath Technique", desc: "Activate perfect breathing form to extend your current set by 3 reps.", type: "active" },
          { name: "Center",           desc: "You can reset your physiological state mid-session through breathwork.", type: "passive" },
        ],
      },
      {
        level: 50,
        name: "Temple Guardian",
        awakening: "Elite Class",
        lore: "Unbreakable. Unmovable. You have been tested by every dungeon Aethoria has, and none could crack you.",
        color: "text-cyan-400",
        abilities: [
          { name: "Absolute Defense",  desc: "Your body absorbs impact — both physical and psychological — without faltering.", type: "passive" },
          { name: "Guardian Stance",   desc: "Enter a state of absolute composure that outlasts any opponent's aggression.", type: "active" },
          { name: "The Wall",          desc: "Opponents cannot break through your guard. You are the last line of defense.", type: "passive" },
        ],
      },
      {
        level: 70,
        name: "Eternal Sentinel",
        awakening: "Sovereign Class",
        lore: "You cannot be exhausted. You cannot be broken. You simply endure until everything else is dust.",
        color: "text-sky-400",
        abilities: [
          { name: "Never Fall",      desc: "You do not experience sudden drops in performance. Decline is gradual and controlled.", type: "passive" },
          { name: "Second Wind",     desc: "Triggered at 20% remaining capacity. Full recovery of working state.", type: "active" },
          { name: "Eternal Stance",  desc: "Your resting state is another adventurer's peak.", type: "passive" },
        ],
      },
      {
        level: 90,
        name: "Undying Iron Will",
        awakening: "Apex — Transcendent",
        lore: "Your body transcends flesh. Even death hesitates at your gates. You are the thing that outlasts the world.",
        color: "text-amber-300",
        abilities: [
          { name: "Undying",         desc: "No training session can end you. You decide when you are done.", type: "passive" },
          { name: "Will of Iron",    desc: "Force any movement to completion through sheer invulnerable resolve.", type: "active" },
          { name: "Living Fortress", desc: "Your body becomes a structure. Nothing enters without permission.", type: "passive" },
        ],
      },
    ],
  },

  {
    id: "tactician",
    name: "Tactician",
    lore: "You see ten moves ahead. Your training is architecture — every session a blueprint for the next level of power.",
    color: "text-sky-400",
    border: "border-sky-800/60",
    bg: "bg-sky-950/20",
    statWeights: { strength: 0, agility: 0, stamina: 0, vitality: 0, discipline: 2.0, sense: 2.0 },
    evolutions: [
      {
        level: 1,
        name: "Tactician",
        awakening: "Origin",
        lore: "You see ten moves ahead. Your opponent fights the past while you execute the future.",
        color: "text-sky-400",
        abilities: [
          { name: "Pattern Recognition", desc: "You identify training plateaus before they form and route around them.", type: "passive" },
          { name: "Optimal Path",        desc: "Select the highest-efficiency exercise for your current goal state.", type: "active" },
          { name: "Chess Mind",          desc: "Every training variable is tracked and weaponized toward your goal.", type: "passive" },
        ],
      },
      {
        level: 15,
        name: "Battle Sage",
        awakening: "First Awakening",
        lore: "Strategy and brawn unite. You are the rare fighter who is also a scholar of combat.",
        color: "text-sky-400",
        abilities: [
          { name: "Sage's Insight",    desc: "Each month of training reveals a hidden pattern most adventurers never see.", type: "passive" },
          { name: "Counter-Strategy",  desc: "When an opponent adapts, you have already adapted to their adaptation.", type: "active" },
          { name: "Knowledge is Power",desc: "Understanding your sport grants equivalent stat gains to physical training.", type: "passive" },
        ],
      },
      {
        level: 30,
        name: "Arcane Marshal",
        awakening: "Second Awakening",
        lore: "You command the impossible. Outcomes that should be random obey your will.",
        color: "text-blue-400",
        abilities: [
          { name: "Arcane Order",    desc: "Your training programming maximizes every biological adaptation window.", type: "passive" },
          { name: "Marshal's Order", desc: "Issue a directive to your body that overrides the current fatigue state.", type: "active" },
          { name: "Grand Design",    desc: "You see the complete 12-month picture. Each session is a stroke of genius.", type: "passive" },
        ],
      },
      {
        level: 50,
        name: "Reality Weaver",
        awakening: "Elite Class",
        lore: "You bend the rules of combat to your design. The System treats your plans as proposals — you treat them as laws.",
        color: "text-blue-400",
        abilities: [
          { name: "Rule Bend",       desc: "Your body ignores one physical limitation per session.", type: "passive" },
          { name: "Reweave",         desc: "Restructure your training mid-session to exploit an emerging advantage.", type: "active" },
          { name: "Calculated Risk", desc: "Every gamble you take in training pays off at 120% of expected return.", type: "passive" },
        ],
      },
      {
        level: 70,
        name: "System Override",
        awakening: "Sovereign Class",
        lore: "You have learned to read the System's own code — and now you edit it in real time.",
        color: "text-indigo-400",
        abilities: [
          { name: "Admin Access",    desc: "You can request additional stat allocations outside the normal level-up cycle.", type: "passive" },
          { name: "Override",        desc: "Temporarily disable one of an opponent's class abilities.", type: "active" },
          { name: "Root Privileges", desc: "Your understanding of the System grants +2 to all future stat gains.", type: "passive" },
        ],
      },
      {
        level: 90,
        name: "Aethoria's Architect",
        awakening: "Apex — Transcendent",
        lore: "You designed this world's rules. The dungeon bosses consult you before setting traps.",
        color: "text-amber-300",
        abilities: [
          { name: "World Design",    desc: "You can alter training conditions to suit your ideal scenario at will.", type: "passive" },
          { name: "Blueprint",       desc: "One session per month, operate with perfect conditions regardless of circumstances.", type: "active" },
          { name: "Author",          desc: "You write the ending. No outcome is outside your planning horizon.", type: "passive" },
        ],
      },
    ],
  },
];

// ── Apex Hybrid Classes (unlocked Lv 80+) ─────────────────────────────────

export const APEX_CLASSES: ApexClass[] = [
  {
    id: "iron_shadow",
    name: "Iron Shadow",
    lore: "Power wrapped in absolute silence. You are the unstoppable force that no one sees coming.",
    color: "text-purple-300",
    border: "border-purple-700/60",
    requiredLevel: 80,
    bases: ["warrior", "rogue"],
    abilities: [
      { name: "Silent Colossus",  desc: "You move with warrior strength and rogue silence simultaneously.", type: "passive" },
      { name: "Death Lift",       desc: "A maximum-strength movement delivered from a ghost's positioning.", type: "active" },
      { name: "Iron Ghost",       desc: "Your presence is optional. Your results are undeniable.", type: "passive" },
    ],
  },
  {
    id: "eternal_wrath",
    name: "Eternal Wrath",
    lore: "Your rage is undying. Your body unbreakable. You are a perfect storm that never weakens.",
    color: "text-red-300",
    border: "border-red-700/60",
    requiredLevel: 80,
    bases: ["berserker", "monk"],
    abilities: [
      { name: "Undying Rage",    desc: "Your berserker fury is contained in an indestructible monk's vessel.", type: "passive" },
      { name: "Endless Storm",   desc: "Activate simultaneous rage and centering — catastrophic and controlled output.", type: "active" },
      { name: "Perfect Chaos",   desc: "You channel destruction with surgical precision.", type: "passive" },
    ],
  },
  {
    id: "phantom_sovereign",
    name: "Phantom Sovereign",
    lore: "Speed. Silence. Dominion. You hunt from realms your opponents cannot perceive.",
    color: "text-teal-300",
    border: "border-teal-700/60",
    requiredLevel: 80,
    bases: ["ranger", "rogue"],
    abilities: [
      { name: "Sovereign's Shadow", desc: "Maximum speed with rogue-level precision — an unreachable combination.", type: "passive" },
      { name: "Phantom Hunt",       desc: "Engage an opponent from a dimension they cannot defend against.", type: "active" },
      { name: "Domain of Silence",  desc: "Within your training space, you control all movement variables.", type: "passive" },
    ],
  },
  {
    id: "war_sage",
    name: "War Sage",
    lore: "Unlimited strength guided by perfect intelligence. There is no scenario you cannot dominate.",
    color: "text-amber-300",
    border: "border-amber-700/60",
    requiredLevel: 80,
    bases: ["warrior", "tactician"],
    abilities: [
      { name: "Strategic Force",  desc: "Every lift is placed with warrior power and sage precision.", type: "passive" },
      { name: "Decisive Blow",    desc: "The calculated perfect strike, delivered with overwhelming force.", type: "active" },
      { name: "General's Body",   desc: "Your physical capabilities match your strategic genius.", type: "passive" },
    ],
  },
  {
    id: "blood_monk",
    name: "Blood Monk",
    lore: "Controlled fury. The chaos burns within, the discipline holds without. You are beautiful destruction.",
    color: "text-orange-300",
    border: "border-orange-700/60",
    requiredLevel: 80,
    bases: ["berserker", "monk"],
    abilities: [
      { name: "Burning Temple",   desc: "Your monk body fuels the berserker's fire indefinitely.", type: "passive" },
      { name: "Sacred Rage",      desc: "Enter a state of structured fury — maximum output, zero injury risk.", type: "active" },
      { name: "Iron Inferno",     desc: "Every strike burns. Every block absorbs. You are unstoppable and unbreakable.", type: "passive" },
    ],
  },
  {
    id: "eclipse_sovereign",
    name: "Eclipse Sovereign",
    lore: "You see all. You move before the enemy thinks. You strike from angles that don't exist yet.",
    color: "text-cyan-300",
    border: "border-cyan-700/60",
    requiredLevel: 80,
    bases: ["ranger", "tactician"],
    abilities: [
      { name: "All-Seeing",        desc: "You perceive every variable in the training environment simultaneously.", type: "passive" },
      { name: "Eclipse Protocol",  desc: "Execute a perfect sequence of movements designed 10 sets in advance.", type: "active" },
      { name: "Inevitable",        desc: "Your outcome was decided before you entered the room.", type: "passive" },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

interface StatBonuses {
  strength: number;
  agility: number;
  stamina: number;
  vitality: number;
  discipline: number;
  sense: number;
}

/** Determine base class from questionnaire stat bonus distribution */
export function determineBaseClass(bonuses: StatBonuses): BaseClassId {
  const scores: Record<BaseClassId, number> = {
    warrior:   bonuses.strength * 2.0 + bonuses.vitality * 1.5,
    berserker: bonuses.strength * 1.5 + bonuses.stamina  * 2.0,
    ranger:    bonuses.agility  * 2.0 + bonuses.sense    * 1.5,
    rogue:     bonuses.agility  * 1.5 + bonuses.discipline * 2.0,
    monk:      bonuses.stamina  * 2.0 + bonuses.vitality * 1.5,
    tactician: bonuses.discipline * 2.0 + bonuses.sense  * 2.0,
  };
  return (Object.entries(scores) as [BaseClassId, number][])
    .reduce((a, b) => b[1] > a[1] ? b : a)[0];
}

/** Get the current evolution tier for a base class + level */
export function getCurrentEvolution(baseClassId: BaseClassId, level: number): EvolutionTier {
  const cls = BASE_CLASSES.find(c => c.id === baseClassId)!;
  const tiers = [...cls.evolutions].reverse();
  return tiers.find(t => level >= t.level) ?? cls.evolutions[0];
}

/** Get the next evolution (or null if at apex) */
export function getNextEvolution(baseClassId: BaseClassId, level: number): EvolutionTier | null {
  const cls = BASE_CLASSES.find(c => c.id === baseClassId)!;
  const current = getCurrentEvolution(baseClassId, level);
  const idx = cls.evolutions.findIndex(t => t.name === current.name);
  return cls.evolutions[idx + 1] ?? null;
}

/** Get base class object by id */
export function getBaseClass(id: BaseClassId): BaseClass {
  return BASE_CLASSES.find(c => c.id === id) ?? BASE_CLASSES[0];
}

/** Get available apex classes for this base class + level */
export function getAvailableApexClasses(baseClassId: BaseClassId, level: number): ApexClass[] {
  if (level < 80) return [];
  return APEX_CLASSES.filter(a => a.bases.includes(baseClassId));
}

// ── localStorage persistence ───────────────────────────────────────────────

const CLASS_KEY = "rpg_class_base_v1";

export function getStoredBaseClass(): BaseClassId | null {
  try {
    const v = localStorage.getItem(CLASS_KEY);
    return v as BaseClassId | null;
  } catch {
    return null;
  }
}

export function storeBaseClass(id: BaseClassId): void {
  try {
    localStorage.setItem(CLASS_KEY, id);
  } catch {
    // ignore
  }
}
