import { Redirect, useLocalSearchParams } from "expo-router";

export default function InventoryAlias() {
  const { tab } = useLocalSearchParams<{ tab?: string | string[] }>();
  const value = Array.isArray(tab) ? tab[0] : tab;
  const href = value ? `/(tabs)/inventory?tab=${encodeURIComponent(value)}` : "/(tabs)/inventory";
  return <Redirect href={href as any} />;
}
