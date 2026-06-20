import { useState, useEffect } from "react";
import { useClerk } from "@clerk/react";
import { useGetBiometrics, useUpdateBiometrics } from "@workspace/api-client-react";
import { useSettings } from "@/hooks/use-settings";
import { AethoriaHeader, AethoriaPage, AethoriaPanel } from "@/components/shared/aethoria-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Scale, Ruler, Activity, Save, ChevronRight, Info, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const devAuthBypass = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === "true";

function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <button
      onClick={() => signOut({ redirectUrl: "/" })}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-900/40 bg-red-950/10 text-red-400/80 hover:bg-red-950/20 hover:border-red-700/50 hover:text-red-300 transition-all text-sm font-mono"
    >
      <LogOut className="w-4 h-4" />
      Sign Out
    </button>
  );
}

const EQUIPMENT_TYPES = [
  { id: "power_rack", label: "Power Rack" },
  { id: "squat_rack", label: "Squat Rack" },
  { id: "smith_machine", label: "Smith Machine" },
  { id: "barbell", label: "Barbell" },
  { id: "plates", label: "Plates" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "adjustable_dumbbells", label: "Adjustable Dumbbells" },
  { id: "kettlebells", label: "Kettlebells" },
  { id: "adjustable_bench", label: "Adjustable Bench" },
  { id: "flat_bench", label: "Flat Bench" },
  { id: "incline_bench", label: "Incline Bench" },
  { id: "cable_machine", label: "Cable Machine" },
  { id: "functional_trainer", label: "Functional Trainer" },
  { id: "lat_pulldown", label: "Lat Pulldown" },
  { id: "leg_press", label: "Leg Press" },
  { id: "hack_squat", label: "Hack Squat" },
  { id: "belt_squat", label: "Belt Squat" },
  { id: "pull_up_bar", label: "Pull-Up Bar" },
  { id: "dip_station", label: "Dip Station" },
  { id: "resistance_bands", label: "Resistance Bands" },
  { id: "treadmill", label: "Treadmill" },
  { id: "bike", label: "Bike" },
  { id: "rower", label: "Rower" },
  { id: "elliptical", label: "Elliptical" },
  { id: "stair_climber", label: "Stair Climber" },
  { id: "jump_rope", label: "Jump Rope" },
  { id: "heavy_bag", label: "Heavy Bag" },
  { id: "fightcamp", label: "FightCamp" },
  { id: "speed_bag", label: "Speed Bag" },
  { id: "double_end_bag", label: "Double-End Bag" },
  { id: "wrestling_mat", label: "Wrestling Mat" },
  { id: "yoga_mat", label: "Yoga Mat" },
  { id: "medicine_ball", label: "Medicine Ball" },
  { id: "slam_ball", label: "Slam Ball" },
  { id: "sled", label: "Sled" },
  { id: "battle_ropes", label: "Battle Ropes" },
  { id: "foam_roller", label: "Foam Roller" },
  { id: "bodyweight", label: "Bodyweight Only" },
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
    <AethoriaPage className="animate-in fade-in duration-500">
      <AethoriaHeader
        icon={Activity}
        title="System Record"
        subtitle="Biometrics, strength marks, and equipment access"
        action={
          <Link href="/settings">
            <button className="flex size-9 items-center justify-center border border-[#6b4d2f] bg-[#15130f] transition-all hover:border-[#c08c4e] hover:bg-[#1b1511]">
              <Settings className="w-4 h-4 text-[#d9ad63]" />
            </button>
          </Link>
        }
      />

      {/* Unit system indicator */}
      <div className="flex items-center justify-between border border-[#3b3328] bg-[#11100e] px-3 py-2">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          Unit System
        </p>
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <span className={cn(isImperial ? "font-bold text-[#d9ad63]" : "text-muted-foreground")}>Imperial (lbs / in)</span>
          <span className="text-white/20 mx-1">·</span>
          <span className={cn(!isImperial ? "font-bold text-[#d9ad63]" : "text-muted-foreground")}>Metric (kg / cm)</span>
          <Link href="/settings">
            <span className="ml-2 cursor-pointer text-[9px] text-[#d9ad63] underline">change</span>
          </Link>
        </div>
      </div>

      {/* Info Banner */}
      <AethoriaPanel accent className="flex items-start gap-3">
        <Info className="mt-0.5 size-4 shrink-0 text-[#d9ad63]" />
        <p className="text-xs leading-relaxed text-[#cfc5b8]">
          The System uses this record to set fair commissions, recommend training loads, and help Aldric avoid assigning unsafe work.
        </p>
      </AethoriaPanel>

      {/* Body Metrics */}
      <Card className="rounded-none border-[#3b3328] bg-[#11100e]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-serif text-sm text-[#d9ad63]">
            <Scale className="w-4 h-4 text-[#d9ad63]" /> Body Metrics
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
                className="h-9 border-[#3b3328] bg-[#0c0b09] text-sm"
              />
              {heightHint && (
                <p className="text-[10px] font-mono text-[#d9ad63]">{heightHint}</p>
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
                className="h-9 border-[#3b3328] bg-[#0c0b09] text-sm"
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
                className="h-9 border-[#3b3328] bg-[#0c0b09] text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1RM Maxes */}
      <Card className="rounded-none border-[#3b3328] bg-[#11100e]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-serif text-sm text-[#d9ad63]">
            <Dumbbell className="w-4 h-4 text-[#d9ad63]" /> Strength Maxes (1RM in {weightLabel})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[11px] text-muted-foreground -mt-1">
            Enter your estimated 1-rep max for each lift. Used to calculate recommended working weights.
          </p>

          {!hasAny1rm && (
            <div className="flex items-center gap-2 border border-[#72552e] bg-[#1b1511] p-2">
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
                      "h-9 border-[#3b3328] bg-[#0c0b09] pr-8 text-sm",
                      form[field] && "border-[#d9ad63]/60 bg-[#1b1511]"
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
      <Card className="rounded-none border-[#3b3328] bg-[#11100e]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-serif text-sm text-[#d9ad63]">
            <Dumbbell className="w-4 h-4 text-[#d9ad63]" /> Available Equipment
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
                    "border px-3 py-1.5 text-xs font-medium transition-all",
                    selected
                      ? "border-[#d9ad63] bg-[#3b2a18] text-[#d9ad63]"
                      : "border-[#3b3328] bg-[#0c0b09] text-muted-foreground hover:border-[#6b4d2f]"
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
      <Card className="rounded-none border-[#3b3328] bg-[#11100e]">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-sm text-[#d9ad63]">Injury / Limitation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            placeholder="e.g. Bad lower back, avoid axial loading. Left shoulder impingement on overhead movements."
            value={form.notes}
            onChange={e => { set("notes", e.target.value); }}
            rows={3}
            className="w-full resize-none border border-[#3b3328] bg-[#0c0b09] p-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[#d9ad63] focus:outline-none"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        className="h-12 w-full rounded-none bg-[#74291f] text-base font-bold text-[#f1dfc6] shadow-[0_0_20px_rgba(142,53,37,0.35)] hover:bg-[#8c3527]"
        onClick={handleSave}
        disabled={update.isPending || isLoading}
      >
        <Save className="w-4 h-4 mr-2" />
        {update.isPending ? "Saving..." : dirty ? "Save Profile" : "Profile Saved ✓"}
      </Button>

      {/* Sign Out */}
      {!devAuthBypass && <SignOutButton />}
    </AethoriaPage>
  );
}
