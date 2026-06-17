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

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface SummaryData {
  xpEarned: number;
  goldEarned: number;
  durationMinutes: number;
  prCount: number;
  totalSets: number;
}

function SessionSummary({
  data,
  sessionName,
  onReturn,
}: {
  data: SummaryData;
  sessionName: string;
  onReturn: () => void;
}) {
  const [shown, setShown] = useState(false);
  const { playSound } = useSoundEngine();
  const animatedXp = useCountUp(data.xpEarned, 1200, 400);
  const animatedGold = useCountUp(data.goldEarned, 1200, 500);

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

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center px-6"
      style={{ opacity: shown ? 1 : 0, transition: "opacity 0.5s ease-out" }}
    >
      <div
        className="w-full max-w-sm text-center"
        style={{
          transform: shown ? "translateY(0) scale(1)" : "translateY(30px) scale(0.95)",
          transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div className="mb-2 text-cyan-400/60 font-mono text-xs tracking-[0.3em] uppercase animate-pulse">
          ─── Victory ───
        </div>
        <h1 className="text-5xl font-black font-serif text-white mb-1">
          Battle Complete
        </h1>
        <p className="text-muted-foreground text-sm mb-8 font-mono">{sessionName}</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-2xl p-4">
            <Zap className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
            <div className="text-3xl font-black text-cyan-400">+{animatedXp}</div>
            <div className="text-[11px] text-muted-foreground mt-1">XP Earned</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-2xl p-4">
            <Coins className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <div className="text-3xl font-black text-yellow-400">+{animatedGold}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Gold Earned</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-8">
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
            <div className="text-[10px] text-muted-foreground">New PRs</div>
          </div>
        </div>

        <Button
          className="w-full py-6 text-base font-bold bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 hover:bg-cyan-500/30 font-mono tracking-widest"
          onClick={onReturn}
        >
          Return to Base
        </Button>
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

  const [openExId, setOpenExId] = useState<number | null>(null);
  const [weight, setWeight] = useState("45");
  const [reps, setReps] = useState("10");
  const [rpe, setRpe] = useState("8");
  const [restTimer, setRestTimer] = useState(0);
  const [prFlash, setPrFlash] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [viewMode, setViewMode] = useState<"active" | "summary">("active");
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

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
    finishSession.mutate(
      { id: sessionId, data: { status: "completed" } },
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: ["/api/player"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
          setSummaryData({
            xpEarned: data.xpEarned ?? 0,
            goldEarned: data.goldEarned ?? 0,
            durationMinutes: data.durationMinutes ?? Math.floor(elapsedSec / 60),
            prCount: session?.sets.filter((s: any) => s.isPr).length ?? 0,
            totalSets: session?.sets.length ?? 0,
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

  if (viewMode === "summary" && summaryData) {
    return (
      <SessionSummary
        data={summaryData}
        sessionName={session.name}
        onReturn={() => setLocation("/training")}
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
