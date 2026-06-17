import { useState } from "react";
import {
  useGetTodayNutrition,
  useGetNutritionTargets,
  useGetNutritionLogs,
  useCreateNutritionLog,
  useDeleteNutritionLog,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatBar } from "@/components/shared/stat-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Apple, Plus, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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

const defaultForm = () => ({
  mealName: "",
  mealType: "lunch" as string,
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
});

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
        </CardContent>
      </Card>

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
