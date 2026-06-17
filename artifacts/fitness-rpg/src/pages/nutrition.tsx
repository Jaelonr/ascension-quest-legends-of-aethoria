import { useState } from "react";
import {
  useGetTodayNutrition,
  useGetNutritionTargets,
  useGetNutritionLogs,
  useCreateNutritionLog,
  useDeleteNutritionLog,
  useUpdateNutritionTargets,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatBar } from "@/components/shared/stat-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Apple, Plus, X, Loader2, ChevronDown, ChevronUp, Calculator, Sparkles, Link } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MEAL_TYPES = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snack" },
  { id: "pre_workout", label: "Pre-Workout" },
  { id: "post_workout", label: "Post-Workout" },
] as const;

const QUICK_ADDS = [
  { name: "Protein Shake", mealType: "post_workout", calories: 150, protein: 25, carbs: 8, fat: 3 },
  { name: "Chicken & Rice", mealType: "lunch", calories: 480, protein: 45, carbs: 52, fat: 8 },
  { name: "Eggs (3 whole)", mealType: "breakfast", calories: 210, protein: 18, carbs: 1, fat: 14 },
  { name: "Greek Yogurt", mealType: "snack", calories: 130, protein: 15, carbs: 12, fat: 2 },
  { name: "Oatmeal", mealType: "breakfast", calories: 300, protein: 10, carbs: 54, fat: 6 },
  { name: "Salmon + Veg", mealType: "dinner", calories: 420, protein: 40, carbs: 18, fat: 18 },
];

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary", desc: "Desk job, little exercise" },
  { id: "light", label: "Light", desc: "1–3 workouts/week" },
  { id: "moderate", label: "Moderate", desc: "3–5 workouts/week" },
  { id: "active", label: "Active", desc: "6–7 workouts/week" },
  { id: "very_active", label: "Very Active", desc: "Twice a day" },
] as const;

const WEIGHT_GOALS = [
  { id: "lose", label: "Lose Weight", desc: "−500 kcal deficit" },
  { id: "maintain", label: "Maintain", desc: "TDEE" },
  { id: "gain", label: "Gain Muscle", desc: "+300 kcal surplus" },
] as const;

const defaultForm = () => ({
  mealName: "",
  mealType: "lunch" as string,
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
});

function CalorieGoalCard({
  targets,
  onSaved,
}: {
  targets: { sex?: string | null; ageYears?: number | null; activityLevel?: string | null; weightGoal?: string | null; autoCalc?: boolean };
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const updateTargets = useUpdateNutritionTargets();
  const [open, setOpen] = useState(!targets.autoCalc);

  const [sex, setSex] = useState<"male" | "female" | "">(
    (targets.sex as "male" | "female") ?? ""
  );
  const [age, setAge] = useState(targets.ageYears?.toString() ?? "");
  const [activity, setActivity] = useState(targets.activityLevel ?? "");
  const [goal, setGoal] = useState(targets.weightGoal ?? "");

  const allFilled = sex && age && activity && goal;

  const handleSave = () => {
    if (!sex || !age || !activity || !goal) {
      toast({ title: "Fill in all fields to calculate your goal", variant: "destructive" });
      return;
    }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      toast({ title: "Enter a valid age (10–100)", variant: "destructive" });
      return;
    }
    updateTargets.mutate(
      { data: { sex, ageYears: ageNum, activityLevel: activity, weightGoal: goal } as Parameters<typeof updateTargets.mutate>[0]["data"] },
      {
        onSuccess: (data) => {
          onSaved();
          setOpen(false);
          if ((data as { autoCalc?: boolean }).autoCalc) {
            toast({ title: "Calorie goal updated!", description: `${(data as { calories: number }).calories} kcal · calculated from your stats.` });
          } else {
            toast({ title: "Preferences saved", description: "Add height & weight in your Hunter Profile for an exact calculation." });
          }
        },
        onError: () => toast({ title: "Failed to save goal", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/3 transition-all"
      >
        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
          <Calculator className="w-4 h-4 text-green-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-bold text-foreground">Calorie Goal</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {targets.autoCalc
              ? <span className="flex items-center gap-1 text-green-400"><Sparkles className="w-3 h-3" /> Calculated from your stats</span>
              : "Set sex, age, activity & goal"}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="h-px bg-border/30" />

          {/* Sex */}
          <div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Sex</div>
            <div className="flex gap-2">
              {(["male", "female"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-sm font-semibold transition-all capitalize",
                    sex === s
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {s === "male" ? "♂ Male" : "♀ Female"}
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Age</div>
            <Input
              type="number"
              min="10"
              max="100"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="e.g. 28"
              className="bg-black/30 border-border/50 h-9 text-sm font-mono"
            />
          </div>

          {/* Activity Level */}
          <div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Activity Level</div>
            <div className="space-y-1.5">
              {ACTIVITY_LEVELS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setActivity(a.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
                    activity === a.id
                      ? "border-primary bg-primary/10"
                      : "border-border/40 hover:border-primary/30 hover:bg-white/3"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    activity === a.id ? "bg-primary" : "bg-border/60"
                  )} />
                  <div>
                    <div className={cn("text-sm font-semibold", activity === a.id ? "text-primary" : "text-foreground")}>{a.label}</div>
                    <div className="text-[10px] text-muted-foreground">{a.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Weight Goal */}
          <div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Goal</div>
            <div className="grid grid-cols-3 gap-2">
              {WEIGHT_GOALS.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={cn(
                    "py-2.5 px-2 rounded-lg border text-center transition-all",
                    goal === g.id
                      ? "border-primary bg-primary/20"
                      : "border-border/40 hover:border-primary/30"
                  )}
                >
                  <div className={cn("text-xs font-bold", goal === g.id ? "text-primary" : "text-foreground")}>{g.label}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Height/Weight note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-black/20 border border-border/30">
            <Link className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Calories are calculated using your height & weight from your{" "}
              <span className="text-foreground font-medium">Hunter Profile</span>. Set those first for an exact result.
            </p>
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleSave}
            disabled={!allFilled || updateTargets.isPending}
          >
            {updateTargets.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Calculator className="w-4 h-4" />}
            Calculate & Save Goal
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Nutrition() {
  const { data: today, isLoading: isLoadingToday } = useGetTodayNutrition();
  const { data: targets, isLoading: isLoadingTargets } = useGetNutritionTargets();
  const { data: logs, isLoading: isLoadingLogs } = useGetNutritionLogs();
  const createLog = useCreateNutritionLog();
  const deleteLog = useDeleteNutritionLog();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm());

  const setField = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/nutrition/today"] });
    queryClient.invalidateQueries({ queryKey: ["/api/nutrition/logs"] });
  };

  const invalidateTargets = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/nutrition/targets"] });
    queryClient.invalidateQueries({ queryKey: ["/api/nutrition/today"] });
  };

  const handleSubmit = () => {
    const cal = parseInt(form.calories);
    if (!form.mealName.trim() || isNaN(cal) || cal <= 0) {
      toast({ title: "Enter a meal name and calories", variant: "destructive" });
      return;
    }
    createLog.mutate(
      {
        data: {
          mealName: form.mealName.trim(),
          mealType: form.mealType as "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "post_workout",
          calories: cal,
          protein: parseFloat(form.protein) || 0,
          carbs: parseFloat(form.carbs) || 0,
          fat: parseFloat(form.fat) || 0,
        },
      },
      {
        onSuccess: () => {
          const name = form.mealName;
          setForm(defaultForm());
          setShowForm(false);
          invalidate();
          toast({ title: "Meal logged!", description: `${name} added.` });
        },
        onError: () => toast({ title: "Failed to log meal", variant: "destructive" }),
      }
    );
  };

  const handleQuickAdd = (item: typeof QUICK_ADDS[number]) => {
    createLog.mutate(
      {
        data: {
          mealName: item.name,
          mealType: item.mealType as "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "post_workout",
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        },
      },
      {
        onSuccess: () => { invalidate(); toast({ title: `${item.name} logged!` }); },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteLog.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Entry removed" }); },
    });
  };

  if (isLoadingToday || isLoadingTargets || isLoadingLogs) {
    return (
      <div className="space-y-6">
        <PageHeader title="Nutrition Log" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!today || !targets || !logs) {
    return <div>Failed to load nutrition data.</div>;
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Nutrition Log" subtitle="Fuel your recovery" />

      {/* Daily Targets */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-400">
              <Target className="w-4 h-4" />
              <h2 className="font-serif font-bold text-base">Daily Targets</h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold">
                {Math.max(0, targets.calories - today.totalCalories)}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">kcal remaining</div>
            </div>
          </div>
          <div className="space-y-3">
            <StatBar label="Calories" value={today.totalCalories} max={targets.calories} colorClass="bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            <StatBar label={`Protein  ${today.totalProtein}g / ${targets.protein}g`} value={today.totalProtein} max={targets.protein} colorClass="bg-primary" />
            <StatBar label={`Carbs  ${today.totalCarbs}g / ${targets.carbs}g`} value={today.totalCarbs} max={targets.carbs} colorClass="bg-orange-500" />
            <StatBar label={`Fat  ${today.totalFat}g / ${targets.fat}g`} value={today.totalFat} max={targets.fat} colorClass="bg-red-500" />
          </div>
          {targets.autoCalc && (
            <div className="flex items-center gap-1.5 pt-1">
              <Sparkles className="w-3 h-3 text-green-400" />
              <span className="text-[10px] font-mono text-green-400">
                {targets.calories} kcal · {
                  targets.weightGoal === "lose" ? "Fat Loss" :
                  targets.weightGoal === "gain" ? "Muscle Gain" : "Maintenance"
                } goal
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calorie Goal Setup */}
      <CalorieGoalCard targets={targets} onSaved={invalidateTargets} />

      {/* Log Food toggle */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 transition-all"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
          <Plus className="w-4 h-4 text-primary" />
        </div>
        <span className="font-bold text-sm text-primary flex-1 text-left">Log Food</span>
        {showForm
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Add Food Form */}
      {showForm && (
        <Card className="border-primary/30 bg-card/50 animate-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-serif">Log a Meal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            {/* Meal Type */}
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Meal Type</div>
              <div className="flex flex-wrap gap-1.5">
                {MEAL_TYPES.map(mt => (
                  <button
                    key={mt.id}
                    onClick={() => setField("mealType", mt.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                      form.mealType === mt.id
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {mt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal Name */}
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Meal Name</div>
              <Input
                value={form.mealName}
                onChange={e => setField("mealName", e.target.value)}
                placeholder="e.g. Chicken Breast, Protein Bar..."
                className="bg-black/30 border-border/50 h-9 text-sm"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>

            {/* Macros grid */}
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Macros</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "calories", label: "Calories (kcal)" },
                  { key: "protein", label: "Protein (g)" },
                  { key: "carbs", label: "Carbs (g)" },
                  { key: "fat", label: "Fat (g)" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <div className="text-[9px] text-muted-foreground mb-1">{label}</div>
                    <Input
                      type="number"
                      min="0"
                      value={(form as Record<string, string>)[key]}
                      onChange={e => setField(key, e.target.value)}
                      className="bg-black/30 border-border/50 h-9 text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full gap-2" onClick={handleSubmit} disabled={createLog.isPending}>
              {createLog.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add to Log
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Adds */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Quick Add</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ADDS.map(item => (
              <button
                key={item.name}
                onClick={() => handleQuickAdd(item)}
                disabled={createLog.isPending}
                className="p-2.5 rounded-lg border border-border/40 bg-black/20 hover:border-primary/40 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
              >
                <div className="text-xs font-bold text-foreground line-clamp-1">{item.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.calories} kcal · {item.protein}g pro</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Meals */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4 text-orange-400">
            <Apple className="w-4 h-4" />
            <h3 className="font-serif font-bold text-base">Today's Meals</h3>
            <span className="ml-auto text-xs font-mono text-muted-foreground">{logs.length} logged</span>
          </div>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No meals logged yet. Consume sustenance to recover HP.
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-border/50 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{log.mealName}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {log.mealType.replace("_", " ")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-bold">{log.calories} kcal</div>
                    <div className="text-[10px] text-muted-foreground">
                      {log.protein}g · {log.carbs}g · {log.fat}g
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                    aria-label="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
