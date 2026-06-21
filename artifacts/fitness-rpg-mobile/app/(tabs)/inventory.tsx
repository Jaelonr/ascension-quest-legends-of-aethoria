import {
  customFetch,
  useGetInventory,
  useGetArmory,
  useEquipGear,
  useGetPlayerStyleIdentity,
} from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

type CharSummary = {
  player: any;
  gearSlots: Array<{ slot: string; label: string; item: any | null }>;
  titles: any[];
  biometrics: any;
  inventorySummary: { items: number; gear: number; equippedGear: number };
};

function useCharSummary() {
  const [data, setData] = useState<CharSummary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    customFetch<CharSummary>("/api/character/summary")
      .then((d) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { data, loading };
}

const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af", uncommon: "#22c55e", rare: "#3b82f6",
  epic: "#a855f7", legendary: "#eab308",
};

const STYLE_META: Record<string, { label: string; color: string }> = {
  strength:     { label: "Strength",     color: "#ef4444" },
  striking:     { label: "Striking",     color: "#f97316" },
  conditioning: { label: "Conditioning", color: "#0dcef5" },
  grappling:    { label: "Grappling",    color: "#a855f7" },
  recovery:     { label: "Recovery",     color: "#22c55e" },
  discipline:   { label: "Discipline",   color: "#eab308" },
};

const SLOT_EMOJIS: Record<string, string> = {
  weapon: "⚔️", offhand: "🛡️", helmet: "🪖", chest: "🧥",
  gloves: "🧤", boots: "👢", ring: "💍", necklace: "📿",
};

const RANK_COLORS: Record<string, string> = {
  E: "#9ca3af", D: "#22c55e", C: "#a855f7", B: "#f97316", A: "#ef4444", S: "#eab308",
};

type TabKey = "gear" | "inventory" | "identity";

export default function CharacterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("gear");

  const { data: char, loading: charLoading } = useCharSummary();
  const { data: armory, isLoading: armoryLoading } = useGetArmory();
  const { data: inventory, isLoading: inventoryLoading } = useGetInventory();
  const { data: identity } = useGetPlayerStyleIdentity();
  const equipGear = useEquipGear();

  const [selectedGear, setSelectedGear] = useState<any | null>(null);

  const handleEquip = (gearId: number, _slot: string) => {
    equipGear.mutate(
      { id: gearId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/armory"] });
          setSelectedGear(null);
        },
        onError: () => Alert.alert("Error", "Could not equip item."),
      }
    );
  };

  const player = char?.player;
  const rankColor = RANK_COLORS[player?.rank ?? "E"] ?? "#9ca3af";
  const xpPct = player ? Math.min(100, Math.round((player.xp / Math.max(1, player.xpToNextLevel)) * 100)) : 0;

  const identityTotal = identity
    ? ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"]
        .reduce((sum, k) => sum + ((identity as any)[k] ?? 0), 0)
    : 0;

  const isLoading = charLoading || armoryLoading;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0908" }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={cs.headerSub}>CHARACTER</Text>
        <Text style={cs.headerTitle}>{player?.name ?? "Hunter"}</Text>

        {/* Player stats */}
        {player && (
          <View style={[cs.card, { backgroundColor: "#171510", borderColor: "#3b3328" }]}>
            <View style={cs.statsRow}>
              <View style={cs.statBlock}>
                <View style={[cs.rankPill, { borderColor: rankColor + "60" }]}>
                  <Text style={[cs.rankText, { color: rankColor }]}>{player.rank}-Rank</Text>
                </View>
                <Text style={cs.levelText}>Level {player.level}</Text>
              </View>
              <View style={cs.statsGrid}>
                {[
                  { label: "XP", value: (player.xp ?? 0).toLocaleString(), color: "#0dcef5" },
                  { label: "Gold", value: (player.gold ?? 0).toLocaleString(), color: "#d9ad63" },
                  { label: "Sessions", value: (player.totalWorkouts ?? 0), color: "#eee5d7" },
                  { label: "PRs", value: (player.totalPrs ?? 0), color: "#eab308" },
                ].map((s) => (
                  <View key={s.label} style={cs.miniStat}>
                    <Text style={[cs.miniStatValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={cs.miniStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={cs.xpRow}>
              <Text style={cs.xpLabel}>XP to next level</Text>
              <Text style={cs.xpPct}>{xpPct}%</Text>
            </View>
            <View style={[cs.xpTrack, { backgroundColor: "#2a2520" }]}>
              <View style={[cs.xpFill, { width: `${xpPct}%` }]} />
            </View>
          </View>
        )}

        {/* Titles */}
        {char?.titles && char.titles.length > 0 && (
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {char.titles.slice(0, 3).map((t: any, i: number) => (
              <View key={i} style={[cs.titleBadge, { borderColor: "#8c6a3660" }]}>
                <Text style={cs.titleText}>{t.name ?? t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tabs */}
        <View style={cs.tabs}>
          {(["gear", "inventory", "identity"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[cs.tab, tab === t && cs.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[cs.tabText, { color: tab === t ? "#d9ad63" : "#6b5d4f" }]}>
                {t === "gear" ? "⚔ Gear" : t === "inventory" ? "🎒 Inventory" : "🔥 Identity"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gear tab */}
        {tab === "gear" && (
          <View>
            {isLoading ? (
              <ActivityIndicator color="#d9ad63" style={{ marginTop: 20 }} />
            ) : (
              <View style={{ gap: 8 }}>
                {(char?.gearSlots ?? []).map((slot) => {
                  const item = slot.item;
                  const rarityColor = item ? (RARITY_COLORS[item.rarity ?? "common"] ?? "#9ca3af") : "#3b3328";
                  return (
                    <TouchableOpacity
                      key={slot.slot}
                      style={[cs.gearSlot, { backgroundColor: "#171510", borderColor: item ? rarityColor + "50" : "#2a2520" }]}
                      onPress={() => item && setSelectedGear(item)}
                      activeOpacity={item ? 0.7 : 1}
                    >
                      <Text style={cs.slotEmoji}>{SLOT_EMOJIS[slot.slot] ?? "🔲"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={cs.slotLabel}>{slot.label}</Text>
                        {item ? (
                          <>
                            <Text style={[cs.slotItemName, { color: rarityColor }]}>{item.displayName ?? item.name}</Text>
                            <Text style={cs.slotRarity}>{item.rarity}</Text>
                          </>
                        ) : (
                          <Text style={cs.slotEmpty}>Empty slot</Text>
                        )}
                      </View>
                      {item && <Text style={{ color: "#3b3328", fontSize: 16 }}>›</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Inventory tab */}
        {tab === "inventory" && (
          <View>
            {inventoryLoading ? (
              <ActivityIndicator color="#d9ad63" style={{ marginTop: 20 }} />
            ) : !inventory || (inventory as any[]).length === 0 ? (
              <View style={[cs.empty, { borderColor: "#3b3328" }]}>
                <Text style={{ fontSize: 24 }}>🎒</Text>
                <Text style={[cs.emptyTitle, { color: colors.foreground }]}>Inventory empty</Text>
                <Text style={[cs.emptyDesc, { color: colors.mutedForeground }]}>
                  Purchase items from the store or earn them through combat.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {(inventory as any[]).map((item: any) => {
                  const rarityColor = RARITY_COLORS[item.rarity ?? "common"] ?? "#9ca3af";
                  return (
                    <View key={item.id} style={[cs.inventoryItem, { backgroundColor: "#171510", borderColor: rarityColor + "40" }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[cs.itemName, { color: rarityColor }]}>{item.displayName ?? item.name}</Text>
                        <Text style={cs.itemMeta}>{item.category} · {item.rarity}</Text>
                        {item.description && (
                          <Text style={[cs.itemDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                            {item.description}
                          </Text>
                        )}
                      </View>
                      {item.slot && (
                        <TouchableOpacity
                          style={cs.equipBtn}
                          onPress={() => handleEquip(item.id, item.slot)}
                          disabled={equipGear.isPending}
                        >
                          <Text style={cs.equipBtnText}>Equip</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Identity tab */}
        {tab === "identity" && (
          <View style={[cs.identityCard, { backgroundColor: "#171510", borderColor: "#3b3328" }]}>
            <Text style={cs.sectionLabel}>COMBAT STYLE IDENTITY</Text>
            {identity?.dominantStyle && (
              <Text style={[cs.dominantStyle, { color: STYLE_META[identity.dominantStyle]?.color ?? "#d9ad63" }]}>
                {STYLE_META[identity.dominantStyle]?.label} Fighter
                {identity.hybridArchetype ? ` · ${identity.hybridArchetype}` : ""}
              </Text>
            )}
            <Text style={[cs.identityNote, { color: colors.mutedForeground }]}>
              Built from {identity?.totalSessions ?? 0} training sessions. Shaped by every rep, set, and combat decision.
            </Text>
            {["strength", "striking", "conditioning", "grappling", "recovery", "discipline"].map((key) => {
              const val = (identity as any)?.[key] ?? 0;
              const pct = identityTotal > 0 ? Math.round((val / identityTotal) * 100) : 0;
              const meta = STYLE_META[key]!;
              return (
                <View key={key} style={cs.identityBarRow}>
                  <Text style={[cs.identityBarLabel, { color: meta.color }]}>{meta.label}</Text>
                  <View style={cs.identityBarTrack}>
                    <View style={[cs.identityBarFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
                  </View>
                  <Text style={cs.identityBarPct}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Gear detail modal */}
      {selectedGear && (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedGear(null)}>
          <View style={[gm.root, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity style={gm.closeRow} onPress={() => setSelectedGear(null)}>
              <Text style={{ color: colors.mutedForeground, fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
              <Text style={[gm.itemRarity, { color: RARITY_COLORS[selectedGear.rarity ?? "common"] }]}>
                {selectedGear.rarity?.toUpperCase()} · {selectedGear.slot?.replace(/_/g, " ").toUpperCase()}
              </Text>
              <Text style={[gm.itemName, { color: colors.foreground }]}>{selectedGear.displayName ?? selectedGear.name}</Text>
              {selectedGear.description && (
                <Text style={[gm.itemDesc, { color: colors.mutedForeground }]}>{selectedGear.description}</Text>
              )}
              {selectedGear.lore && (
                <View style={[gm.loreBlock, { borderColor: "#3b3328" }]}>
                  <Text style={[gm.loreText, { color: colors.mutedForeground }]}>{selectedGear.lore}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const cs = StyleSheet.create({
  headerSub: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#eee5d7", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2, marginBottom: 16 },
  card: { borderWidth: 1, padding: 14, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statBlock: { justifyContent: "center", gap: 6 },
  rankPill: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  rankText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  levelText: { fontSize: 13, color: "#9d8f80" },
  statsGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  miniStat: { minWidth: "45%", backgroundColor: "#0e0d0b", borderWidth: 1, borderColor: "#2a2520", padding: 8, alignItems: "center" },
  miniStatValue: { fontSize: 14, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  miniStatLabel: { fontSize: 9, color: "#9d8f80", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  xpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  xpLabel: { fontSize: 10, color: "#9d8f80" },
  xpPct: { fontSize: 10, color: "#d9ad63", fontWeight: "700" },
  xpTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  xpFill: { height: 4, backgroundColor: "#d9ad63" },
  titleBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  titleText: { fontSize: 10, color: "#d9ad63", fontFamily: "Inter_400Regular" },
  tabs: { flexDirection: "row", borderWidth: 1, borderColor: "#2a2520", marginTop: 16, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#d9ad63" },
  tabText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  gearSlot: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, padding: 12 },
  slotEmoji: { fontSize: 22, width: 30, textAlign: "center" },
  slotLabel: { fontSize: 9, color: "#6b5d4f", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
  slotItemName: { fontSize: 13, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  slotRarity: { fontSize: 9, color: "#6b5d4f", textTransform: "uppercase", marginTop: 1 },
  slotEmpty: { fontSize: 12, color: "#3b3328", fontStyle: "italic" },
  inventoryItem: { borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  itemName: { fontSize: 13, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  itemMeta: { fontSize: 10, color: "#6b5d4f", textTransform: "uppercase", marginTop: 2, letterSpacing: 1 },
  itemDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  equipBtn: { borderWidth: 1, borderColor: "#d9ad6360", paddingHorizontal: 10, paddingVertical: 6 },
  equipBtnText: { color: "#d9ad63", fontSize: 11, fontWeight: "700" },
  identityCard: { borderWidth: 1, padding: 14 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", textTransform: "uppercase", marginBottom: 10, fontFamily: "Inter_400Regular" },
  dominantStyle: { fontSize: 16, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold", marginBottom: 6 },
  identityNote: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  identityBarRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  identityBarLabel: { width: 88, fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  identityBarTrack: { flex: 1, height: 4, backgroundColor: "#2a2520", borderRadius: 2, overflow: "hidden" },
  identityBarFill: { height: 4, borderRadius: 2 },
  identityBarPct: { width: 30, textAlign: "right", fontSize: 10, color: "#6b5d4f" },
  empty: { borderWidth: 1, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 8, marginTop: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  emptyDesc: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});

const gm = StyleSheet.create({
  root: { flex: 1 },
  closeRow: { alignItems: "flex-end", paddingHorizontal: 20, marginBottom: 8 },
  itemRarity: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  itemName: { fontSize: 22, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold", lineHeight: 28 },
  itemDesc: { fontSize: 13, lineHeight: 20 },
  loreBlock: { borderLeftWidth: 2, paddingLeft: 12, marginTop: 4 },
  loreText: { fontSize: 12, lineHeight: 18, fontStyle: "italic" },
});
