import { useClerk } from "@clerk/react";
import { Link } from "wouter";
import { Swords, Zap, Trophy, Shield } from "lucide-react";

function GoogleButton() {
  const { openSignIn } = useClerk();

  return (
    <button
      onClick={() => openSignIn()}
      className="w-full h-12 rounded-xl bg-white text-[#1a1a1a] font-semibold text-sm flex items-center justify-center gap-3 hover:bg-white/90 active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(255,255,255,0.15)]"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      Continue with Google
    </button>
  );
}

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
          <span className="text-[10px] font-mono tracking-[0.4em] text-primary/70 uppercase">Personal</span>
        </div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-2 leading-tight">Fitness RPG</h1>
        <p className="text-sm font-mono text-primary mb-6 tracking-wider">─── ISEKAI EDITION ───</p>

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
            <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/40 bg-card/30">
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <GoogleButton />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/30" />
            <span className="text-[10px] font-mono text-muted-foreground/50">or</span>
            <div className="flex-1 h-px bg-border/30" />
          </div>

          <Link href="/sign-in">
            <button className="w-full h-11 rounded-xl border border-border/60 bg-black/20 text-foreground font-medium text-sm hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.98]">
              Sign in with Email
            </button>
          </Link>

          <p className="text-[11px] text-muted-foreground/50 text-center">
            New adventurer?{" "}
            <Link href="/sign-up">
              <span className="text-primary underline cursor-pointer">Create an account</span>
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom badge */}
      <div className="relative z-10 flex justify-center pb-8">
        <span className="text-[10px] font-mono text-muted-foreground/40 tracking-widest">YOUR STATS ARE YOUR POWER</span>
      </div>
    </div>
  );
}
