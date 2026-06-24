import {
  customFetch,
  useCreateWorkoutSession,
  useGetGuildHallToday,
  useGetGuildMasterConversation,
  useGetDailyQuest,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatGuildGrade, gradeColor } from "@/utils/ranks";

const ALDRIC_IMAGE = require("../../assets/images/grandmaster-aldric.jpg");

type PlayerSummary = { level: number; xp: number; xpToNextLevel: number; gold: number; rank: string; name: string | null };

function usePlayer() {
  const [data, setData] = useState<PlayerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    customFetch<any>("/api/player")
      .then((p) => {
        if (!cancelled) {
          setData({
            level: p.level ?? 1,
            xp: p.xp ?? 0,
            xpToNextLevel: p.xpToNextLevel ?? 1000,
            gold: p.gold ?? 0,
            rank: p.rank ?? "E",
            name: p.name ?? null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { data, loading };
}

type ChatLine = { id: string; role: "user" | "assistant"; content: string };

function parseGuildMasterStream(streamText: string) {
  return streamText.split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => {
      try {
        return JSON.parse(line.slice(6)) as { content?: string };
      } catch {
        return {};
      }
    })
    .map((event) => event.content ?? "")
    .join("");
}

function AldricChatModal({
  visible,
  onClose,
  initialReport,
}: {
  visible: boolean;
  onClose: () => void;
  initialReport: any | null;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: history } = useGetGuildMasterConversation();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [localLines, setLocalLines] = useState<ChatLine[]>([]);
  const [sending, setSending] = useState(false);
  const reportDetails = initialReport?.aldric;
  const reportMessage =
    reportDetails?.counsel ??
    initialReport?.counsel ??
    (initialReport?.reported ? "The commission has been recorded." : null);
  const suggestedQuestions = useMemo(
    () => [
      "What is the state of Aethoria?",
      "What do the Guild records say about my progress?",
      "What should I focus on today?",
      "What has changed near the Gates?",
    ],
    [],
  );

  useEffect(() => {
    if (history) {
      setLocalLines(
        history.messages.map((m, i) => ({
          id: String(i),
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
    }
  }, [history]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (!history?.conversationId) {
      Alert.alert("Still connecting", "The Guild Hall is loading. Try again in a moment.");
      return;
    }
    setInput("");
    const userLine: ChatLine = { id: Date.now().toString(), role: "user", content: text };
    setLocalLines((prev) => [...prev, userLine]);
    setSending(true);
    try {
      const streamText = await customFetch<string>("/api/guild-master/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, conversationId: history.conversationId, narrativeMode: "balanced" }),
        responseType: "text",
      });
      const answer = parseGuildMasterStream(streamText);
      if (answer) {
        const reply: ChatLine = { id: Date.now().toString() + "a", role: "assistant", content: answer };
        setLocalLines((prev) => [...prev, reply]);
      }
      await qc.invalidateQueries({ queryKey: ["/api/guild-master/conversation"] });
    } catch {
      Alert.alert("Error", "Aldric is unavailable right now.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[s.chatRoot, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[s.chatHeader, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
          <Text style={[s.chatTitle, { color: "#d9ad63" }]}>Grandmaster Aldric</Text>
          <Text style={[s.chatSub, { color: colors.mutedForeground }]}>Guild Hall - Aethoria</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={{ color: colors.mutedForeground, fontSize: 22 }}>x</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {reportMessage && (
            <View style={s.reportSummary}>
              <Text style={s.reportSummaryTitle}>Aldric's report</Text>
              <Text style={s.reportSummaryText}>{reportMessage}</Text>
              {reportDetails?.tone ? (
                <Text style={s.reportSummaryMeta}>Tone: {reportDetails.tone}</Text>
              ) : null}
              {reportDetails?.practicalRecommendation ? (
                <Text style={s.reportSummaryMeta}>Order: {reportDetails.practicalRecommendation}</Text>
              ) : null}
              {reportDetails?.warning ? (
                <Text style={[s.reportSummaryMeta, { color: "#d48b73" }]}>{reportDetails.warning}</Text>
              ) : null}
              {reportDetails?.nextStep ? (
                <Text style={s.reportSummaryMeta}>Next: {reportDetails.nextStep}</Text>
              ) : null}
            </View>
          )}
          <View style={s.audienceInfo}>
            <Text style={s.audienceInfoKicker}>Private audience</Text>
            <Text style={s.audienceInfoText}>
              Aldric can answer direct questions about Aethoria, the Gates, your summoning, your record, or the next duty. He knows the act was real; the hidden System remains yours to report.
            </Text>
            <View style={s.questionGrid}>
              {suggestedQuestions.map((question) => (
                <TouchableOpacity
                  key={question}
                  style={s.questionChip}
                  onPress={() => setInput(question)}
                  activeOpacity={0.8}
                >
                  <Text style={s.questionText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {localLines.length === 0 && (
            <Text style={[s.chatEmpty, { color: colors.mutedForeground }]}>
              The Grandmaster awaits your report, adventurer.
            </Text>
          )}
          {localLines.map((line) => (
            <View
              key={line.id}
              style={[
                s.bubble,
                line.role === "user"
                  ? { backgroundColor: "#d9ad6318", borderColor: "#d9ad6340", alignSelf: "flex-end" }
                  : { backgroundColor: "#1a1814", borderColor: "#3b3328", alignSelf: "flex-start" },
              ]}
            >
              {line.role === "assistant" && (
                <Text style={[s.bubbleSender, { color: "#d9ad63" }]}>Aldric</Text>
              )}
              <Text style={[s.bubbleText, { color: colors.foreground }]}>{line.content}</Text>
            </View>
          ))}
          {sending && (
            <View style={[s.bubble, { backgroundColor: "#1a1814", borderColor: "#3b3328", alignSelf: "flex-start" }]}>
              <Text style={{ color: colors.mutedForeground, fontSize: 18 }}>...</Text>
            </View>
          )}
        </ScrollView>
        <View style={[s.chatInputRow, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={[s.chatInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="Ask Aldric about Aethoria, the Gates, your record, or the next duty..."
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: "#d9ad63", opacity: sending || !input.trim() ? 0.5 : 1 }]}
            onPress={send}
            disabled={sending || !input.trim()}
          >
            <Text style={{ color: "#000", fontWeight: "700", fontSize: 11 }}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function WorldDangerPanel({ danger }: { danger: any }) {
  if (!danger) return null;
  const value = Math.max(0, Math.min(100, Number(danger.value ?? 100)));
  const critical = value >= 85;
  return (
    <View style={[s.dangerCard, { borderColor: critical ? "#9d3e2a" : "#6b4d2f" }]}>
      <View style={s.dangerHeader}>
        <View>
          <Text style={s.sectionLabel}>SYSTEM READING</Text>
          <Text style={[s.dangerTitle, { color: critical ? "#d95f45" : "#d9ad63" }]}>World Danger: {danger.label ?? "Critical"}</Text>
        </View>
        <View style={[s.dangerValueBox, { borderColor: critical ? "#9d3e2a" : "#72552e" }]}>
          <Text style={[s.dangerValue, { color: critical ? "#d95f45" : "#d5a557" }]}>{value}%</Text>
        </View>
      </View>
      <View style={s.dangerTrack}>
        <View style={[s.dangerFill, { width: `${value}%`, backgroundColor: critical ? "#9d3e2a" : value >= 65 ? "#b45f2d" : value >= 40 ? "#b48432" : "#4f8f67" }]} />
      </View>
      <Text style={s.dangerNote}>{danger.systemNote}</Text>
      <View style={s.dangerStats}>
        <View style={s.dangerStat}><Text style={s.dangerStatLabel}>Bosses</Text><Text style={s.dangerStatValue}>{danger.defeatedBosses ?? 0}</Text></View>
        <View style={s.dangerStat}><Text style={s.dangerStatLabel}>Threats</Text><Text style={[s.dangerStatValue, { color: "#d95f45" }]}>{danger.activeThreats ?? 0}</Text></View>
        <View style={s.dangerStat}><Text style={s.dangerStatLabel}>Rule</Text><Text style={s.dangerStatValue}>Bosses lower it</Text></View>
      </View>
    </View>
  );
}

function buildCommissionNote(commission: any, path: any) {
  return `[commission-context] ${JSON.stringify({
    commissionId: commission?.id,
    regionId: commission?.expedition?.region?.regionId,
    regionName: commission?.expedition?.region?.regionName ?? commission?.location?.region,
    locationId: commission?.location?.key,
    locationName: commission?.location?.name,
    completionPath: path?.completionPath,
    intendedStyle: path?.intendedStyle,
    narrativeThreat: commission?.expedition?.threat,
    travelMethod: commission?.expedition?.travelMethod ?? commission?.travel?.travelMethod,
  })}`;
}

function CommissionDetailModal({
  visible,
  onClose,
  commission,
  onStartPath,
  isStarting,
}: {
  visible: boolean;
  onClose: () => void;
  commission: any;
  onStartPath: (path: any) => void;
  isStarting: boolean;
}) {
  const insets = useSafeAreaInsets();
  const expedition = commission?.expedition;
  const quest = commission?.quest;
  const location = commission?.location;
  const travel = commission?.travel;
  const flavor = expedition?.narrativeFlavor;
  const majorQuest = expedition?.majorQuest;
  const paths = expedition ? [expedition.recommendedPath, ...(expedition.alternativePaths ?? [])].filter(Boolean) : [];
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[s.detailRoot, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <View style={s.detailHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.detailKicker}>COMMISSION BRIEFING</Text>
            <Text style={s.detailTitle}>{expedition?.commissionTitle ?? "Today's Commission"}</Text>
          </View>
          <TouchableOpacity style={s.detailClose} onPress={onClose}>
            <Text style={s.detailCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.detailContent} showsVerticalScrollIndicator={false}>
          <View style={s.detailPanel}>
            <Text style={s.detailLabel}>Region</Text>
            <Text style={s.detailRegion}>{expedition?.region?.regionName ?? location?.region ?? "Aethoria"}</Text>
            <Text style={s.detailMeta}>{location?.name ?? "Guild territory"}{location?.distanceFromGuildHallMiles ? ` - ${location.distanceFromGuildHallMiles} mi from the Hall` : ""}</Text>
            <Text style={s.detailBody}>{expedition?.narrativeBriefing ?? commission?.rationale}</Text>
            <View style={s.badgeWrap}>
              {(expedition?.region?.trainingStyles ?? []).slice(0, 6).map((style: string) => (
                <Text key={style} style={s.trainingBadge}>{style.replace(/_/g, " ")}</Text>
              ))}
            </View>
          </View>

          {flavor ? (
            <View style={s.tidingPanel}>
              <Text style={s.detailLabel}>{flavor.kind === "main_quest" ? "Major Quest Tiding" : "Guild Tiding"}</Text>
              <Text style={s.detailRegionSmall}>{flavor.title}</Text>
              <Text style={s.detailMeta}>Posted by {flavor.patron}</Text>
              <Text style={s.detailBody}>{flavor.hook}</Text>
              <View style={s.tidingInset}>
                <Text style={s.tidingLabel}>Objective</Text>
                <Text style={s.tidingText}>{flavor.objective}</Text>
                <Text style={s.tidingLabel}>Stakes</Text>
                <Text style={s.tidingText}>{flavor.stakes}</Text>
                <Text style={s.tidingLabel}>Rumor</Text>
                <Text style={s.tidingText}>{flavor.rumor}</Text>
              </View>
            </View>
          ) : null}

          <View style={s.detailPanel}>
            <Text style={s.detailLabel}>Threat / Task</Text>
            <Text style={s.detailBody}>{expedition?.threat ?? "Complete the Guild duty and return with proof."}</Text>
          </View>

          {majorQuest ? (
            <View style={[s.detailPanel, majorQuest.available && s.majorQuestReady]}>
              <Text style={s.detailLabel}>Main Quest Pressure</Text>
              <Text style={s.detailRegionSmall}>{majorQuest.title}</Text>
              <Text style={s.detailBody}>{majorQuest.description}</Text>
              <Text style={s.pathButtonMeta}>{majorQuest.available ? majorQuest.routeLabel : `${majorQuest.completedTowardUnlock}/${majorQuest.threshold} commissions toward next major threat`}</Text>
            </View>
          ) : null}

          <View style={s.detailPanel}>
            <Text style={s.detailLabel}>Travel</Text>
            <Text style={s.detailRegionSmall}>{expedition?.travelMethod ?? travel?.travelMethod ?? "Guild route"}</Text>
            <Text style={s.detailBody}>{travel?.routeNote}</Text>
            <Text style={s.returnStone}>{expedition?.returnStoneNote}</Text>
          </View>

          <View style={s.aldricReasonPanel}>
            <Text style={s.detailLabel}>Aldric's Reason</Text>
            <Text style={s.detailBody}>{expedition?.aldricReason ?? commission?.rationale}</Text>
          </View>

          <View style={s.detailPanel}>
            <Text style={s.detailLabel}>Real-world completion</Text>
            <Text style={s.detailBody}>{expedition?.realWorldAction ?? "Complete a valid training, recovery, nutrition, or walking action."}</Text>
            {(quest?.tasks ?? []).map((task: any) => (
              <View key={task.id ?? task.description} style={s.detailTask}>
                <Text style={s.detailTaskText}>{task.description}</Text>
                <Text style={[s.detailTaskCount, task.completed && { color: "#7cc79b" }]}>{task.currentValue ?? 0}/{task.targetValue ?? 1} {task.unit}</Text>
              </View>
            ))}
          </View>

          <View style={s.detailPanel}>
            <Text style={s.detailSectionTitle}>Choose a completion path</Text>
            {paths.length === 1 ? <Text style={s.pathGuidance}>This commission leaves little room for improvisation. The Guild wants this handled cleanly.</Text> : null}
            {paths.length > 1 ? <Text style={s.pathGuidance}>Aldric has approved more than one route. Choose the one you can complete honestly today.</Text> : null}
            {paths.map((path: any) => (
              <TouchableOpacity key={path.id} style={[s.pathButton, path.recommended && s.pathButtonRecommended]} onPress={() => onStartPath(path)} disabled={isStarting} activeOpacity={0.82}>
                <View style={{ flex: 1 }}>
                  <Text style={s.pathButtonTitle}>{path.label}</Text>
                  {path.narrative ? <Text style={s.pathButtonNarrative}>{path.narrative}</Text> : null}
                  <Text style={s.pathButtonMeta}>{path.kind.replace(/_/g, " ")}</Text>
                </View>
                {path.recommended ? <Text style={s.pathRecommended}>Best</Text> : null}
              </TouchableOpacity>
            ))}
            {paths.length === 0 ? <Text style={s.pathGuidance}>The Guild is still preparing this route. Return to the Hall or refresh the commission board.</Text> : null}
            {isStarting ? <ActivityIndicator color="#d9ad63" style={{ marginTop: 10 }} /> : null}
          </View>

          <View style={s.detailReward}>
            <View>
              <Text style={s.rewardLabel}>Reward</Text>
              <Text style={s.rewardXp}>+{quest?.xpReward ?? 0} XP</Text>
            </View>
            <View style={s.rewardDivider} />
            <View>
              <Text style={s.rewardLabel}>Gold</Text>
              <Text style={s.rewardGold}>+{quest?.goldReward ?? 0}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function AldricPanel({ hall, onOpen }: { hall: any; onOpen: () => void }) {
  const trend = hall?.counsel?.trendSummary;
  return (
    <View style={s.aldricPanel}>
      <View style={s.aldricImageFrame}>
        <Image source={ALDRIC_IMAGE} style={s.aldricImage} resizeMode="cover" />
      </View>
      <View style={s.aldricContent}>
        <View style={s.aldricTitleRow}>
          <Text style={s.aldricTitle}>Grandmaster Aldric</Text>
          <Text style={s.aldricGrade}>MYTHRIL GRADE</Text>
        </View>
        <Text style={s.aldricCounsel}>{hall?.counsel?.message ?? "Discipline is built in small, honored actions. Return with facts."}</Text>
        {trend && (
          <View style={s.trendGrid}>
            <View style={s.trendBox}><Text style={s.trendLabel}>Recent work</Text><Text style={s.trendValue}>{trend.recentWorkouts}</Text></View>
            <View style={s.trendBox}><Text style={s.trendLabel}>Style</Text><Text style={s.trendValue} numberOfLines={1}>{trend.dominantStyle ?? "forming"}</Text></View>
            <View style={s.trendBox}><Text style={s.trendLabel}>PRs</Text><Text style={s.trendValue}>{trend.recentPrs}</Text></View>
          </View>
        )}
        <TouchableOpacity style={s.audienceBtn} onPress={onOpen}>
          <Text style={s.audienceBtnText}>Private Audience</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: playerData, loading: playerLoading } = usePlayer();
  const player = playerData as PlayerSummary;
  const { data: hall, isLoading: hallLoading } = useGetGuildHallToday();
  const { data: dailyQuestData } = useGetDailyQuest();
  const [aldricOpen, setAldricOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [reportResult, setReportResult] = useState<any | null>(null);
  const [reporting, setReporting] = useState(false);
  const createSession = useCreateWorkoutSession();

  const isLoading = playerLoading || hallLoading;
  const hallAny = hall as any;
  const commission = hallAny?.commission as any;
  const quest = commission?.quest ?? dailyQuestData;
  const dailyQuest = dailyQuestData as any;
  const questTasks = (quest?.tasks ?? commission?.tasks ?? []) as any[];
  const completedTasks = questTasks.filter((task) => task.completed).length;
  const allDone = questTasks.length > 0 && completedTasks === questTasks.length;
  const xpPct = player ? Math.min(100, Math.round((player.xp / player.xpToNextLevel) * 100)) : 0;
  const rankColor = gradeColor(player?.rank);

  const reportToGuildmaster = async () => {
    if (reporting) return;
    setReporting(true);
    try {
      const result = await customFetch<any>("/api/guild-hall/report", { method: "POST" });
      setReportResult(result);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["/api/guild-hall/today"] }),
        qc.invalidateQueries({ queryKey: ["/api/player"] }),
        qc.invalidateQueries({ queryKey: ["/api/daily-quest"] }),
      ]);
      Alert.alert(
        result.reported ? "Commission recorded" : "Commission remains open",
        result.counsel ?? result.aldric?.counsel ?? "Aldric has recorded your report."
      );
      setAldricOpen(true);
    } catch {
      Alert.alert("Report failed", "Your progress is safe. Try reporting again from the Guild Hall.");
    } finally {
      setReporting(false);
    }
  };

  const startCommissionPath = (path: any) => {
    if (path?.kind === "program") {
      setCommissionOpen(false);
      router.push("/training/program" as any);
      return;
    }
    if (path?.kind === "workout_builder") {
      setCommissionOpen(false);
      router.push("/training/planner" as any);
      return;
    }
    createSession.mutate(
      {
        data: {
          name: `${path?.label ?? "Commission Session"} - ${commission?.location?.name ?? "Aethoria"}`,
          templateId: undefined as any,
          notes: buildCommissionNote(commission, path),
        },
      },
      {
        onSuccess: (session: any) => {
          setCommissionOpen(false);
          router.push(`/training/session/${session.id}` as any);
        },
        onError: () => Alert.alert("Session failed", "Could not start this commission path."),
      },
    );
  };

  return (
    <View style={[s.root, { backgroundColor: "#0a0908" }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.hallLabel}>GUILD HALL - AETHORIA</Text>
            <Text style={s.hallTitle}>Guild Hall</Text>
            <Text style={s.hallSub}>Train. Fuel. Recover. Endure.</Text>
          </View>
          <TouchableOpacity style={s.aldricBtn} onPress={() => setAldricOpen(true)}>
            <Text style={s.aldricBtnText}>Aldric</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={s.loadingBlock}>
            <ActivityIndicator color="#d9ad63" />
            <Text style={s.loadingText}>Opening the Guild ledger...</Text>
          </View>
        ) : (
          <>
            <WorldDangerPanel danger={hallAny?.worldDanger} />
            <AldricPanel hall={hallAny} onOpen={() => setAldricOpen(true)} />

            <TouchableOpacity
              style={[s.reportBtn, reporting && { opacity: 0.65 }]}
              onPress={reportToGuildmaster}
              activeOpacity={0.85}
              disabled={reporting}
            >
              {reporting ? <ActivityIndicator color="#f1dfc6" size="small" /> : <Feather name="message-circle" size={18} color="#f1dfc6" />}
              <Text style={s.reportBtnText}>{reporting ? "REPORTING..." : "REPORT TO THE GUILDMASTER"}</Text>
            </TouchableOpacity>

            {player && (
              <View style={s.statStrip}>
                <View style={s.statCell}>
                  <Feather name="award" size={16} color={rankColor} />
                  <Text style={[s.stripValue, { color: rankColor }]}>{formatGuildGrade(player.rank)}</Text>
                  <Text style={s.stripLabel}>Grade</Text>
                </View>
                <View style={s.statCell}>
                  <Feather name="star" size={16} color="#d8c4a5" />
                  <Text style={s.stripValue}>Lv. {player.level}</Text>
                  <Text style={s.stripLabel}>Level</Text>
                </View>
                <View style={s.statCell}>
                  <Feather name="activity" size={16} color="#dc7540" />
                  <Text style={s.stripValue}>{hallAny?.player?.streakDays ?? 0} days</Text>
                  <Text style={s.stripLabel}>Streak</Text>
                </View>
                <View style={[s.statCell, { borderRightWidth: 0 }]}>
                  <Feather name="book-open" size={16} color="#55a6a1" />
                  <Text style={[s.stripValue, { color: "#55a6a1" }]}>Ch. {hallAny?.campaign?.chapter ?? 1}</Text>
                  <Text style={s.stripLabel}>Campaign</Text>
                </View>
              </View>
            )}

            {commission && quest && (
              <TouchableOpacity style={[s.card, { backgroundColor: "#11100e", borderColor: "#514332", marginTop: 14, padding: 0 }]} onPress={() => setCommissionOpen(true)} activeOpacity={0.88}>
                <View style={s.commissionHeader}>
                  <View>
                    <Text style={s.commissionHeading}>Today's Commission</Text>
                    <Text style={s.commissionMeta}>
                      {completedTasks} of {questTasks.length} duties complete - {commission.category ?? "training"} - Open Commission
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    {commission.expedition?.region?.regionName ? <Text style={s.regionPill}>{commission.expedition.region.regionName}</Text> : null}
                    <Text style={s.resetLabel}>Resets at midnight</Text>
                  </View>
                </View>

                {commission.rationale && <Text style={s.rationale}>{commission.rationale}</Text>}

                {(commission.location || commission.travel) && (
                  <View style={s.locationGrid}>
                    <View style={s.locationBox}>
                      <Text style={s.locationLabel}>Location</Text>
                      <Text style={s.locationTitle}>{commission.location?.name ?? "Guild territory"}</Text>
                      <Text style={s.locationMeta}>{commission.location?.region ?? "Aethoria"}</Text>
                    </View>
                    <View style={s.locationBox}>
                      <Text style={s.locationLabel}>Travel Ledger</Text>
                      <Text style={s.locationTitle}>
                        {commission.travel?.onFootMiles ?? commission.travel?.footMiles ?? 0} mi on foot
                        {commission.travel?.caravanMiles ? ` - ${commission.travel.caravanMiles} mi by caravan` : ""}
                        {commission.travel?.mountMiles ? ` - ${commission.travel.mountMiles} mi by mount` : ""}
                      </Text>
                      <Text style={s.locationMeta}>Return stone route pending Guild approval.</Text>
                    </View>
                  </View>
                )}

                {questTasks.map((task, index) => {
                  const target = Number(task.target ?? 1);
                  const current = Number(task.current ?? (task.completed ? target : 0));
                  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : task.completed ? 100 : 0;
                  return (
                    <View key={task.id ?? index} style={s.taskRow}>
                      <View style={s.taskNumber}><Text style={s.taskNumberText}>{index + 1}</Text></View>
                      <View style={{ flex: 1 }}>
                        <View style={s.taskTop}>
                          <Text style={[s.taskDesc, { color: task.completed ? "#9d8f80" : "#eee5d7" }]}>{task.description}</Text>
                          <Text style={s.taskProgress}>{current}/{target}</Text>
                        </View>
                        <View style={s.taskTrack}><View style={[s.xpFill, { width: `${pct}%` }]} /></View>
                      </View>
                    </View>
                  );
                })}

                <View style={s.rewardFooter}>
                  <View>
                    <Text style={s.rewardLabel}>Commission reward</Text>
                    <Text style={s.rewardXp}>+{quest.xpReward ?? commission.rewards?.xp ?? 0} XP</Text>
                  </View>
                  <View style={s.rewardDivider} />
                  <View>
                    <Text style={s.rewardLabel}>Guild gold</Text>
                    <Text style={s.rewardGold}>+{quest.goldReward ?? commission.rewards?.gold ?? 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {hallAny?.hallOfferings && (
              <View style={[s.card, { backgroundColor: "#11100e", borderColor: "#514332", marginTop: 14 }]}>
                <View style={s.offerHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.commissionHeading}>{hallAny.hallOfferings.title}</Text>
                    <Text style={s.offeringLore}>{hallAny.hallOfferings.lore}</Text>
                  </View>
                  <TouchableOpacity style={s.offerOpenBtn} onPress={() => router.push("/(tabs)/inventory" as any)}>
                    <Text style={s.offerOpenText}>Open</Text>
                  </TouchableOpacity>
                </View>
                {(hallAny.hallOfferings.preview ?? []).map((item: any) => (
                  <View key={item.id ?? item.name} style={s.offeringRow}>
                    <Text style={s.offeringName}>{item.name}</Text>
                    <Text style={s.offeringMeta}>{item.rarity} - {item.goldCost} gold</Text>
                  </View>
                ))}
              </View>
            )}

            {(hallAny?.equippedGear?.length ?? 0) > 0 && (
              <View style={s.affinityPanel}>
                <Feather name="zap" size={18} color="#53aeb0" />
                <View style={{ flex: 1 }}>
                  <Text style={s.affinityLabel}>System affinity</Text>
                  <Text style={s.affinityText} numberOfLines={2}>
                    {hallAny.equippedGear.map((gear: any) => `${gear.name}: ${gear.elementalAffinity ?? gear.affinity ?? "latent"}`).join(" | ")}
                  </Text>
                </View>
              </View>
            )}

            {(hallAny?.worldEvents?.length ?? 0) > 0 && (
              <View style={s.worldMemoryPanel}>
                <Text style={s.worldMemoryTitle}>The world remembers</Text>
                <Text style={s.worldMemoryText}>{hallAny.worldEvents[0]?.description}</Text>
              </View>
            )}

            <Text style={[s.footerMotto, { color: allDone ? "#69a97b" : "#7e776d" }]}>
              {allDone ? "The Guild is ready to receive your report." : "Consistency is the weapon. The next action is enough."}
            </Text>
          </>
        )}

      </ScrollView>

      <AldricChatModal visible={aldricOpen} onClose={() => setAldricOpen(false)} initialReport={reportResult} />
      <CommissionDetailModal
        visible={commissionOpen}
        onClose={() => setCommissionOpen(false)}
        commission={commission}
        onStartPath={startCommissionPath}
        isStarting={createSession.isPending}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  hallLabel: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", fontFamily: "Inter_400Regular", textTransform: "uppercase" },
  hallTitle: { fontSize: 22, fontWeight: "900", color: "#eee5d7", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2 },
  hallSub: { fontSize: 10, letterSpacing: 2, color: "#9f9586", fontFamily: "Inter_400Regular", textTransform: "uppercase", marginTop: 2 },
  aldricBtn: { borderWidth: 1, borderColor: "#8c6a36", backgroundColor: "#15130f", paddingHorizontal: 12, paddingVertical: 6 },
  aldricBtnText: { color: "#d9ad63", fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  card: { borderWidth: 1, borderRadius: 0, padding: 14 },
  loadingBlock: { minHeight: 240, borderWidth: 1, borderColor: "#514332", backgroundColor: "#11100e", alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#9d8f80", fontSize: 12, fontFamily: "Inter_400Regular" },
  dangerCard: { borderWidth: 1, backgroundColor: "#140f0e", padding: 14, marginBottom: 14 },
  dangerHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  dangerTitle: { fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2 },
  dangerValueBox: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#120d0c" },
  dangerValue: { fontSize: 12, fontWeight: "900", fontFamily: "Inter_700Bold" },
  dangerTrack: { height: 8, backgroundColor: "#2a1815", overflow: "hidden", marginTop: 12 },
  dangerFill: { height: 8 },
  dangerNote: { color: "#b7ab9c", fontSize: 11, lineHeight: 17, marginTop: 10, fontFamily: "Inter_400Regular" },
  dangerStats: { flexDirection: "row", gap: 8, marginTop: 12 },
  dangerStat: { flex: 1, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 8 },
  dangerStatLabel: { color: "#80796f", fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  dangerStatValue: { color: "#d8c4a5", fontSize: 11, fontFamily: "Inter_700Bold", marginTop: 2 },
  aldricPanel: { overflow: "hidden", borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", marginBottom: 14 },
  aldricImageFrame: { width: "100%", aspectRatio: 16 / 9, maxHeight: 218, overflow: "hidden", backgroundColor: "#0c0b09" },
  aldricImage: { position: "absolute", left: 0, right: 0, top: "-7%", width: "100%", height: "124%" },
  aldricContent: { borderTopWidth: 1, borderTopColor: "#6b4d2f", padding: 14 },
  aldricTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  aldricTitle: { color: "#d9ad63", fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  aldricGrade: { borderWidth: 1, borderColor: "#72552e", color: "#d5a557", fontSize: 9, fontFamily: "Inter_700Bold", paddingHorizontal: 7, paddingVertical: 3 },
  aldricCounsel: { color: "#ded5c8", fontSize: 14, lineHeight: 22, fontFamily: "PlayfairDisplay_700Bold", marginTop: 8 },
  trendGrid: { flexDirection: "row", gap: 6, marginTop: 12 },
  trendBox: { flex: 1, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 8, alignItems: "center" },
  trendLabel: { color: "#8f887d", fontSize: 9, fontFamily: "Inter_400Regular" },
  trendValue: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold", marginTop: 2 },
  audienceBtn: { marginTop: 12, borderWidth: 1, borderColor: "#8c6a36", paddingVertical: 10, alignItems: "center", backgroundColor: "#15130f" },
  audienceBtnText: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 2 },
  reportBtn: { minHeight: 54, borderWidth: 1, borderColor: "#c08c4e", backgroundColor: "#74291f", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 14 },
  reportBtnText: { color: "#f1dfc6", fontSize: 14, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold", letterSpacing: 1 },
  statStrip: { flexDirection: "row", borderWidth: 1, borderColor: "#514332", backgroundColor: "#11100e", marginBottom: 14 },
  statCell: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 64, borderRightWidth: 1, borderRightColor: "#3b3328", paddingHorizontal: 4 },
  stripValue: { color: "#e2d8ca", fontSize: 13, fontFamily: "PlayfairDisplay_700Bold", textAlign: "center" },
  stripLabel: { color: "#80796f", fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_400Regular", marginTop: 3 },
  stripXpTrack: { width: "80%", height: 3, backgroundColor: "#2a2520", marginTop: 5, overflow: "hidden" },
  commissionHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#3b3328", padding: 14, gap: 10 },
  commissionHeading: { color: "#d9ad63", fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  commissionMeta: { color: "#8f887d", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  regionPill: { borderWidth: 1, borderColor: "#6b4d2f", color: "#d9ad63", paddingHorizontal: 7, paddingVertical: 3, fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase", textAlign: "right" },
  resetLabel: { color: "#8f887d", fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase", textAlign: "right" },
  rationale: { color: "#b7ab9c", fontSize: 12, lineHeight: 19, fontFamily: "Inter_400Regular", padding: 14, borderBottomWidth: 1, borderBottomColor: "#3b3328" },
  locationGrid: { gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: "#3b3328" },
  locationBox: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 10 },
  locationLabel: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_400Regular", marginBottom: 4 },
  locationTitle: { color: "#d8c4a5", fontSize: 12, fontFamily: "Inter_700Bold", lineHeight: 17 },
  locationMeta: { color: "#9d8f80", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  taskRow: { flexDirection: "row", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: "#2b261f" },
  taskNumber: { width: 20, height: 20, borderWidth: 1, borderColor: "#6b4d2f", alignItems: "center", justifyContent: "center", marginTop: 1 },
  taskNumberText: { color: "#d9ad63", fontSize: 10, fontFamily: "Inter_700Bold" },
  taskTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  taskDesc: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  taskProgress: { color: "#d8c4a5", fontSize: 10, fontFamily: "Inter_700Bold" },
  taskTrack: { height: 4, backgroundColor: "#2a2520", marginTop: 8, overflow: "hidden" },
  rewardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, padding: 14 },
  rewardLabel: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_400Regular", textAlign: "center" },
  rewardDivider: { height: 32, width: 1, backgroundColor: "#3b3328" },
  offerHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  offeringLore: { color: "#8f887d", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 4 },
  offerOpenBtn: { borderWidth: 1, borderColor: "#6b4d2f", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#15130f" },
  offerOpenText: { color: "#d9ad63", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  offeringRow: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 10, marginTop: 7 },
  offeringName: { color: "#d8c4a5", fontSize: 13, fontFamily: "PlayfairDisplay_700Bold" },
  offeringMeta: { color: "#8f887d", fontSize: 10, fontFamily: "Inter_400Regular", textTransform: "uppercase", marginTop: 2 },
  affinityPanel: { flexDirection: "row", alignItems: "center", gap: 10, borderLeftWidth: 2, borderLeftColor: "#428f91", backgroundColor: "#10191a", paddingHorizontal: 12, paddingVertical: 12, marginTop: 14 },
  affinityLabel: { color: "#73999a", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.4 },
  affinityText: { color: "#d8e4e3", fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 2 },
  worldMemoryPanel: { borderWidth: 1, borderColor: "#6a3028", backgroundColor: "#1b1110", padding: 12, marginTop: 14 },
  worldMemoryTitle: { color: "#d48b73", fontSize: 15, fontFamily: "PlayfairDisplay_700Bold" },
  worldMemoryText: { color: "#baa9a2", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 4 },
  footerMotto: { textAlign: "center", marginTop: 14, fontSize: 11, fontFamily: "Inter_400Regular" },
  playerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  rankBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 4 },
  rankText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 2, textTransform: "uppercase" },
  playerName: { fontSize: 18, fontWeight: "900", color: "#eee5d7", fontFamily: "PlayfairDisplay_700Bold" },
  playerLevel: { fontSize: 11, color: "#9d8f80", fontFamily: "Inter_400Regular", marginTop: 2 },
  goldBlock: { alignItems: "flex-end" },
  goldAmount: { fontSize: 20, fontWeight: "900", color: "#d9ad63", fontFamily: "PlayfairDisplay_700Bold" },
  goldLabel: { fontSize: 9, color: "#9d8f80", fontFamily: "Inter_400Regular", letterSpacing: 2, textTransform: "uppercase" },
  xpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  xpLabel: { fontSize: 10, color: "#9d8f80", fontFamily: "Inter_400Regular" },
  xpPct: { fontSize: 10, color: "#d9ad63", fontFamily: "Inter_700Bold" },
  xpTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  xpFill: { height: 4, backgroundColor: "#d9ad63" },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", textTransform: "uppercase", marginBottom: 6, fontFamily: "Inter_400Regular" },
  commissionTitle: { fontSize: 15, fontWeight: "700", color: "#eee5d7", fontFamily: "PlayfairDisplay_700Bold", marginBottom: 4 },
  commissionDesc: { fontSize: 12, lineHeight: 18 },
  taskRowSmall: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 2 },
  taskDescSmall: { fontSize: 12, flex: 1, lineHeight: 18 },
  rewardRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  rewardXp: { fontSize: 11, color: "#0dcef5", fontWeight: "700", fontFamily: "Inter_700Bold" },
  rewardGold: { fontSize: 11, color: "#d9ad63", fontWeight: "700", fontFamily: "Inter_700Bold" },
  goTrainBtn: { marginTop: 12, borderWidth: 1, borderColor: "#8c6a36", padding: 10, alignItems: "center" },
  goTrainText: { color: "#d9ad63", fontSize: 11, fontWeight: "700", letterSpacing: 2, fontFamily: "Inter_700Bold" },
  navGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  navTile: { width: "47%", borderWidth: 1, padding: 16, alignItems: "center", gap: 8 },
  navTileLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  // Chat
  chatRoot: { flex: 1 },
  chatHeader: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  chatTitle: { fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  chatSub: { fontSize: 11, marginTop: 2 },
  closeBtn: { position: "absolute", right: 20, top: 12 },
  reportSummary: { borderLeftWidth: 2, borderLeftColor: "#9d3e2a", backgroundColor: "#1b1511", padding: 12, gap: 5 },
  reportSummaryTitle: { color: "#d9ad63", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.6 },
  reportSummaryText: { color: "#d6ccbe", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  reportSummaryMeta: { color: "#a99f92", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  audienceInfo: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 12, gap: 8 },
  audienceInfoKicker: { color: "#8f887d", fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 2 },
  audienceInfoText: { color: "#cfc5b8", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  questionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  questionChip: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#15130f", paddingHorizontal: 8, paddingVertical: 6 },
  questionText: { color: "#d9ad63", fontSize: 10, lineHeight: 14, fontFamily: "Inter_700Bold" },
  chatEmpty: { textAlign: "center", fontStyle: "italic", marginTop: 32, fontSize: 13 },
  bubble: { borderWidth: 1, borderRadius: 8, padding: 12, maxWidth: "88%" },
  bubbleSender: { fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontFamily: "Inter_700Bold" },
  bubbleText: { fontSize: 13, lineHeight: 20 },
  chatInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  chatInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, maxHeight: 90 },
  sendBtn: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  detailRoot: { flex: 1, backgroundColor: "#080706", paddingHorizontal: 16 },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderBottomWidth: 1, borderBottomColor: "#6b4d2f", paddingBottom: 12 },
  detailKicker: { color: "#9d8f80", fontSize: 9, letterSpacing: 2.4, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  detailTitle: { color: "#eee5d7", fontSize: 22, lineHeight: 28, fontFamily: "PlayfairDisplay_700Bold", marginTop: 3 },
  detailClose: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", paddingHorizontal: 12, paddingVertical: 8 },
  detailCloseText: { color: "#d9ad63", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  detailContent: { paddingTop: 14, paddingBottom: 28, gap: 12 },
  detailPanel: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 14 },
  aldricReasonPanel: { borderLeftWidth: 2, borderLeftColor: "#9d3e2a", backgroundColor: "#1b1511", padding: 14 },
  detailLabel: { color: "#8f887d", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  detailRegion: { color: "#d9ad63", fontSize: 21, fontFamily: "PlayfairDisplay_700Bold", marginTop: 4 },
  detailRegionSmall: { color: "#d9ad63", fontSize: 15, fontFamily: "PlayfairDisplay_700Bold", marginTop: 4 },
  detailMeta: { color: "#9f9586", fontSize: 11, lineHeight: 16, marginTop: 2, fontFamily: "Inter_400Regular" },
  detailBody: { color: "#cfc5b8", fontSize: 12, lineHeight: 19, marginTop: 8, fontFamily: "Inter_400Regular" },
  badgeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  trainingBadge: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#15130f", color: "#49a3a0", paddingHorizontal: 7, paddingVertical: 4, fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  returnStone: { color: "#c4b5fd", fontSize: 11, lineHeight: 17, marginTop: 8, fontFamily: "Inter_400Regular" },
  detailTask: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderWidth: 1, borderColor: "#2a2520", backgroundColor: "#0c0b09", padding: 10, marginTop: 8 },
  detailTaskText: { flex: 1, color: "#d8c4a5", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  detailTaskCount: { color: "#d9ad63", fontSize: 10, fontFamily: "Inter_700Bold" },
  detailSectionTitle: { color: "#d9ad63", fontSize: 16, fontFamily: "PlayfairDisplay_700Bold" },
  tidingPanel: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#15100c", padding: 18, gap: 8 },
  tidingInset: { borderLeftWidth: 2, borderLeftColor: "#d9ad63", paddingLeft: 12, marginTop: 4, gap: 4 },
  tidingLabel: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  tidingText: { color: "#d8c4a5", fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  majorQuestReady: { borderColor: "#9d3e2a", backgroundColor: "#1b1010" },
  pathButton: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 12, marginTop: 8 },
  pathButtonRecommended: { borderColor: "#49a3a0" },
  pathButtonTitle: { color: "#eee5d7", fontSize: 13, lineHeight: 18, fontFamily: "Inter_700Bold" },
  pathButtonNarrative: { color: "#c9b99e", fontSize: 11, lineHeight: 16, marginTop: 5, fontFamily: "Inter_400Regular" },
  pathButtonMeta: { color: "#8f887d", fontSize: 10, textTransform: "uppercase", marginTop: 3, fontFamily: "Inter_400Regular" },
  pathGuidance: { color: "#b6aa97", fontSize: 12, lineHeight: 18, marginTop: 8, fontFamily: "Inter_400Regular" },
  pathRecommended: { borderWidth: 1, borderColor: "#49a3a0", color: "#49a3a0", paddingHorizontal: 7, paddingVertical: 3, fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  detailReward: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 14 },
});
