export type SystemRecommendationDomain =
  | "training"
  | "progressive_overload"
  | "nutrition"
  | "recovery"
  | "sleep"
  | "wearable_readiness"
  | "commission"
  | "health_guidance";

export type SystemConfidenceLevel =
  | "high"
  | "moderate"
  | "low"
  | "insufficient_data"
  | "unable_to_recommend";

export interface SystemCitation {
  key: string;
  label: string;
  url: string;
}

export interface SystemRecommendation {
  id: string;
  domain: SystemRecommendationDomain;
  recommendation: string;
  action: string;
  confidenceLevel: SystemConfidenceLevel;
  confidencePercent: number | null;
  reasoning: string[];
  playerDataUsed: string[];
  evidence: string[];
  citations: SystemCitation[];
  safetyNote: string | null;
  insufficientData: boolean;
  createdAt: string;
}

export const SYSTEM_CITATIONS = {
  acsmResistanceTraining2025: {
    key: "acsm_resistance_training_2025",
    label: "ACSM resistance training position stand update",
    url: "https://pubmed.ncbi.nlm.nih.gov/41843416/",
  },
  acsmProgressionModels2009: {
    key: "acsm_progression_models_2009",
    label: "ACSM progression models in resistance training",
    url: "https://pubmed.ncbi.nlm.nih.gov/19204579/",
  },
  issnProtein2017: {
    key: "issn_protein_2017",
    label: "ISSN position stand: protein and exercise",
    url: "https://pubmed.ncbi.nlm.nih.gov/28642676/",
  },
  mifflinStJeor1990: {
    key: "mifflin_st_jeor_1990",
    label: "Mifflin-St Jeor resting energy equation",
    url: "https://pubmed.ncbi.nlm.nih.gov/2305711/",
  },
  mifflinValidation2005: {
    key: "mifflin_validation_2005",
    label: "Predictive equation comparison for resting metabolic rate",
    url: "https://pubmed.ncbi.nlm.nih.gov/15883556/",
  },
  acsmWeightManagement2009: {
    key: "acsm_weight_management_2009",
    label: "ACSM physical activity and weight management position stand",
    url: "https://pubmed.ncbi.nlm.nih.gov/19127177/",
  },
} satisfies Record<string, SystemCitation>;

export function createSystemRecommendation(input: Omit<SystemRecommendation, "createdAt">): SystemRecommendation {
  return {
    ...input,
    createdAt: new Date().toISOString(),
  };
}

export function confidencePercent(level: SystemConfidenceLevel, dataPoints: number) {
  if (level === "high") return Math.min(95, 85 + Math.min(dataPoints, 10));
  if (level === "moderate") return Math.min(84, 65 + Math.min(dataPoints, 10));
  if (level === "low") return Math.min(64, 35 + Math.min(dataPoints, 15));
  return null;
}

export function aldricInterpretation(rec: Pick<SystemRecommendation, "domain" | "recommendation" | "action" | "safetyNote" | "confidenceLevel">) {
  if (rec.safetyNote) {
    return "There are injuries no amount of courage can mend alone. Choose the safer road today, and let the body prove it is ready before you ask more of it.";
  }
  if (rec.confidenceLevel === "insufficient_data" || rec.confidenceLevel === "unable_to_recommend") {
    return "The ledger is not silent, but it is not complete. Give me a few more honest entries before we ask it for a harder truth.";
  }
  if (rec.domain === "nutrition") {
    return "The quartermasters have compared your provisions against the road you have been walking. Adjust the stores modestly, then watch what your body reports back.";
  }
  if (rec.domain === "progressive_overload" || rec.domain === "training") {
    return "Your recent work has begun to show a pattern. I would change only a little today: enough to keep the blade sharp, not enough to court foolishness.";
  }
  if (rec.domain === "recovery" || rec.domain === "sleep" || rec.domain === "wearable_readiness") {
    return "Recovery is not retreat. It is how an adventurer returns with enough left to survive the next gate.";
  }
  return "The Guild records point in one direction. Take the practical step, record it honestly, and let tomorrow judge the result.";
}
