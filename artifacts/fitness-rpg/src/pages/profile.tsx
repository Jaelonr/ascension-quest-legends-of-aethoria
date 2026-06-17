import { useState, useEffect } from "react";
import { useClerk } from "@clerk/react";
import { useGetBiometrics, useUpdateBiometrics } from "@workspace/api-client-react";
import { useSettings } from "@/hooks/use-settings";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Scale, Ruler, Activity, Save, ChevronRight, Info, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const EQUIPMENT_TYPES = [
  { id: "barbell", label: "Barbell" },
  { id: "dumbbell", label: "Dumbbells" },
  { id: "cable", label: "Cable Machine" },
  { id: "machine", label: "Weight Machines" },
  { id: "kettlebell", label: "Kettlebell" },
  { id: "bands", label: "Resistance Bands" },
  { id: "bodyweight", label: "Bodyweight Only" },
  { id: "pull_up_bar", label: "Pull-Up Bar" },
  { id: "dip_bars", label: "Dip Bars" },
  { id: "bench", label: "Flat Bench" },
  { id: "incline_bench", label: "Incline Bench" },
  { id: "squat_rack", label: "Squat Rack / Power Rack" },
  { id: "leg_press", label: "Leg Press" },
  { id: "cardio_machine", label: "Cardio Machines" },
  { id: "heavy_bag", label: "Heavy Bag" },
];

// ── Unit conversions ────────────────────────────────────────────────────────
const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462 * 100) / 100;
const cmToIn  = (cm: number)  => Math.round(cm / 2.54 * 10) / 10;
const inToCm  = (inches: number) => Math.round(inches * 2.54 * 10) / 10;

/** Format decimal inches as a ft/in hint, e.g. 70.1 → 5'10" */
function inToFtIn(inches: number): string {
  const ft = Math.floor(inches / 12);
  const rem = Math.round(inches % 12);
  return `${ft}'${rem}"`;
}

// ── Form state (always stores display values in the user's preferred unit) ──
interface FormState {
  height: string;   // cm or inches depending on unit pref
  weight: string;   // kg or lbs depending on unit pref
  bodyFatPct: string;
  squat1rm: string;
  bench1rm: string;
  deadlift1rm: string;
  ohp1rm: string;
  row1rm: string;
  equipmentTypes: string[];
  notes: string;
}

const empty: FormState = {
  height: "", weight: "", bodyFatPct: "",
  squat1rm: "", bench1rm: "", deadlift1rm: "", ohp1rm: "", row1rm: "",
  equipmentTypes: [], notes: "",
};

function toForm(data: any, isImperial: boolean): FormState {
  const heightVal = data.heightCm != null
    ? (isImperial ? String(cmToIn(data.heightCm)) : String(data.heightCm))
    : "";
  const weightVal = data.weightKg != null
    ? (isImperial ? String(kgToLbs(data.weightKg)) : String(data.weightKg))
    : "";
  const conv1rm = (v: number | null) => v == null ? "" : isImperial ? String(kgToLbs(v)) : String(v);
  return {
    height: heightVal,
    weight: weightVal,
    bodyFatPct: data.bodyFatPct != null ? String(data.bodyFatPct) : "",
    squat1rm: conv1rm(data.squat1rm),
    bench1rm: conv1rm(data.bench1rm),
    deadlift1rm: conv1rm(data.deadlift1rm),
    ohp1rm: conv1rm(data.ohp1rm),
    row1rm: conv1rm(data.row1rm),
    equipmentTypes: data.equipmentTypes ?? [],
    notes: data.notes ?? "",
  };
}

function numOrNull(s: string): number | null {
  const n = parseFloat(s);
  return isNaN(n) || s.trim() === "" ? null : n;
}

export default function Profile() {
  const { signOut } = useClerk();
  const { data, isLoading } = useGetBiometrics();
  const update = useUpdateBiometrics();
  const { settings } = useSettings();
  const { toast } = useToast();

  const isImperial = settings.units.weight === "lbs";
  const weightLabel = isImperial ? "lbs" : "kg";
  const heightLabel = isImperial ? "in" : "cm";

  const [form, setForm] = useState<FormState>(empty);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(toForm(data, isImperial));
      setDirty(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Re-convert displayed values when unit preference changes
  useEffect(() => {
    if (data) {
      setForm(toForm(data, isImperial));
      setDirty(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImperial]);

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  function toggleEquipment(id: string) {
    setForm(prev => {
      const has = prev.equipmentTypes.includes(id);
      return {
        ...prev,
        equipmentTypes: has ? prev.equipmentTypes.filter(e => e !== id) : [...prev.equipmentTypes, id],
      };
    });
    setDirty(true);
  }

  function handleSave() {
    const toKg = (s: string) => {
      const n = numOrNull(s);
      return n == null ? null : isImperial ? lbsToKg(n) : n;
    };
    const toCm = (s: string) => {
      const n = numOrNull(s);
      return n == null ? null : isImperial ? inToCm(n) : n;
    };

    update.mutate({
      data: {
        heightCm: toCm(form.height),
        weightKg: toKg(form.weight),
        bodyFatPct: numOrNull(form.bodyFatPct),
        squat1rm: toKg(form.squat1rm) != null ? Math.round(toKg(form.squat1rm)!) : null,
        bench1rm: toKg(form.bench1rm) != null ? Math.round(toKg(form.bench1rm)!) : null,
        deadlift1rm: toKg(form.deadlift1rm) != null ? Math.round(toKg(form.deadlift1rm)!) : null,
        ohp1rm: toKg(form.ohp1rm) != null ? Math.round(toKg(form.ohp1rm)!) : null,
        row1rm: toKg(form.row1rm) != null ? Math.round(toKg(form.row1rm)!) : null,
        equipmentTypes: form.equipmentTypes,
        notes: form.notes || null,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Profile saved", description: "Workout planner will use your data." });
        setDirty(false);
      },
      onError: () => {
        toast({ title: "Failed to save", variant: "destructive" });
      },
    });
  }

  const hasAny1rm = form.squat1rm || form.bench1rm || form.deadlift1rm || form.ohp1rm || form.row1rm;

  // Height hint: show ft/in alongside inches
  const heightNum = parseFloat(form.height);
  const heightHint = isImperial && !isNaN(heightNum) && heightNum > 0
    ? inToFtIn(heightNum)
    : null;

  const lifts: { field: keyof FormState; label: string; placeholder: string }[] = isImperial
    ? [
        { field: "squat1rm",    label: "Squat",          placeholder: "e.g. 315" },
        { field: "bench1rm",    label: "Bench Press",     placeholder: "e.g. 225" },
        { field: "deadlift1rm", label: "Deadlift",        placeholder: "e.g. 405" },
        { field: "ohp1rm",      label: "Overhead Press",  placeholder: "e.g. 155" },
        { field: "row1rm",      label: "Barbell Row",     placeholder: "e.g. 245" },
      ]
    : [
        { field: "squat1rm",    label: "Squat",          placeholder: "e.g. 140" },
        { field: "bench1rm",    label: "Bench Press",     placeholder: "e.g. 100" },
        { field: "deadlift1rm", label: "Deadlift",        placeholder: "e.g. 180" },
        { field: "ohp1rm",      label: "Overhead Press",  placeholder: "e.g. 70"  },
        { field: "row1rm",      label: "Barbell Row",     placeholder: "e.g. 110" },
      ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader
        title="Hunter Profile"
        subtitle="Biometric data & equipment access"
        action={
          <Link href="/settings">
            <button className="w-9 h-9 rounded-lg border border-border/50 bg-black/20 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          </Link>
        }
      />

      {/* Unit system indicator */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          Unit System
        </p>
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <span className={cn(isImperial ? "text-primary font-bold" : "text-muted-foreground")}>Imperial (lbs / in)</span>
          <span className="text-white/20 mx-1">·</span>
          <span className={cn(!isImperial ? "text-primary font-bold" : "text-muted-foreground")}>Metric (kg / cm)</span>
          <Link href="/settings">
            <span className="ml-2 text-[9px] text-primary/70 underline cursor-pointer">change</span>
          </Link>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          This data is used by the <strong className="text-foreground">Workout Planner</strong> to recommend working weights based on your strength maxes and available equipment.
        </p>
      </div>

      {/* Body Metrics */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-serif flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" /> Body Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Height */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Ruler className="w-3 h-3" /> Height ({heightLabel})
              </Label>
              <Input
                type="number"
                placeholder={isImperial ? "e.g. 70" : "e.g. 178"}
                value={form.height}
                onChange={e => set("height", e.target.value)}
                className="bg-black/30 border-border/50 text-sm h-9"
              />
              {heightHint && (
                <p className="text-[10px] font-mono text-primary/70">{heightHint}</p>
              )}
            </div>

            {/* Weight */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Scale className="w-3 h-3" /> Weight ({weightLabel})
              </Label>
              <Input
                type="number"
                placeholder={isImperial ? "e.g. 185" : "e.g. 82"}
                value={form.weight}
                onChange={e => set("weight", e.target.value)}
                className="bg-black/30 border-border/50 text-sm h-9"
              />
            </div>

            {/* Body Fat */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3" /> Body Fat %
              </Label>
              <Input
                type="number"
                placeholder="e.g. 15"
                value={form.bodyFatPct}
                onChange={e => set("bodyFatPct", e.target.value)}
                className="bg-black/30 border-border/50 text-sm h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1RM Maxes */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-serif flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" /> Strength Maxes (1RM in {weightLabel})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[11px] text-muted-foreground -mt-1">
            Enter your estimated 1-rep max for each lift. Used to calculate recommended working weights.
          </p>

          {!hasAny1rm && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <ChevronRight className="w-3 h-3 text-yellow-400 shrink-0" />
              <p className="text-[11px] text-yellow-300">Fill in at least one max to get weight recommendations in the planner.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {lifts.map(({ field, label, placeholder }) => (
              <div key={field} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={placeholder}
                    value={form[field] as string}
                    onChange={e => set(field, e.target.value)}
                    className={cn(
                      "bg-black/30 border-border/50 text-sm h-9 pr-8",
                      form[field] && "border-primary/40 bg-primary/5"
                    )}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {weightLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Equipment Access */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-serif flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" /> Available Equipment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[11px] text-muted-foreground mb-3">
            Select everything you have access to at your gym or home setup.
          </p>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_TYPES.map(eq => {
              const selected = form.equipmentTypes.includes(eq.id);
              return (
                <button
                  key={eq.id}
                  onClick={() => toggleEquipment(eq.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    selected
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border/50 bg-black/20 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {eq.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-serif">Injury / Limitation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            placeholder="e.g. Bad lower back, avoid axial loading. Left shoulder impingement on overhead movements."
            value={form.notes}
            onChange={e => { set("notes", e.target.value); }}
            rows={3}
            className="w-full rounded-lg bg-black/30 border border-border/50 text-sm p-3 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/50"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        className="w-full h-12 text-base font-bold shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
        onClick={handleSave}
        disabled={update.isPending || isLoading}
      >
        <Save className="w-4 h-4 mr-2" />
        {update.isPending ? "Saving..." : dirty ? "Save Profile" : "Profile Saved ✓"}
      </Button>

      {/* Sign Out */}
      <button
        onClick={() => signOut({ redirectUrl: "/" })}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-900/40 bg-red-950/10 text-red-400/80 hover:bg-red-950/20 hover:border-red-700/50 hover:text-red-300 transition-all text-sm font-mono"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  );
}
