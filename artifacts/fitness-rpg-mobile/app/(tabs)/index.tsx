import {
  customFetch,
  useGetGuildHallToday,
  useGetGuildMasterConversation,
  useSendGuildMasterMessage,
  useGetDailyQuest,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { data, loading };
}

type ChatLine = { id: string; role: "user" | "assistant"; content: string };

function AldricChatModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: history } = useGetGuildMasterConversation();
  const sendMsg = useSendGuildMasterMessage();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [localLines, setLocalLines] = useState<ChatLine[]>([]);

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

  const send = () => {
    const text = input.trim();
    if (!text || sendMsg.isPending) return;
    setInput("");
    const userLine: ChatLine = { id: Date.now().toString(), role: "user", content: text };
    setLocalLines((prev) => [...prev, userLine]);
    sendMsg.mutate(
      { data: { content: text, conversationId: history?.conversationId ?? 0 } },
      {
        onSuccess: (res: any) => {
          const reply: ChatLine = { id: Date.now().toString() + "a", role: "assistant", content: res.message ?? res.content ?? "" };
          setLocalLines((prev) => [...prev, reply]);
          qc.invalidateQueries({ queryKey: ["/api/guild-master/conversation"] });
        },
        onError: () => Alert.alert("Error", "Aldric is unavailable right now."),
      }
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[s.chatRoot, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[s.chatHeader, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
          <Text style={[s.chatTitle, { color: "#d9ad63" }]}>Grandmaster Aldric</Text>
          <Text style={[s.chatSub, { color: colors.mutedForeground }]}>Guild Hall · Aethoria</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={{ color: colors.mutedForeground, fontSize: 22 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {localLines.length === 0 && (
            <Text style={[s.chatEmpty, { color: colors.mutedForeground }]}>
              The Grandmaster awaits your report, hunter.
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
          {sendMsg.isPending && (
            <View style={[s.bubble, { backgroundColor: "#1a1814", borderColor: "#3b3328", alignSelf: "flex-start" }]}>
              <Text style={{ color: colors.mutedForeground, fontSize: 18 }}>· · ·</Text>
            </View>
          )}
        </ScrollView>
        <View style={[s.chatInputRow, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={[s.chatInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="Report to Aldric…"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: "#d9ad63", opacity: sendMsg.isPending || !input.trim() ? 0.5 : 1 }]}
            onPress={send}
            disabled={sendMsg.isPending || !input.trim()}
          >
            <Text style={{ color: "#000", fontWeight: "700", fontSize: 16 }}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const RANK_COLORS: Record<string, string> = {
  E: "#9ca3af", D: "#22c55e", C: "#a855f7", B: "#f97316", A: "#ef4444", S: "#eab308",
};

export default function HallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: player, loading: playerLoading } = usePlayer();
  const { data: hall, isLoading: hallLoading } = useGetGuildHallToday();
  const { data: dailyQuestData } = useGetDailyQuest();
  const [aldricOpen, setAldricOpen] = useState(false);

  const isLoading = playerLoading || hallLoading;
  const commission = hall?.commission as any;
  const dailyQuest = dailyQuestData as any;
  const xpPct = player ? Math.min(100, Math.round((player.xp / player.xpToNextLevel) * 100)) : 0;
  const rankColor = RANK_COLORS[player?.rank ?? "E"] ?? "#9ca3af";

  return (
    <View style={[s.root, { backgroundColor: "#0a0908" }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.hallLabel}>GUILD HALL · AETHORIA</Text>
            <Text style={s.hallTitle}>Ascension Quest</Text>
          </View>
          <TouchableOpacity style={s.aldricBtn} onPress={() => setAldricOpen(true)}>
            <Text style={s.aldricBtnText}>⚔ Aldric</Text>
          </TouchableOpacity>
        </View>

        {/* Player card */}
        {isLoading ? (
          <View style={[s.card, { backgroundColor: "#171510", borderColor: "#3b3328", height: 90 }]} />
        ) : player ? (
          <View style={[s.card, { backgroundColor: "#171510", borderColor: "#3b3328" }]}>
            <View style={s.playerRow}>
              <View>
                <View style={[s.rankBadge, { borderColor: rankColor + "60" }]}>
                  <Text style={[s.rankText, { color: rankColor }]}>{player.rank}-Rank Hunter</Text>
                </View>
                <Text style={s.playerName}>{player.name ?? "Hunter"}</Text>
                <Text style={s.playerLevel}>Level {player.level}</Text>
              </View>
              <View style={s.goldBlock}>
                <Text style={s.goldAmount}>{player.gold.toLocaleString()}</Text>
                <Text style={s.goldLabel}>GOLD</Text>
              </View>
            </View>
            <View style={s.xpRow}>
              <Text style={s.xpLabel}>XP — {player.xp.toLocaleString()} / {player.xpToNextLevel.toLocaleString()}</Text>
              <Text style={s.xpPct}>{xpPct}%</Text>
            </View>
            <View style={[s.xpTrack, { backgroundColor: "#2a2520" }]}>
              <View style={[s.xpFill, { width: `${xpPct}%` }]} />
            </View>
          </View>
        ) : null}

        {/* Today's commission */}
        {commission && (
          <View style={[s.card, { backgroundColor: "#171510", borderColor: "#8c6a36", marginTop: 12 }]}>
            <Text style={s.sectionLabel}>TODAY'S COMMISSION</Text>
            <Text style={s.commissionTitle}>{commission.title ?? commission.quest?.title ?? "Active Commission"}</Text>
            {commission.description && (
              <Text style={[s.commissionDesc, { color: colors.mutedForeground }]}>{commission.description}</Text>
            )}
            {commission.tasks && commission.tasks.length > 0 && (
              <View style={{ marginTop: 8, gap: 4 }}>
                {(commission.tasks as any[]).map((task: any, i: number) => (
                  <View key={i} style={s.taskRowSmall}>
                    <Text style={{ color: task.completed ? "#22c55e" : "#d9ad63", fontSize: 12 }}>
                      {task.completed ? "✓" : "○"}
                    </Text>
                    <Text style={[s.taskDescSmall, { color: task.completed ? colors.mutedForeground : colors.foreground }]}>
                      {task.description}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={s.goTrainBtn}
              onPress={() => router.push("/(tabs)/training")}
              activeOpacity={0.8}
            >
              <Text style={s.goTrainText}>GO TO TRAINING →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Daily Quest */}
        {dailyQuest && (
          <View style={[s.card, { backgroundColor: "#171510", borderColor: "#3b3328", marginTop: 12 }]}>
            <Text style={s.sectionLabel}>DAILY QUEST</Text>
            <Text style={s.commissionTitle}>{dailyQuest.title}</Text>
            <View style={s.rewardRow}>
              <Text style={s.rewardXp}>+{dailyQuest.xpReward} XP</Text>
              <Text style={s.rewardGold}>+{dailyQuest.goldReward} Gold</Text>
            </View>
            {dailyQuest.tasks && (dailyQuest.tasks as any[]).map((t: any, i: number) => (
              <View key={i} style={s.taskRowSmall}>
                <Text style={{ color: t.completed ? "#22c55e" : "#6b5d4f", fontSize: 12 }}>
                  {t.completed ? "✓" : "○"}
                </Text>
                <Text style={[s.taskDescSmall, { color: t.completed ? colors.mutedForeground : colors.foreground }]}>
                  {t.description}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Nav tiles */}
        <View style={s.navGrid}>
          {[
            { label: "Training Yard", icon: "⚔️", route: "/(tabs)/training" },
            { label: "Nutrition", icon: "🍖", route: "/(tabs)/nutrition" },
            { label: "Chronicle", icon: "📖", route: "/(tabs)/battle-log" },
            { label: "Character", icon: "🛡️", route: "/(tabs)/inventory" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[s.navTile, { backgroundColor: "#171510", borderColor: "#3b3328" }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
              <Text style={[s.navTileLabel, { color: "#d8c4a5" }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <AldricChatModal visible={aldricOpen} onClose={() => setAldricOpen(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  hallLabel: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", fontFamily: "Inter_400Regular", textTransform: "uppercase" },
  hallTitle: { fontSize: 22, fontWeight: "900", color: "#eee5d7", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2 },
  aldricBtn: { borderWidth: 1, borderColor: "#8c6a36", backgroundColor: "#15130f", paddingHorizontal: 12, paddingVertical: 6 },
  aldricBtnText: { color: "#d9ad63", fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  card: { borderWidth: 1, borderRadius: 0, padding: 14 },
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
  chatEmpty: { textAlign: "center", fontStyle: "italic", marginTop: 32, fontSize: 13 },
  bubble: { borderWidth: 1, borderRadius: 8, padding: 12, maxWidth: "88%" },
  bubbleSender: { fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontFamily: "Inter_700Bold" },
  bubbleText: { fontSize: 13, lineHeight: 20 },
  chatInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  chatInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, maxHeight: 90 },
  sendBtn: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
