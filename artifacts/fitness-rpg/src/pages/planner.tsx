import { useEffect, useMemo, useState } from "react";
import {
  useCreateWorkoutSession,
  useGenerateWorkoutPlan,
  useSavePlanAsTemplate,
  useGetEquipment,
  GeneratedPlan,
  PlanExercise,
} from "@workspace/api-client-react";
import { ExerciseSearch } from "@/components/exercise-search";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  Zap,
  Clock,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Swords,
  Target,
  Wind,
  User,
  Weight,
  Search,
  Footprints,
  Shield,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

type Goal = "strength" | "hypertrophy" | "conditioning" | "striking" | "grappling" | "recovery" | "mobility" | "skill_practice" | "commission" | "back_friendly_lower";

const GOALS: { value: Goal; label: string; icon: React.ElementType; description: string; color: string }[] = [
  { value: "strength", label: "Strength", icon: Dumbbell, description: "Heavy compounds, 3-5 reps", color: "text-red-400" },
  { value: "hypertrophy", label: "Hypertrophy", icon: Target, description: "Mass building, 8-12 reps", color: "text-orange-400" },
  { value: "conditioning", label: "Conditioning", icon: Wind, description: "Endurance & cardio", color: "text-blue-400" },
  { value: "striking", label: "Striking", icon: Swords, description: "Bag work & combat", color: "text-purple-400" },
  { value: "grappling", label: "Grappling", icon: Shield, description: "Control, carries, and mat work", color: "text-violet-400" },
  { value: "recovery", label: "Recovery", icon: Zap, description: "Low intensity, sub-maximal", color: "text-green-400" },
  { value: "mobility", label: "Mobility", icon: Footprints, description: "Range, breath, and joint care", color: "text-emerald-300" },
  { value: "skill_practice", label: "Skill Practice", icon: Swords, description: "Technique-first field work", color: "text-teal-300" },
  { value: "commission", label: "Commission Duty", icon: Shield, description: "Balanced field-ready work", color: "text-amber-300" },
  { value: "back_friendly_lower", label: "Back-Safe", icon: AlertTriangle, description: "No spinal loading", color: "text-yellow-400" },
];

function normalizeGoal(value?: string | null): Goal {
  const key = String(value ?? "").toLowerCase();
  if (key.includes("grappl") || key.includes("control") || key.includes("subdue")) return "grappling";
  if (key.includes("commission") || key.includes("duty")) return "commission";
  if (key.includes("skill") || key.includes("practice")) return "skill_practice";
  if (key.includes("mobility") || key.includes("stretch")) return "mobility";
  if (key.includes("recover") || key.includes("nutrition") || key.includes("discipline")) return "recovery";
  if (key.includes("condition") || key.includes("cardio") || key.includes("walk") || key.includes("endurance")) return "conditioning";
  if (key.includes("strik") || key.includes("footwork")) return "striking";
  if (key.includes("hypertrophy")) return "hypertrophy";
  if (key.includes("back")) return "back_friendly_lower";
  if (key.includes("strength") || key.includes("lower") || key.includes("force")) return "strength";
  return "strength";
}

const PHASE_COLORS: Record<string, string> = {
  warmup: "border-blue-500/40 bg-blue-500/5",
  main: "border-red-500/40 bg-red-500/5",
  accessory: "border-orange-500/40 bg-orange-500/5",
  finisher: "border-purple-500/40 bg-purple-500/5",
};

const PHASE_LABELS: Record<string, string> = {
  warmup: "Warm-Up",
  main: "Main",
  accessory: "Accessory",
  finisher: "Finisher",
};

function ExerciseCard({ exercise }: { exercise: PlanExercise }) {
  const [expanded, setExpanded] = useState(false);
  const hasSubstitutes = exercise.substitutes && exercise.substitutes.length > 0;
  const hasWeight = exercise.recommendedWeightKg != null && exercise.recommendedWeightKg > 0;

  return (
    <div className={cn("rounded-lg border p-3 transition-all", PHASE_COLORS[exercise.phase] || "border-border/50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-sm border",
              exercise.phase === "main" ? "text-red-400 border-red-500/30 bg-red-500/10" :
              exercise.phase === "warmup" ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
              exercise.phase === "finisher" ? "text-purple-400 border-purple-500/30 bg-purple-500/10" :
              "text-orange-400 border-orange-500/30 bg-orange-500/10"
            )}>
              {PHASE_LABELS[exercise.phase]}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono uppercase">{exercise.muscleGroup}</span>
          </div>
          <h4 className="font-bold text-sm">{exercise.exerciseName}</h4>
          <div className="flex items-center gap-3 mt-1 font-mono text-xs text-muted-foreground">
            <span>{exercise.sets} × {exercise.reps}</span>
            <span>RPE {exercise.rpe}</span>
            <span>{exercise.restSeconds}s rest</span>
          </div>
          {hasWeight && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Weight className="w-3 h-3 text-primary" />
              <span className="text-xs font-mono font-bold text-primary">{exercise.recommendedWeightKg} kg</span>
              <span className="text-[10px] text-muted-foreground">recommended</span>
            </div>
          )}
          {exercise.notes && (
            <p className="text-[11px] text-muted-foreground mt-1 italic">{exercise.notes}</p>
          )}
        </div>
        {hasSubstitutes && (
          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        )}
      </div>
      {expanded && hasSubstitutes && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Substitutes</div>
          {exercise.substitutes!.map((sub, i) => (
            <div key={i} className="text-xs font-mono text-muted-foreground py-0.5">
              → {sub.exerciseName} <span className="text-[10px]">({sub.reason})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Planner() {
  const routeParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const commissionNote = routeParams.get("commissionNote");
  const commissionTitle = routeParams.get("commissionTitle");
  const autoGenerate = routeParams.get("autoGenerate") === "true";
  const [selectedGoal, setSelectedGoal] = useState<Goal>(() => normalizeGoal(routeParams.get("goal")));
  const [rpeLimit, setRpeLimit] = useState<number | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const generatePlan = useGenerateWorkoutPlan();
  const savePlan = useSavePlanAsTemplate();
  const createSession = useCreateWorkoutSession();
  const { data: equipment } = useGetEquipment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleGenerate = () => {
    generatePlan.mutate(
      { data: { goal: selectedGoal, rpeLimit: rpeLimit ?? undefined } },
      {
        onSuccess: (data) => {
          setPlan(data);
        },
        onError: () => {
          toast({ title: "Generation Failed", description: "Could not generate a plan. Check your equipment setup.", variant: "destructive" });
        },
      }
    );
  };

  useEffect(() => {
    if (autoGenerate && !plan && !generatePlan.isPending) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate]);

  const handleSave = () => {
    if (!plan) return;
    savePlan.mutate(
      {
        data: {
          planName: plan.planName,
          goal: plan.goal,
          exercises: plan.exercises,
          estimatedDuration: plan.estimatedDuration,
          xpPreview: plan.xpPreview,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Template Saved!", description: `"${plan.planName}" added to your Training Grounds.` });
          queryClient.invalidateQueries({ queryKey: ["/api/training/templates"] });
        },
      }
    );
  };

  const handleStartSession = () => {
    if (!plan) return;
    createSession.mutate(
      {
        data: {
          name: commissionTitle ? `${commissionTitle} - ${plan.planName}` : plan.planName,
          templateId: undefined as any,
          notes: [commissionNote, `Generated plan: ${plan.planName}. Focus: ${plan.goal}.`].filter(Boolean).join("\n"),
        },
      },
      {
        onSuccess: (session: { id: number }) => {
          queryClient.invalidateQueries({ queryKey: ["/api/training/sessions"] });
          navigate(`/training/session/${session.id}`);
        },
        onError: () => {
          toast({ title: "Session failed", description: "The Training Yard could not open this generated route.", variant: "destructive" });
        },
      },
    );
  };

  const mainExercises = plan?.exercises.filter(e => e.phase === "main") ?? [];
  const warmupExercises = plan?.exercises.filter(e => e.phase === "warmup") ?? [];
  const accessoryExercises = plan?.exercises.filter(e => e.phase === "accessory") ?? [];
  const finisherExercises = plan?.exercises.filter(e => e.phase === "finisher") ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Workout Planner" subtitle={commissionTitle ? `Commission route: ${commissionTitle}` : "Equipment-aware plan generation"} />

      {commissionNote && (
        <Card className="rounded-none border-[#6b4d2f] bg-[#11100e]">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#9d8f80]">Guild Commission Context</p>
            <h2 className="mt-1 font-serif text-lg font-bold text-[#d9ad63]">{commissionTitle ?? "Commission route"}</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#b7ab9c]">
              This generated session will keep the selected route, region, threat, and completion path attached. Completing it lets the combat replay and Chronicle know what kind of field duty you actually answered.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Goal Selection */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-serif text-primary">Select Training Goal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {GOALS.map((goal) => {
            const Icon = goal.icon;
            return (
              <button
                key={goal.value}
                onClick={() => setSelectedGoal(goal.value)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  selectedGoal === goal.value
                    ? "border-primary bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
                    : "border-border/50 bg-black/20 hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("w-4 h-4", goal.color)} />
                  <span className="text-sm font-bold">{goal.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{goal.description}</p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* RPE Limit */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-serif text-muted-foreground">RPE Limit (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {[null, 5, 6, 7, 8, 9].map((rpe) => (
              <button
                key={rpe ?? "none"}
                onClick={() => setRpeLimit(rpe)}
                className={cn(
                  "px-3 py-1.5 rounded border text-sm font-mono transition-all",
                  rpeLimit === rpe
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border/50 bg-black/20 text-muted-foreground hover:border-primary/50"
                )}
              >
                {rpe === null ? "Any" : `≤ ${rpe}`}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">RPE 5-6 = recovery, 7-8 = working, 9 = near-max</p>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button
        className="w-full h-12 text-base font-bold shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
        onClick={handleGenerate}
        disabled={generatePlan.isPending}
      >
        {generatePlan.isPending ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Generating Plan...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 mr-2" />
            Generate Workout Plan
          </>
        )}
      </Button>

      {generatePlan.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {/* Generated Plan */}
      {plan && !generatePlan.isPending && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Plan Header */}
          <Card className="border-primary/30 bg-card/50 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
            <CardContent className="p-5 relative z-10">
              <h3 className="font-serif font-bold text-xl text-foreground mb-2">{plan.planName}</h3>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-black/30 rounded-lg border border-border/30">
                  <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <div className="text-sm font-mono font-bold">{plan.estimatedDuration}m</div>
                  <div className="text-[10px] text-muted-foreground">Duration</div>
                </div>
                <div className="text-center p-2 bg-black/30 rounded-lg border border-border/30">
                  <Dumbbell className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <div className="text-sm font-mono font-bold">{plan.totalSets}</div>
                  <div className="text-[10px] text-muted-foreground">Total Sets</div>
                </div>
                <div className="text-center p-2 bg-black/30 rounded-lg border border-border/30">
                  <Zap className="w-4 h-4 text-primary mx-auto mb-1" />
                  <div className="text-sm font-mono font-bold text-primary">+{plan.xpPreview}</div>
                  <div className="text-[10px] text-muted-foreground">XP Est.</div>
                </div>
              </div>

              {plan.injuryNotes && (
                <div className="mb-3 p-2 rounded border border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-400">
                  {plan.injuryNotes}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-border/50"
                  onClick={handleGenerate}
                  disabled={generatePlan.isPending}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={savePlan.isPending}
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save Template
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleStartSession}
                  disabled={createSession.isPending}
                >
                  {createSession.isPending ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Swords className="w-3 h-3 mr-1" />}
                  {commissionNote ? "Start Commission Session" : "Start Session"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* RPE Guide */}
          {plan.rpeGuide && plan.rpeGuide.note && (
            <div className="text-xs text-muted-foreground px-1 italic border-l-2 border-primary/30 pl-3">
              {plan.rpeGuide.note}
            </div>
          )}

          {/* Exercises by Phase */}
          {warmupExercises.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400" /> Warm-Up
              </h4>
              {warmupExercises.map((ex, i) => <ExerciseCard key={i} exercise={ex} />)}
            </div>
          )}
          {mainExercises.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" /> Main Lifts
              </h4>
              {mainExercises.map((ex, i) => <ExerciseCard key={i} exercise={ex} />)}
            </div>
          )}
          {accessoryExercises.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-400" /> Accessories
              </h4>
              {accessoryExercises.map((ex, i) => <ExerciseCard key={i} exercise={ex} />)}
            </div>
          )}
          {finisherExercises.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-400" /> Finisher
              </h4>
              {finisherExercises.map((ex, i) => <ExerciseCard key={i} exercise={ex} />)}
            </div>
          )}
        </div>
      )}

      {/* No-biometrics nudge (shown after first plan if no data) */}
      {plan && !generatePlan.isPending && !plan.hasBiometrics && (
        <button
          onClick={() => navigate("/profile")}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all text-left"
        >
          <User className="w-5 h-5 text-yellow-400 shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-bold text-yellow-300">Set up your Adventurer Profile</div>
            <div className="text-[10px] text-yellow-400/70">Add your strength maxes to get recommended working weights</div>
          </div>
          <span className="text-yellow-400 text-xs">→</span>
        </button>
      )}

      {/* Empty state */}
      {!plan && !generatePlan.isPending && (
        <div className="space-y-3">
          <div className="text-center py-10 border border-dashed border-border/30 rounded-xl text-muted-foreground">
            <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a goal and generate your plan.</p>
            <p className="text-xs mt-1 opacity-60">Uses your registered equipment automatically.</p>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 hover:border-primary/40 transition-all text-left"
          >
            <User className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-bold text-foreground">Set up Adventurer Profile first</div>
              <div className="text-[10px] text-muted-foreground">Add your 1RM maxes for weight recommendations</div>
            </div>
            <span className="text-primary text-xs">→</span>
          </button>
        </div>
      )}

      {/* AI Exercise Lookup */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-serif flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Exercise Lookup
            <span className="text-[9px] font-mono bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded ml-1">AI</span>
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">Search any exercise — finds it in your library or retrieves it from the System</p>
        </CardHeader>
        <CardContent>
          <ExerciseSearch />
        </CardContent>
      </Card>
    </div>
  );
}
