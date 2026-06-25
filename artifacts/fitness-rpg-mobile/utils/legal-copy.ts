export const LEGAL_COPY = {
  privacy: {
    title: "Privacy Policy",
    body:
      "Ascension Quest may store account details, training logs, nutrition entries, biometrics you enter, equipment access, imported health records, Guildmaster memories, and gameplay progression. Android preview builds can import Samsung Health / Galaxy Watch records through Health Connect only after permission is granted. This data powers commissions, rewards, Chronicle records, and practical guidance.",
  },
  terms: {
    title: "Terms And Health Disclaimer",
    body:
      "Ascension Quest provides general training and nutrition guidance for motivation and planning. It is not medical advice. Do not train through sharp, worsening, or concerning pain; medical concerns belong with qualified professionals.",
  },
  data: {
    title: "Data Export And Deletion",
    body:
      "Production export and deletion workflows should include workouts, nutrition, biometrics, wearable imports, character progression, Chronicle records, and Guildmaster memories. This mobile build exposes the user-facing surface while the backend workflow is finalized.",
  },
  checklist: {
    title: "Configuration Checklist",
    body:
      "Before launch: verify Clerk authentication, Google sign-in redirects, PostgreSQL migrations, OpenAI fallback behavior, mock-mode isolation, Android Health Connect permissions, legal copy review, app versioning, and export/delete workflows.",
  },
} as const;

export type LegalCopyKey = keyof typeof LEGAL_COPY;
