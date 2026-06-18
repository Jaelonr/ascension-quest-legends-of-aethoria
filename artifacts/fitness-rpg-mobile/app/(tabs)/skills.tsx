import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSkillTrees,
  useUnlockSkillNode,
  getGetSkillTreesQueryKey,
  type SkillTree,
  type SkillNode,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

// ── Category metadata ─────────────────────────────────────────────────────────

interface CategoryMeta {
  label: string;
  emoji: string;
  color: string;
  glowColor: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  strength:     { label: "Strength",     emoji: "⚔️", color: "#ef4444", glowColor: "rgba(239,68,68,0.35)" },
  striking:     { label: "Striking",     emoji: "🥊", color: "#f97316", glowColor: "rgba(249,115,22,0.35)" },
  grappling:    { label: "Grappling",    emoji: "🤼", color: "#eab308", glowColor: "rgba(234,179,8,0.35)" },
  conditioning: { label: "Conditioning", emoji: "🏃", color: "#22c55e", glowColor: "rgba(34,197,94,0.35)" },
  discipline:   { label: "Discipline",   emoji: "🧠", color: "#3b82f6", glowColor: "rgba(59,130,246,0.35)" },
  recovery:     { label: "Recovery",     emoji: "💚", color: "#06b6d4", glowColor: "rgba(6,182,212,0.35)" },
  nutrition:    { label: "Nutrition",    emoji: "🍎", color: "#a855f7", glowColor: "rgba(168,85,247,0.35)" },
};

function metaOf(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? CATEGORY_META.discipline;
}

// ── Node state helper ─────────────────────────────────────────────────────────

type NodeState = "unlocked" | "unlockable" | "locked";

function nodeState(node: SkillNode, allNodes: SkillNode[]): NodeState {
  if (node.unlocked) return "unlocked";
  const prereqs = node.prerequisiteNodeIds ?? [];
  if (prereqs.length === 0) return "unlockable";
  return prereqs.every((pid) => allNodes.find((n) => n.id === pid)?.unlocked)
    ? "unlockable"
    : "locked";
}

// ── Discipline tab strip ──────────────────────────────────────────────────────

function DisciplineTabs({
  trees,
  activeId,
  onSelect,
  colors,
}: {
  trees: SkillTree[];
  activeId: number;
  onSelect: (id: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.tabStrip}
    >
      {trees.map((tree) => {
        const meta     = metaOf(tree.category);
        const isActive = tree.id === activeId;
        const unlocked = tree.nodes.filter((n) => n.unlocked).length;
        return (
          <TouchableOpacity
            key={tree.id}
            onPress={() => onSelect(tree.id)}
            style={[
              s.disciplineTab,
              {
                borderColor:       isActive ? meta.color           : colors.border,
                backgroundColor:   isActive ? meta.color + "18"    : colors.card,
              },
            ]}
            activeOpacity={0.75}
          >
            <Text style={s.disciplineEmoji}>{meta.emoji}</Text>
            <Text style={[s.disciplineLabel, { color: isActive ? meta.color : colors.mutedForeground }]}>
              {meta.label}
            </Text>
            <View style={[s.disciplineCount, { borderColor: isActive ? meta.color + "50" : colors.border }]}>
              <Text style={[s.disciplineCountText, { color: isActive ? meta.color : colors.mutedForeground }]}>
                {unlocked}/{tree.nodes.length}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Node circle ───────────────────────────────────────────────────────────────

function NodeCircle({
  node,
  state,
  meta,
  onPress,
  colors,
}: {
  node: SkillNode;
  state: NodeState;
  meta: CategoryMeta;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const borderColor =
    state === "unlocked"   ? meta.color       :
    state === "unlockable" ? colors.primary    :
    colors.border + "50";

  const bgColor =
    state === "unlocked"   ? meta.color + "18"  :
    state === "unlockable" ? colors.primary + "12" :
    colors.background;

  const glowStyle =
    state === "unlocked"
      ? { shadowColor: meta.color, shadowRadius: 10, shadowOpacity: 0.7, elevation: 6 }
      : state === "unlockable"
      ? { shadowColor: colors.primary, shadowRadius: 6, shadowOpacity: 0.4, elevation: 3 }
      : {};

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={s.nodeWrap}>
      <View
        style={[
          s.nodeCircle,
          { borderColor, backgroundColor: bgColor },
          glowStyle,
          state === "locked" && { opacity: 0.35 },
        ]}
      >
        {/* Tier badge */}
        <View style={[s.tierBadge, { borderColor, backgroundColor: colors.background }]}>
          <Text style={[s.tierBadgeText, { color: state === "unlocked" ? meta.color : colors.mutedForeground }]}>
            {node.tier}
          </Text>
        </View>

        {state === "unlocked"   ? <Text style={s.nodeEmoji}>{meta.emoji}</Text>          :
         state === "unlockable" ? <Text style={[s.nodeStar, { color: colors.primary }]}>✦</Text> :
                                  <Text style={s.nodeLock}>🔒</Text>}
      </View>

      <Text
        style={[
          s.nodeName,
          {
            color:
              state === "unlocked"   ? meta.color          :
              state === "unlockable" ? colors.foreground    :
              colors.mutedForeground,
          },
        ]}
        numberOfLines={2}
      >
        {node.name}
      </Text>

      {state === "unlockable" && (
        <View style={[s.costChip, { borderColor: colors.primary + "60", backgroundColor: colors.primary + "18" }]}>
          <Text style={[s.costChipText, { color: colors.primary }]}>{node.xpCost} XP</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Tier connector ────────────────────────────────────────────────────────────

function TierConnector({ color }: { color: string }) {
  return (
    <View style={s.connector}>
      <View style={[s.connLine, { borderColor: color + "40" }]} />
      <Text style={[s.connArrow, { color: color + "80" }]}>▼</Text>
      <View style={[s.connLine, { borderColor: color + "40" }]} />
    </View>
  );
}

// ── Node detail bottom-sheet modal ────────────────────────────────────────────

function NodeDetailModal({
  node,
  tree,
  onClose,
  onUnlock,
  isPending,
  colors,
}: {
  node: SkillNode | null;
  tree: SkillTree;
  onClose: () => void;
  onUnlock: (id: number) => void;
  isPending: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  if (!node) return null;

  const meta    = metaOf(tree.category);
  const state   = nodeState(node, tree.nodes);
  const prereqs = (node.prerequisiteNodeIds ?? []).map((pid) =>
    tree.nodes.find((n) => n.id === pid)
  );
  const statReqs = Object.entries(node.statRequirements ?? {}).filter(
    ([, v]) => (v as number) > 0
  );

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Tap-away backdrop */}
      <TouchableOpacity style={d.overlay} onPress={onClose} activeOpacity={1}>
        {/* Sheet — stop propagation */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[
            d.sheet,
            {
              backgroundColor: colors.card,
              borderColor:
                state === "unlocked" ? meta.color + "60" : colors.border,
            },
          ]}
        >
          {/* Category color accent strip */}
          <View style={[d.accent, { backgroundColor: meta.color }]} />

          {/* Header: name + XP cost */}
          <View style={d.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={d.badgeRow}>
                <View
                  style={[
                    d.badge,
                    state === "unlocked"
                      ? { borderColor: meta.color + "50", backgroundColor: meta.color + "18" }
                      : state === "unlockable"
                      ? { borderColor: colors.primary + "50", backgroundColor: colors.primary + "15" }
                      : { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <Text
                    style={[
                      d.badgeText,
                      {
                        color:
                          state === "unlocked"   ? meta.color       :
                          state === "unlockable" ? colors.primary    :
                          colors.mutedForeground,
                      },
                    ]}
                  >
                    {state === "unlocked"   ? "UNLOCKED"   :
                     state === "unlockable" ? "UNLOCKABLE" : "LOCKED"}
                  </Text>
                </View>
                <Text style={[d.tierText, { color: colors.mutedForeground }]}>
                  Tier {node.tier}
                </Text>
              </View>
              <Text style={[d.nodeTitle, { color: state === "unlocked" ? meta.color : colors.foreground }]}>
                {node.name}
              </Text>
            </View>

            {!node.unlocked && (
              <View style={[d.xpBubble, { borderColor: meta.color + "50", backgroundColor: meta.color + "15" }]}>
                <Text style={[d.xpAmt,   { color: meta.color }]}>{node.xpCost}</Text>
                <Text style={[d.xpLabel, { color: meta.color + "cc" }]}>XP</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text style={[d.description, { color: colors.mutedForeground }]}>
            {node.description}
          </Text>

          {/* Effect */}
          {node.effect && (
            <View style={[d.effectBox, { borderColor: meta.color + "30", backgroundColor: meta.color + "0d" }]}>
              <Text style={{ fontSize: 12 }}>⚡</Text>
              <Text style={[d.effectText, { color: meta.color }]}>{node.effect}</Text>
            </View>
          )}

          {/* Equipment required */}
          {node.equipmentRequired && (
            <View style={[d.warnBox, { borderColor: "#ffbf0030" }]}>
              <Text style={{ fontSize: 12 }}>⚠️</Text>
              <Text style={[d.warnText, { color: colors.mutedForeground }]}>
                Requires:{" "}
                <Text style={{ color: "#ffbf00" }}>{node.equipmentRequired}</Text>
              </Text>
            </View>
          )}

          {/* Stat requirements */}
          {statReqs.length > 0 && (
            <View style={d.section}>
              <Text style={[d.sectionLabel, { color: colors.mutedForeground }]}>
                STAT REQUIREMENTS
              </Text>
              <View style={d.chipRow}>
                {statReqs.map(([stat, val]) => (
                  <View
                    key={stat}
                    style={[d.chip, { borderColor: colors.border, backgroundColor: colors.background }]}
                  >
                    <Text style={[d.chipText, { color: colors.mutedForeground }]}>
                      {stat.slice(0, 1).toUpperCase() + stat.slice(1)} {val as number}+
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Prerequisites */}
          {prereqs.length > 0 && (
            <View style={d.section}>
              <Text style={[d.sectionLabel, { color: colors.mutedForeground }]}>
                PREREQUISITES
              </Text>
              {prereqs.map((pre) =>
                pre ? (
                  <View key={pre.id} style={d.prereqRow}>
                    <Text style={{ color: pre.unlocked ? "#22c55e" : "#ef4444", fontSize: 12 }}>
                      {pre.unlocked ? "✓" : "✗"}
                    </Text>
                    <Text style={[d.prereqName, { color: pre.unlocked ? colors.foreground : colors.mutedForeground }]}>
                      {pre.name}
                    </Text>
                  </View>
                ) : null
              )}
            </View>
          )}

          {/* Unlock / locked button */}
          {state !== "unlocked" && (
            <View style={d.unlockSection}>
              {state === "locked" && (
                <Text style={[d.lockedNote, { color: "#ef4444" }]}>
                  🔒 Prerequisites not met
                </Text>
              )}
              <TouchableOpacity
                style={[
                  d.unlockBtn,
                  state === "unlockable"
                    ? { backgroundColor: meta.color + "20", borderColor: meta.color + "70" }
                    : { backgroundColor: colors.background, borderColor: colors.border, opacity: 0.45 },
                ]}
                onPress={() => { onUnlock(node.id); onClose(); }}
                disabled={state !== "unlockable" || isPending}
                activeOpacity={0.8}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={meta.color} />
                ) : (
                  <Text style={[d.unlockBtnText, { color: state === "unlockable" ? meta.color : colors.mutedForeground }]}>
                    {state === "unlockable"
                      ? `✦  Unlock for ${node.xpCost} XP`
                      : "Prerequisites required"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Dismiss handle */}
          <TouchableOpacity onPress={onClose} style={d.dismissRow} activeOpacity={0.7}>
            <Text style={[d.dismissText, { color: colors.mutedForeground }]}>Dismiss</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Tree view ─────────────────────────────────────────────────────────────────

function TreeView({
  tree,
  onNodeTap,
  colors,
}: {
  tree: SkillTree;
  onNodeTap: (node: SkillNode) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const meta     = metaOf(tree.category);
  const unlocked = tree.nodes.filter((n) => n.unlocked).length;
  const progress = tree.nodes.length > 0 ? unlocked / tree.nodes.length : 0;

  const tierMap = new Map<number, SkillNode[]>();
  for (const node of tree.nodes) {
    const existing = tierMap.get(node.tier);
    if (existing) existing.push(node);
    else tierMap.set(node.tier, [node]);
  }
  const sortedTiers = [...tierMap.entries()].sort(([a], [b]) => a - b);

  return (
    <View>
      {/* Tree header */}
      <View style={[tv.header, { backgroundColor: colors.card, borderColor: meta.color + "40" }]}>
        <View style={tv.titleRow}>
          <Text style={tv.treeEmoji}>{meta.emoji}</Text>
          <Text style={[tv.treeName, { color: meta.color }]}>{tree.name}</Text>
        </View>
        {tree.description ? (
          <Text style={[tv.treeDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {tree.description}
          </Text>
        ) : null}

        {/* Mastery bar */}
        <View style={tv.masteryRow}>
          <Text style={[tv.masteryLabel, { color: colors.mutedForeground }]}>Mastery</Text>
          <Text style={[tv.masteryLabel, { color: colors.mutedForeground }]}>
            {unlocked}/{tree.nodes.length} nodes
          </Text>
        </View>
        <View style={[tv.masteryTrack, { backgroundColor: colors.border + "60" }]}>
          <View
            style={[
              tv.masteryFill,
              {
                backgroundColor: meta.color,
                width: `${Math.round(progress * 100)}%` as any,
              },
            ]}
          />
        </View>
      </View>

      {/* Tier groups */}
      {sortedTiers.map(([tier, nodes], idx) => (
        <View key={tier}>
          {idx > 0 && <TierConnector color={meta.color} />}

          {/* Tier label */}
          <View style={tv.tierLabelRow}>
            <View style={[tv.tierLine, { backgroundColor: meta.color + "30" }]} />
            <Text style={[tv.tierLabel, { color: meta.color + "aa" }]}>TIER {tier}</Text>
            <View style={[tv.tierLine, { backgroundColor: meta.color + "30" }]} />
          </View>

          {/* Nodes */}
          <View style={tv.nodeRow}>
            {nodes.map((node) => (
              <NodeCircle
                key={node.id}
                node={node}
                state={nodeState(node, tree.nodes)}
                meta={meta}
                onPress={() => onNodeTap(node)}
                colors={colors}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Root screen ───────────────────────────────────────────────────────────────

export default function SkillsScreen() {
  const colors = useColors();
  const qc     = useQueryClient();

  const { data: skillTrees, isLoading } = useGetSkillTrees();
  const unlockNode = useUnlockSkillNode();

  const trees = skillTrees ?? [];
  const [activeTreeId, setActiveTreeId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);

  const activeTree =
    (activeTreeId !== null ? trees.find((t) => t.id === activeTreeId) : null) ??
    trees[0] ??
    null;

  const handleUnlock = (nodeId: number) => {
    unlockNode.mutate(
      { id: nodeId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSkillTreesQueryKey() });
          qc.invalidateQueries({ queryKey: ["/api/player"] });
        },
      }
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Page header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Skill Trees</Text>
        <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
          Forge your path through the disciplines
        </Text>
      </View>

      {isLoading ? (
        <View style={s.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : trees.length === 0 ? (
        <View style={[s.emptyBox, { borderColor: colors.border }]}>
          <Text style={s.emptyEmoji}>⚡</Text>
          <Text style={[s.emptyTitle, { color: colors.mutedForeground }]}>
            No skill trees yet
          </Text>
        </View>
      ) : (
        <>
          {/* Discipline tab strip */}
          <DisciplineTabs
            trees={trees}
            activeId={activeTree?.id ?? -1}
            onSelect={(id) => { setActiveTreeId(id); setSelectedNode(null); }}
            colors={colors}
          />

          {/* Tree content */}
          <ScrollView
            contentContainerStyle={[
              s.scroll,
              Platform.OS === "ios"     && { paddingBottom: 110 },
              Platform.OS === "android" && { paddingBottom: 90 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {activeTree && (
              <TreeView
                tree={activeTree}
                onNodeTap={setSelectedNode}
                colors={colors}
              />
            )}
          </ScrollView>

          {/* Node detail sheet */}
          {selectedNode && activeTree && (
            <NodeDetailModal
              node={selectedNode}
              tree={activeTree}
              onClose={() => setSelectedNode(null)}
              onUnlock={handleUnlock}
              isPending={unlockNode.isPending}
              colors={colors}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontFamily: "SpecialElite_400Regular", letterSpacing: 0.5 },
  headerSub:   { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },

  tabStrip: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  disciplineTab: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  disciplineEmoji:     { fontSize: 14 },
  disciplineLabel:     { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  disciplineCount:     { borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  disciplineCountText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },

  scroll: { padding: 12 },

  nodeWrap:   { alignItems: "center", width: 72, gap: 5 },
  nodeCircle: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  tierBadge: {
    position: "absolute", top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  tierBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold" },
  nodeEmoji:     { fontSize: 18 },
  nodeStar:      { fontSize: 16 },
  nodeLock:      { fontSize: 14 },
  nodeName: {
    fontSize: 9, fontFamily: "Inter_500Medium",
    textAlign: "center", lineHeight: 12,
  },
  costChip: {
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  costChipText: { fontSize: 8, fontFamily: "Inter_700Bold" },

  connector:  { alignItems: "center", paddingVertical: 2 },
  connLine:   { width: 1, height: 8, borderLeftWidth: 1, borderStyle: "dashed" },
  connArrow:  { fontSize: 7 },

  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyBox: {
    margin: 20, paddingVertical: 48,
    borderWidth: 1, borderStyle: "dashed", borderRadius: 12,
    alignItems: "center", gap: 8,
  },
  emptyEmoji: { fontSize: 40, opacity: 0.3 },
  emptyTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

const tv = StyleSheet.create({
  header: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  treeEmoji: { fontSize: 18 },
  treeName:  { fontSize: 16, fontFamily: "SpecialElite_400Regular", letterSpacing: 0.4 },
  treeDesc:  { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15, marginBottom: 8 },

  masteryRow:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  masteryLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  masteryTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  masteryFill:  { height: "100%", borderRadius: 2 },

  tierLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  tierLine:     { flex: 1, height: 1 },
  tierLabel:    { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },

  nodeRow: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "center", gap: 12,
    marginBottom: 4,
  },
});

const d = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000075",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  accent: { height: 3 },

  headerRow: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 12, padding: 16, paddingBottom: 8,
  },
  badgeRow:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  badge:     { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  tierText:  { fontSize: 9, fontFamily: "Inter_400Regular" },
  nodeTitle: { fontSize: 17, fontFamily: "SpecialElite_400Regular", letterSpacing: 0.3 },

  xpBubble: {
    alignItems: "center", borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 54,
  },
  xpAmt:   { fontSize: 18, fontFamily: "Inter_700Bold" },
  xpLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", marginTop: -2 },

  description: {
    fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18,
    paddingHorizontal: 16, marginBottom: 10,
  },

  effectBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderRadius: 8, padding: 8,
  },
  effectText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 16 },

  warnBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderRadius: 8, padding: 8,
  },
  warnText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },

  section:      { paddingHorizontal: 16, marginBottom: 10 },
  sectionLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, marginBottom: 6 },
  chipRow:      { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip:         { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  chipText:     { fontSize: 10, fontFamily: "Inter_500Medium" },

  prereqRow:  { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 2 },
  prereqName: { fontSize: 12, fontFamily: "Inter_400Regular" },

  unlockSection: { paddingHorizontal: 16, marginBottom: 6 },
  lockedNote:    { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 8 },
  unlockBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 12, alignItems: "center",
  },
  unlockBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  dismissRow: { alignItems: "center", paddingVertical: 12 },
  dismissText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
