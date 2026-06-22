import {
  customFetch,
  useGetInventory,
  useGetArmory,
  useEquipGear,
  useGetPlayerStyleIdentity,
  useGetStoreSections,
  usePurchaseStoreItem,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import { formatGuildGrade, gradeColor } from "@/utils/ranks";
import { LEGAL_COPY, type LegalCopyKey } from "@/utils/legal-copy";

const PAPER_DOLL = require("../../assets/images/aethoria-equipment-paper-doll.png");

type CharSummary = {
  player: any;
  identity?: any;
  gearSlots: Array<{ slot: string; label: string; item: any | null }>;
  titles: any[];
  appearance?: { aura: string | null; cosmeticCount: number };
  biometrics: any;
  realEquipment?: Array<{ id: number; name: string; category: string; available: boolean }>;
  inventorySummary: { items: number; gear: number; equippedGear: number };
  settingsShortcuts?: Array<{ key: string; label: string; href: string }>;
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

const SLOT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  head: "hard-drive",
  neck: "circle",
  shoulders: "layers",
  cloak: "shield",
  chest: "box",
  arms: "activity",
  hands: "package",
  waist: "disc",
  legs: "user",
  feet: "navigation",
  ring_left: "circle",
  ring_right: "circle",
  weapon: "zap",
  offhand: "shield",
  relic: "star",
  title: "award",
  aura_cosmetic: "sun",
};
type TabKey = "gear" | "inventory" | "offerings" | "identity";

const OFFERING_SECTION_META = [
  { key: "permanent", label: "Hall Shop", note: "Always available while supplies remain.", icon: "shopping-bag" },
  { key: "daily", label: "Daily", note: "A rotating tray of short-term utilities.", icon: "sun" },
  { key: "weekly", label: "Weekly", note: "Longer-cycle relics, sidegrades, and curios.", icon: "calendar" },
  { key: "raid", label: "Raid", note: "Items unlocked by dangerous campaign work.", icon: "shield" },
] as const satisfies Array<{ key: string; label: string; note: string; icon: keyof typeof Feather.glyphMap }>;

const PAPER_DOLL_SLOTS: Array<{ slot: string; label: string; aliases: string[]; side: "left" | "right" | "support"; icon: keyof typeof Feather.glyphMap; x?: number; y?: number }> = [
  { slot: "head", label: "Head", aliases: ["head", "helmet", "helm", "hood", "circlet"], side: "left", icon: "hard-drive", x: 50, y: 9 },
  { slot: "neck", label: "Neck", aliases: ["neck", "necklace", "amulet"], side: "left", icon: "circle", x: 31, y: 21 },
  { slot: "shoulders", label: "Shoulders", aliases: ["shoulders", "pauldrons", "mantle"], side: "left", icon: "layers", x: 18, y: 32 },
  { slot: "arms", label: "Arms", aliases: ["arms", "bracers", "vambraces"], side: "left", icon: "activity", x: 18, y: 47 },
  { slot: "waist", label: "Waist", aliases: ["waist", "belt", "sash"], side: "left", icon: "disc", x: 18, y: 61 },
  { slot: "legs", label: "Legs", aliases: ["legs", "pants", "greaves"], side: "left", icon: "user", x: 18, y: 74 },
  { slot: "feet", label: "Feet", aliases: ["feet", "boots"], side: "left", icon: "navigation", x: 18, y: 86 },
  { slot: "cloak", label: "Cloak", aliases: ["cloak", "cape", "back"], side: "right", icon: "shield", x: 72, y: 30 },
  { slot: "chest", label: "Chest", aliases: ["chest", "armor", "robe", "body"], side: "right", icon: "box", x: 76, y: 43 },
  { slot: "hands", label: "Hands", aliases: ["hands", "gloves", "gloves_wraps", "wraps", "gauntlets"], side: "right", icon: "package", x: 76, y: 55 },
  { slot: "ring_left", label: "Ring Left", aliases: ["ring_left", "ring"], side: "right", icon: "circle", x: 76, y: 67 },
  { slot: "ring_right", label: "Ring Right", aliases: ["ring_right", "ring"], side: "right", icon: "circle", x: 77, y: 79 },
  { slot: "weapon", label: "Weapon", aliases: ["weapon", "main_hand", "mainhand"], side: "right", icon: "zap", x: 78, y: 91 },
  { slot: "offhand", label: "Off Hand", aliases: ["offhand", "off_hand", "shield"], side: "support", icon: "shield" },
  { slot: "relic", label: "Relic", aliases: ["relic"], side: "support", icon: "star" },
  { slot: "title", label: "Title", aliases: ["title", "banner"], side: "support", icon: "award" },
  { slot: "aura_cosmetic", label: "Aura", aliases: ["aura_cosmetic", "aura", "aura_effect", "cosmetic"], side: "support", icon: "sun" },
];

function AttributeGrid({ stats }: { stats: any }) {
  return (
    <View style={cs.attributeGrid}>
      {[
        ["STR", stats?.strength ?? 5],
        ["AGI", stats?.agility ?? 5],
        ["STA", stats?.stamina ?? 5],
        ["VIT", stats?.vitality ?? 5],
        ["DIS", stats?.discipline ?? 5],
        ["SEN", stats?.sense ?? 5],
      ].map(([label, value]) => (
        <View key={String(label)} style={cs.attributeBox}>
          <Text style={cs.attributeValue}>{value}</Text>
          <Text style={cs.attributeLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function PaperDollPanel({
  gearSlots,
  equippedCount,
  activeSlot,
  onSelectSlot,
}: {
  gearSlots: CharSummary["gearSlots"];
  equippedCount: number;
  activeSlot: string | null;
  onSelectSlot: (slot: string) => void;
}) {
  const total = gearSlots.length || 17;
  const affinity =
    gearSlots.find((slot) => {
      const value = slot.item?.elementalAffinity ?? slot.item?.affinity;
      return value && value !== "physical";
    })?.item?.elementalAffinity ?? "physical";
  const normalizedSlots = PAPER_DOLL_SLOTS.map((paperSlot) => {
    const source = gearSlots.find((slot) => paperSlot.aliases.includes(slot.slot) || slot.slot === paperSlot.slot);
    return { ...paperSlot, item: source?.item ?? null };
  });

  const SlotButton = ({ slot }: { slot: (typeof normalizedSlots)[number] }) => {
    const rarityColor = slot.item ? (RARITY_COLORS[slot.item.rarity ?? "common"] ?? "#9ca3af") : "#3b3328";
    const active = activeSlot === slot.slot;
    const affinity = slot.item?.elementalAffinity ?? slot.item?.affinity;
    return (
      <TouchableOpacity
        style={[cs.paperSlotBtn, { borderColor: active ? "#d9ad63" : rarityColor + "70", backgroundColor: active ? "#21170f" : "#0c0b09" }]}
        onPress={() => onSelectSlot(slot.slot)}
        activeOpacity={0.78}
      >
        <View style={[cs.paperSlotIcon, { borderColor: slot.item ? rarityColor + "80" : "#3b3328" }]}>
          <Feather name={slot.icon} size={13} color={slot.item ? rarityColor : "#6f685f"} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={cs.paperSlotLabel}>{slot.label}</Text>
          <Text style={[cs.paperSlotItem, { color: slot.item ? "#eee5d7" : "#6f685f" }]} numberOfLines={1}>
            {slot.item?.displayName ?? slot.item?.name ?? "Empty"}
          </Text>
          {affinity && (
            <Text style={cs.paperSlotAffinity} numberOfLines={1}>{affinity} affinity</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={cs.paperDollPanel}>
      <View style={cs.paperDollHeader}>
        <View>
          <Text style={cs.sectionLabel}>EQUIPMENT</Text>
          <Text style={cs.paperDollTitle}>Armory Figure</Text>
        </View>
        <View style={cs.equippedBadge}>
          <Text style={cs.equippedBadgeLabel}>Equipped</Text>
          <Text style={cs.equippedBadgeValue}>{equippedCount}/{total}</Text>
        </View>
      </View>
      <View style={cs.paperDollFrame}>
        <Image source={PAPER_DOLL} style={cs.paperDollImage} resizeMode="contain" />
        {normalizedSlots.filter((slot) => typeof slot.x === "number" && typeof slot.y === "number").map((slot) => {
          const rarityColor = slot.item ? (RARITY_COLORS[slot.item.rarity ?? "common"] ?? "#9ca3af") : "#6b4d2f";
          const active = activeSlot === slot.slot;
          const x = slot.x ?? 0;
          const y = slot.y ?? 0;
          return (
            <TouchableOpacity
              key={`hotspot-${slot.slot}`}
              accessibilityLabel={`Show ${slot.label} gear`}
              style={[
                cs.paperHotspot,
                {
                  left: `${x}%`,
                  top: `${y}%`,
                  borderColor: active ? "#f1dfc6" : rarityColor,
                  backgroundColor: active ? "#d9ad63" : "#080706d9",
                },
              ]}
              onPress={() => onSelectSlot(slot.slot)}
              activeOpacity={0.78}
            >
              <Feather name={slot.icon} size={12} color={active ? "#0a0908" : rarityColor} />
            </TouchableOpacity>
          );
        })}
        <View style={cs.affinityBadge}>
          <Text style={cs.affinityLabel}>Affinity</Text>
          <Text style={cs.affinityValue}>{affinity}</Text>
        </View>
        {activeSlot ? (
          <View style={cs.activeSlotBanner}>
            <Text style={cs.activeSlotLabel}>Selected</Text>
            <Text style={cs.activeSlotValue}>{slotLabel(activeSlot)}</Text>
          </View>
        ) : null}
      </View>
      <View style={cs.paperSlotGrid}>
        <View style={cs.paperSlotColumn}>
          {normalizedSlots.filter((slot) => slot.side === "left").map((slot) => <SlotButton key={slot.slot} slot={slot} />)}
        </View>
        <View style={cs.paperSlotColumn}>
          {normalizedSlots.filter((slot) => slot.side === "right").map((slot) => <SlotButton key={slot.slot} slot={slot} />)}
        </View>
      </View>
      <View style={cs.supportSlotGrid}>
        {normalizedSlots.filter((slot) => slot.side === "support").map((slot) => <SlotButton key={slot.slot} slot={slot} />)}
      </View>
      <Text style={cs.paperDollNote}>Tap a slot to inspect matching gear. The figure stays neutral; the equipment carries the identity.</Text>
    </View>
  );
}

function slotMatches(itemSlot: string | null | undefined, selectedSlot: string | null) {
  if (!selectedSlot) return true;
  const target = PAPER_DOLL_SLOTS.find((slot) => slot.slot === selectedSlot);
  if (!target || !itemSlot) return false;
  return target.aliases.includes(itemSlot) || itemSlot === target.slot;
}

function slotLabel(slot: string | null) {
  if (!slot) return "All Gear";
  return PAPER_DOLL_SLOTS.find((paperSlot) => paperSlot.slot === slot)?.label ?? "Selected Slot";
}

function kgToLb(value?: number | null) {
  return value ? `${Math.round(value * 2.20462)} lb` : "Not set";
}

function cmToImperial(value?: number | null) {
  if (!value) return "Not set";
  const totalInches = Math.round(value / 2.54);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

export default function CharacterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("gear");
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  const { data: char, loading: charLoading } = useCharSummary();
  const { data: armory, isLoading: armoryLoading } = useGetArmory();
  const { data: inventory, isLoading: inventoryLoading } = useGetInventory();
  const { data: storeSections, isLoading: storeLoading } = useGetStoreSections({
    query: { queryKey: ["/api/store/sections"] },
  });
  const { data: identity } = useGetPlayerStyleIdentity();
  const equipGear = useEquipGear();
  const purchaseItem = usePurchaseStoreItem();

  const [selectedGear, setSelectedGear] = useState<any | null>(null);
  const [offeringSection, setOfferingSection] = useState<(typeof OFFERING_SECTION_META)[number]["key"]>("permanent");

  const handleEquip = (gearId: number, _slot: string) => {
    equipGear.mutate(
      { id: gearId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/armory"] });
          qc.invalidateQueries({ queryKey: ["/api/character/summary"] });
          setSelectedGear(null);
        },
        onError: () => Alert.alert("Error", "Could not equip item."),
      }
    );
  };

  const handlePurchase = (itemId: number) => {
    purchaseItem.mutate(
      { data: { itemId, quantity: 1 } },
      {
        onSuccess: (res: any) => {
          Alert.alert("Item Acquired", res?.message ?? "The Hall has released the item to your inventory.");
          qc.invalidateQueries({ queryKey: ["/api/inventory"] });
          qc.invalidateQueries({ queryKey: ["/api/player"] });
          qc.invalidateQueries({ queryKey: ["/api/store/sections"] });
          qc.invalidateQueries({ queryKey: ["/api/character/summary"] });
        },
        onError: (err: any) => {
          Alert.alert("Purchase Failed", err?.message ?? "The Hall will not release that item yet.");
        },
      }
    );
  };

  const player = char?.player;
  const rankColor = gradeColor(player?.rank);
  const xpPct = player ? Math.min(100, Math.round((player.xp / Math.max(1, player.xpToNextLevel)) * 100)) : 0;
  const equippedCount = char?.gearSlots.filter((slot) => slot.item).length ?? 0;
  const playerStats = player?.stats ?? {};
  const summaryIdentity = char?.identity ?? identity;
  const activeTitle = summaryIdentity?.activeTitle ?? char?.titles?.[0]?.name ?? "No title equipped";
  const className = summaryIdentity?.class ?? player?.baseClass ?? identity?.hybridArchetype ?? "Unranked Adventurer";
  const bio = char?.biometrics ?? {};
  const realEquipment = char?.realEquipment ?? [];
  const inventorySummary = char?.inventorySummary ?? { items: 0, gear: 0, equippedGear: 0 };
  const appearance = char?.appearance ?? { aura: null, cosmeticCount: 0 };
  const recordedEquipment = realEquipment.filter((item) => item.available !== false);
  const showLegalCopy = (key: LegalCopyKey) => Alert.alert(LEGAL_COPY[key].title, LEGAL_COPY[key].body);
  const activeOfferings = ((storeSections as any)?.[offeringSection] ?? []) as any[];
  const offeringCounts = OFFERING_SECTION_META.reduce<Record<string, number>>((acc, section) => {
    acc[section.key] = (((storeSections as any)?.[section.key] ?? []) as any[]).length;
    return acc;
  }, {});

  const identityTotal = identity
    ? ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"]
        .reduce((sum, k) => sum + ((identity as any)[k] ?? 0), 0)
    : 0;
  const dominantStyleKey = typeof identity?.dominantStyle === "string" ? identity.dominantStyle : null;
  const styleLabel = dominantStyleKey ? STYLE_META[dominantStyleKey]?.label ?? dominantStyleKey : "Still forming";
  const specialization = identity?.hybridArchetype ?? "Earned through behavior";

  const isLoading = charLoading || armoryLoading;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0908" }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={cs.headerSub}>CHARACTER</Text>
        <Text style={cs.headerTitle}>Adventurer Record</Text>

        {player && (
          <View style={cs.recordCard}>
            <Text style={cs.recordKicker}>Adventurer Record</Text>
            <View style={cs.recordHero}>
              <View style={[cs.gradeSigil, { borderColor: rankColor }]}>
                <Text style={[cs.gradeSigilText, { color: rankColor }]}>{formatGuildGrade(player.rank)}</Text>
                <Text style={cs.gradeSigilLabel}>Grade</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={cs.nameText} numberOfLines={1}>{player.name ?? "Adventurer"}</Text>
                <Text style={cs.levelText}>Level {player.level} - {className}</Text>
                <View style={cs.recordBadges}>
                  <Text style={cs.recordBadge} numberOfLines={1}>{activeTitle}</Text>
                  <Text style={[cs.recordBadge, cs.recordBadgeAccent]} numberOfLines={1}>{specialization}</Text>
                </View>
              </View>
            </View>
            <View style={cs.recordSummaryGrid}>
              <View style={cs.recordSummaryTile}>
                <Text style={[cs.recordSummaryValue, { color: rankColor }]}>{formatGuildGrade(player.rank)}</Text>
                <Text style={cs.recordSummaryLabel}>Guild Grade</Text>
              </View>
              <View style={cs.recordSummaryTile}>
                <Text style={[cs.recordSummaryValue, { color: "#49a3a0" }]}>{equippedCount}/{char?.gearSlots.length ?? 0}</Text>
                <Text style={cs.recordSummaryLabel}>Equipped</Text>
              </View>
              <View style={[cs.recordSummaryTile, { borderRightWidth: 0 }]}>
                <Text style={cs.recordSummaryValue} numberOfLines={1}>{styleLabel}</Text>
                <Text style={cs.recordSummaryLabel}>Style</Text>
              </View>
            </View>
            <View style={cs.xpRow}>
              <Text style={cs.xpLabel}>XP to next level</Text>
              <Text style={cs.xpPct}>{xpPct}%</Text>
            </View>
            <View style={[cs.xpTrack, { backgroundColor: "#2a2520" }]}>
              <View style={[cs.xpFill, { width: `${xpPct}%` }]} />
            </View>
            <View style={cs.titleRow}>
              <Text style={cs.titleLabel}>Title</Text>
              <Text style={cs.titleValue}>{activeTitle}</Text>
            </View>
          </View>
        )}

        <PaperDollPanel
          gearSlots={char?.gearSlots ?? []}
          equippedCount={equippedCount}
          activeSlot={activeSlot}
          onSelectSlot={(slot) => {
            setActiveSlot((current) => current === slot ? null : slot);
            setTab("inventory");
          }}
        />

        <View style={[cs.card, { backgroundColor: "#171510", borderColor: "#3b3328" }]}>
          <Text style={cs.sectionLabel}>ATTRIBUTES</Text>
          <AttributeGrid stats={playerStats} />
        </View>

        <View style={cs.tabs}>
          {(["gear", "inventory", "offerings", "identity"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[cs.tab, tab === t && cs.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[cs.tabText, { color: tab === t ? "#d9ad63" : "#6b5d4f" }]}>
                {t === "gear" ? "Gear" : t === "inventory" ? "Bag" : t === "offerings" ? "Offerings" : "Identity"}
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
                      <View style={cs.slotIconBox}>
                        <Feather name={SLOT_ICONS[slot.slot] ?? "square"} size={17} color={item ? rarityColor : "#6f685f"} />
                      </View>
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
                      {item && <Feather name="chevron-right" size={16} color="#3b3328" />}
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
                <View style={cs.emptyIcon}>
                  <Feather name="archive" size={20} color="#6b5d4f" />
                </View>
                <Text style={[cs.emptyTitle, { color: colors.foreground }]}>Inventory empty</Text>
                <Text style={[cs.emptyDesc, { color: colors.mutedForeground }]}>
                  Purchase items from the store or earn them through combat.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <View style={cs.filterBar}>
                  <Text style={cs.filterLabel}>Showing</Text>
                  <Text style={cs.filterValue}>{slotLabel(activeSlot)}</Text>
                  {activeSlot && (
                    <TouchableOpacity onPress={() => setActiveSlot(null)}>
                      <Text style={cs.clearFilter}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {(inventory as any[]).filter((item: any) => slotMatches(item.slot, activeSlot)).map((item: any) => {
                  const rarityColor = RARITY_COLORS[item.rarity ?? "common"] ?? "#9ca3af";
                  return (
                    <View key={item.id} style={[cs.inventoryItem, { backgroundColor: "#171510", borderColor: rarityColor + "40" }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[cs.itemName, { color: rarityColor }]}>{item.displayName ?? item.name}</Text>
                        <Text style={cs.itemMeta}>{item.category} - {item.rarity}</Text>
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
                {(inventory as any[]).filter((item: any) => slotMatches(item.slot, activeSlot)).length === 0 && (
                  <View style={[cs.empty, { borderColor: "#3b3328" }]}>
                    <Text style={[cs.emptyTitle, { color: colors.foreground }]}>No matching gear</Text>
                    <Text style={[cs.emptyDesc, { color: colors.mutedForeground }]}>
                      The selected slot has no available inventory pieces yet.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Offerings tab */}
        {tab === "offerings" && (
          <View style={[cs.offeringsCard, { borderColor: "#6b4d2f" }]}>
            <View style={cs.offeringsIntro}>
              <View style={cs.offeringsIcon}>
                <Feather name="shopping-bag" size={17} color="#d9ad63" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={cs.offeringsTitle}>The Hall's Offerings</Text>
                <Text style={cs.offeringsCopy}>
                  The Hall is no common shop. Aldric says useful artifacts surface for adventurers who keep returning.
                </Text>
              </View>
            </View>

            <View style={cs.offerSectionTabs}>
              {OFFERING_SECTION_META.map((section) => {
                const active = offeringSection === section.key;
                return (
                  <TouchableOpacity
                    key={section.key}
                    style={[cs.offerSectionTab, active && cs.offerSectionTabActive]}
                    onPress={() => setOfferingSection(section.key)}
                    activeOpacity={0.8}
                  >
                    <Feather name={section.icon} size={12} color={active ? "#d9ad63" : "#6b5d4f"} />
                    <Text style={[cs.offerSectionTabText, { color: active ? "#d9ad63" : "#8f887d" }]} numberOfLines={1}>
                      {section.label}
                    </Text>
                    {offeringCounts[section.key] > 0 && (
                      <Text style={cs.offerCount}>{offeringCounts[section.key]}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={cs.offerSectionHeader}>
              <Text style={cs.offerSectionTitle}>
                {OFFERING_SECTION_META.find((section) => section.key === offeringSection)?.label}
              </Text>
              <Text style={cs.offerSectionNote}>
                {OFFERING_SECTION_META.find((section) => section.key === offeringSection)?.note}
              </Text>
            </View>

            {storeLoading ? (
              <ActivityIndicator color="#d9ad63" style={{ marginTop: 20 }} />
            ) : activeOfferings.length === 0 ? (
              <View style={[cs.empty, { borderColor: "#3b3328" }]}>
                <View style={cs.emptyIcon}>
                  <Feather name="moon" size={20} color="#6b5d4f" />
                </View>
                <Text style={[cs.emptyTitle, { color: colors.foreground }]}>Nothing revealed yet</Text>
                <Text style={[cs.emptyDesc, { color: colors.mutedForeground }]}>
                  The Hall has no items in this section right now. Commissions and campaigns can unlock more.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {activeOfferings.map((item: any) => {
                  const rarityColor = RARITY_COLORS[item.rarity ?? "common"] ?? "#9ca3af";
                  const locked = item.meetsRequirements === false || item.locked === true;
                  const category = item.category ?? item.itemType ?? "utility";
                  const cost = item.priceGold ?? item.costGold ?? item.goldCost ?? item.price ?? 0;
                  return (
                    <View key={`${offeringSection}-${item.id}`} style={[cs.offerItem, { borderColor: rarityColor + "45" }]}>
                      <View style={[cs.offerItemIcon, { borderColor: rarityColor + "70" }]}>
                        <Feather name={(SLOT_ICONS[item.slot] ?? "package") as keyof typeof Feather.glyphMap} size={16} color={rarityColor} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[cs.itemName, { color: rarityColor }]} numberOfLines={1}>
                          {item.displayName ?? item.name}
                        </Text>
                        <Text style={cs.itemMeta}>{category} - {item.rarity ?? "common"}</Text>
                        <Text style={[cs.itemDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                          {item.description ?? item.loreText ?? "A useful Hall offering for the road ahead."}
                        </Text>
                        {item.styleAffinity ? (
                          <Text style={cs.offerAffinity}>{item.styleAffinity} affinity</Text>
                        ) : null}
                      </View>
                      <View style={cs.offerActionColumn}>
                        <Text style={cs.offerCost}>{cost} g</Text>
                        <TouchableOpacity
                          style={[cs.buyBtn, locked && cs.buyBtnDisabled]}
                          disabled={locked || purchaseItem.isPending}
                          onPress={() => handlePurchase(item.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={[cs.buyBtnText, locked && cs.buyBtnTextDisabled]}>{locked ? "Locked" : "Buy"}</Text>
                        </TouchableOpacity>
                      </View>
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
                {identity.hybridArchetype ? ` - ${identity.hybridArchetype}` : ""}
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

            <View style={cs.infoPanel}>
              <Text style={cs.infoTitle}>Class Path</Text>
              <View style={cs.infoGrid}>
                <View style={cs.infoTile}>
                  <Text style={cs.infoLabel}>Current Class</Text>
                  <Text style={cs.infoValue}>{className}</Text>
                </View>
                <View style={cs.infoTile}>
                  <Text style={cs.infoLabel}>Dominant Style</Text>
                  <Text style={cs.infoValue}>{dominantStyleKey ? STYLE_META[dominantStyleKey]?.label ?? dominantStyleKey : "Still forming"}</Text>
                </View>
                <View style={cs.infoTile}>
                  <Text style={cs.infoLabel}>Specialization</Text>
                  <Text style={cs.infoValue}>{identity?.hybridArchetype ?? "Earned through behavior"}</Text>
                </View>
              </View>
              <Text style={cs.infoNote}>
                The System does not ask you to pick a class. It watches what you actually do, then opens paths that fit your record.
              </Text>
            </View>

            <View style={cs.infoPanel}>
              <Text style={cs.infoTitle}>Biometrics</Text>
              <View style={cs.infoGrid}>
                <View style={cs.infoTile}>
                  <Text style={cs.infoLabel}>Height</Text>
                  <Text style={cs.infoValue}>{cmToImperial(bio.heightCm)}</Text>
                </View>
                <View style={cs.infoTile}>
                  <Text style={cs.infoLabel}>Weight</Text>
                  <Text style={cs.infoValue}>{kgToLb(bio.weightKg)}</Text>
                </View>
                <View style={cs.infoTile}>
                  <Text style={cs.infoLabel}>Bench</Text>
                  <Text style={cs.infoValue}>{kgToLb(bio.bench1rm)}</Text>
                </View>
                <View style={cs.infoTile}>
                  <Text style={cs.infoLabel}>Deadlift</Text>
                  <Text style={cs.infoValue}>{kgToLb(bio.deadlift1rm)}</Text>
                </View>
              </View>
              {bio.notes ? <Text style={cs.bioNote}>{bio.notes}</Text> : null}
            </View>

            <View style={cs.infoPanel}>
              <Text style={cs.infoTitle}>Real Equipment Owned</Text>
              {recordedEquipment.length ? (
                <View style={cs.equipmentWrap}>
                  {recordedEquipment.slice(0, 18).map((item) => (
                    <Text key={item.id} style={cs.realEquipmentChip}>{item.name}</Text>
                  ))}
                </View>
              ) : (
                <Text style={cs.infoNote}>No equipment recorded yet.</Text>
              )}
            </View>

            <View style={cs.infoPanel}>
              <Text style={cs.infoTitle}>Inventory And Appearance</Text>
              <View style={cs.infoGrid}>
                <View style={cs.infoTile}>
                  <Text style={cs.infoLabel}>Items</Text>
                  <Text style={cs.infoValue}>{inventorySummary.items}</Text>
                </View>
                <View style={cs.infoTile}>
                  <Text style={cs.infoLabel}>Gear</Text>
                  <Text style={cs.infoValue}>{inventorySummary.gear}</Text>
                </View>
                <View style={cs.infoTile}>
                  <Text style={cs.infoLabel}>Aura</Text>
                  <Text style={cs.infoValue}>{appearance.aura ?? "None"}</Text>
                </View>
                <View style={cs.infoTile}>
                  <Text style={cs.infoLabel}>Cosmetics</Text>
                  <Text style={cs.infoValue}>{appearance.cosmeticCount}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={cs.profileBtn} onPress={() => router.push("/profile" as any)} activeOpacity={0.8}>
              <Text style={cs.profileBtnTitle}>Open System Record</Text>
              <Text style={cs.profileBtnText}>Edit biometrics, strength marks, equipment access, and notes.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cs.profileBtn} onPress={() => setTab("offerings")} activeOpacity={0.8}>
              <Text style={cs.profileBtnTitle}>Open Hall Offerings</Text>
              <Text style={cs.profileBtnText}>Browse utilities, cosmetics, sidegrades, and relics without leaving Character.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cs.profileBtn} onPress={() => router.push("/(tabs)/settings" as any)} activeOpacity={0.8}>
              <Text style={cs.profileBtnTitle}>Open Guild Settings</Text>
              <Text style={cs.profileBtnText}>Manage account access, units, privacy, health imports, and production readiness.</Text>
            </TouchableOpacity>

            <View style={cs.infoPanel}>
              <Text style={cs.infoTitle}>Data And Privacy</Text>
              <TouchableOpacity style={cs.privacyRow} onPress={() => showLegalCopy("privacy")} activeOpacity={0.8}>
                <Text style={cs.privacyTitle}>Privacy Policy</Text>
                <Text style={cs.privacyText}>What the app stores and why.</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cs.privacyRow} onPress={() => showLegalCopy("terms")} activeOpacity={0.8}>
                <Text style={cs.privacyTitle}>Terms And Disclaimer</Text>
                <Text style={cs.privacyText}>Fitness guidance boundaries and health notes.</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cs.privacyRow} onPress={() => showLegalCopy("data")} activeOpacity={0.8}>
                <Text style={cs.privacyTitle}>Export Or Delete Data</Text>
                <Text style={cs.privacyText}>Production data-control roadmap.</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Gear detail modal */}
      {selectedGear && (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedGear(null)}>
          <View style={[gm.root, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity style={gm.closeRow} onPress={() => setSelectedGear(null)}>
              <Text style={{ color: colors.mutedForeground, fontSize: 22, fontWeight: "700" }}>X</Text>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
              <Text style={[gm.itemRarity, { color: RARITY_COLORS[selectedGear.rarity ?? "common"] }]}>
                {selectedGear.rarity?.toUpperCase()} - {selectedGear.slot?.replace(/_/g, " ").toUpperCase()}
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
  recordCard: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#171510", padding: 0, marginBottom: 12, overflow: "hidden" },
  recordKicker: { color: "#8f887d", fontSize: 10, letterSpacing: 2.2, textTransform: "uppercase", fontFamily: "Inter_700Bold", paddingHorizontal: 14, paddingTop: 14 },
  recordHero: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  gradeSigil: { width: 62, minHeight: 62, borderWidth: 2, backgroundColor: "#1b1511", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  gradeSigilText: { fontSize: 14, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold", textAlign: "center" },
  gradeSigilLabel: { color: "#9f9586", fontSize: 8, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 2, fontFamily: "Inter_700Bold" },
  recordBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  recordBadge: { maxWidth: "100%", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", color: "#d8c4a5", paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontFamily: "Inter_700Bold" },
  recordBadgeAccent: { borderColor: "#6b4d2f", color: "#d9ad63" },
  recordSummaryGrid: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#3b3328" },
  recordSummaryTile: { flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: "#3b3328", paddingHorizontal: 5 },
  recordSummaryValue: { color: "#d8c4a5", fontSize: 13, fontFamily: "PlayfairDisplay_700Bold", textAlign: "center" },
  recordSummaryLabel: { color: "#8f887d", fontSize: 8, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 3, fontFamily: "Inter_400Regular", textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statBlock: { flex: 1, justifyContent: "center", gap: 6 },
  nameText: { color: "#eee5d7", fontSize: 20, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  rankPill: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  rankText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  levelText: { fontSize: 13, color: "#9d8f80" },
  statsGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  miniStat: { minWidth: "45%", backgroundColor: "#0e0d0b", borderWidth: 1, borderColor: "#2a2520", padding: 8, alignItems: "center" },
  miniStatValue: { fontSize: 14, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  miniStatLabel: { fontSize: 9, color: "#9d8f80", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  xpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4, marginTop: 12, paddingHorizontal: 14 },
  xpLabel: { fontSize: 10, color: "#9d8f80" },
  xpPct: { fontSize: 10, color: "#d9ad63", fontWeight: "700" },
  xpTrack: { height: 4, borderRadius: 2, overflow: "hidden", marginHorizontal: 14 },
  xpFill: { height: 4, backgroundColor: "#d9ad63" },
  titleRow: { borderTopWidth: 1, borderTopColor: "#2a2520", marginTop: 12, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", justifyContent: "space-between", gap: 12 },
  titleLabel: { color: "#9d8f80", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  titleValue: { color: "#d8c4a5", fontSize: 12, flex: 1, textAlign: "right", fontFamily: "PlayfairDisplay_700Bold" },
  titleBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  titleText: { fontSize: 10, color: "#d9ad63", fontFamily: "Inter_400Regular" },
  paperDollPanel: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 14, marginBottom: 12 },
  paperDollHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  paperDollTitle: { color: "#d9ad63", fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  equippedBadge: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", paddingHorizontal: 10, paddingVertical: 6, alignItems: "flex-end" },
  equippedBadgeLabel: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 },
  equippedBadgeValue: { color: "#d9ad63", fontSize: 13, fontWeight: "800", fontFamily: "Inter_700Bold" },
  paperDollFrame: { position: "relative", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#000", minHeight: 430, overflow: "hidden" },
  paperDollImage: { width: "100%", height: 430 },
  paperHotspot: { position: "absolute", width: 28, height: 28, marginLeft: -14, marginTop: -14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  affinityBadge: { position: "absolute", left: 10, bottom: 10, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", paddingHorizontal: 8, paddingVertical: 5, flexDirection: "row", gap: 8 },
  affinityLabel: { color: "#8f887d", fontSize: 10 },
  affinityValue: { color: "#49a3a0", fontSize: 10, textTransform: "capitalize", fontWeight: "700" },
  activeSlotBanner: { position: "absolute", right: 10, bottom: 10, borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#0c0b09e6", paddingHorizontal: 9, paddingVertical: 6, alignItems: "flex-end", maxWidth: "58%" },
  activeSlotLabel: { color: "#8f887d", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  activeSlotValue: { color: "#d9ad63", fontSize: 12, marginTop: 1, fontFamily: "PlayfairDisplay_700Bold" },
  paperDollNote: { marginTop: 10, color: "#8f887d", fontSize: 11, lineHeight: 16 },
  paperSlotGrid: { flexDirection: "row", gap: 8, marginTop: 10 },
  paperSlotColumn: { flex: 1, gap: 6 },
  supportSlotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  paperSlotBtn: { flex: 1, minWidth: "47%", borderWidth: 1, padding: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  paperSlotIcon: { width: 24, height: 24, borderWidth: 1, backgroundColor: "#15130f", alignItems: "center", justifyContent: "center" },
  paperSlotLabel: { fontSize: 8, color: "#8f887d", textTransform: "uppercase", letterSpacing: 1 },
  paperSlotItem: { fontSize: 10, fontFamily: "PlayfairDisplay_700Bold", marginTop: 1 },
  paperSlotAffinity: { color: "#49a3a0", fontSize: 9, marginTop: 1, textTransform: "capitalize", fontFamily: "Inter_400Regular" },
  attributeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  attributeBox: { width: "30.5%", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", paddingVertical: 10, alignItems: "center" },
  attributeValue: { color: "#d9ad63", fontSize: 18, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  attributeLabel: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 },
  tabs: { flexDirection: "row", borderWidth: 1, borderColor: "#2a2520", marginTop: 16, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#d9ad63" },
  tabText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  gearSlot: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, padding: 12 },
  slotIconBox: { width: 30, height: 30, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", alignItems: "center", justifyContent: "center" },
  slotLabel: { fontSize: 9, color: "#6b5d4f", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
  slotItemName: { fontSize: 13, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  slotRarity: { fontSize: 9, color: "#6b5d4f", textTransform: "uppercase", marginTop: 1 },
  slotEmpty: { fontSize: 12, color: "#3b3328", fontStyle: "italic" },
  filterBar: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  filterLabel: { color: "#8f887d", fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5 },
  filterValue: { color: "#d9ad63", fontSize: 12, fontFamily: "PlayfairDisplay_700Bold", flex: 1 },
  clearFilter: { color: "#49a3a0", fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  inventoryItem: { borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  itemName: { fontSize: 13, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold" },
  itemMeta: { fontSize: 10, color: "#6b5d4f", textTransform: "uppercase", marginTop: 2, letterSpacing: 1 },
  itemDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  equipBtn: { borderWidth: 1, borderColor: "#d9ad6360", paddingHorizontal: 10, paddingVertical: 6 },
  equipBtnText: { color: "#d9ad63", fontSize: 11, fontWeight: "700" },
  offeringsCard: { borderWidth: 1, backgroundColor: "#11100e", padding: 12 },
  offeringsIntro: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 12, flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 12 },
  offeringsIcon: { width: 34, height: 34, borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#15110d", alignItems: "center", justifyContent: "center" },
  offeringsTitle: { color: "#d9ad63", fontSize: 16, fontFamily: "PlayfairDisplay_700Bold" },
  offeringsCopy: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 4 },
  offerSectionTabs: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  offerSectionTab: { width: "48.8%", minHeight: 42, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", paddingHorizontal: 8, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 6 },
  offerSectionTabActive: { borderColor: "#d9ad63", backgroundColor: "#1b1511" },
  offerSectionTabText: { flex: 1, minWidth: 0, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  offerCount: { minWidth: 18, overflow: "hidden", textAlign: "center", borderWidth: 1, borderColor: "#6b4d2f", color: "#d9ad63", fontSize: 9, paddingHorizontal: 4, paddingVertical: 1, fontFamily: "Inter_700Bold" },
  offerSectionHeader: { borderBottomWidth: 1, borderBottomColor: "#3b3328", paddingBottom: 10, marginBottom: 10 },
  offerSectionTitle: { color: "#eee5d7", fontSize: 15, fontFamily: "PlayfairDisplay_700Bold" },
  offerSectionNote: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 3 },
  offerItem: { borderWidth: 1, backgroundColor: "#171510", padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  offerItemIcon: { width: 34, height: 34, borderWidth: 1, backgroundColor: "#0c0b09", alignItems: "center", justifyContent: "center" },
  offerAffinity: { color: "#49a3a0", fontSize: 10, marginTop: 4, textTransform: "capitalize", fontFamily: "Inter_700Bold" },
  offerActionColumn: { alignItems: "flex-end", gap: 8 },
  offerCost: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold" },
  buyBtn: { minWidth: 54, alignItems: "center", borderWidth: 1, borderColor: "#d9ad6360", backgroundColor: "#1b1511", paddingHorizontal: 10, paddingVertical: 7 },
  buyBtnDisabled: { borderColor: "#3b3328", backgroundColor: "#0c0b09" },
  buyBtnText: { color: "#d9ad63", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  buyBtnTextDisabled: { color: "#6b5d4f" },
  identityCard: { borderWidth: 1, padding: 14 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: "#9d8f80", textTransform: "uppercase", marginBottom: 10, fontFamily: "Inter_400Regular" },
  dominantStyle: { fontSize: 16, fontWeight: "700", fontFamily: "PlayfairDisplay_700Bold", marginBottom: 6 },
  identityNote: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  identityBarRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  identityBarLabel: { width: 88, fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  identityBarTrack: { flex: 1, height: 4, backgroundColor: "#2a2520", borderRadius: 2, overflow: "hidden" },
  identityBarFill: { height: 4, borderRadius: 2 },
  identityBarPct: { width: 30, textAlign: "right", fontSize: 10, color: "#6b5d4f" },
  infoPanel: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", padding: 12, marginTop: 12 },
  infoTitle: { color: "#d9ad63", fontSize: 14, fontFamily: "PlayfairDisplay_700Bold", marginBottom: 8 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoTile: { width: "47.8%", borderWidth: 1, borderColor: "#2a2520", backgroundColor: "#080706", padding: 9 },
  infoLabel: { color: "#8f887d", fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  infoValue: { color: "#d8c4a5", fontSize: 12, marginTop: 4, fontFamily: "Inter_700Bold" },
  infoNote: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 8 },
  bioNote: { color: "#d8c4a5", fontSize: 11, lineHeight: 16, marginTop: 10, borderLeftWidth: 2, borderLeftColor: "#9d3e2a", paddingLeft: 10 },
  equipmentWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  realEquipmentChip: { borderWidth: 1, borderColor: "#3e8f5c", color: "#a8c9b0", paddingHorizontal: 8, paddingVertical: 5, fontSize: 10, fontFamily: "Inter_700Bold" },
  profileBtn: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 12, marginTop: 12 },
  profileBtnTitle: { color: "#d9ad63", fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  profileBtnText: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 4 },
  privacyRow: { borderTopWidth: 1, borderTopColor: "#2a2520", paddingVertical: 10 },
  privacyTitle: { color: "#d9ad63", fontSize: 12, fontFamily: "Inter_700Bold" },
  privacyText: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 3 },
  empty: { borderWidth: 1, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 8, marginTop: 8 },
  emptyIcon: { width: 36, height: 36, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", alignItems: "center", justifyContent: "center" },
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
