import { useEffect, useState } from "react";
import { LevelUpInfo } from "@/hooks/use-level-up";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Star, Zap } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";
import { useSoundEngine } from "@/hooks/use-sound-engine";
import { formatGuildGrade } from "@/lib/ranks";

interface Props {
  info: LevelUpInfo;
  onDismiss: () => void;
}

const RANK_COLORS: Record<string, string> = {
  E: "text-gray-400",
  D: "text-green-400",
  C: "text-blue-400",
  B: "text-purple-400",
  A: "text-yellow-400",
  S: "text-orange-400",
  "National-Level": "text-red-400",
};

const RANK_GLOW: Record<string, string> = {
  E: "shadow-[0_0_40px_rgba(156,163,175,0.3)]",
  D: "shadow-[0_0_40px_rgba(74,222,128,0.4)]",
  C: "shadow-[0_0_40px_rgba(96,165,250,0.4)]",
  B: "shadow-[0_0_40px_rgba(168,85,247,0.4)]",
  A: "shadow-[0_0_40px_rgba(250,204,21,0.5)]",
  S: "shadow-[0_0_60px_rgba(251,146,60,0.6)]",
  "National-Level": "shadow-[0_0_80px_rgba(239,68,68,0.7)]",
};

export function LevelUpOverlay({ info, onDismiss }: Props) {
  const [phase, setPhase] = useState<"in" | "show" | "rank">("in");
  const { playSound } = useSoundEngine();
  const animatedLevel = useCountUp(info.newLevel, 900, 200);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 100);
    const t2 = setTimeout(() => info.rankedUp && setPhase("rank"), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [info.rankedUp]);

  useEffect(() => {
    const t = setTimeout(() => playSound("level-up"), 150);
    return () => clearTimeout(t);
  }, []);

  const rankColor = RANK_COLORS[info.newRank] ?? "text-cyan-400";
  const rankGlow = RANK_GLOW[info.newRank] ?? "";
  const previousGrade = formatGuildGrade(info.prevRank);
  const newGrade = formatGuildGrade(info.newRank);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      style={{
        opacity: phase === "in" ? 0 : 1,
        transition: "opacity 0.4s ease-out",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cyan-400/20 animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div
        className="relative z-10 text-center px-8 max-w-sm mx-auto"
        style={{
          transform: phase === "in" ? "scale(0.8) translateY(20px)" : "scale(1) translateY(0)",
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div className="mb-3 flex justify-center">
          <div className="relative">
            <Sparkles className="w-8 h-8 text-cyan-400 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
        </div>

        <p className="text-xs font-mono text-cyan-400/70 uppercase tracking-[0.3em] mb-2 animate-pulse">
          --- System Alert ---
        </p>

        <h1 className="text-6xl font-serif font-black text-white mb-1">
          LEVEL
        </h1>
        <div
          className={`text-8xl font-black font-mono ${rankColor} mb-4`}
          style={{
            textShadow: `0 0 30px currentColor, 0 0 60px currentColor`,
            transition: "all 0.3s ease",
          }}
        >
          {animatedLevel}
        </div>

        {info.rankedUp && (
          <div
            className={`mb-6 px-6 py-3 rounded-xl border border-current ${rankColor} ${rankGlow} bg-black/50`}
            style={{
              opacity: phase === "rank" ? 1 : 0,
              transform: phase === "rank" ? "scale(1)" : "scale(0.8)",
              transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <div className="text-xs font-mono tracking-widest uppercase mb-1 opacity-70">Grade Raised!</div>
            <div className="text-2xl font-black font-mono">
              {previousGrade} to {newGrade}
            </div>
            <div className="text-xs mt-1 opacity-60">New guild grade achieved. The world trembles.</div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <TrendingUp className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">+1</div>
            <div className="text-[10px] text-muted-foreground">All Stats</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-yellow-400">+{info.statPointsGained}</div>
            <div className="text-[10px] text-muted-foreground">Free Points</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <Star className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-purple-400">{newGrade}</div>
            <div className="text-[10px] text-muted-foreground">Grade</div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-6 font-mono italic">
          "Power awakens within those who refuse to stop."
        </p>

        <Button
          onClick={onDismiss}
          className="w-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 hover:bg-cyan-500/30 font-mono tracking-widest uppercase text-sm py-5"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
