import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Line, Path, Stop, Text as SvgText } from "react-native-svg";
import { useRouter } from "expo-router";
import {
  useGetAnalyticsOverview,
  useGetAchievements,
  type Achievement,
  type WeightEntry,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

// ── Category color map ────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  training:    "#ef4444",
  discipline:  "#3b82f6",
  nutrition:   "#22c55e",
  skills:      "#a855f7",
  progression: "#0dcef5",
  economy:     "#eab308",
  quests:      "#f97316",
};

function catColor(category: string): string {
  return CAT_COLORS[category] ?? "#0dcef5";
}

function achievementEmoji(category: string): string {
  const map: Record<string, string> = {
    training:    "⚔️",
    discipline:  "🧠",
    nutrition:   "🍎",
    skills:      "✨",
    progression: "📈",
    economy:     "💰",
    quests:      "🗺️",
  };
  return map[category] ?? "🏆";
}

// ── Unlock condition helper ───────────────────────────────────────────────────

const CHECK_KEY_LABELS: Record<string, string> = {
  totalWorkouts:     "workouts completed",
  totalPrs:          "personal records broken",
  currentStreak:     "day streak maintained",
  longestStreak:     "day streak reached",
  totalXpEarned:     "total XP earned",
  streakDays:        "day streak",
  workoutsThisWeek:  "workouts this week",
  totalSets:         "total sets logged",
  totalCalories:     "calories logged",
};

function unlockConditionText(ach: Achievement): string | null {
  if (ach.unlockCondition) return ach.unlockCondition;
  if (ach.checkKey && ach.checkThreshold != null) {
    const label = CHECK_KEY_LABELS[ach.checkKey] ?? ach.checkKey.replace(/([A-Z])/g, " $1").toLowerCase();
    return `Reach ${ach.checkThreshold} ${label}`;
  }
  return null;
}

// ── SVG sparkline area chart ──────────────────────────────────────────────────

function WeightSparkline({
  data,
  width,
  height = 130,
  color,
}: {
  data: WeightEntry[];
  width: number;
  height?: number;
  color: string;
}) {
  if (data.length < 2 || width === 0) return null;

  const weights = data.map((d) => d.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const pad = { left: 32, right: 8, top: 12, bottom: 20 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const xs = data.map((_, i) => pad.left + (i / (data.length - 1)) * innerW);
  const ys = data.map((d) => pad.top + (1 - (d.weight - minW) / range) * innerH);

  const linePath =
    "M " + xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" L ");

  const areaPath =
    `M ${xs[0].toFixed(1)},${(pad.top + innerH).toFixed(1)} ` +
    "L " +
    xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" L ") +
    ` L ${xs[xs.length - 1].toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </LinearGradient>
      </Defs>

      {/* Horizontal guides */}
      <Line x1={pad.left} y1={pad.top}              x2={pad.left + innerW} y2={pad.top}              stroke={color + "20"} strokeWidth={1} />
      <Line x1={pad.left} y1={pad.top + innerH / 2} x2={pad.left + innerW} y2={pad.top + innerH / 2} stroke={color + "18"} strokeWidth={1} strokeDasharray="4,4" />
      <Line x1={pad.left} y1={pad.top + innerH}     x2={pad.left + innerW} y2={pad.top + innerH}     stroke={color + "20"} strokeWidth={1} />

      {/* Y-axis labels */}
      <SvgText x={0} y={pad.top + 5}              fontSize={8} fill={color + "90"}>{maxW.toFixed(1)}</SvgText>
      <SvgText x={0} y={pad.top + innerH / 2 + 4} fontSize={8} fill={color + "70"}>
        {((minW + maxW) / 2).toFixed(1)}
      </SvgText>
      <SvgText x={0} y={pad.top + innerH + 4}     fontSize={8} fill={color + "90"}>{minW.toFixed(1)}</SvgText>

      {/* Area fill */}
      <Path d={areaPath} fill="url(#areaGrad)" />

      {/* Line */}
      <Path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* First / last date labels */}
      <SvgText x={pad.left} y={height - 4} fontSize={8} fill={color + "80"} textAnchor="start">
        {new Date(data[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </SvgText>
      <SvgText x={pad.left + innerW} y={height - 4} fontSize={8} fill={color + "80"} textAnchor="end">
        {new Date(data[data.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </SvgText>
    </Svg>
  );
}

// ── Achievement grid tile ─────────────────────────────────────────────────────

function AchievementTile({
  achievement,
  onPress,
  colors,
}: {
  achievement: Achievement;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const isUnlocked = !!achievement.unlockedAt;
  const cc = catColor(achievement.category);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        tile.wrap,
        {
          backgroundColor: isUnlocked ? cc + "12" : colors.card,
          borderColor: isUnlocked ? cc + "40" : colors.border,
          opacity: isUnlocked ? 1 : 0.5,
        },
      ]}
    >
      {/* Icon */}
      <View
        style={[
          tile.iconBox,
          {
            backgroundColor: isUnlocked ? cc + "20" : colors.secondary,
            borderColor: isUnlocked ? cc + "40" : colors.border,
          },
        ]}
      >
        <Text style={tile.iconEmoji}>
          {isUnlocked ? achievementEmoji(achievement.category) : "🔒"}
        </Text>
      </View>

      {/* Name */}
      <Text
        style={[tile.name, { color: isUnlocked ? colors.foreground : colors.mutedForeground }]}
        numberOfLines={2}
      >
        {achievement.name}
      </Text>

      {/* Category dot */}
      <View style={[tile.catDot, { backgroundColor: isUnlocked ? cc : colors.mutedForeground + "60" }]} />
    </TouchableOpacity>
  );
}

// ── Achievement detail bottom sheet ──────────────────────────────────────────

function AchievementModal({
  achievement,
  onClose,
  colors,
}: {
  achievement: Achievement | null;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  if (!achievement) return null;

  const isUnlocked = !!achievement.unlockedAt;
  const cc = catColor(achievement.category);
  const conditionText = unlockConditionText(achievement);

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={am.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[am.sheet, { backgroundColor: colors.card, borderColor: isUnlocked ? cc + "50" : colors.border }]}
        >
          {/* Accent strip */}
          <View style={[am.accent, { backgroundColor: isUnlocked ? cc : colors.border }]} />

          {/* Header */}
          <View style={am.headerRow}>
            <View style={[am.iconBox, { backgroundColor: isUnlocked ? cc + "1a" : colors.secondary, borderColor: isUnlocked ? cc + "40" : colors.border }]}>
              <Text style={am.iconEmoji}>{isUnlocked ? achievementEmoji(achievement.category) : "🔒"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={am.badgeRow}>
                <View style={[am.catBadge, { backgroundColor: cc + "18", borderColor: cc + "40" }]}>
                  <Text style={[am.catBadgeText, { color: cc }]}>
                    {achievement.category.toUpperCase()}
                  </Text>
                </View>
                {isUnlocked && (
                  <View style={[am.catBadge, { backgroundColor: "#22c55e18", borderColor: "#22c55e40" }]}>
                    <Text style={[am.catBadgeText, { color: "#22c55e" }]}>UNLOCKED</Text>
                  </View>
                )}
              </View>
              <Text style={[am.title, { color: isUnlocked ? cc : colors.foreground }]} numberOfLines={2}>
                {achievement.name}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[am.description, { color: colors.mutedForeground }]}>
            {achievement.description}
          </Text>

          {/* Unlock condition */}
          {conditionText && (
            <View style={[am.conditionBox, { borderColor: isUnlocked ? cc + "30" : colors.border, backgroundColor: isUnlocked ? cc + "0a" : colors.secondary }]}>
              <Text style={[am.conditionLabel, { color: colors.mutedForeground }]}>UNLOCK CONDITION</Text>
              <Text style={[am.conditionText, { color: isUnlocked ? cc : colors.foreground }]}>
                {conditionText}
              </Text>
            </View>
          )}

          {/* Rewards row */}
          <View style={[am.rewardRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <View style={am.rewardItem}>
              <Text style={[am.rewardValue, { color: colors.primary }]}>{achievement.xpReward}</Text>
              <Text style={[am.rewardLabel, { color: colors.mutedForeground }]}>XP Reward</Text>
            </View>
            {achievement.unlockedAt && (
              <View style={am.rewardItem}>
                <Text style={[am.rewardValue, { color: "#22c55e" }]}>
                  {new Date(achievement.unlockedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                <Text style={[am.rewardLabel, { color: colors.mutedForeground }]}>Earned On</Text>
              </View>
            )}
          </View>

          {/* Dismiss */}
          <TouchableOpacity onPress={onClose} style={am.dismissRow} activeOpacity={0.7}>
            <Text style={[am.dismissText, { color: colors.mutedForeground }]}>Dismiss</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type Section = "stats" | "achievements";

export default function RecordsScreen() {
  const colors = useColors();
  const router = useRouter();

  const { data: analytics, isLoading: loadingAnalytics } = useGetAnalyticsOverview();
  const { data: achievements, isLoading: loadingAch } = useGetAchievements();

  const [section, setSection] = useState<Section>("stats");
  const [achFilter, setAchFilter] = useState<string>("all");
  const [selectedAch, setSelectedAch] = useState<Achievement | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  const unlockedAch = achievements?.filter((a) => !!a.unlockedAt) ?? [];
  const categories = ["all", ...Array.from(new Set(achievements?.map((a) => a.category) ?? []))];
  const filteredAch =
    achFilter === "all"
      ? achievements ?? []
      : (achievements ?? []).filter((a) => a.category === achFilter);

  const isLoading = loadingAnalytics && section === "stats";

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={[s.backArrow, { color: colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Battle Records</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>Your journey in numbers</Text>
        </View>
      </View>

      {/* Section toggle */}
      <View style={[s.toggle, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["stats", "achievements"] as Section[]).map((sec) => {
          const active = section === sec;
          return (
            <TouchableOpacity
              key={sec}
              onPress={() => setSection(sec)}
              style={[s.toggleBtn, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleLabel, { color: active ? colors.primary : colors.mutedForeground }]}>
                {sec === "stats" ? "Stats" : `Achievements${unlockedAch.length > 0 ? ` · ${unlockedAch.length}` : ""}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            Platform.OS === "ios" && { paddingBottom: 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── STATS SECTION ──────────────────────────────────── */}
          {section === "stats" && analytics && (
            <>
              {/* 2×2 stat cards */}
              <View style={s.cardGrid}>
                <StatCard value={analytics.totalWorkouts}  label="Battles Won"   icon="⚔️" color={colors.primary} colors={colors} />
                <StatCard value={analytics.totalPrs}        label="PRs Broken"    icon="🏆" color="#ffbf00"         colors={colors} />
                <StatCard value={analytics.currentStreak}   label="Streak Days"   icon="🔥" color="#22c55e"         colors={colors} />
                <StatCard value={analytics.longestStreak}   label="Best Streak"   icon="⚡" color="#f97316"         colors={colors} />
              </View>

              {/* XP earned banner */}
              <View style={[s.xpBanner, { backgroundColor: colors.card, borderColor: colors.primary + "30" }]}>
                <Text style={[s.xpBannerValue, { color: colors.primary }]}>
                  {analytics.totalXpEarned.toLocaleString()}
                </Text>
                <Text style={[s.xpBannerLabel, { color: colors.mutedForeground }]}>
                  Total XP Earned (Mastery Points)
                </Text>
              </View>

              {/* Weight trend chart */}
              <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.cardTitle, { color: colors.foreground }]}>⚖️  Body Mass Trend</Text>
                {analytics.weightTrend.length === 0 ? (
                  <Text style={[s.emptyNote, { color: colors.mutedForeground }]}>
                    Log body weight in Nutrition to track trends.
                  </Text>
                ) : (
                  <View
                    style={s.chartWrap}
                    onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
                  >
                    <WeightSparkline
                      data={analytics.weightTrend}
                      width={chartWidth}
                      height={130}
                      color={colors.primary}
                    />
                  </View>
                )}
              </View>

              {/* Recent PRs — with date */}
              <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.cardTitle, { color: "#ffbf00" }]}>🏆  Hall of Fame</Text>
                {analytics.recentPrs.length === 0 ? (
                  <Text style={[s.emptyNote, { color: colors.mutedForeground }]}>
                    No records set yet. Complete sessions to earn PRs.
                  </Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {analytics.recentPrs.slice(0, 5).map((pr) => (
                      <View
                        key={pr.id}
                        style={[s.prRow, { backgroundColor: "#ffbf0009", borderColor: "#ffbf0025" }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[s.prExercise, { color: colors.foreground }]} numberOfLines={1}>
                            {pr.exerciseName}
                          </Text>
                          <Text style={[s.prDate, { color: colors.mutedForeground }]}>
                            {new Date(pr.achievedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </Text>
                        </View>
                        <Text style={[s.prValue, { color: "#ffbf00" }]}>
                          {pr.weight} {pr.weightUnit} × {pr.reps}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Avg nutrition (7d) */}
              {(analytics.avgCaloriesLast7Days > 0 || analytics.avgProteinLast7Days > 0) && (
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.cardTitle, { color: "#22c55e" }]}>🍎  Avg Nutrition (7d)</Text>
                  <View style={s.nutritionRow}>
                    <View style={s.nutritionItem}>
                      <Text style={[s.nutritionValue, { color: "#22c55e" }]}>
                        {Math.round(analytics.avgCaloriesLast7Days)}
                      </Text>
                      <Text style={[s.nutritionLabel, { color: colors.mutedForeground }]}>kcal / day</Text>
                    </View>
                    <View style={[s.nutritionDivider, { backgroundColor: colors.border }]} />
                    <View style={s.nutritionItem}>
                      <Text style={[s.nutritionValue, { color: "#3b82f6" }]}>
                        {Math.round(analytics.avgProteinLast7Days)}g
                      </Text>
                      <Text style={[s.nutritionLabel, { color: colors.mutedForeground }]}>protein / day</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {/* ── ACHIEVEMENTS SECTION ───────────────────────────── */}
          {section === "achievements" && (
            <>
              {loadingAch ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
              ) : (
                <>
                  {/* Progress summary */}
                  <View style={[s.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={s.progressEmoji}>🏆</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.progressLabel, { color: colors.foreground }]}>
                        {unlockedAch.length} / {achievements?.length ?? 0} Unlocked
                      </Text>
                      <View style={[s.progressTrack, { backgroundColor: colors.secondary }]}>
                        <View
                          style={[
                            s.progressFill,
                            {
                              backgroundColor: "#ffbf00",
                              width: `${achievements?.length ? (unlockedAch.length / achievements.length) * 100 : 0}%` as any,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Category filter chips */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.filterStrip}
                  >
                    {categories.map((cat) => {
                      const active = achFilter === cat;
                      const cc = cat === "all" ? colors.primary : catColor(cat);
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setAchFilter(cat)}
                          style={[
                            s.filterChip,
                            {
                              borderColor: active ? cc + "80" : colors.border,
                              backgroundColor: active ? cc + "18" : colors.card,
                            },
                          ]}
                          activeOpacity={0.75}
                        >
                          <Text style={[s.filterChipText, { color: active ? cc : colors.mutedForeground }]}>
                            {cat.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* 3-column achievement grid */}
                  {filteredAch.length === 0 ? (
                    <Text style={[s.emptyNote, { color: colors.mutedForeground, textAlign: "center", marginTop: 24 }]}>
                      No achievements in this category yet.
                    </Text>
                  ) : (
                    <View style={s.achGrid}>
                      {filteredAch.map((ach) => (
                        <AchievementTile
                          key={ach.id}
                          achievement={ach}
                          onPress={() => setSelectedAch(ach)}
                          colors={colors}
                        />
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Achievement detail modal */}
      <AchievementModal
        achievement={selectedAch}
        onClose={() => setSelectedAch(null)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  icon,
  color,
  colors,
}: {
  value: number;
  label: string;
  icon: string;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[sc.card, { backgroundColor: colors.card, borderColor: color + "30" }]}>
      <Text style={sc.icon}>{icon}</Text>
      <Text style={[sc.value, { color }]}>{value.toLocaleString()}</Text>
      <Text style={[sc.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn:     { padding: 4 },
  backArrow:   { fontSize: 32, lineHeight: 34 },
  headerText:  { flex: 1 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerSub:   { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },

  toggle: { flexDirection: "row", borderBottomWidth: 1 },
  toggleBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  toggleLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll:   { padding: 14, gap: 12 },

  cardGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  xpBanner:      { borderWidth: 1, borderRadius: 10, padding: 14, alignItems: "center" },
  xpBannerValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  xpBannerLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginTop: 2 },

  card:      { borderWidth: 1, borderRadius: 10, padding: 14, gap: 10 },
  cardTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  emptyNote: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  chartWrap: { height: 130, marginTop: 4 },

  prRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  prExercise: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  prDate:     { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 1 },
  prValue:    { fontSize: 11, fontFamily: "Inter_700Bold" },

  nutritionRow:    { flexDirection: "row", alignItems: "center" },
  nutritionItem:   { flex: 1, alignItems: "center" },
  nutritionValue:  { fontSize: 22, fontFamily: "Inter_700Bold" },
  nutritionLabel:  { fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginTop: 1 },
  nutritionDivider:{ width: 1, height: 36, marginHorizontal: 12 },

  progressCard:  { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 10, padding: 12 },
  progressEmoji: { fontSize: 24 },
  progressLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  progressTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  progressFill:  { height: 5, borderRadius: 3 },

  filterStrip:    { paddingVertical: 8, paddingHorizontal: 2, gap: 6 },
  filterChip:     { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  filterChipText: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },

  // 3-column grid
  achGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});

const sc = StyleSheet.create({
  card:  { width: "47%", borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center", gap: 4 },
  icon:  { fontSize: 20 },
  value: { fontSize: 24, fontFamily: "Inter_700Bold" },
  label: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textAlign: "center" },
});

const tile = StyleSheet.create({
  wrap: {
    width: "31%",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    gap: 6,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: { fontSize: 22 },
  name: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 12,
  },
  catDot: { width: 5, height: 5, borderRadius: 3 },
});

const am = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#00000075", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  accent: { height: 3 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, paddingBottom: 8 },
  iconBox: { width: 52, height: 52, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  iconEmoji: { fontSize: 24 },
  badgeRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  catBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  catBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 22 },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  conditionBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 3,
  },
  conditionLabel: { fontSize: 8, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  conditionText:  { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  rewardRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
  },
  rewardItem:  { flex: 1, alignItems: "center", paddingVertical: 10 },
  rewardValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  rewardLabel: { fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 1 },
  dismissRow:  { alignItems: "center", paddingVertical: 12 },
  dismissText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
