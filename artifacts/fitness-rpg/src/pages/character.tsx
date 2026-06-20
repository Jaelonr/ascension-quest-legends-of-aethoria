import { useEffect, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { Link } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { AethoriaHeader, AethoriaPage } from "@/components/shared/aethoria-page";
import { GearMannequin } from "@/components/shared/gear-mannequin";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Boxes, Crown, Dumbbell, Eye, Palette, Route, Scale, Settings, Shield, UserRound } from "lucide-react";

type CharacterSummary = {
  player: any;
  identity: any;
  gearSlots: Array<{ slot: string; label: string; item: any | null }>;
  titles: any[];
  appearance: { aura: string | null; cosmeticCount: number };
  biometrics: any;
  realEquipment: Array<{ id: number; name: string; category: string; available: boolean }>;
  inventorySummary: { items: number; gear: number; equippedGear: number };
  settingsShortcuts: Array<{ key: string; label: string; href: string }>;
};

function useCharacterSummary() {
  const [data, setData] = useState<CharacterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    customFetch<CharacterSummary>("/api/character/summary")
      .then((summary) => { if (!cancelled) setData(summary); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { data, loading };
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[#3b3328] bg-[#11100e] p-3 text-center">
      <div className="font-serif text-xl font-bold text-[#d9ad63]">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-[#8f887d]">{label}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: ElementType; children: ReactNode }) {
  return (
    <Card className="border-[#3b3328] bg-[#11100e]">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon className="size-4 text-[#d7a54d]" />
          <h2 className="font-serif text-sm font-bold text-[#d9ad63]">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function displayGearName(item: any | null | undefined) {
  return item?.displayName ?? item?.name ?? "Empty";
}

function kgToLb(value?: number | null) {
  return value ? `${Math.round(value * 2.20462)} lb` : "Not set";
}

function cmToImperial(value?: number | null) {
  if (!value) return "Not set";
  const totalInches = Math.round(value / 2.54);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

export default function Character() {
  const { data, loading } = useCharacterSummary();
  if (loading || !data) {
    return (
      <AethoriaPage>
        <AethoriaHeader icon={UserRound} title="Character" subtitle="Identity written by action" />
        <Skeleton className="h-40 w-full rounded-none bg-[#171510]" />
        <Skeleton className="h-28 w-full rounded-none bg-[#171510]" />
      </AethoriaPage>
    );
  }

  const stats = data.player.stats ?? {};
  const bio = data.biometrics ?? {};

  return (
    <AethoriaPage>
      <AethoriaHeader icon={UserRound} title="Character" subtitle="Who you are in this world, shaped by what you do" />

      <Card className="overflow-hidden border-[#6b4d2f] bg-[#11100e]">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center border-2 border-[#d7a54d] bg-[#1b1511] font-serif text-2xl font-bold text-[#d7a54d]">
              {data.player.rank}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-xl font-bold text-[#f1dfc6]">{data.player.name}</p>
              <p className="text-xs text-[#8f887d]">Level {data.player.level} - {data.identity.class}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge className="bg-[#3b3328] text-[#d8c4a5]">{data.identity.activeTitle ?? "No title equipped"}</Badge>
                {data.identity.dominantStyle?.hybridArchetype && <Badge variant="outline" className="border-[#6b4d2f] text-[#d9ad63]">{data.identity.dominantStyle.hybridArchetype}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <StatBox label="STR" value={stats.strength ?? 5} />
        <StatBox label="AGI" value={stats.agility ?? 5} />
        <StatBox label="STA" value={stats.stamina ?? 5} />
        <StatBox label="VIT" value={stats.vitality ?? 5} />
        <StatBox label="DIS" value={stats.discipline ?? 5} />
        <StatBox label="SEN" value={stats.sense ?? 5} />
      </div>

      <GearMannequin slots={data.gearSlots} />

      <Section title="Class Path" icon={Route}>
        <div className="grid gap-2 md:grid-cols-3">
          <div className="border border-[#3b3328] bg-[#0c0b09] p-3">
            <p className="text-[9px] uppercase tracking-widest text-[#8f887d]">Current Class</p>
            <p className="mt-1 font-serif text-sm font-bold text-[#d9ad63]">{data.identity.class ?? "Unranked Adventurer"}</p>
          </div>
          <div className="border border-[#3b3328] bg-[#0c0b09] p-3">
            <p className="text-[9px] uppercase tracking-widest text-[#8f887d]">Dominant Style</p>
            <p className="mt-1 font-serif text-sm font-bold text-[#49a3a0]">{data.identity.dominantStyle?.label ?? data.identity.dominantStyle?.style ?? "Still forming"}</p>
          </div>
          <div className="border border-[#3b3328] bg-[#0c0b09] p-3">
            <p className="text-[9px] uppercase tracking-widest text-[#8f887d]">Specialization</p>
            <p className="mt-1 font-serif text-sm font-bold text-[#d8c4a5]">{data.identity.dominantStyle?.hybridArchetype ?? "Earned through behavior"}</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#8f887d]">
          The System does not ask you to pick a class. It watches what you actually do, then opens paths that fit your record.
        </p>
      </Section>

      <Section title="Gear Slots" icon={Shield}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {data.gearSlots.map((slot) => (
            <div key={slot.slot} className="border border-[#3b3328] bg-[#0c0b09] p-3">
              <p className="text-[9px] uppercase tracking-widest text-[#8f887d]">{slot.label}</p>
              <p className="mt-1 truncate font-serif text-sm font-bold text-[#d8c4a5]">{displayGearName(slot.item)}</p>
              {(slot.item?.affinity ?? slot.item?.elementalAffinity) && <p className="text-[10px] text-[#49a3a0]">{slot.item.affinity ?? slot.item.elementalAffinity}</p>}
            </div>
          ))}
        </div>
        <Link href="/inventory?tab=armory"><Button variant="outline" className="mt-3 w-full border-[#6b4d2f] text-[#d9ad63]">Open Armory</Button></Link>
      </Section>

      <div className="grid gap-3 md:grid-cols-2">
        <Section title="Titles" icon={Crown}>
          {data.titles.length ? data.titles.slice(0, 5).map((title) => (
            <div key={title.id} className="mb-2 flex items-center justify-between gap-2 text-xs">
              <span className="text-[#d8c4a5]">{title.name}</span>
              <Badge variant="outline" className="border-[#3b3328] text-[#8f887d]">{title.rarity}</Badge>
            </div>
          )) : <p className="text-xs text-[#8f887d]">No earned titles yet.</p>}
        </Section>

        <Section title="Appearance" icon={Palette}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="border border-[#3b3328] p-3"><p className="text-[#8f887d]">Aura</p><p className="text-[#d8c4a5]">{data.appearance.aura ?? "None"}</p></div>
            <div className="border border-[#3b3328] p-3"><p className="text-[#8f887d]">Cosmetics</p><p className="text-[#d8c4a5]">{data.appearance.cosmeticCount}</p></div>
          </div>
        </Section>
      </div>

      <Section title="Biometrics" icon={Scale}>
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <div><p className="text-[#8f887d]">Height</p><p>{cmToImperial(bio.heightCm)}</p></div>
          <div><p className="text-[#8f887d]">Weight</p><p>{kgToLb(bio.weightKg)}</p></div>
          <div><p className="text-[#8f887d]">Bench</p><p>{kgToLb(bio.bench1rm)}</p></div>
          <div><p className="text-[#8f887d]">Deadlift</p><p>{kgToLb(bio.deadlift1rm)}</p></div>
        </div>
        {bio.notes && <p className="mt-3 border-l-2 border-[#9d3e2a] pl-3 text-xs text-[#d8c4a5]">{bio.notes}</p>}
        <Link href="/profile"><Button variant="outline" className="mt-3 w-full border-[#6b4d2f] text-[#d9ad63]">Edit Biometrics</Button></Link>
      </Section>

      <Section title="Real Equipment Owned" icon={Dumbbell}>
        <div className="flex flex-wrap gap-2">
          {data.realEquipment.length ? data.realEquipment.map((item) => (
            <span key={item.id} className={`border px-2 py-1 text-[10px] ${item.available ? "border-[#3e8f5c] text-[#a8c9b0]" : "border-[#3b3328] text-[#8f887d]"}`}>{item.name}</span>
          )) : <span className="text-xs text-[#8f887d]">No equipment recorded.</span>}
        </div>
      </Section>

      <div className="grid gap-3 md:grid-cols-3">
        <Section title="Inventory" icon={Boxes}>
          <p className="text-xs text-[#8f887d]">{data.inventorySummary.items} items, {data.inventorySummary.gear} gear pieces</p>
          <Link href="/inventory?tab=store"><Button variant="outline" className="mt-3 w-full border-[#6b4d2f] text-[#d9ad63]">Open Hall Offerings</Button></Link>
        </Section>
        <Section title="Narrative Mode" icon={Eye}>
          <p className="text-xs text-[#8f887d]">Controls how much fantasy language appears in replays and coaching.</p>
          <Link href="/settings"><Button variant="outline" className="mt-3 w-full border-[#6b4d2f] text-[#d9ad63]">Open Settings</Button></Link>
        </Section>
        <Section title="Data And Privacy" icon={Settings}>
          <div className="space-y-2 text-xs">
            <Link href="/privacy" className="block text-[#d9ad63]">Privacy policy</Link>
            <Link href="/terms" className="block text-[#d9ad63]">Terms and disclaimer</Link>
            <Link href="/data" className="block text-[#d9ad63]">Export or delete data</Link>
          </div>
        </Section>
      </div>
    </AethoriaPage>
  );
}
