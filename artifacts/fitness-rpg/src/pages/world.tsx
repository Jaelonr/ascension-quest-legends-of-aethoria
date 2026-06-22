import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardSummary,
  useChangeClass,
  useRespecPlayer,
  useGetPlayerStyleIdentity,
  getGetDashboardSummaryQueryKey,
  getGetPlayerQueryKey,
} from "@workspace/api-client-react";
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
import {
  BASE_CLASSES,
  getStoredBaseClass,
  storeBaseClass,
  getCurrentEvolution,
  type BaseClassId,
} from "@/hooks/use-class";
import { cn } from "@/lib/utils";
import { formatGuildGrade } from "@/lib/ranks";
import {
  Skull,
  Shield,
  MapPin,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  Star,
  Swords,
  RotateCcw,
  AlertTriangle,
  Check,
  X,
  BookOpen,
} from "lucide-react";

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

const STYLE_META: Record<string, { label: string; color: string; border: string; bg: string; glow: string }> = {
  strength:     { label: "Strength",     color: "text-red-400",    border: "border-red-400/30",    bg: "bg-red-400/8",    glow: "shadow-[0_0_20px_rgba(239,68,68,0.12)]" },
  striking:     { label: "Striking",     color: "text-orange-400", border: "border-orange-400/30", bg: "bg-orange-400/8", glow: "shadow-[0_0_20px_rgba(249,115,22,0.12)]" },
  conditioning: { label: "Conditioning", color: "text-cyan-400",   border: "border-cyan-400/30",   bg: "bg-cyan-400/8",   glow: "shadow-[0_0_20px_rgba(6,182,212,0.12)]" },
  grappling:    { label: "Grappling",    color: "text-purple-400", border: "border-purple-400/30", bg: "bg-purple-400/8", glow: "shadow-[0_0_20px_rgba(168,85,247,0.12)]" },
  recovery:     { label: "Recovery",     color: "text-green-400",  border: "border-green-400/30",  bg: "bg-green-400/8",  glow: "shadow-[0_0_20px_rgba(34,197,94,0.12)]" },
  discipline:   { label: "Discipline",   color: "text-yellow-400", border: "border-yellow-400/30", bg: "bg-yellow-400/8", glow: "shadow-[0_0_20px_rgba(234,179,8,0.12)]" },
};

const STYLE_NARRATIVE: Record<string, string> = {
  strength:     "The dungeon network has registered your output. Gate commanders file unusual reports — an adventurer whose raw force exceeds standard containment projections. You do not fight clever. You fight until nothing is left standing.",
  striking:     "Strike-pattern analysts have flagged your adventurer file. Your combination efficiency and tempo control have become topics in underground circles. Enemies adapt their guard stances when your name is mentioned.",
  conditioning: "Stamina reports from cleared Gates are consistent: the enemy runs out before you do. Long-duration encounters are your natural environment. The System logs your conditioning output as a strategic anomaly.",
  grappling:    "Control-based engagement reports are piling up. Multiple Silver Grade threats neutralized through positional dominance alone, zero critical strikes registered. The Guild is watching you carefully.",
  recovery:     "Strategic longevity metrics place you in the top percentile. Sustained readiness across consecutive days suggests a disciplined maintenance protocol unlike standard adventurers. The System marks you as a long-term force.",
  discipline:   "Your nutritional consistency has been flagged as a contributing factor to aura stability. Discipline scores are an outlier — most adventurers burn bright then fade. You maintain a controlled flame the darkness cannot extinguish.",
};

const HYBRID_NARRATIVE: Record<string, string> = {
  "Warbreaker":       "Two power streams collide inside you — the force of raw strength and the precision of a striking artist. Reports from cleared Gates describe an enemy that could not decide whether to armor against blunt force or striking speed. It tried both. It survived neither.",
  "Vanguard":         "Heavy output meets relentless conditioning. Gate commanders cannot plan for an adventurer who generates peak force at minute forty. The System's tactical engine has flagged your profile: a frontline force that hits hard and outlasts attrition.",
  "Duelist":          "Striking precision fused with conditioning endurance. Enemies fall not from single decisive blows but from the accumulated weight of your relentless tempo. Technical execution that doesn't degrade — a rare and dangerous combination.",
  "Titan Controller": "Grappling dominance reinforced by raw strength. Your ability to close distance and impose physical control has nullified threats that defeated entire adventurer teams. The floor is your domain. The System notes: no recorded escapes from your control.",
  "Iron Monk":        "Discipline and recovery fused into one principle: the prepared mind cannot be broken. You are the adventurer who never enters a Gate unprepared — and the darkness knows it. Your aura is clean, your resolve is absolute.",
  "Wind Guardian":    "Endurance extended by recovery mastery. An adventurer who outlasts sieges, replenishes, and returns. An enemy who defeats you has only created a problem for itself tomorrow. The System logs you as a persistent, escalating threat.",
  "Adventurer":       "No single path has claimed you. The System logs your pattern as ADVENTURER — a summoned fighter who does not specialize but explores. The world of Aethoria has seen Warriors and Strikers, but balanced adventurers are rarer, and harder to predict.",
};

export default function World() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: identity } = useGetPlayerStyleIdentity({
    query: { queryKey: ["/api/player/style-identity"] },
  });
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [crossroadsExpanded, setCrossroadsExpanded] = useState(false);
  const [classChangeOpen, setClassChangeOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<BaseClassId | null>(null);
  const [respecOpen, setRespecOpen] = useState(false);
  const [respecMethod, setRespecMethod] = useState<"gold" | "scroll" | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const currentClass = getStoredBaseClass();

  const changeClassMut = useChangeClass({
    mutation: {
      onSuccess: () => {
        if (selectedClass) {
          storeBaseClass(selectedClass);
          setActionMsg({ text: `Class changed to ${BASE_CLASSES.find(c => c.id === selectedClass)?.name}!`, ok: true });
        }
        setClassChangeOpen(false);
        setSelectedClass(null);
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetPlayerQueryKey() });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to change class";
        setActionMsg({ text: msg, ok: false });
        setSelectedClass(null);
      },
    },
  });

  const respecMut = useRespecPlayer({
    mutation: {
      onSuccess: (data) => {
        const pts = data?.pointsReturned ?? 0;
        setActionMsg({ text: `Respec complete! ${pts} stat point${pts !== 1 ? "s" : ""} returned as free points.`, ok: true });
        setRespecOpen(false);
        setRespecMethod(null);
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetPlayerQueryKey() });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to respec";
        setActionMsg({ text: msg, ok: false });
        setRespecMethod(null);
      },
    },
  });

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
  const gold = summary?.player?.gold ?? 0;
  const currentArc = getArcForLevel(level);
  const nextBoss = getNextBoss(level);
  const worldDanger = getWorldDanger(level);
  const defeatedBosses = getDefeatedBosses(level);

  const currentClassData = currentClass ? BASE_CLASSES.find(c => c.id === currentClass) : null;
  const currentEvo = currentClass ? getCurrentEvolution(currentClass, level) : null;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">
      <PageHeader title="World of Aethoria" subtitle="The fate of this realm rests on your training" />

      {/* Action message toast */}
      {actionMsg && (
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium animate-in fade-in duration-300",
            actionMsg.ok
              ? "bg-green-950/40 border-green-700/40 text-green-300"
              : "bg-red-950/40 border-red-700/40 text-red-300"
          )}
        >
          {actionMsg.ok ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)}><X className="w-4 h-4 opacity-60" /></button>
        </div>
      )}

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

      {/* Adventurer's Mark — Narrative Consequence */}
      {identity && (identity.totalSessions ?? 0) > 0 && (() => {
        const dom = identity.dominantStyle as string | null | undefined;
        const hybrid = identity.hybridArchetype as string | null | undefined;
        const m = dom ? STYLE_META[dom] : undefined;
        const styleNarrative = dom ? STYLE_NARRATIVE[dom] : undefined;
        const hybridNarrative = hybrid ? HYBRID_NARRATIVE[hybrid] : undefined;
        const pcts = identity.percentages as Record<string, number> | undefined;

        if (!m || !styleNarrative) return null;
        return (
          <Card className={cn("border overflow-hidden", m.border, m.bg, m.glow)}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">
                    Adventurer's Mark · {identity.totalSessions} Sessions
                  </div>
                  <div className={cn("text-lg font-black font-serif tracking-wide", m.color)}>
                    {m.label} Fighter
                  </div>
                  {hybrid && (
                    <div className={cn("text-[10px] font-mono mt-1 border px-2 py-0.5 rounded-full w-fit", m.border, m.color, m.bg)}>
                      ◆ {hybrid}
                    </div>
                  )}
                </div>
                <div className={cn(
                  "w-11 h-11 rounded-full border-2 flex items-center justify-center shrink-0",
                  m.border, m.bg, m.glow
                )}>
                  <Swords className={cn("w-5 h-5", m.color)} />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                {hybridNarrative ?? styleNarrative}
              </p>

              {pcts && (
                <div className="space-y-1.5 pt-1 border-t border-white/8">
                  {(["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const).map(s => {
                    const sm = STYLE_META[s];
                    const pct = pcts[s] ?? 0;
                    if (!sm || pct === 0) return null;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <span className={cn("text-[9px] font-mono w-20 shrink-0", sm.color)}>{sm.label}</span>
                        <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-1000", sm.color.replace("text-", "bg-"))}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground w-7 text-right shrink-0">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

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
              <div className="text-[10px] text-muted-foreground uppercase">Adventurer Level</div>
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
                    {formatGuildGrade(nextBoss.rank)}
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
              const isCrossroads = arc.id === 0;

              return (
                <div key={arc.id} className="relative">
                  {i < STORY_ARCS.length - 1 && (
                    <div className={cn(
                      "absolute left-[19px] top-[40px] w-0.5 h-8 z-0",
                      isPast ? "bg-primary/40" : "bg-border/30"
                    )} />
                  )}

                  <div
                    className={cn(
                      "relative z-10 flex items-start gap-3 py-3 px-2 rounded-xl transition-all",
                      isCurrentArc ? "bg-primary/5 border border-primary/20" : "border border-transparent",
                      isCrossroads && "cursor-pointer hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98]"
                    )}
                    onClick={isCrossroads ? () => setCrossroadsExpanded(v => !v) : undefined}
                  >
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
                        {isCrossroads && (
                          <span className="ml-auto flex items-center gap-1 text-[9px] font-mono text-muted-foreground/60">
                            <BookOpen className="w-3 h-3" />
                            {crossroadsExpanded ? "HIDE" : "LORE"}
                            <ChevronDown className={cn("w-3 h-3 transition-transform", crossroadsExpanded && "rotate-180")} />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("text-[10px] font-mono", isCurrentArc ? arc.color : isPast ? "text-muted-foreground/50" : "text-muted-foreground/25")}>
                          {arc.name}
                        </span>
                        <span className="text-[9px] text-muted-foreground/40">· Lv {arc.levelRange[0]}-{arc.levelRange[1] === 999 ? "∞" : arc.levelRange[1]}</span>
                      </div>
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
                                {isDefeated && "✓ "}{boss.name} ({formatGuildGrade(boss.rank)})
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Crossroads expandable lore */}
                  {isCrossroads && crossroadsExpanded && (
                    <div className="mx-2 mb-2 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15 animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-2">Arc I — The Crossroads</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        You arrived at the Crossroads with nothing but potential. The System marked you as an adventurer — one of the few chosen 
                        to fight back against the creeping darkness threatening Aethoria. Here, at the junction of all paths, you made your 
                        first choice: your class. Every rep, every set, every bead of sweat since that moment has carved your name into the 
                        world's story. The Crossroads remembers who you were. The journey ahead will define who you become.
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 font-mono mt-3 italic">
                        "Power is not given. It is taken — one session at a time." — The System
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Adventurer Advancement */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Swords className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Adventurer Advancement</span>
          </div>

          {/* Current class info */}
          {currentClassData && currentEvo && (
            <div className={cn("p-3 rounded-lg border mb-4", currentClassData.border, currentClassData.bg)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-xs font-mono uppercase tracking-wider", currentClassData.color)}>{currentEvo.awakening}</p>
                  <p className="font-bold text-base text-foreground">{currentEvo.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{currentClassData.lore}</p>
                </div>
                <div className={cn("text-[9px] font-mono border px-2 py-1 rounded shrink-0 ml-3", currentClassData.border, currentClassData.color)}>
                  ACTIVE
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Change Class Button */}
            <button
              onClick={() => { setClassChangeOpen(v => !v); setRespecOpen(false); }}
              className={cn(
                "flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left",
                classChangeOpen
                  ? "bg-primary/10 border-primary/40"
                  : "border-border/40 bg-black/20 hover:border-primary/30 hover:bg-primary/5"
              )}
            >
              <div className="flex items-center gap-1.5 w-full">
                <Swords className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground">Change Class</span>
                <ChevronDown className={cn("w-3 h-3 text-muted-foreground ml-auto transition-transform", classChangeOpen && "rotate-180")} />
              </div>
              <span className="text-[10px] text-yellow-400 font-mono">5,000 ◈</span>
            </button>

            {/* Respec Button */}
            <button
              onClick={() => { setRespecOpen(v => !v); setClassChangeOpen(false); }}
              className={cn(
                "flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left",
                respecOpen
                  ? "bg-blue-950/30 border-blue-700/40"
                  : "border-border/40 bg-black/20 hover:border-blue-700/30 hover:bg-blue-950/10"
              )}
            >
              <div className="flex items-center gap-1.5 w-full">
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-bold text-foreground">Respec Stats</span>
                <ChevronDown className={cn("w-3 h-3 text-muted-foreground ml-auto transition-transform", respecOpen && "rotate-180")} />
              </div>
              <span className="text-[10px] text-yellow-400 font-mono">2,500 ◈ / Scroll</span>
            </button>
          </div>

          {/* Class Change Panel */}
          {classChangeOpen && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-[10px] text-muted-foreground font-mono mb-3 uppercase tracking-wider">Select New Class — 5,000 Gold</p>
              <div className="space-y-2">
                {BASE_CLASSES.map(cls => {
                  const isCurrent = cls.id === currentClass;
                  const isSelected = cls.id === selectedClass;
                  return (
                    <div
                      key={cls.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                        isCurrent && "opacity-50 cursor-not-allowed",
                        !isCurrent && isSelected && "border-primary/60 bg-primary/10",
                        !isCurrent && !isSelected && "border-border/30 bg-black/20 hover:border-border/60 hover:bg-black/30"
                      )}
                      onClick={() => !isCurrent && setSelectedClass(isSelected ? null : cls.id)}
                    >
                      <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center shrink-0", cls.border, cls.bg)}>
                        <Swords className={cn("w-4 h-4", cls.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-bold", cls.color)}>{cls.name}</span>
                          {isCurrent && <span className="text-[9px] font-mono text-muted-foreground border border-border/40 px-1.5 py-0.5 rounded">CURRENT</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{cls.lore}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {selectedClass && (
                <div className="mt-3 p-3 rounded-xl bg-orange-950/30 border border-orange-700/30 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-orange-300">Confirm Class Change</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Spend <span className="text-yellow-400 font-mono">5,000 gold</span> to become a{" "}
                        <span className={BASE_CLASSES.find(c => c.id === selectedClass)?.color}>
                          {BASE_CLASSES.find(c => c.id === selectedClass)?.name}
                        </span>. Your stats and progression are preserved. You have{" "}
                        <span className="text-yellow-400 font-mono">{gold.toLocaleString()} gold</span>.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => changeClassMut.mutate()}
                      disabled={changeClassMut.isPending || gold < 5000}
                      className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    >
                      {changeClassMut.isPending ? "Processing..." : gold < 5000 ? "Not enough gold" : "Confirm (5,000g)"}
                    </button>
                    <button
                      onClick={() => setSelectedClass(null)}
                      className="px-3 py-2 rounded-lg border border-border/40 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Respec Panel */}
          {respecOpen && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-[10px] text-muted-foreground font-mono mb-2 uppercase tracking-wider">Reset Stat Allocation</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                All stat points you've invested above the base value (5 per stat) will be returned as free points to reallocate however you choose.
              </p>

              {!respecMethod ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRespecMethod("gold")}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-yellow-800/30 bg-yellow-950/20 hover:border-yellow-700/40 hover:bg-yellow-950/30 transition-all"
                  >
                    <span className="text-sm font-mono font-bold text-yellow-400">2,500 ◈</span>
                    <span className="text-[10px] text-muted-foreground">Pay Gold</span>
                  </button>
                  <button
                    onClick={() => setRespecMethod("scroll")}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-blue-800/30 bg-blue-950/20 hover:border-blue-700/40 hover:bg-blue-950/30 transition-all"
                  >
                    <RotateCcw className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] text-muted-foreground">Use Respec Scroll</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-700/30 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-blue-300">Confirm Respec</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {respecMethod === "gold"
                          ? <>Spend <span className="text-yellow-400 font-mono">2,500 gold</span> to reset your stat allocation. You have <span className="text-yellow-400 font-mono">{gold.toLocaleString()} gold</span>.</>
                          : <>Consume a <span className="text-blue-300 font-bold">Respec Scroll</span> from your inventory.</>
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respecMut.mutate({ data: { method: respecMethod } })}
                      disabled={respecMut.isPending || (respecMethod === "gold" && gold < 2500)}
                      className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
                    >
                      {respecMut.isPending
                        ? "Processing..."
                        : respecMethod === "gold" && gold < 2500
                        ? "Not enough gold"
                        : "Confirm Respec"}
                    </button>
                    <button
                      onClick={() => setRespecMethod(null)}
                      className="px-3 py-2 rounded-lg border border-border/40 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
