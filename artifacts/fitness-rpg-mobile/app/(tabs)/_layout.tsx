import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index"><Icon sf={{ default: "building.columns", selected: "building.columns.fill" }} /><Label>Hall</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="training"><Icon sf={{ default: "figure.run", selected: "figure.run.circle.fill" }} /><Label>Training</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="nutrition"><Icon sf={{ default: "fork.knife", selected: "fork.knife" }} /><Label>Nutrition</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="battle-log"><Icon sf={{ default: "book.closed", selected: "book.closed.fill" }} /><Label>Chronicle</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="inventory"><Icon sf={{ default: "shield", selected: "shield.fill" }} /><Label>Character</Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}

const tabs = [
  { name: "index", title: "Hall", sf: "building.columns.fill", feather: "flag" },
  { name: "training", title: "Training", sf: "figure.run", feather: "activity" },
  { name: "nutrition", title: "Nutrition", sf: "fork.knife", feather: "pie-chart" },
  { name: "battle-log", title: "Chronicle", sf: "book.closed.fill", feather: "book-open" },
  { name: "inventory", title: "Character", sf: "shield.fill", feather: "shield" },
] as const;

function ClassicTabLayout() {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: "#d7a54d",
      tabBarInactiveTintColor: colors.mutedForeground,
      headerShown: false,
      tabBarLabelStyle: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
      tabBarStyle: {
        position: "absolute",
        backgroundColor: isIOS ? "transparent" : "#11100e",
        borderTopWidth: 1,
        borderTopColor: "#3b3328",
        elevation: 0,
        ...(isWeb ? { height: 76 } : {}),
      },
      tabBarBackground: () => isIOS
        ? <BlurView intensity={85} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        : isWeb ? <View style={[StyleSheet.absoluteFill, { backgroundColor: "#11100e" }]} /> : null,
    }}>
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{
          title: tab.title,
          tabBarIcon: ({ color }) => isIOS
            ? <SymbolView name={tab.sf} tintColor={color} size={22} />
            : <Feather name={tab.feather} size={21} color={color} />,
        }} />
      ))}
      <Tabs.Screen name="skills" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="quests" options={{ href: null }} />
      <Tabs.Screen name="raids" options={{ href: null }} />
    </Tabs>
  );
}

function SettingsGear() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  if (pathname?.includes("/settings")) return null;
  return (
    <TouchableOpacity
      accessibilityLabel="Open Guild Settings"
      style={[styles.settingsGear, { top: insets.top + 8 }]}
      onPress={() => router.push("/(tabs)/settings" as any)}
      activeOpacity={0.82}
    >
      <Feather name="settings" size={19} color="#d9ad63" />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />}
      <SettingsGear />
    </View>
  );
}

const styles = StyleSheet.create({
  settingsGear: {
    position: "absolute",
    right: 14,
    zIndex: 40,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#6b4d2f",
    backgroundColor: "#11100ef2",
    shadowColor: "#d9ad63",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
});
