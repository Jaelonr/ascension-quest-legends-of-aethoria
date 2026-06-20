import { ReactNode } from "react";
import { useLocation } from "wouter";
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
        <BottomNav />
      </div>
    </BiometricLock>
  );
}
