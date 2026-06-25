import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Settings } from "lucide-react";
import { BottomNav } from "./bottom-nav";
import { InstallBanner } from "@/components/install-banner";
import { BiometricLock } from "@/components/biometric-lock";
import { LevelUpOverlay } from "@/components/level-up-overlay";
import { AwakeningOverlay } from "@/components/awakening-overlay";
import { useLevelUpDetector } from "@/hooks/use-level-up";
import { useAwakeningDetector } from "@/hooks/use-awakening";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

function LevelUpWatcher() {
  const { levelUpInfo, dismiss } = useLevelUpDetector();
  if (!levelUpInfo) return null;
  return <LevelUpOverlay info={levelUpInfo} onDismiss={dismiss} />;
}

function AwakeningWatcher() {
  const { awakeningInfo, dismiss } = useAwakeningDetector();
  if (!awakeningInfo) return null;
  return <AwakeningOverlay info={awakeningInfo} onDismiss={dismiss} />;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const wideGuildHall = location === "/guild-hall" || location === "/";
  const showSettingsGear = location !== "/settings";
  return (
    <BiometricLock>
      <LevelUpWatcher />
      <AwakeningWatcher />
      <div
        className="min-h-screen bg-[#0c0b09] bg-cover bg-top pb-20 text-foreground"
        style={{ backgroundImage: "url('/assets/guild-hall-background.png')" }}
      >
        <InstallBanner />
        <main className={cn(
          "mx-auto animate-in fade-in duration-300",
          wideGuildHall ? "max-w-5xl p-0 md:pt-20" : "max-w-md p-4 md:pt-24",
        )}>
          {children}
        </main>
        {showSettingsGear && (
          <Link
            href="/settings"
            aria-label="Open Guild Settings"
            className="fixed right-4 z-40 flex size-11 items-center justify-center border border-[#6b4d2f] bg-[#11100e]/95 text-[#d9ad63] shadow-[0_0_18px_rgba(217,173,99,0.16)] transition-colors hover:border-[#d9ad63] hover:bg-[#1b1511]"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
          >
            <Settings className="size-5" />
          </Link>
        )}
        <BottomNav />
      </div>
    </BiometricLock>
  );
}
