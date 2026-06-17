import { Link } from "wouter";
import { Swords, Zap, Trophy, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="relative min-h-[100dvh] bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* Atmospheric gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-accent/5 blur-[100px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,212,232,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,232,0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-16 text-center">
        {/* Logo */}
        <div className="mb-8 relative">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
            <img src="/logo.svg" alt="Fitness RPG" className="w-12 h-12" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Zap className="w-3 h-3 text-black" />
          </div>
        </div>

        {/* Title */}
        <div className="mb-2">
          <span className="text-[10px] font-mono tracking-[0.4em] text-primary/70 uppercase">
            Personal
          </span>
        </div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-2 leading-tight">
          Fitness RPG
        </h1>
        <p className="text-sm font-mono text-primary mb-6 tracking-wider">
          ─── ISEKAI EDITION ───
        </p>

        {/* Tagline */}
        <p className="text-base text-muted-foreground max-w-xs leading-relaxed mb-10">
          You were summoned to another world. Your real-world training determines your power.{" "}
          <span className="text-foreground">Level up through actual fitness.</span>
        </p>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-12 w-full max-w-xs">
          {[
            { icon: Swords, label: "Boss Raids" },
            { icon: Trophy, label: "Level Up" },
            { icon: Shield, label: "RPG Classes" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/40 bg-card/30"
            >
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/sign-up">
            <button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-[0_0_24px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_36px_hsl(var(--primary)/0.7)] transition-all active:scale-[0.98]">
              Begin Your Journey
            </button>
          </Link>
          <Link href="/sign-in">
            <button className="w-full h-12 rounded-xl border border-border/60 bg-black/20 text-foreground font-medium text-sm hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.98]">
              Already a Hunter? Sign In
            </button>
          </Link>
        </div>
      </div>

      {/* Bottom badge */}
      <div className="relative z-10 flex justify-center pb-8">
        <span className="text-[10px] font-mono text-muted-foreground/40 tracking-widest">
          YOUR STATS ARE YOUR POWER
        </span>
      </div>
    </div>
  );
}
