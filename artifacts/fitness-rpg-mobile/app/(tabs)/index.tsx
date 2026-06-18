import {
  useGetDashboardSummary,
  useGetBattleLog,
} from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";

const STAT_LABELS: Record<string, string> = {
  strength: "STR",
  agility: "AGI",
  stamina: "STA",
  vitality: "VIT",
  discipline: "DIS",
  sense: "SEN",
};

const RANK_COLORS: Record<string, string> = {
  E: "#8c96a6",
  D: "#22c55e",
  C: "#0dcef5",
  B: "#a855f7",
  A: "#ffbf00",
  S: "#f97316",
  SS: "#e61a3c",
};

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const colors = useColors();
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={styles.statBarRow}>
      <Text style={[styles.statBarLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View style={[styles.statBarTrack, { backgroundColor: colors.secondary }]}>
        <View
          style={[
            styles.statBarFill,
            { width: `${pct * 100}%` as any, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.statBarValue, { color: colors.mutedForeground }]}>
        {value}/{max}
      </Text>
    </View>
  );
}

export default function StatusScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: battles } = useGetBattleLog(
    { limit: 1 },
    { query: { queryKey: ["/api/battle-log", "limit-1"] } }
  );

  const lastBattle = (battles as any)?.[0] ?? null;

  if (isLoading) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!summary) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          Failed to load status window.
        </Text>
      </View>
    );
  }

  const { player, dailyQuest } = summary;
  const rankColor = RANK_COLORS[player.rank] ?? colors.primary;
  const xpPct = player.xpToNextLevel > 0 ? player.xp / player.xpToNextLevel : 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Screen Label */}
      <Text style={[styles.screenLabel, { color: colors.mutedForeground }]}>
        STATUS WINDOW
      </Text>

      {/* Player Card */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.playerHeader}>
          <View
            style={[
              styles.rankBadge,
              { borderColor: rankColor, backgroundColor: rankColor + "22" },
            ]}
          >
            <Text style={[styles.rankText, { color: rankColor }]}>
              {player.rank}
            </Text>
          </View>
          <View style={styles.playerMeta}>
            <Text style={[styles.playerName, { color: colors.foreground }]}>
              {player.name}
            </Text>
            {player.activeTitle ? (
              <Text style={[styles.playerTitle, { color: colors.accent }]}>
                {player.activeTitle}
              </Text>
            ) : null}
            <Text style={[styles.levelText, { color: colors.primary }]}>
              Level {player.level}
            </Text>
          </View>
          <View style={styles.goldBadge}>
            <Text style={[styles.goldIcon]}>✦</Text>
            <Text style={[styles.goldAmount, { color: colors.accent }]}>
              {(player.gold ?? 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.barSection}>
          <View style={styles.barHeader}>
            <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
              XP
            </Text>
            <Text style={[styles.barValue, { color: colors.mutedForeground }]}>
              {player.xp} / {player.xpToNextLevel}
            </Text>
          </View>
          <View
            style={[styles.barTrack, { backgroundColor: colors.secondary }]}
          >
            <View
              style={[
                styles.barFill,
                {
                  width: `${xpPct * 100}%` as any,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* HP/MP Bars */}
        <StatBar
          label="HP"
          value={player.hp}
          max={player.maxHp}
          color={colors.destructive}
        />
        <StatBar
          label="MP"
          value={player.mp}
          max={player.maxMp}
          color="#3b82f6"
        />

        {/* Stats Grid */}
        <View
          style={[
            styles.statsGrid,
            { borderColor: colors.border, backgroundColor: colors.secondary },
          ]}
        >
          {Object.entries(player.stats as unknown as Record<string, number>).map(
            ([stat, val]) => (
              <View key={stat} style={styles.statCell}>
                <Text
                  style={[styles.statKey, { color: colors.mutedForeground }]}
                >
                  {STAT_LABELS[stat] ?? stat.slice(0, 3).toUpperCase()}
                </Text>
                <Text style={[styles.statVal, { color: colors.foreground }]}>
                  {val}
                </Text>
              </View>
            )
          )}
        </View>
      </View>

      {/* Last Battle */}
      {lastBattle ? (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            LAST BATTLE
          </Text>
          <Text
            style={[styles.battleName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {lastBattle.encounterName}
          </Text>
          <Text
            style={[styles.battleEnemy, { color: colors.mutedForeground }]}
          >
            vs. {lastBattle.enemyName}
          </Text>
          <View style={styles.battleRewards}>
            <Text style={[styles.rewardChip, { color: colors.primary }]}>
              ⚡ +{lastBattle.xpEarned} XP
            </Text>
            <Text style={[styles.rewardChip, { color: colors.accent }]}>
              ✦ +{lastBattle.goldEarned}
            </Text>
            {lastBattle.prCount > 0 ? (
              <Text style={[styles.rewardChip, { color: "#fde047" }]}>
                🏆 {lastBattle.prCount} PR
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Battle Records nav card */}
      <TouchableOpacity
        onPress={() => router.push("/records" as never)}
        activeOpacity={0.8}
        style={[
          styles.card,
          styles.recordsCard,
          { backgroundColor: colors.card, borderColor: colors.primary + "30" },
        ]}
      >
        <View style={styles.recordsRow}>
          <View>
            <Text style={[styles.recordsTitle, { color: colors.primary }]}>
              📊  Battle Records
            </Text>
            <Text style={[styles.recordsSub, { color: colors.mutedForeground }]}>
              Stats, PRs &amp; achievements
            </Text>
          </View>
          <Text style={[styles.recordsArrow, { color: colors.primary }]}>›</Text>
        </View>
      </TouchableOpacity>

      {/* Daily Quest */}
      {dailyQuest ? (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            DAILY QUEST
          </Text>
          <Text style={[styles.questTitle, { color: colors.accent }]}>
            {dailyQuest.title}
          </Text>
          <Text
            style={[styles.questDesc, { color: colors.mutedForeground }]}
            numberOfLines={2}
          >
            {dailyQuest.description}
          </Text>
          <View style={styles.questTasks}>
            {dailyQuest.tasks.map((task) => (
              <View key={task.id} style={styles.taskRow}>
                <Text
                  style={{
                    fontSize: 11,
                    color: task.completed ? colors.success : colors.mutedForeground,
                  }}
                >
                  {task.completed ? "✓ " : "○ "}
                  {task.description}
                </Text>
                {task.targetValue && !task.completed ? (
                  <Text
                    style={{
                      fontSize: 10,
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                    }}
                  >
                    {task.currentValue ?? 0}/{task.targetValue}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 14 },
  scroll: { paddingHorizontal: 16, gap: 12 },
  screenLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  rankBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  playerMeta: { flex: 1, gap: 2 },
  playerName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  playerTitle: { fontSize: 11, fontFamily: "Inter_500Medium" },
  levelText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  goldBadge: { alignItems: "flex-end", gap: 2 },
  goldIcon: { fontSize: 12, color: "#ffbf00" },
  goldAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  barSection: { gap: 4 },
  barHeader: { flexDirection: "row", justifyContent: "space-between" },
  barLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  barValue: { fontSize: 10, fontFamily: "Inter_400Regular" },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  statBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statBarLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", width: 24 },
  statBarTrack: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    overflow: "hidden",
  },
  statBarFill: { height: 5, borderRadius: 2.5 },
  statBarValue: { fontSize: 10, fontFamily: "Inter_400Regular", width: 64, textAlign: "right" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  statCell: { width: "30%", alignItems: "center", gap: 2 },
  statKey: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  statVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  battleName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  battleEnemy: { fontSize: 11, fontFamily: "Inter_400Regular" },
  battleRewards: { flexDirection: "row", gap: 12 },
  rewardChip: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  questTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  questDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  questTasks: { gap: 6 },
  taskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recordsCard: { padding: 14 },
  recordsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordsTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  recordsSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  recordsArrow: { fontSize: 28, lineHeight: 30 },
});
