import { useGetGuildHallToday, useGetWorkoutTemplates, useGetWorkoutSessions, useCreateWorkoutSession } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CalendarDays, Dumbbell, Flag, Flame, MapPin, Play, ScrollText, Shield, Wand2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const STYLE_LABELS: Record<string, string> = {
  strength: "Iron Vanguard",
  striking: "Storm Duelist",
  conditioning: "Wayfarer",
  grappling: "Chainwarden",
  recovery: "Verdant Guardian",
  discipline: "Runesage",
};

const STYLE_LINES: Record<string, string> = {
  strength: "Heavy work is teaching Aethoria to read you as force: carries, presses, pulls, and the stubborn refusal to yield.",
  striking: "Rounds, footwork, and timing are shaping you into the adventurer who ends danger before it settles.",
  conditioning: "Distance and sustained effort are becoming your weapon. The road is starting to recognize your pace.",
  grappling: "Control is becoming your signature. The record favors leverage, restraint, and pressure over spectacle.",
  recovery: "Recovery work is not absence from battle. It is how the body stays useful long enough to matter.",
  discipline: "Repeated honest work is becoming its own class of strength. The Hall is watching the pattern form.",
};

function styleLabel(style?: string | null) {
  if (!style) return "Still forming";
  return STYLE_LABELS[style] ?? style.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function CombatFormPanel({ hall }: { hall: any }) {
  const trend = hall?.counsel?.trendSummary ?? {};
  const proof = hall?.latestBattleProof ?? null;
  const styleKey = trend.dominantStyle ?? proof?.dominantStyle ?? null;
  const ledger = trend.trainingLedger ?? null;
  const title = styleLabel(styleKey);
  const line = styleKey
    ? STYLE_LINES[styleKey] ?? `Your recent work is shaping ${title}.`
    : "The Chronicle is still watching. Complete enough sessions and your real behavior will reveal the class you are earning.";
  const evidence = [
    `${trend.recentWorkouts ?? 0} recent work`,
    `${trend.recentPrs ?? 0} PRs`,
    proof?.encounterName ? `Last battle: ${proof.encounterName}` : null,
  ].filter(Boolean);

  return (
    <section className="mt-4 border border-[#345f5d] bg-[#071111] p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center border border-[#345f5d] bg-[#0b1717] text-[#49a3a0]">
          <Flame className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#49a3a0]">Combat form</p>
          <h2 className="mt-1 font-serif text-lg font-bold text-[#e5c386]">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#cfc5b8]">{line}</p>
          {ledger?.topRecommendation?.reason ? (
            <p className="mt-3 border-l border-[#6b4d2f] pl-3 text-xs leading-relaxed text-[#9dbdb8]">
              {ledger.topRecommendation.reason}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {evidence.map((item) => (
              <span key={String(item)} className="border border-[#245755] bg-[#0c0b09] px-2 py-1 text-[10px] uppercase tracking-wide text-[#9dbdb8]">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Training() {
  const { data: templates, isLoading: isLoadingTemplates } = useGetWorkoutTemplates();
  const { data: sessions, isLoading: isLoadingSessions } = useGetWorkoutSessions();
  const { data: hall } = useGetGuildHallToday();
  const createSession = useCreateWorkoutSession();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const hallAny = hall as any;

  const handleStart = (templateId: number, templateName: string) => {
    createSession.mutate(
      { data: { templateId, name: templateName } },
      {
        onSuccess: (session: { id: number }) => navigate(`/training/session/${session.id}`),
        onError: () => toast({ title: "Could not start session", variant: "destructive" }),
      },
    );
  };

  const commission = hall?.commission;
  const commissionAny = commission as any;
  const commissionLocation = commissionAny?.location as { name?: string; region?: string; distanceMiles?: number } | null | undefined;
  const commissionTravel = commissionAny?.travel as { footMiles?: number; caravanMiles?: number; mountMiles?: number; returnStone?: boolean } | null | undefined;
  const commissionTasks = (commissionAny?.tasks ?? commission?.quest?.tasks ?? []) as any[];

  if (isLoadingTemplates || isLoadingSessions) {
    return (
      <div className="min-h-screen bg-[#0c0b09] p-4 text-[#eee5d7] md:p-6">
        <Skeleton className="h-20 w-full rounded-none bg-[#171510]" />
        <Skeleton className="mt-4 h-32 w-full rounded-none bg-[#171510]" />
        <Skeleton className="mt-4 h-32 w-full rounded-none bg-[#171510]" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0c0b09] bg-cover bg-top p-4 pb-24 text-[#eee5d7] md:p-6"
      style={{ backgroundImage: "url('/assets/guild-hall-background.png')" }}
    >
      <header className="border-b border-[#6d4a25] pb-3">
        <div className="flex items-center gap-3">
          <Dumbbell className="size-6 text-[#d09b43]" />
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-wide text-[#e5c386]">Training Yard</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#9f9586]">Turn real effort into combat form.</p>
          </div>
        </div>
      </header>

      <section className="mt-4 border border-[#6b4d2f] bg-[#11100e] p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center border border-[#8c6a36] bg-[#15130f] text-[#d8ab59]">
            <Shield className="size-5" />
          </div>
          <div>
            <p className="font-serif text-lg font-bold text-[#d9ad63]">Commission Preparation</p>
            <p className="mt-1 text-sm leading-relaxed text-[#cfc5b8]">
              Choose a planned drill, generate an equipment-aware session, or continue the long program. The Hall records the work as battle evidence.
            </p>
          </div>
        </div>
      </section>

      <CombatFormPanel hall={hallAny} />

      {commission && (
        <section className="mt-4 border border-[#8c6a36] bg-[#11100e] p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center border border-[#8c6a36] bg-[#15130f] text-[#d8ab59]">
              <Flag className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-serif text-lg font-bold text-[#d9ad63]">Today's Commission</p>
                <span className="border border-[#3b3328] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#8f887d]">{commission.category}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[#cfc5b8]">{commission.rationale}</p>
              <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                <div className="border border-[#3b3328] bg-[#0c0b09] p-3">
                  <div className="flex items-center gap-1.5 text-[#d9ad63]"><MapPin className="size-3" /> Location</div>
                  <p className="mt-1 font-serif text-sm text-[#eee5d7]">{commissionLocation?.name ?? "Guild training grounds"}</p>
                  <p className="text-[#8f887d]">{commissionLocation?.region ?? "Near the Hall"}{commissionLocation?.distanceMiles ? ` · ${commissionLocation.distanceMiles} mi from the Hall` : ""}</p>
                </div>
                <div className="border border-[#3b3328] bg-[#0c0b09] p-3">
                  <div className="flex items-center gap-1.5 text-[#49a3a0]"><ScrollText className="size-3" /> Travel Ledger</div>
                  <p className="mt-1 text-[#d8c4a5]">
                    {commissionTravel
                      ? `${commissionTravel.footMiles ?? 0} mi on foot · ${commissionTravel.caravanMiles ?? 0} mi by caravan${commissionTravel.mountMiles ? ` · ${commissionTravel.mountMiles} mi mounted` : ""}`
                      : "Travel details will appear as the commission develops."}
                  </p>
                  <p className="text-[#8f887d]">{commissionTravel?.returnStone ? "Return stone authorized after report." : "Return route pending Guild approval."}</p>
                </div>
              </div>
              {commissionTasks.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {commissionTasks.map((task: any) => (
                    <div key={task.id ?? task.description} className="flex items-center justify-between gap-3 border border-[#3b3328] bg-[#0c0b09] px-3 py-2 text-xs">
                      <span className="text-[#d8c4a5]">{task.description}</span>
                      <span className={task.completed ? "text-[#7cc79b]" : "text-[#d9ad63]"}>{task.currentValue ?? 0}/{task.targetValue ?? 1} {task.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          onClick={() => navigate("/training/program")}
          className="group flex w-full items-center gap-4 border border-[#6b4d2f] bg-[#11100e] p-4 text-left transition-all hover:border-[#c08c4e]"
        >
          <div className="flex size-10 items-center justify-center border border-[#8c6a36] bg-[#15130f]">
            <CalendarDays className="size-5 text-[#d9ad63]" />
          </div>
          <div className="flex-1">
            <div className="font-serif text-sm font-bold text-[#eee5d7]">8-Week Campaign Program</div>
            <div className="text-xs text-[#8f887d]">Progressive strength and combat preparation</div>
          </div>
          <div className="text-xs font-mono text-[#d9ad63]">Open</div>
        </button>

        <button
          onClick={() => navigate("/training/planner")}
          className="group flex w-full items-center gap-4 border border-[#6b4d2f] bg-[#11100e] p-4 text-left transition-all hover:border-[#c08c4e]"
        >
          <div className="flex size-10 items-center justify-center border border-[#8c6a36] bg-[#15130f]">
            <Wand2 className="size-5 text-[#49a3a0]" />
          </div>
          <div className="flex-1">
            <div className="font-serif text-sm font-bold text-[#eee5d7]">Guild Drill Planner</div>
            <div className="text-xs text-[#8f887d]">Generate an equipment-aware plan for the day</div>
          </div>
          <div className="text-xs font-mono text-[#49a3a0]">Open</div>
        </button>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-[#3b3328] pb-2">
          <ScrollText className="size-4 text-[#d9ad63]" />
          <h2 className="font-serif text-base font-bold text-[#d9ad63]">Available Drills</h2>
        </div>

        {templates?.length === 0 && (
          <div className="border border-dashed border-[#3b3328] bg-[#11100e]/70 py-8 text-center text-[#8f887d]">
            <Dumbbell className="mx-auto mb-2 size-8 opacity-40" />
            <p className="text-sm">No templates yet. Use the Planner to create one.</p>
          </div>
        )}

        {templates?.map((template) => (
          <Card key={template.id} className="group relative overflow-hidden rounded-none border-[#3b3328] bg-[#11100e]">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[#8e3525]" />
            <CardContent className="relative z-10 flex items-center justify-between p-4">
              <div className="min-w-0">
                <h3 className="truncate font-serif text-base font-bold text-[#eee5d7]">{template.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="border border-[#6b4d2f] px-2 py-0.5 text-xs font-mono uppercase text-[#b99c6b]">
                    {template.category}
                  </span>
                  <span className="text-xs text-[#49a3a0]">{template.exercises.length} exercises</span>
                  {template.estimatedDuration && <span className="text-xs text-[#8f887d]">{template.estimatedDuration}m</span>}
                </div>
                {template.description && <p className="mt-1 line-clamp-1 text-[11px] text-[#8f887d]">{template.description}</p>}
              </div>
              <Button
                size="icon"
                className="ml-3 shrink-0 rounded-none border border-[#c08c4e] bg-[#74291f] text-[#f1dfc6] hover:bg-[#8c3527]"
                onClick={() => handleStart(template.id, template.name)}
                disabled={createSession.isPending}
              >
                <Play className="ml-0.5 size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {sessions && sessions.length > 0 && (
        <div className="pt-5">
          <h3 className="mb-3 flex items-center gap-2 font-serif text-base font-bold text-[#d9ad63]">
            <Flame className="size-4" /> Recent Battles
          </h3>
          <div className="space-y-2">
            {sessions.slice(0, 5).map((session) => (
              <div key={session.id} className="flex items-center justify-between border border-[#3b3328] bg-[#11100e] p-3">
                <div>
                  <div className="text-sm font-bold text-[#eee5d7]">{session.name}</div>
                  <div className="text-xs text-[#8f887d]">{new Date(session.startedAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-[#49a3a0]">+{session.xpEarned} XP</div>
                  <div className="font-mono text-xs text-[#d9ad63]">+{session.goldEarned} G</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
