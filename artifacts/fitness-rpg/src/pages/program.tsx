import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateWorkoutSession } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, ChevronDown, ChevronUp, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Day {
  label: string;
  focus: string;
  exercises: string[];
  sets: string;
  note?: string;
}

interface Week {
  week: number;
  title: string;
  theme: string;
  intensity: string;
  days: Day[];
}

const PROGRAM: Week[] = [
  {
    week: 1, title: "Foundation", theme: "Base Building", intensity: "60% effort",
    days: [
      { label: "Day 1", focus: "Upper Body", exercises: ["Bench Press", "Barbell Row", "Overhead Press", "Barbell Curl"], sets: "3×10", note: "Controlled tempo, learn the movement" },
      { label: "Day 3", focus: "Lower Body", exercises: ["Squat", "Romanian Deadlift", "Leg Press", "Calf Raise"], sets: "3×10" },
      { label: "Day 5", focus: "Full Body + Conditioning", exercises: ["Deadlift", "Pull-up / Lat Pulldown", "Incline Press", "Heavy Bag 3×3min"], sets: "3×8" },
    ],
  },
  {
    week: 2, title: "Foundation+", theme: "Volume Increase", intensity: "65% effort",
    days: [
      { label: "Day 1", focus: "Upper Body", exercises: ["Bench Press +5lb", "Barbell Row +5lb", "Overhead Press", "Tricep Pushdown", "Barbell Curl"], sets: "3×10" },
      { label: "Day 3", focus: "Lower Body", exercises: ["Squat +5lb", "Romanian Deadlift +5lb", "Leg Press", "Lunges", "Calf Raise"], sets: "3×10" },
      { label: "Day 5", focus: "Full Body + Conditioning", exercises: ["Deadlift +5lb", "Pull-up", "Incline Press", "Striking 4×3min"], sets: "3×8" },
    ],
  },
  {
    week: 3, title: "Intermediate", theme: "Rep Range Drop", intensity: "70% effort",
    days: [
      { label: "Day 1", focus: "Upper Push/Pull", exercises: ["Bench Press", "Weighted Pull-up", "Overhead Press", "Cable Row", "Face Pull"], sets: "4×8" },
      { label: "Day 3", focus: "Legs", exercises: ["Squat", "Romanian Deadlift", "Leg Press", "Bulgarian Split Squat", "Leg Curl"], sets: "4×8" },
      { label: "Day 5", focus: "Full Body Power", exercises: ["Deadlift", "Bench Press", "Barbell Row", "Conditioning Circuit"], sets: "4×6" },
    ],
  },
  {
    week: 4, title: "Deload", theme: "Active Recovery", intensity: "50% effort",
    days: [
      { label: "Day 1", focus: "Light Upper", exercises: ["Bench Press −20%", "Row −20%", "Face Pull", "Band Pull-Apart"], sets: "2×10", note: "Focus on technique. Move well." },
      { label: "Day 3", focus: "Light Lower", exercises: ["Squat −20%", "Hip Hinge", "Leg Press −20%", "Stretching"], sets: "2×10" },
      { label: "Day 5", focus: "Active Recovery", exercises: ["Bike / Walk 20min", "Mobility work", "Grappling drills (light)"], sets: "Low intensity" },
    ],
  },
  {
    week: 5, title: "Strength Phase", theme: "Heavier Loads", intensity: "75-80% effort",
    days: [
      { label: "Day 1", focus: "Upper Strength", exercises: ["Bench Press 4×6", "Weighted Pull-up 4×6", "Overhead Press 4×6", "Barbell Row 4×6"], sets: "4×6" },
      { label: "Day 3", focus: "Lower Strength", exercises: ["Squat 4×6", "Deadlift 4×5", "Leg Press 3×8", "Hamstring Curl 3×10"], sets: "4×6" },
      { label: "Day 5", focus: "Power + Combat", exercises: ["Power Clean or Jump Squat", "Push Press", "Weighted Dips", "Sparring / Grappling 20min"], sets: "4×5" },
    ],
  },
  {
    week: 6, title: "Strength+", theme: "Volume + Intensity", intensity: "80% effort",
    days: [
      { label: "Day 1", focus: "Upper Strength", exercises: ["Bench Press +5lb", "Weighted Pull-up +5lb", "Overhead Press +5lb", "Cable Row 3×10"], sets: "4×5-6", note: "Add weight to every main lift" },
      { label: "Day 3", focus: "Lower Strength", exercises: ["Squat +5lb", "Deadlift +5lb", "Bulgarian Split Squat 3×8", "Leg Curl 3×10"], sets: "4×5" },
      { label: "Day 5", focus: "Power + Conditioning", exercises: ["Clean Pull", "Bench Press", "Weighted Chin-up", "Combat Conditioning"], sets: "4×4" },
    ],
  },
  {
    week: 7, title: "Peak Week", theme: "Max Intensity", intensity: "85-90% effort",
    days: [
      { label: "Day 1", focus: "Upper Peak", exercises: ["Bench Press 5×3", "Weighted Pull-up 5×3", "Overhead Press 4×4", "Accessory work 2×12"], sets: "5×3", note: "Heavy. Focus. Execute." },
      { label: "Day 3", focus: "Lower Peak", exercises: ["Squat 5×3", "Deadlift 4×3", "Leg Press 3×6", "Core circuit"], sets: "5×3" },
      { label: "Day 5", focus: "Full Body Primer", exercises: ["Bench Press 3×3 @ 85%", "Deadlift 3×3 @ 85%", "Pull-up 3×5", "Light conditioning"], sets: "3×3" },
    ],
  },
  {
    week: 8, title: "Test Week", theme: "Max Effort — Prove Yourself", intensity: "100% effort",
    days: [
      { label: "Day 1", focus: "Upper Max", exercises: ["Bench Press 1RM attempt", "Overhead Press 3RM attempt", "Weighted Pull-up 3RM", "Record all PRs"], sets: "1-3RM", note: "This is why you trained. Finish strong." },
      { label: "Day 3", focus: "Lower Max", exercises: ["Squat 1RM attempt", "Deadlift 1RM attempt", "Record all PRs"], sets: "1RM" },
      { label: "Day 5", focus: "Combat Assessment", exercises: ["Heavy bag 5×3min full effort", "Grappling sparring", "Conditioning test — max rounds"], sets: "All out" },
    ],
  },
];

const INTENSITY_COLOR: Record<string, string> = {
  "60% effort": "text-blue-400",
  "65% effort": "text-blue-400",
  "70% effort": "text-cyan-400",
  "50% effort": "text-green-400",
  "75-80% effort": "text-yellow-400",
  "80% effort": "text-orange-400",
  "85-90% effort": "text-red-400",
  "100% effort": "text-red-500",
};

export default function Program() {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const createSession = useCreateWorkoutSession();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const currentWeek = 1;

  const handleStartSession = (day: Day) => {
    createSession.mutate(
      { data: { name: `${day.focus} — ${day.sets}`, templateId: undefined as any } },
      {
        onSuccess: (session: { id: number }) => navigate(`/training/session/${session.id}`),
        onError: () => toast({ title: "Could not start session", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">
      <PageHeader title="8-Week Program" subtitle="Progressive strength & combat training" />

      {/* Overview banner */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardContent className="p-4 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-serif font-bold text-sm text-foreground">Progressive Overload Protocol</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              3 sessions/week · Full body strength + striking + grappling · Peaks at Week 8 with max-effort testing
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weeks */}
      {PROGRAM.map((week) => {
        const isExpanded = expandedWeek === week.week;
        const isCurrent = week.week === currentWeek;

        return (
          <Card
            key={week.week}
            className={cn(
              "border-border/50 overflow-hidden transition-all",
              isCurrent ? "border-primary/50 bg-primary/5" : "bg-card/50"
            )}
          >
            {/* Week header */}
            <button
              className="w-full p-4 flex items-center gap-3 text-left"
              onClick={() => setExpandedWeek(isExpanded ? null : week.week)}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 font-mono font-bold text-sm",
                isCurrent
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-black/30 border-border/50 text-muted-foreground"
              )}>
                W{week.week}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-sm text-foreground">{week.title}</span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-primary border border-primary/40 bg-primary/10 px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{week.theme}</span>
                  <span className="text-[10px]">·</span>
                  <span className={cn("text-[10px] font-medium", INTENSITY_COLOR[week.intensity] ?? "text-muted-foreground")}>
                    {week.intensity}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {week.days.length}d
                </div>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {/* Days */}
            {isExpanded && (
              <div className="border-t border-border/30 divide-y divide-border/20">
                {week.days.map((day) => {
                  const dayKey = `${week.week}-${day.label}`;
                  const isDayExpanded = expandedDay === dayKey;
                  return (
                    <div key={day.label} className="px-4">
                      <button
                        className="w-full py-3 flex items-center gap-3 text-left"
                        onClick={() => setExpandedDay(isDayExpanded ? null : dayKey)}
                      >
                        <div className="text-[10px] font-mono text-muted-foreground w-10 shrink-0">{day.label}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-foreground">{day.focus}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {day.sets} · {day.exercises.length} exercises
                          </div>
                        </div>
                        {isDayExpanded
                          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>

                      {isDayExpanded && (
                        <div className="pb-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
                          {day.note && (
                            <div className="text-[10px] text-primary/80 italic bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                              {day.note}
                            </div>
                          )}
                          <div className="space-y-1.5">
                            {day.exercises.map((ex, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                                <span className="text-foreground">{ex}</span>
                              </div>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            className="w-full gap-2 mt-1"
                            onClick={() => handleStartSession(day)}
                            disabled={createSession.isPending}
                          >
                            {createSession.isPending
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Play className="w-3.5 h-3.5 ml-0.5" />}
                            Start This Session
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
