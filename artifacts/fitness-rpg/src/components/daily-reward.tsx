import { useState } from "react";
import { useGetDailyReward, useClaimDailyReward } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSoundEngine } from "@/hooks/use-sound-engine";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Flame, Gift, Check, ChevronRight } from "lucide-react";

const REWARD_ICONS: Record<string, string> = {
  gold: "💰",
  xp: "✨",
  item: "🎁",
  title: "👑",
};

export function DailyRewardCard() {
  const { data, isLoading } = useGetDailyReward();
  const claim = useClaimDailyReward();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { playSound } = useSoundEngine();
  const [justClaimed, setJustClaimed] = useState(false);

  if (isLoading || !data) return null;

  const { alreadyClaimed, currentStreak, nextStreakDay, reward, calendar } = data;
  const isClaimed = alreadyClaimed || justClaimed;

  const handleClaim = () => {
    claim.mutate(undefined, {
      onSuccess: (result) => {
        setJustClaimed(true);
        playSound("daily-reward");
        const isMilestone = result.isMilestone;
        toast({
          title: isMilestone ? `🎉 Milestone! Day ${result.streakDay}!` : `Daily Reward Claimed!`,
          description: `${REWARD_ICONS[result.rewardType] ?? "🎁"} ${result.rewardLabel}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/player"] });
        queryClient.invalidateQueries({ queryKey: ["/api/player/daily-reward"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <Card className={cn(
      "border overflow-hidden transition-all duration-300",
      isClaimed ? "border-border/30 bg-card/30" : "border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.08)]"
    )}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: streak + info */}
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 border",
              isClaimed ? "bg-card border-border/30 opacity-50" : "bg-yellow-500/15 border-yellow-500/30"
            )}>
              {isClaimed ? <Check className="w-4 h-4 text-green-400" /> : <Gift className="w-5 h-5 text-yellow-400" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-bold text-foreground">Daily Reward</span>
                {currentStreak > 0 && (
                  <span className="flex items-center gap-0.5 text-[9px] font-mono text-orange-400 border border-orange-400/30 px-1 py-0 rounded bg-orange-400/5">
                    <Flame className="w-2.5 h-2.5" /> {currentStreak}d
                  </span>
                )}
              </div>
              {isClaimed ? (
                <p className="text-[10px] text-muted-foreground">Come back tomorrow</p>
              ) : (
                <p className="text-[10px] text-yellow-400/80 font-mono">
                  {REWARD_ICONS[reward.type ?? "gold"]} Day {nextStreakDay}: {reward.label}
                </p>
              )}
            </div>
          </div>

          {/* Right: claim button */}
          {!isClaimed && (
            <Button
              size="sm"
              className="h-8 shrink-0 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 text-xs"
              onClick={handleClaim}
              disabled={claim.isPending}
            >
              {claim.isPending ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : "Claim"}
            </Button>
          )}
        </div>

        {/* 7-day calendar strip */}
        <div className="flex gap-1 mt-2.5">
          {(calendar ?? []).slice(0, 7).map((day, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 h-6 rounded flex items-center justify-center text-[8px] font-mono border transition-all",
                day.claimed ? "bg-green-500/20 border-green-500/30 text-green-400" :
                day.isToday && !isClaimed ? "bg-yellow-500/25 border-yellow-400/50 text-yellow-300 scale-105 shadow-[0_0_8px_rgba(234,179,8,0.2)]" :
                day.isToday && isClaimed ? "bg-green-500/20 border-green-500/30 text-green-400" :
                "bg-black/20 border-border/20 text-muted-foreground/40"
              )}
            >
              {day.claimed || (day.isToday && isClaimed) ? "✓" : REWARD_ICONS[day.reward?.type ?? "gold"] ?? "?"}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
