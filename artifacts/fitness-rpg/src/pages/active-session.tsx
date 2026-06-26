import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetWorkoutSession,
  useLogSet,
  useUpdateWorkoutSession,
  WorkoutSetInputWeightUnit,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sword, CheckCircle2, Timer, Trophy, Star, Zap, Coins,
  ChevronDown, ChevronUp, Plus, X, Flame
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSoundEngine } from "@/hooks/use-sound-engine";
import { useCountUp } from "@/hooks/use-count-up";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const STYLE_COLORS: Record<string, { text: string; border: string; bg: string; glow: string; label: string }> = {
  strength:     { text: "text-red-400",    border: "border-red-400/40",    bg: "bg-red-400/10",    glow: "shadow-[0_0_24px_rgba(239,68,68,0.25)]",   label: "Iron Vanguard" },
  striking:     { text: "text-orange-400", border: "border-orange-400/40", bg: "bg-orange-400/10", glow: "shadow-[0_0_24px_rgba(249,115,22,0.25)]",  label: "Storm Duelist" },
  conditioning: { text: "text-cyan-400",   border: "border-cyan-400/40",   bg: "bg-cyan-400/10",   glow: "shadow-[0_0_24px_rgba(6,182,212,0.25)]",   label: "Wayfarer" },
  grappling:    { text: "text-purple-400", border: "border-purple-400/40", bg: "bg-purple-400/10", glow: "shadow-[0_0_24px_rgba(168,85,247,0.25)]",  label: "Chainwarden" },
  recovery:     { text: "text-green-400",  border: "border-green-400/40",  bg: "bg-green-400/10",  glow: "shadow-[0_0_24px_rgba(34,197,94,0.25)]",   label: "Verdant Guardian" },
  discipline:   { text: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-400/10", glow: "shadow-[0_0_24px_rgba(234,179,8,0.25)]",   label: "Runesage" },
};

const VERDICT_META: Record<string, { color: string; icon: string }> = {
  "Victory":           { color: "text-yellow-400", icon: "VICTORY" },
  "Narrow Victory":    { color: "text-cyan-400",   icon: "FIELD WON" },
  "Recovery Secured":  { color: "text-green-400",  icon: "RECOVERY" },
  "Strategic Retreat": { color: "text-orange-400", icon: "RETREAT" },
  "Training Complete": { color: "text-green-400",  icon: "COMPLETE" },
};

interface CompletionData {
  xpEarned: number;
  goldEarned: number;
  durationMinutes: number;
  prCount: number;
  totalSets: number;
  combatReplay: any;
  missionClaimed?: { title: string; xpReward: number; goldReward: number } | null;
}

function CombatReplayModal({
  data,
  sessionName,
  onReturn,
  onChronicle,
}: {
  data: CompletionData;
  sessionName: string;
  onReturn: () => void;
  onChronicle: () => void;
}) {
  const [shown, setShown] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const { playSound } = useSoundEngine();
  const animatedXp   = useCountUp(data.xpEarned, 1200, 400);
  const animatedGold = useCountUp(data.goldEarned, 1200, 600);

  const replay  = data.combatReplay;
  const events  = (replay?.events ?? []) as Array<{ text: string; type: string }>;
  const style   = replay?.dominantStyle as string | undefined;
  const theme   = STYLE_COLORS[style ?? "strength"] ?? STYLE_COLORS.strength;
  const verdictMeta = VERDICT_META[replay?.verdict] ?? VERDICT_META["Training Complete"];
  const payoff = replay?.payoff;

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (shown) {
      const t = setTimeout(() => playSound("workout-complete"), 200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [shown]);

  useEffect(() => {
    if (!shown || revealedCount >= events.length) return;
    const t = setTimeout(() => setRevealedCount(c => c + 1), 650);
    return () => clearTimeout(t);
  }, [shown, revealedCount, events.length]);

  const allRevealed = revealedCount >= events.length;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/98 flex flex-col overflow-y-auto"
      style={{ opacity: shown ? 1 : 0, transition: "opacity 0.5s ease-out" }}
    >
      <div
        className="w-full max-w-sm mx-auto px-5 pt-14 pb-24 space-y-5"
        style={{
          transform: shown ? "translateY(0)" : "translateY(24px)",
          transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Header */}
        <div className="text-center">
          <div className={cn("text-[10px] font-mono tracking-[0.35em] uppercase mb-2 animate-pulse", theme.text)}>
            ─── Battle Report ───
          </div>
          <h1 className="text-4xl font-black font-serif text-white leading-tight">
            {replay?.encounterName ?? "Battle Complete"}
          </h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">
            vs. {replay?.enemyName ?? sessionName}
          </p>
        </div>

        {/* Style badge */}
        {style && (
          <div className={cn(
            "flex items-center justify-center gap-2 py-2 px-4 rounded-full border w-fit mx-auto",
            theme.border, theme.bg, theme.glow
          )}>
            <span className={cn("text-xs font-bold font-mono uppercase tracking-widest", theme.text)}>
              {theme.label}
            </span>
            {replay?.hybridArchetype && (
              <span className="text-[10px] text-muted-foreground border-l border-white/10 pl-2">
                {replay.hybridArchetype}
              </span>
            )}
          </div>
        )}

        {/* Narrative events — staggered reveal */}
        <div className="border border-cyan-400/25 bg-cyan-400/5 rounded-xl p-3.5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-cyan-400/70">Real session translated</p>
          {payoff?.headline && <p className="mt-1 font-serif text-base font-bold text-[#e5c386]">{payoff.headline}</p>}
          <p className="mt-1 text-sm leading-relaxed text-foreground/90">
            {payoff?.fitnessTranslation ?? `${data.durationMinutes} minutes, ${data.totalSets} logged set${data.totalSets === 1 ? "" : "s"}, and ${data.prCount} personal record${data.prCount === 1 ? "" : "s"} became a ${theme.label} field record.`}
          </p>
          {payoff?.pathEffect && (
            <p className="mt-2 border-l border-cyan-400/30 pl-3 text-xs leading-relaxed text-cyan-100/75">{payoff.pathEffect}</p>
          )}
          <p className="mt-1 text-[11px] text-cyan-100/60">The Chronicle records the fight; your body keeps the earned progress.</p>
        </div>

        {payoff?.battlePhases?.length ? (
          <div className="space-y-2 rounded-xl border border-[#6b4d2f] bg-[#11100e] p-3.5">
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#9d8f80]">Battle Phases</p>
            {payoff.battlePhases.map((phase: any, index: number) => (
              <div key={`${phase.title}-${index}`} className="border border-[#3b3328] bg-[#0c0b09] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-serif text-sm font-bold text-[#e5c386]">{phase.title}</p>
                  <span className="text-[10px] font-mono uppercase text-[#49a3a0]">Phase {index + 1}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#d8c4a5]">{phase.summary}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-[#8f887d]">{phase.evidence}</p>
              </div>
            ))}
          </div>
        ) : null}

        {events.length > 0 && (
          <div className="space-y-2.5">
            {events.slice(0, revealedCount).map((ev, i) => (
              <div
                key={i}
                className="animate-in fade-in slide-in-from-bottom-3 duration-400 bg-white/5 border border-white/10 rounded-xl p-3.5 text-sm text-foreground/90 leading-relaxed"
              >
                {ev.text}
              </div>
            ))}
            {!allRevealed && events.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats + verdict — shown after all events revealed */}
        {(allRevealed || events.length === 0) && (
          <div className="animate-in fade-in duration-500 space-y-3">
            {/* XP / Gold */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-2xl p-4 text-center">
                <Zap className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                <div className="text-3xl font-black text-cyan-400">+{animatedXp}</div>
                <div className="text-[11px] text-muted-foreground mt-1">XP Earned</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-2xl p-4 text-center">
                <Coins className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                <div className="text-3xl font-black text-yellow-400">+{animatedGold}</div>
                <div className="text-[11px] text-muted-foreground mt-1">Gold Earned</div>
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <Timer className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <div className="font-bold text-white">{data.durationMinutes}m</div>
                <div className="text-[10px] text-muted-foreground">Duration</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <Sword className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <div className="font-bold text-white">{data.totalSets}</div>
                <div className="text-[10px] text-muted-foreground">Sets</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <Trophy className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <div className="font-bold text-yellow-400">{data.prCount}</div>
                <div className="text-[10px] text-muted-foreground">PRs</div>
              </div>
            </div>

            {/* Style score breakdown */}
            {replay?.styleScores && (() => {
              const scores = replay.styleScores as Record<string, number>;
              const maxScore = Math.max(1, ...Object.values(scores).map(Number));
              const styleOrder = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;
              const active = styleOrder.filter(s => (scores[s] ?? 0) > 0).sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
              if (active.length === 0) return null;
              return (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Combat Style Breakdown</p>
                  {active.map(s => {
                    const t = STYLE_COLORS[s]!;
                    const pct = Math.round(((scores[s] ?? 0) / maxScore) * 100);
                    return (
                      <div key={s} className="flex items-center gap-2 text-[10px]">
                        <span className={cn("w-20 shrink-0 capitalize font-mono", t.text)}>{t.label}</span>
                        <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700", t.bg.replace("/10", ""))}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-muted-foreground">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Gear drop */}
            {replay?.gearDrop && (() => {
              const r = replay.gearDrop as { name: string; rarity: string; slot: string };
              const rarityColors: Record<string, string> = {
                common: "text-gray-300 border-gray-400/40",
                uncommon: "text-green-400 border-green-400/40",
                rare: "text-blue-400 border-blue-400/40",
                epic: "text-purple-400 border-purple-400/40",
                legendary: "text-yellow-400 border-yellow-400/50",
              };
              const cls = rarityColors[r.rarity] ?? rarityColors.common;
              return (
                <div className={cn("border rounded-xl p-3.5 bg-white/5 space-y-1", cls)}>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Recovered Gear</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm font-bold font-serif", cls.split(" ")[0])}>{r.name}</span>
                    <span className={cn("text-[10px] font-mono uppercase border px-2 py-0.5 rounded", cls)}>{r.rarity}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground capitalize">{r.slot.replace(/_/g, " ")}</p>
                </div>
              );
            })()}

            {/* Raid impact */}
            {replay?.raidImpact && (
              <div className="border border-orange-400/30 bg-orange-400/10 rounded-xl p-3.5">
                <p className="text-[9px] font-mono uppercase tracking-widest text-orange-400 mb-1.5">Raid Progress</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{replay.raidImpact}</p>
              </div>
            )}

            {payoff && (
              <div className="border border-[#6b4d2f] bg-[#15110d] rounded-xl p-3.5">
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#9d8f80] mb-1.5">Chronicle meaning</p>
                {payoff.pathEffect && <p className="mb-2 text-xs text-[#e5c386] leading-relaxed">{payoff.pathEffect}</p>}
                <p className="text-xs text-[#d8c4a5] leading-relaxed">{payoff.worldEffect}</p>
                <p className="mt-2 text-[11px] text-[#9dbdb8] leading-relaxed">{payoff.nextHook}</p>
              </div>
            )}

            {/* Mission reward */}
            {data.missionClaimed && (
              <div className="border border-yellow-400/40 bg-yellow-400/5 rounded-xl p-4 text-center space-y-1 animate-in fade-in duration-700">
                <p className="text-[9px] font-mono uppercase tracking-widest text-yellow-400/70 mb-2">Commission Sealed</p>
                <p className="font-serif text-base font-bold text-yellow-400">{data.missionClaimed.title}</p>
                <div className="flex justify-center gap-4 text-sm font-mono mt-1">
                  <span className="text-cyan-400">+{data.missionClaimed.xpReward} XP</span>
                  <span className="text-yellow-400">+{data.missionClaimed.goldReward} Gold</span>
                </div>
                <p className="text-[10px] text-foreground/50 italic mt-2">The Guild seal has been affixed. Well done.</p>
              </div>
            )}

            {/* Verdict */}
            <div className={cn(
              "text-center py-3 border border-white/10 bg-white/5 rounded-xl font-mono text-base font-bold tracking-wide",
              verdictMeta.color
            )}>
              {verdictMeta.icon}: {replay?.verdict ?? "Training Complete"}
            </div>

            {/* Narrative consequence */}
            {replay?.narrativeConsequence && (
              <div className="border border-cyan-400/20 bg-cyan-400/5 rounded-xl p-3.5">
                <p className="text-[9px] font-mono uppercase tracking-widest text-cyan-400/70 mb-1.5">↠ Consequence</p>
                <p className="text-xs text-foreground/80 leading-relaxed italic">{replay.narrativeConsequence}</p>
              </div>
            )}

            <div className="grid gap-2">
              <Button
                className="w-full py-6 text-base font-bold bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 hover:bg-cyan-500/30 font-mono tracking-widest"
                onClick={onReturn}
              >
                Return to Guild Hall
              </Button>
              <Button
                variant="outline"
                className="w-full py-5 border-[#6b4d2f] bg-[#15110d] text-[#d9ad63] hover:bg-[#21170f] font-mono tracking-widest"
                onClick={onChronicle}
              >
                View In Chronicle
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActiveSession() {
  const params = useParams();
  const sessionId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { playSound } = useSoundEngine();
  const { settings } = useSettings();

  const [openExId, setOpenExId] = useState<number | null>(null);
  const [weight, setWeight] = useState("45");
  const [reps, setReps] = useState("10");
  const [rpe, setRpe] = useState("8");
  const [restTimer, setRestTimer] = useState(0);
  const [prFlash, setPrFlash] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [viewMode, setViewMode] = useState<"active" | "summary">("active");
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);

  const { data: session, isLoading } = useGetWorkoutSession(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: ["/api/workouts/sessions", sessionId],
      refetchInterval: false,
    },
  });

  const logSet = useLogSet();
  const finishSession = useUpdateWorkoutSession();

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (restTimer > 0) {
      t = setInterval(() => setRestTimer((p) => Math.max(0, p - 1)), 1000);
    }
    return () => clearInterval(t);
  }, [restTimer]);

  useEffect(() => {
    if (!session?.startedAt) return;
    const startMs = new Date(session.startedAt).getTime();
    const tick = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [session?.startedAt]);

  const setsByExercise = useMemo(() => {
    const map = new Map<number, NonNullable<typeof session>["sets"]>();
    if (!session) return map;
    for (const s of session.sets) {
      if (!map.has(s.exerciseId)) map.set(s.exerciseId, []);
      map.get(s.exerciseId)!.push(s);
    }
    return map;
  }, [session?.sets]);

  const exercises = useMemo(() => {
    if (!session) return [];
    if (session.templateExercises && session.templateExercises.length > 0) {
      return session.templateExercises;
    }
    const seen = new Set<number>();
    return session.sets
      .filter((s) => { if (seen.has(s.exerciseId)) return false; seen.add(s.exerciseId); return true; })
      .map((s) => ({ exerciseId: s.exerciseId, name: s.exerciseName, sets: 3, reps: "10", muscleGroup: undefined }));
  }, [session?.templateExercises, session?.sets]);

  useEffect(() => {
    if (!openExId || !session) return;
    const setsForEx = (setsByExercise.get(openExId) ?? []);
    if (setsForEx.length > 0) {
      const last = setsForEx[setsForEx.length - 1];
      setWeight(String(last.weight));
      setReps(String(last.reps));
      setRpe(String(last.rpe ?? 8));
    } else {
      const template = exercises.find((e) => e.exerciseId === openExId);
      if (template?.reps) {
        const m = String(template.reps).match(/\d+/);
        if (m) setReps(m[0]);
      }
      setWeight("45");
      setRpe("8");
    }
  }, [openExId]);

  const handleToggleExercise = (exId: number) => {
    setOpenExId((prev) => (prev === exId ? null : exId));
  };

  const handleLogSet = (exerciseId: number) => {
    const setsForEx = setsByExercise.get(exerciseId) ?? [];
    logSet.mutate(
      {
        id: sessionId,
        data: {
          exerciseId,
          setNumber: setsForEx.length + 1,
          reps: parseInt(reps, 10),
          weight: parseFloat(weight),
          weightUnit: "lbs" as WorkoutSetInputWeightUnit,
          rpe: parseInt(rpe, 10),
        },
      },
      {
        onSuccess: (newSet) => {
          playSound("set-logged");
          setRestTimer(90);
          setOpenExId(null);
          queryClient.invalidateQueries({ queryKey: ["/api/workouts/sessions", sessionId] });
          if ((newSet as any).isPr) {
            setPrFlash(exerciseId);
            toast({ title: "🏆 New Personal Record!", description: `${newSet.exerciseName} — ${weight}lbs × ${reps} reps` });
            setTimeout(() => setPrFlash(null), 3000);
          }
        },
      }
    );
  };

  const handleFinishBattle = () => {
    const narrativeIntensity = settings.narrative?.intensity ?? "balanced";
    finishSession.mutate(
      { id: sessionId, data: { status: "completed", narrativeIntensity } },
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: ["/api/player"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
          queryClient.invalidateQueries({ queryKey: ["/api/battle-log"] });
          queryClient.invalidateQueries({ queryKey: ["/api/campaign/story"] });
          setCompletionData({
            xpEarned: data.xpEarned ?? 0,
            goldEarned: data.goldEarned ?? 0,
            durationMinutes: data.session?.durationMinutes ?? Math.floor(elapsedSec / 60),
            prCount: session?.sets.filter((s: any) => s.isPr).length ?? 0,
            totalSets: session?.sets.length ?? 0,
            combatReplay: data.combatReplay ?? null,
            missionClaimed: data.missionClaimed ?? null,
          });
          setViewMode("summary");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Active Battle" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!session) return <div className="p-4 text-muted-foreground">Session not found.</div>;

  if (viewMode === "summary" && completionData) {
    return (
      <CombatReplayModal
        data={completionData}
        sessionName={session.name}
        onReturn={() => setLocation("/guild-hall")}
        onChronicle={() => setLocation("/chronicle?tab=replays")}
      />
    );
  }

  const totalSetsPlanned = exercises.reduce((n, e) => n + (e.sets ?? 3), 0);
  const totalSetsLogged = session.sets.length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-28">
      <div className="flex items-start justify-between">
        <PageHeader title={session.name} subtitle="Combat in progress..." />
        <div className="text-right pt-1 pr-1">
          <div className="font-mono text-xl font-bold text-cyan-400">{formatTime(elapsedSec)}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Elapsed</div>
        </div>
      </div>

      {restTimer > 0 && (
        <Card className="border-yellow-500/40 bg-yellow-500/10">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-400 font-mono text-sm font-bold">
              <Timer className="w-4 h-4 animate-pulse" /> Resting...
            </div>
            <div className="text-2xl font-mono font-black text-yellow-400">{formatTime(restTimer)}</div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-xs h-7"
              onClick={() => setRestTimer(0)}
            >
              Skip
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground font-mono">
          {totalSetsLogged} / {totalSetsPlanned} sets logged
        </span>
        <div className="flex-1 mx-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 rounded-full transition-all duration-500"
            style={{ width: `${totalSetsPlanned > 0 ? (totalSetsLogged / totalSetsPlanned) * 100 : 0}%` }}
          />
        </div>
        <Flame className="w-4 h-4 text-orange-400" />
      </div>

      {exercises.length === 0 ? (
        <Card className="border-border/30 bg-card/30">
          <CardContent className="p-6 text-center">
            <Sword className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No exercises loaded. Add a set using any exercise ID.</p>
          </CardContent>
        </Card>
      ) : (
        exercises.map((ex) => {
          const exId = ex.exerciseId ?? 0;
          const exSets = setsByExercise.get(exId) ?? [];
          const plannedSets = ex.sets ?? 3;
          const done = exSets.length;
          const isComplete = done >= plannedSets;
          const isOpen = openExId === exId;
          const isPrEx = prFlash === exId;

          return (
            <Card
              key={exId}
              className={`border transition-all duration-300 ${
                isPrEx
                  ? "border-yellow-400/60 bg-yellow-500/10 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                  : isComplete
                  ? "border-green-500/30 bg-green-500/5"
                  : isOpen
                  ? "border-cyan-400/40 bg-cyan-500/5"
                  : "border-border/40 bg-card/40"
              }`}
            >
              <CardContent className="p-4">
                <button
                  className="w-full text-left"
                  onClick={() => handleToggleExercise(exId)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      ) : (
                        <Sword className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-semibold text-sm text-white">{ex.name ?? `Exercise ${exId}`}</span>
                      {isPrEx && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30 text-[10px] px-1.5 py-0 animate-pulse">
                          <Star className="w-3 h-3 mr-1" />PR!
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-bold ${isComplete ? "text-green-400" : "text-cyan-400"}`}>
                        {done}/{plannedSets}
                      </span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                  {ex.muscleGroup && (
                    <span className="text-[10px] text-muted-foreground ml-6">{ex.muscleGroup}</span>
                  )}
                  {ex.reps && (
                    <span className="text-[10px] text-muted-foreground ml-6">
                      {ex.sets ?? 3} × {ex.reps} reps
                    </span>
                  )}
                </button>

                {exSets.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {exSets.map((s, i) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs font-mono px-2 py-1.5 rounded-lg bg-white/5 border border-white/5"
                      >
                        <span className="text-muted-foreground w-5">{i + 1}.</span>
                        <span className="text-white font-bold">
                          {s.weight}{s.weightUnit} × {s.reps}
                        </span>
                        <span className="text-muted-foreground">RPE {s.rpe ?? "—"}</span>
                        {(s as any).isPr && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-[9px] px-1 py-0">
                            <Star className="w-2.5 h-2.5 mr-0.5" />PR
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Weight (lbs)</label>
                        <Input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="bg-black/50 border-border/50 font-mono text-center text-lg font-bold h-12"
                          inputMode="decimal"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Reps</label>
                        <Input
                          type="number"
                          value={reps}
                          onChange={(e) => setReps(e.target.value)}
                          className="bg-black/50 border-border/50 font-mono text-center text-lg font-bold h-12"
                          inputMode="numeric"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">RPE</label>
                        <Input
                          type="number"
                          value={rpe}
                          onChange={(e) => setRpe(e.target.value)}
                          min="1"
                          max="10"
                          className="bg-black/50 border-border/50 font-mono text-center text-lg font-bold h-12"
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 hover:bg-cyan-500/30 font-bold"
                        onClick={() => handleLogSet(exId)}
                        disabled={logSet.isPending}
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Log Set
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground border border-border/30"
                        onClick={() => setOpenExId(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {!isOpen && !isComplete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 h-8 text-xs text-cyan-400/70 border border-cyan-400/20 hover:border-cyan-400/40 hover:text-cyan-400 hover:bg-cyan-500/10"
                    onClick={() => handleToggleExercise(exId)}
                  >
                    <Plus className="w-3 h-3 mr-1.5" /> Add Set
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 z-40 max-w-md mx-auto">
        <Button
          className="w-full py-5 bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 font-bold text-sm shadow-[0_0_20px_rgba(239,68,68,0.15)]"
          onClick={handleFinishBattle}
          disabled={finishSession.isPending}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {finishSession.isPending ? "Calculating rewards..." : "Finish Battle"}
        </Button>
      </div>
    </div>
  );
}
