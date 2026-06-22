import {
  useGetBossRaids,
  useGetAvailableBossRaids,
  useStartBossRaid,
  useUpdateBossRaidTask,
  useClaimBossRaidReward,
} from "@workspace/api-client-react";
import type {
  BossRaid,
  RaidTemplate,
  RaidClaimResult,
  RpgGear,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { formatGuildGrade, requirementLabel } from "@/utils/ranks";

// ── Palettes ────────────────────────────────────────────────────────────────

const DIFF_COLOR: Record<string, string> = {
  E: "#9ca3af",
  D: "#22c55e",
  C: "#3b82f6",
  B: "#a855f7",
  A: "#f97316",
  S: "#ef4444",
};

const RARITY_COLOR: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f97316",
  mythic: "#ef4444",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeRemaining(hours: number | null | undefined): string {
  if (hours == null || hours <= 0) return "EXPIRED";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const d = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

type TabKey = "active" | "available" | "history";

// ── Claim Reward Modal ───────────────────────────────────────────────────────

function ClaimModal({
  result,
  raidTitle,
  onClose,
}: {
  result: RaidClaimResult;
  raidTitle: string;
  onClose: () => void;
}) {
  const gear = result.gearDrop as RpgGear | null | undefined;
  const gearRarityColor = gear ? (RARITY_COLOR[gear.rarity] ?? "#9ca3af") : "#9ca3af";
  const statBonuses = gear?.statBonuses as Record<string, number> | undefined;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <Text style={s.modalTitle}>
            {result.rankedUp
              ? `Guild Grade Raised — ${formatGuildGrade(result.newRank)}`
              : "Raid Conquered!"}
          </Text>
          <Text style={s.modalSubtitle}>{raidTitle}</Text>

          {/* XP / Gold / Stats */}
          <View style={s.rewardRow}>
            <View style={s.rewardPill}>
              <Text style={[s.rewardPillVal, { color: "#0dcef5" }]}>
                +{result.xpEarned}
              </Text>
              <Text style={s.rewardPillLabel}>XP</Text>
            </View>
            <View style={s.rewardPill}>
              <Text style={[s.rewardPillVal, { color: "#ffbf00" }]}>
                +{result.goldEarned}
              </Text>
              <Text style={s.rewardPillLabel}>Gold</Text>
            </View>
            {result.bonusStatPoints > 0 && (
              <View style={s.rewardPill}>
                <Text style={[s.rewardPillVal, { color: "#a855f7" }]}>
                  +{result.bonusStatPoints}
                </Text>
                <Text style={s.rewardPillLabel}>Stats</Text>
              </View>
            )}
          </View>

          {/* Title granted */}
          {result.titleGranted && (
            <View style={s.titleGrantedRow}>
              <Text style={s.titleGrantedLabel}>TITLE UNLOCKED</Text>
              <Text style={s.titleGrantedValue}>
                {(result.titleGranted as any).name ?? String(result.titleGranted)}
              </Text>
            </View>
          )}

          {/* Gear drop */}
          {gear && (
            <View style={[s.gearCard, { borderColor: gearRarityColor + "60" }]}>
              <View
                style={[s.gearRarityBar, { backgroundColor: gearRarityColor }]}
              />
              <View style={{ flex: 1, paddingLeft: 10, paddingVertical: 8, paddingRight: 8 }}>
                <View style={s.gearHeader}>
                  <Text style={[s.gearName, { color: gearRarityColor }]} numberOfLines={1}>
                    {gear.name}
                  </Text>
                  <View
                    style={[
                      s.gearRarityBadge,
                      { borderColor: gearRarityColor + "60" },
                    ]}
                  >
                    <Text style={[s.gearRarityText, { color: gearRarityColor }]}>
                      {gear.rarity.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={s.gearSlot}>
                  {gear.slot.replace(/_/g, " ").toUpperCase()}
                </Text>
                {gear.flavorText && (
                  <Text style={s.gearFlavor}>{gear.flavorText}</Text>
                )}
                {statBonuses && Object.keys(statBonuses).length > 0 && (
                  <View style={s.statRow}>
                    {Object.entries(statBonuses)
                      .filter(([, v]) => v !== 0)
                      .slice(0, 5)
                      .map(([key, val]) => (
                        <View key={key} style={s.statChip}>
                          <Text style={s.statChipText}>
                            {key
                              .replace(/([A-Z])/g, " $1")
                              .toLowerCase()
                              .trim()}{" "}
                            +{val}
                          </Text>
                        </View>
                      ))}
                  </View>
                )}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={s.modalCloseBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={s.modalCloseBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Active Raid Card ─────────────────────────────────────────────────────────

function ActiveRaidCard({
  raid,
  colors,
  onClaimed,
}: {
  raid: BossRaid;
  colors: ReturnType<typeof useColors>;
  onClaimed: (result: RaidClaimResult, title: string) => void;
}) {
  const [expanded, setExpanded] = useState(raid.status === "active");
  const qc = useQueryClient();
  const updateTask = useUpdateBossRaidTask();
  const claimRaid = useClaimBossRaidReward();

  const diffColor = DIFF_COLOR[raid.difficulty] ?? colors.primary;
  const completedCount = raid.tasks.filter((t) => t.completed).length;
  const totalTasks = raid.tasks.length;
  const progress = totalTasks > 0 ? completedCount / totalTasks : 0;

  const isFailed = raid.status === "failed";
  const isClaimed = raid.status === "claimed";
  const isCompleted = raid.status === "completed";
  const isExpired = raid.isExpired ?? false;

  const accentColor =
    isFailed || isExpired
      ? "#ef4444"
      : isCompleted
      ? "#22c55e"
      : isClaimed
      ? colors.mutedForeground
      : colors.primary;

  const handleTaskUpdate = (
    taskId: string,
    currentValue: number | null | undefined,
    targetValue: number | null | undefined
  ) => {
    const isBinary = !targetValue;
    updateTask.mutate(
      {
        id: raid.id,
        data: {
          taskId,
          currentValue: isBinary ? 1 : (currentValue ?? 0) + 1,
          completed: isBinary ? true : undefined,
        },
      },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: ["/api/boss-raids"] }),
      }
    );
  };

  const handleClaim = () => {
    claimRaid.mutate(
      { id: raid.id },
      {
        onSuccess: (data) => {
          qc.invalidateQueries({ queryKey: ["/api/boss-raids"] });
          qc.invalidateQueries({ queryKey: ["/api/player"] });
          qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
          qc.invalidateQueries({ queryKey: ["/api/armory"] });
          onClaimed(data, raid.title);
        },
        onError: () => Alert.alert("Error", "Could not claim reward. Try again."),
      }
    );
  };

  return (
    <View
      style={[
        s.raidCard,
        {
          backgroundColor: colors.card,
          borderColor:
            isFailed || isExpired
              ? "#ef444430"
              : isCompleted
              ? "#22c55e40"
              : isClaimed
              ? colors.border
              : diffColor + "30",
          opacity: isFailed || isExpired ? 0.65 : isClaimed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[s.accentBar, { backgroundColor: accentColor }]} />

      <View style={{ flex: 1 }}>
        {/* Header row */}
        <TouchableOpacity
          style={s.raidHeader}
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <View style={s.badgeRow}>
              <View style={[s.diffBadge, { borderColor: diffColor + "60" }]}>
                <Text style={[s.diffText, { color: diffColor }]}>
                  {formatGuildGrade(raid.difficulty)}
                </Text>
              </View>
              {(isFailed || isExpired) && (
                <View style={[s.statusBadge, { borderColor: "#ef444460" }]}>
                  <Text style={[s.statusBadgeText, { color: "#ef4444" }]}>
                    {isFailed ? "FAILED" : "EXPIRED"}
                  </Text>
                </View>
              )}
              {isCompleted && !isClaimed && (
                <View style={[s.statusBadge, { borderColor: "#22c55e60" }]}>
                  <Text style={[s.statusBadgeText, { color: "#22c55e" }]}>
                    COMPLETE
                  </Text>
                </View>
              )}
              {isClaimed && (
                <View style={[s.statusBadge, { borderColor: colors.border }]}>
                  <Text
                    style={[
                      s.statusBadgeText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    CLAIMED
                  </Text>
                </View>
              )}
              {raid.timeRemainingHours != null &&
                !isFailed &&
                !isCompleted &&
                !isClaimed && (
                  <Text
                    style={[
                      s.timerText,
                      {
                        color:
                          (raid.timeRemainingHours ?? 99) < 12
                            ? "#ef4444"
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    ⏱ {formatTimeRemaining(raid.timeRemainingHours)}
                  </Text>
                )}
            </View>
            <Text
              style={[s.raidTitle, { color: colors.foreground }]}
              numberOfLines={2}
            >
              {raid.title}
            </Text>
          </View>
          <Text style={[s.expandChevron, { color: colors.mutedForeground }]}>
            {expanded ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>

        {/* Progress bar */}
        <View style={s.progressSection}>
          <View style={s.progressLabels}>
            <Text style={[s.progressLabelText, { color: colors.mutedForeground }]}>
              Progress
            </Text>
            <Text style={[s.progressLabelText, { color: colors.mutedForeground }]}>
              {completedCount}/{totalTasks}
            </Text>
          </View>
          <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                s.progressFill,
                {
                  width: `${progress * 100}%` as any,
                  backgroundColor: isCompleted ? "#22c55e" : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* Expanded: lore + tasks */}
        {expanded && (
          <View style={s.expandedBlock}>
            {raid.lore ? (
              <View
                style={[
                  s.loreBlock,
                  { borderLeftColor: colors.primary + "40" },
                ]}
              >
                <Text style={[s.loreText, { color: colors.mutedForeground }]}>
                  {raid.lore}
                </Text>
              </View>
            ) : null}

            {raid.tasks.map((task) => {
              const isManual =
                (task.taskType as string | undefined) === "manual" ||
                !task.taskType;
              const pct = task.targetValue
                ? Math.min(1, (task.currentValue ?? 0) / task.targetValue)
                : task.completed
                ? 1
                : 0;
              const canTap =
                isManual &&
                !task.completed &&
                !isExpired &&
                !isFailed &&
                !isClaimed;

              return (
                <View
                  key={task.id}
                  style={[
                    s.taskItem,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <View style={s.taskTopRow}>
                    {/* Checkbox / +1 button / auto-icon */}
                    {isManual && canTap && task.targetValue != null && task.targetValue > 1 ? (
                      <TouchableOpacity
                        style={[
                          s.plusOneBtn,
                          updateTask.isPending && { opacity: 0.5 },
                        ]}
                        onPress={() =>
                          handleTaskUpdate(task.id, task.currentValue, task.targetValue)
                        }
                        disabled={updateTask.isPending}
                        activeOpacity={0.7}
                      >
                        <Text style={s.plusOneBtnText}>+1</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={
                          canTap
                            ? () =>
                                handleTaskUpdate(
                                  task.id,
                                  task.currentValue,
                                  task.targetValue
                                )
                            : undefined
                        }
                        disabled={!canTap || updateTask.isPending}
                        activeOpacity={canTap ? 0.7 : 1}
                      >
                        <View
                          style={[
                            s.taskCheckbox,
                            task.completed
                              ? {
                                  backgroundColor: "#22c55e",
                                  borderColor: "#22c55e",
                                }
                              : isManual
                              ? { borderColor: colors.border }
                              : {
                                  borderColor: colors.primary + "80",
                                  borderRadius: 9,
                                },
                          ]}
                        >
                          {task.completed ? (
                            <Text style={{ fontSize: 9, color: "#fff" }}>✓</Text>
                          ) : !isManual ? (
                            <Text style={{ fontSize: 9, color: colors.primary }}>
                              ⚡
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          s.taskDesc,
                          {
                            color: task.completed
                              ? colors.mutedForeground
                              : colors.foreground,
                            textDecorationLine: task.completed
                              ? "line-through"
                              : "none",
                          },
                        ]}
                      >
                        {task.description}
                      </Text>
                      {!isManual && !task.completed && (
                        <Text
                          style={[
                            s.autoTrackedLabel,
                            { color: colors.primary + "80" },
                          ]}
                        >
                          Auto-tracked
                        </Text>
                      )}
                    </View>

                    {task.targetValue != null && (
                      <Text
                        style={[
                          s.taskProgressLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {task.currentValue ?? 0}/{task.targetValue}
                        {task.unit ? ` ${task.unit}` : ""}
                      </Text>
                    )}
                  </View>

                  {!isManual && task.targetValue != null && (
                    <View
                      style={[
                        s.taskProgressTrack,
                        { backgroundColor: colors.border },
                      ]}
                    >
                      <View
                        style={[
                          s.taskProgressFill,
                          {
                            width: `${pct * 100}%` as any,
                            backgroundColor: task.completed
                              ? "#22c55e"
                              : colors.primary,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Reward footer */}
        <View style={[s.rewardFooter, { borderTopColor: colors.border }]}>
          <Text style={[s.footerXp, { color: colors.primary }]}>
            +{raid.xpReward} XP
          </Text>
          <Text style={s.footerGold}>+{raid.goldReward}g</Text>
          {raid.titleReward && (
            <Text style={[s.footerTitle, { color: "#a855f7" }]}>
              "{raid.titleReward}"
            </Text>
          )}
        </View>

        {isCompleted && !isClaimed && (
          <TouchableOpacity
            style={[s.claimBtn, claimRaid.isPending && { opacity: 0.6 }]}
            onPress={handleClaim}
            disabled={claimRaid.isPending}
            activeOpacity={0.8}
          >
            {claimRaid.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.claimBtnText}>🏆 Claim Raid Reward</Text>
            )}
          </TouchableOpacity>
        )}
        {isClaimed && (
          <View style={[s.claimedRow, { borderColor: colors.border }]}>
            <Text style={[s.claimedRowText, { color: colors.mutedForeground }]}>
              Reward Claimed ✓
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Unlock requirement helper ────────────────────────────────────────────────

function formatTriggerCondition(cond: string | undefined): string | null {
  if (!cond) return null;
  if (cond === "streak_7") return "7-day streak required";
  if (cond === "streak_30") return "30-day streak required";
  if (cond?.startsWith("rank_")) return requirementLabel(cond);
  return "Requires Copper Grade+";
}

// ── Available Raid Card ──────────────────────────────────────────────────────

function AvailableRaidCard({
  template,
  onStart,
  isStarting,
  colors,
}: {
  template: RaidTemplate;
  onStart: () => void;
  isStarting: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  const diffColor = DIFF_COLOR[template.difficulty] ?? colors.primary;

  return (
    <View
      style={[
        s.raidCard,
        {
          backgroundColor: colors.card,
          borderColor:
            template.alreadyCompleted && !template.isRepeatable
              ? colors.border
              : diffColor + "30",
          opacity:
            template.alreadyCompleted && !template.isRepeatable ? 0.55 : 1,
        },
      ]}
    >
      <View style={[s.accentBar, { backgroundColor: diffColor }]} />

      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={s.raidHeader}
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <View style={s.badgeRow}>
              <View style={[s.diffBadge, { borderColor: diffColor + "60" }]}>
                <Text style={[s.diffText, { color: diffColor }]}>
                  {formatGuildGrade(template.difficulty)}
                </Text>
              </View>
              <Text style={[s.timerText, { color: colors.mutedForeground }]}>
                ⏱ {template.timeLimitHours}h limit
              </Text>
              {template.alreadyCompleted && template.isRepeatable && (
                <View style={[s.statusBadge, { borderColor: "#22c55e60" }]}>
                  <Text style={[s.statusBadgeText, { color: "#22c55e" }]}>
                    REPEAT
                  </Text>
                </View>
              )}
              {formatTriggerCondition(template.triggerCondition) && (
                <View style={[s.unlockBadge, { borderColor: "#ffbf0040" }]}>
                  <Text style={[s.unlockBadgeText, { color: "#ffbf00" }]}>
                    {formatTriggerCondition(template.triggerCondition)}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[s.raidTitle, { color: colors.foreground }]}
              numberOfLines={2}
            >
              {template.title}
            </Text>
            <Text
              style={[s.raidDescription, { color: colors.mutedForeground }]}
              numberOfLines={expanded ? undefined : 2}
            >
              {template.description}
            </Text>
          </View>
          <Text style={[s.expandChevron, { color: colors.mutedForeground }]}>
            {expanded ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>

        {expanded && (
          <View style={s.expandedBlock}>
            {template.lore ? (
              <View
                style={[
                  s.loreBlock,
                  { borderLeftColor: colors.primary + "40" },
                ]}
              >
                <Text style={[s.loreText, { color: colors.mutedForeground }]}>
                  {template.lore}
                </Text>
              </View>
            ) : null}
            {template.tasks.map((task, i) => (
              <View
                key={i}
                style={[s.taskItem, { backgroundColor: colors.background }]}
              >
                <View style={s.taskTopRow}>
                  <View
                    style={[s.taskCheckbox, { borderColor: colors.border }]}
                  />
                  <Text
                    style={[
                      s.taskDesc,
                      { color: colors.mutedForeground, flex: 1 },
                    ]}
                  >
                    {task.description}
                  </Text>
                  {task.targetValue != null && (
                    <Text
                      style={[
                        s.taskProgressLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {task.targetValue} {task.unit ?? ""}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={[s.rewardFooter, { borderTopColor: colors.border }]}>
          <Text style={[s.footerXp, { color: colors.primary }]}>
            +{template.xpReward} XP
          </Text>
          <Text style={s.footerGold}>+{template.goldReward}g</Text>
          {template.titleReward && (
            <Text style={[s.footerTitle, { color: "#a855f7" }]}>
              "{template.titleReward}"
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[s.startBtn, isStarting && { opacity: 0.6 }]}
          onPress={onStart}
          disabled={isStarting}
          activeOpacity={0.8}
        >
          {isStarting ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={s.startBtnText}>⚔️ Begin Raid</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function RaidsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [claimResult, setClaimResult] = useState<{
    result: RaidClaimResult;
    title: string;
  } | null>(null);
  const [startingTitle, setStartingTitle] = useState<string | null>(null);

  const { data: raids, isLoading: raidsLoading } = useGetBossRaids();
  const { data: available, isLoading: availableLoading } =
    useGetAvailableBossRaids();
  const startRaid = useStartBossRaid();
  const qc = useQueryClient();

  const activeRaids =
    raids?.filter(
      (r) => r.status === "active" || r.status === "completed"
    ) ?? [];
  const historyRaids =
    raids?.filter(
      (r) => r.status === "claimed" || r.status === "failed"
    ) ?? [];

  const handleStart = (templateTitle: string) => {
    setStartingTitle(templateTitle);
    startRaid.mutate(
      { data: { templateTitle } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/boss-raids"] });
          qc.invalidateQueries({ queryKey: ["/api/boss-raids/available"] });
          setStartingTitle(null);
          setActiveTab("active");
        },
        onError: () => {
          setStartingTitle(null);
          Alert.alert(
            "Cannot Start Raid",
            "You may not meet the requirements yet. Build your streak and raise your Guild Grade."
          );
        },
      }
    );
  };

  const isLoading =
    activeTab === "available" ? availableLoading : raidsLoading;

  const TABS: Array<{ key: TabKey; label: string }> = [
    { key: "active", label: "Active" },
    { key: "available", label: "Available" },
    { key: "history", label: "History" },
  ];

  const renderContent = () => {
    if (activeTab === "active") {
      if (activeRaids.length === 0) {
        return (
          <View style={s.emptyBlock}>
            <Text style={s.emptyIcon}>🛡️</Text>
            <Text style={[s.emptyTitle, { color: colors.mutedForeground }]}>
              No active raids
            </Text>
            <Text style={[s.emptyHint, { color: colors.mutedForeground }]}>
              Check the Available tab to start one.
            </Text>
          </View>
        );
      }
      return activeRaids.map((raid) => (
        <ActiveRaidCard
          key={raid.id}
          raid={raid}
          colors={colors}
          onClaimed={(result, title) => setClaimResult({ result, title })}
        />
      ));
    }

    if (activeTab === "available") {
      if (!available || available.length === 0) {
        return (
          <View style={s.emptyBlock}>
            <Text style={s.emptyIcon}>⚠️</Text>
            <Text style={[s.emptyTitle, { color: colors.mutedForeground }]}>
              No raids available yet
            </Text>
            <Text style={[s.emptyHint, { color: colors.mutedForeground }]}>
              Build streaks and raise your Guild Grade to unlock raids.
            </Text>
          </View>
        );
      }
      return available.map((template, i) => (
        <AvailableRaidCard
          key={i}
          template={template}
          colors={colors}
          isStarting={
            startingTitle === template.title && startRaid.isPending
          }
          onStart={() => handleStart(template.title)}
        />
      ));
    }

    // History tab
    if (historyRaids.length === 0) {
      return (
        <View style={s.emptyBlock}>
          <Text style={s.emptyIcon}>📜</Text>
          <Text style={[s.emptyTitle, { color: colors.mutedForeground }]}>
            No raid history yet
          </Text>
        </View>
      );
    }
    return historyRaids.map((raid) => (
      <ActiveRaidCard
        key={raid.id}
        raid={raid}
        colors={colors}
        onClaimed={(result, title) => setClaimResult({ result, title })}
      />
    ));
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {claimResult && (
        <ClaimModal
          result={claimResult.result}
          raidTitle={claimResult.title}
          onClose={() => setClaimResult(null)}
        />
      )}

      {/* Header */}
      <View
        style={[
          s.header,
          {
            paddingTop: insets.top + 12,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[s.screenLabel, { color: colors.mutedForeground }]}>
          ENDGAME
        </Text>
        <Text style={[s.screenTitle, { color: colors.foreground }]}>
          Boss Raids
        </Text>
      </View>

      {/* Tab bar */}
      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              s.tabBtn,
              activeTab === tab.key && {
                borderBottomColor: colors.primary,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                s.tabLabel,
                {
                  color:
                    activeTab === tab.key
                      ? colors.primary
                      : colors.mutedForeground,
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

// ── Styles ───────────────────────────────────────────────────────────────────

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
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },

  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  loadingBlock: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, gap: 12 },

  emptyBlock: { alignItems: "center", paddingVertical: 56 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 4 },
  emptyHint: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // Raid card
  raidCard: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    overflow: "hidden",
  },
  accentBar: { width: 3, alignSelf: "stretch" },
  raidHeader: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    flex: 1,
    alignItems: "flex-start",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  diffBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  diffText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  statusBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  timerText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  raidTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  raidDescription: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    marginTop: 2,
  },
  expandChevron: { fontSize: 10, marginTop: 4 },

  // Progress bar (header)
  progressSection: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabelText: { fontSize: 9, fontFamily: "Inter_500Medium" },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },

  // Expanded content
  expandedBlock: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
  },
  loreBlock: { borderLeftWidth: 2, paddingLeft: 8, marginBottom: 2 },
  loreText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 16,
  },

  // Task rows
  taskItem: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  taskTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  taskCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  taskDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  autoTrackedLabel: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 2 },
  taskProgressLabel: { fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 2 },
  taskProgressTrack: {
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
    marginLeft: 26,
  },
  taskProgressFill: { height: 2, borderRadius: 1 },

  // Reward footer
  rewardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  footerXp: { fontSize: 11, fontFamily: "Inter_700Bold" },
  footerGold: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#ffbf00" },
  footerTitle: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    flex: 1,
  },

  // Claim / start buttons
  claimBtn: {
    backgroundColor: "#22c55e",
    borderRadius: 8,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    margin: 12,
    marginTop: 4,
  },
  claimBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  claimedRow: {
    margin: 12,
    marginTop: 4,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
  },
  claimedRowText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  startBtn: {
    backgroundColor: "#0dcef5",
    borderRadius: 8,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    margin: 12,
    marginTop: 4,
  },
  startBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#000" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#111520",
    borderWidth: 1,
    borderColor: "#1c2033",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  rewardRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 16,
  },
  rewardPill: { alignItems: "center" },
  rewardPillVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  rewardPillLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "#6b7280",
    letterSpacing: 1,
  },
  titleGrantedRow: {
    backgroundColor: "#a855f710",
    borderWidth: 1,
    borderColor: "#a855f730",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  titleGrantedLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "#a855f7",
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  titleGrantedValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#e9d5ff",
  },
  gearCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#0c0d13",
  },
  gearRarityBar: { width: 3 },
  gearHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  gearName: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
  gearRarityBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  gearRarityText: { fontSize: 8, fontFamily: "Inter_700Bold" },
  gearSlot: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "#6b7280",
    letterSpacing: 1,
    marginBottom: 4,
  },
  gearFlavor: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    color: "#6b7280",
    marginBottom: 6,
  },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  statChip: {
    backgroundColor: "#1c2033",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statChipText: { fontSize: 9, fontFamily: "Inter_500Medium", color: "#9ca3af" },
  modalCloseBtn: {
    backgroundColor: "#0dcef5",
    borderRadius: 8,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000" },

  plusOneBtn: {
    backgroundColor: "#0dcef520",
    borderWidth: 1,
    borderColor: "#0dcef560",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  plusOneBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#0dcef5",
  },

  unlockBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  unlockBadgeText: { fontSize: 9, fontFamily: "Inter_500Medium" },
});
