import { useLocation } from "wouter";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  STORY_ARCS,
  STORY_BOSSES,
  getArcForLevel,
  getNextBoss,
  getWorldDanger,
  getDefeatedBosses,
} from "@/hooks/use-story";
import { cn } from "@/lib/utils";
import { Skull, Shield, MapPin, TrendingDown, ChevronRight, Star } from "lucide-react";

const RANK_COLORS: Record<string, string> = {
  D: "text-green-400 border-green-400/30 bg-green-400/10",
  C: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  B: "text-purple-400 border-purple-400/30 bg-purple-400/10",
  A: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  S: "text-red-400 border-red-400/30 bg-red-400/10",
};

const DANGER_COLOR = (d: number) => {
  if (d >= 80) return "bg-red-500";
  if (d >= 60) return "bg-orange-500";
  if (d >= 40) return "bg-yellow-500";
  if (d >= 20) return "bg-blue-500";
  return "bg-green-500";
};

export default function World() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="World of Aethoria" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const level = summary?.player?.level ?? 1;
  const totalXp = summary?.player?.xp ?? 0;
  const currentArc = getArcForLevel(level);
  const nextBoss = getNextBoss(level);
  const worldDanger = getWorldDanger(level);
  const defeatedBosses = getDefeatedBosses(level);

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">
      <PageHeader title="World of Aethoria" subtitle="The fate of this realm rests on your training" />

      {/* World Danger Bar */}
      <Card className="border-red-900/40 bg-gradient-to-br from-red-950/30 to-transparent overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Skull className="w-4 h-4 text-red-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-red-400">World Danger</span>
            </div>
            <span className={cn(
              "text-2xl font-mono font-bold",
              worldDanger >= 80 ? "text-red-400" : worldDanger >= 50 ? "text-orange-400" : worldDanger >= 30 ? "text-yellow-400" : "text-green-400"
            )}>
              {worldDanger}%
            </span>
          </div>
          <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-red-900/30">
            <div
              className={cn("h-full rounded-full transition-all duration-1000", DANGER_COLOR(worldDanger))}
              style={{ width: `${worldDanger}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {worldDanger >= 80
              ? "CRITICAL — Malachar's armies advance unopposed. Train harder."
              : worldDanger >= 60
              ? "HIGH — The front lines are holding, but barely."
              : worldDanger >= 40
              ? "MODERATE — Your growth is being felt. Keep pushing."
              : worldDanger >= 20
              ? "RECEDING — Malachar's forces are in retreat. Nearly there."
              : "MINIMAL — The Demon King's power wanes. Finish this."}
          </p>
        </CardContent>
      </Card>

      {/* Current Location */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary">Current Location</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-serif font-bold text-lg text-foreground">{currentArc.region}</h2>
              <p className={cn("text-xs font-mono mt-0.5", currentArc.color)}>{currentArc.name}</p>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed max-w-xs">{currentArc.lore}</p>
            </div>
            <div className="shrink-0 ml-3 text-right">
              <div className="text-[10px] text-muted-foreground uppercase">Hunter Level</div>
              <div className="text-3xl font-mono font-bold text-primary">{level}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Boss */}
      {nextBoss && (
        <Card className={cn("border overflow-hidden", RANK_COLORS[nextBoss.rank].replace("text-", "border-").split(" ")[0] + "/30")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Skull className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400">Next Boss Encounter</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">Unlocks at Lv {nextBoss.levelRequired}</span>
            </div>
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 text-xl",
                RANK_COLORS[nextBoss.rank]
              )}>
                <Skull className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-serif font-bold text-base text-foreground">{nextBoss.name}</h3>
                  <span className={cn("text-[9px] font-mono border px-1.5 py-0.5 rounded-sm uppercase", RANK_COLORS[nextBoss.rank])}>
                    {nextBoss.rank}-Rank
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground italic mb-2">{nextBoss.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{nextBoss.lore}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {nextBoss.weaknesses.map(w => (
                    <span key={w} className="text-[9px] font-mono border border-primary/30 bg-primary/10 text-primary px-2 py-0.5 rounded-sm">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* XP needed */}
            {level < nextBoss.levelRequired && (
              <div className="mt-4 p-3 rounded-lg bg-black/30 border border-border/30">
                <div className="text-[10px] text-muted-foreground mb-1.5 font-mono uppercase tracking-wider">
                  Power Required: Level {nextBoss.levelRequired} ({nextBoss.levelRequired - level} levels away)
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Complete workouts to earn XP and reach the power needed to challenge this boss. Every session counts.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* World Map — Region Journey */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Journey Through Aethoria</span>
          </div>
          <div className="space-y-0">
            {STORY_ARCS.map((arc, i) => {
              const isCurrentArc = arc.id === currentArc.id;
              const isPast = level > arc.levelRange[1];
              const isFuture = level < arc.levelRange[0];
              const arcBosses = STORY_BOSSES.filter(b => b.arc === arc.id);

              return (
                <div key={arc.id} className="relative">
                  {/* Connector line */}
                  {i < STORY_ARCS.length - 1 && (
                    <div className={cn(
                      "absolute left-[19px] top-[40px] w-0.5 h-8 z-0",
                      isPast ? "bg-primary/40" : "bg-border/30"
                    )} />
                  )}

                  <div className={cn(
                    "relative z-10 flex items-start gap-3 py-3 px-2 rounded-xl transition-all",
                    isCurrentArc ? "bg-primary/5 border border-primary/20" : "border border-transparent"
                  )}>
                    {/* Node */}
                    <div className={cn(
                      "w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 font-mono font-bold text-xs",
                      isPast
                        ? "bg-primary/20 border-primary/60 text-primary"
                        : isCurrentArc
                        ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.5)]"
                        : "bg-black/30 border-border/40 text-muted-foreground/40"
                    )}>
                      {isPast ? "✓" : arc.id + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-bold text-sm",
                          isCurrentArc ? "text-foreground" : isPast ? "text-muted-foreground" : "text-muted-foreground/40"
                        )}>
                          {arc.region}
                        </span>
                        {isCurrentArc && (
                          <span className="text-[9px] font-mono text-primary border border-primary/40 bg-primary/10 px-1.5 py-0.5 rounded">
                            YOU ARE HERE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("text-[10px] font-mono", isCurrentArc ? arc.color : isPast ? "text-muted-foreground/50" : "text-muted-foreground/25")}>
                          {arc.name}
                        </span>
                        <span className="text-[9px] text-muted-foreground/40">· Lv {arc.levelRange[0]}-{arc.levelRange[1] === 999 ? "∞" : arc.levelRange[1]}</span>
                      </div>
                      {/* Boss chips */}
                      {arcBosses.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {arcBosses.map(boss => {
                            const isDefeated = defeatedBosses.some(d => d.id === boss.id);
                            return (
                              <span
                                key={boss.id}
                                className={cn(
                                  "text-[9px] font-mono px-1.5 py-0.5 rounded border",
                                  isDefeated
                                    ? "border-green-800/40 text-green-600 bg-green-900/10"
                                    : isFuture
                                    ? "border-border/20 text-muted-foreground/30"
                                    : RANK_COLORS[boss.rank]
                                )}
                              >
                                {isDefeated && "✓ "}{boss.name} ({boss.rank})
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Story so far */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Story So Far</span>
          </div>
          <div className="space-y-3">
            {STORY_ARCS.filter(a => a.id <= currentArc.id).map(arc => (
              <div key={arc.id} className="border-l-2 border-primary/20 pl-3">
                <p className={cn("text-[10px] font-mono mb-0.5 font-bold", arc.color)}>{arc.name.toUpperCase()}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{arc.lore}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Go to Raids */}
      <button
        onClick={() => navigate("/raids")}
        className="w-full flex items-center gap-3 p-4 rounded-xl border border-red-900/30 bg-red-950/20 hover:border-red-700/40 hover:bg-red-950/30 transition-all"
      >
        <Skull className="w-5 h-5 text-red-400 shrink-0" />
        <div className="text-left flex-1">
          <div className="font-bold text-sm text-foreground">Boss Raids</div>
          <div className="text-xs text-muted-foreground">Challenge active boss encounters</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
