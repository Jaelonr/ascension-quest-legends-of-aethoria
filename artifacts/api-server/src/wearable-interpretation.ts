import {
  SYSTEM_CITATIONS,
  confidencePercent,
  createSystemRecommendation,
  type SystemConfidenceLevel,
  type SystemRecommendation,
} from "./system-recommendations";
import { readinessAgencyNote } from "./product-constitution";

export type WearableSource = "manual" | "apple_health" | "health_connect" | "fitbit" | "garmin" | "samsung_health";

export interface WearableMetricEntry {
  date: string;
  steps: number | null;
  sleepHours: number | null;
  hrv: number | null;
  restingHr: number | null;
  caloriesBurned: number | null;
  activeMinutes: number | null;
  weight: number | null;
  source: string | null;
  createdAt?: Date | string | null;
}

export interface WearableSystemAnalysis {
  source: string | null;
  lastSyncedAt: string | null;
  readiness: "optimal" | "good" | "moderate" | "compromised" | "critical" | "insufficient_data";
  recommendation: string;
  activeRecommendation: string;
  commissionBias: "recovery" | "conditioning" | "training" | "avoid_extra_conditioning" | "observe";
  aldricLine: string;
  systemRecommendation: SystemRecommendation;
  metrics: {
    stepsToday: number | null;
    sleepLastNight: number | null;
    hrvToday: number | null;
    restingHrToday: number | null;
    activeMinutesToday: number | null;
    avgSteps7d: number | null;
    avgSleep7d: number | null;
    avgHrv7d: number | null;
    avgRestingHr7d: number | null;
  };
}

function avg(values: Array<number | null | undefined>) {
  const actual = values.filter((value): value is number => value != null && Number.isFinite(value));
  return actual.length ? Math.round((actual.reduce((sum, value) => sum + value, 0) / actual.length) * 10) / 10 : null;
}

function latestForToday(entries: WearableMetricEntry[], today: string) {
  return entries.find((entry) => entry.date === today) ?? null;
}

function latestSync(entries: WearableMetricEntry[]) {
  const created = entries
    .map((entry) => entry.createdAt ? new Date(entry.createdAt).getTime() : 0)
    .filter((value) => Number.isFinite(value) && value > 0);
  return created.length ? new Date(Math.max(...created)).toISOString() : null;
}

function wearableSourceDocuments(source: string | null) {
  const docs = [
    SYSTEM_CITATIONS.hhsPhysicalActivityGuidelines,
    SYSTEM_CITATIONS.acsmResistanceTraining2025,
  ];
  if (source === "samsung_health") docs.push(SYSTEM_CITATIONS.samsungHealthSdk, SYSTEM_CITATIONS.healthConnectDocs);
  else if (source === "health_connect") docs.push(SYSTEM_CITATIONS.healthConnectDocs);
  else if (source === "apple_health") docs.push(SYSTEM_CITATIONS.appleHealthKitDataTypes);
  else if (source === "fitbit") docs.push(SYSTEM_CITATIONS.fitbitWebApi);
  else if (source === "garmin") docs.push(SYSTEM_CITATIONS.garminHealthApi);
  return docs;
}

function confidenceFor(metricCount: number, imported: boolean): SystemConfidenceLevel {
  if (metricCount <= 0) return "insufficient_data";
  if (metricCount >= 5 && imported) return "high";
  if (metricCount >= 3) return "moderate";
  return "low";
}

export function buildWearableSystemAnalysis(entries: WearableMetricEntry[], today = new Date().toISOString().slice(0, 10)): WearableSystemAnalysis {
  const ordered = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const todayEntry = latestForToday(ordered, today);
  const latest = todayEntry ?? ordered[0] ?? null;
  const source = latest?.source ?? null;
  const imported = source != null && source !== "manual";
  const stepsToday = todayEntry?.steps ?? null;
  const sleepLastNight = latest?.sleepHours ?? null;
  const hrvToday = latest?.hrv ?? null;
  const restingHrToday = latest?.restingHr ?? null;
  const activeMinutesToday = todayEntry?.activeMinutes ?? null;
  const avgSteps7d = avg(ordered.map((entry) => entry.steps));
  const avgSleep7d = avg(ordered.map((entry) => entry.sleepHours));
  const avgHrv7d = avg(ordered.map((entry) => entry.hrv));
  const avgRestingHr7d = avg(ordered.map((entry) => entry.restingHr));

  const metricCount = [
    stepsToday,
    sleepLastNight,
    hrvToday,
    restingHrToday,
    activeMinutesToday,
    avgSteps7d,
    avgSleep7d,
  ].filter((value) => value != null).length;
  const confidenceLevel = confidenceFor(metricCount, imported);

  const reasoning: string[] = [];
  const playerDataUsed: string[] = [];
  let readiness: WearableSystemAnalysis["readiness"] = metricCount ? "good" : "insufficient_data";
  let commissionBias: WearableSystemAnalysis["commissionBias"] = metricCount ? "training" : "observe";
  let recommendation = "Collect more wearable or manual recovery data before adapting today's training.";
  let activeRecommendation = "Log steps, sleep, recovery notes, or sync Health Connect.";

  if (sleepLastNight != null) {
    playerDataUsed.push(`Sleep: ${sleepLastNight} hours`);
    if (sleepLastNight < 4.5) {
      readiness = "critical";
      commissionBias = "recovery";
      reasoning.push("Sleep is far below the recovery threshold used by Ascension Quest for harder training days.");
      recommendation = "Strongly prefer recovery, mobility, nutrition, or very low-intensity work today.";
      activeRecommendation = "Progression is not recommended today. If training anyway, choose a reduced-intensity path and keep the record honest.";
    } else if (sleepLastNight < 6) {
      readiness = "compromised";
      commissionBias = "recovery";
      reasoning.push("Sleep is below the recovery threshold used by Ascension Quest for harder training days.");
      recommendation = "Prefer recovery, mobility, nutrition, or low-intensity work today.";
      activeRecommendation = "Avoid aggressive progression. You may still train, but reduce intensity or choose recovery.";
    } else if (sleepLastNight >= 8) {
      readiness = "optimal";
      reasoning.push("Sleep supports normal or harder work if recent training also supports it.");
      recommendation = "Training is reasonable if other signals and recent performance agree.";
      activeRecommendation = "Harder work is available, but progression still depends on workout history and pain-free execution.";
    } else {
      reasoning.push("Sleep is not below the low-sleep threshold.");
    }
  }

  if (stepsToday != null) {
    playerDataUsed.push(`Steps today: ${stepsToday}`);
    if (stepsToday >= 12000 && readiness !== "critical" && readiness !== "compromised") {
      readiness = sleepLastNight != null && sleepLastNight < 7 ? "moderate" : readiness === "optimal" ? "good" : readiness;
      commissionBias = "avoid_extra_conditioning";
      reasoning.push("Step volume is high enough that extra conditioning should be assigned cautiously.");
      recommendation = "Count today's travel contribution and avoid piling on unnecessary conditioning.";
      activeRecommendation = "Use steps for exploration progress; choose strength, recovery, or skill work if training more.";
    } else if (stepsToday < 3500 && (readiness === "good" || readiness === "optimal")) {
      commissionBias = "conditioning";
      reasoning.push("Low current step volume supports a walking or light-conditioning duty if recovery is otherwise acceptable.");
      recommendation = "A walking, mobility, or light-conditioning commission is appropriate.";
      activeRecommendation = "Use a Frostveil or Silver Coast style route to restart movement.";
    }
  }

  if (hrvToday != null && avgHrv7d != null) {
    playerDataUsed.push(`HRV today: ${hrvToday}`, `7-day average HRV: ${avgHrv7d}`);
    if (hrvToday < avgHrv7d * 0.85) {
      readiness = readiness === "critical" ? "critical" : "compromised";
      commissionBias = "recovery";
      reasoning.push("HRV is materially below the recent personal average, so intensity should be moderated.");
      recommendation = "Favor lower-intensity work until recovery data returns toward baseline.";
      activeRecommendation = "Delay aggressive progressive overload today. Lower-intensity training remains available.";
    }
  }

  if (restingHrToday != null && avgRestingHr7d != null) {
    playerDataUsed.push(`Resting HR today: ${restingHrToday}`, `7-day average resting HR: ${avgRestingHr7d}`);
    if (restingHrToday >= avgRestingHr7d + 8) {
      readiness = readiness === "critical" ? "critical" : "compromised";
      commissionBias = "recovery";
      reasoning.push("Resting heart rate is elevated above the recent personal average, which lowers confidence in harder work.");
      recommendation = "Use a recovery-first recommendation unless other context clearly supports training.";
      activeRecommendation = "Choose recovery, mobility, hydration, or a reduced training dose.";
    }
  }

  if (activeMinutesToday != null) {
    playerDataUsed.push(`Active minutes today: ${activeMinutesToday}`);
    if (activeMinutesToday >= 60 && commissionBias !== "recovery") {
      reasoning.push("Active minutes already represent meaningful daily work.");
    }
  }

  if (!reasoning.length) {
    reasoning.push("No strong wearable signal was available, so the recommendation stays conservative.");
  }

  const aldricLine = readiness === "critical"
    ? "The Hall's records show a body running on scraps. I would choose restoration, and if you insist on training, I would strip the work down to the bone."
    : readiness === "compromised"
      ? "Your reserves are not empty, but they are not to be squandered. I would take the measured road today."
      : readiness === "moderate"
        ? "You can work, but not every road should become a proving ground. Keep the dose honest."
      : commissionBias === "avoid_extra_conditioning"
        ? "You have already traveled far. I will not mistake more marching for better training."
        : commissionBias === "conditioning"
          ? "The road has been too quiet under your boots. A measured scouting route would serve you."
          : "The ledger shows no reason to hold you back, provided the work stays honest and recorded.";

  return {
    source,
    lastSyncedAt: latestSync(ordered),
    readiness,
    recommendation,
    activeRecommendation,
    commissionBias,
    aldricLine,
    metrics: {
      stepsToday,
      sleepLastNight,
      hrvToday,
      restingHrToday,
      activeMinutesToday,
      avgSteps7d,
      avgSleep7d,
      avgHrv7d,
      avgRestingHr7d,
    },
    systemRecommendation: createSystemRecommendation({
      id: "wearable:daily-readiness",
      domain: "wearable_readiness",
      recommendation,
      action: activeRecommendation,
      confidenceLevel,
      confidencePercent: confidencePercent(confidenceLevel, metricCount),
      reasoning,
      playerDataUsed,
      evidence: [
        "Wearable values are treated as context signals, not diagnosis.",
        "Recovery concerns suppress aggressive training progression and favor lower-intensity duties without removing player agency.",
        "High step volume can satisfy travel/exploration progress without implying continent-scale movement.",
        readinessAgencyNote(readiness),
      ],
      sourceDocuments: wearableSourceDocuments(source),
      safetyNote: readiness === "moderate" || readiness === "compromised" || readiness === "critical"
        ? "If symptoms are severe, unusual, or persistent, consult a qualified healthcare professional."
        : null,
      insufficientData: confidenceLevel === "insufficient_data",
    }),
  };
}
