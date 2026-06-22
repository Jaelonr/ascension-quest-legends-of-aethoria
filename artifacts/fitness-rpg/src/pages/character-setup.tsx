import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useSetupPlayer } from "@workspace/api-client-react";
import { markSetupComplete } from "@/hooks/use-story";
import { APEX_CLASSES, BASE_CLASSES, determineBaseClass, getBaseClass, getCurrentEvolution, getNextEvolution, storeBaseClass } from "@/hooks/use-class";
import { useSettings } from "@/hooks/use-settings";
import { useSoundEngine } from "@/hooks/use-sound-engine";
import { cn } from "@/lib/utils";

// ── Stat types ─────────────────────────────────────────────────────────────
interface StatBonuses {
  strength: number;
  agility: number;
  stamina: number;
  vitality: number;
  discipline: number;
  sense: number;
}

const ZERO_STATS: StatBonuses = { strength: 0, agility: 0, stamina: 0, vitality: 0, discipline: 0, sense: 0 };

function addStats(a: StatBonuses, b: StatBonuses): StatBonuses {
  return {
    strength: a.strength + b.strength,
    agility: a.agility + b.agility,
    stamina: a.stamina + b.stamina,
    vitality: a.vitality + b.vitality,
    discipline: a.discipline + b.discipline,
    sense: a.sense + b.sense,
  };
}

// ── Question definitions ────────────────────────────────────────────────────
const BACKGROUNDS = [
  {
    id: "warrior",
    label: "Iron Warrior",
    desc: "Heavy iron was your calling. You forged your body through relentless lifting.",
    tag: "STR · VIT",
    color: "text-red-400",
    border: "border-red-800/60",
    bonuses: { ...ZERO_STATS, strength: 3, vitality: 2 },
  },
  {
    id: "swift",
    label: "Swift Shadow",
    desc: "Speed and endurance defined you. You could outrun, outpace, outlast anyone.",
    tag: "AGI · STA",
    color: "text-green-400",
    border: "border-green-800/60",
    bonuses: { ...ZERO_STATS, agility: 3, stamina: 2 },
  },
  {
    id: "precise",
    label: "Precise Tactician",
    desc: "Form over force. You trained with intention — technique, consistency, mastery.",
    tag: "DIS · SEN",
    color: "text-violet-400",
    border: "border-violet-800/60",
    bonuses: { ...ZERO_STATS, discipline: 3, sense: 2 },
  },
  {
    id: "unawakened",
    label: "The Unawakened",
    desc: "You stood at the threshold, untested. But that changes today.",
    tag: "Balanced",
    color: "text-amber-400",
    border: "border-amber-800/60",
    bonuses: { strength: 1, agility: 1, stamina: 1, vitality: 1, discipline: 1, sense: 0 },
  },
];

const GOALS = [
  {
    id: "strength",
    label: "Forge Pure Power",
    desc: "Maximum strength and size. Iron bends to your will.",
    tag: "STR · VIT",
    color: "text-red-400",
    border: "border-red-800/60",
    bonuses: { ...ZERO_STATS, strength: 3, vitality: 2 },
    goalStr: "Become the strongest adventurer in all of Aethoria",
  },
  {
    id: "allround",
    label: "All-Around Warrior",
    desc: "Strength, conditioning, endurance — mastery of all forms.",
    tag: "Balanced",
    color: "text-sky-400",
    border: "border-sky-800/60",
    bonuses: { strength: 2, agility: 1, stamina: 1, vitality: 0, discipline: 1, sense: 0 },
    goalStr: "Master every form of combat and conditioning",
  },
  {
    id: "combat",
    label: "Combat Arts Master",
    desc: "Striking, grappling, and the precision to end fights instantly.",
    tag: "AGI · DIS",
    color: "text-orange-400",
    border: "border-orange-800/60",
    bonuses: { ...ZERO_STATS, agility: 2, discipline: 2, sense: 1 },
    goalStr: "Dominate every form of combat — striking and grappling",
  },
  {
    id: "endurance",
    label: "Endurance Sovereign",
    desc: "You will outlast every enemy, every trial, every storm.",
    tag: "STA · SEN",
    color: "text-teal-400",
    border: "border-teal-800/60",
    bonuses: { ...ZERO_STATS, stamina: 3, sense: 2 },
    goalStr: "Build a body that can endure anything Aethoria throws at it",
  },
];

const FREQUENCIES = [
  {
    id: "daily",
    label: "Every Day",
    desc: "I never rest. Training is life.",
    tag: "All stats +2",
    bonuses: { strength: 2, agility: 2, stamina: 2, vitality: 2, discipline: 2, sense: 2 },
  },
  {
    id: "regular",
    label: "3–4× per Week",
    desc: "Consistent discipline. I show up more than most.",
    tag: "All stats +1",
    bonuses: { strength: 1, agility: 1, stamina: 1, vitality: 1, discipline: 1, sense: 1 },
  },
  {
    id: "occasional",
    label: "1–2× per Week",
    desc: "I was just finding my rhythm before the summoning.",
    tag: "No bonus",
    bonuses: { ...ZERO_STATS },
  },
  {
    id: "none",
    label: "Not at All",
    desc: "This body is untested. I awaken fresh and hungry.",
    tag: "No bonus",
    bonuses: { ...ZERO_STATS },
  },
];

const ARMORY = [
  {
    id: "barbell",
    label: "Free Weights",
    desc: "Barbell, power rack, plates, bench",
    equipmentIds: [1, 3, 4, 5, 6, 10],
  },
  {
    id: "smith",
    label: "Smith Machine",
    desc: "Guided barbell system",
    equipmentIds: [2],
  },
  {
    id: "machines",
    label: "Machines / Cable",
    desc: "Leg press, cable pulleys, hack squat",
    equipmentIds: [7, 11],
  },
  {
    id: "mat",
    label: "Wrestling Mat",
    desc: "Ground work, grappling, BJJ",
    equipmentIds: [9],
  },
  {
    id: "bag",
    label: "Heavy Bag / Striking",
    desc: "Bag work, pad training, boxing",
    equipmentIds: [8],
  },
  {
    id: "bodyweight",
    label: "Bodyweight Only",
    desc: "No equipment — just the body",
    equipmentIds: [],
  },
];

const STYLES = [
  {
    id: "force",
    label: "Raw Force",
    desc: "I overwhelm with power. Every rep is a war.",
    tag: "STR +2",
    color: "text-red-400",
    border: "border-red-800/60",
    bonuses: { ...ZERO_STATS, strength: 2 },
  },
  {
    id: "tactical",
    label: "Calculated Precision",
    desc: "Every movement is intentional. I train with mastery in mind.",
    tag: "DIS +2 · SEN +1",
    color: "text-violet-400",
    border: "border-violet-800/60",
    bonuses: { ...ZERO_STATS, discipline: 2, sense: 1 },
  },
  {
    id: "endure",
    label: "Relentless Pressure",
    desc: "I outlast my enemies. They fall before I do.",
    tag: "STA +2 · VIT +1",
    color: "text-teal-400",
    border: "border-teal-800/60",
    bonuses: { ...ZERO_STATS, stamina: 2, vitality: 1 },
  },
  {
    id: "speed",
    label: "Blinding Speed",
    desc: "Fast, unpredictable, invisible. They can't catch what they can't see.",
    tag: "AGI +2 · SEN +1",
    color: "text-green-400",
    border: "border-green-800/60",
    bonuses: { ...ZERO_STATS, agility: 2, sense: 1 },
  },
];

const SYSTEM_ACTIVITY_LEVELS: { id: Exclude<ActivityLevel, "">; label: string; desc: string }[] = [
  { id: "sedentary", label: "Low Motion", desc: "Most days are seated or lightly active." },
  { id: "light", label: "Lightly Active", desc: "Movement or training 1-3 days each week." },
  { id: "moderate", label: "Battle-Ready", desc: "Training or hard movement 3-5 days each week." },
  { id: "active", label: "Frontline Tempo", desc: "Hard movement or training nearly every day." },
  { id: "very_active", label: "Relentless", desc: "Physical work or training multiple times per day." },
];

// ── Archetype derivation handled by use-class ──────────────────────────────

const STAT_META: { key: keyof StatBonuses; label: string; color: string; bg: string }[] = [
  { key: "strength",   label: "STR", color: "text-red-400",    bg: "bg-red-500" },
  { key: "agility",    label: "AGI", color: "text-green-400",  bg: "bg-green-500" },
  { key: "stamina",    label: "STA", color: "text-orange-400", bg: "bg-orange-500" },
  { key: "vitality",   label: "VIT", color: "text-blue-400",   bg: "bg-blue-500" },
  { key: "discipline", label: "DIS", color: "text-violet-400", bg: "bg-violet-500" },
  { key: "sense",      label: "SEN", color: "text-cyan-400",   bg: "bg-cyan-500" },
];

type SetupSex = "male" | "female" | "other" | "";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active" | "";
type Step = "name" | "systemScan" | "background" | "goal" | "frequency" | "armory" | "style" | "confirm";
const STEPS: Step[] = ["name", "systemScan", "background", "goal", "frequency", "armory", "style", "confirm"];
const STEP_LABELS: Record<Step, string> = {
  name: "Identity",
  systemScan: "System Scan",
  background: "Origin",
  goal: "Mission",
  frequency: "History",
  armory: "Armory",
  style: "Combat Style",
  confirm: "Confirmation",
};

export default function CharacterSetup() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const setupMutation = useSetupPlayer();
  const { settings } = useSettings();
  const { playSound } = useSoundEngine();
  const isImperial = settings.units.weight === "lbs";
  const ritualMotion = !settings.appearance.reducedMotion;

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animating, setAnimating] = useState(false);

  // Answers
  const [adventurerName, setAdventurerName] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [sex, setSex] = useState<SetupSex>("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("");
  const [background, setBackground] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<string | null>(null);
  const [armorySelected, setArmorySelected] = useState<Set<string>>(new Set());
  const [style, setStyle] = useState<string | null>(null);

  const currentStep = STEPS[stepIndex];
  const totalSteps = STEPS.length;
  const heightUnit = isImperial ? "in" : "cm";
  const weightUnit = isImperial ? "lb" : "kg";
  const heightPlaceholder = isImperial ? "inches, optional" : "cm, optional";
  const weightPlaceholder = isImperial ? "lbs, optional" : "kg, optional";
  const toStoredCm = (value: string) => {
    const n = Number(value);
    if (!value || Number.isNaN(n) || n <= 0) return null;
    return isImperial ? Math.round(n * 2.54 * 10) / 10 : n;
  };
  const toStoredKg = (value: string) => {
    const n = Number(value);
    if (!value || Number.isNaN(n) || n <= 0) return null;
    return isImperial ? Math.round((n / 2.20462) * 100) / 100 : n;
  };

  const systemScanBonuses = (): StatBonuses => {
    let total = { ...ZERO_STATS };
    const activityBonuses: Record<Exclude<ActivityLevel, "">, StatBonuses> = {
      sedentary: { ...ZERO_STATS },
      light: { ...ZERO_STATS, discipline: 1 },
      moderate: { ...ZERO_STATS, stamina: 1, discipline: 1 },
      active: { ...ZERO_STATS, stamina: 1, vitality: 1 },
      very_active: { ...ZERO_STATS, stamina: 2, discipline: 1 },
    };
    if (activityLevel) total = addStats(total, activityBonuses[activityLevel]);

    armorySelected.forEach(id => {
      const bonusesByArmory: Record<string, StatBonuses> = {
        barbell: { ...ZERO_STATS, strength: 1, vitality: 1 },
        smith: { ...ZERO_STATS, strength: 1 },
        machines: { ...ZERO_STATS, vitality: 1 },
        mat: { ...ZERO_STATS, stamina: 1, sense: 1 },
        bag: { ...ZERO_STATS, agility: 1, discipline: 1 },
        bodyweight: { ...ZERO_STATS, stamina: 1, discipline: 1 },
      };
      total = addStats(total, bonusesByArmory[id] ?? ZERO_STATS);
    });
    return total;
  };

  // Compute total stat bonuses
  const totalBonuses = (): StatBonuses => {
    let total = { ...ZERO_STATS };
    total = addStats(total, systemScanBonuses());
    if (background) {
      const b = BACKGROUNDS.find(x => x.id === background);
      if (b) total = addStats(total, b.bonuses);
    }
    if (goal) {
      const g = GOALS.find(x => x.id === goal);
      if (g) total = addStats(total, g.bonuses);
    }
    if (frequency) {
      const f = FREQUENCIES.find(x => x.id === frequency);
      if (f) total = addStats(total, f.bonuses);
    }
    if (style) {
      const s = STYLES.find(x => x.id === style);
      if (s) total = addStats(total, s.bonuses);
    }
    return total;
  };

  const selectedEquipmentIds = (): number[] => {
    const ids: number[] = [];
    armorySelected.forEach(id => {
      const item = ARMORY.find(a => a.id === id);
      if (item) ids.push(...item.equipmentIds);
    });
    return [...new Set(ids)];
  };

  const selectedEquipmentTypes = (): string[] => Array.from(armorySelected);

  const inferredWeightGoal = (): "lose" | "maintain" | "gain" => {
    if (goal === "strength" || goal === "combat") return "gain";
    if (goal === "endurance") return "maintain";
    return "maintain";
  };

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case "name": return adventurerName.trim().length >= 2;
      case "systemScan": return !!sex && !!activityLevel && Number(ageYears) >= 10 && Number(ageYears) <= 100;
      case "background": return background !== null;
      case "goal": return goal !== null;
      case "frequency": return frequency !== null;
      case "armory": return armorySelected.size > 0;
      case "style": return style !== null;
      case "confirm": return true;
    }
  };

  function advance() {
    if (animating) return;
    playSound("summon");
    setDirection("forward");
    setAnimating(true);
    setTimeout(() => {
      setStepIndex(i => i + 1);
      setAnimating(false);
    }, 220);
  }

  function back() {
    if (animating || stepIndex === 0) return;
    playSound("set-logged");
    setDirection("back");
    setAnimating(true);
    setTimeout(() => {
      setStepIndex(i => i - 1);
      setAnimating(false);
    }, 220);
  }

  function toggleArmory(id: string) {
    setArmorySelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirm() {
    const bonuses = totalBonuses();
    const goalObj = GOALS.find(g => g.id === goal);
    const classId = determineBaseClass(bonuses);

    await setupMutation.mutateAsync({
      data: {
        name: adventurerName.trim() || "Adventurer",
        statBonuses: bonuses,
        equipmentIds: selectedEquipmentIds(),
        baseClass: classId,
        goal: goalObj?.goalStr ?? "",
        systemScan: {
          ageYears: Number(ageYears),
          sex: sex || undefined,
          heightCm: toStoredCm(heightCm),
          weightKg: toStoredKg(weightKg),
          activityLevel: activityLevel || undefined,
          weightGoal: inferredWeightGoal(),
          equipmentTypes: selectedEquipmentTypes(),
        },
      },
    });

    storeBaseClass(classId);
    await queryClient.invalidateQueries();
    markSetupComplete();
    navigate("/");
  }

  const bonuses = totalBonuses();
  const assignedClassId = determineBaseClass(bonuses);
  const assignedClass = getBaseClass(assignedClassId);
  const assignedEvo = getCurrentEvolution(assignedClassId, 1);
  const nextEvo = getNextEvolution(assignedClassId, 1);
  const classForecast = BASE_CLASSES
    .map(cls => ({
      cls,
      score: Object.entries(cls.statWeights).reduce((sum, [key, weight]) => sum + bonuses[key as keyof StatBonuses] * weight, 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const specialtyPaths = APEX_CLASSES.filter(apex => apex.bases.includes(assignedClassId));
  const maxBonus = Math.max(...Object.values(bonuses), 1);

  const slideClass = animating
    ? direction === "forward"
      ? "opacity-0 translate-x-8"
      : "opacity-0 -translate-x-8"
    : "opacity-100 translate-x-0";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 px-4 pt-safe-top">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-cyan-400/70 uppercase tracking-widest">
                System
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">
                Adventurer Assessment
              </span>
            </div>
            <span className="text-[9px] font-mono text-muted-foreground">
              {stepIndex + 1} / {totalSteps}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-px bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step tabs */}
      <div className="fixed top-[52px] left-0 right-0 z-10 overflow-x-auto scrollbar-none">
        <div className="flex gap-1 px-4 py-2 max-w-lg mx-auto">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "text-[9px] font-mono uppercase tracking-wide px-2 py-1 rounded-sm whitespace-nowrap transition-colors",
                i === stepIndex
                  ? "text-cyan-400 bg-cyan-950/40"
                  : i < stepIndex
                  ? "text-white/40"
                  : "text-white/20"
              )}
            >
              {i < stepIndex ? "✓" : i === stepIndex ? "▶" : "○"} {STEP_LABELS[s]}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col pt-[96px] pb-[100px] px-4 overflow-y-auto">
        <div className="max-w-lg mx-auto w-full">
          <div
            className={cn(
              "transition-all duration-200 ease-out",
              slideClass
            )}
          >
            {/* ── NAME ───────────────────────────────────────────────── */}
            {currentStep === "name" && (
              <div className="space-y-6 pt-8 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 -z-0 opacity-70">
                  <div className={cn("absolute left-1/2 top-8 h-48 w-48 -translate-x-1/2 rounded-full border border-cyan-400/20", ritualMotion && "system-gate-spin")} />
                  <div className={cn("absolute left-1/2 top-14 h-36 w-36 -translate-x-1/2 rounded-full border border-cyan-300/15", ritualMotion && "system-gate-pulse")} />
                  <div className={cn("absolute inset-x-6 top-24 h-px bg-cyan-400/30", ritualMotion && "animate-pulse")} />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1 system-text-glow">
                    [ System Notification ]
                  </p>
                  <h1 className="text-2xl font-serif text-white leading-snug mb-2">
                    A new adventurer has been detected.
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The System requires identification. What shall Aethoria call you?
                  </p>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={adventurerName}
                    onChange={e => setAdventurerName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && canAdvance() && advance()}
                    placeholder="Enter your name, adventurer..."
                    maxLength={24}
                    autoFocus
                    className={cn(
                      "w-full bg-transparent border rounded-lg px-4 py-4 text-lg font-serif text-white placeholder:text-white/20 outline-none transition-colors",
                      adventurerName.trim().length >= 2
                        ? "border-cyan-500/60 focus:border-cyan-400"
                        : "border-white/20 focus:border-white/40"
                    )}
                  />
                  {adventurerName.trim().length > 0 && adventurerName.trim().length < 2 && (
                    <p className="text-[10px] text-red-400 font-mono">Minimum 2 characters required.</p>
                  )}
                </div>
                {adventurerName.trim().length >= 2 && (
                  <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/20 px-4 py-3">
                    <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Registered</p>
                    <p className="text-base font-serif text-white">{adventurerName.trim()}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── BACKGROUND ─────────────────────────────────────────── */}
            {currentStep === "systemScan" && (
              <div className="space-y-5 pt-4 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 -z-0">
                  <div className={cn("absolute right-4 top-0 h-40 w-40 rounded-full border border-cyan-500/15", ritualMotion && "system-gate-spin")} />
                  <div className={cn("absolute -left-8 top-24 h-32 rounded-full border border-amber-400/10", ritualMotion && "system-gate-pulse")} />
                  <div className={cn("absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent", ritualMotion && "system-scanline")} />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1 system-text-glow">
                    [ System Scan ]
                  </p>
                  <h2 className="text-xl font-serif text-white leading-snug mb-1">
                    Confirm the vessel brought through the Gate.
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The System records only what the Guild ledger needs for fair commissions, nutrition targets, and equipment-aware training. Imperial units are the default; metric can be selected in Settings.
                  </p>
                </div>

                <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/15 p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Age</span>
                      <input
                        type="number"
                        min={10}
                        max={100}
                        value={ageYears}
                        onChange={e => setAgeYears(e.target.value)}
                        placeholder="Years"
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-cyan-500/60"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Sex</span>
                      <select
                        value={sex}
                        onChange={e => setSex(e.target.value as SetupSex)}
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-cyan-500/60"
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Height ({heightUnit})</span>
                      <input
                        type="number"
                        min={isImperial ? 36 : 80}
                        max={isImperial ? 96 : 240}
                        value={heightCm}
                        onChange={e => setHeightCm(e.target.value)}
                        placeholder={heightPlaceholder}
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-cyan-500/60"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Weight ({weightUnit})</span>
                      <input
                        type="number"
                        min={isImperial ? 60 : 30}
                        max={isImperial ? 700 : 300}
                        value={weightKg}
                        onChange={e => setWeightKg(e.target.value)}
                        placeholder={weightPlaceholder}
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-cyan-500/60"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Current activity signal</p>
                  {SYSTEM_ACTIVITY_LEVELS.map(level => (
                    <button
                      key={level.id}
                      onClick={() => setActivityLevel(level.id)}
                      className={cn(
                        "w-full text-left rounded-xl border p-4 transition-all",
                        activityLevel === level.id
                          ? "border-cyan-700/60 bg-cyan-950/30"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      )}
                    >
                      <p className={cn("font-serif text-sm font-medium mb-0.5", activityLevel === level.id ? "text-cyan-300" : "text-white")}>
                        {level.label}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{level.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">System Notice</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Activity and equipment can nudge your starting attributes. Age and sex guide nutrition context only. Your class is shaped by the choices you make here, then earned through action.
                  </p>
                </div>
              </div>
            )}

            {currentStep === "background" && (
              <div className="space-y-5 pt-4">
                <div>
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">
                    [ Origin Scan ]
                  </p>
                  <h2 className="text-xl font-serif text-white leading-snug mb-1">
                    Before the summoning, what role did your body serve?
                  </h2>
                  <p className="text-xs text-muted-foreground">Your origin shapes your starting potential.</p>
                </div>
                <div className="space-y-3">
                  {BACKGROUNDS.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setBackground(b.id)}
                      className={cn(
                        "w-full text-left rounded-xl border p-4 transition-all",
                        background === b.id
                          ? cn("bg-black/60", b.border)
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={cn("font-serif text-sm font-medium mb-0.5", background === b.id ? b.color : "text-white")}>
                            {b.label}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={cn("text-[9px] font-mono px-2 py-0.5 rounded border", background === b.id ? cn(b.color, b.border, "bg-black/30") : "text-white/30 border-white/10")}>
                            {b.tag}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── GOAL ───────────────────────────────────────────────── */}
            {currentStep === "goal" && (
              <div className="space-y-5 pt-4">
                <div>
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">
                    [ Mission Classification ]
                  </p>
                  <h2 className="text-xl font-serif text-white leading-snug mb-1">
                    What is your purpose in Aethoria?
                  </h2>
                  <p className="text-xs text-muted-foreground">Choose the path that calls to you.</p>
                </div>
                <div className="space-y-3">
                  {GOALS.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      className={cn(
                        "w-full text-left rounded-xl border p-4 transition-all",
                        goal === g.id
                          ? cn("bg-black/60", g.border)
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={cn("font-serif text-sm font-medium mb-0.5", goal === g.id ? g.color : "text-white")}>
                            {g.label}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{g.desc}</p>
                        </div>
                        <span className={cn("shrink-0 text-[9px] font-mono px-2 py-0.5 rounded border", goal === g.id ? cn(g.color, g.border, "bg-black/30") : "text-white/30 border-white/10")}>
                          {g.tag}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── FREQUENCY ──────────────────────────────────────────── */}
            {currentStep === "frequency" && (
              <div className="space-y-5 pt-4">
                <div>
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">
                    [ Training History ]
                  </p>
                  <h2 className="text-xl font-serif text-white leading-snug mb-1">
                    How often did you train before the summoning?
                  </h2>
                  <p className="text-xs text-muted-foreground">Your history determines your starting power.</p>
                </div>
                <div className="space-y-3">
                  {FREQUENCIES.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFrequency(f.id)}
                      className={cn(
                        "w-full text-left rounded-xl border p-4 transition-all",
                        frequency === f.id
                          ? "border-cyan-700/60 bg-cyan-950/30"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={cn("font-serif text-sm font-medium mb-0.5", frequency === f.id ? "text-cyan-300" : "text-white")}>
                            {f.label}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                        </div>
                        <span className={cn(
                          "shrink-0 text-[9px] font-mono px-2 py-0.5 rounded border whitespace-nowrap",
                          frequency === f.id ? "text-cyan-400 border-cyan-700/60 bg-cyan-950/30" : "text-white/30 border-white/10"
                        )}>
                          {f.tag}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── ARMORY ─────────────────────────────────────────────── */}
            {currentStep === "armory" && (
              <div className="space-y-5 pt-4">
                <div>
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">
                    [ Armory Registration ]
                  </p>
                  <h2 className="text-xl font-serif text-white leading-snug mb-1">
                    What weapons fill your armory?
                  </h2>
                  <p className="text-xs text-muted-foreground">Select all that apply. These will be added to your equipment list.</p>
                </div>
                <div className="space-y-3">
                  {ARMORY.map(a => {
                    const selected = armorySelected.has(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleArmory(a.id)}
                        className={cn(
                          "w-full text-left rounded-xl border p-4 transition-all",
                          selected
                            ? "border-amber-700/60 bg-amber-950/20"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                            selected ? "border-amber-500 bg-amber-500" : "border-white/30"
                          )}>
                            {selected && <span className="text-black text-[10px] font-bold">✓</span>}
                          </div>
                          <div className="flex-1">
                            <p className={cn("font-serif text-sm font-medium", selected ? "text-amber-300" : "text-white")}>
                              {a.label}
                            </p>
                            <p className="text-xs text-muted-foreground">{a.desc}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STYLE ──────────────────────────────────────────────── */}
            {currentStep === "style" && (
              <div className="space-y-5 pt-4">
                <div>
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">
                    [ Combat Classification ]
                  </p>
                  <h2 className="text-xl font-serif text-white leading-snug mb-1">
                    In battle, how do you fight?
                  </h2>
                  <p className="text-xs text-muted-foreground">Your instincts shape your final stat profile.</p>
                </div>
                <div className="space-y-3">
                  {STYLES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={cn(
                        "w-full text-left rounded-xl border p-4 transition-all",
                        style === s.id
                          ? cn("bg-black/60", s.border)
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={cn("font-serif text-sm font-medium mb-0.5", style === s.id ? s.color : "text-white")}>
                            {s.label}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                        </div>
                        <span className={cn("shrink-0 text-[9px] font-mono px-2 py-0.5 rounded border whitespace-nowrap", style === s.id ? cn(s.color, s.border, "bg-black/30") : "text-white/30 border-white/10")}>
                          {s.tag}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── CONFIRM ────────────────────────────────────────────── */}
            {currentStep === "confirm" && (
              <div className="space-y-6 pt-4">
                <div>
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">
                    [ Assessment Complete ]
                  </p>
                  <h2 className="text-xl font-serif text-white leading-snug mb-1">
                    Adventurer Profile Confirmed
                  </h2>
                  <p className="text-xs text-muted-foreground">Review your initial attributes before entering Aethoria.</p>
                </div>

                {/* Adventurer card */}
                <div className={cn("rounded-xl border p-4 space-y-1", assignedClass.border, assignedClass.bg)}>
                  <p className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">Adventurer Identified</p>
                  <p className="text-xl font-serif text-white">{adventurerName}</p>
                  <p className={cn("text-sm font-serif font-bold", assignedClass.color)}>
                    {assignedEvo.name}
                  </p>
                  <p className="text-[9px] font-mono text-muted-foreground">{assignedClass.name} Class · Origin</p>
                  <p className="text-[10px] text-muted-foreground italic leading-relaxed pt-1">
                    "{assignedEvo.lore}"
                  </p>
                </div>

                <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-4 space-y-3">
                  <div>
                    <p className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">System Forecast</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Your selected history, goal, training access, activity, and combat instinct are shaping this result.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {classForecast.map(({ cls, score }, index) => (
                      <div key={cls.id} className="flex items-center gap-2">
                        <span className="w-5 text-[10px] font-mono text-white/40">#{index + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("text-xs font-serif font-bold", cls.color)}>{cls.name}</span>
                            <span className="text-[10px] font-mono text-white/40">{Math.round(score)} affinity</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
                            <div
                              className={cn("h-full rounded-full", cls.color.replace("text-", "bg-").replace("-400", "-500"))}
                              style={{ width: `${Math.max(8, Math.min(100, (score / Math.max(classForecast[0]?.score || 1, 1)) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {nextEvo && (
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Next Specialty</p>
                      <p className={cn("mt-1 text-sm font-serif font-bold", assignedClass.color)}>{nextEvo.name}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">{nextEvo.awakening} at Level {nextEvo.level}</p>
                    </div>
                  )}
                  {specialtyPaths.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Apex Hybrid Paths</p>
                      <div className="flex flex-wrap gap-1.5">
                        {specialtyPaths.map(apex => (
                          <span key={apex.id} className={cn("rounded border px-2 py-1 text-[9px] font-mono", apex.border, apex.color)}>
                            {apex.name} · Lv {apex.requiredLevel}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stat bars */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <p className="text-[9px] font-mono text-white/50 uppercase tracking-widest">Starting Attributes</p>
                  {STAT_META.map(({ key, label, color, bg }) => {
                    const base = 1;
                    const bonus = bonuses[key];
                    const total = base + bonus;
                    const pct = Math.round((total / (maxBonus + 1)) * 100);
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className={cn("text-[10px] font-mono w-6 shrink-0", color)}>{label}</span>
                        <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-700", bg)} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-white/60 w-6 text-right">{total}</span>
                        {bonus > 0 && (
                          <span className="text-[9px] font-mono text-green-400 w-8">+{bonus}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Equipment summary */}
                {armorySelected.size > 0 && (
                  <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-4">
                    <p className="text-[9px] font-mono text-amber-400 uppercase tracking-widest mb-2">Equipment Unlocked</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(armorySelected).map(id => {
                        const item = ARMORY.find(a => a.id === id);
                        return item ? (
                          <span key={id} className="text-[10px] font-mono px-2 py-0.5 rounded-sm border border-amber-700/40 text-amber-300">
                            {item.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Goal */}
                {goal && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[9px] font-mono text-white/50 uppercase tracking-widest mb-1">Mission</p>
                    <p className="text-xs text-white/80 leading-relaxed">
                      {GOALS.find(g => g.id === goal)?.goalStr}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-lg mx-auto px-4 py-4 flex gap-3">
          {stepIndex > 0 && (
            <button
              onClick={back}
              disabled={animating}
              className="flex-shrink-0 px-5 py-3 rounded-xl border border-white/20 text-white/60 text-sm font-mono hover:text-white hover:border-white/40 transition-colors disabled:opacity-40"
            >
              ← Back
            </button>
          )}
          {currentStep !== "confirm" ? (
            <button
              onClick={advance}
              disabled={!canAdvance() || animating}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-mono font-medium transition-all",
                canAdvance()
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              )}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={confirm}
              disabled={setupMutation.isPending}
              className="flex-1 py-3 rounded-xl text-sm font-serif font-medium transition-all bg-gradient-to-r from-cyan-700 to-violet-700 hover:from-cyan-600 hover:to-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {setupMutation.isPending ? "Initializing..." : "Enter Aethoria →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
