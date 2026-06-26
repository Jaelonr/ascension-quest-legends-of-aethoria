import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  customFetch,
  getGetGuildHallTodayQueryKey,
  useGetGuildHallToday,
  useGetGuildMasterConversation,
  useGetCampaignStory,
  useCreateWorkoutSession,
  useReportToGuildMaster,
  type CampaignStoryChapter,
  type CampaignStoryQuest,
  type GuildHallReportResult,
  type QuestTask,
} from "@workspace/api-client-react";
import {
  Apple,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Crown,
  Dumbbell,
  Flame,
  Gift,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Route,
  Send,
  Shield,
  Sparkles,
  Swords,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatGuildGrade } from "@/lib/ranks";
import { useLocation } from "wouter";

type ChatLine = { id: string; role: "user" | "assistant"; content: string };

function WorldDangerBar({ danger }: { danger: any }) {
  if (!danger) return null;
  const value = Math.max(0, Math.min(100, Number(danger.value ?? 100)));
  const critical = danger.state === "critical" || value >= 90;
  return (
    <section className={cn(
      "mt-4 border bg-[#11100e] p-4",
      critical ? "border-[#9d3e2a]" : "border-[#6b4d2f]",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#9d8f80]">System reading</p>
          <h2 className={cn("mt-1 font-serif text-lg font-bold", critical ? "text-[#d95f45]" : "text-[#d9ad63]")}>World Danger: {danger.label ?? "Critical"}</h2>
        </div>
        <div className={cn("border px-2 py-1 text-xs font-bold", critical ? "border-[#9d3e2a] text-[#d95f45]" : "border-[#72552e] text-[#d5a557]")}>{value}%</div>
      </div>
      <div className="mt-3 h-3 border border-[#3b3328] bg-[#070706]">
        <div
          className={cn("h-full transition-all", critical ? "bg-[#9d3e2a]" : value >= 65 ? "bg-[#b45f2d]" : value >= 40 ? "bg-[#b48432]" : "bg-[#4f8f67]")}
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#b7ab9c]">{danger.systemNote}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="border border-[#3b3328] bg-[#0c0b09] p-2"><p className="text-[#8f887d]">Bosses defeated</p><p className="text-[#d9ad63]">{danger.defeatedBosses ?? 0}</p></div>
        <div className="border border-[#3b3328] bg-[#0c0b09] p-2"><p className="text-[#8f887d]">Active threats</p><p className="text-[#d95f45]">{danger.activeThreats ?? 0}</p></div>
        <div className="border border-[#3b3328] bg-[#0c0b09] p-2"><p className="text-[#8f887d]">Rule</p><p className="text-[#d8c4a5]">Boss victories lower it</p></div>
      </div>
    </section>
  );
}

function taskIcon(description: string) {
  const value = description.toLowerCase();
  if (value.includes("protein")) return Apple;
  if (value.includes("meal") || value.includes("nutrition")) return Utensils;
  return Dumbbell;
}

function TaskRow({ task, order }: { task: QuestTask; order: number }) {
  const Icon = taskIcon(task.description);
  const target = task.targetValue ?? 1;
  const current = Math.min(task.currentValue ?? 0, target);
  const percent = task.completed ? 100 : Math.min(100, (current / Math.max(1, target)) * 100);

  return (
    <div className="grid grid-cols-[42px_1fr_auto] gap-3 border-b border-[#3b3328] py-4 last:border-b-0">
      <div className="relative flex items-start justify-center">
        <div className="flex size-9 items-center justify-center border border-[#8c6a36] bg-[#15130f] text-[#d8ab59]">
          <Icon className="size-4" />
        </div>
        <span className="absolute -left-1 -top-2 text-[10px] font-bold text-[#9b7842]">{order}</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <p className={cn("font-serif text-sm font-semibold text-[#eee5d7]", task.completed && "text-[#a8c9b0]")}>{task.description}</p>
          {task.completed && <Check className="mt-0.5 size-4 shrink-0 text-[#4fa56b]" />}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden bg-[#25231f]">
          <div className={cn("h-full bg-[#b48432] transition-all", task.completed && "bg-[#3e8f5c]")} style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-[#928b80]">
          {task.currentValue ?? 0} / {task.targetValue ?? 1} {task.unit ?? ""}
        </p>
      </div>
      <div className="min-w-[62px] text-right">
        <p className="text-xs font-semibold text-[#e2ad4d]">+{order === 1 ? 150 : 100} XP</p>
        <p className="mt-1 text-[11px] text-[#b99c6b]">+{order === 1 ? 75 : 50} gold</p>
      </div>
    </div>
  );
}

function CommissionLocationPanel({ commission }: { commission: any }) {
  const location = commission?.location;
  const travel = commission?.travel;
  if (!location || !travel) return null;
  return (
    <div className="border-b border-[#3b3328] py-3">
      <div className="grid gap-2 md:grid-cols-[1.1fr_1.4fr]">
        <div className="border border-[#3b3328] bg-[#0c0b09] p-3">
          <p className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-[#8f887d]">
            <MapPin className="size-3" /> Commission Location
          </p>
          <p className="mt-1 font-serif text-base font-bold text-[#d9ad63]">{location.name}</p>
          <p className="text-[11px] uppercase tracking-wide text-[#8f887d]">{location.region} - {location.distanceFromGuildHallMiles} mi from the Guild Hall</p>
          <div className="mt-2 grid gap-1 text-[10px] uppercase tracking-wide text-[#9f9586]">
            <p><span className="text-[#d8c4a5]">Realm:</span> {location.realm ?? "Uncharted realm"}</p>
            <p><span className="text-[#d8c4a5]">Faction:</span> {location.primaryFaction ?? "Unknown faction"}</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#b7ab9c]">{travel.narrativeReason}</p>
        </div>
        <div className="border border-[#3b3328] bg-[#0c0b09] p-3">
          <p className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-[#8f887d]">
            <Route className="size-3" /> Expedition Travel
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[10px]">
            <div><p className="text-[#8f887d]">Foot</p><p className="font-mono text-[#d9ad63]">{travel.onFootMiles} mi</p></div>
            <div><p className="text-[#8f887d]">Caravan</p><p className="font-mono text-[#49a3a0]">{travel.caravanMiles} mi</p></div>
            <div><p className="text-[#8f887d]">Mount</p><p className="font-mono text-[#79b8d8]">{travel.mountMiles} mi</p></div>
            <div><p className="text-[#8f887d]">Return</p><p className="font-mono text-[#c4b5fd]">{travel.returnStoneMiles} mi</p></div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#b7ab9c]">{travel.routeNote}</p>
        </div>
      </div>
    </div>
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
    completionLabel: path?.label,
    completionNarrative: path?.narrative,
    intendedStyle: path?.intendedStyle,
    narrativeThreat: commission?.expedition?.threat,
    travelMethod: commission?.expedition?.travelMethod ?? commission?.travel?.travelMethod,
    flavorKind: commission?.expedition?.narrativeFlavor?.kind,
    flavorTitle: commission?.expedition?.narrativeFlavor?.title,
    flavorObjective: commission?.expedition?.narrativeFlavor?.objective,
    flavorStakes: commission?.expedition?.narrativeFlavor?.stakes,
  })}`;
}

function CommissionDetailDialog({
  open,
  onOpenChange,
  commission,
  onStartPath,
  isStarting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commission: any;
  onStartPath: (path: any) => void;
  isStarting: boolean;
}) {
  const expedition = commission?.expedition;
  const quest = commission?.quest;
  const location = commission?.location;
  const travel = commission?.travel;
  const flavor = expedition?.narrativeFlavor;
  const majorQuest = expedition?.majorQuest;
  const paths = expedition ? [expedition.recommendedPath, ...(expedition.alternativePaths ?? [])].filter(Boolean) : [];
  if (!commission) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-[#6e4d2d] bg-[#11100e] text-[#eee5d7]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[#d9ad63]">{expedition?.commissionTitle ?? "Commission Briefing"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[72vh] pr-3">
          <div className="space-y-4">
            <div className="border border-[#3b3328] bg-[#0c0b09] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#8f887d]">Region</p>
                  <h3 className="mt-1 font-serif text-xl font-bold text-[#d9ad63]">{expedition?.region?.regionName ?? location?.region ?? "Aethoria"}</h3>
                  <p className="mt-1 text-xs text-[#9f9586]">{location?.name ?? "Guild territory"}{location?.distanceFromGuildHallMiles ? ` - ${location.distanceFromGuildHallMiles} mi from the Hall` : ""}</p>
                </div>
                <div className="border border-[#6b4d2f] px-3 py-2 text-right text-[10px] uppercase tracking-widest text-[#d9ad63]">
                  {commission.category ?? "training"}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#d8c4a5]">{expedition?.narrativeBriefing ?? commission.rationale}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(expedition?.region?.trainingStyles ?? []).slice(0, 6).map((style: string) => (
                  <span key={style} className="border border-[#3b3328] bg-[#15130f] px-2 py-1 text-[10px] uppercase tracking-wide text-[#49a3a0]">{style.replace(/_/g, " ")}</span>
                ))}
              </div>
            </div>

            {flavor && (
              <div className="border border-[#6b4d2f] bg-[#15100c] p-4">
                <p className="text-[10px] uppercase tracking-widest text-[#8f887d]">{flavor.kind === "main_quest" ? "Major Quest Tiding" : "Guild Tiding"}</p>
                <p className="mt-2 font-serif text-lg font-bold text-[#d9ad63]">{flavor.title}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-[#8f887d]">Posted by {flavor.patron}</p>
                <p className="mt-3 text-sm leading-relaxed text-[#d6ccbe]">{flavor.hook}</p>
                <div className="mt-3 border-l-2 border-[#d9ad63] pl-3 text-xs leading-5 text-[#d8c4a5]">
                  <p><span className="uppercase tracking-widest text-[#8f887d]">Objective</span> {flavor.objective}</p>
                  <p className="mt-2"><span className="uppercase tracking-widest text-[#8f887d]">Stakes</span> {flavor.stakes}</p>
                  <p className="mt-2"><span className="uppercase tracking-widest text-[#8f887d]">Rumor</span> {flavor.rumor}</p>
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="border border-[#3b3328] bg-[#0c0b09] p-4">
                <p className="text-[10px] uppercase tracking-widest text-[#8f887d]">Threat / Task</p>
                <p className="mt-2 text-sm leading-relaxed text-[#cfc5b8]">{expedition?.threat ?? "Complete the Guild duty and return with proof."}</p>
              </div>
              {majorQuest && (
                <div className={cn("border bg-[#0c0b09] p-4", majorQuest.available ? "border-[#9d3e2a]" : "border-[#3b3328]")}>
                  <p className="text-[10px] uppercase tracking-widest text-[#8f887d]">Main Quest Pressure</p>
                  <p className="mt-2 font-serif text-sm font-bold text-[#d9ad63]">{majorQuest.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-[#b7ab9c]">{majorQuest.description}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-wide text-[#49a3a0]">{majorQuest.available ? majorQuest.routeLabel : `${majorQuest.completedTowardUnlock}/${majorQuest.threshold} commissions toward next major threat`}</p>
                </div>
              )}
              <div className="border border-[#3b3328] bg-[#0c0b09] p-4">
                <p className="text-[10px] uppercase tracking-widest text-[#8f887d]">Travel</p>
                <p className="mt-2 font-serif text-sm font-bold text-[#d9ad63]">{expedition?.travelMethod ?? travel?.travelMethod ?? "Guild route"}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#b7ab9c]">{travel?.routeNote}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#c4b5fd]">{expedition?.returnStoneNote}</p>
              </div>
            </div>

            <div className="border-l-2 border-[#9d3e2a] bg-[#1b1511] px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-[#9d8f80]">Aldric's Reason</p>
              <p className="mt-1 text-sm leading-relaxed text-[#d6ccbe]">{expedition?.aldricReason ?? commission.rationale}</p>
            </div>

            <div className="border border-[#3b3328] bg-[#0c0b09] p-4">
              <p className="text-[10px] uppercase tracking-widest text-[#8f887d]">Real-world completion</p>
              <p className="mt-2 text-sm leading-relaxed text-[#cfc5b8]">{expedition?.realWorldAction ?? "Complete a valid training, nutrition, recovery, or walking action."}</p>
              <div className="mt-3 space-y-2">
                {(quest?.tasks ?? []).map((task: any) => (
                  <div key={task.id ?? task.description} className="flex justify-between gap-3 border border-[#2a2520] bg-[#11100e] px-3 py-2 text-xs">
                    <span className="text-[#d8c4a5]">{task.description}</span>
                    <span className={task.completed ? "text-[#7cc79b]" : "text-[#d9ad63]"}>{task.currentValue ?? 0}/{task.targetValue ?? 1} {task.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[#6b4d2f] bg-[#11100e] p-4">
              <p className="font-serif text-base font-bold text-[#d9ad63]">Choose a completion path</p>
              {paths.length === 1 && <p className="mt-2 text-xs leading-5 text-[#b6aa97]">This commission leaves little room for improvisation. The Guild wants this handled cleanly.</p>}
              {paths.length > 1 && <p className="mt-2 text-xs leading-5 text-[#b6aa97]">Aldric has approved more than one route. Choose the one you can complete honestly today.</p>}
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {paths.map((path: any) => (
                  <button
                    key={path.id}
                    type="button"
                    onClick={() => onStartPath(path)}
                    disabled={isStarting}
                    className="border border-[#3b3328] bg-[#0c0b09] p-3 text-left transition-colors hover:border-[#c08c4e] disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-serif text-sm font-bold text-[#eee5d7]">{path.label}</span>
                      {path.recommended && <span className="border border-[#49a3a0] px-1.5 py-0.5 text-[9px] uppercase text-[#49a3a0]">Recommended</span>}
                    </div>
                    {path.narrative && <p className="mt-2 text-xs leading-5 text-[#c9b99e]">{path.narrative}</p>}
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-[#8f887d]">{path.kind.replace(/_/g, " ")}</p>
                  </button>
                ))}
              </div>
              {paths.length === 0 && <p className="mt-3 text-xs leading-5 text-[#b6aa97]">The Guild is still preparing this route. Return to the Hall or refresh the commission board.</p>}
            </div>

            <div className="flex items-center justify-center gap-8 border border-[#3b3328] bg-[#0c0b09] py-4 text-center">
              <div><p className="text-[10px] uppercase text-[#8f887d]">Reward</p><p className="font-serif text-base text-[#49a3a0]">+{quest?.xpReward ?? 0} XP</p></div>
              <div className="h-8 w-px bg-[#3b3328]" />
              <div><p className="text-[10px] uppercase text-[#8f887d]">Gold</p><p className="font-serif text-base text-[#d7a54d]">+{quest?.goldReward ?? 0}</p></div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function ReadinessPanel({ readiness }: { readiness: any }) {
  if (!readiness) return null;
  const hasRecord = readiness.source || readiness.steps > 0 || readiness.sleepHours != null || readiness.activeMinutes > 0;
  if (!hasRecord) {
    return (
      <section className="mt-4 border border-[#345f5d] bg-[#071111] p-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#49a3a0]">Healer's Ledger</p>
        <h2 className="mt-1 font-serif text-lg font-bold text-[#d9ad63]">Awaiting Recovery Record</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#b7ab9c]">Sync Samsung Health through Health Connect on Android or log vitals manually so the Guild can account for today's recovery.</p>
      </section>
    );
  }
  return (
    <section className="mt-4 border border-[#345f5d] bg-[#071111] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#49a3a0]">System Analysis</p>
          <h2 className="mt-1 font-serif text-lg font-bold capitalize text-[#e7f7f4]">{readiness.interpretation?.replace(/_/g, " ") ?? "Readiness observed"}</h2>
        </div>
        <div className="border border-[#49a3a0] px-2 py-1 text-[10px] uppercase tracking-widest text-[#49a3a0]">
          {readiness.systemAnalysis?.confidenceLevel ?? "low"}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="border border-[#173533] bg-[#0c0b09] p-2"><p className="text-[#8f887d]">Steps</p><p className="text-[#d9ad63]">{Number(readiness.steps ?? 0).toLocaleString()}</p></div>
        <div className="border border-[#173533] bg-[#0c0b09] p-2"><p className="text-[#8f887d]">Sleep</p><p className="text-[#d9ad63]">{readiness.sleepHours == null ? "--" : `${readiness.sleepHours}h`}</p></div>
        <div className="border border-[#173533] bg-[#0c0b09] p-2"><p className="text-[#8f887d]">Source</p><p className="truncate text-[#49a3a0]">{readiness.source?.replace(/_/g, " ") ?? "manual"}</p></div>
      </div>
      <p className="mt-3 text-sm font-semibold leading-relaxed text-[#e6c27b]">{readiness.activeRecommendation}</p>
      {readiness.aldricLine && <p className="mt-2 text-sm italic leading-relaxed text-[#9dbdb8]">{readiness.aldricLine}</p>}
      {readiness.agencyNote && <p className="mt-2 border-l border-[#49a3a0]/50 pl-3 text-xs leading-relaxed text-[#b7ab9c]">{readiness.agencyNote}</p>}
    </section>
  );
}

const GH_DIFF: Record<string, string> = {
  E: "text-[#8f887d] border-[#3b3328]", D: "text-green-400 border-green-600/30",
  C: "text-blue-400 border-blue-600/30", B: "text-purple-400 border-purple-600/30",
  A: "text-orange-400 border-orange-600/30", S: "text-[#d9ad63] border-[#d9ad63]/40",
};
const GH_STATUS: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  claimed:   { label: "Completed",    color: "text-green-400",  Icon: Check },
  completed: { label: "Claim Reward", color: "text-[#d9ad63]", Icon: Gift },
  active:    { label: "In Progress",  color: "text-[#49a3a0]", Icon: Swords },
  locked:    { label: "???",          color: "text-[#6b5d4f]", Icon: Lock },
};

function GHQuestRow({ quest }: { quest: CampaignStoryQuest }) {
  const [open, setOpen] = useState(quest.status === "active" || quest.status === "completed");
  const s = GH_STATUS[quest.status] ?? GH_STATUS.locked;
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
          {quest.difficulty && <span className={cn("border px-1 text-[10px] font-mono", GH_DIFF[quest.difficulty] ?? "")}>{quest.difficulty}</span>}
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

function GHChapterBlock({ chapter, defaultOpen }: { chapter: CampaignStoryChapter; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const isLocked = chapter.status === "locked";
  const done = chapter.quests.filter(q => q.status === "claimed").length;
  const revealed = chapter.quests.filter(q => q.status !== "locked").length;
  return (
    <div className={cn("border", isLocked ? "border-[#2a2520]" : "border-[#6b4d2f]", "bg-[#11100e]")}>
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-3 bg-[#0c0b09] px-4 py-3 text-left">
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
          {chapter.quests.map(q => <GHQuestRow key={q.campaignId} quest={q} />)}
        </div>
      )}
    </div>
  );
}

function CampaignStoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: story, isLoading } = useGetCampaignStory({ query: { queryKey: ["/api/campaign/story"], enabled: open } });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[#6e4d2d] bg-[#11100e] text-[#eee5d7]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[#d9ad63]">Campaign — Aethoria's Story</DialogTitle>
        </DialogHeader>
        {isLoading && <div className="space-y-2"><div className="h-10 animate-pulse rounded bg-[#1a1815]" /><div className="h-10 animate-pulse rounded bg-[#1a1815]" /></div>}
        {story && (
          <>
            <div className="border border-[#6b4d2f]/50 bg-[#0c0b09] px-3 py-2 text-xs">
              <p className="text-[9px] uppercase tracking-widest text-[#8f887d] font-mono">Current Position</p>
              <p className="mt-0.5 font-serif font-bold text-[#d9ad63]">
                Chapter {story.currentChapter}
                {story.currentQuestTitle && <span className="font-normal text-[#b7ab9c]"> — {story.currentQuestTitle}</span>}
              </p>
            </div>
            <ScrollArea className="max-h-[55vh] pr-2">
              <div className="space-y-2 py-1">
                {story.chapters.map(ch => (
                  <GHChapterBlock key={ch.chapter} chapter={ch} defaultOpen={ch.status === "active"} />
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GuildMasterDialog({ open, onOpenChange, initialReport }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialReport: GuildHallReportResult | null;
}) {
  const { data: conversation, refetch } = useGetGuildMasterConversation({ query: { queryKey: ["/api/guild-master/conversation"], enabled: open } });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [localLines, setLocalLines] = useState<ChatLine[]>([]);

  const lines = useMemo<ChatLine[]>(() => [
    ...(conversation?.messages ?? []).map((message) => ({
      id: String(message.id),
      role: message.role === "user" ? "user" as const : "assistant" as const,
      content: message.content,
    })),
    ...localLines,
  ], [conversation?.messages, localLines]);

  const { toast } = useToast();

  async function sendMessage(contentOverride?: string) {
    const content = (contentOverride !== undefined ? contentOverride : draft).trim();
    if (!content || sending) return;
    if (!conversation?.conversationId) {
      toast({ title: "Still connecting", description: "The Guild Hall is loading — try again in a moment." });
      return;
    }
    if (contentOverride === undefined) setDraft("");
    setSending(true);
    setLocalLines((items) => [...items, { id: `user-${Date.now()}`, role: "user", content }]);
    try {
      const sse = await customFetch<string>("/api/guild-master/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, conversationId: conversation.conversationId, narrativeMode: "balanced" }),
        responseType: "text",
      });
      const answer = sse.split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => {
          try { return JSON.parse(line.slice(6)) as { content?: string }; } catch { return {}; }
        })
        .map((event) => event.content ?? "")
        .join("");
      if (answer) setLocalLines((items) => [...items, { id: `assistant-${Date.now()}`, role: "assistant", content: answer }]);
      await refetch();
      setLocalLines([]);
    } catch {
      toast({ title: "Aldric is unavailable", description: "The Guild's connection was interrupted. Try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  const reportDetails = (initialReport as any)?.aldric;
  const reportMessage = reportDetails?.counsel ?? initialReport?.counsel ?? (initialReport?.reported
    ? "The commission has been recorded."
    : null);
  const suggestedQuestions = [
    "What is the state of Aethoria?",
    "What does the Guild know about my summoning?",
    "What should I do next?",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[#6e4d2d] bg-[#11100e] text-[#eee5d7]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[#d9ad63]">Grandmaster Aldric</DialogTitle>
        </DialogHeader>
        {reportMessage && <div className="border-l-2 border-[#9d3e2a] bg-[#1b1511] px-3 py-2 text-sm text-[#d6ccbe]">{reportMessage}</div>}
        {reportDetails && (
          <div className="grid gap-2 text-xs text-[#a99f92]">
            <div><span className="font-bold text-[#d9ad63]">Aldric's read:</span> {reportDetails.tone}</div>
            <div><span className="font-bold text-[#d9ad63]">Practical order:</span> {reportDetails.practicalRecommendation}</div>
            {reportDetails.warning && <div className="text-[#d48b73]">{reportDetails.warning}</div>}
            <div><span className="font-bold text-[#d9ad63]">Next step:</span> {reportDetails.nextStep}</div>
          </div>
        )}
        <div className="border border-[#3b3328] bg-[#0c0b09] p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8f887d]">Private audience</p>
          <p className="mt-1 text-xs leading-relaxed text-[#cfc5b8]">
            Aldric can answer direct questions about Aethoria, the Gates, the Sovereign, your record, or the next duty. If the Gates worsen, he will keep idle talk short.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void sendMessage(question)}
                disabled={sending}
                className="border border-[#6b4d2f] px-2 py-1 text-[10px] text-[#d9ad63] hover:border-[#c08c4e] disabled:opacity-40"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
        <ScrollArea className="h-[42vh] pr-3">
          <div className="space-y-3 py-2">
            {lines.map((line) => (
              <div key={line.id} className={cn(
                "max-w-[88%] px-3 py-2 text-sm leading-relaxed",
                line.role === "user" ? "ml-auto bg-[#4c2119] text-[#f4e9db]" : "border border-[#3b3328] bg-[#181713] text-[#d4ccc0]",
              )}>
                {line.content}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask Aldric about Aethoria, the Gates, your record, or the next duty..."
            className="min-h-20 resize-none border-[#4a4032] bg-[#171510]"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <Button size="icon" onClick={() => void sendMessage()} disabled={!draft.trim() || sending} className="bg-[#8e3525] text-[#f4e9db] hover:bg-[#a6422e]">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GuildHall() {
  const { data, isLoading, isError, refetch } = useGetGuildHallToday();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const createSession = useCreateWorkoutSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [reportResult, setReportResult] = useState<GuildHallReportResult | null>(null);
  const report = useReportToGuildMaster({
    mutation: {
      onSuccess: async (result) => {
        setReportResult(result);
        setDialogOpen(true);
        await queryClient.invalidateQueries({ queryKey: getGetGuildHallTodayQueryKey() });
        toast({
          title: result.reported ? "Commission recorded" : "Commission remains open",
          description: result.reported
            ? result.alreadyReported ? "Your reward was already recorded." : "Your earned rewards have been added."
            : `${result.remainingTasks?.length ?? 0} task${result.remainingTasks?.length === 1 ? "" : "s"} remain.`,
        });
      },
      onError: () => toast({ title: "Report failed", description: "Your progress is safe. Try reporting again.", variant: "destructive" }),
    },
  });

  if (isLoading) {
    return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="size-7 animate-spin text-[#c2944e]" /></div>;
  }
  if (isError || !data) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
        <Shield className="size-8 text-[#9d3e2a]" />
        <p className="text-sm text-muted-foreground">The Guild ledger could not be opened.</p>
        <Button variant="outline" onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  const extended = data as any;
  const quest = data.commission.quest;
  const completed = quest.tasks.filter((task) => task.completed).length;
  const allDone = completed === quest.tasks.length;
  const startCommissionPath = (path: any) => {
    const target = path?.kind === "program"
      ? "/training/program"
      : path?.kind === "workout_builder"
        ? "/training/planner"
        : null;
    if (target) {
      navigate(target);
      return;
    }
    createSession.mutate(
      {
        data: {
          name: `${path?.label ?? "Commission Session"} - ${extended.commission.location?.name ?? "Aethoria"}`,
          templateId: undefined as any,
          notes: buildCommissionNote(extended.commission, path),
        },
      },
      {
        onSuccess: (session: { id: number }) => navigate(`/training/session/${session.id}`),
        onError: () => toast({ title: "Could not start commission session", variant: "destructive" }),
      },
    );
  };

  return (
    <div
      className="min-h-screen bg-[#0c0b09] bg-cover bg-top p-4 pb-24 text-[#eee5d7] md:p-6"
      style={{ backgroundImage: "url('/assets/guild-hall-background.png')" }}
    >
      <header className="border-b border-[#6d4a25] pb-3">
        <div className="flex items-center gap-3">
          <Landmark className="size-6 text-[#d09b43]" />
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-wide text-[#e5c386]">Guild Hall</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#9f9586]">Train. Fuel. Recover. Endure.</p>
          </div>
        </div>
      </header>

      <WorldDangerBar danger={extended.worldDanger} />

      <section className="mt-4 overflow-hidden border border-[#6b4d2f] bg-[#11100e] md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
        <img src="/assets/grandmaster-aldric.jpg" alt="Grandmaster Aldric in the Guild Hall" className="aspect-[4/3] w-full object-cover object-[42%_30%] md:h-full md:aspect-auto" />
        <div className="border-t border-[#6b4d2f] p-4 md:flex md:flex-col md:justify-center md:border-l md:border-t-0 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-bold text-[#d9ad63]">Grandmaster Aldric</h2>
            <span className="border border-[#72552e] px-2 py-0.5 text-[10px] font-bold text-[#d5a557]">MYTHRIL GRADE</span>
          </div>
          <p className="mt-2 font-serif text-[15px] leading-relaxed text-[#ded5c8]">{data.counsel.message}</p>
          {extended.counsel?.trendSummary && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="border border-[#3b3328] bg-[#0c0b09] p-2"><p className="text-[#8f887d]">Recent work</p><p className="text-[#d9ad63]">{extended.counsel.trendSummary.recentWorkouts}</p></div>
              <div className="border border-[#3b3328] bg-[#0c0b09] p-2"><p className="text-[#8f887d]">Style</p><p className="truncate text-[#d9ad63]">{extended.counsel.trendSummary.dominantStyle ?? "forming"}</p></div>
              <div className="border border-[#3b3328] bg-[#0c0b09] p-2"><p className="text-[#8f887d]">PRs</p><p className="text-[#d9ad63]">{extended.counsel.trendSummary.recentPrs}</p></div>
            </div>
          )}
          {extended.counsel?.trendSummary?.trainingLedger && (
            <div className="mt-3 border border-[#345f5d] bg-[#071111] p-3 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#49a3a0]">Hall Training Ledger</p>
              <p className="mt-1 leading-5 text-[#d8c4a5]">
                {extended.counsel.trendSummary.trainingLedger.topRecommendation?.reason ?? extended.counsel.trendSummary.trainingLedger.summary}
              </p>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-[#c6903e]">
            <Flame className="size-4" />
            <span>{data.player.streakDays}-day training streak - Aldric has noticed.</span>
          </div>
        </div>
      </section>

      <ReadinessPanel readiness={extended.readiness} />

      <Button
        onClick={() => report.mutate()}
        disabled={report.isPending}
        className="mt-4 h-14 w-full border border-[#c08c4e] bg-[#74291f] font-serif text-base font-bold uppercase tracking-wide text-[#f1dfc6] hover:bg-[#8c3527]"
      >
        {report.isPending ? <Loader2 className="mr-2 size-5 animate-spin" /> : <MessageCircle className="mr-2 size-5" />}
        Report to the Guildmaster
      </Button>

      <section className="mt-4 grid grid-cols-4 border border-[#514332] bg-[#11100e]">
        {[
          { icon: Crown, label: "Grade", value: formatGuildGrade(data.player.rank), color: "text-[#d6a14b]", onClick: undefined },
          { icon: Sparkles, label: "Level", value: `Lv. ${data.player.level}`, color: "text-[#d8c4a5]", onClick: undefined },
          { icon: Flame, label: "Streak", value: `${data.player.streakDays} days`, color: "text-[#dc7540]", onClick: undefined },
          { icon: BookOpen, label: "Campaign", value: `Ch. ${data.campaign.chapter}`, color: "text-[#55a6a1]", onClick: () => setCampaignOpen(true) },
        ].map(({ icon: Icon, label, value, color, onClick }) => (
          onClick ? (
            <button key={label} type="button" onClick={onClick} className="border-r border-[#3b3328] px-1 py-3 text-center hover:bg-[#1a1815] transition-colors last:border-r-0">
              <Icon className={cn("mx-auto size-4", color)} />
              <p className="mt-1 text-[9px] uppercase text-[#80796f]">{label}</p>
              <p className="mt-0.5 truncate font-serif text-xs text-[#55a6a1]">{value} ›</p>
            </button>
          ) : (
            <div key={label} className="border-r border-[#3b3328] px-1 py-3 text-center last:border-r-0">
              <Icon className={cn("mx-auto size-4", color)} />
              <p className="mt-1 text-[9px] uppercase text-[#80796f]">{label}</p>
              <p className="mt-0.5 truncate font-serif text-xs text-[#e2d8ca]">{value}</p>
            </div>
          )
        ))}
      </section>

      <section className="mt-4 border border-[#514332] bg-[#11100e] px-4 md:px-6">
        <button
          type="button"
          onClick={() => setCommissionOpen(true)}
          className="flex w-full items-center justify-between border-b border-[#3b3328] py-3 text-left transition-colors hover:bg-[#171510]"
        >
          <div>
            <p className="font-serif text-lg font-bold text-[#d9ad63]">Today's Commission</p>
            <p className="text-[11px] text-[#8f887d]">
              {completed} of {quest.tasks.length} duties complete - {extended.commission?.category ?? "training"} - Open Commission
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase text-[#8f887d]">
            {extended.commission?.expedition?.region?.regionName && (
              <span className="border border-[#6b4d2f] px-2 py-1 text-[#d9ad63]">{extended.commission.expedition.region.regionName}</span>
            )}
            <Clock3 className="size-3" /> Resets at midnight
          </div>
        </button>
        {extended.commission?.rationale && (
          <div className="border-b border-[#3b3328] py-3 text-xs leading-relaxed text-[#b7ab9c]">
            {extended.commission.rationale}
          </div>
        )}
        <CommissionLocationPanel commission={extended.commission} />
        {quest.tasks.map((task, index) => <TaskRow key={task.id} task={task} order={index + 1} />)}
        <div className="flex items-center justify-center gap-8 border-t border-[#3b3328] py-4 text-center">
          <div><p className="text-[10px] uppercase text-[#8f887d]">Commission reward</p><p className="mt-1 font-serif text-base text-[#49a3a0]">+{quest.xpReward} XP</p></div>
          <div className="h-8 w-px bg-[#3b3328]" />
          <div><p className="text-[10px] uppercase text-[#8f887d]">Guild gold</p><p className="mt-1 font-serif text-base text-[#d7a54d]">+{quest.goldReward}</p></div>
        </div>
      </section>

      {data.equippedGear.length > 0 && (
        <section className="mt-4 flex items-center gap-3 border-l-2 border-[#428f91] bg-[#10191a] px-3 py-3">
          <Sparkles className="size-5 text-[#53aeb0]" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-[#73999a]">System affinity</p>
            <p className="truncate text-sm text-[#d8e4e3]">{data.equippedGear.map((gear) => `${gear.name}: ${gear.elementalAffinity}`).join(" | ")}</p>
          </div>
        </section>
      )}

      {extended.hallOfferings && (
        <section className="mt-4 border border-[#514332] bg-[#11100e] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-serif text-lg font-bold text-[#d9ad63]">{extended.hallOfferings.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#8f887d]">{extended.hallOfferings.lore}</p>
            </div>
            <a href="/inventory?tab=shop" className="shrink-0 border border-[#6b4d2f] px-3 py-2 text-[10px] font-bold uppercase text-[#d9ad63]">Open</a>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {(extended.hallOfferings.preview ?? []).map((item: any) => (
              <div key={item.id} className="border border-[#3b3328] bg-[#0c0b09] p-3">
                <p className="truncate font-serif text-sm font-bold text-[#d8c4a5]">{item.name}</p>
                <p className="text-[10px] uppercase text-[#8f887d]">{item.rarity} - {item.goldCost} gold</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.worldEvents.length > 0 && (
        <section className="mt-4 border border-[#6a3028] bg-[#1b1110] p-3">
          <p className="font-serif text-sm font-bold text-[#d48b73]">The world remembers</p>
          <p className="mt-1 text-xs leading-relaxed text-[#baa9a2]">{data.worldEvents[0]?.description}</p>
        </section>
      )}

      <GuildMasterDialog open={dialogOpen} onOpenChange={setDialogOpen} initialReport={reportResult} />
      <CampaignStoryDialog open={campaignOpen} onOpenChange={setCampaignOpen} />
      <CommissionDetailDialog
        open={commissionOpen}
        onOpenChange={setCommissionOpen}
        commission={extended.commission}
        onStartPath={startCommissionPath}
        isStarting={createSession.isPending}
      />
      <p className={cn("mt-4 text-center text-[11px]", allDone ? "text-[#69a97b]" : "text-[#7e776d]")}>{allDone ? "The Guild is ready to receive your report." : "Consistency is the weapon. The next action is enough."}</p>
    </div>
  );
}
