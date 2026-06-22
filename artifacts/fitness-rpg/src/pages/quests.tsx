import { useState } from "react";
import {
  useGetQuests,
  useGetCampaignStory,
  useClaimQuestReward,
  useCompleteQuestTask,
  useStartCampaignMission,
  useAbandonCampaignMission,
  type CampaignStoryQuest,
  type CampaignStoryChapter,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Flag,
  Gift,
  Lock,
  Play,
  Scroll,
  Shield,
  Swords,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatGuildGrade } from "@/lib/ranks";

const DIFF_COLOR: Record<string, string> = {
  E: "text-gray-400 border-gray-600/40",
  D: "text-green-400 border-green-600/40",
  C: "text-blue-400 border-blue-600/40",
  B: "text-purple-400 border-purple-600/40",
  A: "text-orange-400 border-orange-600/40",
  S: "text-yellow-400 border-yellow-500/40",
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  claimed:   { label: "Completed",      color: "text-green-400",  icon: CheckCircle },
  completed: { label: "Claim Reward",   color: "text-yellow-400", icon: Gift },
  active:    { label: "In Progress",    color: "text-cyan-400",   icon: Swords },
  locked:    { label: "???",            color: "text-[#6b5d4f]",  icon: Lock },
};

const SEVERITY_META: Record<string, { label: string; color: string; icon: string }> = {
  slight:   { label: "Slight Retreat",      color: "text-yellow-400",  icon: "🛡" },
  moderate: { label: "Forced Withdrawal",   color: "text-orange-400",  icon: "⚔" },
  severe:   { label: "Fallen Short",        color: "text-red-400",     icon: "💀" },
};

function MissionConfirmDialog({
  open,
  quest,
  onConfirm,
  onClose,
  isPending,
}: {
  open: boolean;
  quest: CampaignStoryQuest;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm border-border/60 bg-background">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">Accept Commission?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border border-border/40 bg-card/50 p-3">
            <p className="font-serif font-bold text-sm">{quest.title}</p>
            {quest.difficulty && (
              <span className={cn("border px-1 text-[10px] font-mono inline-block mt-1", DIFF_COLOR[quest.difficulty])}>
                {formatGuildGrade(quest.difficulty)}
              </span>
            )}
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{quest.description}</p>
          </div>

          {quest.fitnessMapping && (
            <div className="border-l-2 border-accent/50 bg-accent/5 px-3 py-2">
              <p className="text-[9px] font-mono uppercase text-accent/70 mb-0.5">Fitness Objective</p>
              <p className="text-xs text-foreground/80">{quest.fitnessMapping}</p>
            </div>
          )}

          <div className="flex gap-4 text-sm font-mono">
            <span className="text-primary">+{quest.xpReward} XP</span>
            <span className="text-yellow-500">+{quest.goldReward} Gold</span>
          </div>

          <div className="flex items-start gap-2 border border-orange-400/30 bg-orange-400/5 px-3 py-2 text-xs text-orange-300/80">
            <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-orange-400" />
            <p>Abandoning the mission mid-workout will generate a narrative consequence — the severity depends on how far you got.</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/80"
            >
              {isPending ? (
                <span className="animate-pulse">Starting...</span>
              ) : (
                <><Play className="size-4 mr-2" /> Begin Mission</>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isPending} className="flex-1">
              Not Yet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AbandonConfirmDialog({
  open,
  onConfirm,
  onClose,
  isPending,
}: {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm border-border/60 bg-background">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg text-red-400">Abandon Mission?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Abandoning this commission will forfeit the reward. Aldric will note the failure in the Guild record — and narrate what the world saw.
          </p>
          <p className="text-xs text-muted-foreground/60 italic">
            The longer you stayed before stopping, the harder the narrative consequence.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={onConfirm}
              disabled={isPending}
              variant="destructive"
              className="flex-1"
            >
              {isPending ? <span className="animate-pulse">Abandoning...</span> : "Abandon"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isPending} className="flex-1">
              Keep Fighting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AbandonConsequenceDialog({
  result,
  onClose,
}: {
  result: { severity: string; narrative: string; questTitle: string } | null;
  onClose: () => void;
}) {
  if (!result) return null;
  const meta = SEVERITY_META[result.severity] ?? SEVERITY_META.moderate;

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm border-border/60 bg-background">
        <DialogHeader>
          <DialogTitle className={cn("font-serif text-lg", meta.color)}>
            {meta.icon} {meta.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border border-border/40 bg-card/30 px-4 py-3">
            <p className="text-[9px] font-mono uppercase text-muted-foreground mb-1">Guild Record</p>
            <p className="text-xs leading-relaxed text-foreground/80 italic">{result.narrative}</p>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">The commission remains open. You may attempt it again.</p>
          <Button onClick={onClose} className="w-full" variant="outline">Understood</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuestStoryCard({
  quest,
  onRefresh,
}: {
  quest: CampaignStoryQuest;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(quest.status === "active" || quest.status === "completed");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [consequence, setConsequence] = useState<{ severity: string; narrative: string; questTitle: string } | null>(null);
  const { toast } = useToast();

  const startMission = useStartCampaignMission();
  const abandonMission = useAbandonCampaignMission();

  const meta = STATUS_META[quest.status] ?? STATUS_META.locked;
  const StatusIcon = meta.icon;
  const isLocked = quest.status === "locked";
  const diffClass = quest.difficulty ? DIFF_COLOR[quest.difficulty] : "text-[#6b5d4f] border-[#3b3328]";
  const isMissionActive = Boolean(quest.missionStartedAt);
  const canStartMission = quest.status === "active" && !isLocked && quest.dbId !== null && !isMissionActive;

  const handleStartMission = () => {
    if (!quest.dbId) return;
    startMission.mutate(
      { data: { dbId: quest.dbId } },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          toast({
            title: "Mission Accepted",
            description: `Head to Training to complete "${quest.title}". Your reward will be claimed automatically.`,
          });
          onRefresh();
        },
        onError: () => {
          toast({ title: "Could not start mission", variant: "destructive" });
        },
      }
    );
  };

  const handleAbandon = () => {
    if (!quest.dbId) return;
    abandonMission.mutate(
      { data: { dbId: quest.dbId } },
      {
        onSuccess: (result) => {
          setAbandonOpen(false);
          setConsequence(result);
          onRefresh();
        },
        onError: () => {
          toast({ title: "Could not abandon mission", variant: "destructive" });
        },
      }
    );
  };

  return (
    <>
      <div className={cn("border bg-card/30 transition-colors", isLocked ? "border-border/30 opacity-60" : "border-border/60")}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          <StatusIcon className={cn("size-4 shrink-0", meta.color)} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-serif text-sm font-bold">{quest.title}</span>
              {quest.difficulty && (
                <span className={cn("border px-1 text-[10px] font-mono uppercase", diffClass)}>{quest.difficulty}</span>
              )}
              {isMissionActive && (
                <span className="border border-cyan-400/40 bg-cyan-400/10 px-1 text-[9px] font-mono text-cyan-400 uppercase animate-pulse">
                  Active
                </span>
              )}
            </div>
            <p className={cn("text-[10px] font-mono", meta.color)}>{meta.label}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-[10px] text-muted-foreground">
            <span className="text-primary">+{quest.xpReward} XP</span>
            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </div>
        </button>

        {open && (
          <div className="border-t border-border/40 px-4 pb-4 pt-3 space-y-3">
            <p className={cn("text-xs leading-relaxed", isLocked ? "text-muted-foreground/60 italic" : "text-muted-foreground")}>
              {quest.description}
            </p>

            {quest.lore && (
              <div className="border-l-2 border-accent/50 bg-accent/5 px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-accent/70 mb-1">Guild Lore</p>
                <p className="text-xs leading-relaxed text-foreground/80 italic">{quest.lore}</p>
              </div>
            )}

            {quest.fitnessMapping && !isLocked && (
              <p className="text-[10px] text-muted-foreground/70">
                <span className="font-mono uppercase text-muted-foreground">Objective:</span> {quest.fitnessMapping}
              </p>
            )}

            <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
              <span className="text-primary">+{quest.xpReward} XP</span>
              <span className="text-yellow-500">+{quest.goldReward} Gold</span>
            </div>

            {/* Abandoned narrative from previous attempt */}
            {quest.abandonedNarrative && (
              <div className="border border-orange-400/30 bg-orange-400/5 px-3 py-2">
                <p className="text-[9px] font-mono uppercase text-orange-400/70 mb-1">Previous Attempt — Abandoned</p>
                <p className="text-xs italic leading-relaxed text-foreground/70">{quest.abandonedNarrative}</p>
              </div>
            )}

            {/* Mission CTA */}
            {quest.status === "active" && !isLocked && quest.dbId !== null && (
              <div className="pt-1">
                {isMissionActive ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border border-cyan-400/30 bg-cyan-400/10 px-3 py-2.5">
                      <Swords className="size-3.5 text-cyan-400 animate-pulse shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] font-mono font-bold text-cyan-400">Mission Active</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          Complete a workout in Training to earn your reward automatically.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAbandonOpen(true)}
                      className="text-[10px] font-mono text-red-400/60 hover:text-red-400 underline transition-colors"
                    >
                      Abandon this mission
                    </button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    className="w-full gap-2"
                    size="sm"
                  >
                    <Play className="size-3.5" />
                    {quest.abandonedNarrative ? "Retry Mission" : "Start Mission"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {confirmOpen && (
        <MissionConfirmDialog
          open={confirmOpen}
          quest={quest}
          onConfirm={handleStartMission}
          onClose={() => setConfirmOpen(false)}
          isPending={startMission.isPending}
        />
      )}

      {abandonOpen && (
        <AbandonConfirmDialog
          open={abandonOpen}
          onConfirm={handleAbandon}
          onClose={() => setAbandonOpen(false)}
          isPending={abandonMission.isPending}
        />
      )}

      {consequence && (
        <AbandonConsequenceDialog
          result={consequence}
          onClose={() => setConsequence(null)}
        />
      )}
    </>
  );
}

function ChapterSection({ chapter, defaultOpen, onRefresh }: {
  chapter: CampaignStoryChapter;
  defaultOpen: boolean;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const completedCount = chapter.quests.filter((q) => q.status === "claimed").length;
  const totalRevealed = chapter.quests.filter((q) => q.status !== "locked").length;
  const isLocked = chapter.status === "locked";

  return (
    <div className={cn("border", isLocked ? "border-border/30" : "border-border/60")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 bg-card/50 px-4 py-3 text-left"
      >
        <div className={cn("flex size-7 shrink-0 items-center justify-center border font-mono text-xs font-bold",
          chapter.status === "completed" ? "border-green-600/40 text-green-400" :
          chapter.status === "active"    ? "border-accent/40 text-accent" :
                                          "border-border/40 text-muted-foreground"
        )}>
          {chapter.status === "completed" ? "✓" : isLocked ? "?" : chapter.chapter}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("font-serif text-sm font-bold", isLocked ? "text-muted-foreground/50" : "text-foreground")}>
            {isLocked ? `Chapter ${chapter.chapter} — ???` : `Ch. ${chapter.chapter}: ${chapter.chapterName}`}
          </p>
          {!isLocked && (
            <p className="text-[10px] text-muted-foreground">{completedCount}/{totalRevealed} completed</p>
          )}
        </div>
        {open ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
      </button>

      {open && (
        <div className="divide-y divide-border/30">
          {chapter.quests.map((quest) => (
            <QuestStoryCard key={quest.campaignId} quest={quest} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignStoryView() {
  const queryClient = useQueryClient();
  const { data: story, isLoading } = useGetCampaignStory({ query: { queryKey: ["/api/campaign/story"] } });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/campaign/story"] });
  };

  if (isLoading) return (
    <div className="space-y-3">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );

  if (!story) return (
    <div className="border border-dashed border-border/50 bg-card/20 py-10 text-center">
      <Flag className="mx-auto mb-3 size-8 text-muted-foreground/40" />
      <p className="font-serif text-sm font-bold">Campaign unavailable</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Position banner */}
      <div className="border border-accent/20 bg-accent/5 px-4 py-3 text-sm">
        <p className="text-[10px] uppercase tracking-widest text-accent/70 mb-1 font-mono">Current Position</p>
        <p className="font-serif font-bold">
          Chapter {story.currentChapter}
          {story.currentQuestTitle && <span className="font-normal text-muted-foreground"> — {story.currentQuestTitle}</span>}
        </p>
      </div>

      {/* Active mission hint */}
      {story.activeMission && (
        <div className="flex items-center gap-2 border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5">
          <Swords className="size-4 text-cyan-400 animate-pulse shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-bold text-cyan-400">Mission in Progress</p>
            <p className="text-[9px] text-muted-foreground truncate">{story.activeMission.title}</p>
          </div>
        </div>
      )}

      {story.chapters.map((chapter) => (
        <ChapterSection
          key={chapter.chapter}
          chapter={chapter}
          defaultOpen={chapter.status === "active"}
          onRefresh={handleRefresh}
        />
      ))}
    </div>
  );
}

export default function Quests() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const { data: quests, isLoading } = useGetQuests();
  const claimReward = useClaimQuestReward();
  const completeTask = useCompleteQuestTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleClaim = (questId: number) => {
    claimReward.mutate(
      { id: questId },
      {
        onSuccess: (data) => {
          toast({
            title: "Reward Claimed!",
            description: `Gained ${data.xpEarned} XP and ${data.goldEarned} Gold.`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/quests"] });
          queryClient.invalidateQueries({ queryKey: ["/api/player"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
        }
      }
    );
  };

  const handleTaskToggle = (questId: number, taskId: number, isCompleted: boolean) => {
    if (isCompleted) return;
    completeTask.mutate(
      { id: questId, data: { taskId, value: null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/quests"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Quest Board" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const filteredQuests = activeTab === "all" ? quests : quests?.filter(q => q.type === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Quest Board" subtitle="Fulfill your destiny" />

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="w-full bg-black/40 border border-border/50 overflow-x-auto flex justify-start rounded-md p-1 h-12">
          <TabsTrigger value="all" className="min-w-fit">All</TabsTrigger>
          <TabsTrigger value="daily" className="min-w-fit">Daily</TabsTrigger>
          <TabsTrigger value="weekly" className="min-w-fit">Weekly</TabsTrigger>
          <TabsTrigger value="main" className="min-w-fit">Campaign</TabsTrigger>
          <TabsTrigger value="side" className="min-w-fit">Side</TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="pt-4">
          <CampaignStoryView />
        </TabsContent>

        {(["all", "daily", "weekly", "side"] as const).map((tab) => {
          const items = tab === "all" ? quests : quests?.filter(q => q.type === tab);
          return (
            <TabsContent key={tab} value={tab} className="space-y-4 pt-4">
              {items?.length === 0 && (
                <div className="text-center py-10 text-muted-foreground border border-border/50 rounded-lg bg-card/20">
                  No quests available in this category.
                </div>
              )}
              {items?.map(quest => (
            <Card key={quest.id} className="border-border/50 bg-card/50 overflow-hidden relative">
              <div className={`absolute top-0 left-0 w-1 h-full ${quest.status === 'completed' ? 'bg-success' : 'bg-accent'}`} />
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Scroll className={`w-4 h-4 ${quest.status === 'completed' ? 'text-success' : 'text-accent'}`} />
                      <span className={`text-[10px] font-mono uppercase border px-1 rounded-sm ${quest.status === 'completed' ? 'text-success border-success/30 bg-success/10' : 'text-accent border-accent/30 bg-accent/10'}`}>
                        {quest.type}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-lg">{quest.title}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-primary">+{quest.xpReward} XP</div>
                    <div className="text-xs font-mono text-gold">+{quest.goldReward} G</div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-4">{quest.description}</p>

                <div className="space-y-2 mb-4">
                  {quest.tasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => handleTaskToggle(quest.id, task.id, task.completed)}
                      disabled={task.completed || completeTask.isPending}
                      className="w-full flex items-center gap-3 text-sm font-mono bg-black/20 p-2 rounded border border-border/30 hover:bg-black/40 transition-colors text-left disabled:cursor-default"
                    >
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${task.completed ? 'bg-success border-success text-success-foreground' : 'border-muted-foreground'}`}>
                        {task.completed && <CheckCircle className="w-3 h-3" />}
                      </div>
                      <span className={task.completed ? "text-muted-foreground line-through flex-1" : "text-foreground flex-1"}>
                        {task.description}
                      </span>
                      {task.targetValue && !task.completed && (
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {task.currentValue || 0}/{task.targetValue}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {quest.status === 'completed' && (
                  <Button
                    onClick={() => handleClaim(quest.id)}
                    className="w-full bg-success hover:bg-success/80 text-success-foreground shadow-[0_0_15px_hsl(var(--success)/0.3)]"
                    disabled={claimReward.isPending}
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Claim Reward
                  </Button>
                )}
                {quest.status === 'claimed' && (
                  <div className="text-center text-xs font-mono text-muted-foreground border border-border/50 py-2 rounded bg-black/20">
                    Reward Claimed
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
