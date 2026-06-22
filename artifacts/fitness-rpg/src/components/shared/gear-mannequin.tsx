import type { ElementType } from "react";
import {
  Armchair,
  Axe,
  BadgeIcon,
  Circle,
  Crown,
  Footprints,
  Gem,
  Hand,
  HandMetal,
  HardHat,
  PanelTop,
  Pickaxe,
  Shield,
  Shirt,
  Sparkles,
  Sword,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MannequinSlot = {
  slot: string;
  label: string;
  item: {
    id?: number;
    name: string;
    displayName?: string | null;
    rarity?: string | null;
    iconUrl?: string | null;
    iconKey?: string | null;
    mannequinLayerUrl?: string | null;
    mannequinLayerKey?: string | null;
    layerOrder?: number | null;
    loreText?: string | null;
    affinity?: string | null;
    elementalAffinity?: string | null;
    cosmeticKey?: string | null;
    cosmeticVariant?: string | null;
  } | null;
};

type PaperDollSlot = {
  slot: string;
  label: string;
  aliases: string[];
  icon: ElementType;
  side: "left" | "right" | "center";
  x: number;
  y: number;
};

export type EquipmentSlotSelection = {
  slot: string;
  label: string;
  aliases: string[];
};

export const EQUIPMENT_SLOT_GROUPS: EquipmentSlotSelection[] = [
  { slot: "head", label: "Head", aliases: ["head", "helmet", "helm", "hood", "circlet"] },
  { slot: "neck", label: "Neck", aliases: ["neck", "necklace", "amulet"] },
  { slot: "shoulders", label: "Shoulders", aliases: ["shoulders", "pauldrons", "mantle"] },
  { slot: "cloak", label: "Cloak", aliases: ["cloak", "cape", "back"] },
  { slot: "chest", label: "Chest", aliases: ["chest", "armor", "robe", "body"] },
  { slot: "arms", label: "Arms", aliases: ["arms", "bracers", "vambraces"] },
  { slot: "hands", label: "Hands", aliases: ["hands", "gloves", "gloves_wraps", "wraps", "gauntlets"] },
  { slot: "waist", label: "Waist", aliases: ["waist", "belt", "sash"] },
  { slot: "ring_left", label: "Ring Left", aliases: ["ring_left", "ring"] },
  { slot: "legs", label: "Legs", aliases: ["legs", "pants", "greaves"] },
  { slot: "ring_right", label: "Ring Right", aliases: ["ring_right", "ring"] },
  { slot: "feet", label: "Feet", aliases: ["feet", "boots"] },
  { slot: "weapon", label: "Weapon", aliases: ["weapon", "main_hand", "mainhand"] },
  { slot: "offhand", label: "Off Hand", aliases: ["offhand", "off_hand", "shield"] },
  { slot: "relic", label: "Relic", aliases: ["relic"] },
  { slot: "title", label: "Title", aliases: ["title", "banner"] },
  { slot: "aura_cosmetic", label: "Aura", aliases: ["aura_cosmetic", "aura", "aura_effect", "cosmetic"] },
];

const PAPER_DOLL_SLOTS: PaperDollSlot[] = [
  { slot: "head", label: "Head", aliases: ["head", "helmet", "helm", "hood", "circlet"], icon: HardHat, side: "center", x: 50, y: 10 },
  { slot: "neck", label: "Neck", aliases: ["neck", "necklace", "amulet"], icon: Circle, side: "left", x: 30, y: 22 },
  { slot: "shoulders", label: "Shoulders", aliases: ["shoulders", "pauldrons", "mantle"], icon: PanelTop, side: "left", x: 18, y: 34 },
  { slot: "cloak", label: "Cloak", aliases: ["cloak", "cape", "back"], icon: Shield, side: "right", x: 72, y: 30 },
  { slot: "chest", label: "Chest", aliases: ["chest", "armor", "robe", "body"], icon: Shirt, side: "right", x: 76, y: 43 },
  { slot: "arms", label: "Arms", aliases: ["arms", "bracers", "vambraces"], icon: Armchair, side: "left", x: 18, y: 48 },
  { slot: "hands", label: "Hands", aliases: ["hands", "gloves", "gloves_wraps", "wraps", "gauntlets"], icon: Hand, side: "right", x: 76, y: 55 },
  { slot: "waist", label: "Waist", aliases: ["waist", "belt", "sash"], icon: BadgeIcon, side: "left", x: 18, y: 62 },
  { slot: "ring_left", label: "Ring Left", aliases: ["ring_left", "ring"], icon: Gem, side: "right", x: 76, y: 67 },
  { slot: "legs", label: "Legs", aliases: ["legs", "pants", "greaves"], icon: UserRound, side: "left", x: 18, y: 75 },
  { slot: "ring_right", label: "Ring Right", aliases: ["ring_right", "ring"], icon: Gem, side: "right", x: 77, y: 79 },
  { slot: "feet", label: "Feet", aliases: ["feet", "boots"], icon: Footprints, side: "left", x: 18, y: 87 },
  { slot: "weapon", label: "Weapon", aliases: ["weapon", "main_hand", "mainhand"], icon: Sword, side: "right", x: 78, y: 91 },
];

const SUPPORT_SLOTS: PaperDollSlot[] = [
  { slot: "offhand", label: "Off Hand", aliases: ["offhand", "off_hand", "shield"], icon: Shield, side: "center", x: 0, y: 0 },
  { slot: "relic", label: "Relic", aliases: ["relic"], icon: Sparkles, side: "center", x: 0, y: 0 },
  { slot: "title", label: "Title", aliases: ["title", "banner"], icon: Crown, side: "center", x: 0, y: 0 },
  { slot: "aura_cosmetic", label: "Aura", aliases: ["aura_cosmetic", "aura", "aura_effect", "cosmetic"], icon: Sparkles, side: "center", x: 0, y: 0 },
];

const RARITY_STYLE: Record<string, { border: string; text: string; bg: string; glow: string }> = {
  common: {
    border: "border-[#6b655e]",
    text: "text-[#d8c4a5]",
    bg: "bg-[#15130f]",
    glow: "",
  },
  uncommon: {
    border: "border-[#3e8f5c]",
    text: "text-[#a8c9b0]",
    bg: "bg-[#0f1a13]",
    glow: "shadow-[0_0_18px_rgba(62,143,92,0.18)]",
  },
  rare: {
    border: "border-[#3e7f9f]",
    text: "text-[#9ed7e0]",
    bg: "bg-[#0d161b]",
    glow: "shadow-[0_0_18px_rgba(62,127,159,0.2)]",
  },
  epic: {
    border: "border-[#7d5bb5]",
    text: "text-[#c7abe9]",
    bg: "bg-[#171120]",
    glow: "shadow-[0_0_20px_rgba(125,91,181,0.22)]",
  },
  legendary: {
    border: "border-[#d7a54d]",
    text: "text-[#f1d18b]",
    bg: "bg-[#1d160d]",
    glow: "shadow-[0_0_24px_rgba(217,165,77,0.28)]",
  },
};

const AFFINITY_GLOW: Record<string, string> = {
  fire: "shadow-[0_0_40px_rgba(217,95,69,0.22)]",
  water: "shadow-[0_0_40px_rgba(73,163,160,0.2)]",
  lightning: "shadow-[0_0_40px_rgba(217,173,99,0.24)]",
  earth: "shadow-[0_0_40px_rgba(125,106,72,0.24)]",
  physical: "shadow-[0_0_30px_rgba(217,173,99,0.12)]",
};

const ICON_KEY: Record<string, ElementType> = {
  axe: Axe,
  blade: Sword,
  boots: Footprints,
  bracer: Armchair,
  chest: Shirt,
  cloak: Shield,
  effect: Sparkles,
  gauntlet: HandMetal,
  gloves: Hand,
  helmet: HardHat,
  pickaxe: Pickaxe,
  relic: Sparkles,
  ring: Gem,
  shield: Shield,
  sword: Sword,
  title: Crown,
};

function rarityStyle(rarity?: string | null) {
  return RARITY_STYLE[rarity ?? "common"] ?? RARITY_STYLE.common;
}

function findSourceSlot(slots: MannequinSlot[], paperSlot: PaperDollSlot) {
  return slots.find((source) => paperSlot.aliases.includes(source.slot));
}

function resolvePaperSlot(slots: MannequinSlot[], paperSlot: PaperDollSlot): MannequinSlot {
  const source = findSourceSlot(slots, paperSlot);
  return {
    slot: paperSlot.slot,
    label: paperSlot.label,
    item: source?.item ?? null,
  };
}

function supportSlots(slots: MannequinSlot[]) {
  return SUPPORT_SLOTS.map((slot) => resolvePaperSlot(slots, slot));
}

function itemName(item: MannequinSlot["item"]) {
  return item?.displayName ?? item?.name ?? "Empty";
}

function GearIcon({
  slot,
  fallbackIcon,
}: {
  slot: MannequinSlot;
  fallbackIcon: ElementType;
}) {
  const Icon = slot.item?.iconKey ? (ICON_KEY[slot.item.iconKey] ?? fallbackIcon) : fallbackIcon;

  if (slot.item?.iconUrl) {
    return <img src={slot.item.iconUrl} alt="" className="size-5 object-contain" draggable={false} />;
  }

  return <Icon className="size-4" />;
}

function EquipmentSlot({
  slot,
  icon: Icon,
  active,
  onSelect,
}: {
  slot: MannequinSlot;
  icon: ElementType;
  active?: boolean;
  onSelect?: () => void;
}) {
  const style = rarityStyle(slot.item?.rarity);
  const affinity = slot.item?.affinity ?? slot.item?.elementalAffinity;
  const content = (
    <div className="flex items-start gap-2">
      <div className={cn("flex size-8 shrink-0 items-center justify-center border bg-[#15130f]", slot.item ? [style.border, style.text] : "border-[#3b3328] text-[#6f685f]")}>
        <GearIcon slot={slot} fallbackIcon={Icon} />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f887d]">{slot.label}</p>
        <p className={cn("mt-0.5 truncate font-serif text-xs font-bold", slot.item ? "text-[#eee5d7]" : "text-[#6f685f]")}>
          {itemName(slot.item)}
        </p>
        {affinity && (
          <p className="mt-0.5 text-[10px] capitalize text-[#49a3a0]">{affinity} affinity</p>
        )}
      </div>
    </div>
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full border p-2.5 transition-colors hover:border-[#d7a54d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7a54d]/70",
        slot.item ? [style.border, style.bg, style.glow] : "border-[#3b3328] bg-[#0c0b09]",
        active && "border-[#d7a54d] bg-[#21170f] shadow-[0_0_20px_rgba(217,165,77,0.22)]",
      )}
      aria-pressed={active}
      aria-label={`Show ${slot.label} gear`}
    >
      {content}
    </button>
  );
}

function SlotField({
  slot,
  active,
  onSelect,
}: {
  slot: MannequinSlot & Pick<PaperDollSlot, "x" | "y">;
  active?: boolean;
  onSelect?: () => void;
}) {
  const style = rarityStyle(slot.item?.rarity);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 border text-center transition-all md:block",
        slot.item
          ? ["max-w-[132px] px-2 py-1 text-[9px] font-bold", style.border, style.text, style.bg, style.glow]
          : "size-8 border-[#6b4d2f]/60 bg-[#0c0b09]/30 text-transparent hover:bg-[#d7a54d]/15",
        active && "border-[#d7a54d] bg-[#21170f] text-[#f1dfc6] shadow-[0_0_22px_rgba(217,165,77,0.35)]",
      )}
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
      aria-pressed={active}
      aria-label={`Show ${slot.label} gear`}
    >
      {slot.item ? <span className="block truncate">{itemName(slot.item)}</span> : <span className="sr-only">{slot.label}</span>}
    </button>
  );
}

function EquipmentFigure({
  slots,
  support,
  affinity,
  selectedSlot,
  onSlotSelect,
}: {
  slots: Array<MannequinSlot & Pick<PaperDollSlot, "x" | "y" | "aliases">>;
  support: MannequinSlot[];
  affinity: string;
  selectedSlot?: string | null;
  onSlotSelect?: (slot: EquipmentSlotSelection) => void;
}) {
  const title = support.find((slot) => slot.slot === "title")?.item;
  const aura = support.find((slot) => slot.slot === "aura_cosmetic")?.item;
  const layers = [...slots, ...support]
    .map((slot) => slot.item)
    .filter((item): item is NonNullable<MannequinSlot["item"]> => Boolean(item?.mannequinLayerUrl))
    .sort((a, b) => (a.layerOrder ?? 0) - (b.layerOrder ?? 0));

  return (
    <div className={cn("relative overflow-hidden border border-[#3b3328] bg-black", AFFINITY_GLOW[affinity] ?? AFFINITY_GLOW.physical)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(217,173,99,0.13),transparent_35%),linear-gradient(180deg,rgba(107,77,47,0.16),transparent_58%)]" />
      {aura && <div className="absolute inset-10 rounded-full border border-[#49a3a0]/40 shadow-[0_0_56px_rgba(73,163,160,0.28)]" />}
      {title && (
        <div className="absolute left-1/2 top-4 z-20 max-w-[82%] -translate-x-1/2 border border-[#6b4d2f] bg-[#0c0b09]/92 px-3 py-1 text-center font-serif text-xs font-bold text-[#d9ad63]">
          {itemName(title)}
        </div>
      )}
      <img
        src="/assets/aethoria-equipment-paper-doll.png"
        alt="Neutral equipment paper doll"
        className="relative z-0 mx-auto block max-h-[760px] w-full object-contain"
        draggable={false}
      />
      {layers.map((item) => (
        <img
          key={`${item.id ?? item.name}-${item.mannequinLayerUrl}`}
          src={item.mannequinLayerUrl ?? ""}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          style={{ zIndex: 5 + (item.layerOrder ?? 0) }}
          draggable={false}
        />
      ))}
      {slots.map((slot) => (
        <SlotField
          key={slot.slot}
          slot={slot}
          active={selectedSlot === slot.slot}
          onSelect={() => onSlotSelect?.({ slot: slot.slot, label: slot.label, aliases: slot.aliases })}
        />
      ))}
      <div className="absolute bottom-3 left-3 z-20 border border-[#3b3328] bg-[#0c0b09]/95 px-2 py-1 text-[10px]">
        <span className="text-[#8f887d]">Affinity</span>
        <span className="ml-2 font-serif font-bold capitalize text-[#49a3a0]">{affinity}</span>
      </div>
    </div>
  );
}

export function GearMannequin({
  slots,
  className,
  selectedSlot,
  onSlotSelect,
}: {
  slots: MannequinSlot[];
  className?: string;
  selectedSlot?: string | null;
  onSlotSelect?: (slot: EquipmentSlotSelection) => void;
}) {
  const paperSlots = PAPER_DOLL_SLOTS.map((paperSlot) => ({
    ...resolvePaperSlot(slots, paperSlot),
    x: paperSlot.x,
    y: paperSlot.y,
    aliases: paperSlot.aliases,
    icon: paperSlot.icon,
    side: paperSlot.side,
  }));
  const support = supportSlots(slots);
  const equippedCount = [...paperSlots, ...support].filter((slot) => slot.item).length;
  const totalSlots = paperSlots.length + SUPPORT_SLOTS.length;
  const affinity =
    [...paperSlots, ...support].find((slot) => slot.item?.elementalAffinity && slot.item.elementalAffinity !== "physical")?.item
      ?.elementalAffinity ?? "physical";
  const leftSlots = paperSlots.filter((slot) => slot.side === "left");
  const rightSlots = paperSlots.filter((slot) => slot.side === "right");
  const centerSlots = paperSlots.filter((slot) => slot.side === "center");

  return (
    <section className={cn("border border-[#6b4d2f] bg-[#11100e] p-4", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold text-[#d9ad63]">Equipment</h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[#8f887d]">
            A neutral vessel for the adventurer's raiment. No face, no hairstyle, no costume creator. The gear tells the story.
          </p>
        </div>
        <div className="border border-[#3b3328] bg-[#0c0b09] px-2 py-1 text-right text-[10px]">
          <p className="text-[#8f887d]">Equipped</p>
          <p className="font-mono text-[#d9ad63]">
            {equippedCount}/{totalSlots}
          </p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[230px_minmax(360px,1fr)_230px]">
        <div className="order-2 grid grid-cols-2 gap-2 xl:order-1 xl:grid-cols-1">
          {[...centerSlots, ...leftSlots].map((slot) => (
            <EquipmentSlot
              key={slot.slot}
              slot={slot}
              icon={slot.icon}
              active={selectedSlot === slot.slot}
              onSelect={() => onSlotSelect?.({ slot: slot.slot, label: slot.label, aliases: slot.aliases })}
            />
          ))}
        </div>

        <div className="order-1 xl:order-2">
          <EquipmentFigure slots={paperSlots} support={support} affinity={affinity} selectedSlot={selectedSlot} onSlotSelect={onSlotSelect} />
        </div>

        <div className="order-3 grid grid-cols-2 gap-2 xl:grid-cols-1">
          {rightSlots.map((slot) => (
            <EquipmentSlot
              key={slot.slot}
              slot={slot}
              icon={slot.icon}
              active={selectedSlot === slot.slot}
              onSelect={() => onSlotSelect?.({ slot: slot.slot, label: slot.label, aliases: slot.aliases })}
            />
          ))}
          {support.map((slot) => {
            const supportSource = SUPPORT_SLOTS.find((source) => source.slot === slot.slot);
            const Icon = supportSource?.icon ?? HandMetal;
            return (
              <EquipmentSlot
                key={slot.slot}
                slot={slot}
                icon={Icon}
                active={selectedSlot === slot.slot}
                onSelect={() => onSlotSelect?.({
                  slot: slot.slot,
                  label: slot.label,
                  aliases: supportSource?.aliases ?? [slot.slot],
                })}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
