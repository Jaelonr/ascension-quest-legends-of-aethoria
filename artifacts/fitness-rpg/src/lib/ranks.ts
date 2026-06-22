export const GRADE_LABELS: Record<string, string> = {
  E: "Wood",
  D: "Copper",
  C: "Iron",
  B: "Steel",
  A: "Silver",
  S: "Mythril",
  "National-Level": "Diamond",
};

export function formatGuildGrade(rank?: string | null) {
  return `${GRADE_LABELS[rank ?? "E"] ?? rank ?? "Wood"} Grade`;
}
