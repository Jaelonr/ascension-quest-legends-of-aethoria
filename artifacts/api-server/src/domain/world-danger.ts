type BossRaidRecord = {
  status: string;
  difficulty?: string | null;
};

const DIFFICULTY_RELIEF: Record<string, number> = {
  E: 4,
  D: 6,
  C: 8,
  B: 10,
  A: 12,
  S: 16,
};

export function buildWorldDanger(raids: BossRaidRecord[]) {
  const defeated = raids.filter((raid) => raid.status === "claimed" || raid.status === "completed");
  const failed = raids.filter((raid) => raid.status === "failed");
  const active = raids.filter((raid) => raid.status === "active");
  const relief = defeated.reduce((sum, raid) => sum + (DIFFICULTY_RELIEF[(raid.difficulty ?? "E").toUpperCase()] ?? 4), 0);
  const pressure = failed.length * 5 + active.length * 2;
  const value = Math.max(5, Math.min(100, 100 - relief + pressure));
  const state = value >= 85 ? "critical" : value >= 65 ? "severe" : value >= 40 ? "unstable" : value >= 20 ? "guarded" : "recovering";

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
    nextRelief: "Defeating bosses lowers world danger. Failed incursions and active threats raise it.",
  };
}
