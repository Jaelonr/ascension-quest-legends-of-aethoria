import { useState } from "react";
import {
  useGetInventory, useGetStoreItems, usePurchaseStoreItem,
  useGetArmory, useEquipGear, useGetStoreSections,
  customFetch,
  type RpgGear,
} from "@workspace/api-client-react";

import { PageHeader } from "@/components/shared/page-header";
import {
  EQUIPMENT_SLOT_GROUPS,
  GearMannequin,
  type EquipmentSlotSelection,
  type MannequinSlot,
} from "@/components/shared/gear-mannequin";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Backpack, Shield, Sword, Lock, Calendar, Clock, Eye, Layers, ScrollText, Sparkles, Swords } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const RARITY_STYLES: Record<string, { label: string; color: string; border: string; glow: string; bg: string }> = {
  common:    { label: "Common",    color: "text-gray-400",   border: "border-gray-400/30",   glow: "",                                    bg: "bg-gray-400/5" },
  uncommon:  { label: "Uncommon",  color: "text-green-400",  border: "border-green-400/30",  glow: "shadow-[0_0_12px_rgba(34,197,94,0.12)]",  bg: "bg-green-400/5" },
  rare:      { label: "Rare",      color: "text-blue-400",   border: "border-blue-400/30",   glow: "shadow-[0_0_14px_rgba(59,130,246,0.15)]",  bg: "bg-blue-400/5" },
  epic:      { label: "Epic",      color: "text-purple-400", border: "border-purple-400/30", glow: "shadow-[0_0_16px_rgba(168,85,247,0.2)]",  bg: "bg-purple-400/5" },
  legendary: { label: "Legendary", color: "text-yellow-400", border: "border-yellow-400/40", glow: "shadow-[0_0_20px_rgba(234,179,8,0.25)]",  bg: "bg-yellow-400/5" },
};

const STYLE_COLORS: Record<string, string> = {
  strength: "text-red-400 border-red-400/30 bg-red-400/10",
  striking: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  conditioning: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  grappling: "text-purple-400 border-purple-400/30 bg-purple-400/10",
  recovery: "text-green-400 border-green-400/30 bg-green-400/10",
  discipline: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
};

const SLOT_ICONS: Record<string, string> = {
  weapon: "⚔️", offhand: "🛡️", helmet: "🪖", chest: "🧥",
  gloves: "🧤", boots: "👢", ring: "💍", necklace: "📿",
};

const CATEGORY_ICONS: Record<string, string> = {
  consumable: "🧪", gear: "⚔️", cosmetic: "🎨", title: "📜", utility: "🔧",
};

function GearDetailPanel({ gear, slotLabel }: { gear: RpgGear | null; slotLabel?: string }) {
  if (!gear) {
    return (
      <div className="border border-dashed border-[#3b3328] bg-[#0c0b09] p-4">
        <div className="flex items-center gap-2 text-[#8f887d]">
          <Eye className="size-4" />
          <p className="font-serif text-sm font-bold">Select a piece to inspect it.</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#8f887d]">
          The armory records lore, bonuses, source, affinity, and future mannequin-layer data for each artifact.
        </p>
      </div>
    );
  }

  const r = RARITY_STYLES[gear.rarity] ?? RARITY_STYLES.common;
  const displayName = gear.displayName ?? gear.name;
  const lore = gear.loreText ?? gear.flavorText ?? "No lore has been recovered for this piece yet.";
  const affinity = gear.affinity ?? gear.elementalAffinity ?? "physical";
  const statBonusEntries = Object.entries(gear.statBonuses ?? {}).filter(([, v]) => (v ?? 0) > 0);

  return (
    <div className={cn("border bg-[#0c0b09] p-4", r.border, r.glow)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#8f887d]">{slotLabel ?? gear.slot.replace(/_/g, " ")}</p>
          <h3 className={cn("mt-1 font-serif text-lg font-bold", r.color)}>{displayName}</h3>
        </div>
        <span className={cn("border px-2 py-1 text-[10px] font-mono uppercase", r.border, r.color)}>{r.label}</span>
      </div>
      <p className="mt-3 text-sm italic leading-relaxed text-[#d8c4a5]">"{lore}"</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="border border-[#3b3328] bg-[#11100e] p-2">
          <p className="text-[#8f887d]">Affinity</p>
          <p className="mt-0.5 capitalize text-[#49a3a0]">{affinity}</p>
        </div>
        <div className="border border-[#3b3328] bg-[#11100e] p-2">
          <p className="text-[#8f887d]">Source</p>
          <p className="mt-0.5 text-[#d8c4a5]">{gear.source ?? "Unknown"}</p>
        </div>
      </div>
      {statBonusEntries.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {statBonusEntries.map(([stat, val]) => (
            <span key={stat} className={cn("border px-2 py-1 text-[10px] font-mono", r.border, r.color, r.bg)}>
              +{val} {stat.slice(0, 3).toUpperCase()}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 grid gap-2 text-[10px] text-[#8f887d] md:grid-cols-2">
        <div className="flex items-center gap-1.5"><Layers className="size-3" /> Layer: {gear.mannequinLayerKey ?? gear.mannequinLayerUrl ?? "Reserved"}</div>
        <div className="flex items-center gap-1.5"><Sparkles className="size-3" /> Cosmetic: {gear.cosmeticVariant ?? gear.cosmeticKey ?? "Default"}</div>
      </div>
    </div>
  );
}

function GearCard({ gear, onInspect, inspecting }: { gear: RpgGear; onInspect?: (gear: RpgGear) => void; inspecting?: boolean }) {
  const r = RARITY_STYLES[gear.rarity] ?? RARITY_STYLES.common;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const equipGear = useEquipGear();
  const displayName = gear.displayName ?? gear.name;
  const lore = gear.loreText ?? gear.flavorText;
  const affinity = gear.affinity ?? gear.elementalAffinity;

  const statBonusEntries = Object.entries(gear.statBonuses ?? {}).filter(([, v]) => (v ?? 0) > 0);

  const handleEquip = () => {
    equipGear.mutate({ id: gear.id }, {
      onSuccess: (data) => {
        toast({
          title: data.equipped ? `${displayName} Equipped` : "Unequipped",
          description: data.equipped ? `${gear.slot} slot updated.` : `${displayName} removed from ${gear.slot}.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/armory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/character/summary"] });
      },
    });
  };

  return (
    <Card className={cn("border overflow-hidden transition-all duration-200", r.border, r.glow, r.bg, gear.equipped && "ring-1 ring-current", inspecting && "ring-1 ring-[#d7a54d]")}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <span className="text-xl shrink-0 mt-0.5">{SLOT_ICONS[gear.slot] ?? "🎁"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className={cn("font-serif font-bold text-sm leading-tight truncate", r.color)}>{displayName}</h3>
                {gear.equipped && (
                  <span className={cn("text-[9px] font-mono border px-1 py-0 rounded shrink-0 uppercase", r.color, r.border)}>ON</span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn("text-[9px] font-mono uppercase tracking-wide", r.color)}>{r.label}</span>
                <span className="text-[9px] text-muted-foreground capitalize">{gear.slot.replace(/_/g, " ")}</span>
                {affinity && (
                  <span className="text-[9px] text-cyan-300/80 capitalize">{affinity}</span>
                )}
              </div>
              {statBonusEntries.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {statBonusEntries.map(([stat, val]) => (
                    <span key={stat} className={cn("text-[9px] font-mono border px-1.5 py-0.5 rounded", r.border, r.color, r.bg)}>
                      +{val} {stat.slice(0, 3).toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
              {lore && (
                <p className="text-[10px] text-muted-foreground italic mt-1.5 leading-tight line-clamp-2">"{lore}"</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            {onInspect && (
              <Button size="sm" variant="outline" className="h-7 border-[#6b4d2f] text-[10px] text-[#d9ad63]" onClick={() => onInspect(gear)}>
                Inspect
              </Button>
            )}
            <Button
              size="sm" variant="outline"
              className={cn("h-7 text-[10px]", gear.equipped ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : cn(r.border, r.color, "hover:bg-white/5"))}
              onClick={handleEquip}
              disabled={equipGear.isPending}
            >
              {gear.equipped ? "Unequip" : "Equip"}
            </Button>
          </div>
        </div>
        {gear.source && (
          <p className="text-[9px] text-muted-foreground/50 mt-2 font-mono">Source: {gear.source}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StoreItemCard({
  item,
  onBuy,
  isPending,
}: {
  item: any;
  onBuy: (id: number) => void;
  isPending: boolean;
}) {
  const r = RARITY_STYLES[item.rarity] ?? RARITY_STYLES.common;
  const locked = item.meetsRequirements === false;
  const styleClass = item.styleAffinity ? STYLE_COLORS[item.styleAffinity] : null;

  return (
    <Card className={cn(
      "border overflow-hidden transition-all duration-200",
      r.border, r.bg,
      !locked && r.glow,
      locked && "opacity-60"
    )}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="text-xl shrink-0 mt-0.5">
            {CATEGORY_ICONS[item.category] ?? "🎁"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <h3 className={cn("font-serif font-bold text-sm leading-tight", r.color)}>{item.name}</h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className={cn("text-[9px] font-mono uppercase tracking-wide", r.color)}>{r.label}</span>
                  {item.styleAffinity && styleClass && (
                    <span className={cn("text-[9px] font-mono border px-1.5 py-0.5 rounded-full capitalize", styleClass)}>
                      {item.styleAffinity}
                    </span>
                  )}
                  {item.rankRequired && (
                    <span className="text-[9px] font-mono text-muted-foreground border border-border/30 px-1.5 py-0.5 rounded">
                      Rank {item.rankRequired}+
                    </span>
                  )}
                  {item.levelRequired && (
                    <span className="text-[9px] font-mono text-muted-foreground">
                      Lv.{item.levelRequired}+
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{item.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2.5 gap-2">
              <div className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-sm font-mono font-bold text-yellow-400">{item.goldCost}</span>
              </div>
              {locked ? (
                <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                  <Lock className="w-3 h-3" /> Locked
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("h-7 text-[10px]", r.border, r.color, "hover:bg-white/5")}
                  onClick={() => onBuy(item.id)}
                  disabled={isPending}
                >
                  Buy
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CATEGORY_FILTERS = ["all", "consumable", "gear", "cosmetic", "title", "utility"] as const;
const TAB_VALUES = ["armory", "items", "store"] as const;

function displaySlot(slot: string) {
  if (slot === "helmet") return "head";
  if (slot === "chest") return "armor";
  if (slot === "back") return "cloak";
  if (slot === "main_hand") return "weapon";
  if (slot === "off_hand") return "offhand";
  if (slot === "aura_effect") return "aura_cosmetic";
  if (slot === "banner") return "title";
  if (slot === "necklace") return "neck";
  if (slot === "gloves") return "gloves_wraps";
  return slot;
}

function initialTab() {
  const requested = new URLSearchParams(window.location.search).get("tab");
  return TAB_VALUES.includes(requested as typeof TAB_VALUES[number]) ? requested as typeof TAB_VALUES[number] : "store";
}

function armoryToMannequinSlots(gear: RpgGear[]): MannequinSlot[] {
  const equippedBySlot = new Map<string, RpgGear>();
  for (const item of gear.filter((piece) => piece.equipped)) {
    equippedBySlot.set(displaySlot(item.slot), item);
    equippedBySlot.set(item.slot, item);
  }

  return EQUIPMENT_SLOT_GROUPS.map(({ slot, label, aliases }) => {
    const item = aliases.map((alias) => equippedBySlot.get(alias)).find(Boolean) ?? null;
    return {
      slot,
      label,
      item: item ? {
        id: item.id,
        name: item.name,
        displayName: item.displayName,
        rarity: item.rarity,
        iconUrl: item.iconUrl,
        iconKey: item.iconKey,
        mannequinLayerUrl: item.mannequinLayerUrl,
        mannequinLayerKey: item.mannequinLayerKey,
        layerOrder: item.layerOrder,
        loreText: item.loreText,
        affinity: item.affinity,
        elementalAffinity: item.elementalAffinity,
        cosmeticKey: item.cosmeticKey,
        cosmeticVariant: item.cosmeticVariant,
      } : null,
    };
  });
}

function gearMatchesSlot(gear: RpgGear, selection: EquipmentSlotSelection) {
  return selection.aliases.includes(gear.slot) || selection.aliases.includes(displaySlot(gear.slot));
}

function StoreSection({
  items,
  purchase,
  onBuy,
}: {
  items: any[];
  purchase: any;
  onBuy: (id: number) => void;
}) {
  const [catFilter, setCatFilter] = useState<string>("all");
  const filtered = catFilter === "all" ? items : items.filter(i => i.category === catFilter);
  const availableCats = new Set(items.map(i => i.category));

  return (
    <div className="space-y-3">
      {/* Category filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORY_FILTERS.filter(c => c === "all" || availableCats.has(c)).map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={cn(
              "text-[10px] font-mono px-2.5 py-1 rounded-full border transition-colors capitalize",
              catFilter === cat
                ? "bg-primary/20 border-primary/50 text-primary"
                : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            {cat === "all" ? `All (${items.length})` : `${CATEGORY_ICONS[cat] ?? ""} ${cat}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">No items in this category.</div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(item => (
            <StoreItemCard
              key={item.id}
              item={item}
              onBuy={onBuy}
              isPending={purchase.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Inventory() {
  const { data: inventory, isLoading: isLoadingInv } = useGetInventory();
  const { data: armory, isLoading: isLoadingArmory } = useGetArmory();
  const { data: sections, isLoading: isLoadingSections } = useGetStoreSections({
    query: { queryKey: ["/api/store/sections"] },
  });
  const purchase = usePurchaseStoreItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<typeof TAB_VALUES[number]>(initialTab);
  const [selectedArmorySlot, setSelectedArmorySlot] = useState<EquipmentSlotSelection | null>(null);
  const [inspectedGearId, setInspectedGearId] = useState<number | null>(null);

  function handleTabChange(value: string) {
    const next = TAB_VALUES.includes(value as typeof TAB_VALUES[number]) ? value as typeof TAB_VALUES[number] : "store";
    setActiveTab(next);
    const url = new URL(window.location.href);
    if (next === "store") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const handleSell = async (inventoryId: number) => {
    try {
      const res = await customFetch<{ message: string; goldReceived: number }>(`/api/inventory/${inventoryId}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      });
      toast({ title: "Item Released", description: res.message });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
    } catch (err: any) {
      toast({ title: "Could not sell item", description: err.message, variant: "destructive" });
    }
  };

  const handlePurchase = (itemId: number) => {
    purchase.mutate({ data: { itemId, quantity: 1 } }, {
      onSuccess: (res) => {
        toast({ title: "Item Acquired", description: res.message });
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/player"] });
        queryClient.invalidateQueries({ queryKey: ["/api/store/sections"] });
      },
      onError: (err: any) => {
        toast({ title: "Purchase Failed", description: err.message || "Not enough gold", variant: "destructive" });
      }
    });
  };

  if (isLoadingInv || isLoadingArmory) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inventory" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const equippedGear = armory?.filter(g => g.equipped) ?? [];
  const RARITY_ORDER = ["legendary", "epic", "rare", "uncommon", "common"];
  const sortedGear = [...(armory ?? [])].sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(a.rarity);
    const rb = RARITY_ORDER.indexOf(b.rarity);
    if (ra !== rb) return ra - rb;
    return new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime();
  });
  const mannequinSlots = armoryToMannequinSlots(armory ?? []);
  const selectedSlotGear = selectedArmorySlot ? sortedGear.filter((gear) => gearMatchesSlot(gear, selectedArmorySlot)) : [];
  const unequippedGear = sortedGear.filter(g => !g.equipped);
  const inspectedGear =
    sortedGear.find((gear) => gear.id === inspectedGearId) ??
    selectedSlotGear.find((gear) => gear.equipped) ??
    selectedSlotGear[0] ??
    equippedGear[0] ??
    null;

  const dailyItems  = sections?.daily     ?? [];
  const weeklyItems = sections?.weekly    ?? [];
  const permItems   = sections?.permanent ?? [];
  const raidItems   = sections?.raid      ?? [];

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Character Armory" subtitle="Gear, items, and the Hall's Offerings" />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-black/40 border border-border/50 h-12">
          <TabsTrigger value="armory" className="data-[state=active]:bg-card data-[state=active]:text-yellow-400 gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" /> Armory
          </TabsTrigger>
          <TabsTrigger value="items" className="data-[state=active]:bg-card data-[state=active]:text-primary gap-1.5 text-xs">
            <Backpack className="w-3.5 h-3.5" /> Items
          </TabsTrigger>
          <TabsTrigger value="store" className="data-[state=active]:bg-card data-[state=active]:text-yellow-400 gap-1.5 text-xs">
            <Coins className="w-3.5 h-3.5" /> Offerings
          </TabsTrigger>
        </TabsList>

        {/* ── Armory ──────────────────────────────────────── */}
        <TabsContent value="armory" className="pt-4 space-y-4">
          <GearMannequin
            slots={mannequinSlots}
            selectedSlot={selectedArmorySlot?.slot ?? null}
            onSlotSelect={(slot) => {
              setSelectedArmorySlot((current) => current?.slot === slot.slot ? null : slot);
              setInspectedGearId(null);
            }}
          />

          {selectedArmorySlot && (
            <div className="border border-[#6b4d2f] bg-[#11100e] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-serif text-sm font-bold text-[#d9ad63]">{selectedArmorySlot.label}</p>
                  <p className="text-[10px] uppercase tracking-widest text-[#8f887d]">
                    {selectedSlotGear.length ? `${selectedSlotGear.length} compatible item${selectedSlotGear.length === 1 ? "" : "s"}` : "No compatible gear found"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-[#6b4d2f] text-[10px] text-[#d9ad63]"
                  onClick={() => setSelectedArmorySlot(null)}
                >
                  Show All
                </Button>
              </div>
              {selectedSlotGear.length ? (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                  <div className="space-y-2">
                    {selectedSlotGear.map(g => (
                      <GearCard
                        key={g.id}
                        gear={g}
                        onInspect={(gear) => setInspectedGearId(gear.id)}
                        inspecting={inspectedGear?.id === g.id}
                      />
                    ))}
                  </div>
                  <GearDetailPanel gear={inspectedGear} slotLabel={selectedArmorySlot.label} />
                </div>
              ) : (
                <div className="border border-dashed border-[#3b3328] bg-[#0c0b09] p-6 text-center">
                  <p className="font-serif text-sm text-[#d8c4a5]">No {selectedArmorySlot.label.toLowerCase()} pieces yet.</p>
                  <p className="mt-1 text-xs text-[#8f887d]">Bosses, commissions, and Hall offerings can add gear to this section later.</p>
                </div>
              )}
            </div>
          )}

          {!selectedArmorySlot && equippedGear.length > 0 && (
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2 px-1">Equipped</p>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                <div className="space-y-2">{equippedGear.map(g => <GearCard key={g.id} gear={g} onInspect={(gear) => setInspectedGearId(gear.id)} inspecting={inspectedGear?.id === g.id} />)}</div>
                <GearDetailPanel gear={inspectedGear} />
              </div>
            </div>
          )}
          {!selectedArmorySlot && unequippedGear.length > 0 && (
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2 px-1">
                {equippedGear.length > 0 ? "Unequipped" : "All Gear"} · {unequippedGear.length} items
              </p>
              <div className="space-y-2">{unequippedGear.map(g => <GearCard key={g.id} gear={g} onInspect={(gear) => setInspectedGearId(gear.id)} inspecting={inspectedGear?.id === g.id} />)}</div>
            </div>
          )}
          {!selectedArmorySlot && sortedGear.length === 0 && (
            <div className="text-center py-14 border border-dashed border-border/30 rounded-xl">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground text-sm font-medium">Armory is empty</p>
              <p className="text-xs text-muted-foreground mt-1">Complete boss raids to receive gear drops.</p>
            </div>
          )}
        </TabsContent>

        {/* ── Items ───────────────────────────────────────── */}
        <TabsContent value="items" className="pt-4 space-y-3">
          {inventory?.length === 0 ? (
            <div className="text-center py-14 border border-dashed border-border/30 rounded-xl">
              <Backpack className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground text-sm font-medium">Your bag is empty</p>
              <p className="text-xs text-muted-foreground mt-1">Purchase items from the store to fill your inventory.</p>
            </div>
          ) : (
            inventory?.map(item => {
              const r = RARITY_STYLES[item.rarity ?? "common"] ?? RARITY_STYLES.common;
              return (
                <Card key={item.id} className={cn("border overflow-hidden transition-all", r.border, r.bg, r.glow)}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="text-xl shrink-0 mt-0.5">{CATEGORY_ICONS[item.itemType ?? "consumable"] ?? "🎁"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <h3 className={cn("font-serif font-bold text-sm leading-tight", r.color)}>{item.itemName}</h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-xs border border-border/50 px-2 py-0.5 rounded bg-black/40 text-foreground">×{item.quantity}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className={cn("text-[9px] font-mono uppercase tracking-wide", r.color)}>{r.label}</span>
                          <span className="text-[9px] text-muted-foreground capitalize">{item.itemType?.replace(/_/g, " ")}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{item.description}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 border-yellow-700/30 text-[10px] text-yellow-400 hover:bg-yellow-500/10"
                          onClick={() => void handleSell(item.id)}
                        >
                          Sell
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── Store ───────────────────────────────────────── */}
        <TabsContent value="store" className="pt-4">
          <div className="mb-3 border border-[#6b4d2f] bg-[#11100e] p-3">
            <p className="font-serif text-sm font-bold text-[#d9ad63]">The Hall's Offerings</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8f887d]">
              The Hall is no common shop. Aldric once bound the thing beneath its stones, and now it reveals useful artifacts to adventurers who keep returning.
            </p>
          </div>
          {isLoadingSections ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : (
            <Tabs defaultValue="permanent" className="w-full">
              <TabsList className="w-full grid grid-cols-4 bg-black/40 border border-border/30 h-9 mb-4">
                <TabsTrigger value="permanent" className="text-[10px] data-[state=active]:bg-card gap-1">
                  <Sword className="w-3 h-3" /> Shop
                </TabsTrigger>
                <TabsTrigger value="daily" className="text-[10px] data-[state=active]:bg-card gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Daily</span>
                  {dailyItems.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-primary/30 text-primary text-[9px] flex items-center justify-center ml-0.5 font-bold">
                      {dailyItems.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="weekly" className="text-[10px] data-[state=active]:bg-card gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Weekly</span>
                </TabsTrigger>
                <TabsTrigger value="raid" className="text-[10px] data-[state=active]:bg-card gap-1">
                  <Swords className="w-3 h-3" />
                  <span>Raid</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="permanent" className="mt-0">
                <StoreSection items={permItems} purchase={purchase} onBuy={handlePurchase} />
              </TabsContent>

              <TabsContent value="daily" className="mt-0">
                <div className="text-[9px] font-mono text-muted-foreground mb-3 px-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Refreshes daily at midnight
                </div>
                {dailyItems.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border/30 rounded-xl">
                    No daily items available today.
                  </div>
                ) : (
                  <StoreSection items={dailyItems} purchase={purchase} onBuy={handlePurchase} />
                )}
              </TabsContent>

              <TabsContent value="weekly" className="mt-0">
                <div className="text-[9px] font-mono text-muted-foreground mb-3 px-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Refreshes every Monday
                </div>
                {weeklyItems.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border/30 rounded-xl">
                    No weekly items this week.
                  </div>
                ) : (
                  <StoreSection items={weeklyItems} purchase={purchase} onBuy={handlePurchase} />
                )}
              </TabsContent>

              <TabsContent value="raid" className="mt-0">
                <div className="text-[9px] font-mono text-muted-foreground mb-3 px-1 flex items-center gap-1.5">
                  <Swords className="w-3 h-3" /> Exclusive raid-tier items
                </div>
                {raidItems.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border/30 rounded-xl">
                    Clear raids to unlock exclusive items.
                  </div>
                ) : (
                  <StoreSection items={raidItems} purchase={purchase} onBuy={handlePurchase} />
                )}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
