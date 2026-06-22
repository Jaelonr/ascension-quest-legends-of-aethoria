import {
  useGetQuests,
  useGetDailyQuest,
  useGetCampaignStory,
  useCompleteQuestTask,
  useClaimQuestReward,
  useStartCampaignMission,
  useAbandonCampaignMission,
  getGetQuestsQueryKey,
  getGetDailyQuestQueryKey,
} from "@workspace/api-client-react";
import type { CampaignStoryChapter, CampaignStoryQuest, Quest } from "@workspace/api-client-react";
import React, { useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { formatGuildGrade } from "@/utils/ranks";

const DIFF_COLORS: Record<string, string> = {
  E: "#22c55e",
  D: "#3b82f6",
  C: "#a855f7",
  B: "#f97316",
  A: "#ef4444",
  S: "#eab308",
};

type TabKey = "daily" | "weekly" | "campaign";

// ── Task row ──────────────────────────────────────────────────────────────

function TaskRow({
  task,
  questId,
  questStatus,
  colors,
}: {
  task: Quest["tasks"][number];
  questId: number;
  questStatus: string;
  colors: ReturnType<typeof useColors>;
}) {
  const qc = useQueryClient();
  const completeTask = useCompleteQuestTask();
  const canToggle = !task.completed && questStatus !== "claimed" && !completeTask.isPending;

  const handlePress = () => {
    if (!canToggle) return;
    completeTask.mutate(
      { id: questId, data: { taskId: task.id } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDailyQuestQueryKey() });
        },
      }
    );
  };

  const progress =
    task.targetValue && task.targetValue > 0
      ? Math.min(1, (task.currentValue ?? 0) / task.targetValue)
      : task.completed ? 1 : 0;

  return (
    <TouchableOpacity
      style={[s.taskRow, task.completed && { opacity: 0.55 }]}
      onPress={handlePress}
      disabled={!canToggle}
      activeOpacity={0.7}
    >
      <View
        style={[
          s.taskCheck,
          task.completed
            ? { backgroundColor: "#22c55e", borderColor: "#22c55e" }
            : { borderColor: colors.border },
        ]}
      >
        {task.completed && <Text style={s.checkMark}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            s.taskDesc,
            { color: task.completed ? colors.mutedForeground : colors.foreground },
            task.completed && { textDecorationLine: "line-through" },
          ]}
        >
          {task.description}
        </Text>
        {task.targetValue != null && task.targetValue > 0 && (
          <View style={s.progressRow}>
            <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  s.progressFill,
                  { width: `${progress * 100}%`, backgroundColor: "#ffbf00" },
                ]}
              />
            </View>
            <Text style={[s.progressLabel, { color: colors.mutedForeground }]}>
              {task.currentValue ?? 0}/{task.targetValue}
              {task.unit ? ` ${task.unit}` : ""}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Quest card ────────────────────────────────────────────────────────────

function QuestCard({ quest, colors }: { quest: Quest; colors: ReturnType<typeof useColors> }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();
  const claim = useClaimQuestReward();

  const allDone = quest.tasks.every((t) => t.completed);
  const canClaim = (quest.status === "completed" || allDone) && quest.status !== "claimed";
  const isClaimed = quest.status === "claimed";
  const diffColor = DIFF_COLORS[quest.difficulty ?? "E"] ?? colors.primary;

  const handleClaim = () => {
    claim.mutate(
      { id: quest.id },
      {
        onSuccess: (data: any) => {
          qc.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDailyQuestQueryKey() });
          qc.invalidateQueries({ queryKey: ["/api/player"] });
          qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
          Alert.alert(
            "⚔️ Reward Claimed!",
            `+${data.xpEarned ?? quest.xpReward} XP  •  +${data.goldEarned ?? quest.goldReward} Gold`
          );
        },
      }
    );
  };

  return (
    <View
      style={[
        s.questCard,
        {
          backgroundColor: colors.card,
          borderColor: isClaimed
            ? "#22c55e30"
            : canClaim
            ? "#ffbf0050"
            : colors.border,
          opacity: isClaimed ? 0.65 : 1,
        },
      ]}
    >
      {/* Left accent bar */}
      <View
        style={[
          s.accentBar,
          { backgroundColor: isClaimed ? "#22c55e" : diffColor },
        ]}
      />

      <View style={{ flex: 1 }}>
        {/* Header */}
        <TouchableOpacity
          style={s.questHeader}
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <View style={s.questTitleRow}>
              <Text style={[s.questTitle, { color: colors.foreground }]} numberOfLines={2}>
                {quest.title}
              </Text>
              <View style={[s.diffBadge, { borderColor: diffColor + "60" }]}>
                <Text style={[s.diffText, { color: diffColor }]}>
                  {formatGuildGrade(quest.difficulty)}
                </Text>
              </View>
              {isClaimed && (
                <View style={[s.claimedBadge, { borderColor: "#22c55e60" }]}>
                  <Text style={s.claimedText}>✓</Text>
                </View>
              )}
            </View>
            {expanded && (
              <Text style={[s.questDesc, { color: colors.mutedForeground }]}>
                {quest.description}
              </Text>
            )}
          </View>
          <View style={s.rewardBlock}>
            <Text style={s.rewardXp}>+{quest.xpReward} XP</Text>
            <Text style={[s.rewardGold, { color: colors.mutedForeground }]}>
              +{quest.goldReward}g
            </Text>
          </View>
        </TouchableOpacity>

        {/* Tasks */}
        {expanded && (
          <View style={[s.taskBlock, { borderTopColor: colors.border }]}>
            {quest.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                questId={quest.id}
                questStatus={quest.status}
                colors={colors}
              />
            ))}
            {canClaim && (
              <TouchableOpacity
                style={[s.claimBtn, claim.isPending && { opacity: 0.6 }]}
                onPress={handleClaim}
                disabled={claim.isPending}
                activeOpacity={0.8}
              >
                {claim.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.claimBtnText}>🏆 Claim Reward</Text>
                )}
              </TouchableOpacity>
            )}
            {isClaimed && (
              <View style={s.claimedRow}>
                <Text style={[s.claimedRowText, { color: colors.mutedForeground }]}>
                  Reward claimed
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Campaign quest card ───────────────────────────────────────────────────

function campaignStatusLabel(status: CampaignStoryQuest["status"]): string {
  if (status === "claimed") return "Completed";
  if (status === "completed") return "Reward Ready";
  if (status === "active") return "Available";
  return "Unrevealed";
}

function campaignStatusColor(status: CampaignStoryQuest["status"], colors: ReturnType<typeof useColors>): string {
  if (status === "claimed") return "#22c55e";
  if (status === "completed") return "#ffbf00";
  if (status === "active") return colors.primary;
  return colors.mutedForeground;
}

function StoryQuestCard({
  quest,
  colors,
  onRefresh,
}: {
  quest: CampaignStoryQuest;
  colors: ReturnType<typeof useColors>;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(quest.status === "active" || quest.status === "completed");
  const startMission = useStartCampaignMission();
  const abandonMission = useAbandonCampaignMission();

  const isLocked = quest.status === "locked";
  const isMissionActive = Boolean(quest.missionStartedAt);
  const hasDbQuest = quest.dbId !== null && quest.dbId !== undefined;
  const canStartMission = quest.status === "active" && hasDbQuest && !isMissionActive;
  const statusColor = campaignStatusColor(quest.status, colors);
  const diffColor = quest.difficulty ? DIFF_COLORS[quest.difficulty] ?? colors.primary : colors.primary;

  const handleStartMission = () => {
    const dbId = quest.dbId;
    if (!dbId) return;
    startMission.mutate(
      { data: { dbId } },
      {
        onSuccess: () => {
          Alert.alert("Mission Accepted", `Head to Training to complete "${quest.title}". The Guild will record the result.`);
          onRefresh();
        },
        onError: () => Alert.alert("Mission Failed", "The Guild could not open that mission yet. Try again."),
      }
    );
  };

  const handleAbandon = () => {
    const dbId = quest.dbId;
    if (!dbId) return;
    Alert.alert(
      "Abandon Mission?",
      "Aldric will note the failed sortie in the Guild record, but you can attempt it again.",
      [
        { text: "Keep Fighting", style: "cancel" },
        {
          text: "Abandon",
          style: "destructive",
          onPress: () => {
            abandonMission.mutate(
              { data: { dbId } },
              {
                onSuccess: (result) => {
                  Alert.alert(result.questTitle ?? "Guild Record", result.narrative ?? "The mission was abandoned and remains available.");
                  onRefresh();
                },
                onError: () => Alert.alert("Could Not Abandon", "The Guild record did not update. Try again."),
              }
            );
          },
        },
      ]
    );
  };

  return (
    <View
      style={[
        s.storyQuestCard,
        { borderColor: isLocked ? colors.border : statusColor + "66", backgroundColor: colors.card, opacity: isLocked ? 0.55 : 1 },
      ]}
    >
      <TouchableOpacity
        style={s.storyQuestHeader}
        onPress={() => setExpanded((value) => !value)}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1 }}>
          <View style={s.questTitleRow}>
            <Text style={[s.storyStatus, { color: statusColor }]}>{campaignStatusLabel(quest.status)}</Text>
            {quest.difficulty && (
              <View style={[s.diffBadge, { borderColor: diffColor + "60" }]}>
                <Text style={[s.diffText, { color: diffColor }]}>{formatGuildGrade(quest.difficulty)}</Text>
              </View>
            )}
            {isMissionActive && <Text style={s.activeMissionPill}>ACTIVE</Text>}
          </View>
          <Text style={[s.questTitle, { color: colors.foreground }]} numberOfLines={2}>{quest.title}</Text>
          <Text style={[s.questDesc, { color: colors.mutedForeground }]} numberOfLines={expanded ? undefined : 2}>
            {isLocked ? "The Chronicle has not revealed this commission yet." : quest.description}
          </Text>
        </View>
        <View style={s.rewardBlock}>
          <Text style={s.rewardXp}>+{quest.xpReward} XP</Text>
          <Text style={[s.rewardGold, { color: colors.mutedForeground }]}>+{quest.goldReward}g</Text>
        </View>
      </TouchableOpacity>

      {expanded && !isLocked && (
        <View style={[s.taskBlock, { borderTopColor: colors.border }]}>
          {quest.lore && (
            <View style={s.loreBlock}>
              <Text style={s.loreLabel}>Guild Lore</Text>
              <Text style={[s.loreText, { color: colors.foreground }]}>{quest.lore}</Text>
            </View>
          )}
          {quest.fitnessMapping && (
            <Text style={[s.questDesc, { color: colors.mutedForeground }]}>
              <Text style={{ color: colors.foreground }}>Objective: </Text>{quest.fitnessMapping}
            </Text>
          )}
          {quest.abandonedNarrative && (
            <View style={s.warningBlock}>
              <Text style={s.warningLabel}>Previous Attempt</Text>
              <Text style={[s.loreText, { color: colors.foreground }]}>{quest.abandonedNarrative}</Text>
            </View>
          )}
          {isMissionActive ? (
            <View style={s.activeMissionBlock}>
              <Text style={s.activeMissionTitle}>Mission Active</Text>
              <Text style={[s.questDesc, { color: colors.mutedForeground }]}>Complete a workout in Training. Rewards are handled automatically when the evidence is recorded.</Text>
              <TouchableOpacity
                style={[s.abandonBtn, abandonMission.isPending && { opacity: 0.6 }]}
                onPress={handleAbandon}
                disabled={abandonMission.isPending}
              >
                <Text style={s.abandonBtnText}>Abandon mission</Text>
              </TouchableOpacity>
            </View>
          ) : canStartMission ? (
            <TouchableOpacity
              style={[s.startBtn, startMission.isPending && { opacity: 0.6 }]}
              onPress={handleStartMission}
              disabled={startMission.isPending}
              activeOpacity={0.8}
            >
              {startMission.isPending ? <ActivityIndicator size="small" color="#000" /> : <Text style={s.startBtnText}>{quest.abandonedNarrative ? "Retry Mission" : "Start Mission"}</Text>}
            </TouchableOpacity>
          ) : quest.status === "claimed" ? (
            <View style={s.claimedRow}>
              <Text style={[s.claimedRowText, { color: colors.mutedForeground }]}>Mission complete and recorded.</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function ChapterStorySection({
  chapter,
  colors,
  onRefresh,
}: {
  chapter: CampaignStoryChapter;
  colors: ReturnType<typeof useColors>;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(chapter.status === "active");
  const isLocked = chapter.status === "locked";
  const completedCount = chapter.quests.filter((quest) => quest.status === "claimed").length;
  const revealedCount = chapter.quests.filter((quest) => quest.status !== "locked").length;
  const chapterColor = chapter.status === "completed" ? "#22c55e" : chapter.status === "active" ? colors.primary : colors.mutedForeground;

  return (
    <View style={[s.chapterCard, { borderColor: isLocked ? colors.border : chapterColor + "55", backgroundColor: colors.card }]}> 
      <TouchableOpacity style={s.chapterHeader} onPress={() => setOpen((value) => !value)} activeOpacity={0.75}>
        <View style={[s.chapterSigil, { borderColor: chapterColor + "66" }]}>
          <Text style={[s.chapterSigilText, { color: chapterColor }]}>{isLocked ? "?" : chapter.chapter}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.questTitle, { color: isLocked ? colors.mutedForeground : colors.foreground }]}>
            {isLocked ? `Chapter ${chapter.chapter} - ???` : `Ch. ${chapter.chapter}: ${chapter.chapterName}`}
          </Text>
          {!isLocked && <Text style={[s.questDesc, { color: colors.mutedForeground }]}>{completedCount}/{revealedCount} missions recorded</Text>}
        </View>
        <Text style={[s.storyStatus, { color: chapterColor }]}>{chapter.status}</Text>
      </TouchableOpacity>

      {open && (
        <View style={[s.chapterBody, { borderTopColor: colors.border }]}> 
          {chapter.quests.map((quest) => (
            <StoryQuestCard key={`${chapter.chapter}-${quest.campaignId}`} quest={quest} colors={colors} onRefresh={onRefresh} />
          ))}
        </View>
      )}
    </View>
  );
}

function CampaignStoryView({ colors }: { colors: ReturnType<typeof useColors> }) {
  const qc = useQueryClient();
  const { data: story, isLoading } = useGetCampaignStory({ query: { queryKey: ["/api/campaign/story"] } });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/campaign/story"] });
    qc.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
  };

  if (isLoading) {
    return (
      <View style={s.loadingBlock}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!story) {
    return (
      <View style={s.emptyBlock}>
        <Text style={[s.emptyText, { color: colors.mutedForeground }]}>The campaign ledger is not available yet.</Text>
      </View>
    );
  }

  return (
    <View style={s.section}>
      <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>CAMPAIGN STORY</Text>
      <View style={[s.campaignSummary, { borderColor: colors.border, backgroundColor: colors.card }]}> 
        <Text style={[s.screenLabel, { color: colors.primary }]}>AETHORIA CAMPAIGN</Text>
        <Text style={[s.screenTitle, { color: colors.foreground }]}>Chapter {story.currentChapter}</Text>
        <Text style={[s.questDesc, { color: colors.mutedForeground }]}>Current duty: {story.currentQuestTitle}</Text>
        {story.activeMission && (
          <View style={s.activeMissionBlock}>
            <Text style={s.activeMissionTitle}>Active Mission</Text>
            <Text style={[s.questDesc, { color: colors.mutedForeground }]}>{story.activeMission.title}</Text>
          </View>
        )}
      </View>
      {story.chapters.map((chapter) => (
        <ChapterStorySection key={chapter.chapter} chapter={chapter} colors={colors} onRefresh={refresh} />
      ))}
    </View>
  );
}
// ── Main screen ───────────────────────────────────────────────────────────

export default function QuestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("daily");

  const { data: allQuests, isLoading: loadingAll } = useGetQuests();
  const { data: dailyData, isLoading: loadingDaily } = useGetDailyQuest();

  const dailyQuest: Quest | null = dailyData ?? null;
  const weeklyQuests = (allQuests ?? []).filter((q) => q.type === "weekly");
  const isLoading = loadingAll || loadingDaily;

  const TABS: Array<{ key: TabKey; label: string }> = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "campaign", label: "Campaign" },
  ];

  const renderContent = () => {
    if (activeTab === "daily") {
      if (!dailyQuest) {
        return (
          <View style={s.emptyBlock}>
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
              No daily quest available yet.
            </Text>
          </View>
        );
      }
      return (
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>TODAY'S QUEST</Text>
          <QuestCard quest={dailyQuest} colors={colors} />
        </View>
      );
    }

    if (activeTab === "weekly") {
      return (
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>WEEKLY QUESTS</Text>
          {weeklyQuests.length === 0 ? (
            <View style={s.emptyBlock}>
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
                No weekly quests available.
              </Text>
            </View>
          ) : (
            weeklyQuests.map((q) => <QuestCard key={q.id} quest={q} colors={colors} />)
          )}
        </View>
      );
    }

    return <CampaignStoryView colors={colors} />;
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Text style={[s.screenLabel, { color: colors.mutedForeground }]}>QUEST BOARD</Text>
        <Text style={[s.screenTitle, { color: colors.foreground }]}>Guild Missions</Text>
      </View>

      {/* Tab bar */}
      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              s.tabBtn,
              activeTab === tab.key && [
                s.tabBtnActive,
                { borderBottomColor: colors.primary },
              ],
            ]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                s.tabLabel,
                {
                  color:
                    activeTab === tab.key ? colors.primary : colors.mutedForeground,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s.loadingBlock}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  screenLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {},
  tabLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  loadingBlock: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, gap: 10 },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 2,
  },
  emptyBlock: {
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  // Quest card
  questCard: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    overflow: "hidden",
  },
  accentBar: {
    width: 3,
    alignSelf: "stretch",
  },
  questHeader: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    flex: 1,
  },
  questTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 2,
  },
  questTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  questDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    marginTop: 4,
  },
  diffBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  diffText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  claimedBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderColor: "#22c55e60",
  },
  claimedText: { fontSize: 9, color: "#22c55e", fontFamily: "Inter_700Bold" },
  rewardBlock: { alignItems: "flex-end", paddingTop: 1 },
  rewardXp: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#ffbf00",
  },
  rewardGold: { fontSize: 10, fontFamily: "Inter_400Regular" },

  // Task row
  taskBlock: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, paddingTop: 8, gap: 4 },
  taskRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 },
  taskCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkMark: { fontSize: 10, color: "#fff", fontFamily: "Inter_700Bold" },
  taskDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2 },
  progressLabel: { fontSize: 9, fontFamily: "Inter_500Medium" },

  // Claim / claimed
  claimBtn: {
    backgroundColor: "#ffbf00",
    borderRadius: 8,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  claimBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#000" },
  claimedRow: {
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#22c55e20",
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: "#22c55e08",
  },
  claimedRowText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  // Campaign
  storyQuestCard: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  storyQuestHeader: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },
  storyStatus: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  activeMissionPill: {
    borderWidth: 1,
    borderColor: "#22d3ee66",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    color: "#22d3ee",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  loreBlock: {
    borderLeftWidth: 2,
    borderLeftColor: "#ffbf0080",
    backgroundColor: "#ffbf0008",
    padding: 10,
  },
  loreLabel: {
    color: "#ffbf00",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  loreText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  warningBlock: {
    borderWidth: 1,
    borderColor: "#f9731640",
    backgroundColor: "#f9731608",
    padding: 10,
  },
  warningLabel: {
    color: "#fb923c",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  activeMissionBlock: {
    borderWidth: 1,
    borderColor: "#22d3ee40",
    backgroundColor: "#22d3ee10",
    padding: 10,
    gap: 4,
  },
  activeMissionTitle: {
    color: "#22d3ee",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  abandonBtn: {
    borderWidth: 1,
    borderColor: "#ef444466",
    borderRadius: 8,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  abandonBtnText: {
    color: "#f87171",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  chapterCard: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  chapterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  chapterSigil: {
    width: 30,
    height: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterSigilText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  chapterBody: {
    borderTopWidth: 1,
    padding: 10,
    gap: 8,
  },
  campaignSummary: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  campaignChapter: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  startBtn: {
    backgroundColor: "#ffbf00",
    borderRadius: 8,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  startBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
});

