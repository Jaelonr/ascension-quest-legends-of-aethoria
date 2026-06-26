import {
  customFetch,
  useGetBattleLog,
  useGetCampaignStory,
  useGetPlayerStyleIdentity,
} from "@workspace/api-client-react";
import type { CampaignStoryChapter, CampaignStoryQuest } from "@workspace/api-client-react";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { useLocalSearchParams } from "expo-router";

const AETHORIA_MAP = require("../../assets/images/aethoria-map.jpg");

const STYLE_META: Record<string, { label: string; color: string; bg: string }> = {
  strength:     { label: "Iron Vanguard",    color: "#ef4444", bg: "#ef444418" },
  striking:     { label: "Storm Duelist",    color: "#f97316", bg: "#f9731618" },
  conditioning: { label: "Wayfarer",         color: "#0dcef5", bg: "#0dcef518" },
  grappling:    { label: "Chainwarden",      color: "#a855f7", bg: "#a855f718" },
  recovery:     { label: "Verdant Guardian", color: "#22c55e", bg: "#22c55e18" },
  discipline:   { label: "Runesage",         color: "#eab308", bg: "#eab30818" },
};
const STYLE_ORDER = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;
const MAP_FEATURES = [
  "Regions Discovered",
  "Roads Traveled",
  "Gates Cleared",
  "Boss Sites",
  "Campaign Routes",
  "Return Stone Journeys",
];
const MAP_PATH_POINTS = [
  [42, 45],
  [40, 48],
  [38, 51],
  [36, 54],
  [34, 56],
  [32, 58],
  [30, 60],
] as const;
const RETURN_STONE_PATH = "M 30 60 C 34 54 38 49 42 45";
const MAP_CLUES = [
  {
    source: "Hall Ledger",
    title: "Western commerce exists",
    status: "Known",
    text: "Aldric has mentioned that the western coast carries more coin than crowns. Details remain unconfirmed.",
  },
  {
    source: "Item Lore",
    title: "Tideglass Ring",
    status: "Undiscovered",
    text: "A future item description can reveal that merchants use these in N'Thaloris contracts.",
  },
  {
    source: "Quest Dialogue",
    title: "Crown of the Coast",
    status: "Locked",
    text: "A noble envoy or Guild embassy commission should reveal this name before it becomes common knowledge.",
  },
  {
    source: "Aldric",
    title: "The sea is different there",
    status: "Locked",
    text: "The people of N'Thaloris view the sea differently than surface folk. The Chronicle cannot explain more yet.",
  },
];

const VERDICT_COLORS: Record<string, string> = {
  "Crushing Victory": "#eab308",
  "Victory":          "#22c55e",
  "Close Victory":    "#0dcef5",
  "Strategic Retreat":"#f97316",
  "Training Complete":"#22c55e",
};

const STORY_STATUS: Record<string, { label: string; color: string }> = {
  claimed: { label: "Completed", color: "#22c55e" },
  completed: { label: "Reward Ready", color: "#d9ad63" },
  active: { label: "In Progress", color: "#49a3a0" },
  locked: { label: "???", color: "#6b5d4f" },
};

const DIFF_COLORS: Record<string, string> = {
  wood: "#8b6f47",
  bronze: "#b98047",
  iron: "#a3a3a3",
  steel: "#c7d2fe",
  silver: "#d8dee9",
  gold: "#d9ad63",
  mythril: "#49a3a0",
  ruby: "#d95f45",
  sapphire: "#3e7f9f",
  emerald: "#3e8f5c",
  diamond: "#c4b5fd",
};

type ChronicleSummary = {
  worldDanger?: any;
  battleReplays?: any[];
  guildReports?: any[];
  campaignProgress?: any[];
  discoveredItems?: any[];
  bossesDefeated?: any[];
  titlesEarned?: any[];
  personalRecords?: any[];
  map?: { title?: string; description?: string; status?: string };
  majorMilestones?: any[];
  worldEvents?: any[];
};

type ChronicleTab = "replays" | "reports" | "campaign" | "items" | "records" | "map";

function normalizeChronicleTab(tab: string | string[] | undefined): ChronicleTab {
  const value = Array.isArray(tab) ? tab[0] : tab;
  switch (value) {
    case "replay":
    case "replays":
      return "replays";
    case "report":
    case "reports":
      return "reports";
    case "campaign":
    case "campaigns":
    case "story":
      return "campaign";
    case "item":
    case "items":
    case "discoveries":
      return "items";
    case "record":
    case "records":
    case "prs":
      return "records";
    case "map":
    case "aethoria-map":
    case "journey-map":
      return "map";
    default:
      return "replays";
  }
}

function useChronicleSummary() {
  const [data, setData] = useState<ChronicleSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    customFetch<ChronicleSummary>("/api/chronicle/summary")
      .then((summary) => {
        if (!cancelled) setData(summary);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { data, loading };
}

function SystemDangerCard({ danger }: { danger: any }) {
  if (!danger) return null;
  const value = Math.max(0, Math.min(100, Number(danger.value ?? 77)));
  const critical = danger.state === "critical" || value >= 90;
  return (
    <View style={[ch.dangerCard, { borderColor: critical ? "#9d3e2a" : "#6b4d2f" }]}>
      <View style={ch.dangerHeader}>
        <View>
          <Text style={ch.sectionLabel}>SYSTEM READING</Text>
          <Text style={[ch.dangerTitle, { color: critical ? "#d95f45" : "#d9ad63" }]}>World Danger: {danger.label ?? "Severe"}</Text>
        </View>
        <View style={[ch.dangerValueBox, { borderColor: critical ? "#9d3e2a" : "#72552e" }]}>
          <Text style={[ch.dangerValue, { color: critical ? "#d95f45" : "#d5a557" }]}>{value}%</Text>
        </View>
      </View>
      <View style={ch.dangerTrack}>
        <View style={[ch.dangerFill, { width: `${value}%`, backgroundColor: critical ? "#9d3e2a" : "#b48432" }]} />
      </View>
      <Text style={ch.dangerNote}>{danger.systemNote ?? "Only the summoned adventurer can read this System-level danger index."}</Text>
    </View>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <View style={ch.statTile}>
      <Text style={[ch.statValue, { color: tone }]}>{value}</Text>
      <Text style={ch.statLabel}>{label}</Text>
    </View>
  );
}

function TabGrid({ active, onSelect }: { active: ChronicleTab; onSelect: (tab: ChronicleTab) => void }) {
  const tabs: Array<{ id: ChronicleTab; label: string }> = [
    { id: "replays", label: "Replays" },
    { id: "reports", label: "Reports" },
    { id: "campaign", label: "Campaign" },
    { id: "items", label: "Items" },
    { id: "records", label: "Records" },
    { id: "map", label: "Map" },
  ];
  return (
    <View style={ch.tabGrid}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[ch.tabBtn, active === tab.id && ch.tabBtnActive]}
          onPress={() => onSelect(tab.id)}
          activeOpacity={0.75}
        >
          <Text style={[ch.tabText, active === tab.id && ch.tabTextActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ReplayModal({ replay, onClose }: { replay: any; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [revealedCount, setRevealedCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const meta = STYLE_META[replay.dominantStyle] ?? STYLE_META.strength;
  const events: Array<{ text: string; type: string }> = replay.events ?? [];
  const allRevealed = revealedCount >= events.length;
  const styleScores = (replay.styleScores ?? {}) as Record<string, number>;
  const maxScore = Math.max(1, ...Object.values(styleScores).map(Number));
  const activeStyles = STYLE_ORDER.filter((s) => (styleScores[s] ?? 0) > 0)
    .sort((a, b) => (styleScores[b] ?? 0) - (styleScores[a] ?? 0));
  const verdictColor = VERDICT_COLORS[replay.verdict] ?? "#22c55e";
  const payoff = replay.payoff;

  useEffect(() => {
    setRevealedCount(0);
  }, [replay.id]);

  useEffect(() => {
    if (allRevealed) return;
    const t = setTimeout(() => setRevealedCount((c) => c + 1), 600);
    return () => clearTimeout(t);
  }, [revealedCount, allRevealed]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [revealedCount]);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onClose}>
      <View style={[rm.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={rm.header}>
          <Text style={[rm.styleLabel, { color: meta.color }]}>─── Battle Report ───</Text>
          <Text style={rm.title}>{replay.encounterName}</Text>
          <Text style={rm.enemy}>vs. {replay.enemyName}</Text>
          <View style={rm.headerMeta}>
            <View style={[rm.styleBadge, { borderColor: meta.color + "50", backgroundColor: meta.bg }]}>
              <Text style={[rm.styleBadgeText, { color: meta.color }]}>{meta.label} Style</Text>
            </View>
            {replay.hybridArchetype && (
              <Text style={rm.archetypeText}>{replay.hybridArchetype}</Text>
            )}
          </View>
          <TouchableOpacity style={rm.closeBtn} onPress={onClose} hitSlop={12}>
            <Text style={rm.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {payoff && (
            <View style={rm.payoffCard}>
              <Text style={rm.payoffLabel}>REAL SESSION TRANSLATED</Text>
              <Text style={rm.payoffTitle}>{payoff.headline}</Text>
              <Text style={rm.payoffText}>{payoff.fitnessTranslation}</Text>
              {payoff.pathEffect ? <Text style={rm.pathEffect}>{payoff.pathEffect}</Text> : null}
            </View>
          )}

          {/* Narrative events */}
          {events.length === 0 && (
            <Text style={rm.noEvents}>No battle record found for this session.</Text>
          )}
          {events.slice(0, revealedCount).map((ev, i) => (
            <View key={i} style={rm.eventCard}>
              <Text style={rm.eventText}>{ev.text}</Text>
            </View>
          ))}
          {!allRevealed && events.length > 0 && (
            <View style={rm.dotsRow}>
              <Text style={rm.dots}>• • •</Text>
            </View>
          )}

          {/* Stats after reveal */}
          {allRevealed && (
            <View style={{ gap: 10 }}>
              {/* XP / Gold */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={[rm.statCard, { borderColor: "#0dcef540", backgroundColor: "#0a1a1a" }]}>
                  <Text style={rm.statIcon}>⚡</Text>
                  <Text style={[rm.statValue, { color: "#0dcef5" }]}>+{replay.xpEarned}</Text>
                  <Text style={rm.statLabel}>XP Earned</Text>
                </View>
                <View style={[rm.statCard, { borderColor: "#d9ad6340", backgroundColor: "#1a1200" }]}>
                  <Text style={rm.statIcon}>🪙</Text>
                  <Text style={[rm.statValue, { color: "#d9ad63" }]}>+{replay.goldEarned}</Text>
                  <Text style={rm.statLabel}>Gold</Text>
                </View>
              </View>

              {/* PR */}
              {replay.prCount > 0 && (
                <View style={rm.prBanner}>
                  <Text style={rm.prText}>🏆 {replay.prCount} Personal Record{replay.prCount > 1 ? "s" : ""} set</Text>
                </View>
              )}

              {/* Style breakdown */}
              {activeStyles.length > 0 && (
                <View style={rm.breakdownCard}>
                  <Text style={rm.breakdownLabel}>COMBAT STYLE BREAKDOWN</Text>
                  {activeStyles.map((s) => {
                    const t = STYLE_META[s]!;
                    const pct = Math.round(((styleScores[s] ?? 0) / maxScore) * 100);
                    return (
                      <View key={s} style={rm.barRow}>
                        <Text style={[rm.barLabel, { color: t.color }]}>{t.label}</Text>
                        <View style={rm.barTrack}>
                          <View style={[rm.barFill, { width: `${pct}%`, backgroundColor: t.color }]} />
                        </View>
                        <Text style={rm.barPct}>{pct}%</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Narrative consequence */}
              {payoff && (
                <View style={rm.meaningCard}>
                  <Text style={rm.meaningLabel}>CHRONICLE MEANING</Text>
                  {payoff.pathEffect ? <Text style={rm.pathEffect}>{payoff.pathEffect}</Text> : null}
                  <Text style={rm.meaningText}>{payoff.worldEffect}</Text>
                  <Text style={rm.meaningNext}>{payoff.nextHook}</Text>
                </View>
              )}

              {replay.narrativeConsequence && (
                <View style={rm.consequenceCard}>
                  <Text style={rm.consequenceLabel}>↠ CONSEQUENCE</Text>
                  <Text style={rm.consequenceText}>{replay.narrativeConsequence}</Text>
                </View>
              )}

              {/* Verdict */}
              <View style={[rm.verdictBadge, { borderColor: verdictColor + "60" }]}>
                <Text style={[rm.verdictText, { color: verdictColor }]}>
                  {replay.verdict ?? "Training Complete"}
                </Text>
              </View>

              {/* Close */}
              <TouchableOpacity style={rm.returnBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={rm.returnBtnText}>RETURN TO CHRONICLE</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const rm = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050403" },
  header: { padding: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: "#2a2520" },
  styleLabel: { fontSize: 10, letterSpacing: 4, fontFamily: "Inter_400Regular", textTransform: "uppercase", marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "900", color: "#eee5d7", fontFamily: "PlayfairDisplay_700Bold", lineHeight: 28 },
  enemy: { fontSize: 13, color: "#9d8f80", marginTop: 2, fontFamily: "Inter_400Regular" },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  styleBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  styleBadgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  archetypeText: { fontSize: 10, color: "#9d8f80" },
  closeBtn: { position: "absolute", right: 20, top: 20 },
  closeBtnText: { fontSize: 20, color: "#6b5d4f" },
  payoffCard: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", borderRadius: 10, padding: 12 },
  payoffLabel: { color: "#9d8f80", fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 2 },
  payoffTitle: { color: "#e5c386", fontSize: 16, fontFamily: "PlayfairDisplay_700Bold", marginTop: 4 },
  payoffText: { color: "#d8c4a5", fontSize: 12, lineHeight: 18, marginTop: 6, fontFamily: "Inter_400Regular" },
  pathEffect: { color: "#9dbdb8", fontSize: 11, lineHeight: 16, marginTop: 8, borderLeftWidth: 1, borderLeftColor: "#6b4d2f", paddingLeft: 8, fontFamily: "Inter_400Regular" },
  noEvents: { textAlign: "center", color: "#6b5d4f", fontStyle: "italic", marginTop: 24, fontSize: 13 },
  eventCard: { backgroundColor: "#181612", borderWidth: 1, borderColor: "#2a2520", borderRadius: 8, padding: 14 },
  eventText: { color: "#d8c4a5", fontSize: 13, lineHeight: 20 },
  dotsRow: { alignItems: "center", paddingVertical: 8 },
  dots: { color: "#4a4035", fontSize: 18, letterSpacing: 4 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 14, alignItems: "center" },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  statLabel: { fontSize: 10, color: "#9d8f80", marginTop: 2 },
  prBanner: { borderWidth: 1, borderColor: "#eab30840", backgroundColor: "#eab30810", padding: 10, borderRadius: 6, alignItems: "center" },
  prText: { color: "#eab308", fontWeight: "700", fontSize: 13, fontFamily: "Inter_700Bold" },
  breakdownCard: { backgroundColor: "#0e0d0b", borderWidth: 1, borderColor: "#2a2520", borderRadius: 10, padding: 14, gap: 8 },
  breakdownLabel: { fontSize: 9, color: "#6b5d4f", textTransform: "uppercase", letterSpacing: 3, fontFamily: "Inter_400Regular", marginBottom: 2 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 80, fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  barTrack: { flex: 1, height: 4, backgroundColor: "#2a2520", borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  barPct: { width: 30, textAlign: "right", fontSize: 10, color: "#6b5d4f" },
  consequenceCard: { borderWidth: 1, borderColor: "#1a3535", backgroundColor: "#0a1a1a", borderRadius: 8, padding: 12 },
  consequenceLabel: { fontSize: 9, color: "#49a3a0", textTransform: "uppercase", letterSpacing: 3, marginBottom: 6, fontFamily: "Inter_400Regular" },
  consequenceText: { fontSize: 12, color: "#d8c4a5", lineHeight: 18, fontStyle: "italic" },
  meaningCard: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#15110d", borderRadius: 8, padding: 12 },
  meaningLabel: { fontSize: 9, color: "#9d8f80", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6, fontFamily: "Inter_700Bold" },
  meaningText: { fontSize: 12, color: "#d8c4a5", lineHeight: 18, fontFamily: "Inter_400Regular" },
  meaningNext: { fontSize: 11, color: "#9dbdb8", lineHeight: 16, marginTop: 8, fontFamily: "Inter_400Regular" },
  verdictBadge: { borderWidth: 1, borderRadius: 8, padding: 12, alignItems: "center" },
  verdictText: { fontWeight: "700", fontSize: 14, letterSpacing: 1, fontFamily: "Inter_700Bold" },
  returnBtn: { borderWidth: 1, borderColor: "#3b3328", padding: 14, alignItems: "center", borderRadius: 4 },
  returnBtnText: { color: "#9d8f80", fontSize: 11, fontWeight: "700", letterSpacing: 2, fontFamily: "Inter_700Bold" },
});

function ReplayCard({ replay, onPress }: { replay: any; onPress: () => void }) {
  const meta = STYLE_META[replay.dominantStyle] ?? STYLE_META.strength;
  const verdictColor = VERDICT_COLORS[replay.verdict] ?? "#22c55e";
  const payoff = replay.payoff;
  return (
    <TouchableOpacity
      style={[rc.card, { backgroundColor: "#11100e", borderColor: meta.color + "40" }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={rc.row}>
        <View style={{ flex: 1 }}>
          <View style={rc.tags}>
            <Text style={[rc.styleTag, { color: meta.color }]}>{meta.label}</Text>
            <Text style={[rc.verdictTag, { color: verdictColor }]}>{replay.verdict}</Text>
          </View>
          <Text style={rc.name} numberOfLines={1}>{replay.encounterName}</Text>
          <Text style={rc.enemy}>vs. {replay.enemyName}</Text>
          {payoff?.fitnessTranslation && (
            <Text style={rc.payoff} numberOfLines={2}>{payoff.fitnessTranslation}</Text>
          )}
          {payoff?.pathEffect && (
            <Text style={rc.pathEffect} numberOfLines={1}>{payoff.pathEffect}</Text>
          )}
        </View>
        <Text style={rc.date}>
          {new Date(replay.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </Text>
      </View>
      <View style={rc.footer}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Text style={rc.xp}>⚡ +{replay.xpEarned}</Text>
          <Text style={rc.gold}>🪙 +{replay.goldEarned}</Text>
          {replay.prCount > 0 && <Text style={rc.pr}>🏆 {replay.prCount} PR</Text>}
        </View>
        <Text style={rc.tapHint}>Tap to replay</Text>
      </View>
    </TouchableOpacity>
  );
}
const rc = StyleSheet.create({
  card: { borderWidth: 1, padding: 12, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  tags: { flexDirection: "row", gap: 8, marginBottom: 4 },
  styleTag: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  verdictTag: { fontSize: 10 },
  name: { fontSize: 14, fontWeight: "700", color: "#eee5d7", fontFamily: "PlayfairDisplay_700Bold" },
  enemy: { fontSize: 11, color: "#9d8f80", marginTop: 2 },
  payoff: { fontSize: 11, color: "#b7ab9c", lineHeight: 16, marginTop: 7, fontFamily: "Inter_400Regular" },
  pathEffect: { fontSize: 10, color: "#9dbdb8", lineHeight: 14, marginTop: 4, fontFamily: "Inter_400Regular" },
  date: { fontSize: 10, color: "#6b5d4f", flexShrink: 0 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  xp: { fontSize: 11, fontWeight: "700", color: "#0dcef5", fontFamily: "Inter_700Bold" },
  gold: { fontSize: 11, fontWeight: "700", color: "#d9ad63", fontFamily: "Inter_700Bold" },
  pr: { fontSize: 11, fontWeight: "700", color: "#eab308", fontFamily: "Inter_700Bold" },
  tapHint: { fontSize: 9, color: "#4a4035", textTransform: "uppercase", letterSpacing: 2 },
});

function CampaignQuestRow({ quest }: { quest: CampaignStoryQuest }) {
  const [open, setOpen] = useState(quest.status === "active" || quest.status === "completed");
  const status = STORY_STATUS[quest.status] ?? STORY_STATUS.locked;
  const isLocked = quest.status === "locked";
  const diffColor = quest.difficulty ? DIFF_COLORS[String(quest.difficulty).toLowerCase()] ?? "#8f887d" : "#8f887d";

  return (
    <View style={[ch.campaignQuest, isLocked && { opacity: 0.55 }]}>
      <TouchableOpacity style={ch.campaignQuestHeader} onPress={() => setOpen((value) => !value)} activeOpacity={0.75}>
        <View style={[ch.questStatusDot, { borderColor: status.color, backgroundColor: status.color + "22" }]}>
          <Text style={[ch.questStatusMark, { color: status.color }]}>{isLocked ? "?" : quest.status === "claimed" ? "✓" : "!"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ch.recordTitle, { color: isLocked ? "#6b5d4f" : "#d8c4a5" }]} numberOfLines={2}>{quest.title}</Text>
          <Text style={[ch.recordMeta, { color: status.color }]}>{status.label}</Text>
        </View>
        {quest.difficulty && (
          <View style={[ch.difficultyPill, { borderColor: diffColor + "70" }]}>
            <Text style={[ch.difficultyText, { color: diffColor }]}>{String(quest.difficulty).toUpperCase()}</Text>
          </View>
        )}
        <Text style={ch.expandMark}>{open ? "HIDE" : "OPEN"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={ch.campaignQuestBody}>
          <Text style={[ch.recordText, isLocked && { color: "#6b5d4f", fontStyle: "italic" }]}>
            {isLocked ? "The Chronicle has not revealed this commission yet." : quest.description}
          </Text>
          {!!quest.lore && !isLocked && (
            <View style={ch.loreBox}>
              <Text style={ch.loreLabel}>Guild Lore</Text>
              <Text style={ch.loreText}>{quest.lore}</Text>
            </View>
          )}
          {!!quest.fitnessMapping && !isLocked && (
            <Text style={ch.objectiveText}>
              <Text style={{ color: "#d8c4a5" }}>Objective: </Text>{quest.fitnessMapping}
            </Text>
          )}
          {!isLocked && (
            <View style={ch.rewardRow}>
              <Text style={ch.rewardXp}>+{quest.xpReward} XP</Text>
              <Text style={ch.rewardGold}>+{quest.goldReward} Gold</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function CampaignChapterBlock({ chapter }: { chapter: CampaignStoryChapter }) {
  const [open, setOpen] = useState(chapter.status === "active");
  const isLocked = chapter.status === "locked";
  const completedCount = chapter.quests.filter((quest) => quest.status === "claimed").length;
  const revealedCount = chapter.quests.filter((quest) => quest.status !== "locked").length;
  const statusColor = chapter.status === "completed" ? "#22c55e" : chapter.status === "active" ? "#d9ad63" : "#6b5d4f";

  return (
    <View style={[ch.campaignChapter, { borderColor: isLocked ? "#2a2520" : "#6b4d2f" }]}>
      <TouchableOpacity style={ch.campaignChapterHeader} onPress={() => setOpen((value) => !value)} activeOpacity={0.75}>
        <View style={[ch.chapterSigil, { borderColor: statusColor + "70" }]}>
          <Text style={[ch.chapterSigilText, { color: statusColor }]}>{chapter.status === "completed" ? "✓" : isLocked ? "?" : chapter.chapter}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ch.recordTitle, { color: isLocked ? "#6b5d4f" : "#d9ad63" }]} numberOfLines={2}>
            {isLocked ? `Chapter ${chapter.chapter} - ???` : `Ch. ${chapter.chapter}: ${chapter.chapterName}`}
          </Text>
          {!isLocked && <Text style={ch.recordMeta}>{completedCount}/{revealedCount} complete</Text>}
        </View>
        <Text style={ch.expandMark}>{open ? "HIDE" : "OPEN"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={ch.campaignChapterBody}>
          {chapter.quests.map((quest) => (
            <CampaignQuestRow key={quest.campaignId} quest={quest} />
          ))}
        </View>
      )}
    </View>
  );
}

function CampaignChronicleView() {
  const { data: story, isLoading } = useGetCampaignStory({ query: { queryKey: ["/api/campaign/story"] } });

  if (isLoading) {
    return (
      <View style={ch.loadingPanel}>
        <ActivityIndicator color="#d9ad63" />
        <Text style={ch.loadingText}>Opening the campaign ledger...</Text>
      </View>
    );
  }

  if (!story) {
    return <EmptyRecord title="No campaign entries yet" text="Aethoria's larger movements will be recorded here as threats are revealed." />;
  }

  return (
    <View style={ch.panelStack}>
      <View style={ch.campaignPosition}>
        <Text style={ch.recordMeta}>Current Position</Text>
        <Text style={ch.recordTitle}>
          Chapter {story.currentChapter}
          {story.currentQuestTitle ? ` - ${story.currentQuestTitle}` : ""}
        </Text>
        {story.activeMission && (
          <View style={ch.activeMissionBox}>
            <Text style={ch.loreLabel}>Active Mission</Text>
            <Text style={ch.recordText}>{story.activeMission.title}</Text>
          </View>
        )}
      </View>
      {story.chapters.map((chapter) => (
        <CampaignChapterBlock key={chapter.chapter} chapter={chapter} />
      ))}
    </View>
  );
}

function EmptyRecord({ title, text }: { title: string; text: string }) {
  return (
    <View style={ch.emptyRecord}>
      <Text style={ch.emptyTitle}>{title}</Text>
      <Text style={ch.emptyDesc}>{text}</Text>
    </View>
  );
}

function formatChronicleDate(value?: string | null) {
  if (!value) return "Date unrecorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unrecorded";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getWorldEventTone(event: any) {
  const title = String(event?.title ?? "").toLowerCase();
  const severity = String(event?.severity ?? "").toLowerCase();
  const status = String(event?.status ?? "").toLowerCase();
  const isRaidPressure = title.includes("raid pressure") || event?.metadata?.raidId;
  const isResolved = status === "resolved" || status === "completed";
  const isSevere = severity === "major" || severity === "critical" || title.includes("retreat") || title.includes("loss");

  if (isResolved) return { label: "Resolved", border: "#4f8f67", text: "#61c29b", bg: "#0e1713" };
  if (isRaidPressure) return { label: "Raid Pressure", border: "#9d3e2a", text: "#d95f45", bg: "#1a100e" };
  if (isSevere) return { label: "Severe", border: "#b45f2d", text: "#f0a15e", bg: "#1a130d" };
  return { label: status ? status.replace(/_/g, " ") : "Recorded", border: "#6b4d2f", text: "#d9ad63", bg: "#11100e" };
}

function isIdentityMilestoneEvent(event: any) {
  const key = String(event?.worldKey ?? "").toLowerCase();
  const title = String(event?.title ?? "").toLowerCase();
  return key.includes("style-identity")
    || key.includes("style-archetype")
    || title.includes("combat identity")
    || title.includes("archetype formed");
}

export default function ChronicleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tab: requestedTab } = useLocalSearchParams<{ tab?: string | string[] }>();
  const { data: replays, isLoading } = useGetBattleLog();
  const { data: identity } = useGetPlayerStyleIdentity();
  const { data: chronicle, loading: loadingChronicle } = useChronicleSummary();
  const [selected, setSelected] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<ChronicleTab>(() => normalizeChronicleTab(requestedTab));
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [mapZoom, setMapZoom] = useState(1);
  const [routeActive, setRouteActive] = useState(false);

  useEffect(() => {
    setActiveTab(normalizeChronicleTab(requestedTab));
  }, [requestedTab]);

  const allReplays = ((chronicle?.battleReplays?.length ? chronicle.battleReplays : replays) ?? []) as any[];
  const visibleReplays = styleFilter === "all" ? allReplays : allReplays.filter((replay) => replay.dominantStyle === styleFilter);
  const prTotal = allReplays.reduce((sum, replay) => sum + (replay.prCount ?? 0), 0);
  const total = identity
    ? (identity.strength ?? 0) + (identity.striking ?? 0) + (identity.conditioning ?? 0)
    + (identity.grappling ?? 0) + (identity.recovery ?? 0) + (identity.discipline ?? 0)
    : 0;
  const footSteps = Math.max(1800, Math.round((identity?.totalSessions ?? 0) * 900 + allReplays.length * 650 + prTotal * 250));
  const footMiles = Math.max(0.8, footSteps / 2200);
  const caravanMiles = Math.max(8, Math.round(((identity?.totalSessions ?? 0) * 1.8 + allReplays.length * 3.2) * 10) / 10);
  const mountMiles = Math.max(2, Math.round((prTotal * 1.5 + Math.max(0, allReplays.length - 1) * 0.8) * 10) / 10);
  const assistedMiles = caravanMiles + mountMiles;
  const pathLength = `M ${MAP_PATH_POINTS[0][0]} ${MAP_PATH_POINTS[0][1]} ` +
    MAP_PATH_POINTS.slice(1).map((point) => `L ${point[0]} ${point[1]}`).join(" ");
  const footRouteProgress = Math.min(72, Math.max(9, Math.round((footMiles / Math.max(1, assistedMiles + footMiles)) * 100)));
  const mapTitle = chronicle?.map?.title && chronicle.map.title !== "Journey Map" ? chronicle.map.title : "Map of Aethoria";
  const mapDescription = chronicle?.map?.description && chronicle.map.description !== "The Guild cartographers are preparing the map."
    ? chronicle.map.description
    : "The Hall's records have begun charting your passage through Aethoria. Regions, Gates, roads, and battle sites will appear here as your Chronicle grows.";
  const mapStatus = !chronicle?.map?.status || chronicle.map.status === "placeholder" ? "Known Routes" : chronicle.map.status;

  const renderPanel = () => {
    if (activeTab === "replays") return null;
    if (loadingChronicle) {
      return (
        <View style={ch.loadingPanel}>
          <ActivityIndicator color="#d9ad63" />
          <Text style={ch.loadingText}>Opening the wider Chronicle...</Text>
        </View>
      );
    }
    if (activeTab === "reports") {
      const reports = chronicle?.guildReports ?? [];
      return reports.length ? (
        <View style={ch.panelStack}>
          {reports.map((report) => (
            <View key={report.id} style={ch.recordCard}>
              <Text style={ch.recordMeta}>Guild Report {report.month}/{report.year}</Text>
              <Text style={ch.recordText}>{report.reportText}</Text>
            </View>
          ))}
        </View>
      ) : <EmptyRecord title="No Guild reports yet" text="Monthly reports will collect your legend as the record grows." />;
    }
    if (activeTab === "campaign") {
      return <CampaignChronicleView />;
    }
    if (activeTab === "items") {
      const items = chronicle?.discoveredItems ?? [];
      return items.length ? (
        <View style={ch.panelStack}>
          {items.map((item) => (
            <View key={item.id} style={ch.recordCard}>
              <View style={ch.recordRow}>
                <View style={{ flex: 1 }}>
                  <Text style={ch.recordTitle}>{item.itemName}</Text>
                  <Text style={ch.recordMeta}>{item.rarity} - {item.category}</Text>
                </View>
                <Text style={ch.statePill}>{item.currentState}</Text>
              </View>
              <Text style={ch.recordText}>{item.loreText}</Text>
            </View>
          ))}
        </View>
      ) : <EmptyRecord title="No discoveries yet" text="Items discovered through the Hall will remain here permanently." />;
    }
    if (activeTab === "records") {
      const titles = chronicle?.titlesEarned ?? [];
      const milestones = chronicle?.majorMilestones ?? [];
      const records = chronicle?.personalRecords ?? [];
      const worldEvents = chronicle?.worldEvents ?? [];
      const identityMilestones = worldEvents.filter(isIdentityMilestoneEvent);
      return (
        <View style={ch.panelStack}>
          <View style={ch.recordCard}>
            <View style={ch.recordRow}>
              <View style={{ flex: 1 }}>
                <Text style={ch.recordTitle}>Legend Marks</Text>
                <Text style={ch.recordText}>
                  When your training changes how Aethoria reads you, the Chronicle records it here before it becomes just another line in the ledger.
                </Text>
              </View>
              <Text style={ch.statePill}>{identityMilestones.length} marks</Text>
            </View>
            {identityMilestones.length ? (
              <View style={ch.legendMarkList}>
                {identityMilestones.map((event: any) => {
                  const metadata = event?.metadata ?? {};
                  const dominantStyle = metadata.dominantStyle as string | undefined;
                  const previousDominantStyle = metadata.previousDominantStyle as string | undefined;
                  const styleMeta = dominantStyle ? STYLE_META[dominantStyle] : null;
                  const previousLabel = previousDominantStyle ? STYLE_META[previousDominantStyle]?.label ?? previousDominantStyle : null;
                  const currentLabel = dominantStyle ? STYLE_META[dominantStyle]?.label ?? dominantStyle : null;
                  const archetype = metadata.hybridArchetype ?? String(event?.title ?? "").replace(/^Archetype Formed:\s*/i, "");
                  return (
                    <View key={String(event.id ?? `${event.title}-${event.createdAt}`)} style={[ch.legendMarkCard, { borderColor: styleMeta?.color ?? "#6b4d2f" }]}>
                      <View style={ch.recordRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={ch.legendMarkKicker}>Legend mark</Text>
                          <Text style={[ch.recordTitle, { color: styleMeta?.color ?? "#d9ad63" }]}>{event?.title ?? "Combat identity recorded"}</Text>
                        </View>
                        <Text style={ch.worldEventDate}>{formatChronicleDate(event?.createdAt ?? event?.occurredAt)}</Text>
                      </View>
                      {event?.description ? <Text style={ch.recordText}>{event.description}</Text> : null}
                      <View style={ch.worldEventMetaGrid}>
                        {currentLabel && <Text style={ch.worldEventMeta}>Style {previousLabel ? `${previousLabel} -> ${currentLabel}` : currentLabel}</Text>}
                        {archetype && <Text style={ch.worldEventMeta}>Archetype {String(archetype)}</Text>}
                        {metadata.totalSessions != null && <Text style={ch.worldEventMeta}>Field records {String(metadata.totalSessions)}</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={ch.worldEventEmpty}>
                <Text style={ch.recordTitle}>No legend marks yet.</Text>
                <Text style={ch.recordText}>Complete enough sessions for the Chronicle to name your combat identity.</Text>
              </View>
            )}
          </View>
          <View style={ch.recordCard}>
            <Text style={ch.recordTitle}>Titles Earned</Text>
            {titles.length ? titles.map((title) => <Text key={title.id} style={ch.recordText}>{title.name} ({title.rarity})</Text>) : <Text style={ch.recordMeta}>No titles yet.</Text>}
          </View>
          <View style={ch.recordCard}>
            <Text style={ch.recordTitle}>Major Milestones</Text>
            {milestones.length ? milestones.map((m) => <Text key={m.id} style={ch.recordText}>{m.summary}</Text>) : <Text style={ch.recordMeta}>No milestones yet.</Text>}
          </View>
          <View style={ch.recordCard}>
            <View style={ch.recordRow}>
              <View style={{ flex: 1 }}>
                <Text style={ch.recordTitle}>Aethoria World State</Text>
                <Text style={ch.recordText}>
                  Raids, recoveries, retreats, and victories become part of the wider war record. Other adventurers still hold the line, but your training gives the Guild its sharpest lever.
                </Text>
              </View>
              <Text style={ch.statePill}>{worldEvents.length} entries</Text>
            </View>
            {worldEvents.length ? (
              <View style={ch.worldEventList}>
                {worldEvents.map((event: any) => {
                  const tone = getWorldEventTone(event);
                  const metadata = event?.metadata ?? {};
                  const completedTasks = Number(metadata.completedTasks ?? metadata.completed ?? 0);
                  const totalTasks = Number(metadata.totalTasks ?? metadata.total ?? 0);
                  const hasProgress = Number.isFinite(completedTasks) && Number.isFinite(totalTasks) && totalTasks > 0;
                  const styleBonus = metadata.styleMultiplier ? Number(metadata.styleMultiplier).toFixed(2) : null;
                  const dominantStyleLabel = metadata.dominantStyle ? STYLE_META[metadata.dominantStyle]?.label ?? metadata.dominantStyle : null;
                  const previousStyleLabel = metadata.previousDominantStyle ? STYLE_META[metadata.previousDominantStyle]?.label ?? metadata.previousDominantStyle : null;
                  return (
                    <View key={String(event.id ?? `${event.title}-${event.createdAt}`)} style={[ch.worldEventItem, { borderColor: tone.border, backgroundColor: tone.bg }]}>
                      <View style={ch.recordRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[ch.worldEventKicker, { color: tone.text }]}>{tone.label}</Text>
                          <Text style={ch.recordTitle}>{event?.title ?? "Unrecorded world event"}</Text>
                        </View>
                        <Text style={ch.worldEventDate}>{formatChronicleDate(event?.createdAt ?? event?.occurredAt)}</Text>
                      </View>
                      {event?.description ? <Text style={ch.recordText}>{event.description}</Text> : null}
                      {(hasProgress || metadata.difficulty || metadata.dominantStyle || styleBonus) && (
                        <View style={ch.worldEventMetaGrid}>
                          {hasProgress && <Text style={ch.worldEventMeta}>Raid tasks {completedTasks}/{totalTasks}</Text>}
                          {metadata.difficulty && <Text style={ch.worldEventMeta}>Difficulty {metadata.difficulty}</Text>}
                          {dominantStyleLabel && <Text style={ch.worldEventMeta}>Style {previousStyleLabel ? `${previousStyleLabel} -> ${dominantStyleLabel}` : dominantStyleLabel}</Text>}
                          {styleBonus && <Text style={ch.worldEventMeta}>Pressure x{styleBonus}</Text>}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={ch.worldEventEmpty}>
                <Text style={ch.recordTitle}>No world shifts recorded yet.</Text>
                <Text style={ch.recordText}>Major victories, raid pressure, regional losses, and comeback moments will appear here as the campaign wakes.</Text>
              </View>
            )}
          </View>
          {records.map((record) => (
            <View key={record.id} style={ch.recordCard}>
              <View style={ch.recordRow}>
                <Text style={[ch.recordText, { flex: 1 }]}>{record.exerciseName}</Text>
                <Text style={ch.recordGold}>{record.weight} {record.weightUnit} x {record.reps}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }
    return (
      <View style={ch.panelStack}>
        <View style={ch.recordCard}>
          <Text style={ch.recordMeta}>SYSTEM CARTOGRAPHY - {mapStatus}</Text>
          <Text style={ch.mapTitle}>{mapTitle}</Text>
          <Text style={ch.recordText}>{mapDescription}</Text>
          <Text style={ch.mapNote}>
            Your training fuels expeditions, but Aethoria is vast. Some journeys are walked, some are taken by caravan, and all return through the Guild's stones.
          </Text>
        </View>
        <View style={ch.mapTools}>
          <View>
            <Text style={ch.recordMeta}>Known Routes</Text>
            <Text style={ch.mapToolText}>Tap the route to show the solid expedition trail.</Text>
          </View>
          <View style={ch.zoomRow}>
            <TouchableOpacity style={ch.zoomBtn} onPress={() => setMapZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100))}>
              <Text style={ch.zoomText}>-</Text>
            </TouchableOpacity>
            <Text style={ch.zoomValue}>{Math.round(mapZoom * 100)}%</Text>
            <TouchableOpacity style={ch.zoomBtn} onPress={() => setMapZoom((z) => Math.min(2.5, Math.round((z + 0.25) * 100) / 100))}>
              <Text style={ch.zoomText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ch.zoomBtn} onPress={() => setMapZoom(1)}>
              <Text style={ch.zoomText}>R</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ch.mapScroll}>
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => setRouteActive((value) => !value)}
            style={[ch.mapCard, { width: `${mapZoom * 100}%` }]}
          >
            <Image source={AETHORIA_MAP} style={ch.mapImage} resizeMode="cover" />
            <View style={ch.mapOverlay}>
              <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={ch.routeSvg}>
                <Rect x="0" y="0" width="100" height="100" fill="rgba(4, 7, 8, 0.15)" />
                <Path d={pathLength} fill="none" stroke="rgba(7, 7, 6, 0.82)" strokeDasharray="0.2 2.6" strokeWidth={0.72} strokeLinecap="round" strokeLinejoin="round" />
                {routeActive && (
                  <Path d={pathLength} fill="none" stroke="rgba(7, 7, 6, 0.82)" strokeWidth={1.55} strokeLinecap="round" strokeLinejoin="round" />
                )}
                <Path
                  d={pathLength}
                  fill="none"
                  stroke="#49a3a0"
                  strokeDasharray="0.3 2.5"
                  strokeWidth={0.42}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.82}
                />
                {routeActive && (
                  <Path
                    d={pathLength}
                    fill="none"
                    stroke="#49a3a0"
                    strokeDasharray="2.4 2.2"
                    strokeWidth={0.86}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.9}
                  />
                )}
                <Path
                  d={pathLength}
                  fill="none"
                  stroke="#d9ad63"
                  strokeDasharray={`${footRouteProgress} ${100 - footRouteProgress}`}
                  strokeWidth={0.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path d={RETURN_STONE_PATH} fill="none" stroke="#a78bfa" strokeDasharray="0.3 2.4" strokeWidth={0.42} strokeLinecap="round" opacity={0.88} />
                {routeActive && (
                  <Path d={RETURN_STONE_PATH} fill="none" stroke="#a78bfa" strokeDasharray="1.1 1.3" strokeWidth={0.82} strokeLinecap="round" opacity={0.9} />
                )}
                {MAP_PATH_POINTS.slice(0, Math.max(2, Math.ceil((footRouteProgress / 100) * MAP_PATH_POINTS.length))).map(([x, y], index) => (
                  <Circle key={`${x}-${y}`} cx={x} cy={y} r={index === 0 ? 0.8 : 0.58} fill={index === 0 ? "#49a3a0" : "#d9ad63"} stroke="#0c0b09" strokeWidth={0.28} />
                ))}
                <Circle cx="30" cy="60" r={0.86} fill="#a78bfa" stroke="#0c0b09" strokeWidth={0.28} />
              </Svg>
              <Text style={ch.mapMarker}>Summoning marker</Text>
              <Text style={[ch.mapMarker, ch.mapEndpoint]}>Expedition endpoint</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
        <View style={ch.mapLegend}>
          <View style={ch.legendItem}><View style={ch.legendDotted} /><Text style={ch.legendText}>Known route</Text></View>
          <View style={ch.legendItem}><View style={ch.legendSolid} /><Text style={ch.legendText}>Highlighted on tap</Text></View>
          <View style={ch.legendItem}><View style={ch.legendReturn} /><Text style={ch.legendText}>Return stone path</Text></View>
        </View>
        <View style={ch.travelGrid}>
          <StatTile label="On Foot" value={`${footSteps.toLocaleString()} steps`} tone="#d9ad63" />
          <StatTile label="Effort Miles" value={footMiles.toFixed(1)} tone="#d9ad63" />
          <StatTile label="Caravan" value={`${caravanMiles.toFixed(1)} mi`} tone="#49a3a0" />
          <StatTile label="Mount" value={`${mountMiles.toFixed(1)} mi`} tone="#49a3a0" />
          <StatTile label="Return Stone" value="Guild Hall" tone="#c4b5fd" />
        </View>
        <View style={ch.recordCard}>
          <Text style={ch.recordTitle}>Route Ledger</Text>
          <Text style={ch.recordText}>Gold marks on-foot effort earned from real steps. Teal routes are assisted travel handled by roads, caravans, mounts, and guides. Every expedition endpoint returns to the Guild Hall by stone, not by walking back across Aethoria.</Text>
        </View>
        <View style={ch.featureGrid}>
          {MAP_FEATURES.map((feature) => (
            <View key={feature} style={ch.featureTile}>
              <Text style={ch.recordTitle}>{feature}</Text>
              <Text style={ch.recordMeta}>Awaiting Chronicle data</Text>
            </View>
          ))}
        </View>
        <View style={ch.panelStack}>
          <Text style={[ch.sectionLabel, { marginTop: 4 }]}>DISCOVERY CLUES</Text>
          {MAP_CLUES.map((clue) => (
            <View key={clue.title} style={ch.recordCard}>
              <View style={ch.recordRow}>
                <View style={{ flex: 1 }}>
                  <Text style={ch.recordMeta}>{clue.source}</Text>
                  <Text style={ch.recordTitle}>{clue.title}</Text>
                </View>
                <Text style={ch.statePill}>{clue.status}</Text>
              </View>
              <Text style={ch.recordText}>{clue.text}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0908" }}>
      <FlatList
        data={activeTab === "replays" ? visibleReplays : []}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={ch.headerSub}>CHRONICLE</Text>
            <Text style={ch.headerTitle}>Chronicle</Text>
            <Text style={ch.headerDesc}>The record of your real and fantasy journey.</Text>

            <View style={ch.ledgerCard}>
              <Text style={ch.ledgerTitle}>Aethoria's Ledger</Text>
              <Text style={ch.ledgerText}>
                Every replay, report, record, and discovered relic becomes part of the proof that the System cannot erase your growth.
              </Text>
            </View>

            <SystemDangerCard danger={chronicle?.worldDanger} />

            <View style={ch.statsGrid}>
              <StatTile label="Replays" value={allReplays.length} tone="#49a3a0" />
              <StatTile label="PRs" value={prTotal} tone="#e2ad4d" />
              <StatTile label="Items" value={chronicle?.discoveredItems?.length ?? 0} tone="#d7a54d" />
            </View>

            {/* Style identity */}
            {identity && total > 0 && (
              <View style={[ch.identityCard, { borderColor: "#3b3328", backgroundColor: "#171510" }]}>
                <Text style={ch.sectionLabel}>YOUR COMBAT IDENTITY</Text>
                {identity.dominantStyle && (
                  <Text style={[ch.dominantStyle, { color: STYLE_META[identity.dominantStyle]?.color ?? "#d9ad63" }]}>
                    {STYLE_META[identity.dominantStyle]?.label ?? identity.dominantStyle}
                    {identity.hybridArchetype ? ` · ${identity.hybridArchetype}` : ""}
                  </Text>
                )}
                {STYLE_ORDER.filter((s) => ((identity as any)[s] ?? 0) > 0).map((s) => {
                  const t = STYLE_META[s]!;
                  const val = (identity as any)[s] as number;
                  const pct = Math.round((val / Math.max(1, total)) * 100);
                  return (
                    <View key={s} style={ch.barRow}>
                      <Text style={[ch.barLabel, { color: t.color }]}>{t.label}</Text>
                      <View style={ch.barTrack}>
                        <View style={[ch.barFill, { width: `${pct}%`, backgroundColor: t.color }]} />
                      </View>
                      <Text style={ch.barPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <TabGrid active={activeTab} onSelect={setActiveTab} />

            {activeTab === "replays" && (
              <>
                <View style={ch.filterRow}>
                  {["all", ...STYLE_ORDER].map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      style={[ch.filterBtn, styleFilter === filter && ch.filterBtnActive]}
                      onPress={() => setStyleFilter(filter)}
                    >
                      <Text style={[ch.filterText, styleFilter === filter && ch.filterTextActive]}>{filter}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[ch.sectionLabel, { marginTop: 16, marginBottom: 4 }]}>
                  BATTLE REPLAYS ({visibleReplays.length})
                </Text>
              </>
            )}
            {renderPanel()}
          </>
        }
        renderItem={({ item }) => (
          <ReplayCard replay={item} onPress={() => setSelected(item)} />
        )}
        ListEmptyComponent={
          activeTab !== "replays" ? null : isLoading ? null : (
            <View style={[ch.empty, { borderColor: "#3b3328" }]}>
              <Text style={{ fontSize: 24 }}>📖</Text>
              <Text style={[ch.emptyTitle, { color: colors.foreground }]}>No battles recorded</Text>
              <Text style={[ch.emptyDesc, { color: colors.mutedForeground }]}>
                Complete a training session to write your first combat replay.
              </Text>
            </View>
          )
        }
      />
      {selected && <ReplayModal replay={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

const ch = StyleSheet.create({
  headerSub: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#eee5d7", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2, marginBottom: 16 },
  headerDesc: { color: "#9f9586", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Inter_400Regular", marginTop: -12, marginBottom: 16 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", textTransform: "uppercase", marginBottom: 8, fontFamily: "Inter_400Regular" },
  ledgerCard: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 14, marginBottom: 14 },
  ledgerTitle: { color: "#d9ad63", fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  ledgerText: { color: "#cfc5b8", fontSize: 13, lineHeight: 20, marginTop: 6, fontFamily: "Inter_400Regular" },
  dangerCard: { borderWidth: 1, backgroundColor: "#140f0e", padding: 14, marginBottom: 14 },
  dangerHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  dangerTitle: { fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2 },
  dangerValueBox: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#120d0c" },
  dangerValue: { fontSize: 12, fontWeight: "900", fontFamily: "Inter_700Bold" },
  dangerTrack: { height: 8, backgroundColor: "#2a1815", overflow: "hidden", marginTop: 12 },
  dangerFill: { height: 8 },
  dangerNote: { color: "#b7ab9c", fontSize: 11, lineHeight: 17, marginTop: 10, fontFamily: "Inter_400Regular" },
  statsGrid: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statTile: { flex: 1, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 12, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  statLabel: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", letterSpacing: 1, marginTop: 4, fontFamily: "Inter_400Regular", textAlign: "center" },
  identityCard: { borderWidth: 1, padding: 14, marginBottom: 16 },
  dominantStyle: { fontSize: 15, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold", marginBottom: 10 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  barLabel: { width: 80, fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  barTrack: { flex: 1, height: 4, backgroundColor: "#2a2520", borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  barPct: { width: 30, textAlign: "right", fontSize: 10, color: "#6b5d4f" },
  tabGrid: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 4, gap: 4, marginBottom: 12 },
  tabBtn: { width: "32%", minHeight: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#0c0b09", borderWidth: 1, borderColor: "#1f1b16" },
  tabBtnActive: { borderColor: "#d7a54d", backgroundColor: "#1b1711" },
  tabText: { color: "#8f887d", fontSize: 11, fontFamily: "Inter_700Bold" },
  tabTextActive: { color: "#d7a54d" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  filterBtn: { borderWidth: 1, borderColor: "#3b3328", paddingHorizontal: 9, paddingVertical: 5 },
  filterBtnActive: { borderColor: "#d7a54d" },
  filterText: { color: "#8f887d", fontSize: 10, textTransform: "capitalize", fontFamily: "Inter_400Regular" },
  filterTextActive: { color: "#d7a54d" },
  loadingPanel: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 22, alignItems: "center", gap: 10 },
  loadingText: { color: "#9d8f80", fontSize: 12, fontFamily: "Inter_400Regular" },
  panelStack: { gap: 10 },
  recordCard: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 14 },
  recordTitle: { color: "#d9ad63", fontSize: 15, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold", marginBottom: 4 },
  recordMeta: { color: "#8f887d", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Inter_400Regular", marginTop: 4 },
  recordText: { color: "#d8c4a5", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 4 },
  recordRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  recordGold: { color: "#d7a54d", fontSize: 12, fontFamily: "Inter_700Bold" },
  statePill: { borderWidth: 1, borderColor: "#6b4d2f", color: "#d8c4a5", paddingHorizontal: 8, paddingVertical: 3, fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  worldEventList: { gap: 8, marginTop: 12 },
  worldEventItem: { borderWidth: 1, padding: 12 },
  worldEventKicker: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1.6, fontFamily: "Inter_700Bold", marginBottom: 4 },
  worldEventDate: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Inter_400Regular", marginTop: 2 },
  worldEventMetaGrid: { borderTopWidth: 1, borderTopColor: "#3b3328", marginTop: 10, paddingTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  worldEventMeta: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.7, fontFamily: "Inter_700Bold" },
  worldEventEmpty: { borderWidth: 1, borderStyle: "dashed", borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 14, alignItems: "center", marginTop: 12 },
  legendMarkList: { gap: 8, marginTop: 12 },
  legendMarkCard: { borderWidth: 1, backgroundColor: "#0c0b09", padding: 12 },
  legendMarkKicker: { color: "#9d8f80", fontSize: 9, textTransform: "uppercase", letterSpacing: 1.6, fontFamily: "Inter_700Bold", marginBottom: 4 },
  campaignPosition: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 14 },
  campaignChapter: { borderWidth: 1, backgroundColor: "#11100e" },
  campaignChapterHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  chapterSigil: { width: 30, height: 30, borderWidth: 1, backgroundColor: "#0c0b09", alignItems: "center", justifyContent: "center" },
  chapterSigilText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  campaignChapterBody: { borderTopWidth: 1, borderTopColor: "#3b3328" },
  campaignQuest: { borderBottomWidth: 1, borderBottomColor: "#3b3328" },
  campaignQuestHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12 },
  questStatusDot: { width: 24, height: 24, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 2 },
  questStatusMark: { fontSize: 10, fontFamily: "Inter_700Bold" },
  difficultyPill: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 3, marginTop: 1 },
  difficultyText: { fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  expandMark: { color: "#8f887d", fontSize: 9, letterSpacing: 1.2, fontFamily: "Inter_700Bold", marginTop: 6 },
  campaignQuestBody: { borderTopWidth: 1, borderTopColor: "#3b3328", backgroundColor: "#0c0b09", padding: 12, gap: 10 },
  loreBox: { borderLeftWidth: 2, borderLeftColor: "#9d3e2a", backgroundColor: "#1b1511", padding: 10 },
  loreLabel: { color: "#9d8f80", fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "Inter_700Bold", marginBottom: 4 },
  loreText: { color: "#cfc5b8", fontSize: 12, lineHeight: 18, fontStyle: "italic", fontFamily: "Inter_400Regular" },
  objectiveText: { color: "#8f887d", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  rewardRow: { flexDirection: "row", gap: 16 },
  rewardXp: { color: "#49a3a0", fontSize: 11, fontFamily: "Inter_700Bold" },
  rewardGold: { color: "#d7a54d", fontSize: 11, fontFamily: "Inter_700Bold" },
  activeMissionBox: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#0c0b09", padding: 10, marginTop: 10 },
  emptyRecord: { borderWidth: 1, borderStyle: "dashed", borderColor: "#3b3328", backgroundColor: "#11100e", padding: 24, alignItems: "center", gap: 8 },
  mapTools: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  mapToolText: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 2, fontFamily: "Inter_400Regular" },
  zoomRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  zoomBtn: { width: 32, height: 32, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", alignItems: "center", justifyContent: "center" },
  zoomText: { color: "#d9ad63", fontSize: 13, fontFamily: "Inter_700Bold" },
  zoomValue: { minWidth: 46, borderWidth: 1, borderColor: "#3b3328", color: "#d8c4a5", textAlign: "center", paddingVertical: 7, fontSize: 11, fontFamily: "Inter_700Bold" },
  mapScroll: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#070706" },
  mapCard: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#070706", overflow: "hidden" },
  mapImage: { width: "100%", aspectRatio: 1.58 },
  mapOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  routeSvg: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  mapMarker: { position: "absolute", left: "36%", top: "38%", borderWidth: 1, borderColor: "#49a3a0", backgroundColor: "#061010dd", color: "#bde7df", fontSize: 9, paddingHorizontal: 6, paddingVertical: 3, fontFamily: "Inter_700Bold" },
  mapEndpoint: { left: "22%", top: "60%", borderColor: "#a78bfa", backgroundColor: "#10091add", color: "#ddd6fe" },
  mapTitle: { color: "#e5c386", fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold", marginTop: 4 },
  mapNote: { color: "#9f9586", fontSize: 12, lineHeight: 18, borderLeftWidth: 2, borderLeftColor: "#6b4d2f", paddingLeft: 10, marginTop: 10, fontFamily: "Inter_400Regular" },
  mapLegend: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 10, gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDotted: { width: 34, borderTopWidth: 2, borderStyle: "dashed", borderColor: "#49a3a0" },
  legendSolid: { width: 34, borderTopWidth: 4, borderColor: "#49a3a0" },
  legendReturn: { width: 34, borderTopWidth: 2, borderStyle: "dashed", borderColor: "#a78bfa" },
  legendText: { color: "#8f887d", fontSize: 10, fontFamily: "Inter_400Regular" },
  travelGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureTile: { width: "48%", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 12 },
  empty: { borderWidth: 1, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  emptyDesc: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});

