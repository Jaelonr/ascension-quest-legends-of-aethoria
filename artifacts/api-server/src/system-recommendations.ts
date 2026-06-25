export const SKB_VERSION = "1.0.0";

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

export interface SkbSourceDocument {
  key: string;
  title: string;
  organization: string;
  publicationYear: number | null;
  url: string;
  priority: 1 | 2;
  domains: SystemRecommendationDomain[];
}

export type SystemCitation = SkbSourceDocument & {
  label: string;
};

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
  sourceDocuments: SystemCitation[];
  citations: SystemCitation[];
  safetyNote: string | null;
  insufficientData: boolean;
  evidenceVersion: string;
  recommendationTimestamp: string;
  createdAt: string;
}

export const SKB_SOURCE_DOCUMENTS: Record<string, SkbSourceDocument> = {
  usdaFoodDataCentral: {
    key: "usda_fooddata_central",
    title: "FoodData Central API Guide",
    organization: "USDA Agricultural Research Service",
    publicationYear: null,
    url: "https://fdc.nal.usda.gov/api-guide",
    priority: 1,
    domains: ["nutrition"],
  },
  dietaryGuidelines2020_2025: {
    key: "dietary_guidelines_2020_2025",
    title: "Dietary Guidelines for Americans, 2020-2025",
    organization: "USDA and HHS",
    publicationYear: 2020,
    url: "https://www.dietaryguidelines.gov/sites/default/files/2020-12/Dietary_Guidelines_for_Americans_2020-2025.pdf",
    priority: 1,
    domains: ["nutrition", "health_guidance"],
  },
  nihOdsFactSheets: {
    key: "nih_ods_fact_sheets",
    title: "Dietary Supplement Fact Sheets",
    organization: "NIH Office of Dietary Supplements",
    publicationYear: null,
    url: "https://ods.od.nih.gov/factsheets/list-all/",
    priority: 1,
    domains: ["nutrition", "health_guidance"],
  },
  fdaNutritionFactsLabel: {
    key: "fda_nutrition_facts_label",
    title: "The Nutrition Facts Label",
    organization: "U.S. Food and Drug Administration",
    publicationYear: null,
    url: "https://www.fda.gov/food/nutrition-education-resources-materials/nutrition-facts-label",
    priority: 1,
    domains: ["nutrition"],
  },
  hhsPhysicalActivityGuidelines: {
    key: "hhs_physical_activity_guidelines",
    title: "Physical Activity Guidelines for Americans",
    organization: "HHS Office of Disease Prevention and Health Promotion",
    publicationYear: 2018,
    url: "https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines",
    priority: 1,
    domains: ["training", "recovery", "health_guidance", "commission"],
  },
  acsmResistanceTraining2025: {
    key: "acsm_resistance_training_2025",
    title: "ACSM Resistance Training Position Stand Update",
    organization: "American College of Sports Medicine",
    publicationYear: 2025,
    url: "https://pubmed.ncbi.nlm.nih.gov/41843416/",
    priority: 1,
    domains: ["training", "progressive_overload", "recovery"],
  },
  acsmProgressionModels2009: {
    key: "acsm_progression_models_2009",
    title: "ACSM Progression Models in Resistance Training",
    organization: "American College of Sports Medicine",
    publicationYear: 2009,
    url: "https://pubmed.ncbi.nlm.nih.gov/19204579/",
    priority: 1,
    domains: ["training", "progressive_overload"],
  },
  acsmWeightManagement2009: {
    key: "acsm_weight_management_2009",
    title: "ACSM Physical Activity and Weight Management Position Stand",
    organization: "American College of Sports Medicine",
    publicationYear: 2009,
    url: "https://pubmed.ncbi.nlm.nih.gov/19127177/",
    priority: 1,
    domains: ["nutrition", "training", "health_guidance"],
  },
  nscaPositionStatements: {
    key: "nsca_position_statements",
    title: "NSCA Position Statements",
    organization: "National Strength and Conditioning Association",
    publicationYear: null,
    url: "https://www.nsca.com/about-us/position-statements/",
    priority: 1,
    domains: ["training", "progressive_overload", "recovery"],
  },
  mifflinStJeor1990: {
    key: "mifflin_st_jeor_1990",
    title: "Mifflin-St Jeor Resting Energy Equation",
    organization: "American Journal of Clinical Nutrition",
    publicationYear: 1990,
    url: "https://pubmed.ncbi.nlm.nih.gov/2305711/",
    priority: 2,
    domains: ["nutrition"],
  },
  mifflinValidation2005: {
    key: "mifflin_validation_2005",
    title: "Predictive Equation Comparison for Resting Metabolic Rate",
    organization: "Journal of the American Dietetic Association",
    publicationYear: 2005,
    url: "https://pubmed.ncbi.nlm.nih.gov/15883556/",
    priority: 2,
    domains: ["nutrition"],
  },
  issnProtein2017: {
    key: "issn_protein_2017",
    title: "ISSN Position Stand: Protein and Exercise",
    organization: "International Society of Sports Nutrition",
    publicationYear: 2017,
    url: "https://pubmed.ncbi.nlm.nih.gov/28642676/",
    priority: 2,
    domains: ["nutrition", "training", "recovery"],
  },
  healthConnectDocs: {
    key: "health_connect_docs",
    title: "Health Connect Documentation",
    organization: "Android Developers",
    publicationYear: null,
    url: "https://developer.android.com/health-and-fitness/health-connect",
    priority: 1,
    domains: ["wearable_readiness", "sleep", "recovery"],
  },
  samsungHealthSdk: {
    key: "samsung_health_sdk",
    title: "Samsung Health SDK for Android API Reference",
    organization: "Samsung Developers",
    publicationYear: null,
    url: "https://developer.samsung.com/health/android/data/api-reference/overview-summary.html",
    priority: 1,
    domains: ["wearable_readiness", "sleep", "recovery"],
  },
  appleHealthKitDataTypes: {
    key: "apple_healthkit_data_types",
    title: "HealthKit Data Types",
    organization: "Apple Developer Documentation",
    publicationYear: null,
    url: "https://developer.apple.com/documentation/healthkit/data-types",
    priority: 1,
    domains: ["wearable_readiness", "sleep", "recovery"],
  },
  fitbitWebApi: {
    key: "fitbit_web_api",
    title: "Fitbit Web API Reference",
    organization: "Fitbit Developers",
    publicationYear: null,
    url: "https://dev.fitbit.com/build/reference/web-api/explore/",
    priority: 1,
    domains: ["wearable_readiness", "sleep", "recovery"],
  },
  garminHealthApi: {
    key: "garmin_health_api",
    title: "Garmin Health API",
    organization: "Garmin Developers",
    publicationYear: null,
    url: "https://developer.garmin.com/gc-developer-program/health-api/",
    priority: 1,
    domains: ["wearable_readiness", "sleep", "recovery"],
  },
};

function asCitation(source: SkbSourceDocument): SystemCitation {
  return {
    ...source,
    label: source.title,
  };
}

export const SYSTEM_CITATIONS = Object.fromEntries(
  Object.entries(SKB_SOURCE_DOCUMENTS).map(([key, source]) => [key, asCitation(source)])
) as Record<keyof typeof SKB_SOURCE_DOCUMENTS, SystemCitation>;

type SourceInput = keyof typeof SKB_SOURCE_DOCUMENTS | SystemCitation | SkbSourceDocument;

function resolveSourceDocument(source: SourceInput): SystemCitation {
  if (typeof source === "string") {
    const resolved = SKB_SOURCE_DOCUMENTS[source];
    if (!resolved) throw new Error(`Unknown SKB source document: ${source}`);
    return asCitation(resolved);
  }
  if (!SKB_SOURCE_DOCUMENTS[source.key] && !Object.values(SKB_SOURCE_DOCUMENTS).some((doc) => doc.key === source.key)) {
    throw new Error(`Unapproved SKB source document: ${source.key}`);
  }
  return asCitation(source);
}

export function resolveSkbSources(sources: SourceInput[]) {
  const seen = new Set<string>();
  return sources.map(resolveSourceDocument).filter((source) => {
    if (seen.has(source.key)) return false;
    seen.add(source.key);
    return true;
  });
}

export function getSystemKnowledgeBase() {
  return {
    version: SKB_VERSION,
    deterministic: true,
    openInternetSearchAllowed: false,
    sourceDocuments: Object.values(SKB_SOURCE_DOCUMENTS).map(asCitation),
  };
}

export function createSystemRecommendation(input: Omit<
  SystemRecommendation,
  "createdAt" | "evidenceVersion" | "recommendationTimestamp" | "sourceDocuments" | "citations"
> & {
  sourceDocuments?: SourceInput[];
  citations?: SourceInput[];
}): SystemRecommendation {
  const timestamp = new Date().toISOString();
  const sourceDocuments = resolveSkbSources(input.sourceDocuments ?? input.citations ?? []);
  return {
    ...input,
    sourceDocuments,
    citations: sourceDocuments,
    evidenceVersion: SKB_VERSION,
    recommendationTimestamp: timestamp,
    createdAt: timestamp,
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
