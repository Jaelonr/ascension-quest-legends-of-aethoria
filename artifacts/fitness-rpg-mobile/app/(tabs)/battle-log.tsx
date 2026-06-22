import {
  useGetBattleLog,
  useGetPlayerStyleIdentity,
} from "@workspace/api-client-react";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const STYLE_META: Record<string, { label: string; color: string; bg: string }> = {
  strength:     { label: "Strength",     color: "#ef4444", bg: "#ef444418" },
  striking:     { label: "Striking",     color: "#f97316", bg: "#f9731618" },
  conditioning: { label: "Conditioning", color: "#0dcef5", bg: "#0dcef518" },
  grappling:    { label: "Grappling",    color: "#a855f7", bg: "#a855f718" },
  recovery:     { label: "Recovery",     color: "#22c55e", bg: "#22c55e18" },
  discipline:   { label: "Discipline",   color: "#eab308", bg: "#eab30818" },
};
const STYLE_ORDER = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;

const VERDICT_COLORS: Record<string, string> = {
  "Crushing Victory": "#eab308",
  "Victory":          "#22c55e",
  "Close Victory":    "#0dcef5",
  "Strategic Retreat":"#f97316",
  "Training Complete":"#22c55e",
};

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
  verdictBadge: { borderWidth: 1, borderRadius: 8, padding: 12, alignItems: "center" },
  verdictText: { fontWeight: "700", fontSize: 14, letterSpacing: 1, fontFamily: "Inter_700Bold" },
  returnBtn: { borderWidth: 1, borderColor: "#3b3328", padding: 14, alignItems: "center", borderRadius: 4 },
  returnBtnText: { color: "#9d8f80", fontSize: 11, fontWeight: "700", letterSpacing: 2, fontFamily: "Inter_700Bold" },
});

function ReplayCard({ replay, onPress }: { replay: any; onPress: () => void }) {
  const meta = STYLE_META[replay.dominantStyle] ?? STYLE_META.strength;
  const verdictColor = VERDICT_COLORS[replay.verdict] ?? "#22c55e";
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
  date: { fontSize: 10, color: "#6b5d4f", flexShrink: 0 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  xp: { fontSize: 11, fontWeight: "700", color: "#0dcef5", fontFamily: "Inter_700Bold" },
  gold: { fontSize: 11, fontWeight: "700", color: "#d9ad63", fontFamily: "Inter_700Bold" },
  pr: { fontSize: 11, fontWeight: "700", color: "#eab308", fontFamily: "Inter_700Bold" },
  tapHint: { fontSize: 9, color: "#4a4035", textTransform: "uppercase", letterSpacing: 2 },
});

export default function ChronicleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: replays, isLoading } = useGetBattleLog();
  const { data: identity } = useGetPlayerStyleIdentity();
  const [selected, setSelected] = useState<any | null>(null);

  const total = identity
    ? (identity.strength ?? 0) + (identity.striking ?? 0) + (identity.conditioning ?? 0)
    + (identity.grappling ?? 0) + (identity.recovery ?? 0) + (identity.discipline ?? 0)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0908" }}>
      <FlatList
        data={replays ?? []}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={ch.headerSub}>CHRONICLE</Text>
            <Text style={ch.headerTitle}>Battle History</Text>

            {/* Style identity */}
            {identity && total > 0 && (
              <View style={[ch.identityCard, { borderColor: "#3b3328", backgroundColor: "#171510" }]}>
                <Text style={ch.sectionLabel}>YOUR COMBAT IDENTITY</Text>
                {identity.dominantStyle && (
                  <Text style={[ch.dominantStyle, { color: STYLE_META[identity.dominantStyle]?.color ?? "#d9ad63" }]}>
                    {STYLE_META[identity.dominantStyle]?.label ?? identity.dominantStyle} Fighter
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

            <Text style={[ch.sectionLabel, { marginTop: 16, marginBottom: 4 }]}>
              BATTLE REPLAYS {replays ? `(${replays.length})` : ""}
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <ReplayCard replay={item} onPress={() => setSelected(item)} />
        )}
        ListEmptyComponent={
          isLoading ? null : (
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
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", textTransform: "uppercase", marginBottom: 8, fontFamily: "Inter_400Regular" },
  identityCard: { borderWidth: 1, padding: 14, marginBottom: 16 },
  dominantStyle: { fontSize: 15, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold", marginBottom: 10 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  barLabel: { width: 80, fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  barTrack: { flex: 1, height: 4, backgroundColor: "#2a2520", borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  barPct: { width: 30, textAlign: "right", fontSize: 10, color: "#6b5d4f" },
  empty: { borderWidth: 1, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  emptyDesc: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});

