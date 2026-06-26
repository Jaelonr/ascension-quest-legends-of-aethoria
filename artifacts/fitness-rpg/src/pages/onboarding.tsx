import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { markOnboardingComplete, hasCompletedSetup } from "@/hooks/use-story";
import { cn } from "@/lib/utils";

interface Slide {
  type: "narrative" | "system" | "world" | "final";
  title?: string;
  text: string;
  subtext?: string;
}

const SLIDES: Slide[] = [
  {
    type: "narrative",
    text: "You were living an ordinary life.",
    subtext: "Work. Train. Sleep. Repeat. Then the air split open and something noticed you.",
  },
  {
    type: "narrative",
    text: "A Gate opened where no Gate should exist.",
    subtext: "A pull you could not resist. The feeling of falling through something infinite.",
  },
  {
    type: "system",
    title: "SYSTEM NOTIFICATION",
    text: "Otherworld transfer detected.\nCandidate bound to the System.",
    subtext: "Authority: UNKNOWN\nAbility: [Real-World Training Sync]",
  },
  {
    type: "system",
    title: "VESSEL SCAN REQUIRED",
    text: "Before your first commission, the System will request identity, age, sex, activity, and available equipment.",
    subtext: "These records help Aldric assign fair duties. Your class must still be earned.",
  },
  {
    type: "world",
    text: "You open your eyes in Aethoria.",
    subtext: "A realm of magic and war. Its people know danger is coming, but only you can see the System's full warning.",
  },
  {
    type: "world",
    text: "The world danger level is severe.",
    subtext: "A great enemy gathers beyond the horizon, but Aethoria has not fallen. Other adventurers still hold the line; Aldric has seen enough to believe your efforts can turn the war.",
  },
  {
    type: "narrative",
    text: "Your ordinary choices now echo in another world.",
    subtext: "Training, meals, recovery, and consistency become the power your summoned self can wield.",
  },
  {
    type: "final",
    title: "ASCENSION QUEST",
    text: "Train in your world. Fight in Aethoria.",
    subtext: "Every healthy decision becomes part of your legend. The System awaits your first scan.",
  },
];

const SLIDE_DURATIONS = [3500, 3500, 4000, 4000, 4000, 4000, 3500, 0];

export default function Onboarding() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [, navigate] = useLocation();

  const current = SLIDES[slideIndex];
  const isLast = slideIndex === SLIDES.length - 1;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [slideIndex]);

  useEffect(() => {
    if (isLast) return;
    const duration = SLIDE_DURATIONS[slideIndex];
    if (duration === 0) return;
    const t = setTimeout(() => advance(), duration);
    return () => clearTimeout(t);
  }, [slideIndex, isLast]);

  const advance = () => {
    setExiting(true);
    setTimeout(() => {
      setExiting(false);
      setVisible(false);
      setSlideIndex(prev => prev + 1);
    }, 600);
  };

  const finish = () => {
    markOnboardingComplete();
    setExiting(true);
    const dest = hasCompletedSetup() ? "/" : "/setup";
    setTimeout(() => navigate(dest), 700);
  };

  const skip = () => {
    markOnboardingComplete();
    navigate(hasCompletedSetup() ? "/" : "/setup");
  };

  const bgClass =
    current.type === "system"
      ? "bg-[radial-gradient(ellipse_at_center,_#001a1a_0%,_#000_70%)]"
      : current.type === "world"
      ? "bg-[radial-gradient(ellipse_at_bottom,_#1a0505_0%,_#000_70%)]"
      : current.type === "final"
      ? "bg-[radial-gradient(ellipse_at_center,_#0d0d1a_0%,_#000_70%)]"
      : "bg-black";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center px-8 transition-all duration-700 cursor-pointer select-none",
        bgClass,
        exiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
      )}
      onClick={isLast ? undefined : advance}
    >
      {!isLast && (
        <button
          onClick={e => { e.stopPropagation(); skip(); }}
          className="absolute top-6 right-6 text-[11px] font-mono text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded border border-white/10 hover:border-white/30"
        >
          SKIP
        </button>
      )}

      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-0.5 rounded-full transition-all duration-500",
              i === slideIndex ? "w-6 bg-white/70" : i < slideIndex ? "w-3 bg-white/30" : "w-3 bg-white/10"
            )}
          />
        ))}
      </div>

      <div
        className={cn(
          "max-w-sm w-full text-center space-y-6 transition-all duration-700",
          visible && !exiting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {current.type === "system" && (
          <div className="inline-block border border-cyan-500/50 bg-cyan-500/5 rounded-lg px-4 py-2 mb-2">
            <span className="text-[10px] font-mono text-cyan-400 tracking-[0.3em]">{current.title}</span>
          </div>
        )}

        {current.type === "final" && current.title && (
          <div className="inline-block border border-primary/50 bg-primary/5 rounded-lg px-4 py-2 mb-2">
            <span className="text-[10px] font-mono text-primary tracking-[0.3em]">{current.title}</span>
          </div>
        )}

        <p
          className={cn(
            "font-serif leading-relaxed",
            current.type === "system"
              ? "text-cyan-300 text-xl font-bold"
              : current.type === "world"
              ? "text-red-200 text-2xl font-bold"
              : current.type === "final"
              ? "text-primary text-2xl font-bold"
              : "text-white text-2xl font-light"
          )}
          style={{ whiteSpace: "pre-line" }}
        >
          {current.text}
        </p>

        {current.subtext && (
          <p
            className={cn(
              "text-sm leading-relaxed",
              current.type === "system"
                ? "font-mono text-cyan-400/80"
                : current.type === "world"
                ? "text-red-300/70"
                : current.type === "final"
                ? "text-white/70"
                : "text-white/50"
            )}
            style={{ whiteSpace: "pre-line" }}
          >
            {current.subtext}
          </p>
        )}

        {current.type === "system" && (
          <div className="border-t border-cyan-500/20 w-32 mx-auto" />
        )}
      </div>

      {isLast && (
        <div className="mt-12 flex flex-col items-center gap-4">
          <button
            onClick={finish}
            className="px-10 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg font-serif shadow-[0_0_40px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.7)] transition-all hover:scale-105 active:scale-95"
          >
            Begin the Scan
          </button>
          <span className="text-[10px] font-mono text-white/20 tracking-widest">SYSTEM STATUS: CRITICAL</span>
        </div>
      )}
    </div>
  );
}
