import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  customFetch,
  useGetQuests,
  useGetDailyQuest,
  useCompleteQuestTask,
  useClaimQuestReward,
  useGetBossRaids,
  useGetAvailableBossRaids,
  useStartBossRaid,
  useUpdateBossRaidTask,
  useClaimBossRaidReward,
  useGetBattleLog,
  useGetPlayerStyleIdentity,
  useGetAnalyticsOverview,
  getGetQuestsQueryKey,
  getGetDailyQuestQueryKey,
} from "@workspace/api-client-react";
import type {
  Quest,
  BossRaid,
  RaidTemplate,
  RaidClaimResult,
  RpgGear,
} from "@workspace/api-client-react";
import { useAuth } from "@clerk/expo";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

// ── Constants ──────────────────────────────────────────────────────────────────

const INTENSITY_KEY = "narrative_intensity";
type NarrativeMode = "minimal" | "balanced" | "dramatic";

const CHAPTER_COLORS: Record<number, string> = {
  1: "#22c55e", 2: "#3b82f6", 3: "#a855f7", 4: "#f97316", 5: "#ef4444",
};
const DIFF_COLORS: Record<string, string> = {
  E: "#22c55e", D: "#3b82f6", C: "#a855f7", B: "#f97316", A: "#ef4444", S: "#eab308",
};
const DIFF_COLOR_RAIDS: Record<string, string> = {
  E: "#9ca3af", D: "#22c55e", C: "#3b82f6", B: "#a855f7", A: "#f97316", S: "#ef4444",
};
const RARITY_COLOR: Record<string, string> = {
  common: "#9ca3af", uncommon: "#22c55e", rare: "#3b82f6", epic: "#a855f7",
  legendary: "#f97316", mythic: "#ef4444",
};
const STYLE_META: Record<string, { label: string; color: string }> = {
  strength:     { label: "Strength",     color: "#ef4444" },
  striking:     { label: "Striking",     color: "#f97316" },
  conditioning: { label: "Conditioning", color: "#0dcef5" },
  grappling:    { label: "Grappling",    color: "#a855f7" },
  recovery:     { label: "Recovery",     color: "#22c55e" },
  discipline:   { label: "Discipline",   color: "#eab308" },
};
const STYLE_ORDER = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;
const VERDICT_COLORS: Record<string, string> = {
  "Victory": "#ffbf00", "Narrow Victory": "#0dcef5",
  "Strategic Retreat": "#f97316", "Training Complete": "#22c55e",
};

// 40-quest campaign
interface CampaignEntry {
  id: number; chapter: number; chapterName: string;
  title: string; desc: string; diff: string; xp: number; gold: number;
}
const CAMPAIGN: CampaignEntry[] = [
  { id: 1,  chapter: 1, chapterName: "The Awakening",      title: "The Gate Opens",                   desc: "Log your first training session to prove you answered the call.",                                 diff: "E", xp: 120,  gold: 60 },
  { id: 2,  chapter: 1, chapterName: "The Awakening",      title: "Proving Your Worth",                desc: "The guild does not accept passengers. Complete 3 workouts.",                                       diff: "E", xp: 200,  gold: 80 },
  { id: 3,  chapter: 1, chapterName: "The Awakening",      title: "The Registrar's Request",           desc: "Log your nutrition — the guild healer wants to assess your readiness.",                            diff: "E", xp: 160,  gold: 70 },
  { id: 4,  chapter: 1, chapterName: "The Awakening",      title: "Basic Rations",                     desc: "Hit your nutrition targets for 3 days.",                                                           diff: "E", xp: 190,  gold: 75 },
  { id: 5,  chapter: 1, chapterName: "The Awakening",      title: "Your First Record",                 desc: "Don't train to maintain. Set your first personal record.",                                          diff: "E", xp: 320,  gold: 110 },
  { id: 6,  chapter: 1, chapterName: "The Awakening",      title: "The Initiate's Trial",              desc: "Complete your first official daily quest from the guild board.",                                    diff: "E", xp: 160,  gold: 65 },
  { id: 7,  chapter: 1, chapterName: "The Awakening",      title: "The Merchant's Favor",              desc: "Every tool has its time. Familiarize yourself with the guild store.",                               diff: "E", xp: 100,  gold: 200 },
  { id: 8,  chapter: 1, chapterName: "The Awakening",      title: "Foundations of Steel",              desc: "Chapter One complete. The foundations are solid. Now the real climb begins.",                      diff: "E", xp: 500,  gold: 250 },
  { id: 9,  chapter: 2, chapterName: "The Climb",          title: "The Ranking Wall",                  desc: "E-Rank is where every hunter begins. D-Rank is where the real ones stay.",                        diff: "D", xp: 550,  gold: 280 },
  { id: 10, chapter: 2, chapterName: "The Climb",          title: "Iron and Will",                     desc: "Strength is not a gift. Build it rep by rep in the quiet hours.",                                  diff: "D", xp: 380,  gold: 160 },
  { id: 11, chapter: 2, chapterName: "The Climb",          title: "The Endless Road",                  desc: "Power is useless if you collapse in the middle of a gate. Build endurance.",                       diff: "D", xp: 300,  gold: 130 },
  { id: 12, chapter: 2, chapterName: "The Climb",          title: "Mending Wounds",                    desc: "Recovery is not weakness. It is the preparation between efforts.",                                 diff: "D", xp: 220,  gold: 90 },
  { id: 13, chapter: 2, chapterName: "The Climb",          title: "The Seven-Day Oath",                desc: "Maintain a 7-day workout streak.",                                                                  diff: "D", xp: 560,  gold: 230 },
  { id: 14, chapter: 2, chapterName: "The Climb",          title: "The First Boss",                    desc: "Entry-level boss raids test whether you've been training or just showing up.",                      diff: "D", xp: 650,  gold: 320 },
  { id: 15, chapter: 2, chapterName: "The Climb",          title: "Proof of Progress",                 desc: "Records exist to be broken. Break five of them.",                                                   diff: "D", xp: 480,  gold: 200 },
  { id: 16, chapter: 2, chapterName: "The Climb",          title: "A Warrior Emerges",                 desc: "You are no longer an initiate. The next chapter will ask more of you.",                            diff: "D", xp: 700,  gold: 300 },
  { id: 17, chapter: 3, chapterName: "The Shadow Gate",    title: "Darkness in the Valley",            desc: "A Shadow Gate has appeared northeast of the valley.",                                               diff: "C", xp: 520,  gold: 220 },
  { id: 18, chapter: 3, chapterName: "The Shadow Gate",    title: "The Corrupted Forest",              desc: "The forest responds to weakness. You need to be well-rounded to survive.",                         diff: "C", xp: 440,  gold: 180 },
  { id: 19, chapter: 3, chapterName: "The Shadow Gate",    title: "Ancient Ruins Scouted",             desc: "The ruins near the shadow gate may hold clues — or traps. Move fast.",                             diff: "C", xp: 380,  gold: 155 },
  { id: 20, chapter: 3, chapterName: "The Shadow Gate",    title: "A Village Needs Aid",               desc: "You cannot protect others when you are running on empty.",                                          diff: "C", xp: 420,  gold: 165 },
  { id: 21, chapter: 3, chapterName: "The Shadow Gate",    title: "The Siege Begins",                  desc: "The shadow creatures are advancing. The guild needs hunters ready for heavy combat.",               diff: "C", xp: 460,  gold: 190 },
  { id: 22, chapter: 3, chapterName: "The Shadow Gate",    title: "The Shadow General",                desc: "The shadow creatures are led by a General. You must end it.",                                       diff: "C", xp: 780,  gold: 380 },
  { id: 23, chapter: 3, chapterName: "The Shadow Gate",    title: "Valley Reclaimed",                  desc: "The Shadow General is gone. Fourteen days to drive them back.",                                    diff: "C", xp: 900,  gold: 380 },
  { id: 24, chapter: 3, chapterName: "The Shadow Gate",    title: "A Hunter Forged in Shadow",         desc: "Chapter Three complete. You survived the Shadow Gate. Most didn't even enter.",                    diff: "C", xp: 900,  gold: 400 },
  { id: 25, chapter: 4, chapterName: "The Higher Calling", title: "Whispers of the Sovereign Gate",   desc: "New intelligence: a gate that doesn't want to be closed.",                                          diff: "B", xp: 1000, gold: 450 },
  { id: 26, chapter: 4, chapterName: "The Higher Calling", title: "The Grand Tournament",              desc: "The guild holds its annual tournament. Others are looking to you now.",                            diff: "B", xp: 660,  gold: 280 },
  { id: 27, chapter: 4, chapterName: "The Higher Calling", title: "The Master's Eye",                  desc: "Ten records. That means you have pushed past yourself ten times.",                                  diff: "B", xp: 750,  gold: 330 },
  { id: 28, chapter: 4, chapterName: "The Higher Calling", title: "The Forbidden Grounds",             desc: "A training site used by S-Rank hunters. You have been granted temporary access.",                  diff: "B", xp: 700,  gold: 310 },
  { id: 29, chapter: 4, chapterName: "The Higher Calling", title: "The Price of Power",                desc: "The memorial wall shows half the names who destroyed themselves through overtraining.",             diff: "B", xp: 750,  gold: 320 },
  { id: 30, chapter: 4, chapterName: "The Higher Calling", title: "The Guild's Champion",              desc: "The guild sends its best to handle a C-Rank gate that has been growing for weeks.",                diff: "B", xp: 1100, gold: 550 },
  { id: 31, chapter: 4, chapterName: "The Higher Calling", title: "The Ascension",                     desc: "B-Rank. Few hunters make it this far.",                                                             diff: "B", xp: 1300, gold: 650 },
  { id: 32, chapter: 4, chapterName: "The Higher Calling", title: "A Light in the Darkness",           desc: "Chapter Four complete. You are not the same hunter who walked through those gates.",               diff: "B", xp: 1100, gold: 550 },
  { id: 33, chapter: 5, chapterName: "The Sovereign",      title: "The Stagnant World",                desc: "The Sovereign seduces with stillness. It makes you feel like enough.",                              diff: "A", xp: 1100, gold: 500 },
  { id: 34, chapter: 5, chapterName: "The Sovereign",      title: "Those Who Refused to Grow",         desc: "Hunters who fell to the Sovereign didn't die fighting. They simply stopped.",                      diff: "A", xp: 1000, gold: 460 },
  { id: 35, chapter: 5, chapterName: "The Sovereign",      title: "Overcoming the Complacency Curse",  desc: "Discipline is the greatest act of defiance against stagnation.",                                    diff: "A", xp: 1200, gold: 560 },
  { id: 36, chapter: 5, chapterName: "The Sovereign",      title: "The Last Regiment",                 desc: "Six sessions in one week. Those who cannot are turned back.",                                       diff: "A", xp: 1100, gold: 500 },
  { id: 37, chapter: 5, chapterName: "The Sovereign",      title: "Into the Sovereign's Domain",       desc: "A-Rank promotion. The gate is ahead. The Sovereign awaits.",                                       diff: "A", xp: 1600, gold: 800 },
  { id: 38, chapter: 5, chapterName: "The Sovereign",      title: "The Mirror Trial",                  desc: "Inside the gate, you face a perfect reflection of yourself — still, comfortable, unchanged.",      diff: "A", xp: 1300, gold: 650 },
  { id: 39, chapter: 5, chapterName: "The Sovereign",      title: "The Final Gate",                    desc: "The Sovereign waits at the heart of everything that ever told you that you were enough.",           diff: "S", xp: 2200, gold: 1100 },
  { id: 40, chapter: 5, chapterName: "The Sovereign",      title: "The Sovereign Falls",               desc: "'What do you want to become next?' — Grandmaster Aldric",                                          diff: "S", xp: 5000, gold: 2500 },
];

const CHAPTERS = [
  { num: 1, name: "The Awakening",      color: "#22c55e" },
  { num: 2, name: "The Climb",          color: "#3b82f6" },
  { num: 3, name: "The Shadow Gate",    color: "#a855f7" },
  { num: 4, name: "The Higher Calling", color: "#f97316" },
  { num: 5, name: "The Sovereign",      color: "#ef4444" },
];

type Section = "master" | "quests" | "campaign" | "raids" | "log" | "records";
const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: "master",   label: "Master",   icon: "⚔️" },
  { key: "quests",   label: "Quests",   icon: "📋" },
  { key: "campaign", label: "Campaign", icon: "🗺️" },
  { key: "raids",    label: "Raids",    icon: "🛡️" },
  { key: "log",      label: "Battle Log", icon: "📜" },
  { key: "records",  label: "Records",  icon: "📊" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTimeRemaining(hours: number | null | undefined): string {
  if (hours == null || hours <= 0) return "EXPIRED";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const d = Math.floor(hours / 24), h = Math.round(hours % 24);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Quest Task Row ─────────────────────────────────────────────────────────────

function TaskRow({ task, questId, questStatus, colors }: {
  task: Quest["tasks"][number]; questId: number; questStatus: string;
  colors: ReturnType<typeof useColors>;
}) {
  const qc = useQueryClient();
  const completeTask = useCompleteQuestTask();
  const canToggle = !task.completed && questStatus !== "claimed" && !completeTask.isPending;
  const progress = task.targetValue && task.targetValue > 0
    ? Math.min(1, (task.currentValue ?? 0) / task.targetValue) : task.completed ? 1 : 0;

  return (
    <TouchableOpacity
      style={[s.taskRow, task.completed && { opacity: 0.55 }]}
      onPress={() => {
        if (!canToggle) return;
        completeTask.mutate({ id: questId, data: { taskId: task.id } }, {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
            qc.invalidateQueries({ queryKey: getGetDailyQuestQueryKey() });
          },
        });
      }}
      disabled={!canToggle} activeOpacity={0.7}
    >
      <View style={[s.taskCheck, task.completed
        ? { backgroundColor: "#22c55e", borderColor: "#22c55e" }
        : { borderColor: colors.border }]}>
        {task.completed && <Text style={s.checkMark}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.taskDesc, { color: task.completed ? colors.mutedForeground : colors.foreground },
          task.completed && { textDecorationLine: "line-through" }]}>{task.description}</Text>
        {task.targetValue != null && task.targetValue > 0 && (
          <View style={s.progressRow}>
            <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
              <View style={[s.progressFill, { width: `${progress * 100}%` as any, backgroundColor: "#ffbf00" }]} />
            </View>
            <Text style={[s.progressLabel, { color: colors.mutedForeground }]}>
              {task.currentValue ?? 0}/{task.targetValue}{task.unit ? ` ${task.unit}` : ""}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Quest Card ─────────────────────────────────────────────────────────────────

function QuestCard({ quest, colors }: { quest: Quest; colors: ReturnType<typeof useColors> }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();
  const claim = useClaimQuestReward();
  const allDone = quest.tasks.every((t) => t.completed);
  const canClaim = (quest.status === "completed" || allDone) && quest.status !== "claimed";
  const isClaimed = quest.status === "claimed";
  const diffColor = DIFF_COLORS[quest.difficulty ?? "E"] ?? "#22c55e";

  return (
    <View style={[s.questCard, { backgroundColor: colors.card,
      borderColor: isClaimed ? "#22c55e30" : canClaim ? "#ffbf0050" : colors.border,
      opacity: isClaimed ? 0.65 : 1 }]}>
      <View style={[s.accentBar, { backgroundColor: isClaimed ? "#22c55e" : diffColor }]} />
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={s.questHeader} onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
          <View style={{ flex: 1 }}>
            <View style={s.questTitleRow}>
              <Text style={[s.questTitle, { color: colors.foreground }]} numberOfLines={2}>{quest.title}</Text>
              <View style={[s.diffBadge, { borderColor: diffColor + "60" }]}>
                <Text style={[s.diffText, { color: diffColor }]}>{quest.difficulty ?? "E"}</Text>
              </View>
            </View>
            <Text style={[s.questDesc, { color: colors.mutedForeground }]} numberOfLines={expanded ? undefined : 1}>
              {quest.description}
            </Text>
          </View>
          <Text style={[s.chevron, { color: colors.mutedForeground }]}>{expanded ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={s.questExpanded}>
            {quest.tasks.map((t) => (
              <TaskRow key={t.id} task={t} questId={quest.id} questStatus={quest.status} colors={colors} />
            ))}
            <View style={s.rewardRow}>
              <Text style={[s.rewardText, { color: "#ffbf00" }]}>+{quest.xpReward} XP</Text>
              <Text style={[s.rewardText, { color: "#ffbf00" }]}>+{quest.goldReward} Gold</Text>
            </View>
            {canClaim && (
              <TouchableOpacity
                style={[s.claimBtn, { borderColor: "#ffbf00", backgroundColor: "#ffbf0015" }]}
                onPress={() => claim.mutate({ id: quest.id }, {
                  onSuccess: (data: any) => {
                    qc.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
                    qc.invalidateQueries({ queryKey: getGetDailyQuestQueryKey() });
                    qc.invalidateQueries({ queryKey: ["/api/player"] });
                    Alert.alert("⚔️ Reward Claimed!", `+${data.xpEarned ?? quest.xpReward} XP  •  +${data.goldEarned ?? quest.goldReward} Gold`);
                  },
                })}
                disabled={claim.isPending} activeOpacity={0.7}
              >
                <Text style={[s.claimBtnText, { color: "#ffbf00" }]}>
                  {claim.isPending ? "Claiming…" : "Claim Reward ▶"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Campaign Quest Card ────────────────────────────────────────────────────────

function CampaignCard({
  entry, status, isNext, isLocked, onStart, starting, colors,
}: {
  entry: CampaignEntry; status?: string; isNext: boolean; isLocked: boolean;
  onStart: (id: number) => void; starting: number | null;
  colors: ReturnType<typeof useColors>;
}) {
  const chColor = CHAPTER_COLORS[entry.chapter] ?? colors.primary;
  const diffColor = DIFF_COLORS[entry.diff] ?? colors.primary;
  const isComplete = status === "completed";
  const isActive = status === "active";

  return (
    <View style={[s.campaignCard, {
      backgroundColor: colors.card,
      borderColor: isActive ? colors.primary : isComplete ? "#22c55e30" : isNext ? chColor + "40" : colors.border,
      opacity: isLocked ? 0.4 : 1,
    }]}>
      <View style={{ flex: 1 }}>
        <View style={s.campaignHeader}>
          <View style={[s.diffBadge, { borderColor: diffColor + "60" }]}>
            <Text style={[s.diffText, { color: diffColor }]}>{entry.diff}</Text>
          </View>
          <Text style={[s.campaignTitle, { color: isLocked ? colors.mutedForeground : colors.foreground }]}
            numberOfLines={2}>{entry.title}</Text>
          {isComplete && <Text style={{ color: "#22c55e", fontSize: 14 }}>✓</Text>}
          {isActive && <Text style={{ color: colors.primary, fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 }}>ACTIVE</Text>}
          {isLocked && <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>🔒</Text>}
        </View>
        <Text style={[s.campaignDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {entry.desc}
        </Text>
        <View style={s.campaignFooter}>
          <Text style={[s.rewardSmall, { color: "#ffbf00" }]}>+{entry.xp} XP</Text>
          <Text style={[s.rewardSmall, { color: "#ffbf00" }]}>+{entry.gold} Gold</Text>
        </View>
      </View>
      {isNext && !isLocked && !isComplete && !isActive && (
        <TouchableOpacity
          style={[s.startBtn, { borderColor: chColor, backgroundColor: chColor + "20" }]}
          onPress={() => onStart(entry.id)}
          disabled={starting === entry.id} activeOpacity={0.7}
        >
          {starting === entry.id
            ? <ActivityIndicator size="small" color={chColor} />
            : <Text style={[s.startBtnText, { color: chColor }]}>▶</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Raid Claim Modal ───────────────────────────────────────────────────────────

function RaidClaimModal({ result, raidTitle, onClose, colors }: {
  result: RaidClaimResult; raidTitle: string; onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const gear = result.gearDrop as RpgGear | null | undefined;
  const gearColor = gear ? (RARITY_COLOR[gear.rarity] ?? "#9ca3af") : "#9ca3af";
  const statBonuses = gear?.statBonuses as Record<string, number> | undefined;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { backgroundColor: colors.card, borderColor: "#ffbf0040" }]}>
          <Text style={[s.modalTitle, { color: "#ffbf00" }]}>⚔️ Raid Complete!</Text>
          <Text style={[s.modalSub, { color: colors.mutedForeground }]}>{raidTitle}</Text>
          <View style={s.modalRewards}>
            <View style={[s.rewardChip, { borderColor: "#ffbf0050", backgroundColor: "#ffbf0015" }]}>
              <Text style={{ color: "#ffbf00", fontSize: 12, fontFamily: "Inter_700Bold" }}>+{result.xpEarned} XP</Text>
            </View>
            <View style={[s.rewardChip, { borderColor: "#ffbf0050", backgroundColor: "#ffbf0015" }]}>
              <Text style={{ color: "#ffbf00", fontSize: 12, fontFamily: "Inter_700Bold" }}>+{result.goldEarned} Gold</Text>
            </View>
          </View>
          {gear && (
            <View style={[s.gearDrop, { borderColor: gearColor + "50", backgroundColor: gearColor + "10" }]}>
              <Text style={{ color: gearColor, fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 }}>
                GEAR DROP · {(gear.rarity ?? "common").toUpperCase()}
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 4 }}>{gear.name}</Text>
              {statBonuses && Object.entries(statBonuses).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => (
                <Text key={k} style={{ color: gearColor, fontSize: 11, fontFamily: "Inter_500Medium" }}>+{v} {k}</Text>
              ))}
            </View>
          )}
          <TouchableOpacity style={[s.claimBtn, { borderColor: "#ffbf00", backgroundColor: "#ffbf0015", marginTop: 12 }]}
            onPress={onClose} activeOpacity={0.7}>
            <Text style={[s.claimBtnText, { color: "#ffbf00" }]}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Style Bar ──────────────────────────────────────────────────────────────────

function StyleBar({ style, pct, colors }: { style: string; pct: number; colors: ReturnType<typeof useColors> }) {
  const meta = STYLE_META[style];
  if (!meta) return null;
  return (
    <View style={s.styleBarRow}>
      <Text style={[s.styleBarLabel, { color: meta.color }]}>{meta.label.slice(0, 4).toUpperCase()}</Text>
      <View style={[s.styleBarTrack, { backgroundColor: colors.secondary ?? colors.border }]}>
        <View style={[s.styleBarFill, { width: `${pct}%` as any, backgroundColor: meta.color }]} />
      </View>
      <Text style={[s.styleBarPct, { color: colors.mutedForeground }]}>{pct}%</Text>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GuildHallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { getToken } = useAuth();

  // Section state
  const [section, setSection] = useState<Section>("master");

  // Narrative mode
  const [narrativeMode, setNarrativeMode] = useState<NarrativeMode>("balanced");
  useEffect(() => {
    AsyncStorage.getItem(INTENSITY_KEY).then((v) => {
      if (v === "minimal" || v === "balanced" || v === "dramatic") setNarrativeMode(v);
    });
  }, []);

  // ── Guild Master state ─────────────────────────────────────────────────
  const [convId, setConvId] = useState<number | null>(null);
  const [gmMessages, setGmMessages] = useState<{ id?: number; role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loadingGM, setLoadingGM] = useState(false);
  const [sendingGM, setSendingGM] = useState(false);
  const [monthlyReport, setMonthlyReport] = useState<{ text: string; month: number; year: number } | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const chatListRef = useRef<FlatList>(null);

  const loadConversation = useCallback(async () => {
    setLoadingGM(true);
    try {
      const r = await customFetch("/api/guild-master/conversation") as Response;
      if (r.ok) {
        const data = await r.json() as { conversationId: number; messages: { id: number; role: string; content: string }[] };
        setConvId(data.conversationId);
        setGmMessages(data.messages);
      }
    } catch {
      // silent
    } finally {
      setLoadingGM(false);
    }
  }, []);

  useEffect(() => {
    if (section === "master" && convId === null) {
      loadConversation();
    }
  }, [section, convId, loadConversation]);

  const sendGMMessage = async () => {
    const content = chatInput.trim();
    if (!content || sendingGM || convId === null) return;
    setChatInput("");
    setSendingGM(true);

    const tempId = Date.now();
    setGmMessages((prev) => [...prev, { id: tempId, role: "user", content }]);

    try {
      const r = await customFetch("/api/guild-master/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, conversationId: convId, narrativeMode }),
      }) as Response;

      const text = await r.text();
      let assembled = "";
      for (const line of text.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6)) as { content?: string; done?: boolean };
            if (parsed.content) assembled += parsed.content;
          } catch { /* skip bad lines */ }
        }
      }

      if (assembled) {
        setGmMessages((prev) => [...prev, { role: "assistant", content: assembled }]);
      }
    } catch {
      Alert.alert("Error", "Could not reach Grandmaster Aldric. Try again.");
    } finally {
      setSendingGM(false);
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const requestMonthlyReport = async () => {
    setLoadingReport(true);
    try {
      const now = new Date();
      const r = await customFetch(`/api/guild-master/monthly-report?month=${now.getMonth() + 1}&year=${now.getFullYear()}`) as Response;
      if (r.ok) {
        const data = await r.json() as { text: string; month: number; year: number };
        setMonthlyReport(data);
      } else {
        Alert.alert("Not yet", "The Grandmaster has not yet written this month's assessment.");
      }
    } catch {
      Alert.alert("Error", "Could not load monthly assessment.");
    } finally {
      setLoadingReport(false);
    }
  };

  // ── Quests / Campaign ──────────────────────────────────────────────────
  const { data: quests, isLoading: questsLoading } = useGetQuests();
  const dailyQuests  = (quests ?? []).filter((q) => q.type === "daily");
  const weeklyQuests = (quests ?? []).filter((q) => q.type === "weekly");

  const [campaignDbData, setCampaignDbData] = useState<Record<number, { status: string }>>({});
  const [startingCampaign, setStartingCampaign] = useState<number | null>(null);

  const loadCampaignStatus = useCallback(async () => {
    try {
      const r = await customFetch("/api/guild-master/campaign-quests") as Response;
      if (r.ok) {
        const data = await r.json() as Array<{ campaignId: number; status: string }>;
        const map: Record<number, { status: string }> = {};
        for (const item of data) map[item.campaignId] = { status: item.status };
        setCampaignDbData(map);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (section === "campaign") loadCampaignStatus();
  }, [section, loadCampaignStatus]);

  const nextCampaignId = (() => {
    const completed = Object.entries(campaignDbData)
      .filter(([, v]) => v.status === "completed")
      .map(([k]) => parseInt(k));
    if (completed.length === 0) return 1;
    return Math.max(...completed) + 1;
  })();

  const handleStartCampaignQuest = async (id: number) => {
    setStartingCampaign(id);
    try {
      const r = await customFetch(`/api/guild-master/campaign-quests/${id}/start`, { method: "POST" }) as Response;
      if (r.ok) {
        await loadCampaignStatus();
        Alert.alert("Quest Started", CAMPAIGN.find((c) => c.id === id)?.title ?? "Quest started.");
      } else {
        const d = await r.json() as { error?: string };
        Alert.alert("Cannot start", d.error ?? "Requirements not met.");
      }
    } catch {
      Alert.alert("Error", "Could not start campaign quest.");
    } finally {
      setStartingCampaign(null);
    }
  };

  // ── Raids ──────────────────────────────────────────────────────────────
  const [raidTab, setRaidTab] = useState<"active" | "available" | "history">("active");
  const { data: activeRaids, isLoading: raidsLoading } = useGetBossRaids();
  const { data: availableRaids } = useGetAvailableBossRaids();
  const startRaid = useStartBossRaid();
  const updateTask = useUpdateBossRaidTask();
  const claimRaid  = useClaimBossRaidReward();
  const [claimResult, setClaimResult] = useState<{ result: RaidClaimResult; title: string } | null>(null);

  const active   = (activeRaids as any)?.active   ?? [];
  const history  = (activeRaids as any)?.history  ?? (activeRaids as any)?.completed ?? [];
  const available = (availableRaids ?? []) as RaidTemplate[];

  // ── Battle Log ─────────────────────────────────────────────────────────
  const [logFilter, setLogFilter] = useState<string | null>(null);
  const { data: battleLog, isLoading: logLoading } = useGetBattleLog({}, { query: { queryKey: ["/api/battle-log"] } });
  const { data: styleIdentity } = useGetPlayerStyleIdentity();
  const logEntries = (Array.isArray(battleLog) ? battleLog : (battleLog as any)?.battles ?? []) as any[];
  const filtered = logFilter ? logEntries.filter((b: any) => b.dominantStyle === logFilter) : logEntries;
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  // ── Records ────────────────────────────────────────────────────────────
  const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsOverview();

  // ── Render helpers ─────────────────────────────────────────────────────

  const renderSectionNav = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.sectionNav} style={s.sectionNavWrap}>
      {SECTIONS.map((sec) => (
        <TouchableOpacity key={sec.key} onPress={() => setSection(sec.key)}
          style={[s.sectionPill, { borderColor: section === sec.key ? colors.primary : colors.border,
            backgroundColor: section === sec.key ? colors.primary + "20" : "transparent" }]}
          activeOpacity={0.7}>
          <Text style={s.sectionIcon}>{sec.icon}</Text>
          <Text style={[s.sectionLabel, { color: section === sec.key ? colors.primary : colors.mutedForeground }]}>
            {sec.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ── MASTER section ─────────────────────────────────────────────────────

  const renderMaster = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.bottom + 100}>
      <ScrollView contentContainerStyle={s.sectionContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[s.aldricHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.aldricAvatar, { borderColor: "#ffbf00" }]}>
            <Text style={s.aldricAvatarIcon}>⚔️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.aldricName, { color: "#ffbf00" }]}>Grandmaster Aldric</Text>
            <Text style={[s.aldricTitle, { color: colors.mutedForeground }]}>
              Former S-Rank Hunter · Guild Commander
            </Text>
            <Text style={[s.aldricDesc, { color: colors.mutedForeground }]}>
              Grizzled. Direct. Honest without cruelty. He has seen a thousand hunters quit and a hundred become legends. He knows the difference.
            </Text>
          </View>
        </View>

        {/* Monthly Assessment */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>MONTHLY ASSESSMENT</Text>
          {monthlyReport ? (
            <>
              <Text style={[s.reportText, { color: colors.foreground }]}>{monthlyReport.text}</Text>
            </>
          ) : (
            <TouchableOpacity style={[s.claimBtn, { borderColor: "#ffbf00", backgroundColor: "#ffbf0015" }]}
              onPress={requestMonthlyReport} disabled={loadingReport} activeOpacity={0.7}>
              {loadingReport
                ? <ActivityIndicator size="small" color="#ffbf00" />
                : <Text style={[s.claimBtnText, { color: "#ffbf00" }]}>Request Monthly Assessment</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Chat messages */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>CONVERSATION</Text>
          {loadingGM ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : gmMessages.length === 0 ? (
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
              Ask Aldric about your training, nutrition, recovery, or next objectives.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {gmMessages.map((msg, i) => (
                <View key={msg.id ?? i} style={[s.msgBubble,
                  msg.role === "user"
                    ? { alignSelf: "flex-end", backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }
                    : { alignSelf: "flex-start", backgroundColor: "#ffbf0010", borderColor: "#ffbf0025" }
                ]}>
                  {msg.role === "assistant" && (
                    <Text style={[s.msgRole, { color: "#ffbf00" }]}>Aldric</Text>
                  )}
                  <Text style={[s.msgContent, { color: colors.foreground }]}>{msg.content}</Text>
                </View>
              ))}
              {sendingGM && (
                <View style={[s.msgBubble, { alignSelf: "flex-start", backgroundColor: "#ffbf0010", borderColor: "#ffbf0025" }]}>
                  <Text style={[s.msgRole, { color: "#ffbf00" }]}>Aldric</Text>
                  <ActivityIndicator size="small" color="#ffbf00" />
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Chat input */}
      {convId !== null && (
        <View style={[s.chatInputRow, { backgroundColor: colors.card, borderTopColor: colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
          <TextInput
            style={[s.chatInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Ask Aldric…"
            placeholderTextColor={colors.mutedForeground + "80"}
            multiline maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendGMMessage}
          />
          <TouchableOpacity style={[s.sendBtn, {
            backgroundColor: chatInput.trim() ? colors.primary : colors.border,
            opacity: sendingGM || !chatInput.trim() ? 0.5 : 1,
          }]} onPress={sendGMMessage} disabled={sendingGM || !chatInput.trim()} activeOpacity={0.7}>
            <Text style={s.sendBtnText}>▶</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );

  // ── QUESTS section ─────────────────────────────────────────────────────

  const renderQuests = () => (
    <ScrollView contentContainerStyle={s.sectionContent} showsVerticalScrollIndicator={false}>
      <Text style={[s.subHeading, { color: colors.mutedForeground }]}>DAILY QUESTS</Text>
      {questsLoading ? <ActivityIndicator color={colors.primary} /> :
        dailyQuests.length === 0
          ? <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No daily quests available.</Text>
          : dailyQuests.map((q) => <QuestCard key={q.id} quest={q} colors={colors} />)}

      <Text style={[s.subHeading, { color: colors.mutedForeground, marginTop: 20 }]}>WEEKLY QUESTS</Text>
      {questsLoading ? <ActivityIndicator color={colors.primary} /> :
        weeklyQuests.length === 0
          ? <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No weekly quests available.</Text>
          : weeklyQuests.map((q) => <QuestCard key={q.id} quest={q} colors={colors} />)}
    </ScrollView>
  );

  // ── CAMPAIGN section ───────────────────────────────────────────────────

  const renderCampaign = () => (
    <ScrollView contentContainerStyle={s.sectionContent} showsVerticalScrollIndicator={false}>
      <Text style={[s.subHeading, { color: colors.mutedForeground }]}>THE GRAND CAMPAIGN</Text>
      <Text style={[s.campaignHint, { color: colors.mutedForeground }]}>
        40 quests across 5 chapters. Complete them in order to unlock the story and advance your rank.
      </Text>
      {CHAPTERS.map((ch) => (
        <View key={ch.num} style={{ marginBottom: 16 }}>
          <View style={[s.chapterHeader, { borderColor: ch.color + "40", backgroundColor: ch.color + "12" }]}>
            <Text style={[s.chapterNum, { color: ch.color }]}>Ch.{ch.num}</Text>
            <Text style={[s.chapterName, { color: ch.color }]}>{ch.name}</Text>
          </View>
          {CAMPAIGN.filter((q) => q.chapter === ch.num).map((entry) => {
            const dbEntry = campaignDbData[entry.id];
            const isLocked = entry.id > nextCampaignId;
            const isNext = entry.id === nextCampaignId;
            return (
              <CampaignCard key={entry.id} entry={entry} status={dbEntry?.status}
                isNext={isNext} isLocked={isLocked}
                onStart={handleStartCampaignQuest} starting={startingCampaign} colors={colors} />
            );
          })}
        </View>
      ))}
    </ScrollView>
  );

  // ── RAIDS section ──────────────────────────────────────────────────────

  const renderRaids = () => (
    <View style={{ flex: 1 }}>
      {/* Sub-tab bar */}
      <View style={[s.subTabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["active", "available", "history"] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setRaidTab(t)}
            style={[s.subTabBtn, raidTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            activeOpacity={0.7}>
            <Text style={[s.subTabText, { color: raidTab === t ? colors.primary : colors.mutedForeground }]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.sectionContent} showsVerticalScrollIndicator={false}>
        {raidsLoading ? <ActivityIndicator color={colors.primary} /> : (
          <>
            {raidTab === "active" && (
              active.length === 0
                ? <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No active raids. Start one from Available.</Text>
                : active.map((raid: BossRaid) => (
                  <View key={raid.id} style={[s.raidCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[s.raidLeft, { borderColor: (DIFF_COLOR_RAIDS[raid.difficulty ?? "E"] ?? "#9ca3af") + "60" }]}>
                      <Text style={[s.raidDiff, { color: DIFF_COLOR_RAIDS[raid.difficulty ?? "E"] ?? "#9ca3af" }]}>
                        {raid.difficulty ?? "E"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.raidTitle, { color: colors.foreground }]}>{raid.title}</Text>
                      <Text style={[s.raidMeta, { color: colors.mutedForeground }]}>
                        {formatTimeRemaining(raid.timeRemainingHours)} remaining
                      </Text>
                      {raid.tasks?.map((t: any) => (
                        <TouchableOpacity key={t.id}
                          style={[s.taskRow, t.completed && { opacity: 0.55 }]}
                          onPress={() => {
                            if (t.completed) return;
                            updateTask.mutate({ id: raid.id, data: { taskId: String(t.id), completed: true } }, {
                              onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/boss-raids"] }),
                            });
                          }}
                          activeOpacity={0.7} disabled={t.completed}>
                          <View style={[s.taskCheck, t.completed
                            ? { backgroundColor: "#22c55e", borderColor: "#22c55e" }
                            : { borderColor: colors.border }]}>
                            {t.completed && <Text style={s.checkMark}>✓</Text>}
                          </View>
                          <Text style={[s.taskDesc, { color: t.completed ? colors.mutedForeground : colors.foreground,
                            textDecorationLine: t.completed ? "line-through" : "none" }]}>{t.description}</Text>
                        </TouchableOpacity>
                      ))}
                      {raid.tasks?.every((t: any) => t.completed) && raid.status !== "claimed" && (
                        <TouchableOpacity style={[s.claimBtn, { borderColor: "#ffbf00", backgroundColor: "#ffbf0015" }]}
                          onPress={() => claimRaid.mutate({ id: raid.id }, {
                            onSuccess: (r: any) => {
                              qc.invalidateQueries({ queryKey: ["/api/boss-raids"] });
                              setClaimResult({ result: r, title: raid.title });
                            },
                          })} activeOpacity={0.7}>
                          <Text style={[s.claimBtnText, { color: "#ffbf00" }]}>Claim Raid Reward ▶</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
            )}

            {raidTab === "available" && (
              available.length === 0
                ? <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No raids available at your current rank.</Text>
                : available.map((tmpl: RaidTemplate) => (
                  <View key={(tmpl as any).templateId ?? (tmpl as any).id}
                    style={[s.raidCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[s.raidLeft, { borderColor: (DIFF_COLOR_RAIDS[(tmpl as any).difficulty ?? "E"] ?? "#9ca3af") + "60" }]}>
                      <Text style={[s.raidDiff, { color: DIFF_COLOR_RAIDS[(tmpl as any).difficulty ?? "E"] ?? "#9ca3af" }]}>
                        {(tmpl as any).difficulty ?? "E"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.raidTitle, { color: colors.foreground }]}>{(tmpl as any).title}</Text>
                      <Text style={[s.raidMeta, { color: colors.mutedForeground }]}>{(tmpl as any).description}</Text>
                    </View>
                    <TouchableOpacity style={[s.startBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "20" }]}
                      onPress={() => startRaid.mutate({ data: { templateTitle: (tmpl as any).title ?? String((tmpl as any).id) } }, {
                        onSuccess: () => {
                          qc.invalidateQueries({ queryKey: ["/api/boss-raids"] });
                          setRaidTab("active");
                          Alert.alert("⚔️ Raid Started!", (tmpl as any).title);
                        },
                        onError: (e: any) => Alert.alert("Cannot start", e?.message ?? "Requirements not met."),
                      })}
                      disabled={startRaid.isPending} activeOpacity={0.7}>
                      {startRaid.isPending
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Text style={[s.startBtnText, { color: colors.primary }]}>▶</Text>}
                    </TouchableOpacity>
                  </View>
                ))
            )}

            {raidTab === "history" && (
              history.length === 0
                ? <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No completed raids yet.</Text>
                : history.map((raid: any) => (
                  <View key={raid.id} style={[s.raidCard, { backgroundColor: colors.card, borderColor: "#22c55e20", opacity: 0.7 }]}>
                    <View style={[s.raidLeft, { borderColor: "#22c55e40" }]}>
                      <Text style={{ color: "#22c55e", fontSize: 12, fontFamily: "Inter_700Bold" }}>✓</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.raidTitle, { color: colors.foreground }]}>{raid.title}</Text>
                      <Text style={[s.raidMeta, { color: colors.mutedForeground }]}>
                        {raid.completedAt ? formatDate(raid.completedAt) : "Completed"}
                        {raid.xpEarned ? `  ·  +${raid.xpEarned} XP` : ""}
                      </Text>
                    </View>
                  </View>
                ))
            )}
          </>
        )}
      </ScrollView>

      {claimResult && (
        <RaidClaimModal result={claimResult.result} raidTitle={claimResult.title}
          onClose={() => setClaimResult(null)} colors={colors} />
      )}
    </View>
  );

  // ── BATTLE LOG section ─────────────────────────────────────────────────

  const styleDistribution = (styleIdentity as any)?.styleDistribution ?? {};
  const totalStyleSessions = (styleIdentity as any)?.totalSessions ?? 0;

  const renderLog = () => (
    <ScrollView contentContainerStyle={s.sectionContent} showsVerticalScrollIndicator={false}>
      {/* Style Identity */}
      {totalStyleSessions > 0 && (
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 12 }]}>
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>COMBAT STYLE IDENTITY</Text>
          <Text style={[s.dominantStyle, { color: colors.primary }]}>
            {(styleIdentity as any)?.dominantStyle?.toUpperCase() ?? "—"}
          </Text>
          <Text style={[s.archetype, { color: colors.mutedForeground }]}>{(styleIdentity as any)?.archetype ?? ""}</Text>
          {STYLE_ORDER.map((st) => {
            const pct = Math.round(((styleDistribution[st] ?? 0) / (totalStyleSessions || 1)) * 100);
            return <StyleBar key={st} style={st} pct={pct} colors={colors} />;
          })}
        </View>
      )}

      {/* Style filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: "row", gap: 8, paddingBottom: 10 }}>
        <TouchableOpacity onPress={() => setLogFilter(null)}
          style={[s.filterChip, { borderColor: !logFilter ? colors.primary : colors.border,
            backgroundColor: !logFilter ? colors.primary + "20" : "transparent" }]} activeOpacity={0.7}>
          <Text style={[s.filterChipText, { color: !logFilter ? colors.primary : colors.mutedForeground }]}>All</Text>
        </TouchableOpacity>
        {STYLE_ORDER.map((st) => {
          const meta = STYLE_META[st]!;
          return (
            <TouchableOpacity key={st} onPress={() => setLogFilter(logFilter === st ? null : st)}
              style={[s.filterChip, { borderColor: logFilter === st ? meta.color : colors.border,
                backgroundColor: logFilter === st ? meta.color + "20" : "transparent" }]} activeOpacity={0.7}>
              <Text style={[s.filterChipText, { color: logFilter === st ? meta.color : colors.mutedForeground }]}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Battle entries */}
      {logLoading ? <ActivityIndicator color={colors.primary} /> :
        filtered.length === 0
          ? <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No battles recorded yet.</Text>
          : filtered.map((battle: any) => {
            const expanded = expandedLog === battle.id;
            const verdictColor = VERDICT_COLORS[battle.verdict ?? "Training Complete"] ?? "#22c55e";
            return (
              <TouchableOpacity key={battle.id} activeOpacity={0.8}
                onPress={() => setExpandedLog(expanded ? null : battle.id)}
                style={[s.battleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={s.battleHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.battleName, { color: colors.foreground }]} numberOfLines={1}>
                      {battle.sessionName ?? battle.name ?? "Battle"}
                    </Text>
                    <Text style={[s.battleMeta, { color: colors.mutedForeground }]}>
                      {battle.date ? formatDate(battle.date) : ""}
                      {battle.xpEarned ? `  ·  +${battle.xpEarned} XP` : ""}
                    </Text>
                  </View>
                  <View style={[s.verdictPill, { borderColor: verdictColor + "50", backgroundColor: verdictColor + "15" }]}>
                    <Text style={[s.verdictText, { color: verdictColor }]}>{battle.verdict ?? "Complete"}</Text>
                  </View>
                </View>
                {expanded && battle.events && (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    {battle.events.map((evt: any, i: number) => (
                      <Text key={i} style={[s.battleEvent, { color: colors.mutedForeground }]}>{evt.text ?? evt}</Text>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
      }
    </ScrollView>
  );

  // ── RECORDS section ────────────────────────────────────────────────────

  const stats = (analytics as any) ?? {};
  const renderRecords = () => (
    <ScrollView contentContainerStyle={s.sectionContent} showsVerticalScrollIndicator={false}>
      <Text style={[s.subHeading, { color: colors.mutedForeground }]}>GUILD RECORDS</Text>

      {analyticsLoading ? <ActivityIndicator color={colors.primary} /> : (
        <>
          <View style={s.statsGrid}>
            {[
              { label: "Total Battles",   value: String(stats.totalWorkouts ?? stats.sessionsCompleted ?? "—"), color: "#0dcef5" },
              { label: "Total XP",        value: String(stats.totalXp ?? stats.xpEarned ?? "—"),              color: "#ffbf00" },
              { label: "Gold Earned",     value: String(stats.totalGold ?? stats.goldEarned ?? "—"),           color: "#ffbf00" },
              { label: "PRs Broken",      value: String(stats.totalPrs ?? stats.personalRecords ?? "—"),       color: "#a855f7" },
              { label: "Best Streak",     value: `${stats.bestStreak ?? stats.longestStreak ?? "—"}d`,         color: "#22c55e" },
              { label: "Achievements",    value: String(stats.achievementsUnlocked ?? "—"),                    color: "#f97316" },
            ].map(({ label, value, color }) => (
              <View key={label} style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.statValue, { color }]}>{value}</Text>
                <Text style={[s.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Style breakdown */}
          {totalStyleSessions > 0 && (
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
              <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>TRAINING STYLE BREAKDOWN</Text>
              {STYLE_ORDER.map((st) => {
                const pct = Math.round(((styleDistribution[st] ?? 0) / (totalStyleSessions || 1)) * 100);
                return <StyleBar key={st} style={st} pct={pct} colors={colors} />;
              })}
            </View>
          )}

          <View style={[s.aldricQuote, { borderColor: "#ffbf0030", backgroundColor: "#ffbf0008" }]}>
            <Text style={[s.quoteText, { color: "#ffbf00" }]}>
              "Every record in this hall was paid for in sweat and honest effort. That is the only currency worth counting."
            </Text>
            <Text style={[s.quoteName, { color: colors.mutedForeground }]}>— Grandmaster Aldric</Text>
          </View>
        </>
      )}
    </ScrollView>
  );

  // ── Root render ────────────────────────────────────────────────────────

  const renderSection = () => {
    switch (section) {
      case "master":   return renderMaster();
      case "quests":   return renderQuests();
      case "campaign": return renderCampaign();
      case "raids":    return renderRaids();
      case "log":      return renderLog();
      case "records":  return renderRecords();
    }
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Page header */}
      <View style={[s.pageHeader, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Text style={[s.pageTitle, { color: colors.foreground }]}>Guild Hall</Text>
        <Text style={[s.pageSubtitle, { color: colors.mutedForeground }]}>Grandmaster Aldric's Domain</Text>
      </View>

      {/* Section nav */}
      {renderSectionNav()}

      {/* Content */}
      <View style={{ flex: 1, paddingBottom: insets.bottom + 90 }}>
        {renderSection()}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:           { flex: 1 },
  pageHeader:     { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  pageTitle:      { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  pageSubtitle:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, letterSpacing: 1 },
  sectionNavWrap: { borderBottomWidth: 1, borderBottomColor: "transparent" },
  sectionNav:     { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  sectionPill:    { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20,
                    paddingHorizontal: 12, paddingVertical: 6 },
  sectionIcon:    { fontSize: 12 },
  sectionLabel:   { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sectionContent: { padding: 16, gap: 10, paddingBottom: 40 },
  subHeading:     { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 2, marginBottom: 4 },
  emptyText:      { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 24, opacity: 0.6 },
  card:           { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  cardLabel:      { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },

  // Aldric header
  aldricHeader:   { flexDirection: "row", gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
  aldricAvatar:   { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: "center",
                    justifyContent: "center", backgroundColor: "#ffbf0015" },
  aldricAvatarIcon: { fontSize: 24 },
  aldricName:     { fontSize: 16, fontFamily: "Inter_700Bold" },
  aldricTitle:    { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginTop: 2 },
  aldricDesc:     { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6, lineHeight: 16 },
  reportText:     { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },

  // Chat
  msgBubble:      { borderWidth: 1, borderRadius: 10, padding: 10, maxWidth: "85%" },
  msgRole:        { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 4 },
  msgContent:     { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  chatInputRow:   { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 10,
                    borderTopWidth: 1, alignItems: "flex-end" },
  chatInput:      { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                    fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100, minHeight: 44 },
  sendBtn:        { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  sendBtnText:    { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0c0d13" },

  // Quest
  questCard:      { flexDirection: "row", borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 2 },
  accentBar:      { width: 3 },
  questHeader:    { flexDirection: "row", alignItems: "flex-start", padding: 12, gap: 8 },
  questTitleRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  questTitle:     { flex: 1, fontSize: 13, fontFamily: "Inter_700Bold" },
  questDesc:      { fontSize: 11, fontFamily: "Inter_400Regular" },
  chevron:        { fontSize: 10, paddingTop: 2 },
  questExpanded:  { paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  diffBadge:      { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  diffText:       { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  rewardRow:      { flexDirection: "row", gap: 12, marginTop: 4 },
  rewardText:     { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  claimBtn:       { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
                    alignItems: "center", justifyContent: "center" },
  claimBtnText:   { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  // Task row
  taskRow:        { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 },
  taskCheck:      { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: "center",
                    justifyContent: "center", marginTop: 1, flexShrink: 0 },
  checkMark:      { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  taskDesc:       { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  progressRow:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  progressTrack:  { flex: 1, height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill:   { height: 3, borderRadius: 2 },
  progressLabel:  { fontSize: 9, fontFamily: "Inter_500Medium" },

  // Campaign
  campaignHint:   { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 8, lineHeight: 16, opacity: 0.7 },
  chapterHeader:  { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 8,
                    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  chapterNum:     { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  chapterName:    { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  campaignCard:   { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1,
                    padding: 12, marginBottom: 6, gap: 10 },
  campaignHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  campaignTitle:  { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  campaignDesc:   { fontSize: 11, fontFamily: "Inter_400Regular" },
  campaignFooter: { flexDirection: "row", gap: 12, marginTop: 6 },
  rewardSmall:    { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  startBtn:       { width: 36, height: 36, borderRadius: 18, borderWidth: 1,
                    alignItems: "center", justifyContent: "center" },
  startBtnText:   { fontSize: 13, fontFamily: "Inter_700Bold" },

  // Raids
  subTabBar:      { flexDirection: "row", borderBottomWidth: 1 },
  subTabBtn:      { flex: 1, alignItems: "center", paddingVertical: 10 },
  subTabText:     { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  raidCard:       { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, borderWidth: 1,
                    padding: 12, gap: 10, marginBottom: 6 },
  raidLeft:       { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: "center",
                    justifyContent: "center", flexShrink: 0, marginTop: 2 },
  raidDiff:       { fontSize: 11, fontFamily: "Inter_700Bold" },
  raidTitle:      { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  raidMeta:       { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 6 },

  // Modal
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalBox:       { width: "100%", borderRadius: 16, borderWidth: 1, padding: 20, gap: 10 },
  modalTitle:     { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalSub:       { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  modalRewards:   { flexDirection: "row", gap: 10, justifyContent: "center" },
  rewardChip:     { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  gearDrop:       { borderWidth: 1, borderRadius: 10, padding: 12, gap: 2 },

  // Battle Log
  filterChip:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  filterChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  battleCard:     { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 6 },
  battleHeader:   { flexDirection: "row", alignItems: "center", gap: 10 },
  battleName:     { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  battleMeta:     { fontSize: 11, fontFamily: "Inter_400Regular" },
  verdictPill:    { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  verdictText:    { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  battleEvent:    { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17, paddingLeft: 4,
                    borderLeftWidth: 2, borderLeftColor: "#1c2033" },
  styleBarRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  styleBarLabel:  { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, width: 30 },
  styleBarTrack:  { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  styleBarFill:   { height: 4, borderRadius: 2 },
  styleBarPct:    { fontSize: 10, fontFamily: "Inter_500Medium", width: 30, textAlign: "right" },
  dominantStyle:  { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  archetype:      { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 8 },

  // Records
  statsGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard:       { width: "47%", borderRadius: 10, borderWidth: 1, padding: 12 },
  statValue:      { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel:      { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  aldricQuote:    { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 8, gap: 6 },
  quoteText:      { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic", lineHeight: 18, textAlign: "center" },
  quoteName:      { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
});
