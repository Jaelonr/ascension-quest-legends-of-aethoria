export const GRADE_LABELS: Record<string, string> = {
  E: "Wood",
  D: "Copper",
  C: "Iron",
  B: "Steel",
  A: "Silver",
  S: "Mythril",
  "National-Level": "Diamond",
};

export const GRADE_COLORS: Record<string, string> = {
  E: "#9b7b52",
  D: "#b87333",
  C: "#9ca3af",
  B: "#6b7280",
  A: "#c0c0c0",
  S: "#7dd3fc",
  "National-Level": "#a78bfa",
};

export function formatGuildGrade(rank?: string | null) {
  return `${GRADE_LABELS[rank ?? "E"] ?? rank ?? "Wood"} Grade`;
}

export function gradeColor(rank?: string | null) {
  return GRADE_COLORS[rank ?? "E"] ?? "#9b7b52";
}

export function requirementLabel(condition?: string | null) {
  if (condition === "rank_D") return "Requires Copper Grade+";
  if (condition === "rank_C") return "Requires Iron Grade+";
  if (condition === "rank_B") return "Requires Steel Grade+";
  if (condition === "rank_S") return "Requires Mythril Grade+";
  return "Requires Copper Grade+";
}
