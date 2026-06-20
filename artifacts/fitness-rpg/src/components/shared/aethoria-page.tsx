import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AethoriaPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("min-h-screen space-y-5 bg-[#0c0b09] bg-cover bg-top p-4 pb-24 text-[#eee5d7] md:p-6", className)}
      style={{ backgroundImage: "url('/assets/guild-hall-background.png')" }}
    >
      {children}
    </div>
  );
}

export function AethoriaHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: ElementType;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="border-b border-[#6d4a25] pb-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center border border-[#8c6a36] bg-[#15130f] text-[#d09b43]">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-2xl font-bold tracking-wide text-[#e5c386]">{title}</h1>
          {subtitle && <p className="text-[10px] uppercase tracking-[0.2em] text-[#9f9586]">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function AethoriaPanel({
  children,
  className,
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <section className={cn("border bg-[#11100e] p-4", accent ? "border-[#6b4d2f]" : "border-[#3b3328]", className)}>
      {children}
    </section>
  );
}

export function AethoriaSectionTitle({ icon: Icon, children }: { icon: ElementType; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-[#3b3328] pb-2">
      <Icon className="size-4 text-[#d9ad63]" />
      <h2 className="font-serif text-base font-bold text-[#d9ad63]">{children}</h2>
    </div>
  );
}
