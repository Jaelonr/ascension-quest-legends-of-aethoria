import { useState, useEffect } from "react";
import {
  Watch, Heart, Moon, Footprints, Flame, Activity,
  Scale, Plus, Check, ChevronDown, ChevronUp, Info,
  Smartphone, Wifi, WifiOff, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";

interface WearableEntry {
  id: number;
  date: string;
  steps: number | null;
  sleepHours: number | null;
  hrv: number | null;
  restingHr: number | null;
  caloriesBurned: number | null;
  activeMinutes: number | null;
  weight: number | null;
  source: string;
}

interface Summary {
  days: number;
  avgSteps: number | null;
  avgSleepHours: number | null;
  avgHrv: number | null;
  avgRestingHr: number | null;
  lastSyncedAt?: string | null;
  readiness?: {
    source: string | null;
    readiness: string;
    recommendation: string;
    activeRecommendation: string;
    aldricLine: string;
    systemRecommendation?: {
      evidenceVersion: string;
      confidenceLevel: string;
      confidencePercent: number | null;
      reasoning: string[];
      playerDataUsed: string[];
      sourceDocuments: Array<{ title: string; organization: string; url: string }>;
    };
  } | null;
  entries: WearableEntry[];
}

const SOURCES = [
  { id: "manual", label: "Manual Entry", icon: "✍️", available: true, status: "Manual" },
  { id: "apple_health", label: "Apple Health", icon: "🍎", available: false, status: "Later" },
  { id: "health_connect", label: "Health Connect", icon: "🤖", available: true, status: "Android app" },
  { id: "fitbit", label: "Fitbit", icon: "⌚", available: false, status: "Post V1" },
  { id: "garmin", label: "Garmin", icon: "🗺️", available: false, status: "Post V1" },
  { id: "samsung_health", label: "Samsung Health", icon: "📱", available: true, status: "Via Health Connect" },
] as const;

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  narrative,
}: {
  icon: React.ElementType;
  label: string;
  value: number | null;
  unit: string;
  color: string;
  narrative?: string;
}) {
  const { settings } = useSettings();
  const isImmersive = settings.narrative.intensity === "immersive";

  return (
    <Card className="border border-border/40 bg-card/50 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      {value != null ? (
        <>
          <div className={cn("text-xl font-bold", color)}>
            {value.toLocaleString()}
            <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
          </div>
          {isImmersive && narrative && (
            <p className="text-[10px] text-muted-foreground/60 italic mt-1">{narrative}</p>
          )}
        </>
      ) : (
        <div className="text-sm text-muted-foreground/40">—</div>
      )}
    </Card>
  );
}

export default function Wearables() {
  const { toast } = useToast();
  const { settings } = useSettings();
  const today = new Date().toISOString().split("T")[0];

  const [summary, setSummary] = useState<Summary | null>(null);
  const [todayEntry, setTodayEntry] = useState<WearableEntry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingImports, setDeletingImports] = useState(false);

  const [form, setForm] = useState({
    date: today,
    steps: "",
    sleepHours: "",
    hrv: "",
    restingHr: "",
    caloriesBurned: "",
    activeMinutes: "",
    weight: "",
    notes: "",
    source: "manual" as const,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, todayRes] = await Promise.all([
        fetch("/api/wearables/summary"),
        fetch("/api/wearables/today"),
      ]);
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (todayRes.ok) {
        const t = await todayRes.json();
        setTodayEntry(t);
        if (t) {
          setForm(prev => ({
            ...prev,
            steps: t.steps != null ? String(t.steps) : "",
            sleepHours: t.sleepHours != null ? String(t.sleepHours) : "",
            hrv: t.hrv != null ? String(t.hrv) : "",
            restingHr: t.restingHr != null ? String(t.restingHr) : "",
            caloriesBurned: t.caloriesBurned != null ? String(t.caloriesBurned) : "",
            activeMinutes: t.activeMinutes != null ? String(t.activeMinutes) : "",
            weight: t.weight != null ? String(t.weight) : "",
            notes: t.notes ?? "",
          }));
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { date: form.date, source: form.source };
      if (form.steps) body.steps = parseInt(form.steps);
      if (form.sleepHours) body.sleepHours = parseFloat(form.sleepHours);
      if (form.hrv) body.hrv = parseFloat(form.hrv);
      if (form.restingHr) body.restingHr = parseInt(form.restingHr);
      if (form.caloriesBurned) body.caloriesBurned = parseInt(form.caloriesBurned);
      if (form.activeMinutes) body.activeMinutes = parseInt(form.activeMinutes);
      if (form.weight) body.weight = parseFloat(form.weight);
      if (form.notes) body.notes = form.notes;

      const res = await fetch("/api/wearables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Vitals logged", description: "Your recovery data has been recorded." });
      setFormOpen(false);
      await loadData();
    } catch {
      toast({ title: "Could not save entry", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteImportedData = async () => {
    setDeletingImports(true);
    try {
      const res = await fetch("/api/health/imports?source=all", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete imports");
      toast({ title: "Imported health data removed", description: "Manual entries remain available." });
      await loadData();
    } catch {
      toast({ title: "Could not remove imports", variant: "destructive" });
    } finally {
      setDeletingImports(false);
    }
  };

  const isImmersive = settings.narrative.intensity === "immersive";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <Watch className="w-5 h-5 text-cyan-400" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Vitals & Recovery</h1>
            <p className="text-[10px] text-muted-foreground/60">
              {isImmersive ? "The healer's assessment — your body's daily report" : "Track daily health metrics for better GM guidance"}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-4 pt-4">

        {/* 7-Day Averages */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground/40">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading vitals…</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground/80">
                {isImmersive ? "7-Day Body Report" : "7-Day Averages"}
              </h2>
              {summary && (
                <span className="text-xs text-muted-foreground/50">{summary.days} days logged</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <StatCard
                icon={Footprints}
                label={isImmersive ? "Distance Marched" : "Avg Steps"}
                value={summary?.avgSteps ?? null}
                unit={isImmersive ? "paces" : "steps"}
                color="text-emerald-400"
                narrative="You cover great ground daily."
              />
              <StatCard
                icon={Moon}
                label={isImmersive ? "Rest & Recovery" : "Avg Sleep"}
                value={summary?.avgSleepHours ?? null}
                unit="hrs"
                color="text-blue-400"
                narrative="Your body rebuilds in the quiet hours."
              />
              <StatCard
                icon={Activity}
                label={isImmersive ? "Vitality Pulse" : "Avg HRV"}
                value={summary?.avgHrv ?? null}
                unit="ms"
                color="text-purple-400"
                narrative="A measure of your readiness for battle."
              />
              <StatCard
                icon={Heart}
                label={isImmersive ? "Resting Heartbeat" : "Resting HR"}
                value={summary?.avgRestingHr ?? null}
                unit="bpm"
                color="text-red-400"
                narrative="Calm before the gates open."
              />
            </div>
          </>
        )}

        {summary?.readiness && (
          <Card className="border border-cyan-900/60 bg-cyan-950/10">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">System Analysis</p>
                  <CardTitle className="mt-1 text-lg capitalize text-cyan-100">{summary.readiness.readiness.replace(/_/g, " ")}</CardTitle>
                </div>
                <Badge variant="outline" className="border-cyan-700/60 text-cyan-300">
                  {summary.readiness.systemRecommendation?.confidenceLevel ?? "low"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="leading-relaxed text-[#d8c4a5]">{summary.readiness.recommendation}</p>
              <p className="font-semibold leading-relaxed text-[#e6c27b]">{summary.readiness.activeRecommendation}</p>
              <p className="italic leading-relaxed text-cyan-100/70">{summary.readiness.aldricLine}</p>
              <div className="grid gap-2 border-t border-cyan-900/50 pt-3 text-[11px] text-muted-foreground md:grid-cols-2">
                <p>Source: {summary.readiness.source?.replace(/_/g, " ") ?? "none"}</p>
                <p>Last sync: {summary.lastSyncedAt ? new Date(summary.lastSyncedAt).toLocaleString() : "not synced"}</p>
              </div>
              <Button
                variant="outline"
                className="w-full border-red-900/50 bg-red-950/10 text-red-300 hover:bg-red-950/20"
                onClick={deleteImportedData}
                disabled={deletingImports}
              >
                {deletingImports ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Disconnect and delete imported health data
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Today's Entry */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground/80">
            {isImmersive ? "Today's Field Report" : "Today's Entry"}
          </h2>
          <button
            onClick={() => setFormOpen(f => !f)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
          >
            {todayEntry ? <><Check className="w-3 h-3" />Logged</> : <><Plus className="w-3 h-3" />Log Today</>}
            {formOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {formOpen && (
          <Card className="border border-border/50 bg-card/60">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "steps", label: isImmersive ? "Paces Today" : "Steps", placeholder: "e.g. 8500", type: "number" },
                  { key: "sleepHours", label: isImmersive ? "Hours of Rest" : "Sleep Hours", placeholder: "e.g. 7.5", type: "number" },
                  { key: "hrv", label: isImmersive ? "Vitality Reading" : "HRV (ms)", placeholder: "e.g. 55", type: "number" },
                  { key: "restingHr", label: isImmersive ? "Resting Heartbeat" : "Resting HR (bpm)", placeholder: "e.g. 60", type: "number" },
                  { key: "caloriesBurned", label: isImmersive ? "Energy Expended" : "Calories Burned", placeholder: "e.g. 450", type: "number" },
                  { key: "activeMinutes", label: isImmersive ? "Active Time" : "Active Minutes", placeholder: "e.g. 45", type: "number" },
                ].map(field => (
                  <div key={field.key}>
                    <Label className="text-xs text-muted-foreground mb-1 block">{field.label}</Label>
                    <Input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={form[field.key as keyof typeof form]}
                      onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="h-8 text-sm bg-background/50 border-border/50"
                    />
                  </div>
                ))}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  {isImmersive ? "Body Weight" : `Weight (${settings.units.weight})`}
                </Label>
                <Input
                  type="number"
                  placeholder={`e.g. ${settings.units.weight === "lbs" ? "175" : "80"}`}
                  value={form.weight}
                  onChange={e => setForm(prev => ({ ...prev, weight: e.target.value }))}
                  className="h-8 text-sm bg-background/50 border-border/50"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-cyan-800/60 hover:bg-cyan-700/80 border border-cyan-700/40 text-cyan-200 text-xs h-9"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                  {saving ? "Saving…" : "Save Entry"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setFormOpen(false)}
                  className="text-muted-foreground text-xs h-9 px-3"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 7-Day History */}
        {summary && summary.entries.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-foreground/80">
              {isImmersive ? "Recent Field Reports" : "Recent History"}
            </h2>
            <div className="space-y-2">
              {summary.entries.map(entry => (
                <Card key={entry.id} className="border border-border/40 bg-card/40">
                  <div className="flex items-start gap-3 p-3">
                    <div className="w-14 flex-shrink-0">
                      <div className="text-xs font-medium text-foreground/80">
                        {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                      <div className="text-[10px] text-muted-foreground/50">{entry.source}</div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {entry.steps != null && (
                        <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                          <Footprints className="w-3 h-3" />{entry.steps.toLocaleString()}
                        </span>
                      )}
                      {entry.sleepHours != null && (
                        <span className="text-xs text-blue-400 flex items-center gap-0.5">
                          <Moon className="w-3 h-3" />{entry.sleepHours}h
                        </span>
                      )}
                      {entry.hrv != null && (
                        <span className="text-xs text-purple-400 flex items-center gap-0.5">
                          <Activity className="w-3 h-3" />HRV {entry.hrv}
                        </span>
                      )}
                      {entry.restingHr != null && (
                        <span className="text-xs text-red-400 flex items-center gap-0.5">
                          <Heart className="w-3 h-3" />{entry.restingHr}bpm
                        </span>
                      )}
                      {entry.caloriesBurned != null && (
                        <span className="text-xs text-orange-400 flex items-center gap-0.5">
                          <Flame className="w-3 h-3" />{entry.caloriesBurned}kcal
                        </span>
                      )}
                      {entry.weight != null && (
                        <span className="text-xs text-cyan-400 flex items-center gap-0.5">
                          <Scale className="w-3 h-3" />{entry.weight}{settings.units.weight}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Device Integration */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-foreground/80">Device Sync</h2>
            <Info className="w-3.5 h-3.5 text-muted-foreground/40" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SOURCES.filter(s => s.id !== "manual").map(source => (
              <Card key={source.id} className={cn(
                "border p-3 flex items-center gap-2.5",
                source.available
                  ? "border-cyan-700/40 bg-cyan-950/10 cursor-pointer hover:bg-cyan-950/20"
                  : "border-border/30 bg-card/30 opacity-60"
              )}>
                <span className="text-lg flex-shrink-0">{source.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground/80 truncate">{source.label}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {source.available ? (
                      <><Wifi className="w-2.5 h-2.5 text-cyan-400" /><span className="text-[10px] text-cyan-400">{source.status}</span></>
                    ) : (
                      <><WifiOff className="w-2.5 h-2.5 text-muted-foreground/40" /><span className="text-[10px] text-muted-foreground/40">{source.status}</span></>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/40 mt-2 text-center italic">
            Manual entry works on web. Samsung watch import is available in the Android preview through Samsung Health and Health Connect.
          </p>
        </div>

        {/* GM Note */}
        <Card className="border border-amber-800/30 bg-amber-950/10 p-3">
          <div className="flex items-start gap-2">
            <span className="text-sm flex-shrink-0">⚔</span>
            <div>
              <p className="text-[11px] text-amber-400/80 italic leading-relaxed">
                {isImmersive
                  ? "\"The healers watch more than wounds. They watch your sleep, your heartbeat, your endurance between battles. Log this faithfully — Aldric will know.\""
                  : "\"Recovery data helps me give you better guidance. Log your vitals and I can track your readiness, not just your output.\""}
              </p>
              <p className="text-[10px] text-muted-foreground/40 mt-1">— Grandmaster Aldric</p>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
