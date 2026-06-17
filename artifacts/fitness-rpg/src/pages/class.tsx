import { useGetPlayer } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getStoredBaseClass,
  getBaseClass,
  getCurrentEvolution,
  getNextEvolution,
  getAvailableApexClasses,
  APEX_CLASSES,
  BASE_CLASSES,
  type BaseClassId,
} from "@/hooks/use-class";
import { cn } from "@/lib/utils";
import { Lock, ChevronRight, Zap, Shield } from "lucide-react";

export default function ClassPage() {
  const { data: player, isLoading } = useGetPlayer();

  if (isLoading || !player) {
    return (
      <div className="space-y-6">
        <PageHeader title="Class Archive" />
        <Skeleton className="h-48 w-full rounded-xl bg-card border border-border" />
        <Skeleton className="h-64 w-full rounded-xl bg-card border border-border" />
      </div>
    );
  }

  const storedClassId = (player.baseClass ?? getStoredBaseClass()) as BaseClassId | null;
  const baseClassId: BaseClassId = storedClassId ?? "warrior";
  const baseClass = getBaseClass(baseClassId);
  const currentEvo = getCurrentEvolution(baseClassId, player.level);
  const nextEvo = getNextEvolution(baseClassId, player.level);
  const apexAvailable = getAvailableApexClasses(baseClassId, player.level);
  const apexPreview = APEX_CLASSES.filter(a => a.bases.includes(baseClassId));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader
        title="Class Archive"
        subtitle="Your evolution path in Aethoria"
      />

      {/* ── Current Class Card ─────────────────────────────────────── */}
      <div className={cn("rounded-xl border p-5 space-y-3", baseClass.border, baseClass.bg)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
              Active Class
            </p>
            <h2 className={cn("text-2xl font-serif font-bold", baseClass.color)}>
              {currentEvo.name}
            </h2>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
              {currentEvo.awakening} · Base: {baseClass.name}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={cn("text-xs font-mono px-2 py-1 rounded border", baseClass.border, baseClass.color)}>
              Lv {player.level}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed italic">
          "{currentEvo.lore}"
        </p>

        {/* Abilities */}
        <div className="space-y-2 pt-1">
          <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Active Abilities</p>
          {currentEvo.abilities.map(ab => (
            <div key={ab.name} className="flex gap-2.5 items-start">
              <div className={cn("mt-0.5 shrink-0", ab.type === "active" ? "text-yellow-400" : "text-white/40")}>
                {ab.type === "active" ? <Zap className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              </div>
              <div>
                <span className={cn("text-[10px] font-mono font-bold", ab.type === "active" ? "text-yellow-400" : "text-white/70")}>
                  {ab.name}
                </span>
                <span className="text-[10px] text-muted-foreground"> — {ab.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Next evolution preview */}
        {nextEvo && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
              Next Evolution — Lv {nextEvo.level}
            </p>
            <div className="flex items-center gap-2">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <p className={cn("text-sm font-serif font-bold", nextEvo.color)}>{nextEvo.name}</p>
              <span className="text-[9px] font-mono text-muted-foreground">({nextEvo.awakening})</span>
            </div>
            <div className="mt-1.5 h-1 bg-black/40 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", baseClass.color.replace("text-", "bg-").replace("-400", "-500"))}
                style={{ width: `${Math.min(100, ((player.level - currentEvo.level) / (nextEvo.level - currentEvo.level)) * 100)}%` }}
              />
            </div>
            <p className="text-[9px] font-mono text-muted-foreground mt-1">
              Lv {player.level} / {nextEvo.level} required
            </p>
          </div>
        )}
      </div>

      {/* ── Evolution Timeline ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground px-1">
          Evolution Path — {baseClass.name}
        </h3>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-4 bottom-4 w-px bg-white/10" />

          <div className="space-y-3">
            {baseClass.evolutions.map((tier, i) => {
              const unlocked = player.level >= tier.level;
              const isCurrent = tier.name === currentEvo.name;
              return (
                <div key={tier.name} className="flex gap-3">
                  {/* Dot */}
                  <div className={cn(
                    "relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-mono font-bold transition-all",
                    isCurrent
                      ? cn("border-current bg-black", tier.color)
                      : unlocked
                      ? "border-white/30 bg-black text-white/60"
                      : "border-white/10 bg-black/40 text-white/20"
                  )}>
                    {unlocked ? (isCurrent ? "▶" : "✓") : <Lock className="w-3 h-3" />}
                  </div>

                  {/* Content */}
                  <div className={cn(
                    "flex-1 rounded-xl border p-3 transition-all",
                    isCurrent
                      ? cn(baseClass.border, baseClass.bg)
                      : unlocked
                      ? "border-white/10 bg-white/5"
                      : "border-white/5 bg-black/20"
                  )}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className={cn(
                          "text-sm font-serif font-bold",
                          isCurrent ? tier.color : unlocked ? "text-white/80" : "text-white/25"
                        )}>
                          {tier.name}
                        </p>
                        <p className={cn("text-[9px] font-mono", unlocked ? "text-muted-foreground" : "text-white/20")}>
                          {tier.awakening}
                        </p>
                      </div>
                      <span className={cn(
                        "text-[9px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap",
                        unlocked ? "border-white/20 text-white/50" : "border-white/10 text-white/20"
                      )}>
                        Lv {tier.level}
                      </span>
                    </div>

                    {unlocked && (
                      <p className={cn("text-[10px] leading-relaxed italic", unlocked ? "text-muted-foreground" : "text-white/20")}>
                        "{tier.lore}"
                      </p>
                    )}

                    {/* Show abilities for current + unlocked tiers */}
                    {unlocked && (
                      <div className="mt-2 space-y-1">
                        {tier.abilities.map(ab => (
                          <div key={ab.name} className="flex gap-1.5 items-start">
                            <span className={cn("text-[9px] shrink-0 mt-0.5", ab.type === "active" ? "text-yellow-500" : "text-white/30")}>
                              {ab.type === "active" ? "⚡" : "◆"}
                            </span>
                            <p className="text-[9px] text-muted-foreground">
                              <span className={cn("font-bold", ab.type === "active" ? "text-yellow-400/80" : "text-white/50")}>{ab.name}</span>
                              {" — "}{ab.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {!unlocked && (
                      <p className="text-[9px] text-white/20 mt-1">
                        Requires Level {tier.level} to unlock
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Apex Classes ───────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Apex Hybrid Classes
          </h3>
          <span className="text-[9px] font-mono text-muted-foreground">Unlocks at Lv 80</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
          At Level 80, the boundaries between class trees dissolve. You may channel abilities from two evolution paths simultaneously — forging a hybrid class unique to your journey.
        </p>

        <div className="space-y-3">
          {apexPreview.map(apex => {
            const unlocked = player.level >= apex.requiredLevel;
            return (
              <div
                key={apex.id}
                className={cn(
                  "rounded-xl border p-4 transition-all",
                  unlocked ? apex.border : "border-white/10",
                  unlocked ? "bg-black/40" : "bg-black/20"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className={cn("text-sm font-serif font-bold", unlocked ? apex.color : "text-white/30")}>
                      {apex.name}
                    </p>
                    <p className="text-[9px] font-mono text-muted-foreground">
                      {BASE_CLASSES.find(c => c.id === apex.bases[0])?.name} + {BASE_CLASSES.find(c => c.id === apex.bases[1])?.name}
                    </p>
                  </div>
                  {!unlocked && (
                    <div className="flex items-center gap-1 text-white/30">
                      <Lock className="w-3 h-3" />
                      <span className="text-[9px] font-mono">Lv 80</span>
                    </div>
                  )}
                </div>

                <p className={cn("text-[10px] italic leading-relaxed mb-2", unlocked ? "text-muted-foreground" : "text-white/20")}>
                  "{apex.lore}"
                </p>

                {unlocked && (
                  <div className="space-y-1">
                    {apex.abilities.map(ab => (
                      <div key={ab.name} className="flex gap-1.5 items-start">
                        <span className={cn("text-[9px] shrink-0 mt-0.5", ab.type === "active" ? "text-yellow-500" : "text-white/30")}>
                          {ab.type === "active" ? "⚡" : "◆"}
                        </span>
                        <p className="text-[9px] text-muted-foreground">
                          <span className={cn("font-bold", ab.type === "active" ? "text-yellow-400/80" : "text-white/50")}>{ab.name}</span>
                          {" — "}{ab.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── All other Apex classes (teaser) ────────────────────────── */}
      {apexPreview.length < APEX_CLASSES.length && (
        <div className="rounded-xl border border-white/5 bg-black/10 p-4">
          <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2">
            Other Apex Paths (Requires Different Base Class)
          </p>
          <div className="flex flex-wrap gap-2">
            {APEX_CLASSES.filter(a => !a.bases.includes(baseClassId)).map(apex => (
              <span key={apex.id} className="text-[9px] font-mono text-white/20 px-2 py-1 rounded border border-white/5">
                {apex.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
