import { useState } from "react";
import {
  useGetBossRaids,
  useGetAvailableBossRaids,
  useStartBossRaid,
  useUpdateBossRaidTask,
  useClaimBossRaidReward,
  BossRaid,
  RaidTemplate,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Swords, Clock, Gift, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatGuildGrade } from "@/lib/ranks";

const DIFFICULTY_COLORS: Record<string, string> = {
  E: "text-gray-400 border-gray-400/30 bg-gray-400/10",
  D: "text-green-400 border-green-400/30 bg-green-400/10",
  C: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  B: "text-purple-400 border-purple-400/30 bg-purple-400/10",
  A: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  S: "text-red-400 border-red-400/30 bg-red-400/10",
};

const DIFFICULTY_GLOWS: Record<string, string> = {
  E: "",
  D: "shadow-[0_0_20px_rgba(34,197,94,0.1)]",
  C: "shadow-[0_0_20px_rgba(59,130,246,0.1)]",
  B: "shadow-[0_0_20px_rgba(168,85,247,0.15)]",
  A: "shadow-[0_0_20px_rgba(249,115,22,0.15)]",
  S: "shadow-[0_0_25px_rgba(239,68,68,0.2)]",
};

function formatTimeRemaining(hours: number): string {
  if (hours <= 0) return "EXPIRED";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d ${Math.round(hours % 24)}h`;
}

function raidStateCopy(raid: BossRaid) {
  if (raid.status === "failed") {
    return {
      label: "Forced Retreat",
      tone: "border-red-400/30 bg-red-400/10 text-red-200",
      title: "The boss forced a retreat.",
      text: "Your earned training remains. The Chronicle remembers the loss, world pressure rises, and the Guild expects recovery before the rematch.",
    };
  }
  if (raid.status === "completed") {
    return {
      label: "Boss Forced Back",
      tone: "border-green-400/30 bg-green-400/10 text-green-200",
      title: "The opening is won.",
      text: "The threat has been driven to its knees. Claim the reward to seal the victory, lower pressure, and close this raid ledger.",
    };
  }
  if (raid.status === "claimed") {
    return {
      label: "Victory Sealed",
      tone: "border-yellow-400/30 bg-yellow-400/10 text-yellow-100",
      title: "Aethoria remembers the victory.",
      text: "The Guild's scouts report eased pressure. Your real effort became a recorded win in the wider war.",
    };
  }
  return {
    label: "Guild Directive",
    tone: "border-primary/30 bg-primary/10 text-foreground",
    title: "The Guild is holding the line.",
    text: "Other adventurers are engaged elsewhere. Your qualifying training sessions press directly against this boss.",
  };
}

function BossInteractionPanel({ interaction }: { interaction: any }) {
  if (!interaction) return null;
  return (
    <div className="rounded border border-[#6b4d2f] bg-[#0c0b09] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#9d8f80]">Boss phase</p>
          <p className="font-serif text-sm font-bold text-[#d9ad63]">{interaction.phase ?? "Threat Revealed"}</p>
        </div>
        <span className="border border-[#3b3328] bg-black/30 px-2 py-1 text-[10px] font-mono uppercase text-[#d8c4a5]">
          {interaction.progressPercent ?? 0}%
        </span>
      </div>
      <div className="grid gap-2 text-[10px] md:grid-cols-3">
        <div className="border border-[#2a2520] bg-black/20 p-2">
          <p className="font-mono uppercase tracking-wider text-[#8f887d]">Pressure</p>
          <p className="mt-1 capitalize text-[#d8c4a5]">{String(interaction.dangerPressure ?? "contained").replace(/_/g, " ")}</p>
        </div>
        <div className="border border-[#2a2520] bg-black/20 p-2">
          <p className="font-mono uppercase tracking-wider text-[#8f887d]">Best answer</p>
          <p className="mt-1 capitalize text-[#49a3a0]">{String(interaction.leadStyle ?? "training").replace(/_/g, " ")}</p>
        </div>
        <div className="border border-[#2a2520] bg-black/20 p-2">
          <p className="font-mono uppercase tracking-wider text-[#8f887d]">Ledger</p>
          <p className="mt-1 text-[#d8c4a5]">{interaction.completedTasks ?? 0}/{interaction.totalTasks ?? 0} seals</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-[#cfc5b8]">{interaction.strategy}</p>
      <p className="mt-2 border-l border-[#49a3a0] pl-2 text-[10px] leading-relaxed text-[#9dbdb8]">{interaction.allyLine}</p>
      <p className="mt-2 text-[10px] leading-relaxed text-[#8f887d]">{interaction.nextAction}</p>
    </div>
  );
}

function availableRaidCopy(template: RaidTemplate) {
  if (template.alreadyCompleted && template.isRepeatable) {
    return {
      label: "Rematch Available",
      text: "The Gate has not forgotten you. This repeat run sharpens the same pattern without pretending the first victory never happened.",
    };
  }
  return {
    label: "Campaign Directive",
    text: "This is not ordinary checklist work. Accepting it opens a raid ledger; training remains your weapon, and recovery remains a valid tactical choice.",
  };
}

function ActiveRaidCard({ raid }: { raid: BossRaid }) {
  const [expanded, setExpanded] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateTask = useUpdateBossRaidTask();
  const claimRaid = useClaimBossRaidReward();

  const completedTasks = raid.tasks.filter(t => t.completed).length;
  const totalTasks = raid.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleTaskUpdate = (taskId: string, currentCompleted: boolean) => {
    if (currentCompleted) return;
    updateTask.mutate(
      { id: raid.id, data: { taskId, completed: true } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/boss-raids"] }),
      }
    );
  };

  const handleClaim = () => {
    claimRaid.mutate(
      { id: raid.id },
      {
        onSuccess: (data) => {
          const gearLine = (data as any).gearDrop
            ? ` · Loot: ${(data as any).gearDrop.name}`
            : "";
          toast({
            title: data.rankedUp ? `Guild Grade Raised! Now ${formatGuildGrade(data.newRank)}!` : "Raid Conquered!",
            description: `+${data.xpEarned} XP, +${data.goldEarned} Gold${data.titleGranted ? `, Title: ${(data.titleGranted as any).name}` : ""}${gearLine}`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/boss-raids"] });
          queryClient.invalidateQueries({ queryKey: ["/api/player"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
          queryClient.invalidateQueries({ queryKey: ["/api/armory"] });
        },
      }
    );
  };

  const isExpired = raid.isExpired;
  const isClaimed = raid.status === "claimed";
  const isCompleted = raid.status === "completed";
  const isFailed = raid.status === "failed";
  const stateCopy = raidStateCopy(raid);
  const bossInteraction = (raid as any).bossInteraction;

  return (
    <Card className={cn(
      "border bg-card/50 overflow-hidden relative",
      isExpired || isFailed ? "border-red-500/30 opacity-60" :
      isCompleted ? "border-green-500/40" :
      isClaimed ? "border-muted-foreground/20" :
      "border-primary/20",
      DIFFICULTY_GLOWS[raid.difficulty]
    )}>
      <div className={cn("absolute top-0 left-0 w-1 h-full", 
        isFailed ? "bg-red-500" : isCompleted ? "bg-green-500" : isClaimed ? "bg-muted-foreground" : "bg-primary"
      )} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-[10px] font-mono uppercase border px-1.5 py-0.5 rounded-sm font-bold", DIFFICULTY_COLORS[raid.difficulty])}>
                {formatGuildGrade(raid.difficulty)}
              </span>
              {isFailed && (
                <span className="text-[10px] font-mono uppercase border px-1.5 py-0.5 rounded-sm text-red-400 border-red-400/30 bg-red-400/10">
                  FAILED
                </span>
              )}
              {isExpired && !isFailed && (
                <span className="text-[10px] font-mono text-red-400 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> EXPIRED
                </span>
              )}
              {raid.timeRemainingHours !== null && !isFailed && !isCompleted && !isClaimed && (
                <span className={cn(
                  "text-[10px] font-mono flex items-center gap-1",
                  (raid.timeRemainingHours ?? 0) < 12 ? "text-red-400" : "text-muted-foreground"
                )}>
                  <Clock className="w-3 h-3" />
                  {formatTimeRemaining(raid.timeRemainingHours ?? 0)}
                </span>
              )}
            </div>
            <h3 className="font-serif font-bold text-base">{raid.title}</h3>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground ml-2">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Progress</span>
            <span className="font-mono">{completedTasks}/{totalTasks}</span>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", isCompleted ? "bg-green-500" : "bg-primary")}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {expanded && (
          <div className="space-y-1 mb-3">
            <div className={cn("rounded border p-3", stateCopy.tone)}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[9px] font-mono uppercase tracking-widest">{stateCopy.label}</span>
                <span className="text-[9px] font-mono uppercase">{formatGuildGrade(raid.difficulty)}</span>
              </div>
              <p className="font-serif text-sm font-bold">{stateCopy.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed opacity-85">{stateCopy.text}</p>
            </div>
            <BossInteractionPanel interaction={bossInteraction} />
            {raid.lore && (
              <p className="text-[11px] text-muted-foreground italic mb-2 border-l-2 border-primary/20 pl-2">{raid.lore}</p>
            )}
            {raid.tasks.map((task) => {
              const isManual = (task as any).taskType === "manual" || !(task as any).taskType;
              const pct = task.targetValue ? Math.min(100, ((task.currentValue ?? 0) / task.targetValue) * 100) : (task.completed ? 100 : 0);
              return (
                <div
                  key={task.id}
                  className={cn(
                    "w-full text-xs font-mono bg-black/20 p-2 rounded border border-border/30 text-left",
                    isManual && !task.completed && !isExpired && !isFailed && !isClaimed && "cursor-pointer hover:bg-black/40 transition-colors"
                  )}
                  onClick={isManual && !task.completed && !isExpired && !isFailed && !isClaimed
                    ? () => handleTaskUpdate(task.id, task.completed) : undefined}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isManual ? (
                      <div className={cn("w-4 h-4 rounded-sm border flex items-center justify-center shrink-0",
                        task.completed ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground"
                      )}>
                        {task.completed && <CheckCircle className="w-3 h-3" />}
                      </div>
                    ) : (
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[8px]",
                        task.completed ? "bg-green-500 border-green-500 text-white" : "border-primary/50 text-primary"
                      )}>
                        {task.completed ? <CheckCircle className="w-3 h-3" /> : "⚡"}
                      </div>
                    )}
                    <span className={cn("flex-1", task.completed && "line-through text-muted-foreground")}>
                      {task.description}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {task.currentValue ?? 0}/{task.targetValue ?? "?"} {task.unit}
                    </span>
                  </div>
                  {!isManual && task.targetValue && (
                    <div className="h-1 bg-black/40 rounded-full overflow-hidden ml-6">
                      <div
                        className={cn("h-full rounded-full transition-all", task.completed ? "bg-green-500" : "bg-primary")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {!isManual && !task.completed && (
                    <p className="text-[9px] text-primary/60 ml-6 mt-0.5">Auto-tracked</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span className="text-primary">+{raid.xpReward} XP</span>
          <span className="text-yellow-400">+{raid.goldReward} G</span>
          {raid.titleReward && <span className="text-purple-400 text-[10px]">Title: {raid.titleReward}</span>}
        </div>

        {isCompleted && !isClaimed && (
          <Button
            className="w-full mt-3 bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            onClick={handleClaim}
            disabled={claimRaid.isPending}
          >
            <Gift className="w-4 h-4 mr-2" />
            Claim Raid Reward
          </Button>
        )}
        {isClaimed && (
          <div className="mt-3 text-center text-xs font-mono text-muted-foreground border border-border/30 py-2 rounded bg-black/20">
            Reward Claimed ✓
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AvailableRaidCard({ template, onStart }: { template: RaidTemplate; onStart: (title: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const directive = availableRaidCopy(template);
  const bossInteraction = (template as any).bossInteraction;

  return (
    <Card className={cn("border bg-card/50 overflow-hidden relative", DIFFICULTY_GLOWS[template.difficulty])}>
      <div className={cn("absolute top-0 left-0 w-1 h-full bg-gradient-to-b",
        template.difficulty === "S" ? "from-red-500 to-orange-500" :
        template.difficulty === "A" ? "from-orange-500 to-yellow-500" :
        template.difficulty === "B" ? "from-purple-500 to-blue-500" :
        template.difficulty === "C" ? "from-blue-500 to-cyan-500" :
        template.difficulty === "D" ? "from-green-500 to-emerald-500" : "from-gray-400 to-gray-600"
      )} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-[10px] font-mono uppercase border px-1.5 py-0.5 rounded-sm font-bold", DIFFICULTY_COLORS[template.difficulty])}>
                {formatGuildGrade(template.difficulty)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3 inline mr-0.5" />{template.timeLimitHours}h limit
              </span>
            </div>
            <h3 className="font-serif font-bold text-base">{template.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground ml-2">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {expanded && (
          <div className="mb-3">
            <div className="mb-3 rounded border border-[#6b4d2f] bg-[#11100e] p-3">
              <p className="text-[9px] font-mono uppercase tracking-widest text-[#d9ad63]">{directive.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{directive.text}</p>
            </div>
            <BossInteractionPanel interaction={bossInteraction} />
            {template.lore && (
              <p className="text-[11px] text-muted-foreground italic mb-2 border-l-2 border-primary/20 pl-2">{template.lore}</p>
            )}
            <div className="space-y-1">
              {template.tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-black/20 p-1.5 rounded">
                  <div className="w-3 h-3 rounded-sm border border-muted-foreground/40 shrink-0" />
                  {task.description}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-3">
          <span className="text-primary">+{template.xpReward} XP</span>
          <span className="text-yellow-400">+{template.goldReward} G</span>
          {template.titleReward && <span className="text-purple-400 text-[10px]">Title: {template.titleReward}</span>}
        </div>

        <Button
          className="w-full"
          size="sm"
          onClick={() => onStart(template.title)}
        >
          <Swords className="w-3 h-3 mr-1" />
          Begin Raid
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Raids() {
  const { data: raids, isLoading: raidsLoading } = useGetBossRaids();
  const { data: available, isLoading: availableLoading } = useGetAvailableBossRaids();
  const startRaid = useStartBossRaid();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStart = (templateTitle: string) => {
    startRaid.mutate(
      { data: { templateTitle } },
      {
        onSuccess: (raid) => {
          toast({
            title: "Raid Started!",
            description: `"${raid.title}" — complete before time runs out.`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/boss-raids"] });
          queryClient.invalidateQueries({ queryKey: ["/api/boss-raids/available"] });
        },
        onError: () => {
          toast({ title: "Cannot Start Raid", description: "You may not meet the requirements yet.", variant: "destructive" });
        },
      }
    );
  };

  const activeRaids = raids?.filter(r => r.status === "active" || r.status === "completed") ?? [];
  const historyRaids = raids?.filter(r => r.status === "claimed" || r.status === "failed") ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Boss Raids" subtitle="High-stakes challenges, legendary rewards" />

      <Tabs defaultValue="active">
        <TabsList className="w-full bg-black/40 border border-border/50 rounded-md p-1 h-12">
          <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
          <TabsTrigger value="available" className="flex-1">Available</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 pt-4">
          {raidsLoading ? (
            <><Skeleton className="h-32 w-full rounded-xl" /><Skeleton className="h-32 w-full rounded-xl" /></>
          ) : activeRaids.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/30 rounded-xl">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground text-sm">No active raids.</p>
              <p className="text-xs text-muted-foreground mt-1">Check the Available tab to start one.</p>
            </div>
          ) : (
            activeRaids.map(raid => <ActiveRaidCard key={raid.id} raid={raid} />)
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-4 pt-4">
          {availableLoading ? (
            <><Skeleton className="h-32 w-full rounded-xl" /><Skeleton className="h-32 w-full rounded-xl" /></>
          ) : !available || available.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/30 rounded-xl">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground text-sm">No raids available yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Build streaks and raise your Guild Grade to unlock raids.</p>
            </div>
          ) : (
            available.map((template, i) => (
              <AvailableRaidCard key={i} template={template} onStart={handleStart} />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-4">
          {historyRaids.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/30 rounded-xl text-muted-foreground">
              <p className="text-sm">No raid history yet.</p>
            </div>
          ) : (
            historyRaids.map(raid => <ActiveRaidCard key={raid.id} raid={raid} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
