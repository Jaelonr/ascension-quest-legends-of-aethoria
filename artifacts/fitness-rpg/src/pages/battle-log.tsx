import { useEffect, useMemo, useRef, useState } from "react";
import { customFetch, useGetBattleLog, useGetPlayerStyleIdentity, useGetCampaignStory, type CampaignStoryQuest, type CampaignStoryChapter } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BookOpen, Boxes, Coins, ChevronDown, ChevronRight, Flag, Footprints,
  Gift, Landmark, Lock, Map, Medal, Minus, Plus, RotateCcw, ScrollText,
  Shield, Sparkles, Swords, Trophy, X, Zap,
} from "lucide-react";

const STYLE_META: Record<string, { label: string; text: string; bg: string; border: string }> = {
  strength: { label: "Iron Vanguard", text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" },
  striking: { label: "Storm Duelist", text: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" },
  conditioning: { label: "Wayfarer", text: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30" },
  grappling: { label: "Chainwarden", text: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  recovery: { label: "Verdant Guardian", text: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/30" },
  discipline: { label: "Runesage", text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
};
const STYLE_ORDER = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;
const MAP_FEATURES = [
  "Regions Discovered",
  "Roads Traveled",
  "Gates Cleared",
  "Boss Sites",
  "Campaign Routes",
  "Return Stone Journeys",
];
const MAP_PATH_POINTS = [
  [42, 45],
  [40, 48],
  [38, 51],
  [36, 54],
  [34, 56],
  [32, 58],
  [30, 60],
] as const;
const RETURN_STONE_PATH = "M 30 60 C 34 54 38 49 42 45";
const MAP_CLUES = [
  {
    source: "Hall Ledger",
    title: "Western commerce exists",
    status: "Known",
    text: "Aldric has mentioned that the western coast carries more coin than crowns. Details remain unconfirmed.",
  },
  {
    source: "Item Lore",
    title: "Tideglass Ring",
    status: "Undiscovered",
    text: "A future item description can reveal that merchants use these in N'Thaloris contracts.",
  },
  {
    source: "Quest Dialogue",
    title: "Crown of the Coast",
    status: "Locked",
    text: "A noble envoy or Guild embassy commission should reveal this name before it becomes common knowledge.",
  },
  {
    source: "Aldric",
    title: "The sea is different there",
    status: "Locked",
    text: "The people of N'Thaloris view the sea differently than surface folk. The Chronicle cannot explain more yet.",
  },
];

type ChronicleSummary = {
  worldDanger?: any;
  battleReplays: any[];
  guildReports: any[];
  campaignProgress: any[];
  discoveredItems: any[];
  bossesDefeated: any[];
  titlesEarned: any[];
  personalRecords: any[];
  map: { title: string; description: string; status: string };
  majorMilestones: any[];
  worldEvents: any[];
};

function useChronicleSummary() {
  const [data, setData] = useState<ChronicleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    customFetch<ChronicleSummary>("/api/chronicle/summary")
      .then((summary) => { if (!cancelled) setData(summary); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { data, loading };
}

function StatTile({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="border border-[#3b3328] bg-[#11100e] p-3 text-center">
      <Icon className={cn("mx-auto mb-1 size-4", color)} />
      <div className={cn("font-serif text-lg font-bold", color)}>{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-[#8f887d]">{label}</div>
    </div>
  );
}

const VERDICT_COLORS: Record<string, string> = {
  "Crushing Victory": "text-yellow-400",
  "Victory":          "text-green-400",
  "Close Victory":    "text-cyan-400",
  "Strategic Retreat":"text-orange-400",
  "Training Complete":"text-green-400",
};

function ReplayDialog({ replay, onClose }: { replay: any; onClose: () => void }) {
  const [revealedCount, setRevealedCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const meta = STYLE_META[replay.dominantStyle] ?? STYLE_META.strength;
  const events = (replay.events ?? []) as Array<{ text: string; type: string }>;
  const allRevealed = revealedCount >= events.length;
  const styleScores = (replay.styleScores ?? {}) as Record<string, number>;
  const maxScore = Math.max(1, ...Object.values(styleScores).map(Number));
  const activeStyles = STYLE_ORDER.filter(s => (styleScores[s] ?? 0) > 0)
    .sort((a, b) => (styleScores[b] ?? 0) - (styleScores[a] ?? 0));
  const verdictColor = VERDICT_COLORS[replay.verdict] ?? "text-green-400";
  const payoff = replay.payoff;
  const rarityColors: Record<string, string> = {
    common: "text-gray-300 border-gray-400/40",
    uncommon: "text-green-400 border-green-400/40",
    rare: "text-blue-400 border-blue-400/40",
    epic: "text-purple-400 border-purple-400/40",
    legendary: "text-yellow-400 border-yellow-400/50",
  };

  useEffect(() => {
    if (allRevealed) return;
    const t = setTimeout(() => setRevealedCount(c => c + 1), 600);
    return () => clearTimeout(t);
  }, [revealedCount, allRevealed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [revealedCount]);

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-12 pb-4 border-b border-[#2a2520]">
        <div className={cn("text-[10px] font-mono tracking-[0.3em] uppercase mb-1 animate-pulse", meta.text)}>
          ─── Battle Report ───
        </div>
        <h2 className="font-serif text-2xl font-black text-[#eee5d7] leading-tight">
          {replay.encounterName}
        </h2>
        <p className="text-[#8f887d] text-sm font-mono mt-0.5">vs. {replay.enemyName}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className={cn(
            "border px-2 py-0.5 text-[10px] font-mono uppercase rounded-sm",
            meta.border, meta.text, meta.bg
          )}>
            {meta.label} Style
          </span>
          {replay.hybridArchetype && (
            <span className="text-[10px] text-[#8f887d] font-mono">{replay.hybridArchetype}</span>
          )}
          <span className="text-[10px] text-[#6b5d4f] font-mono ml-auto">
            {new Date(replay.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6b5d4f] hover:text-[#d8c4a5] transition-colors"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {payoff && (
          <div className="border border-[#6b4d2f] bg-[#11100e] rounded-xl p-3">
            <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#9d8f80]">Real session translated</p>
            <h3 className="mt-1 font-serif text-base font-bold text-[#e5c386]">{payoff.headline}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#d8c4a5]">{payoff.fitnessTranslation}</p>
            {payoff.pathEffect && <p className="mt-2 border-l border-[#6b4d2f] pl-3 text-xs leading-relaxed text-[#9dbdb8]">{payoff.pathEffect}</p>}
          </div>
        )}

        {/* Narrative events — staggered reveal */}
        {events.length > 0 ? (
          <div className="space-y-2.5">
            {events.slice(0, revealedCount).map((ev, i) => (
              <div
                key={i}
                className="animate-in fade-in slide-in-from-bottom-2 duration-400 bg-[#181612] border border-[#2a2520] rounded-lg p-3 text-sm text-[#d8c4a5] leading-relaxed"
              >
                {ev.text}
              </div>
            ))}
            {!allRevealed && (
              <div className="flex gap-1 px-1 py-2">
                <span className="w-1.5 h-1.5 bg-[#4a4035] rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-[#4a4035] rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-[#4a4035] rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="text-center py-6 text-[#6b5d4f] text-sm font-mono italic">
            No battle record found for this session.
          </div>
        )}

        {/* Stats + verdict — shown after all events */}
        {allRevealed && (
          <div className="space-y-3 animate-in fade-in duration-500">
            {/* XP / Gold */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0a1a1a] border border-[#1a3535] rounded-xl p-3 text-center">
                <Zap className="size-4 text-[#49a3a0] mx-auto mb-1" />
                <div className="text-2xl font-black text-[#49a3a0] font-mono">+{replay.xpEarned}</div>
                <div className="text-[10px] text-[#8f887d] mt-0.5">XP Earned</div>
              </div>
              <div className="bg-[#1a1200] border border-[#3a2a00] rounded-xl p-3 text-center">
                <Coins className="size-4 text-[#d7a54d] mx-auto mb-1" />
                <div className="text-2xl font-black text-[#d7a54d] font-mono">+{replay.goldEarned}</div>
                <div className="text-[10px] text-[#8f887d] mt-0.5">Gold Earned</div>
              </div>
            </div>

            {/* PR badge */}
            {replay.prCount > 0 && (
              <div className="flex items-center gap-2 border border-[#d9ad63]/30 bg-[#d9ad63]/5 px-3 py-2 rounded-lg">
                <Trophy className="size-4 text-[#d9ad63] shrink-0" />
                <span className="text-sm font-bold text-[#d9ad63]">{replay.prCount} Personal Record{replay.prCount > 1 ? "s" : ""} set this session</span>
              </div>
            )}

            {/* Style breakdown */}
            {activeStyles.length > 0 && (
              <div className="bg-[#0e0d0b] border border-[#2a2520] rounded-xl p-3 space-y-2">
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#6b5d4f]">Combat Style Breakdown</p>
                {activeStyles.map(s => {
                  const t = STYLE_META[s]!;
                  const pct = Math.round(((styleScores[s] ?? 0) / maxScore) * 100);
                  return (
                    <div key={s} className="flex items-center gap-2 text-[10px]">
                      <span className={cn("w-20 shrink-0 capitalize font-mono", t.text)}>{t.label}</span>
                      <div className="h-1.5 flex-1 bg-[#1e1c18] rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700", t.bg.replace("/10", ""))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[#6b5d4f]">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Gear drop */}
            {replay.gearDrop && (() => {
              const g = replay.gearDrop as { name: string; rarity: string; slot: string };
              const cls = rarityColors[g.rarity] ?? rarityColors.common;
              return (
                <div className={cn("border rounded-xl p-3 bg-[#0e0d0b] space-y-1", cls)}>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-[#6b5d4f]">⚙ Gear Drop</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm font-bold font-serif", cls.split(" ")[0])}>{g.name}</span>
                    <span className={cn("text-[10px] font-mono uppercase border px-2 py-0.5 rounded", cls)}>{g.rarity}</span>
                  </div>
                  <p className="text-[10px] text-[#8f887d] capitalize">{g.slot.replace(/_/g, " ")}</p>
                </div>
              );
            })()}

            {payoff && (
              <div className="border border-[#6b4d2f] bg-[#15110d] rounded-xl p-3">
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#9d8f80] mb-1.5">Chronicle meaning</p>
                {payoff.pathEffect && <p className="mb-2 text-xs text-[#e5c386] leading-relaxed">{payoff.pathEffect}</p>}
                <p className="text-xs text-[#d8c4a5] leading-relaxed">{payoff.worldEffect}</p>
                <p className="mt-2 text-[11px] text-[#9dbdb8] leading-relaxed">{payoff.nextHook}</p>
              </div>
            )}

            {/* Narrative consequence */}
            {replay.narrativeConsequence && (
              <div className="border border-[#1a3535] bg-[#0a1a1a] rounded-xl p-3">
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#49a3a0]/60 mb-1.5">↠ Consequence</p>
                <p className="text-xs text-[#d8c4a5]/70 leading-relaxed italic">{replay.narrativeConsequence}</p>
              </div>
            )}

            {/* Verdict */}
            <div className={cn(
              "text-center py-3 border border-[#2a2520] bg-[#0e0d0b] rounded-xl font-mono text-base font-bold tracking-wide",
              verdictColor
            )}>
              {replay.verdict ?? "Training Complete"}
            </div>
          </div>
        )}
      </div>

      {/* Close button */}
      {allRevealed && (
        <div className="shrink-0 px-5 pb-8 pt-3 border-t border-[#2a2520]">
          <Button onClick={onClose} variant="outline" className="w-full border-[#3b3328] text-[#8f887d]">
            Return to Chronicle
          </Button>
        </div>
      )}
    </div>
  );
}

function ReplayCard({ replay }: { replay: any }) {
  const [open, setOpen] = useState(false);
  const meta = STYLE_META[replay.dominantStyle] ?? STYLE_META.strength;
  const verdictColor = VERDICT_COLORS[replay.verdict] ?? "text-green-400";
  const payoff = replay.payoff;

  return (
    <>
      <Card
        className={cn("border bg-[#11100e] cursor-pointer active:scale-[0.98] transition-transform", meta.border, meta.bg)}
        onClick={() => setOpen(true)}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className={cn("text-[10px] font-bold uppercase", meta.text)}>{meta.label}</span>
                <Badge variant="outline" className={cn("border-transparent text-[10px]", verdictColor)}>
                  {replay.verdict}
                </Badge>
              </div>
              <h3 className="truncate font-serif text-sm font-bold text-[#eee5d7]">{replay.encounterName}</h3>
              <p className="text-[11px] text-[#8f887d]">vs. {replay.enemyName}</p>
              {payoff?.fitnessTranslation && (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#b7ab9c]">{payoff.fitnessTranslation}</p>
              )}
              {payoff?.pathEffect && (
                <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-[#9dbdb8]">{payoff.pathEffect}</p>
              )}
            </div>
            <div className="shrink-0 text-right text-[10px] text-[#8f887d]">
              {new Date(replay.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-4 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-[#49a3a0]"><Zap className="size-3" />+{replay.xpEarned}</span>
              <span className="flex items-center gap-1 text-[#d7a54d]"><Coins className="size-3" />+{replay.goldEarned}</span>
              {replay.prCount > 0 && <span className="flex items-center gap-1 text-[#e2ad4d]"><Trophy className="size-3" />{replay.prCount} PR</span>}
            </div>
            <span className="text-[9px] font-mono text-[#4a4035] uppercase tracking-wide">Tap to replay</span>
          </div>
        </CardContent>
      </Card>

      {open && <ReplayDialog replay={replay} onClose={() => setOpen(false)} />}
    </>
  );
}

const DIFF_COLOR: Record<string, string> = {
  E: "text-gray-400 border-gray-600/40", D: "text-green-400 border-green-600/40",
  C: "text-blue-400 border-blue-600/40",  B: "text-purple-400 border-purple-600/40",
  A: "text-orange-400 border-orange-600/40", S: "text-[#d9ad63] border-[#d9ad63]/40",
};
const STORY_STATUS: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  claimed:   { label: "Completed",    color: "text-green-400",   Icon: Zap },
  completed: { label: "Claim Reward", color: "text-[#d9ad63]",  Icon: Gift },
  active:    { label: "In Progress",  color: "text-[#49a3a0]",  Icon: Swords },
  locked:    { label: "???",          color: "text-[#6b5d4f]",  Icon: Lock },
};

function CampaignQuestRow({ quest }: { quest: CampaignStoryQuest }) {
  const [open, setOpen] = useState(quest.status === "active" || quest.status === "completed");
  const s = STORY_STATUS[quest.status] ?? STORY_STATUS.locked;
  const isLocked = quest.status === "locked";
  return (
    <div className={cn("border-b border-[#3b3328] last:border-b-0", isLocked && "opacity-50")}>
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <s.Icon className={cn("size-3.5 shrink-0", s.color)} />
        <div className="min-w-0 flex-1">
          <p className={cn("font-serif text-sm font-bold", isLocked ? "text-[#6b5d4f]" : "text-[#d8c4a5]")}>{quest.title}</p>
          <p className={cn("text-[10px]", s.color)}>{s.label}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {quest.difficulty && <span className={cn("border px-1 text-[10px] font-mono", DIFF_COLOR[quest.difficulty] ?? "")}>{quest.difficulty}</span>}
          {open ? <ChevronDown className="size-3 text-[#8f887d]" /> : <ChevronRight className="size-3 text-[#8f887d]" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-[#3b3328] bg-[#0c0b09] px-4 pb-4 pt-3 space-y-2">
          <p className={cn("text-xs leading-relaxed", isLocked ? "italic text-[#6b5d4f]" : "text-[#b7ab9c]")}>{quest.description}</p>
          {quest.lore && (
            <div className="border-l-2 border-[#9d3e2a]/60 bg-[#1b1511] px-3 py-2">
              <p className="text-[9px] uppercase tracking-widest text-[#9d8f80] mb-1">Guild Lore</p>
              <p className="text-xs italic leading-relaxed text-[#cfc5b8]">{quest.lore}</p>
            </div>
          )}
          {quest.fitnessMapping && !isLocked && (
            <p className="text-[10px] text-[#8f887d]"><span className="font-mono text-[#9d8f80]">Objective:</span> {quest.fitnessMapping}</p>
          )}
          <div className="flex gap-4 text-[10px] font-mono">
            <span className="text-[#49a3a0]">+{quest.xpReward} XP</span>
            <span className="text-[#d7a54d]">+{quest.goldReward} Gold</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignChapterBlock({ chapter, defaultOpen }: { chapter: CampaignStoryChapter; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const isLocked = chapter.status === "locked";
  const done = chapter.quests.filter(q => q.status === "claimed").length;
  const revealed = chapter.quests.filter(q => q.status !== "locked").length;
  return (
    <Card className={cn("rounded-none", isLocked ? "border-[#2a2520]" : "border-[#6b4d2f]", "bg-[#11100e]")}>
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-3 p-4 text-left">
        <div className={cn("flex size-7 items-center justify-center border font-mono text-xs font-bold shrink-0",
          chapter.status === "completed" ? "border-green-600/40 text-green-400" :
          chapter.status === "active"    ? "border-[#d9ad63]/40 text-[#d9ad63]" :
                                          "border-[#3b3328] text-[#6b5d4f]",
        )}>
          {chapter.status === "completed" ? "✓" : isLocked ? "?" : chapter.chapter}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("font-serif text-sm font-bold", isLocked ? "text-[#6b5d4f]" : "text-[#d9ad63]")}>
            {isLocked ? `Chapter ${chapter.chapter} — ???` : `Ch. ${chapter.chapter}: ${chapter.chapterName}`}
          </p>
          {!isLocked && <p className="text-[10px] text-[#8f887d]">{done}/{revealed} complete</p>}
        </div>
        {open ? <ChevronDown className="size-4 text-[#8f887d] shrink-0" /> : <ChevronRight className="size-4 text-[#8f887d] shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-[#3b3328]">
          {chapter.quests.map(q => <CampaignQuestRow key={q.campaignId} quest={q} />)}
        </div>
      )}
    </Card>
  );
}

function CampaignChronicleView() {
  const { data: story, isLoading } = useGetCampaignStory({ query: { queryKey: ["/api/campaign/story"] } });
  if (isLoading) return <><Skeleton className="h-14 w-full rounded-none bg-[#171510]" /><Skeleton className="mt-2 h-14 w-full rounded-none bg-[#171510]" /></>;
  if (!story) return <EmptyRecord icon={Flag} title="No campaign entries yet" text="Aethoria's larger movements will be recorded here as threats are revealed." />;
  return (
    <div className="space-y-2">
      <div className="border border-[#6b4d2f]/50 bg-[#11100e] px-4 py-3">
        <p className="text-[9px] uppercase tracking-widest text-[#8f887d] mb-0.5 font-mono">Current Position</p>
        <p className="font-serif text-sm font-bold text-[#d9ad63]">
          Chapter {story.currentChapter}
          {story.currentQuestTitle && <span className="font-normal text-[#b7ab9c]"> — {story.currentQuestTitle}</span>}
        </p>
      </div>
      {story.chapters.map(ch => (
        <CampaignChapterBlock key={ch.chapter} chapter={ch} defaultOpen={ch.status === "active"} />
      ))}
    </div>
  );
}

function EmptyRecord({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="border border-dashed border-[#3b3328] bg-[#11100e]/60 px-4 py-10 text-center">
      <Icon className="mx-auto mb-3 size-8 text-[#6b4d2f]" />
      <p className="font-serif text-sm font-bold text-[#d8c4a5]">{title}</p>
      <p className="mt-1 text-xs text-[#8f887d]">{text}</p>
    </div>
  );
}

function SystemDangerCard({ danger }: { danger: any }) {
  if (!danger) return null;
  const value = Math.max(0, Math.min(100, Number(danger.value ?? 77)));
  const critical = danger.state === "critical" || value >= 90;
  return (
    <Card className={cn("rounded-none bg-[#11100e]", critical ? "border-[#9d3e2a]" : "border-[#6b4d2f]")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#9d8f80]">System reading</p>
            <p className={cn("mt-1 font-serif text-lg font-bold", critical ? "text-[#d95f45]" : "text-[#d9ad63]")}>World Danger: {danger.label ?? "Severe"}</p>
          </div>
          <span className={cn("border px-2 py-1 text-xs font-bold", critical ? "border-[#9d3e2a] text-[#d95f45]" : "border-[#72552e] text-[#d5a557]")}>{value}%</span>
        </div>
        <div className="mt-3 h-3 border border-[#3b3328] bg-[#070706]">
          <div className={cn("h-full", critical ? "bg-[#9d3e2a]" : value >= 65 ? "bg-[#b45f2d]" : value >= 40 ? "bg-[#b48432]" : "bg-[#4f8f67]")} style={{ width: `${value}%` }} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#b7ab9c]">{danger.systemNote}</p>
        <p className="mt-2 text-[11px] text-[#8f887d]">{danger.nextRelief}</p>
      </CardContent>
    </Card>
  );
}

function formatChronicleDate(value?: string | null) {
  if (!value) return "Date unrecorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unrecorded";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getWorldEventTone(event: any) {
  const title = String(event?.title ?? "").toLowerCase();
  const severity = String(event?.severity ?? "").toLowerCase();
  const status = String(event?.status ?? "").toLowerCase();
  const isRaidPressure = title.includes("raid pressure") || event?.metadata?.raidId;
  const isResolved = status === "resolved" || status === "completed";
  const isSevere = severity === "major" || severity === "critical" || title.includes("retreat") || title.includes("loss");

  if (isResolved) return { label: "Resolved", border: "border-[#4f8f67]", text: "text-[#61c29b]", bg: "bg-[#0e1713]" };
  if (isRaidPressure) return { label: "Raid Pressure", border: "border-[#9d3e2a]", text: "text-[#d95f45]", bg: "bg-[#1a100e]" };
  if (isSevere) return { label: "Severe", border: "border-[#b45f2d]", text: "text-[#f0a15e]", bg: "bg-[#1a130d]" };
  return { label: status ? status.replace(/_/g, " ") : "Recorded", border: "border-[#6b4d2f]", text: "text-[#d9ad63]", bg: "bg-[#11100e]" };
}

function WorldEventRow({ event }: { event: any }) {
  const tone = getWorldEventTone(event);
  const metadata = event?.metadata ?? {};
  const completedTasks = Number(metadata.completedTasks ?? metadata.completed ?? 0);
  const totalTasks = Number(metadata.totalTasks ?? metadata.total ?? 0);
  const hasProgress = Number.isFinite(completedTasks) && Number.isFinite(totalTasks) && totalTasks > 0;
  const styleBonus = metadata.styleMultiplier ? Number(metadata.styleMultiplier).toFixed(2) : null;
  const dominantStyleLabel = metadata.dominantStyle ? STYLE_META[metadata.dominantStyle]?.label ?? metadata.dominantStyle : null;
  const previousStyleLabel = metadata.previousDominantStyle ? STYLE_META[metadata.previousDominantStyle]?.label ?? metadata.previousDominantStyle : null;

  return (
    <div className={cn("border px-3 py-3", tone.border, tone.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-[9px] uppercase tracking-[0.18em]", tone.text)}>{tone.label}</p>
          <p className="mt-1 font-serif text-sm font-bold text-[#e5c386]">{event?.title ?? "Unrecorded world event"}</p>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-[#8f887d]">{formatChronicleDate(event?.createdAt ?? event?.occurredAt)}</span>
      </div>
      {event?.description && <p className="mt-2 text-xs leading-relaxed text-[#cfc5b8]">{event.description}</p>}
      {(hasProgress || metadata.difficulty || metadata.dominantStyle || styleBonus) && (
        <div className="mt-3 grid gap-2 border-t border-[#3b3328] pt-3 text-[10px] uppercase tracking-wider text-[#8f887d] md:grid-cols-4">
          {hasProgress && <span>Raid tasks <b className="font-mono text-[#d8c4a5]">{completedTasks}/{totalTasks}</b></span>}
          {metadata.difficulty && <span>Difficulty <b className="text-[#d8c4a5]">{metadata.difficulty}</b></span>}
          {dominantStyleLabel && <span>Style <b className="text-[#d8c4a5]">{previousStyleLabel ? `${previousStyleLabel} -> ${dominantStyleLabel}` : dominantStyleLabel}</b></span>}
          {styleBonus && <span>Pressure shift <b className="font-mono text-[#d8c4a5]">x{styleBonus}</b></span>}
        </div>
      )}
    </div>
  );
}

function isIdentityMilestoneEvent(event: any) {
  const key = String(event?.worldKey ?? "").toLowerCase();
  const title = String(event?.title ?? "").toLowerCase();
  return key.includes("style-identity")
    || key.includes("style-archetype")
    || title.includes("combat identity")
    || title.includes("archetype formed");
}

function IdentityMilestoneCard({ event }: { event: any }) {
  const metadata = event?.metadata ?? {};
  const dominantStyle = metadata.dominantStyle as string | undefined;
  const previousDominantStyle = metadata.previousDominantStyle as string | undefined;
  const styleMeta = dominantStyle ? STYLE_META[dominantStyle] : null;
  const previousLabel = previousDominantStyle ? STYLE_META[previousDominantStyle]?.label ?? previousDominantStyle : null;
  const currentLabel = dominantStyle ? STYLE_META[dominantStyle]?.label ?? dominantStyle : null;
  const archetype = metadata.hybridArchetype ?? event?.title?.replace(/^Archetype Formed:\s*/i, "");

  return (
    <div className={cn("border bg-[#0c0b09] p-4", styleMeta?.border ?? "border-[#6b4d2f]")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.22em] text-[#9d8f80]">Legend mark</p>
          <p className={cn("mt-1 font-serif text-lg font-bold", styleMeta?.text ?? "text-[#d9ad63]")}>
            {event?.title ?? "Combat identity recorded"}
          </p>
        </div>
        <span className="shrink-0 border border-[#3b3328] px-2 py-1 text-[10px] uppercase tracking-wider text-[#8f887d]">
          {formatChronicleDate(event?.createdAt ?? event?.occurredAt)}
        </span>
      </div>
      {event?.description && <p className="mt-2 text-xs leading-relaxed text-[#cfc5b8]">{event.description}</p>}
      <div className="mt-3 grid gap-2 border-t border-[#3b3328] pt-3 text-[10px] uppercase tracking-wider text-[#8f887d] md:grid-cols-3">
        {currentLabel && <span>Style <b className="text-[#d8c4a5]">{previousLabel ? `${previousLabel} -> ${currentLabel}` : currentLabel}</b></span>}
        {archetype && <span>Archetype <b className="text-[#d8c4a5]">{String(archetype)}</b></span>}
        {metadata.totalSessions != null && <span>Field records <b className="font-mono text-[#d8c4a5]">{String(metadata.totalSessions)}</b></span>}
      </div>
    </div>
  );
}

function getMilestoneTone(milestone: any) {
  const kind = String(milestone?.kind ?? "").toLowerCase();
  if (kind.includes("raid_failed") || kind.includes("forced") || kind.includes("critical")) {
    return { label: "Scar", border: "border-[#9d3e2a]", text: "text-[#d95f45]", bg: "bg-[#1a100e]" };
  }
  if (kind.includes("raid_claimed") || kind.includes("raid_completed") || kind.includes("boss")) {
    return { label: "Victory", border: "border-[#d9ad63]", text: "text-[#d9ad63]", bg: "bg-[#17130d]" };
  }
  if (kind.includes("combat") || kind.includes("style")) {
    return { label: "Battle Proof", border: "border-[#49a3a0]", text: "text-[#49a3a0]", bg: "bg-[#071312]" };
  }
  if (kind.includes("item") || kind.includes("title")) {
    return { label: "Discovery", border: "border-[#6b4d2f]", text: "text-[#e5c386]", bg: "bg-[#11100e]" };
  }
  return { label: milestone?.source ?? "Recorded", border: "border-[#3b3328]", text: "text-[#d8c4a5]", bg: "bg-[#11100e]" };
}

function ChronicleMilestoneCard({ milestone }: { milestone: any }) {
  const tone = getMilestoneTone(milestone);
  return (
    <div className={cn("border p-3", tone.border, tone.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-[9px] uppercase tracking-[0.18em]", tone.text)}>{tone.label}</p>
          <p className="mt-1 font-serif text-sm font-bold text-[#e5c386]">{milestone?.title ?? "Milestone recorded"}</p>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-[#8f887d]">{formatChronicleDate(milestone?.occurredAt)}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#d8c4a5]">{milestone?.summary}</p>
      {(milestone?.detail || milestone?.source) && (
        <div className="mt-3 grid gap-2 border-t border-[#3b3328] pt-3 text-[10px] uppercase tracking-wider text-[#8f887d] md:grid-cols-2">
          {milestone?.source && <span>Source <b className="text-[#d8c4a5]">{milestone.source}</b></span>}
          {milestone?.detail && <span className="normal-case tracking-normal text-[#9f9586]">{milestone.detail}</span>}
        </div>
      )}
    </div>
  );
}

export default function BattleLog() {
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [mapZoom, setMapZoom] = useState(1);
  const { data: battles, isLoading: loadingBattles } = useGetBattleLog({}, { query: { queryKey: ["/api/battle-log"] } });
  const { data: identity, isLoading: loadingIdentity } = useGetPlayerStyleIdentity({ query: { queryKey: ["/api/player/style-identity"] } });
  const { data: chronicle, loading: loadingChronicle } = useChronicleSummary();

  const allBattles = (chronicle?.battleReplays?.length ? chronicle.battleReplays : battles ?? []) as any[];
  const filteredBattles = styleFilter === "all" ? allBattles : allBattles.filter((battle) => battle.dominantStyle === styleFilter);
  const totals = useMemo(() => ({
    xp: allBattles.reduce((sum, battle) => sum + (battle.xpEarned ?? 0), 0),
    gold: allBattles.reduce((sum, battle) => sum + (battle.goldEarned ?? 0), 0),
    prs: allBattles.reduce((sum, battle) => sum + (battle.prCount ?? 0), 0),
  }), [allBattles]);
  const footSteps = Math.max(1800, Math.round((identity?.totalSessions ?? 0) * 900 + allBattles.length * 650 + totals.prs * 250));
  const footMiles = Math.max(0.8, footSteps / 2200);
  const caravanMiles = Math.max(8, Math.round(((identity?.totalSessions ?? 0) * 1.8 + allBattles.length * 3.2) * 10) / 10);
  const mountMiles = Math.max(2, Math.round((totals.prs * 1.5 + Math.max(0, allBattles.length - 1) * 0.8) * 10) / 10);
  const assistedMiles = caravanMiles + mountMiles;
  const footRouteProgress = Math.max(9, Math.min(34, Math.round((footSteps / 70000) * 100)));
  const pathLength = `M ${MAP_PATH_POINTS[0][0]} ${MAP_PATH_POINTS[0][1]} ` +
    MAP_PATH_POINTS.slice(1).map((p) => `L ${p[0]} ${p[1]}`).join(" ");

  if (loadingBattles || loadingIdentity || loadingChronicle) {
    return <div className="min-h-screen space-y-4 bg-[#0c0b09] p-4 text-[#eee5d7] md:p-6"><Skeleton className="h-20 w-full rounded-none bg-[#171510]" /><Skeleton className="h-36 w-full rounded-none bg-[#171510]" /><Skeleton className="h-28 w-full rounded-none bg-[#171510]" /></div>;
  }

  const topStyle = identity?.dominantStyle as string | null | undefined;
  const topMeta = topStyle ? STYLE_META[topStyle] : null;
  const mapTitle = chronicle?.map?.title && chronicle.map.title !== "Journey Map" ? chronicle.map.title : "Map of Aethoria";
  const mapDescription = chronicle?.map?.description && chronicle.map.description !== "The Guild cartographers are preparing the map."
    ? chronicle.map.description
    : "The Hall's records have begun charting your passage through Aethoria. Regions, Gates, roads, and battle sites will appear here as your Chronicle grows. For now, only the routes most often spoken of in the Guild's ledgers are clear.";
  const mapStatus = !chronicle?.map?.status || chronicle.map.status === "placeholder" ? "Known Routes" : chronicle.map.status;
  const identityMilestones = (chronicle?.worldEvents ?? []).filter(isIdentityMilestoneEvent);

  return (
    <div
      className="min-h-screen space-y-5 bg-[#0c0b09] bg-cover bg-top p-4 pb-24 text-[#eee5d7] md:p-6"
      style={{ backgroundImage: "url('/assets/guild-hall-background.png')" }}
    >
      <header className="border-b border-[#6d4a25] pb-3">
        <div className="flex items-center gap-3">
          <BookOpen className="size-6 text-[#d09b43]" />
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-wide text-[#e5c386]">Chronicle</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#9f9586]">The record of your real and fantasy journey.</p>
          </div>
        </div>
      </header>

      <section className="border border-[#6b4d2f] bg-[#11100e] p-4">
        <div className="flex items-start gap-3">
          <Landmark className="mt-0.5 size-5 shrink-0 text-[#d9ad63]" />
          <div>
            <p className="font-serif text-lg font-bold text-[#d9ad63]">Aethoria's Ledger</p>
            <p className="mt-1 text-sm leading-relaxed text-[#cfc5b8]">
              Every replay, report, record, and discovered relic becomes part of the proof that the System cannot erase your growth.
            </p>
          </div>
        </div>
      </section>

      <SystemDangerCard danger={chronicle?.worldDanger} />

      <div className="grid grid-cols-3 gap-2">
        <StatTile icon={Swords} label="Replays" value={allBattles.length} color="text-[#49a3a0]" />
        <StatTile icon={Trophy} label="PRs" value={totals.prs} color="text-[#e2ad4d]" />
        <StatTile icon={Boxes} label="Items" value={chronicle?.discoveredItems?.length ?? 0} color="text-[#d7a54d]" />
      </div>

      {identity && identity.totalSessions > 0 && (
        <Card className="border-[#3b3328] bg-[#11100e]">
          <CardContent className="p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-[#8f887d]">Combat Style - {identity.totalSessions} sessions</p>
                {topMeta && <p className={cn("font-serif text-lg font-bold", topMeta.text)}>{topMeta.label} Archetype</p>}
                {identity.hybridArchetype && <p className="text-xs text-[#8f887d]">{identity.hybridArchetype}</p>}
              </div>
              <Shield className={cn("size-8", topMeta?.text ?? "text-[#d7a54d]")} />
            </div>
            <div className="space-y-2">
              {STYLE_ORDER.map((style) => {
                const pct = identity.percentages?.[style] ?? 0;
                const meta = STYLE_META[style];
                return (
                  <div key={style} className="flex items-center gap-2 text-[10px]">
                    <span className={cn("w-20", meta.text)}>{meta.label}</span>
                    <div className="h-1.5 flex-1 bg-[#25231f]"><div className={cn("h-full", meta.bg.replace("/10", ""))} style={{ width: `${pct}%` }} /></div>
                    <span className="w-8 text-right text-[#8f887d]">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="replays">
        <TabsList className="grid h-auto w-full grid-cols-3 border border-[#3b3328] bg-[#11100e] p-1 md:grid-cols-6">
          <TabsTrigger value="replays">Replays</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="campaign">Campaign</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
        </TabsList>

        <TabsContent value="replays" className="space-y-3 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {["all", ...STYLE_ORDER].map((filter) => (
              <button key={filter} onClick={() => setStyleFilter(filter)} className={cn("border px-2.5 py-1 text-[10px] capitalize", styleFilter === filter ? "border-[#d7a54d] text-[#d7a54d]" : "border-[#3b3328] text-[#8f887d]")}>
                {filter}
              </button>
            ))}
          </div>
          {filteredBattles.length ? filteredBattles.map((replay) => <ReplayCard key={replay.id} replay={replay} />) : <EmptyRecord icon={BookOpen} title="No battles recorded" text="Complete a workout to write your first combat replay." />}
        </TabsContent>

        <TabsContent value="reports" className="space-y-3 pt-3">
          {chronicle?.guildReports?.length ? chronicle.guildReports.map((report) => (
            <Card key={report.id} className="border-[#3b3328] bg-[#11100e]"><CardContent className="p-4"><p className="mb-1 text-[10px] uppercase text-[#8f887d]">Guild Report {report.month}/{report.year}</p><p className="text-sm leading-relaxed text-[#d8c4a5]">{report.reportText}</p></CardContent></Card>
          )) : <EmptyRecord icon={ScrollText} title="No Guild reports yet" text="Monthly reports will collect your legend as the record grows." />}
        </TabsContent>

        <TabsContent value="campaign" className="space-y-3 pt-3">
          <CampaignChronicleView />
        </TabsContent>

        <TabsContent value="items" className="space-y-3 pt-3">
          {chronicle?.discoveredItems?.length ? chronicle.discoveredItems.map((item) => (
            <Card key={item.id} className="border-[#3b3328] bg-[#11100e]"><CardContent className="p-4"><div className="flex justify-between gap-3"><div><p className="font-serif text-sm font-bold text-[#d9ad63]">{item.itemName}</p><p className="text-[10px] uppercase text-[#8f887d]">{item.rarity} - {item.category}</p></div><Badge variant="outline" className="border-[#6b4d2f] text-[#d8c4a5]">{item.currentState}</Badge></div><p className="mt-2 text-xs italic text-[#8f887d]">{item.loreText}</p></CardContent></Card>
          )) : <EmptyRecord icon={Boxes} title="No discoveries yet" text="Items discovered through the Hall will remain here permanently." />}
        </TabsContent>

        <TabsContent value="records" className="space-y-3 pt-3">
          <Card className="rounded-none border-[#6b4d2f] bg-[#11100e]">
            <CardContent className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-serif text-sm font-bold text-[#d9ad63]"><Sparkles className="size-4" />Legend Marks</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#8f887d]">
                    When your training changes how Aethoria reads you, the Chronicle records it here before it becomes just another line in the ledger.
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 rounded-none border-[#6b4d2f] text-[#d8c4a5]">{identityMilestones.length} marks</Badge>
              </div>
              {identityMilestones.length ? (
                <div className="space-y-2">
                  {identityMilestones.map((event) => <IdentityMilestoneCard key={event.id ?? `${event.title}-${event.createdAt}`} event={event} />)}
                </div>
              ) : (
                <div className="border border-dashed border-[#3b3328] bg-[#0c0b09] px-4 py-6 text-center">
                  <p className="font-serif text-sm font-bold text-[#d8c4a5]">No legend marks yet.</p>
                  <p className="mt-1 text-xs text-[#8f887d]">Complete enough sessions for the Chronicle to name your combat identity.</p>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-[#3b3328] bg-[#11100e]"><CardContent className="p-4"><p className="mb-3 flex items-center gap-2 font-serif text-sm font-bold text-[#d9ad63]"><Medal className="size-4" />Titles Earned</p>{chronicle?.titlesEarned?.length ? chronicle.titlesEarned.map((title) => <p key={title.id} className="mb-2 text-xs text-[#d8c4a5]">{title.name} <span className="text-[#8f887d]">({title.rarity})</span></p>) : <p className="text-xs text-[#8f887d]">No titles yet.</p>}</CardContent></Card>
            <Card className="border-[#3b3328] bg-[#11100e]">
              <CardContent className="p-4">
                <p className="mb-1 flex items-center gap-2 font-serif text-sm font-bold text-[#d9ad63]"><Sparkles className="size-4" />Major Milestones</p>
                <p className="mb-3 text-xs leading-relaxed text-[#8f887d]">The short list of moments that made Aethoria remember you.</p>
                {chronicle?.majorMilestones?.length ? (
                  <div className="space-y-2">
                    {chronicle.majorMilestones.map((m) => <ChronicleMilestoneCard key={m.id} milestone={m} />)}
                  </div>
                ) : <p className="text-xs text-[#8f887d]">No milestones yet.</p>}
              </CardContent>
            </Card>
          </div>
          <Card className="rounded-none border-[#3b3328] bg-[#11100e]">
            <CardContent className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-serif text-sm font-bold text-[#d9ad63]"><Flag className="size-4" />Aethoria World State</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#8f887d]">
                    The Chronicle records how raids, recoveries, retreats, and victories move the wider war. Other adventurers still hold the line, but your training gives the Guild its sharpest lever.
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 rounded-none border-[#6b4d2f] text-[#d8c4a5]">{chronicle?.worldEvents?.length ?? 0} entries</Badge>
              </div>
              {chronicle?.worldEvents?.length ? (
                <div className="space-y-2">
                  {chronicle.worldEvents.map((event) => <WorldEventRow key={event.id ?? `${event.title}-${event.createdAt}`} event={event} />)}
                </div>
              ) : (
                <div className="border border-dashed border-[#3b3328] bg-[#0c0b09] px-4 py-6 text-center">
                  <p className="font-serif text-sm font-bold text-[#d8c4a5]">No world shifts recorded yet.</p>
                  <p className="mt-1 text-xs text-[#8f887d]">Major victories, raid pressure, regional losses, and comeback moments will appear here as the campaign wakes.</p>
                </div>
              )}
            </CardContent>
          </Card>
          {chronicle?.personalRecords?.length ? chronicle.personalRecords.map((record) => <Card key={record.id} className="border-[#3b3328] bg-[#11100e]"><CardContent className="flex justify-between p-3 text-xs"><span className="text-[#d8c4a5]">{record.exerciseName}</span><span className="text-[#d7a54d]">{record.weight} {record.weightUnit} x {record.reps}</span></CardContent></Card>) : null}
        </TabsContent>

        <TabsContent value="map" className="space-y-3 pt-3">
          <Card className="overflow-hidden rounded-none border-[#6b4d2f] bg-[#11100e]">
            <CardContent className="p-0">
              <div className="relative min-h-[260px] border-b border-[#3b3328] bg-[#0c0b09] p-5">
                <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_20%_30%,rgba(217,173,99,0.16),transparent_24%),radial-gradient(circle_at_78%_24%,rgba(73,163,160,0.13),transparent_22%),linear-gradient(135deg,rgba(107,77,47,0.22)_0_1px,transparent_1px_28px)]" />
                <div className="relative flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center border border-[#8c6a36] bg-[#15130f]">
                    <Map className="size-5 text-[#49a3a0]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#9d8f80]">System cartography</p>
                    <h3 className="mt-1 font-serif text-xl font-bold text-[#e5c386]">{mapTitle}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#cfc5b8]">
                      {mapDescription}
                    </p>
                    <p className="mt-3 max-w-2xl border-l-2 border-[#6b4d2f] pl-3 text-xs leading-relaxed text-[#9f9586]">
                      Your training fuels expeditions, but Aethoria is vast. Some journeys are walked, some are taken by caravan, and all return through the Guild's stones.
                    </p>
                  </div>
                </div>

                <div className="relative mt-8 grid gap-3 md:grid-cols-3">
                  <div className="border border-[#3b3328] bg-[#11100e]/90 p-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#8f887d]">Map Status</p>
                    <p className="mt-1 font-serif text-sm font-bold text-[#d9ad63]">{mapStatus}</p>
                  </div>
                  <div className="border border-[#3b3328] bg-[#11100e]/90 p-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#8f887d]">Campaign Entries</p>
                    <p className="mt-1 font-mono text-sm font-bold text-[#49a3a0]">{chronicle?.campaignProgress?.length ?? 0}</p>
                  </div>
                  <div className="border border-[#3b3328] bg-[#11100e]/90 p-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#8f887d]">World Events</p>
                    <p className="mt-1 font-mono text-sm font-bold text-[#d7a54d]">{chronicle?.worldEvents?.length ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="border-b border-[#3b3328] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#9d8f80]">Known Routes</p>
                    <p className="mt-1 text-xs text-[#8f887d]">The parchment shows the continent, but the Chronicle only trusts what your journey has earned.</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setMapZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100))} className="flex size-8 items-center justify-center border border-[#3b3328] bg-[#0c0b09] text-[#d9ad63]" aria-label="Zoom out">
                      <Minus className="size-4" />
                    </button>
                    <span className="min-w-14 border border-[#3b3328] bg-[#0c0b09] px-2 py-1 text-center text-xs font-mono text-[#d8c4a5]">{Math.round(mapZoom * 100)}%</span>
                    <button onClick={() => setMapZoom((z) => Math.min(2.5, Math.round((z + 0.25) * 100) / 100))} className="flex size-8 items-center justify-center border border-[#3b3328] bg-[#0c0b09] text-[#d9ad63]" aria-label="Zoom in">
                      <Plus className="size-4" />
                    </button>
                    <button onClick={() => setMapZoom(1)} className="flex size-8 items-center justify-center border border-[#3b3328] bg-[#0c0b09] text-[#8f887d]" aria-label="Reset zoom">
                      <RotateCcw className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="overflow-auto border border-[#3b3328] bg-[#070706]">
                  <div className="group/maproute relative min-w-[720px]" style={{ width: `${mapZoom * 100}%` }}>
                    <img src="/assets/aethoria-map.jpg" alt="Map of Aethoria" className="block w-full select-none" draggable={false} />
                    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <defs>
                        <filter id="pathGlow">
                          <feGaussianBlur stdDeviation="0.7" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <rect x="0" y="0" width="100" height="100" fill="rgba(4, 7, 8, 0.15)" />
                      <path d={pathLength} fill="none" stroke="rgba(7, 7, 6, 0.82)" strokeDasharray="0.2 2.6" strokeWidth="0.72" strokeLinecap="round" strokeLinejoin="round" />
                      <path d={pathLength} fill="none" stroke="rgba(7, 7, 6, 0.82)" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 transition-opacity duration-200 group-hover/maproute:opacity-100" />
                      <path
                        d={pathLength}
                        fill="none"
                        stroke="#49a3a0"
                        strokeDasharray="0.3 2.5"
                        strokeWidth="0.42"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.82"
                      />
                      <path
                        d={pathLength}
                        fill="none"
                        stroke="#49a3a0"
                        strokeDasharray="2.4 2.2"
                        strokeWidth="0.86"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0"
                        className="transition-opacity duration-200 group-hover/maproute:opacity-90"
                      />
                      <path
                        d={pathLength}
                        fill="none"
                        stroke="#d9ad63"
                        strokeDasharray={`${footRouteProgress} ${100 - footRouteProgress}`}
                        strokeWidth="0.48"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#pathGlow)"
                      />
                      <path d={RETURN_STONE_PATH} fill="none" stroke="#a78bfa" strokeDasharray="0.3 2.4" strokeWidth="0.42" strokeLinecap="round" opacity="0.88" />
                      <path d={RETURN_STONE_PATH} fill="none" stroke="#a78bfa" strokeDasharray="1.1 1.3" strokeWidth="0.82" strokeLinecap="round" opacity="0" className="transition-opacity duration-200 group-hover/maproute:opacity-90" />
                      {MAP_PATH_POINTS.slice(0, Math.max(2, Math.ceil((footRouteProgress / 100) * MAP_PATH_POINTS.length))).map(([x, y], index) => (
                        <g key={`${x}-${y}`}>
                          <circle cx={x} cy={y} r={index === 0 ? 0.8 : 0.58} fill={index === 0 ? "#49a3a0" : "#d9ad63"} stroke="#0c0b09" strokeWidth="0.28" />
                        </g>
                      ))}
                      <circle cx="30" cy="60" r="0.86" fill="#a78bfa" stroke="#0c0b09" strokeWidth="0.28" />
                    </svg>
                    <div className="absolute left-[42%] top-[45%] -translate-x-1/2 -translate-y-full border border-[#49a3a0]/70 bg-[#061010]/90 px-2 py-1 text-[10px] text-[#bde7df]">
                      Summoning marker
                    </div>
                    <div className="absolute left-[30%] top-[60%] -translate-x-1/2 translate-y-2 border border-[#a78bfa]/70 bg-[#10091a]/90 px-2 py-1 text-[10px] text-[#ddd6fe]">
                      Expedition endpoint
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <div className="border border-[#3b3328] bg-[#0c0b09] p-3">
                    <p className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-[#8f887d]"><Footprints className="size-3" /> On Foot</p>
                    <p className="mt-1 font-mono text-sm font-bold text-[#d9ad63]">{footSteps.toLocaleString()} steps</p>
                    <p className="mt-1 text-[10px] text-[#8f887d]">About {footMiles.toFixed(1)} miles of effort.</p>
                  </div>
                  <div className="border border-[#3b3328] bg-[#0c0b09] p-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#8f887d]">Caravan & Mount</p>
                    <p className="mt-1 font-mono text-sm font-bold text-[#49a3a0]">{assistedMiles.toFixed(1)} mi</p>
                    <p className="mt-1 text-[10px] text-[#8f887d]">Travel handled by roads, mounts, and guides.</p>
                  </div>
                  <div className="border border-[#3b3328] bg-[#0c0b09] p-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#8f887d]">Endpoint</p>
                    <p className="mt-1 font-serif text-sm font-bold text-[#d8c4a5]">Field marker reached</p>
                    <p className="mt-1 text-[10px] text-[#8f887d]">This is where the expedition concludes.</p>
                  </div>
                  <div className="border border-[#3b3328] bg-[#0c0b09] p-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#8f887d]">Return Stone</p>
                    <p className="mt-1 font-serif text-sm font-bold text-[#c4b5fd]">Guild Hall return</p>
                    <p className="mt-1 text-[10px] text-[#8f887d]">The character does not walk the return route.</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 border border-[#3b3328] bg-[#0c0b09] p-3 text-[10px] text-[#b7ab9c] md:grid-cols-3">
                  <p><span className="font-bold text-[#d9ad63]">Gold:</span> on-foot effort earned from real steps.</p>
                  <p><span className="font-bold text-[#49a3a0]">Teal:</span> caravan roads, mounts, and guided travel.</p>
                  <p><span className="font-bold text-[#c4b5fd]">Violet:</span> return-stone travel back to the Guild Hall.</p>
                </div>
              </div>

              <div className="border-b border-[#3b3328] p-4">
                <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#9d8f80]">Recorded Clues</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {MAP_CLUES.map((clue) => (
                    <div key={clue.title} className="border border-[#3b3328] bg-[#0c0b09] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-[#8f887d]">{clue.source}</p>
                          <p className="mt-1 font-serif text-base font-bold text-[#d9ad63]">{clue.title}</p>
                        </div>
                        <Badge variant="outline" className={cn("shrink-0 border-[#6b4d2f] text-[#d8c4a5]", clue.status !== "Known" && "text-[#8f887d]")}>
                          {clue.status !== "Known" && <Lock className="mr-1 size-3" />}
                          {clue.status}
                        </Badge>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-[#b7ab9c]">{clue.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-b border-[#3b3328] p-4">
                <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#9d8f80]">Cartography records</p>
                <div className="grid gap-2 md:grid-cols-3">
                  {MAP_FEATURES.map((feature) => (
                    <div key={feature} className="border border-[#3b3328] bg-[#0c0b09] p-3">
                      <p className="font-serif text-sm font-bold text-[#d9ad63]">{feature}</p>
                      <p className="mt-1 text-[11px] text-[#8f887d]">Awaiting Chronicle data</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 p-4 md:grid-cols-2">
                {(chronicle?.campaignProgress ?? []).slice(0, 2).map((quest) => (
                  <div key={quest.id} className="border border-[#3b3328] bg-[#0c0b09] p-3">
                    <p className="font-serif text-sm font-bold text-[#d9ad63]">{quest.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[#8f887d]">{quest.description}</p>
                    <Badge variant="outline" className="mt-3 border-[#6b4d2f] text-[#d8c4a5]">{quest.status}</Badge>
                  </div>
                ))}
                {!(chronicle?.campaignProgress ?? []).length && (
                  <div className="border border-dashed border-[#3b3328] bg-[#0c0b09] p-4 text-sm text-[#8f887d] md:col-span-2">
                    No routes are marked yet. The Guild will chart them as your legend reaches new gates.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
