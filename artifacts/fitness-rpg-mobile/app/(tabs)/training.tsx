import {
  useGetWorkoutTemplates,
  useGetWorkoutSessions,
  useCreateWorkoutSession,
  useGetGuildHallToday,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

function formatDuration(minutes?: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const MUSCLE_COLORS: Record<string, string> = {
  chest: "#ef4444", back: "#3b82f6", legs: "#a855f7",
  shoulders: "#f97316", arms: "#22c55e", core: "#eab308", full_body: "#0dcef5",
};

const EVIDENCE_OUTCOMES: Array<{ icon: keyof typeof Feather.glyphMap; title: string; text: string; color: string }> = [
  { icon: "book-open", title: "Combat Replay", text: "Completed sessions become Chronicle battle records.", color: "#49a3a0" },
  { icon: "award", title: "Rewards", text: "XP, gold, PRs, and titles are awarded once.", color: "#d9ad63" },
  { icon: "activity", title: "Style Identity", text: "Training style shapes class paths and archetypes.", color: "#a855f7" },
  { icon: "check-circle", title: "Commission Proof", text: "Relevant work advances today's Guild duty.", color: "#7cc79b" },
];

function IconBox({ name, color = "#d9ad63" }: { name: keyof typeof Feather.glyphMap; color?: string }) {
  return (
    <View style={s.iconBox}>
      <Feather name={name} size={18} color={color} />
    </View>
  );
}

export default function TrainingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: templates, isLoading: loadingTemplates } = useGetWorkoutTemplates();
  const { data: sessions, isLoading: loadingSessions } = useGetWorkoutSessions();
  const { data: hall } = useGetGuildHallToday();
  const createSession = useCreateWorkoutSession();

  const commission = hall?.commission as any;
  const commissionLocation = commission?.location as { name?: string; region?: string; distanceMiles?: number } | null | undefined;
  const commissionTravel = commission?.travel as { onFootMiles?: number; footMiles?: number; caravanMiles?: number; mountMiles?: number; returnStone?: boolean } | null | undefined;
  const commissionTasks = (commission?.tasks ?? commission?.quest?.tasks ?? []) as any[];
  const recentSessions = (sessions ?? []).slice(0, 5);
  const evidenceTotals = recentSessions.reduce(
    (totals, session: any) => ({
      xp: totals.xp + (session.xpEarned ?? 0),
      gold: totals.gold + (session.goldEarned ?? 0),
      sets: totals.sets + (session.sets?.length ?? 0),
      active: totals.active + ((session.status === "active" || session.status === "in_progress") ? 1 : 0),
    }),
    { xp: 0, gold: 0, sets: 0, active: 0 }
  );

  const handleStart = (templateId: number, name: string) => {
    createSession.mutate(
      { data: { templateId, name } },
      {
        onSuccess: (session: any) => router.push(`/session/${session.id}`),
        onError: () => Alert.alert("Error", "Could not start session. Try again."),
      }
    );
  };

  const isLoading = loadingTemplates || loadingSessions;

  return (
    <FlatList
      style={{ backgroundColor: "#0a0908", flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerSub}>TRAINING YARD</Text>
            <Text style={s.headerTitle}>Training Yard</Text>
            <Text style={s.headerDesc}>Turn real effort into combat form.</Text>
          </View>

          <View style={s.prepCard}>
            <IconBox name="shield" />
            <View style={{ flex: 1 }}>
              <Text style={s.prepTitle}>Commission Preparation</Text>
              <Text style={s.prepText}>
                Choose a planned drill, generate an equipment-aware session, or continue the long program. The Hall records the work as battle evidence.
              </Text>
            </View>
          </View>

          {/* Active commission hint */}
          {commission && (
            <View style={s.commissionCard}>
              <View style={s.commissionHeader}>
                <IconBox name="flag" />
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={s.commissionTitle}>Today's Commission</Text>
                    <Text style={s.categoryPill}>{commission.category ?? "training"}</Text>
                  </View>
                  <Text style={s.commissionText}>
                    {commission.rationale ?? "Train to advance this commission. Your session will be recorded as battle evidence."}
                  </Text>
                </View>
              </View>
              <View style={s.infoGrid}>
                <View style={s.infoBox}>
                  <Text style={s.infoLabel}>Location</Text>
                  <Text style={s.infoTitle}>{commissionLocation?.name ?? "Guild training grounds"}</Text>
                  <Text style={s.infoMeta}>
                    {commissionLocation?.region ?? "Near the Hall"}
                    {commissionLocation?.distanceMiles ? ` - ${commissionLocation.distanceMiles} mi from the Hall` : ""}
                  </Text>
                </View>
                <View style={s.infoBox}>
                  <Text style={s.infoLabel}>Travel Ledger</Text>
                  <Text style={s.infoTitle}>
                    {commissionTravel
                      ? `${commissionTravel.onFootMiles ?? commissionTravel.footMiles ?? 0} mi on foot - ${commissionTravel.caravanMiles ?? 0} mi by caravan${commissionTravel.mountMiles ? ` - ${commissionTravel.mountMiles} mi mounted` : ""}`
                      : "Travel details will appear as the commission develops."}
                  </Text>
                  <Text style={s.infoMeta}>{commissionTravel?.returnStone ? "Return stone authorized after report." : "Return route pending Guild approval."}</Text>
                </View>
              </View>
              {commissionTasks.length > 0 && (
                <View style={s.taskStack}>
                  {commissionTasks.map((task) => {
                    const current = task.currentValue ?? task.current ?? 0;
                    const target = task.targetValue ?? task.target ?? 1;
                    return (
                      <View key={task.id ?? task.description} style={s.taskRow}>
                        <Text style={s.taskText}>{task.description}</Text>
                        <Text style={[s.taskCount, task.completed && { color: "#7cc79b" }]}>
                          {current}/{target} {task.unit ?? ""}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <View style={s.actionGrid}>
            <TouchableOpacity style={s.actionCard} activeOpacity={0.8} onPress={() => router.push("/training/program" as any)}>
              <IconBox name="calendar" />
              <View style={{ flex: 1 }}>
                <Text style={s.actionTitle}>8-Week Campaign Program</Text>
                <Text style={s.actionText}>Progressive strength and combat preparation</Text>
              </View>
              <Text style={s.actionState}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionCard} activeOpacity={0.8} onPress={() => router.push("/training/planner" as any)}>
              <IconBox name="zap" color="#49a3a0" />
              <View style={{ flex: 1 }}>
                <Text style={s.actionTitle}>Guild Drill Planner</Text>
                <Text style={s.actionText}>Equipment-aware plan generation for the day</Text>
              </View>
              <Text style={[s.actionState, { color: "#49a3a0" }]}>Open</Text>
            </TouchableOpacity>
          </View>

          {recentSessions.length > 0 && (
            <View style={s.evidenceCard}>
              <Text style={s.sectionLabel}>BATTLE EVIDENCE</Text>
              <Text style={s.evidenceTitle}>Recent training rewards</Text>
              <Text style={s.evidenceText}>Completed sessions become combat replays, rewards, style identity, and commission proof.</Text>
              <View style={s.evidenceGrid}>
                <View style={s.evidenceTile}>
                  <Text style={[s.evidenceValue, { color: "#49a3a0" }]}>+{evidenceTotals.xp}</Text>
                  <Text style={s.evidenceLabel}>XP</Text>
                </View>
                <View style={s.evidenceTile}>
                  <Text style={[s.evidenceValue, { color: "#d9ad63" }]}>+{evidenceTotals.gold}</Text>
                  <Text style={s.evidenceLabel}>Gold</Text>
                </View>
                <View style={s.evidenceTile}>
                  <Text style={[s.evidenceValue, { color: "#d8c4a5" }]}>{evidenceTotals.sets}</Text>
                  <Text style={s.evidenceLabel}>Sets</Text>
                </View>
                <View style={s.evidenceTile}>
                  <Text style={[s.evidenceValue, { color: evidenceTotals.active ? "#d9ad63" : "#8f887d" }]}>{evidenceTotals.active}</Text>
                  <Text style={s.evidenceLabel}>Active</Text>
                </View>
              </View>
            </View>
          )}

          <View style={s.outcomeCard}>
            <Text style={s.sectionLabel}>TRAINING LEDGER</Text>
            <Text style={s.evidenceTitle}>How effort enters the legend</Text>
            <View style={s.outcomeStack}>
              {EVIDENCE_OUTCOMES.map((outcome) => (
                <View key={outcome.title} style={s.outcomeRow}>
                  <View style={[s.outcomeIcon, { borderColor: outcome.color + "66" }]}>
                    <Feather name={outcome.icon} size={14} color={outcome.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.outcomeTitle}>{outcome.title}</Text>
                    <Text style={s.outcomeText}>{outcome.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Templates header */}
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>AVAILABLE DRILLS</Text>
        </>
      }
      data={isLoading ? [] : (templates ?? [])}
      keyExtractor={(item: any) => String(item.id)}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }: { item: any }) => {
        const category = item.category ?? item.muscleGroup;
        const muscleColor = MUSCLE_COLORS[String(category ?? "").toLowerCase?.() ?? ""] ?? "#d9ad63";
        const exerciseCount = item.exercises?.length ?? 0;
        return (
          <View style={[s.templateCard, { backgroundColor: "#171510", borderColor: "#3b3328" }]}>
            <View style={s.drillAccent} />
            <View style={s.templateHeader}>
              <View style={{ flex: 1 }}>
                <View style={s.templateTags}>
                  {category && (
                    <View style={[s.tag, { borderColor: muscleColor + "60" }]}>
                      <Text style={[s.tagText, { color: muscleColor }]}>
                        {String(category).replace(/_/g, " ")}
                      </Text>
                    </View>
                  )}
                  {item.difficulty && (
                    <View style={[s.tag, { borderColor: "#6b5d4f" }]}>
                      <Text style={[s.tagText, { color: "#9d8f80" }]}>{item.difficulty}</Text>
                    </View>
                  )}
                </View>
                <Text style={[s.templateName, { color: colors.foreground }]}>{item.name}</Text>
                {item.description && (
                  <Text style={[s.templateDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                <Text style={[s.templateMeta, { color: "#6b5d4f" }]}>
                  {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
                  {item.estimatedDuration ? ` - ${formatDuration(item.estimatedDuration)}` : ""}
                </Text>
              </View>
              <TouchableOpacity
                style={[s.startBtn, createSession.isPending && { opacity: 0.6 }]}
                onPress={() => handleStart(item.id, item.name)}
                disabled={createSession.isPending}
                activeOpacity={0.8}
              >
                {createSession.isPending ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={s.startBtnText}>Start</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
      ListFooterComponent={
        <>
          {isLoading && (
            <View style={s.centered}>
              <ActivityIndicator color="#d9ad63" />
            </View>
          )}
          {!isLoading && (!templates || templates.length === 0) && (
            <View style={[s.empty, { borderColor: "#3b3328" }]}>
              <Text style={{ fontSize: 24 }}>⚔️</Text>
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No programs yet</Text>
              <Text style={[s.emptyDesc, { color: colors.mutedForeground }]}>
                Training programs will appear here once added by the Guild.
              </Text>
            </View>
          )}

          {/* Recent sessions */}
          {recentSessions.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: colors.mutedForeground, marginTop: 24 }]}>RECENT BATTLES</Text>
              {recentSessions.map((session: any) => {
                const isActive = session.status === "active" || session.status === "in_progress";
                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      s.sessionRow,
                      {
                        backgroundColor: "#171510",
                        borderColor: isActive ? "#d9ad6360" : "#3b3328",
                        marginBottom: 8,
                      },
                    ]}
                    onPress={() => isActive && router.push(`/session/${session.id}`)}
                    activeOpacity={isActive ? 0.7 : 1}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.sessionName, { color: colors.foreground }]} numberOfLines={1}>
                        {session.name}
                      </Text>
                      <Text style={[s.sessionMeta, { color: colors.mutedForeground }]}>
                        {session.startedAt ? formatDate(session.startedAt) : ""}
                        {session.durationMinutes ? ` · ${formatDuration(session.durationMinutes)}` : ""}
                        {session.sets?.length ? ` · ${session.sets.length} sets` : ""}
                      </Text>
                    </View>
                    <View style={[s.sessionRewardBlock, { borderColor: isActive ? "#d9ad6360" : "#3b332880" }]}> 
                      <Text style={[s.sessionRewardXp, isActive && { color: "#d9ad63" }]}> 
                        {isActive ? "ACTIVE" : `+${session.xpEarned ?? 0} XP`}
                      </Text>
                      <Text style={s.sessionRewardGold}>
                        {isActive ? "Continue" : `+${session.goldEarned ?? 0} G`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </>
      }
    />
  );
}

const s = StyleSheet.create({
  header: { marginBottom: 20 },
  headerSub: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#eee5d7", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2 },
  headerDesc: { color: "#9f9586", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Inter_400Regular", marginTop: 2 },
  prepCard: { flexDirection: "row", gap: 12, borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 14, marginBottom: 14 },
  iconBox: { width: 38, height: 38, borderWidth: 1, borderColor: "#8c6a36", backgroundColor: "#15130f", alignItems: "center", justifyContent: "center" },
  prepTitle: { color: "#d9ad63", fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  prepText: { color: "#cfc5b8", fontSize: 13, lineHeight: 20, marginTop: 4, fontFamily: "Inter_400Regular" },
  commissionCard: { borderWidth: 1, borderColor: "#8c6a36", backgroundColor: "#11100e", padding: 14, marginBottom: 14 },
  commissionHeader: { flexDirection: "row", gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  commissionTitle: { color: "#d9ad63", fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  categoryPill: { borderWidth: 1, borderColor: "#3b3328", color: "#8f887d", paddingHorizontal: 7, paddingVertical: 2, fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  commissionText: { color: "#cfc5b8", fontSize: 12, lineHeight: 18, marginTop: 5, fontFamily: "Inter_400Regular" },
  infoGrid: { gap: 8, marginTop: 12 },
  infoBox: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 10 },
  infoLabel: { color: "#d9ad63", fontSize: 10, textTransform: "uppercase", fontFamily: "Inter_700Bold", marginBottom: 4 },
  infoTitle: { color: "#d8c4a5", fontSize: 12, lineHeight: 17, fontFamily: "Inter_700Bold" },
  infoMeta: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 2, fontFamily: "Inter_400Regular" },
  taskStack: { gap: 6, marginTop: 12 },
  taskRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 10 },
  taskText: { flex: 1, color: "#d8c4a5", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  taskCount: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold" },
  actionGrid: { gap: 10, marginBottom: 16 },
  actionCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 14 },
  actionTitle: { color: "#eee5d7", fontSize: 14, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  actionText: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 2, fontFamily: "Inter_400Regular" },
  actionState: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  evidenceCard: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 14, marginBottom: 16 },
  evidenceTitle: { color: "#d9ad63", fontSize: 16, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  evidenceText: { color: "#cfc5b8", fontSize: 12, lineHeight: 18, marginTop: 4, fontFamily: "Inter_400Regular" },
  evidenceGrid: { flexDirection: "row", gap: 8, marginTop: 12 },
  evidenceTile: { flex: 1, borderWidth: 1, borderColor: "#2a2520", backgroundColor: "#0c0b09", paddingVertical: 10, alignItems: "center" },
  evidenceValue: { fontSize: 16, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  evidenceLabel: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", letterSpacing: 1, marginTop: 2, fontFamily: "Inter_400Regular" },
  outcomeCard: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 14, marginBottom: 16 },
  outcomeStack: { gap: 8, marginTop: 10 },
  outcomeRow: { flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#2a2520", backgroundColor: "#0c0b09", padding: 10, alignItems: "flex-start" },
  outcomeIcon: { width: 28, height: 28, borderWidth: 1, backgroundColor: "#15130f", alignItems: "center", justifyContent: "center" },
  outcomeTitle: { color: "#d8c4a5", fontSize: 12, fontFamily: "Inter_700Bold" },
  outcomeText: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 2, fontFamily: "Inter_400Regular" },
  commissionBanner: { borderWidth: 1, backgroundColor: "#15130f", padding: 14, marginBottom: 16 },
  bannerLabel: { fontSize: 9, letterSpacing: 2, color: "#d9ad63", textTransform: "uppercase", marginBottom: 4, fontFamily: "Inter_400Regular" },
  bannerTitle: { fontSize: 14, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold", marginBottom: 4 },
  bannerDesc: { fontSize: 12, lineHeight: 18 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10, fontFamily: "Inter_400Regular" },
  templateCard: { borderWidth: 1, padding: 14, overflow: "hidden" },
  drillAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: "#8e3525" },
  templateHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  templateTags: { flexDirection: "row", gap: 6, marginBottom: 6, flexWrap: "wrap" },
  tag: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  templateName: { fontSize: 15, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  templateDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  templateMeta: { fontSize: 10, marginTop: 6 },
  startBtn: { minWidth: 54, height: 44, borderWidth: 1, borderColor: "#c08c4e", backgroundColor: "#74291f", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  startBtnText: { color: "#f1dfc6", fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  centered: { paddingVertical: 32, alignItems: "center" },
  empty: { borderWidth: 1, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 8, marginTop: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  emptyDesc: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  sessionRow: { borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  sessionName: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sessionMeta: { fontSize: 11, marginTop: 2 },
  sessionRewardBlock: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, alignItems: "flex-end", minWidth: 78 },
  sessionRewardXp: { color: "#49a3a0", fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sessionRewardGold: { color: "#d9ad63", fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold", marginTop: 2 },
  statusBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
});

