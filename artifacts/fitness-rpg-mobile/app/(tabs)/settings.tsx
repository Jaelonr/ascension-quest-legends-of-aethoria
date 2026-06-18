import AsyncStorage from "@react-native-async-storage/async-storage";
import { useClerk } from "@clerk/expo";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const INTENSITY_OPTIONS = [
  {
    id: "technical",
    label: "Technical",
    desc: "Real fitness data. Sets, reps, numbers — no story text.",
  },
  {
    id: "balanced",
    label: "Balanced",
    desc: "Mix of narrative and actual training metrics.",
  },
  {
    id: "immersive",
    label: "Immersive",
    desc: "Full fantasy language. Your workout becomes an epic.",
  },
] as const;

type IntensityId = typeof INTENSITY_OPTIONS[number]["id"];
const STORAGE_KEY = "narrative_intensity";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();

  const { data: summary, isLoading } = useGetDashboardSummary();
  const [intensity, setIntensity] = useState<IntensityId>("balanced");
  const [saving, setSaving] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => signOut(),
        },
      ],
    );
  };

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "technical" || val === "balanced" || val === "immersive") {
        setIntensity(val);
      }
    });
  }, []);

  const handleIntensityChange = async (id: IntensityId) => {
    setSaving(true);
    setIntensity(id);
    await AsyncStorage.setItem(STORAGE_KEY, id);
    setSaving(false);
  };

  const player = summary?.player;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenLabel, { color: colors.mutedForeground }]}>
        SETTINGS
      </Text>

      {/* Player Info */}
      {player && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            HUNTER PROFILE
          </Text>
          <View style={styles.profileRow}>
            <View
              style={[
                styles.rankCircle,
                { borderColor: colors.primary, backgroundColor: colors.primary + "22" },
              ]}
            >
              <Text style={[styles.rankLetter, { color: colors.primary }]}>
                {player.rank}
              </Text>
            </View>
            <View>
              <Text style={[styles.profileName, { color: colors.foreground }]}>
                {player.name}
              </Text>
              <Text style={[styles.profileLevel, { color: colors.primary }]}>
                Level {player.level}
              </Text>
              {player.activeTitle ? (
                <Text style={[styles.profileTitle, { color: colors.accent }]}>
                  {player.activeTitle}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.statRow, { borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statItemVal, { color: colors.primary }]}>
                {(player.xp ?? 0).toLocaleString()}
              </Text>
              <Text style={[styles.statItemKey, { color: colors.mutedForeground }]}>
                XP
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statItemVal, { color: colors.accent }]}>
                {(player.gold ?? 0).toLocaleString()}
              </Text>
              <Text style={[styles.statItemKey, { color: colors.mutedForeground }]}>
                Gold
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statItemVal, { color: colors.success }]}>
                {player.level}
              </Text>
              <Text style={[styles.statItemKey, { color: colors.mutedForeground }]}>
                Level
              </Text>
            </View>
          </View>
        </View>
      )}

      {isLoading && !player && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {/* Narrative Intensity */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.settingHeader}>
          <View>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>
              Narrative Intensity
            </Text>
            <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>
              How your workouts are told as battle stories
            </Text>
          </View>
          {saving && <ActivityIndicator color={colors.primary} size="small" />}
        </View>

        <View style={styles.intensityOptions}>
          {INTENSITY_OPTIONS.map((opt) => {
            const active = intensity === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.intensityOption,
                  {
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? colors.accent + "15" : colors.secondary,
                  },
                ]}
                onPress={() => handleIntensityChange(opt.id)}
                activeOpacity={0.7}
              >
                <View style={styles.intensityRow}>
                  <Text
                    style={[
                      styles.intensityLabel,
                      { color: active ? colors.accent : colors.foreground },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {active && (
                    <View
                      style={[
                        styles.checkDot,
                        { backgroundColor: colors.accent },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[styles.intensityDesc, { color: colors.mutedForeground }]}
                >
                  {opt.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* App Info */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          ABOUT
        </Text>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>
            Personal Fitness RPG
          </Text>
          <Text style={[styles.aboutValue, { color: colors.foreground }]}>
            Isekai Edition
          </Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>
            Version
          </Text>
          <Text style={[styles.aboutValue, { color: colors.foreground }]}>
            1.0.0
          </Text>
        </View>
        <Text style={[styles.tagline, { color: colors.primary }]}>
          "Your real-world training determines your power."
        </Text>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={[
          styles.signOutBtn,
          { borderColor: "#ef4444" + "44", backgroundColor: "#ef4444" + "10" },
        ]}
        onPress={handleSignOut}
        activeOpacity={0.7}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 12 },
  screenLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  rankCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rankLetter: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 2 },
  profileLevel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  profileTitle: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  statRow: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 2 },
  statDivider: { width: 1 },
  statItemVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statItemKey: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  loadingRow: { alignItems: "center", paddingVertical: 20 },
  settingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  settingTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  settingSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  intensityOptions: { gap: 8 },
  intensityOption: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  intensityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  intensityLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  checkDot: { width: 8, height: 8, borderRadius: 4 },
  intensityDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  aboutLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aboutValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
    textAlign: "center",
    paddingTop: 4,
  },
  signOutBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  signOutText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#ef4444",
  },
});
