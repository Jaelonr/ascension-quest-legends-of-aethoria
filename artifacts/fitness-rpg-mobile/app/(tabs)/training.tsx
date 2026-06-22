import {
  useGetWorkoutTemplates,
  useGetWorkoutSessions,
  useCreateWorkoutSession,
  useGetGuildHallToday,
} from "@workspace/api-client-react";
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

export default function TrainingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: templates, isLoading: loadingTemplates } = useGetWorkoutTemplates();
  const { data: sessions, isLoading: loadingSessions } = useGetWorkoutSessions();
  const { data: hall } = useGetGuildHallToday();
  const createSession = useCreateWorkoutSession();

  const commission = hall?.commission as any;
  const recentSessions = (sessions ?? []).slice(0, 5);

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
            <Text style={s.headerTitle}>Choose Your Battle</Text>
          </View>

          {/* Active commission hint */}
          {commission && (
            <View style={[s.commissionBanner, { borderColor: "#8c6a36" }]}>
              <Text style={s.bannerLabel}>ACTIVE COMMISSION</Text>
              <Text style={[s.bannerTitle, { color: colors.foreground }]}>
                {commission.title ?? commission.quest?.title}
              </Text>
              <Text style={[s.bannerDesc, { color: colors.mutedForeground }]}>
                Train to advance this commission. Your session will be recorded as battle evidence.
              </Text>
            </View>
          )}

          {/* Templates header */}
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>TRAINING PROGRAMS</Text>
        </>
      }
      data={isLoading ? [] : (templates ?? [])}
      keyExtractor={(item: any) => String(item.id)}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }: { item: any }) => {
        const muscleColor = MUSCLE_COLORS[item.muscleGroup?.toLowerCase?.() ?? ""] ?? "#d9ad63";
        const exerciseCount = item.exercises?.length ?? 0;
        return (
          <View style={[s.templateCard, { backgroundColor: "#171510", borderColor: "#3b3328" }]}>
            <View style={s.templateHeader}>
              <View style={{ flex: 1 }}>
                <View style={s.templateTags}>
                  {item.muscleGroup && (
                    <View style={[s.tag, { borderColor: muscleColor + "60" }]}>
                      <Text style={[s.tagText, { color: muscleColor }]}>
                        {item.muscleGroup.replace(/_/g, " ")}
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
                  {item.estimatedDuration ? ` · ~${formatDuration(item.estimatedDuration)}` : ""}
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
                  <Text style={s.startBtnText}>▶</Text>
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
                    <View style={[s.statusBadge, { borderColor: isActive ? "#d9ad6360" : "#3b332880" }]}>
                      <Text style={{ color: isActive ? "#d9ad63" : "#6b5d4f", fontSize: 10, fontWeight: "700" }}>
                        {isActive ? "ACTIVE →" : "DONE"}
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
  commissionBanner: { borderWidth: 1, backgroundColor: "#15130f", padding: 14, marginBottom: 16 },
  bannerLabel: { fontSize: 9, letterSpacing: 2, color: "#d9ad63", textTransform: "uppercase", marginBottom: 4, fontFamily: "Inter_400Regular" },
  bannerTitle: { fontSize: 14, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold", marginBottom: 4 },
  bannerDesc: { fontSize: 12, lineHeight: 18 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10, fontFamily: "Inter_400Regular" },
  templateCard: { borderWidth: 1, padding: 14 },
  templateHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  templateTags: { flexDirection: "row", gap: 6, marginBottom: 6, flexWrap: "wrap" },
  tag: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  templateName: { fontSize: 15, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  templateDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  templateMeta: { fontSize: 10, marginTop: 6 },
  startBtn: { width: 44, height: 44, backgroundColor: "#d9ad63", alignItems: "center", justifyContent: "center" },
  startBtnText: { color: "#000", fontSize: 18, fontWeight: "700" },
  centered: { paddingVertical: 32, alignItems: "center" },
  empty: { borderWidth: 1, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 8, marginTop: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  emptyDesc: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  sessionRow: { borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  sessionName: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sessionMeta: { fontSize: 11, marginTop: 2 },
  statusBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
});

