import { useState } from "react";
import { useGetDashboardSummary, useAllocateStats, PlayerStats } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatBar } from "@/components/shared/stat-bar";
import { RankBadge } from "@/components/shared/rank-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Swords, Flame, Target, Shield, Plus, Minus, Globe, Skull, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getArcForLevel, getNextBoss, getWorldDanger } from "@/hooks/use-story";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: summary, isLoading, error } = useGetDashboardSummary();
  const allocateStats = useAllocateStats();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [allocations, setAllocations] = useState<PlayerStats>({
    strength: 0, agility: 0, stamina: 0, vitality: 0, discipline: 0, sense: 0
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Status Window" />
        <Skeleton className="h-64 w-full rounded-xl bg-card border border-border" />
        <Skeleton className="h-32 w-full rounded-xl bg-card border border-border" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
        <Shield className="w-12 h-12 mb-4 opacity-50" />
        <p>Failed to load status window.</p>
      </div>
    );
  }

  const { player, dailyQuest, nutrition, workoutRecommendation } = summary;

  const currentArc = getArcForLevel(player.level);
  const nextBoss = getNextBoss(player.level);
  const worldDanger = getWorldDanger(player.level);
  
  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const remainingPoints = player.freeStatPoints - totalAllocated;

  const handleAllocate = (stat: keyof PlayerStats, amount: number) => {
    if (amount > 0 && remainingPoints <= 0) return;
    if (amount < 0 && allocations[stat] <= 0) return;
    
    setAllocations(prev => ({
      ...prev,
      [stat]: prev[stat] + amount
    }));
  };

  const submitAllocations = () => {
    allocateStats.mutate({ data: { allocations } }, {
      onSuccess: () => {
        toast({ title: "Stats Allocated", description: "You feel your power growing." });
        setAllocations({ strength: 0, agility: 0, stamina: 0, vitality: 0, discipline: 0, sense: 0 });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
        queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <PageHeader title="Status Window" subtitle={player.activeTitle || "The Awakened"} />

      {/* Player Status Card */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardContent className="p-6 relative z-10">
          <div className="flex gap-4 items-start mb-6">
            <RankBadge rank={player.rank} className="w-16 h-16 text-3xl" />
            <div className="flex-1">
              <h2 className="text-xl font-bold font-serif tracking-wider uppercase text-foreground">
                {player.name}
              </h2>
              <p className="text-sm font-mono text-primary mb-2">Level {player.level}</p>
              <StatBar 
                label="XP" 
                value={player.xp} 
                max={player.xpToNextLevel} 
                colorClass="bg-primary shadow-[0_0_8px_hsl(var(--primary))]" 
              />
            </div>
          </div>

          <div className="space-y-4">
            <StatBar 
              label="HP (Recovery)" 
              value={player.hp} 
              max={player.maxHp} 
              colorClass="bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]" 
            />
            <StatBar 
              label="MP (Capacity)" 
              value={player.mp} 
              max={player.maxMp} 
              colorClass="bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" 
            />
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Core Stats</span>
              {player.freeStatPoints > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] border-primary/50 text-primary hover:bg-primary/20">
                      Allocate ({player.freeStatPoints})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border/50 max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-primary">Allocate Stat Points</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="text-center font-mono text-lg mb-4 text-accent">
                        Unallocated: {remainingPoints}
                      </div>
                      {Object.entries(player.stats).map(([stat, baseValue]) => (
                        <div key={stat} className="flex items-center justify-between">
                          <span className="uppercase text-sm font-bold w-24">{stat}</span>
                          <div className="flex items-center gap-3 font-mono">
                            <Button size="icon" variant="outline" className="w-6 h-6" onClick={() => handleAllocate(stat as keyof PlayerStats, -1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-12 text-center text-sm">
                              {baseValue} {allocations[stat as keyof PlayerStats] > 0 && <span className="text-success">+{allocations[stat as keyof PlayerStats]}</span>}
                            </span>
                            <Button size="icon" variant="outline" className="w-6 h-6" onClick={() => handleAllocate(stat as keyof PlayerStats, 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button 
                        className="w-full mt-6" 
                        onClick={submitAllocations}
                        disabled={totalAllocated === 0 || allocateStats.isPending}
                      >
                        Confirm Allocation
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 p-4 bg-black/40 rounded-lg border border-border/50">
              {Object.entries(player.stats).map(([stat, value]) => (
                <div key={stat} className="flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.substring(0,3)}</span>
                  <span className="text-sm font-mono font-bold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* World Status Card */}
      <button
        onClick={() => navigate("/world")}
        className="w-full text-left rounded-xl border border-red-900/40 bg-gradient-to-r from-red-950/30 to-black/20 overflow-hidden hover:border-red-700/50 hover:from-red-950/40 transition-all group"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-red-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-400">Aethoria — World Status</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className={cn("text-xs font-mono font-bold", currentArc.color)}>{currentArc.name}</p>
              <p className="text-[10px] text-muted-foreground">{currentArc.region}</p>
            </div>
            <div className="text-right">
              <p className={cn(
                "text-xl font-mono font-bold",
                worldDanger >= 70 ? "text-red-400" : worldDanger >= 40 ? "text-orange-400" : "text-green-400"
              )}>{worldDanger}%</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">World Danger</p>
            </div>
          </div>
          {/* Danger bar */}
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                worldDanger >= 70 ? "bg-red-500" : worldDanger >= 40 ? "bg-orange-500" : "bg-green-500"
              )}
              style={{ width: `${worldDanger}%` }}
            />
          </div>
          {nextBoss && (
            <div className="mt-2 flex items-center gap-1.5">
              <Skull className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] text-muted-foreground">Next: <span className="text-orange-400 font-bold">{nextBoss.name}</span> at Lv {nextBoss.levelRequired}</span>
            </div>
          )}
        </div>
      </button>

      {/* Daily Quest */}
      {dailyQuest && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-serif flex items-center gap-2 text-accent">
              <Swords className="w-4 h-4" /> Daily Quest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="font-bold text-lg mb-1">{dailyQuest.title}</h3>
            <p className="text-xs text-muted-foreground mb-4">{dailyQuest.description}</p>
            <div className="space-y-2">
              {dailyQuest.tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 text-sm font-mono">
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${task.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                    {task.completed && <span className="text-[10px]">✓</span>}
                  </div>
                  <span className={task.completed ? "text-muted-foreground line-through" : "text-foreground"}>
                    {task.description}
                  </span>
                  {task.targetValue && !task.completed && (
                    <span className="ml-auto text-muted-foreground">
                      {task.currentValue || 0}/{task.targetValue}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Nutrition Mini */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-success">
              <Target className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Nutrition</span>
            </div>
            <div className="text-xl font-mono font-bold">
              {Math.max(0, nutrition.targetCalories - nutrition.totalCalories)}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">Kcal Remaining</div>
            <div className="mt-3">
              <StatBar 
                label="PRO" 
                value={nutrition.totalProtein} 
                max={nutrition.targetProtein} 
                colorClass="bg-success" 
                showValues={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Training Rec */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Flame className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Recommended</span>
            </div>
            <div className="text-sm font-bold leading-tight mb-1">
              {workoutRecommendation?.templateName || "Rest Day"}
            </div>
            <div className="text-[10px] text-muted-foreground line-clamp-2">
              {workoutRecommendation?.reason || "Recover your HP for the next battle."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
