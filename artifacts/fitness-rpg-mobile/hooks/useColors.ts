const DARK_COLORS = {
  background: "#0c0b09",
  card: "#11100e",
  secondary: "#1a1815",
  foreground: "#eee5d7",
  mutedForeground: "#8f887d",
  primary: "#49a3a0",
  primaryForeground: "#ffffff",
  border: "#3b3328",
  accent: "#d7a54d",
  tabBar: "#0f0e0c",
  tabBarInactive: "#6b6460",
  tabBarBorder: "#2a2520",
  danger: "#e05252",
  success: "#22c55e",
  warning: "#f97316",
  info: "#0dcef5",
};

export type AppColors = typeof DARK_COLORS;

export function useColors(): AppColors {
  return DARK_COLORS;
}
