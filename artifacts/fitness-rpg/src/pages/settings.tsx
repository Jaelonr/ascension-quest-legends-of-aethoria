import { useState, useEffect } from "react";
import { useAuth, useClerk } from "@clerk/react";
import { useResetPlayer } from "@workspace/api-client-react";
import { clearOnboardingAndSetup } from "@/hooks/use-story";
import { useLocation } from "wouter";
import { useSettings } from "@/hooks/use-settings";
import { useBiometric } from "@/hooks/use-biometric";
import { useNotifications } from "@/hooks/use-notifications";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { AethoriaHeader, AethoriaPage } from "@/components/shared/aethoria-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Bell, Shield, Fingerprint, Smartphone, Palette,
  Scale, Download, Info, ChevronRight, Check,
  Loader2, AlertCircle, Activity, Eye, Database,
  Moon, Zap, Clock, Swords, LogIn, LogOut, User, RefreshCw, TriangleAlert, Volume2, SlidersHorizontal,
} from "lucide-react";

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
  iconColor = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  children?: React.ReactNode;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0">
      <div className={cn("w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center shrink-0", iconColor.replace("text-", "bg-").replace("-400", "-500/10").replace("-500", "-500/10"))}>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors shrink-0",
        checked ? "bg-primary" : "bg-border",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <span className={cn(
        "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
        checked ? "translate-x-6" : "translate-x-1"
      )} />
    </button>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
    </div>
  );
}

const ACCENT_COLORS = [
  { id: "cyan", label: "Cyan", class: "bg-cyan-400", border: "border-cyan-400" },
  { id: "purple", label: "Purple", class: "bg-purple-400", border: "border-purple-400" },
  { id: "green", label: "Green", class: "bg-green-400", border: "border-green-400" },
  { id: "orange", label: "Orange", class: "bg-orange-400", border: "border-orange-400" },
  { id: "red", label: "Red", class: "bg-red-400", border: "border-red-400" },
  { id: "yellow", label: "Gold", class: "bg-yellow-400", border: "border-yellow-400" },
];

const REMINDER_TIMES = [
  "06:00", "07:00", "08:00", "09:00", "10:00",
  "12:00", "15:00", "17:00", "18:00", "19:00", "20:00", "21:00",
];

const devAuthBypass =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === "true";

function AccountAction() {
  if (devAuthBypass) {
    return (
      <div className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-sm font-semibold">
        <LogIn className="w-4 h-4" />
        Development Auth Active
      </div>
    );
  }

  return <ClerkAccountAction />;
}

function ClerkAccountAction() {
  const { isSignedIn } = useAuth();
  const { signOut, openSignIn } = useClerk();

  return isSignedIn ? (
    <button
      onClick={() => signOut({ redirectUrl: "/" })}
      className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-red-950/30 border border-red-800/40 text-red-400 hover:bg-red-950/50 hover:border-red-700/60 hover:text-red-300 transition-all text-sm font-semibold"
    >
      <LogOut className="w-4 h-4" />
      Sign Out
    </button>
  ) : (
    <button
      onClick={() => openSignIn()}
      className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-blue-950/30 border border-blue-700/40 text-blue-400 hover:bg-blue-950/50 hover:border-blue-600/60 hover:text-blue-300 transition-all text-sm font-semibold"
    >
      <LogIn className="w-4 h-4" />
      Sign In
    </button>
  );
}

export default function Settings() {
  const [, navigate] = useLocation();
  const [confirmReset, setConfirmReset] = useState(false);
  const resetPlayer = useResetPlayer({
    mutation: {
      onSuccess: () => {
        clearOnboardingAndSetup();
        navigate("/onboarding");
      },
    },
  });
  const { settings, setSetting } = useSettings();
  const { isSupported: biometricSupported, isRegistered, register, deregister } = useBiometric();
  const { isSupported: notifSupported, permission, requestPermission, sendNotification, scheduleReminder, cancelReminders } = useNotifications();
  const { canInstall, isInstalled, install, isInstalling } = usePwaInstall();
  const { toast } = useToast();

  const [biometricLoading, setBiometricLoading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  const registered = isRegistered();

  useEffect(() => {
    if (settings.notifications.enabled && settings.notifications.workoutReminder && permission === "granted") {
      scheduleReminder(settings.notifications.reminderTime, "Time to train, adventurer. Your stats await.");
    } else {
      cancelReminders();
    }
  }, [settings.notifications.enabled, settings.notifications.workoutReminder, settings.notifications.reminderTime, permission]);

  const handleNotificationsToggle = async (enabled: boolean) => {
    if (enabled && permission !== "granted") {
      setNotifLoading(true);
      const result = await requestPermission();
      setNotifLoading(false);
      if (result !== "granted") {
        toast({ title: "Permission denied", description: "Enable notifications in your browser/device settings.", variant: "destructive" });
        return;
      }
      sendNotification("Ascension Quest", { body: "Notifications enabled. Your journey continues." });
    }
    setSetting("notifications", "enabled", enabled);
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled && !registered) {
      setBiometricLoading(true);
      const result = await register();
      setBiometricLoading(false);
      if (!result.ok) {
        toast({ title: "Setup failed", description: result.error ?? "Could not register biometrics.", variant: "destructive" });
        return;
      }
      toast({ title: "Biometric lock enabled", description: "Your app will lock when closed." });
    } else if (!enabled && registered) {
      deregister();
    }
    setSetting("security", "biometricEnabled", enabled);
  };

  const appVersion = __APP_VERSION__;

  return (
    <AethoriaPage className="animate-in fade-in duration-500">
      <AethoriaHeader icon={SlidersHorizontal} title="Guild Settings" subtitle="Controls, safety, privacy, and presentation" />

      {/* Account */}
      <SectionHeader title="Account" icon={User} />
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-3">
          <AccountAction />

          {/* Recreate Character */}
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-amber-950/20 border border-amber-800/30 text-amber-500/80 hover:bg-amber-950/40 hover:border-amber-700/50 hover:text-amber-400 transition-all text-sm font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              Recreate Character
            </button>
          ) : (
            <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <TriangleAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-300">Reset all progress?</p>
                  <p className="text-[11px] text-amber-500/80 mt-0.5 leading-relaxed">
                    Your level, gold, stats, inventory, and achievements will be wiped. You'll restart character creation from the beginning.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 py-2 rounded-lg border border-border/50 bg-black/20 text-muted-foreground text-sm font-medium hover:bg-black/40 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => resetPlayer.mutate()}
                  disabled={resetPlayer.isPending}
                  className="flex-1 py-2 rounded-lg bg-amber-700/30 border border-amber-600/50 text-amber-300 text-sm font-semibold hover:bg-amber-700/50 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {resetPlayer.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Yes, reset
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Install App */}
      {(canInstall || isInstalled) && (
        <>
          <SectionHeader title="App" icon={Smartphone} />
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <SettingRow
                icon={Download}
                label={isInstalled ? "App Installed" : "Install App"}
                description={isInstalled ? "Running as installed app" : "Add to Home Screen for faster access & offline support"}
                iconColor="text-primary"
              >
                {isInstalled ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={install} disabled={isInstalling}>
                    {isInstalling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    Install
                  </Button>
                )}
              </SettingRow>
            </CardContent>
          </Card>
        </>
      )}

      {/* Notifications */}
      <SectionHeader title="Notifications" icon={Bell} />
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-0">
          <SettingRow
            icon={Bell}
            label="Push Notifications"
            description={!notifSupported ? "Not supported on this browser" : permission === "denied" ? "Blocked — enable in browser settings" : "Get alerts for activity and reminders"}
            iconColor="text-yellow-400"
          >
            <Toggle
              checked={settings.notifications.enabled && permission === "granted"}
              onChange={handleNotificationsToggle}
              disabled={notifLoading || !notifSupported || permission === "denied"}
            />
          </SettingRow>

          {settings.notifications.enabled && permission === "granted" && (
            <>
              <SettingRow icon={Clock} label="Workout Reminder" description="Daily reminder to train" iconColor="text-blue-400">
                <Toggle
                  checked={settings.notifications.workoutReminder}
                  onChange={v => setSetting("notifications", "workoutReminder", v)}
                />
              </SettingRow>

              {settings.notifications.workoutReminder && (
                <div className="pb-3 border-b border-border/30">
                  <div className="text-[10px] text-muted-foreground mb-2 ml-11">Reminder time</div>
                  <div className="flex flex-wrap gap-1.5 ml-11">
                    {REMINDER_TIMES.map(t => (
                      <button
                        key={t}
                        onClick={() => setSetting("notifications", "reminderTime", t)}
                        className={cn(
                          "px-2 py-1 rounded border text-[10px] font-mono transition-all",
                          settings.notifications.reminderTime === t
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <SettingRow icon={Zap} label="Achievement Alerts" description="Notify when you earn achievements" iconColor="text-yellow-400">
                <Toggle
                  checked={settings.notifications.achievements}
                  onChange={v => setSetting("notifications", "achievements", v)}
                />
              </SettingRow>

              <SettingRow icon={Swords} label="Raid Alerts" description="Notify for new boss raids" iconColor="text-red-400">
                <Toggle
                  checked={settings.notifications.raids}
                  onChange={v => setSetting("notifications", "raids", v)}
                />
              </SettingRow>

              <SettingRow icon={Activity} label="Streak Alerts" description="Alert when your streak is at risk" iconColor="text-orange-400">
                <Toggle
                  checked={settings.notifications.streakAlert}
                  onChange={v => setSetting("notifications", "streakAlert", v)}
                />
              </SettingRow>
            </>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <SectionHeader title="Security" icon={Shield} />
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-0">
          <SettingRow
            icon={Fingerprint}
            label="Biometric Lock"
            description={
              !biometricSupported
                ? "Not supported on this device"
                : registered
                ? "App locks when you leave — unlock with Face ID or fingerprint"
                : "Use Face ID or fingerprint to protect your data"
            }
            iconColor="text-green-400"
          >
            {biometricLoading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Toggle
                checked={settings.security.biometricEnabled && registered}
                onChange={handleBiometricToggle}
                disabled={!biometricSupported}
              />
            )}
          </SettingRow>

          {settings.security.biometricEnabled && registered && (
            <SettingRow icon={Clock} label="Auto-Lock" description="Lock when switching apps" iconColor="text-blue-400">
              <Toggle
                checked={settings.security.autoLock}
                onChange={v => setSetting("security", "autoLock", v)}
              />
            </SettingRow>
          )}

          {!biometricSupported && (
            <div className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span className="text-[10px] text-yellow-400">Install the app and open from Home Screen for biometric support</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gameplay */}
      <SectionHeader title="Gameplay" icon={Swords} />
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Swords className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-medium">Narrative Intensity</div>
              <div className="text-[11px] text-muted-foreground">How your workouts are told as battle stories</div>
            </div>
          </div>
          <div className="space-y-2 ml-11">
            {([
              { id: "technical",  label: "Technical",  desc: "Real fitness data. Sets, reps, numbers — no story text." },
              { id: "balanced",   label: "Balanced",   desc: "Mix of guild narrative and actual training metrics." },
              { id: "immersive",  label: "Immersive",  desc: "Full fantasy language. Your workout becomes an epic." },
            ] as const).map(opt => (
              <button
                key={opt.id}
                onClick={() => setSetting("narrative", "intensity", opt.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border transition-all",
                  settings.narrative.intensity === opt.id
                    ? "border-amber-600/60 bg-amber-950/30 text-amber-300"
                    : "border-border/40 bg-black/10 text-muted-foreground hover:border-amber-800/40 hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{opt.label}</span>
                  {settings.narrative.intensity === opt.id && (
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Units & Preferences */}
      <SectionHeader title="Units & Preferences" icon={Scale} />
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-0">
          <SettingRow icon={Scale} label="Measurement System" description="Imperial is the default for setup and profile" iconColor="text-amber-400">
            <div className="flex rounded-lg border border-border/50 overflow-hidden">
              {[
                { id: "imperial", label: "Imperial", weight: "lbs", distance: "mi" },
                { id: "metric", label: "Metric", weight: "kg", distance: "km" },
              ].map(system => {
                const active = settings.units.weight === system.weight && settings.units.distance === system.distance;
                return (
                  <button
                    key={system.id}
                    onClick={() => {
                      setSetting("units", "weight", system.weight as "kg" | "lbs");
                      setSetting("units", "distance", system.distance as "km" | "mi");
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-mono transition-all",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {system.label}
                  </button>
                );
              })}
            </div>
          </SettingRow>

          <SettingRow icon={Scale} label="Weight Unit" description="For workout logs and biometrics" iconColor="text-cyan-400">
            <div className="flex rounded-lg border border-border/50 overflow-hidden">
              {(["kg", "lbs"] as const).map(unit => (
                <button
                  key={unit}
                  onClick={() => setSetting("units", "weight", unit)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-mono transition-all",
                    settings.units.weight === unit
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {unit}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow icon={Activity} label="Distance Unit" description="For cardio and running" iconColor="text-purple-400">
            <div className="flex rounded-lg border border-border/50 overflow-hidden">
              {(["km", "mi"] as const).map(unit => (
                <button
                  key={unit}
                  onClick={() => setSetting("units", "distance", unit)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-mono transition-all",
                    settings.units.distance === unit
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {unit}
                </button>
              ))}
            </div>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Appearance */}
      <SectionHeader title="Appearance" icon={Palette} />
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-0">
          <div className="py-3 border-b border-border/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Palette className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">Accent Color</div>
                <div className="text-[11px] text-muted-foreground">Customize your adventurer's theme</div>
              </div>
            </div>
            <div className="flex gap-2 ml-11 flex-wrap">
              {ACCENT_COLORS.map(color => (
                <button
                  key={color.id}
                  onClick={() => setSetting("appearance", "accentColor", color.id)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-transform",
                    color.class,
                    settings.appearance.accentColor === color.id
                      ? `${color.border} scale-125 shadow-lg`
                      : "border-transparent hover:scale-110 opacity-70"
                  )}
                  title={color.label}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground ml-11 mt-2 opacity-60">Full color engine coming in next update</p>
          </div>

          <SettingRow icon={Volume2} label="Sound Effects" description="Level-up chimes, gold pings, workout fanfare" iconColor="text-cyan-400">
            <Toggle
              checked={settings.sounds?.enabled ?? true}
              onChange={v => setSetting("sounds", "enabled", v)}
            />
          </SettingRow>

          <SettingRow icon={Moon} label="Reduced Motion" description="Disable animations for performance" iconColor="text-indigo-400">
            <Toggle
              checked={settings.appearance.reducedMotion}
              onChange={v => setSetting("appearance", "reducedMotion", v)}
            />
          </SettingRow>

          <SettingRow icon={Zap} label="Compact Mode" description="Tighter spacing for more content" iconColor="text-orange-400">
            <Toggle
              checked={settings.appearance.compactMode}
              onChange={v => setSetting("appearance", "compactMode", v)}
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Narrative Engine */}
      <SectionHeader title="Narrative Engine" icon={Swords} />
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">Battle Narrative Intensity</p>
            <p className="text-xs text-muted-foreground mb-4">Controls how your workout results are told as a combat story when finishing a session.</p>
            <div className="space-y-2.5">
              {(["technical", "balanced", "immersive"] as const).map(level => {
                const meta = {
                  technical: { label: "Technical", desc: "Real fitness data. Sets, reps, numbers — no story text.", icon: "📊", color: "text-gray-400" },
                  balanced:  { label: "Balanced",  desc: "Mix of guild narrative and actual training metrics.",    icon: "⚔️", color: "text-cyan-400" },
                  immersive: { label: "Immersive", desc: "Full fantasy language. Your workout becomes an epic.",   icon: "🔥", color: "text-orange-400" },
                }[level];
                const active = (settings.narrative?.intensity ?? "balanced") === level;
                return (
                  <button
                    key={level}
                    onClick={() => setSetting("narrative", "intensity", level)}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all duration-150 ${
                      active
                        ? "border-primary/50 bg-primary/10 shadow-[0_0_12px_rgba(var(--primary)/0.15)]"
                        : "border-border/40 bg-black/20 hover:border-border hover:bg-white/5"
                    }`}
                  >
                    <span className="text-xl mt-0.5 shrink-0">{meta.icon}</span>
                    <div className="flex-1">
                      <div className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                        {meta.label}
                        {active && <span className="ml-2 text-[9px] font-mono uppercase tracking-widest opacity-70">Active</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 mt-1 shrink-0 flex items-center justify-center transition-all ${
                      active ? "border-primary bg-primary" : "border-border/50 bg-transparent"
                    }`}>
                      {active && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <SectionHeader title="Data & Privacy" icon={Eye} />
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-0">
          <SettingRow icon={Activity} label="Usage Analytics" description="Help improve the app with anonymous data" iconColor="text-blue-400">
            <Toggle
              checked={settings.privacy.analyticsEnabled}
              onChange={v => setSetting("privacy", "analyticsEnabled", v)}
            />
          </SettingRow>

          <SettingRow icon={Database} label="Crash Reports" description="Send crash info to fix bugs faster" iconColor="text-purple-400">
            <Toggle
              checked={settings.privacy.crashReports}
              onChange={v => setSetting("privacy", "crashReports", v)}
            />
          </SettingRow>

          <SettingRow icon={Database} label="Export My Data" description="Download all your training history" iconColor="text-green-400">
            <button
              onClick={() => navigate("/data")}
              className="text-xs text-primary font-medium flex items-center gap-1"
            >
              Roadmap <ChevronRight className="w-3 h-3" />
            </button>
          </SettingRow>
        </CardContent>
      </Card>

      {/* About */}
      <SectionHeader title="About" icon={Info} />
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-0">
          <SettingRow icon={Swords} label="Ascension Quest: Legends of Aethoria" description={`Version ${appVersion}`} iconColor="text-primary">
            <span className="text-[10px] font-mono text-muted-foreground">v{appVersion}</span>
          </SettingRow>

          <SettingRow icon={Shield} label="Privacy Policy" description="Launch policy surface and wearable disclosure" iconColor="text-muted-foreground">
            <button onClick={() => navigate("/privacy")} className="text-xs text-primary flex items-center gap-1">
              View <ChevronRight className="w-3 h-3" />
            </button>
          </SettingRow>

          <SettingRow icon={Info} label="Terms & Health Disclaimer" description="General coaching boundaries, pain guidance, and launch notes" iconColor="text-muted-foreground">
            <button onClick={() => navigate("/terms")} className="text-xs text-primary flex items-center gap-1">
              View <ChevronRight className="w-3 h-3" />
            </button>
          </SettingRow>

          <SettingRow icon={Database} label="Configuration Checklist" description="Auth, database, OpenAI, mock mode, legal pages, and export/delete workflow" iconColor="text-muted-foreground">
            <button onClick={() => navigate("/data")} className="text-xs text-primary flex items-center gap-1">
              Open <ChevronRight className="w-3 h-3" />
            </button>
          </SettingRow>

          <SettingRow icon={Info} label="Open Source" description="Built with React, Express, PostgreSQL" iconColor="text-muted-foreground">
            <span className="text-[10px] text-muted-foreground">MIT</span>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        className="h-12 w-full gap-2 rounded-none bg-[#74291f] text-base font-bold text-[#f1dfc6] shadow-[0_0_20px_rgba(142,53,37,0.35)] hover:bg-[#8c3527]"
        onClick={() => toast({ title: "✓ Settings saved", description: "Your preferences have been applied." })}
      >
        <Check className="w-4 h-4" />
        Save Settings
      </Button>
    </AethoriaPage>
  );
}
