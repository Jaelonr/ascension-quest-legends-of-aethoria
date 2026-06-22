import { Redirect, useLocalSearchParams } from "expo-router";

export default function ChronicleAlias() {
  const { tab } = useLocalSearchParams<{ tab?: string | string[] }>();
  const value = Array.isArray(tab) ? tab[0] : tab;
  const href = value ? `/(tabs)/battle-log?tab=${encodeURIComponent(value)}` : "/(tabs)/battle-log";
  return <Redirect href={href as any} />;
}
