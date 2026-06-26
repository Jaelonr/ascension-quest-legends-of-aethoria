type BossRaidRecord = {
  status: string;
  difficulty?: string | null;
};

const DIFFICULTY_RELIEF: Record<string, number> = {
  E: 4,
  D: 6,
  C: 8,
  B: 10,
  A: 14,
  S: 23,
};

const STARTING_WORLD_DANGER = 77;

const FAILED_INCURSION_PRESSURE: Record<string, number> = {
  E: 3,
  D: 4,
  C: 6,
  B: 8,
  A: 14,
  S: 21,
};

export function buildWorldDanger(raids: BossRaidRecord[]) {
  const defeated = raids.filter((raid) => raid.status === "claimed" || raid.status === "completed");
  const failed = raids.filter((raid) => raid.status === "failed");
  const active = raids.filter((raid) => raid.status === "active");
  const relief = defeated.reduce((sum, raid) => sum + (DIFFICULTY_RELIEF[(raid.difficulty ?? "E").toUpperCase()] ?? 4), 0);
  const failedPressure = failed.reduce((sum, raid) => sum + (FAILED_INCURSION_PRESSURE[(raid.difficulty ?? "E").toUpperCase()] ?? 4), 0);
  const activePressure = active.reduce((sum, raid) => {
    const difficulty = (raid.difficulty ?? "E").toUpperCase();
    return sum + (difficulty === "S" ? 4 : difficulty === "A" ? 3 : 2);
  }, 0);
  const pressure = failedPressure + activePressure;
  const value = Math.max(5, Math.min(100, STARTING_WORLD_DANGER - relief + pressure));
  const state = value >= 90 ? "critical" : value >= 60 ? "severe" : value >= 40 ? "unstable" : value >= 20 ? "guarded" : "recovering";

  return {
    value,
    state,
    defeatedBosses: defeated.length,
    activeThreats: active.length,
    failedIncursions: failed.length,
    label: state === "critical"
      ? "Critical"
      : state === "severe"
        ? "Severe"
        : state === "unstable"
          ? "Unstable"
          : state === "guarded"
            ? "Guarded"
            : "Recovering",
    systemNote: "Only the summoned adventurer can read this System-level danger index. The Guild senses pressure, but not the exact measure.",
    nextRelief: "Aethoria is in severe danger, not final defeat. Other adventurers still hold the line while the summoned adventurer trains, grows, and turns recorded victories into the Guild's comeback. A forced retreat against a major threat can drive the index near collapse, but a rematch victory can pull the world back from the brink.",
  };
}
