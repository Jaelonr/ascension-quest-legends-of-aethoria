import { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { InstallBanner } from "@/components/install-banner";
import { BiometricLock } from "@/components/biometric-lock";
import { LevelUpOverlay } from "@/components/level-up-overlay";
import { useLevelUpDetector } from "@/hooks/use-level-up";

interface MainLayoutProps {
  children: ReactNode;
}

function LevelUpWatcher() {
  const { levelUpInfo, dismiss } = useLevelUpDetector();
  if (!levelUpInfo) return null;
  return <LevelUpOverlay info={levelUpInfo} onDismiss={dismiss} />;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <BiometricLock>
      <LevelUpWatcher />
      <div className="min-h-screen bg-background text-foreground pb-20">
        <InstallBanner />
        <main className="max-w-md mx-auto p-4 animate-in fade-in duration-300">
          {children}
        </main>
        <BottomNav />
      </div>
    </BiometricLock>
  );
}
