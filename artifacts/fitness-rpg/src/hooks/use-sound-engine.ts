import { useCallback, useRef } from "react";
import { useSettings } from "./use-settings";

export type SoundType =
  | "summon"
  | "level-up"
  | "gold"
  | "daily-reward"
  | "workout-complete"
  | "boss-defeated"
  | "set-logged"
  | "claim";

function tone(
  ctx: AudioContext,
  freq: number,
  time: number,
  duration: number,
  type: OscillatorType = "sine",
  peak = 0.25
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

const SOUNDS: Record<SoundType, (ctx: AudioContext) => void> = {
  "summon": (ctx) => {
    const t = ctx.currentTime;
    [130.81, 196, 261.63].forEach((f, i) => tone(ctx, f, t + i * 0.11, 0.8, "sine", 0.16));
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, f, t + 0.34 + i * 0.08, 0.5, "triangle", 0.14));
    tone(ctx, 1567.98, t + 0.72, 0.9, "sine", 0.1);
  },
  "level-up": (ctx) => {
    const t = ctx.currentTime;
    [329.63, 392, 493.88, 659.25].forEach((f, i) => tone(ctx, f, t + i * 0.13, 0.55, "sine", 0.28));
    tone(ctx, 1318.5, t + 0.52, 0.9, "sine", 0.18);
  },
  "gold": (ctx) => {
    const t = ctx.currentTime;
    tone(ctx, 1318, t, 0.07, "sine", 0.22);
    tone(ctx, 1760, t + 0.07, 0.18, "sine", 0.16);
  },
  "daily-reward": (ctx) => {
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, t + i * 0.09, 0.35, "sine", 0.22));
  },
  "workout-complete": (ctx) => {
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(ctx, f, t + i * 0.11, 0.65, "triangle", 0.28)
    );
    tone(ctx, 1046.5, t + 0.38, 1.1, "sine", 0.22);
  },
  "boss-defeated": (ctx) => {
    const t = ctx.currentTime;
    tone(ctx, 880, t, 0.14, "sawtooth", 0.3);
    [440, 349, 261.63].forEach((f, i) => tone(ctx, f, t + 0.16 + i * 0.15, 0.45, "triangle", 0.22));
  },
  "set-logged": (ctx) => {
    const t = ctx.currentTime;
    tone(ctx, 880, t, 0.06, "sine", 0.12);
    tone(ctx, 1108, t + 0.055, 0.12, "sine", 0.08);
  },
  "claim": (ctx) => {
    const t = ctx.currentTime;
    [523, 784, 1047].forEach((f, i) => tone(ctx, f, t + i * 0.07, 0.28, "sine", 0.2));
  },
};

export function useSoundEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const { settings } = useSettings();

  const ensureCtx = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  const playSound = useCallback(
    (type: SoundType) => {
      if (!settings.sounds?.enabled) return;
      if (settings.appearance?.reducedMotion) return;
      try {
        const ctx = ensureCtx();
        if (!ctx) return;
        SOUNDS[type]?.(ctx);
      } catch {}
    },
    [settings.sounds?.enabled, settings.appearance?.reducedMotion, ensureCtx]
  );

  return { playSound };
}
