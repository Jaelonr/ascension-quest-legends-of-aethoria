import { useState } from "react";
import { useGetAnalyticsOverview, useGetAchievements } from "@workspace/api-client-react";
import { AethoriaHeader, AethoriaPage } from "@/components/shared/aethoria-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Trophy, Lock } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  training: "text-red-400",
  discipline: "text-blue-400",
  nutrition: "text-green-400",
  skills: "text-purple-400",
  progression: "text-primary",
  economy: "text-yellow-400",
  quests: "text-orange-400",
};

const RARITY_COLORS: Record<string, string> = {
  common: "border-gray-400/30 bg-gray-400/5",
  uncommon: "border-green-400/30 bg-green-400/5",
  rare: "border-blue-400/30 bg-blue-400/5",
  epic: "border-purple-400/30 bg-purple-400/5",
  legendary: "border-yellow-400/30 bg-yellow-400/10 shadow-[0_0_10px_rgba(234,179,8,0.1)]",
};

export default function Analytics() {
  const { data: analytics, isLoading } = useGetAnalyticsOverview();
  const { data: achievements, isLoading: achLoading } = useGetAchievements();
  const [achFilter, setAchFilter] = useState<string>("all");

  if (isLoading) {
    return (
      <AethoriaPage>
        <AethoriaHeader icon={BarChart3} title="Battle Records" subtitle="Your journey in numbers" />
        <Skeleton className="h-64 w-full rounded-none bg-[#171510]" />
        <Skeleton className="h-48 w-full rounded-none bg-[#171510]" />
      </AethoriaPage>
    );
  }

  if (!analytics) return <div>Failed to load records.</div>;

  const unlockedAch = achievements?.filter(a => a.unlockedAt) ?? [];
  const lockedAch = achievements?.filter(a => !a.unlockedAt) ?? [];

  const categories = ["all", ...Array.from(new Set(achievements?.map(a => a.category) ?? []))];
  const filteredAch = achFilter === "all" ? achievements : achievements?.filter(a => a.category === achFilter);

  return (
    <AethoriaPage className="animate-in fade-in duration-500">
      <AethoriaHeader icon={BarChart3} title="Battle Records" subtitle="Your journey in numbers" />

      <Tabs defaultValue="stats">
        <TabsList className="h-12 w-full rounded-none border border-[#3b3328] bg-[#11100e] p-1">
          <TabsTrigger value="stats" className="flex-1">Stats</TabsTrigger>
          <TabsTrigger value="achievements" className="flex-1">
            Achievements
            {unlockedAch.length > 0 && (
              <span className="ml-1.5 text-[10px] font-mono bg-primary/20 text-primary px-1 rounded-sm">
                {unlockedAch.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-none border-[#3b3328] bg-[#11100e]">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Trophy className="w-6 h-6 text-primary mb-2" />
                <div className="text-2xl font-mono font-bold">{analytics.totalWorkouts}</div>
                <div className="text-xs text-muted-foreground uppercase">Battles Won</div>
              </CardContent>
            </Card>
            <Card className="rounded-none border-[#3b3328] bg-[#11100e]">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <TrendingUp className="w-6 h-6 text-accent mb-2" />
                <div className="text-2xl font-mono font-bold">{analytics.totalPrs}</div>
                <div className="text-xs text-muted-foreground uppercase">PRs Broken</div>
              </CardContent>
            </Card>
            <Card className="rounded-none border-[#3b3328] bg-[#11100e]">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="text-2xl font-mono font-bold text-primary">{analytics.currentStreak}</div>
                <div className="text-xs text-muted-foreground uppercase">Current Streak</div>
              </CardContent>
            </Card>
            <Card className="rounded-none border-[#3b3328] bg-[#11100e]">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="text-2xl font-mono font-bold">{analytics.longestStreak}</div>
                <div className="text-xs text-muted-foreground uppercase">Best Streak</div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-none border-[#3b3328] bg-[#11100e]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-serif flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#d9ad63]" /> Body Mass Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.weightTrend}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={["auto", "auto"]} hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                      itemStyle={{ color: "hsl(var(--primary))" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorWeight)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {analytics.weightTrend.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Log body weight in Nutrition to track trends.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-none border-[#3b3328] bg-[#11100e]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-serif text-yellow-400">Hall of Fame (Recent PRs)</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.recentPrs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No records set yet.</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {analytics.recentPrs.map(pr => (
                    <div key={pr.id} className="flex items-center justify-between border border-[#3b3328] bg-[#0c0b09] p-3">
                      <div className="font-bold text-sm">{pr.exerciseName}</div>
                      <div className="font-mono text-sm text-yellow-400">
                        {pr.weight} {pr.weightUnit} × {pr.reps}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="pt-4">
          {achLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="flex gap-1.5 flex-wrap">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setAchFilter(cat)}
                    className={cn(
                      "text-[10px] font-mono uppercase px-2 py-1 rounded border transition-all",
                      achFilter === cat
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Progress Summary */}
              <div className="flex items-center gap-3 border border-[#3b3328] bg-[#0c0b09] p-3">
                <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-bold">{unlockedAch.length} / {achievements?.length ?? 0} Unlocked</div>
                  <div className="h-1.5 bg-black/40 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${achievements?.length ? (unlockedAch.length / achievements.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Achievement Grid */}
              <div className="space-y-2">
                {filteredAch?.map(ach => {
                  const isUnlocked = !!ach.unlockedAt;
                  return (
                    <div
                      key={ach.id}
                      className={cn(
                        "flex items-center gap-3 border p-3 transition-all",
                        isUnlocked
                          ? "border-primary/20 bg-primary/5"
                          : "border-border/20 bg-black/10 opacity-50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg border",
                        isUnlocked ? "bg-primary/20 border-primary/30" : "bg-black/30 border-border/20"
                      )}>
                        {isUnlocked ? "🏆" : <Lock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-bold", !isUnlocked && "text-muted-foreground")}>
                            {ach.name}
                          </span>
                          <span className={cn("text-[10px] font-mono uppercase", CATEGORY_COLORS[ach.category] || "text-muted-foreground")}>
                            {ach.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{ach.description}</p>
                        {isUnlocked && ach.unlockedAt && (
                          <p className="text-[10px] text-primary font-mono mt-0.5">
                            +{ach.xpReward} XP · {new Date(ach.unlockedAt).toLocaleDateString()}
                          </p>
                        )}
                        {!isUnlocked && ach.xpReward && (
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">+{ach.xpReward} XP on unlock</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AethoriaPage>
  );
}
