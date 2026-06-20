import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
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
      <Tabs.Screen name="guild-hall" options={{ href: null }} />
      <Tabs.Screen name="skills" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="quests" options={{ href: null }} />
      <Tabs.Screen name="raids" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />;
}
