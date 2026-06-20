import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  customFetch,
  getGetGuildHallTodayQueryKey,
  useGetGuildHallToday,
  useGetGuildMasterConversation,
  useReportToGuildMaster,
  type GuildHallReportResult,
  type QuestTask,
} from "@workspace/api-client-react";
import {
  Apple,
  BookOpen,
  Check,
  Clock3,
  Crown,
  Dumbbell,
  Flame,
  Landmark,
  Loader2,
  MapPin,
  MessageCircle,
  Route,
  Send,
  Shield,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ChatLine = { id: string; role: "user" | "assistant"; content: string };

function WorldDangerBar({ danger }: { danger: any }) {
  if (!danger) return null;
  const value = Math.max(0, Math.min(100, Number(danger.value ?? 100)));
  const critical = value >= 85;
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

  async function sendMessage() {
    const content = draft.trim();
    if (!content || !conversation?.conversationId || sending) return;
    setDraft("");
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
    "What does the Guild know about the System?",
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
            Aldric can answer direct questions about Aethoria, the System, the Sovereign, your record, or the next duty. If the Gates worsen, he will keep idle talk short.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => setDraft(question)}
                className="border border-[#6b4d2f] px-2 py-1 text-[10px] text-[#d9ad63] hover:border-[#c08c4e]"
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
            placeholder="Ask Aldric about Aethoria, the System, your record, or the next duty..."
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
  const [dialogOpen, setDialogOpen] = useState(false);
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
            <span className="border border-[#72552e] px-2 py-0.5 text-[10px] font-bold text-[#d5a557]">S-RANK</span>
          </div>
          <p className="mt-2 font-serif text-[15px] leading-relaxed text-[#ded5c8]">{data.counsel.message}</p>
          {extended.counsel?.trendSummary && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="border border-[#3b3328] bg-[#0c0b09] p-2"><p className="text-[#8f887d]">Recent work</p><p className="text-[#d9ad63]">{extended.counsel.trendSummary.recentWorkouts}</p></div>
              <div className="border border-[#3b3328] bg-[#0c0b09] p-2"><p className="text-[#8f887d]">Style</p><p className="truncate text-[#d9ad63]">{extended.counsel.trendSummary.dominantStyle ?? "forming"}</p></div>
              <div className="border border-[#3b3328] bg-[#0c0b09] p-2"><p className="text-[#8f887d]">PRs</p><p className="text-[#d9ad63]">{extended.counsel.trendSummary.recentPrs}</p></div>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-[#c6903e]">
            <Flame className="size-4" />
            <span>{data.player.streakDays}-day training streak - Aldric has noticed.</span>
          </div>
        </div>
      </section>

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
          { icon: Crown, label: "Rank", value: `${data.player.rank}-Rank`, color: "text-[#d6a14b]" },
          { icon: Sparkles, label: "Level", value: `Lv. ${data.player.level}`, color: "text-[#d8c4a5]" },
          { icon: Flame, label: "Streak", value: `${data.player.streakDays} days`, color: "text-[#dc7540]" },
          { icon: BookOpen, label: "Campaign", value: `Ch. ${data.campaign.chapter}`, color: "text-[#55a6a1]" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="border-r border-[#3b3328] px-1 py-3 text-center last:border-r-0">
            <Icon className={cn("mx-auto size-4", color)} />
            <p className="mt-1 text-[9px] uppercase text-[#80796f]">{label}</p>
            <p className="mt-0.5 truncate font-serif text-xs text-[#e2d8ca]">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 border border-[#514332] bg-[#11100e] px-4 md:px-6">
        <div className="flex items-center justify-between border-b border-[#3b3328] py-3">
          <div>
            <p className="font-serif text-lg font-bold text-[#d9ad63]">Today's Commission</p>
            <p className="text-[11px] text-[#8f887d]">{completed} of {quest.tasks.length} duties complete - {extended.commission?.category ?? "training"}</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] uppercase text-[#8f887d]"><Clock3 className="size-3" /> Resets at midnight</div>
        </div>
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
            <a href="/inventory" className="shrink-0 border border-[#6b4d2f] px-3 py-2 text-[10px] font-bold uppercase text-[#d9ad63]">Open</a>
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
      <p className={cn("mt-4 text-center text-[11px]", allDone ? "text-[#69a97b]" : "text-[#7e776d]")}>{allDone ? "The Guild is ready to receive your report." : "Consistency is the weapon. The next action is enough."}</p>
    </div>
  );
}
