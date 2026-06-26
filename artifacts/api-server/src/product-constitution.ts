export const READINESS_LEVELS = ["optimal", "good", "moderate", "compromised", "critical"] as const;

export type ReadinessLevel = typeof READINESS_LEVELS[number] | "insufficient_data";

export const PRODUCT_CONSTITUTION = {
  appRole: "fitness_companion_wrapped_in_fantasy_rpg",
  version: "1.0.0",
  ultimateRule: "The story may create pressure. The System provides evidence. Aldric provides wisdom. The player makes the final decision.",
  authorities: {
    system: {
      role: "canonical_truth_layer",
      personality: false,
      responsibilities: [
        "workout recommendations",
        "progressive overload",
        "nutrition guidance",
        "readiness",
        "recovery",
        "wearable interpretation",
        "confidence",
        "reasoning",
        "evidence versioning",
      ],
    },
    aldric: {
      role: "aethorian_interpretation_layer",
      knowsSystemExists: false,
      mustAgreeWithSystem: true,
      forbiddenTerms: ["System", "confidence scores", "citations", "hidden mechanics", "internal calculations"],
    },
    player: {
      role: "final_decision_maker",
      trainingNeverLockedByReadiness: true,
      fitnessProgressNeverErasedByNarrativeFailure: true,
    },
  },
  readiness: {
    levels: READINESS_LEVELS,
    agencyRule: "Readiness changes recommendations and intensity guidance; it does not remove player agency or disable training.",
  },
  guildDirectives: {
    rare: true,
    narrativePriority: true,
    healthRecommendationStillIndependent: true,
    playerOptions: ["accept", "delay", "choose_lower_intensity", "choose_recovery"],
  },
} as const;

export function isReducedReadiness(readiness: string | null | undefined) {
  return readiness === "moderate" || readiness === "compromised" || readiness === "critical";
}

export function readinessAgencyNote(readiness: string | null | undefined) {
  if (readiness === "critical") {
    return "Critical readiness strongly favors recovery or a reduced-intensity path. Training remains available, but progression should wait.";
  }
  if (readiness === "compromised") {
    return "Compromised readiness favors recovery, mobility, nutrition, or reduced training volume. The player still chooses the route.";
  }
  if (readiness === "moderate") {
    return "Moderate readiness supports useful work with restraint. Hold progression unless the session begins unusually well.";
  }
  if (readiness === "optimal" || readiness === "good") {
    return "Readiness supports normal training if workout history, pain status, and goals agree.";
  }
  return "More data is needed. Recommendations should stay conservative without blocking training.";
}
