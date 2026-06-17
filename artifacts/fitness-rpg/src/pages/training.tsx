import { useGetWorkoutTemplates, useGetWorkoutSessions, useCreateWorkoutSession } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dumbbell, Play, Wand2, CalendarDays } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Training() {
  const { data: templates, isLoading: isLoadingTemplates } = useGetWorkoutTemplates();
  const { data: sessions, isLoading: isLoadingSessions } = useGetWorkoutSessions();
  const createSession = useCreateWorkoutSession();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleStart = (templateId: number, templateName: string) => {
    createSession.mutate(
      { data: { templateId, name: templateName } },
      {
        onSuccess: (session: { id: number }) => {
          navigate(`/training/session/${session.id}`);
        },
        onError: () => {
          toast({ title: "Could not start session", variant: "destructive" });
        },
      }
    );
  };

  if (isLoadingTemplates || isLoadingSessions) {
    return (
      <div className="space-y-6">
        <PageHeader title="Training Grounds" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Training Grounds" subtitle="Select a battle template" />

      {/* Quick action banners */}
      <div className="space-y-2">
        <button
          onClick={() => navigate("/training/program")}
          className="w-full p-4 rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-transparent flex items-center gap-4 hover:border-yellow-500/50 hover:from-yellow-500/20 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 group-hover:bg-yellow-500/30 transition-colors">
            <CalendarDays className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-left flex-1">
            <div className="font-bold text-sm text-foreground">8-Week Program</div>
            <div className="text-xs text-muted-foreground">Progressive strength + combat training plan</div>
          </div>
          <div className="text-yellow-400 text-xs font-mono">→</div>
        </button>

        <button
          onClick={() => navigate("/training/planner")}
          className="w-full p-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent flex items-center gap-4 hover:border-primary/50 hover:from-primary/20 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 group-hover:bg-primary/30 transition-colors">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <div className="font-bold text-sm text-foreground">Workout Planner</div>
            <div className="text-xs text-muted-foreground">Generate an equipment-aware plan for any goal</div>
          </div>
          <div className="text-primary text-xs font-mono">→</div>
        </button>
      </div>

      {/* Templates */}
      <div className="space-y-3">
        {templates?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border/30 rounded-xl">
            <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No templates yet. Use the Planner to create one.</p>
          </div>
        )}
        {templates?.map(template => (
          <Card key={template.id} className="border-border/50 bg-card/50 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            <CardContent className="p-4 relative z-10 flex items-center justify-between">
              <div>
                <h3 className="font-bold font-serif text-base text-foreground">{template.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono uppercase text-muted-foreground border border-border/50 px-2 py-0.5 rounded-sm">
                    {template.category}
                  </span>
                  <span className="text-xs text-primary">{template.exercises.length} exercises</span>
                  {template.estimatedDuration && (
                    <span className="text-xs text-muted-foreground">{template.estimatedDuration}m</span>
                  )}
                </div>
                {template.description && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{template.description}</p>
                )}
              </div>
              <Button
                size="icon"
                className="rounded-full shadow-[0_0_15px_hsl(var(--primary)/0.5)] shrink-0"
                onClick={() => handleStart(template.id, template.name)}
                disabled={createSession.isPending}
              >
                <Play className="w-4 h-4 ml-0.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Sessions */}
      {sessions && sessions.length > 0 && (
        <div className="pt-2">
          <h3 className="font-serif font-bold text-base mb-3 flex items-center gap-2 text-muted-foreground">
            <Dumbbell className="w-4 h-4" /> Recent Battles
          </h3>
          <div className="space-y-2">
            {sessions.slice(0, 5).map(session => (
              <div key={session.id} className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-border/50">
                <div>
                  <div className="font-bold text-sm">{session.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(session.startedAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-primary">+{session.xpEarned} XP</div>
                  <div className="text-xs font-mono text-yellow-400">+{session.goldEarned} G</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
