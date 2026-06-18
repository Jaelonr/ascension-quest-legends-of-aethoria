import {
  useGetQuests,
  useGetDailyQuest,
  useCompleteQuestTask,
  useClaimQuestReward,
  getGetQuestsQueryKey,
  getGetDailyQuestQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import type { Quest } from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
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

// ── Campaign data (mirrors guild-hall.tsx) ─────────────────────────────────

interface CampaignEntry {
  id: number;
  chapter: number;
  chapterName: string;
  title: string;
  desc: string;
  diff: string;
  xp: number;
  gold: number;
}

const CAMPAIGN: CampaignEntry[] = [
  { id: 1,  chapter: 1, chapterName: "The Awakening",     title: "The Gate Opens",                 desc: "Log your first training session to prove you answered the call.",                                     diff: "E", xp: 120,  gold: 60 },
  { id: 2,  chapter: 1, chapterName: "The Awakening",     title: "Proving Your Worth",              desc: "The guild does not accept passengers. Complete 3 workouts.",                                          diff: "E", xp: 200,  gold: 80 },
  { id: 3,  chapter: 1, chapterName: "The Awakening",     title: "The Registrar's Request",         desc: "Log your nutrition — the guild healer wants to assess your readiness.",                                diff: "E", xp: 160,  gold: 70 },
  { id: 4,  chapter: 1, chapterName: "The Awakening",     title: "Basic Rations",                   desc: "Hit your nutrition targets for 3 days.",                                                              diff: "E", xp: 190,  gold: 75 },
  { id: 5,  chapter: 1, chapterName: "The Awakening",     title: "Your First Record",               desc: "Don't train to maintain. Set your first personal record.",                                            diff: "E", xp: 320,  gold: 110 },
  { id: 6,  chapter: 1, chapterName: "The Awakening",     title: "The Initiate's Trial",            desc: "Complete your first official daily quest from the guild board.",                                       diff: "E", xp: 160,  gold: 65 },
  { id: 7,  chapter: 1, chapterName: "The Awakening",     title: "The Merchant's Favor",            desc: "Every tool has its time. Familiarize yourself with the guild store.",                                  diff: "E", xp: 100,  gold: 200 },
  { id: 8,  chapter: 1, chapterName: "The Awakening",     title: "Foundations of Steel",            desc: "Chapter One complete. The foundations are solid. Now the real climb begins.",                         diff: "E", xp: 500,  gold: 250 },
  { id: 9,  chapter: 2, chapterName: "The Climb",         title: "The Ranking Wall",                desc: "E-Rank is where every hunter begins. D-Rank is where the real ones stay.",                           diff: "D", xp: 550,  gold: 280 },
  { id: 10, chapter: 2, chapterName: "The Climb",         title: "Iron and Will",                   desc: "Strength is not a gift. Build it rep by rep in the quiet hours.",                                     diff: "D", xp: 380,  gold: 160 },
  { id: 11, chapter: 2, chapterName: "The Climb",         title: "The Endless Road",                desc: "Power is useless if you collapse in the middle of a gate. Build endurance.",                          diff: "D", xp: 300,  gold: 130 },
  { id: 12, chapter: 2, chapterName: "The Climb",         title: "Mending Wounds",                  desc: "Recovery is not weakness. It is the preparation between efforts.",                                    diff: "D", xp: 220,  gold: 90 },
  { id: 13, chapter: 2, chapterName: "The Climb",         title: "The Seven-Day Oath",              desc: "Maintain a 7-day workout streak.",                                                                     diff: "D", xp: 560,  gold: 230 },
  { id: 14, chapter: 2, chapterName: "The Climb",         title: "The First Boss",                  desc: "Entry-level boss raids test whether you've been training or just showing up.",                         diff: "D", xp: 650,  gold: 320 },
  { id: 15, chapter: 2, chapterName: "The Climb",         title: "Proof of Progress",               desc: "Records exist to be broken. Break five of them.",                                                     diff: "D", xp: 480,  gold: 200 },
  { id: 16, chapter: 2, chapterName: "The Climb",         title: "A Warrior Emerges",               desc: "You are no longer an initiate. The next chapter will ask more of you.",                               diff: "D", xp: 700,  gold: 300 },
  { id: 17, chapter: 3, chapterName: "The Shadow Gate",   title: "Darkness in the Valley",          desc: "A Shadow Gate has appeared northeast of the valley.",                                                  diff: "C", xp: 520,  gold: 220 },
  { id: 18, chapter: 3, chapterName: "The Shadow Gate",   title: "The Corrupted Forest",            desc: "The forest responds to weakness. You need to be well-rounded to survive.",                            diff: "C", xp: 440,  gold: 180 },
  { id: 19, chapter: 3, chapterName: "The Shadow Gate",   title: "Ancient Ruins Scouted",           desc: "The ruins near the shadow gate may hold clues — or traps. Move fast.",                                diff: "C", xp: 380,  gold: 155 },
  { id: 20, chapter: 3, chapterName: "The Shadow Gate",   title: "A Village Needs Aid",             desc: "You cannot protect others when you are running on empty.",                                             diff: "C", xp: 420,  gold: 165 },
  { id: 21, chapter: 3, chapterName: "The Shadow Gate",   title: "The Siege Begins",                desc: "The shadow creatures are advancing. The guild needs hunters ready for heavy combat.",                  diff: "C", xp: 460,  gold: 190 },
  { id: 22, chapter: 3, chapterName: "The Shadow Gate",   title: "The Shadow General",              desc: "The shadow creatures are led by a General. You must end it.",                                          diff: "C", xp: 780,  gold: 380 },
  { id: 23, chapter: 3, chapterName: "The Shadow Gate",   title: "Valley Reclaimed",                desc: "The Shadow General is gone. Fourteen days to drive them back.",                                        diff: "C", xp: 900,  gold: 380 },
  { id: 24, chapter: 3, chapterName: "The Shadow Gate",   title: "A Hunter Forged in Shadow",       desc: "Chapter Three complete. You survived the Shadow Gate. Most didn't even enter.",                       diff: "C", xp: 900,  gold: 400 },
  { id: 25, chapter: 4, chapterName: "The Higher Calling", title: "Whispers of the Sovereign Gate", desc: "New intelligence: a gate that doesn't want to be closed.",                                             diff: "B", xp: 1000, gold: 450 },
  { id: 26, chapter: 4, chapterName: "The Higher Calling", title: "The Grand Tournament",           desc: "The guild holds its annual tournament. Others are looking to you now.",                               diff: "B", xp: 660,  gold: 280 },
  { id: 27, chapter: 4, chapterName: "The Higher Calling", title: "The Master's Eye",               desc: "Ten records. That means you have pushed past yourself ten times.",                                     diff: "B", xp: 750,  gold: 330 },
  { id: 28, chapter: 4, chapterName: "The Higher Calling", title: "The Forbidden Grounds",          desc: "A training site used by S-Rank hunters. You have been granted temporary access.",                     diff: "B", xp: 700,  gold: 310 },
  { id: 29, chapter: 4, chapterName: "The Higher Calling", title: "The Price of Power",             desc: "The memorial wall shows half the names who destroyed themselves through overtraining.",                diff: "B", xp: 750,  gold: 320 },
  { id: 30, chapter: 4, chapterName: "The Higher Calling", title: "The Guild's Champion",           desc: "The guild sends its best to handle a C-Rank gate that has been growing for weeks.",                   diff: "B", xp: 1100, gold: 550 },
  { id: 31, chapter: 4, chapterName: "The Higher Calling", title: "The Ascension",                  desc: "B-Rank. Few hunters make it this far.",                                                                diff: "B", xp: 1300, gold: 650 },
  { id: 32, chapter: 4, chapterName: "The Higher Calling", title: "A Light in the Darkness",        desc: "Chapter Four complete. You are not the same hunter who walked through those gates.",                  diff: "B", xp: 1100, gold: 550 },
  { id: 33, chapter: 5, chapterName: "The Sovereign",     title: "The Stagnant World",              desc: "The Sovereign seduces with stillness. It makes you feel like enough.",                                 diff: "A", xp: 1100, gold: 500 },
  { id: 34, chapter: 5, chapterName: "The Sovereign",     title: "Those Who Refused to Grow",       desc: "Hunters who fell to the Sovereign didn't die fighting. They simply stopped.",                         diff: "A", xp: 1000, gold: 460 },
  { id: 35, chapter: 5, chapterName: "The Sovereign",     title: "Overcoming the Complacency Curse", desc: "Discipline is the greatest act of defiance against stagnation.",                                     diff: "A", xp: 1200, gold: 560 },
  { id: 36, chapter: 5, chapterName: "The Sovereign",     title: "The Last Regiment",               desc: "Six sessions in one week. Those who cannot are turned back.",                                          diff: "A", xp: 1100, gold: 500 },
  { id: 37, chapter: 5, chapterName: "The Sovereign",     title: "Into the Sovereign's Domain",     desc: "A-Rank promotion. The gate is ahead. The Sovereign awaits.",                                          diff: "A", xp: 1600, gold: 800 },
  { id: 38, chapter: 5, chapterName: "The Sovereign",     title: "The Mirror Trial",                desc: "Inside the gate, you face a perfect reflection of yourself — still, comfortable, unchanged.",          diff: "A", xp: 1300, gold: 650 },
  { id: 39, chapter: 5, chapterName: "The Sovereign",     title: "The Final Gate",                  desc: "The Sovereign waits at the heart of everything that ever told you that you were enough.",              diff: "S", xp: 2200, gold: 1100 },
  { id: 40, chapter: 5, chapterName: "The Sovereign",     title: "The Sovereign Falls",             desc: "'What do you want to become next?' — Grandmaster Aldric",                                             diff: "S", xp: 5000, gold: 2500 },
];

const CHAPTER_COLORS: Record<number, string> = {
  1: "#22c55e",
  2: "#3b82f6",
  3: "#a855f7",
  4: "#f97316",
  5: "#ef4444",
};

const DIFF_COLORS: Record<string, string> = {
  E: "#22c55e",
  D: "#3b82f6",
  C: "#a855f7",
  B: "#f97316",
  A: "#ef4444",
  S: "#eab308",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getCampaignQuestNum(title: string): number | null {
  const m = title.match(/^\[Campaign\] Q(\d+):/);
  return m ? parseInt(m[1]) : null;
}

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
                  {quest.difficulty ?? "E"}
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

function CampaignCard({
  entry,
  dbQuest,
  isLocked,
  isNext,
  colors,
}: {
  entry: CampaignEntry;
  dbQuest?: Quest;
  isLocked: boolean;
  isNext: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();
  const claim = useClaimQuestReward();

  const startQuest = useMutation({
    mutationFn: () =>
      customFetch<unknown>(`/api/guild-master/campaign-quests/${entry.id}/start`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
    },
    onError: () => {
      Alert.alert("Error", "Could not start quest. Try again.");
    },
  });

  const chapterColor = CHAPTER_COLORS[entry.chapter] ?? colors.primary;
  const diffColor = DIFF_COLORS[entry.diff] ?? colors.primary;
  const isClaimed = dbQuest?.status === "claimed";
  const isActive = dbQuest && !isClaimed;
  const allDone = dbQuest?.tasks.every((t) => t.completed) ?? false;
  const canClaim = dbQuest && (dbQuest.status === "completed" || allDone) && !isClaimed;

  const handleClaim = () => {
    if (!dbQuest) return;
    claim.mutate(
      { id: dbQuest.id },
      {
        onSuccess: (data: any) => {
          qc.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
          qc.invalidateQueries({ queryKey: ["/api/player"] });
          Alert.alert(
            "⚔️ Quest Complete!",
            `+${data.xpEarned ?? entry.xp} XP  •  +${data.goldEarned ?? entry.gold} Gold`
          );
        },
      }
    );
  };

  const isFullyLocked = isLocked && !isNext;

  return (
    <View
      style={[
        s.questCard,
        {
          backgroundColor: colors.card,
          borderColor: isClaimed
            ? "#22c55e30"
            : isNext && !dbQuest
            ? "#ffbf0050"
            : colors.border,
          opacity: isFullyLocked ? 0.4 : 1,
        },
      ]}
    >
      <View
        style={[
          s.accentBar,
          { backgroundColor: isClaimed ? "#22c55e" : chapterColor },
        ]}
      />

      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={s.questHeader}
          onPress={() => !isFullyLocked && setExpanded((e) => !e)}
          activeOpacity={isFullyLocked ? 1 : 0.7}
        >
          <View style={{ flex: 1 }}>
            <View style={s.questTitleRow}>
              <Text style={[s.campaignChapter, { color: chapterColor }]}>
                {isLocked ? "🔒 " : isClaimed ? "✅ " : isNext && !dbQuest ? "✨ " : "📜 "}
                {entry.chapterName}
              </Text>
              <View style={[s.diffBadge, { borderColor: diffColor + "60" }]}>
                <Text style={[s.diffText, { color: diffColor }]}>{entry.diff}</Text>
              </View>
            </View>
            <Text
              style={[s.questTitle, { color: colors.foreground, marginTop: 2 }]}
              numberOfLines={2}
            >
              {entry.title}
            </Text>
            {expanded && (
              <Text style={[s.questDesc, { color: colors.mutedForeground }]}>
                {entry.desc}
              </Text>
            )}
          </View>
          <View style={s.rewardBlock}>
            <Text style={s.rewardXp}>+{entry.xp} XP</Text>
            <Text style={[s.rewardGold, { color: colors.mutedForeground }]}>+{entry.gold}g</Text>
          </View>
        </TouchableOpacity>

        {expanded && !isFullyLocked && (
          <View style={[s.taskBlock, { borderTopColor: colors.border }]}>
            {isActive && dbQuest && dbQuest.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                questId={dbQuest.id}
                questStatus={dbQuest.status}
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
                  Quest complete — reward claimed
                </Text>
              </View>
            )}
            {isNext && !dbQuest && (
              <TouchableOpacity
                style={[s.startBtn, startQuest.isPending && { opacity: 0.6 }]}
                onPress={() => startQuest.mutate()}
                disabled={startQuest.isPending}
                activeOpacity={0.8}
              >
                {startQuest.isPending ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={s.startBtnText}>✨ Accept Mission</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
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
  const campaignQuests = (allQuests ?? []).filter((q) => q.type === "main");

  // Map campaign db quests by quest number parsed from title
  const campaignByNum = new Map<number, Quest>();
  for (const q of campaignQuests) {
    const num = getCampaignQuestNum(q.title);
    if (num != null) campaignByNum.set(num, q);
  }

  // Determine the first unlocked campaign entry (no db quest yet)
  const lastClaimedId = (() => {
    let last = 0;
    for (const e of CAMPAIGN) {
      const q = campaignByNum.get(e.id);
      if (q?.status === "claimed") last = e.id;
    }
    return last;
  })();
  const nextCampaignId = lastClaimedId + 1;

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

    // Campaign
    return (
      <View style={s.section}>
        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>CAMPAIGN</Text>
        {CAMPAIGN.map((entry) => {
          const dbQuest = campaignByNum.get(entry.id);
          const isClaimed = dbQuest?.status === "claimed";
          const isLocked = !isClaimed && !dbQuest && entry.id > nextCampaignId;
          const isNext = entry.id === nextCampaignId && !dbQuest;
          // Show up to next+2 unlocked entries to keep the list manageable
          if (isLocked && entry.id > nextCampaignId + 2) return null;
          return (
            <CampaignCard
              key={entry.id}
              entry={entry}
              dbQuest={dbQuest}
              isLocked={isLocked}
              isNext={isNext}
              colors={colors}
            />
          );
        })}
      </View>
    );
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
