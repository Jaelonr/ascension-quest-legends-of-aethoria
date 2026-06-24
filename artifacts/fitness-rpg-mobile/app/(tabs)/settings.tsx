import { useAuth, useClerk } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useResetPlayer } from "@workspace/api-client-react";
import { clearMobileOnboarding } from "@/utils/onboarding";
import {
  DEFAULT_MOBILE_SETTINGS,
  loadMobileSettings,
  saveMobileSettings,
  type AccentColor,
  type MobileSettings,
} from "@/utils/mobile-settings";
import { LEGAL_COPY } from "@/utils/legal-copy";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const REMINDER_TIMES = ["06:00", "07:00", "08:00", "09:00", "12:00", "15:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

const ACCENT_COLORS: Array<{ id: AccentColor; label: string; color: string }> = [
  { id: "gold", label: "Gold", color: "#d9ad63" },
  { id: "cyan", label: "Cyan", color: "#22d3ee" },
  { id: "green", label: "Green", color: "#4ade80" },
  { id: "orange", label: "Orange", color: "#fb923c" },
  { id: "red", label: "Red", color: "#f87171" },
  { id: "purple", label: "Purple", color: "#c084fc" },
];

type SettingsPanelKey = "account" | "record" | "units" | "presentation" | "reminders" | "health" | "data" | "diagnostics";

const SETTINGS_WHEEL: Array<{
  key: SettingsPanelKey;
  label: string;
  short: string;
  icon: keyof typeof Feather.glyphMap;
  description: string;
}> = [
  { key: "account", label: "Account", short: "Acct", icon: "user", description: "Sign-in, identity, and session controls." },
  { key: "record", label: "Record", short: "Record", icon: "file-text", description: "System interrogation, character rebuild, and profile shortcuts." },
  { key: "units", label: "Units", short: "Units", icon: "sliders", description: "Imperial, metric, weight, and distance display." },
  { key: "presentation", label: "Presentation", short: "Audio", icon: "volume-2", description: "Narrative, sound, motion, and visual preferences." },
  { key: "reminders", label: "Reminders", short: "Bell", icon: "bell", description: "Workout, streak, achievement, and raid alerts." },
  { key: "health", label: "Health", short: "Health", icon: "activity", description: "Wearables, Health Connect, Samsung, and security readiness." },
  { key: "data", label: "Data", short: "Data", icon: "shield", description: "Privacy, legal, analytics, export, and deletion controls." },
  { key: "diagnostics", label: "Diagnostics", short: "Build", icon: "server", description: "API, Clerk, runtime, and launch readiness." },
];

function Section({
  icon,
  title,
  visible = true,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  visible?: boolean;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Feather name={icon} size={14} color="#9d8f80" />
        <Text style={s.sectionLabel}>{title}</Text>
      </View>
      <View style={s.card}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  description,
  right,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={s.rowIcon}>
        <Feather name={icon} size={16} color="#d9ad63" />
      </View>
      <View style={s.rowText}>
        <Text style={s.rowLabel}>{label}</Text>
        {description ? <Text style={s.rowDesc}>{description}</Text> : null}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={17} color="#6b5d4f" /> : null)}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={s.row} activeOpacity={0.78} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={s.row}>{content}</View>;
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <Row
      icon={icon}
      label={label}
      description={description}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          thumbColor={value ? "#d9ad63" : "#8f887d"}
          trackColor={{ false: "#2a2520", true: "#6b4d2f" }}
        />
      }
    />
  );
}

function Choice({
  label,
  description,
  active,
  onPress,
}: {
  label: string;
  description: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.choice, active && s.choiceActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[s.radio, active && s.radioActive]}>
        {active ? <View style={s.radioDot} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.choiceLabel, active && s.choiceLabelActive]}>{label}</Text>
        <Text style={s.choiceDesc}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipActive]} onPress={onPress} activeOpacity={0.82}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Swatch({
  label,
  color,
  active,
  onPress,
}: {
  label: string;
  color: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={`${label} accent color`}
      style={[s.swatchButton, active && s.swatchButtonActive]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[s.swatch, { backgroundColor: color }]} />
      <Text style={[s.swatchLabel, active && s.swatchLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const resetPlayer = useResetPlayer({
    mutation: {
      onSuccess: async () => {
        await clearMobileOnboarding();
        router.replace("/onboarding" as any);
      },
      onError: () => Alert.alert("Reset failed", "The Guild could not recreate your character yet. Try again in a moment."),
    },
  });

  const [settings, setSettings] = useState<MobileSettings>(DEFAULT_MOBILE_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [activePanel, setActivePanel] = useState<SettingsPanelKey>("account");

  const environment = useMemo(() => {
    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "Not configured";
    const devBypass = process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS === "true";
    const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? "Configured" : "Missing";
    const clerkProxy = process.env.EXPO_PUBLIC_CLERK_PROXY_URL ? "Configured" : "Missing";
    return { apiBase, devBypass, clerkKey, clerkProxy };
  }, []);

  useEffect(() => {
    let mounted = true;
    loadMobileSettings()
      .then((next) => {
        if (!mounted) return;
        setSettings(next);
      })
      .catch(() => undefined)
      .finally(() => mounted && setLoaded(true));
    return () => {
      mounted = false;
    };
  }, []);

  const updateSettings = (next: MobileSettings) => {
    setSettings(next);
    saveMobileSettings(next).catch(() => undefined);
  };

  const setSetting = <K extends keyof MobileSettings>(key: K, value: MobileSettings[K]) => {
    updateSettings({ ...settings, [key]: value });
  };

  const setMeasurementSystem = (units: MobileSettings["units"]) => {
    updateSettings({
      ...settings,
      units,
      weightUnit: units === "metric" ? "kg" : "lbs",
      distanceUnit: units === "metric" ? "km" : "mi",
    });
  };

  const showCopy = (key: keyof typeof LEGAL_COPY) => {
    Alert.alert(LEGAL_COPY[key].title, LEGAL_COPY[key].body);
  };

  const confirmReset = () => {
    Alert.alert(
      "Recreate character?",
      "This restarts character creation and resets your current progress. Existing production data should only be reset intentionally.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => resetPlayer.mutate() },
      ],
    );
  };

  const handleSignOut = () => {
    if (!isSignedIn) {
      router.replace("/(auth)/sign-in" as any);
      return;
    }
    Alert.alert("Sign out?", "You can return to the Guild by signing in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in" as any);
        },
      },
    ]);
  };

  const activePanelMeta = SETTINGS_WHEEL.find((item) => item.key === activePanel) ?? SETTINGS_WHEEL[0];

  if (!loaded) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color="#d9ad63" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 108, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.eyebrow}>GUILD SETTINGS</Text>
        <Text style={s.title}>Controls, Safety, And Readiness</Text>
        <Text style={s.subtitle}>
          Account access, measurement defaults, health boundaries, privacy controls, and production checks.
        </Text>

        <View style={s.wheelShell}>
          <View style={s.wheelCenter}>
            <Feather name={activePanelMeta.icon} size={22} color="#7ddce4" />
            <Text style={s.wheelCenterTitle}>{activePanelMeta.label}</Text>
            <Text style={s.wheelCenterDesc}>{activePanelMeta.description}</Text>
          </View>
          <View style={s.wheelGrid}>
            {SETTINGS_WHEEL.map((item) => {
              const active = item.key === activePanel;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[s.wheelNode, active && s.wheelNodeActive]}
                  onPress={() => setActivePanel(item.key)}
                  activeOpacity={0.82}
                >
                  <Feather name={item.icon} size={16} color={active ? "#061010" : "#d9ad63"} />
                  <Text style={[s.wheelNodeText, active && s.wheelNodeTextActive]}>{item.short}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Section icon="user" title="Account" visible={activePanel === "account"}>
          <Row
            icon={isSignedIn ? "log-out" : "log-in"}
            label={isSignedIn ? "Sign Out" : "Sign In"}
            description={isSignedIn ? "Leave this device without deleting progress." : "Return to the sign-in screen."}
            onPress={handleSignOut}
          />
          <Row
            icon="refresh-cw"
            label="Recreate Character"
            description="Restart setup if you want to rebuild your adventurer from the System interrogation."
            right={resetPlayer.isPending ? <ActivityIndicator color="#d9ad63" /> : <Feather name="alert-triangle" size={17} color="#b7533d" />}
            onPress={confirmReset}
          />
        </Section>

        <Section icon="file-text" title="System Record" visible={activePanel === "record"}>
          <Row
            icon="user-check"
            label="Open System Record"
            description="Update biometrics, equipment, notes, and profile details used for commissions."
            onPress={() => router.push("/profile" as any)}
          />
          <Row
            icon="refresh-cw"
            label="Restart Interrogation"
            description="Replay the summoning setup and rebuild your adventurer record."
            right={resetPlayer.isPending ? <ActivityIndicator color="#d9ad63" /> : <Feather name="alert-triangle" size={17} color="#b7533d" />}
            onPress={confirmReset}
          />
          <Row
            icon="shield"
            label="Character Tab"
            description="Return to the Adventurer Record, loadout, titles, class path, and armory."
            onPress={() => router.push("/(tabs)/inventory" as any)}
          />
        </Section>

        <Section icon="sliders" title={activePanel === "units" ? "Units And Measurements" : "Audio And Presentation"} visible={activePanel === "units" || activePanel === "presentation"}>
          <Choice
            label="Imperial"
            description="Default for this build: pounds, inches, miles, and calories."
            active={settings.units === "imperial"}
            onPress={() => setMeasurementSystem("imperial")}
          />
          <Choice
            label="Metric"
            description="Kilograms, centimeters, and kilometers for players who prefer metric display."
            active={settings.units === "metric"}
            onPress={() => setMeasurementSystem("metric")}
          />
          <View style={s.inlinePanel}>
            <View style={s.inlineHeading}>
              <Feather name="bar-chart-2" size={14} color="#d9ad63" />
              <View style={{ flex: 1 }}>
                <Text style={s.inlineTitle}>Weight Unit</Text>
                <Text style={s.inlineDesc}>Used for lifts, biometrics, and workout logs.</Text>
              </View>
            </View>
            <View style={s.segmentRow}>
              {(["lbs", "kg"] as const).map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[s.segmentButton, settings.weightUnit === unit && s.segmentButtonActive]}
                  onPress={() => setSetting("weightUnit", unit)}
                  activeOpacity={0.82}
                >
                  <Text style={[s.segmentText, settings.weightUnit === unit && s.segmentTextActive]}>{unit}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={s.inlinePanel}>
            <View style={s.inlineHeading}>
              <Feather name="activity" size={14} color="#d9ad63" />
              <View style={{ flex: 1 }}>
                <Text style={s.inlineTitle}>Distance Unit</Text>
                <Text style={s.inlineDesc}>Used for cardio, route records, and travel summaries.</Text>
              </View>
            </View>
            <View style={s.segmentRow}>
              {(["mi", "km"] as const).map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[s.segmentButton, settings.distanceUnit === unit && s.segmentButtonActive]}
                  onPress={() => setSetting("distanceUnit", unit)}
                  activeOpacity={0.82}
                >
                  <Text style={[s.segmentText, settings.distanceUnit === unit && s.segmentTextActive]}>{unit}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Choice
            label="Balanced Narrative"
            description="Keeps the RPG flavor present while staying quick to read."
            active={settings.narrativeMode === "balanced"}
            onPress={() => setSetting("narrativeMode", "balanced")}
          />
          <Choice
            label="Immersive Narrative"
            description="Leans further into Aethoria, the Guild, Gates, and Chronicle framing."
            active={settings.narrativeMode === "immersive"}
            onPress={() => setSetting("narrativeMode", "immersive")}
          />
          <Choice
            label="Technical Narrative"
            description="Uses plainer fitness language when you want less story during logging."
            active={settings.narrativeMode === "technical"}
            onPress={() => setSetting("narrativeMode", "technical")}
          />
          <ToggleRow
            icon="volume-2"
            label="Sounds"
            description="Reserved for summoning, rewards, and Guild Hall feedback."
            value={settings.soundsEnabled}
            onValueChange={(v) => setSetting("soundsEnabled", v)}
          />
          <ToggleRow
            icon="eye"
            label="Reduced Motion"
            description="Limits dramatic motion once onboarding and reward animations are added."
            value={settings.reducedMotion}
            onValueChange={(v) => setSetting("reducedMotion", v)}
          />
          <ToggleRow
            icon="minimize-2"
            label="Compact Mode"
            description="Future display option for denser repeated logging."
            value={settings.compactMode}
            onValueChange={(v) => setSetting("compactMode", v)}
          />
          <View style={s.inlinePanel}>
            <View style={s.inlineHeading}>
              <Feather name="sliders" size={14} color="#d9ad63" />
              <View style={{ flex: 1 }}>
                <Text style={s.inlineTitle}>Accent Color</Text>
                <Text style={s.inlineDesc}>Matches the web presentation control. Full theme application is staged for a later visual pass.</Text>
              </View>
            </View>
            <View style={s.swatchGrid}>
              {ACCENT_COLORS.map((color) => (
                <Swatch
                  key={color.id}
                  label={color.label}
                  color={color.color}
                  active={settings.accentColor === color.id}
                  onPress={() => setSetting("accentColor", color.id)}
                />
              ))}
            </View>
          </View>
        </Section>

        <Section icon="bell" title="Notifications" visible={activePanel === "reminders"}>
          <ToggleRow
            icon="bell"
            label="Push Notifications"
            description="Preference saved here; native delivery still needs platform permission wiring."
            value={settings.notificationsEnabled}
            onValueChange={(v) => setSetting("notificationsEnabled", v)}
          />
          <ToggleRow
            icon="clock"
            label="Workout Reminder"
            description="Daily training reminder preference for the production notification worker."
            value={settings.workoutReminder}
            onValueChange={(v) => setSetting("workoutReminder", v)}
          />
          {settings.workoutReminder ? (
            <View style={s.inlinePanel}>
              <View style={s.inlineHeading}>
                <Feather name="clock" size={14} color="#d9ad63" />
                <View style={{ flex: 1 }}>
                  <Text style={s.inlineTitle}>Reminder Time</Text>
                  <Text style={s.inlineDesc}>Saved locally until native notification scheduling is wired.</Text>
                </View>
              </View>
              <View style={s.chipGrid}>
                {REMINDER_TIMES.map((time) => (
                  <Chip
                    key={time}
                    label={time}
                    active={settings.reminderTime === time}
                    onPress={() => setSetting("reminderTime", time)}
                  />
                ))}
              </View>
            </View>
          ) : null}
          <ToggleRow
            icon="award"
            label="Achievement Alerts"
            description="Notify when titles, PRs, and major Chronicle marks are earned."
            value={settings.achievementAlerts}
            onValueChange={(v) => setSetting("achievementAlerts", v)}
          />
          <ToggleRow
            icon="flag"
            label="Raid Alerts"
            description="Notify when Gates, bosses, or campaign pressure need attention."
            value={settings.raidAlerts}
            onValueChange={(v) => setSetting("raidAlerts", v)}
          />
          <ToggleRow
            icon="activity"
            label="Streak Alerts"
            description="Warn when consistency is at risk without encouraging unsafe training."
            value={settings.streakAlerts}
            onValueChange={(v) => setSetting("streakAlerts", v)}
          />
        </Section>

        <Section icon="lock" title="Security" visible={activePanel === "health"}>
          <ToggleRow
            icon="shield"
            label="Biometric Lock"
            description="Preference saved; enforcement requires native secure storage and biometric unlock wiring."
            value={settings.biometricLock}
            onValueChange={(v) => setSetting("biometricLock", v)}
          />
          <ToggleRow
            icon="clock"
            label="Auto-Lock"
            description="Future native guard for when the app is backgrounded."
            value={settings.autoLock}
            onValueChange={(v) => setSetting("autoLock", v)}
          />
          <Row
            icon="alert-circle"
            label="Security Readiness"
            description="These settings mirror the web surface. Full device lock behavior should be implemented before production claims."
            right={<Text style={s.statusSoon}>Planned</Text>}
          />
        </Section>

        <Section icon="activity" title="Health Imports" visible={activePanel === "health"}>
          <Row
            icon="smartphone"
            label="Samsung Health"
            description="Target device path for your testing. Native permissions and deduplication still need final integration."
            right={<Text style={s.statusSoon}>Soon</Text>}
            onPress={() => router.push("/wearables" as any)}
          />
          <Row
            icon="heart"
            label="Health Connect"
            description="Android bridge for steps, sleep, workouts, and body metrics once permission handling is implemented."
            right={<Text style={s.statusSoon}>Soon</Text>}
            onPress={() => router.push("/wearables" as any)}
          />
          <Row
            icon="watch"
            label="Apple Health"
            description="Coming later for iOS builds. This Android APK does not sync Apple Health."
            right={<Text style={s.statusSoon}>Later</Text>}
            onPress={() => router.push("/wearables" as any)}
          />
        </Section>

        <Section icon="shield" title="Privacy And Data" visible={activePanel === "data"}>
          <ToggleRow
            icon="bar-chart-2"
            label="Analytics"
            description="Product improvement events. Keep optional for launch readiness."
            value={settings.analyticsEnabled}
            onValueChange={(v) => setSetting("analyticsEnabled", v)}
          />
          <ToggleRow
            icon="alert-circle"
            label="Crash Reports"
            description="Helps diagnose app failures during stress testing."
            value={settings.crashReports}
            onValueChange={(v) => setSetting("crashReports", v)}
          />
          <Row icon="file-text" label="Privacy Policy" description="What the app stores and why." onPress={() => router.push("/privacy" as any)} />
          <Row icon="clipboard" label="Terms And Health Disclaimer" description="Fitness guidance boundaries." onPress={() => router.push("/terms" as any)} />
          <Row icon="database" label="Export Or Delete Data" description="Production user-control roadmap." onPress={() => router.push("/data" as any)} />
        </Section>

        <Section icon="server" title="Production Readiness" visible={activePanel === "diagnostics"}>
          <Row icon="globe" label="API Domain" description={environment.apiBase} />
          <Row
            icon="lock"
            label="Clerk Publishable Key"
            description={environment.clerkKey === "Configured" ? "Mobile auth key is present in this build." : "Missing from this build."}
            right={<Text style={environment.clerkKey === "Configured" ? s.statusGood : s.statusBad}>{environment.clerkKey}</Text>}
          />
          <Row
            icon="repeat"
            label="Clerk Proxy"
            description={environment.clerkProxy === "Configured" ? "Proxy URL is present for production auth." : "Proxy URL missing."}
            right={<Text style={environment.clerkProxy === "Configured" ? s.statusGood : s.statusBad}>{environment.clerkProxy}</Text>}
          />
          <Row
            icon="terminal"
            label="Development Auth Bypass"
            description={environment.devBypass ? "Bypass is active; do not ship this as production." : "Bypass is off for real account testing."}
            right={<Text style={environment.devBypass ? s.statusBad : s.statusGood}>{environment.devBypass ? "On" : "Off"}</Text>}
          />
          <Row icon="check-square" label="Launch Checklist" description="Auth, database, OpenAI, mocks, legal, export/delete." onPress={() => showCopy("checklist")} />
          <Row icon="info" label="Ascension Quest: Legends of Aethoria" description="Mobile build 1.0.0" right={<Text style={s.versionBadge}>v1.0.0</Text>} />
          <Row icon="code" label="Runtime" description="Expo, React Native, Clerk, PostgreSQL API, and Aethoria shared contracts." />
        </Section>

        <TouchableOpacity
          style={s.saveButton}
          activeOpacity={0.86}
          onPress={() => Alert.alert("Settings saved", "Your mobile preferences have been applied.")}
        >
          <Feather name="check" size={16} color="#f1dfc6" />
          <Text style={s.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0908" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0908" },
  eyebrow: {
    color: "#9d8f80",
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontFamily: "Inter_400Regular",
  },
  title: {
    color: "#eee5d7",
    fontSize: 23,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  subtitle: { color: "#8f887d", fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 18 },
  wheelShell: { borderWidth: 1, borderColor: "#235e66", backgroundColor: "#061111", padding: 12, marginBottom: 18 },
  wheelCenter: { minHeight: 112, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#123637", backgroundColor: "#030908", padding: 14, marginBottom: 10 },
  wheelCenterTitle: { color: "#eee5d7", fontSize: 18, fontFamily: "PlayfairDisplay_700Bold", marginTop: 7 },
  wheelCenterDesc: { color: "#9f9586", fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 5 },
  wheelGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wheelNode: { width: "23.1%", minHeight: 58, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", alignItems: "center", justifyContent: "center", gap: 5 },
  wheelNodeActive: { borderColor: "#8be2df", backgroundColor: "#49a3a0" },
  wheelNodeText: { color: "#d8c4a5", fontSize: 9, letterSpacing: 0.7, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  wheelNodeTextActive: { color: "#061010" },
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sectionLabel: { color: "#9d8f80", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  card: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2520",
  },
  rowIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3b3328",
    backgroundColor: "#0c0b09",
  },
  rowText: { flex: 1 },
  rowLabel: { color: "#eee5d7", fontSize: 13, fontFamily: "Inter_700Bold" },
  rowDesc: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 3 },
  choice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2520",
    backgroundColor: "#11100e",
  },
  choiceActive: { backgroundColor: "#18130d" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#6b5d4f",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  radioActive: { borderColor: "#d9ad63" },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#d9ad63" },
  choiceLabel: { color: "#d8c4a5", fontSize: 13, fontFamily: "Inter_700Bold" },
  choiceLabelActive: { color: "#d9ad63" },
  choiceDesc: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 3 },
  inlinePanel: { padding: 13, borderBottomWidth: 1, borderBottomColor: "#2a2520", backgroundColor: "#0e0d0b" },
  inlineHeading: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  inlineTitle: { color: "#eee5d7", fontSize: 13, fontFamily: "Inter_700Bold" },
  inlineDesc: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 3 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", paddingHorizontal: 10, paddingVertical: 7 },
  chipActive: { borderColor: "#d9ad63", backgroundColor: "#24190d" },
  chipText: { color: "#9d8f80", fontSize: 11, fontFamily: "Inter_700Bold" },
  chipTextActive: { color: "#f1dfc6" },
  segmentRow: { flexDirection: "row", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#080706", overflow: "hidden" },
  segmentButton: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: "#2a2520" },
  segmentButtonActive: { backgroundColor: "#24190d" },
  segmentText: { color: "#8f887d", fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  segmentTextActive: { color: "#f1dfc6" },
  swatchGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swatchButton: { width: "30%", minWidth: 86, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 8, alignItems: "center", gap: 6 },
  swatchButtonActive: { borderColor: "#d9ad63", backgroundColor: "#1a140d" },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: "#f1dfc6" },
  swatchLabel: { color: "#8f887d", fontSize: 10, fontFamily: "Inter_700Bold" },
  swatchLabelActive: { color: "#f1dfc6" },
  statusSoon: { color: "#d9ad63", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  statusGood: { color: "#4ade80", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  statusBad: { color: "#f87171", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  versionBadge: { color: "#9d8f80", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  saveButton: { marginTop: 4, marginBottom: 18, minHeight: 50, backgroundColor: "#74291f", borderWidth: 1, borderColor: "#a34b35", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveButtonText: { color: "#f1dfc6", fontSize: 14, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
});
