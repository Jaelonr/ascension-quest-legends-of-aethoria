import { useAuth, useClerk } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useResetPlayer } from "@workspace/api-client-react";
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

type Units = "imperial" | "metric";
type NarrativeMode = "balanced" | "immersive" | "technical";

type MobileSettings = {
  units: Units;
  narrativeMode: NarrativeMode;
  soundsEnabled: boolean;
  reducedMotion: boolean;
  compactMode: boolean;
  analyticsEnabled: boolean;
  crashReports: boolean;
};

const STORAGE_KEY = "ascension-quest-mobile-settings";

const DEFAULT_SETTINGS: MobileSettings = {
  units: "imperial",
  narrativeMode: "balanced",
  soundsEnabled: true,
  reducedMotion: false,
  compactMode: false,
  analyticsEnabled: true,
  crashReports: true,
};

const LEGAL_COPY = {
  privacy: {
    title: "Privacy Policy",
    body:
      "Ascension Quest may store account details, training logs, nutrition entries, biometrics you enter, equipment access, imported health records, Guildmaster memories, and gameplay progression. This data powers commissions, rewards, Chronicle records, and practical guidance.",
  },
  terms: {
    title: "Terms And Health Disclaimer",
    body:
      "Ascension Quest provides general training and nutrition guidance for motivation and planning. It is not medical advice. Do not train through sharp, worsening, or concerning pain; medical concerns belong with qualified professionals.",
  },
  data: {
    title: "Data Export And Deletion",
    body:
      "Production export and deletion workflows should include workouts, nutrition, biometrics, wearable imports, character progression, Chronicle records, and Guildmaster memories. This mobile build exposes the user-facing surface while the backend workflow is finalized.",
  },
  checklist: {
    title: "Configuration Checklist",
    body:
      "Before launch: verify Clerk authentication, Google sign-in redirects, PostgreSQL migrations, OpenAI fallback behavior, mock-mode isolation, legal copy review, app versioning, and export/delete workflows.",
  },
};

function mergeSettings(value: Partial<MobileSettings> | null): MobileSettings {
  return { ...DEFAULT_SETTINGS, ...(value ?? {}) };
}

function Section({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
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

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const resetPlayer = useResetPlayer({
    mutation: {
      onSuccess: () => router.replace("/profile" as any),
      onError: () => Alert.alert("Reset failed", "The Guild could not recreate your character yet. Try again in a moment."),
    },
  });

  const [settings, setSettings] = useState<MobileSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const environment = useMemo(() => {
    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "Not configured";
    const devBypass = process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS === "true";
    const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? "Configured" : "Missing";
    const clerkProxy = process.env.EXPO_PUBLIC_CLERK_PROXY_URL ? "Configured" : "Missing";
    return { apiBase, devBypass, clerkKey, clerkProxy };
  }, []);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted) return;
        setSettings(mergeSettings(raw ? JSON.parse(raw) : null));
      })
      .catch(() => undefined)
      .finally(() => mounted && setLoaded(true));
    return () => {
      mounted = false;
    };
  }, []);

  const updateSettings = (next: MobileSettings) => {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const setSetting = <K extends keyof MobileSettings>(key: K, value: MobileSettings[K]) => {
    updateSettings({ ...settings, [key]: value });
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

        <Section icon="user" title="Account">
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

        <Section icon="sliders" title="Units And Presentation">
          <Choice
            label="Imperial"
            description="Default for this build: pounds, inches, miles, and calories."
            active={settings.units === "imperial"}
            onPress={() => setSetting("units", "imperial")}
          />
          <Choice
            label="Metric"
            description="Kilograms, centimeters, and kilometers for players who prefer metric display."
            active={settings.units === "metric"}
            onPress={() => setSetting("units", "metric")}
          />
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
        </Section>

        <Section icon="activity" title="Health Imports">
          <Row
            icon="smartphone"
            label="Samsung Health"
            description="Target device path for your testing. Native permissions and deduplication still need final integration."
            right={<Text style={s.statusSoon}>Soon</Text>}
          />
          <Row
            icon="heart"
            label="Health Connect"
            description="Android bridge for steps, sleep, workouts, and body metrics once permission handling is implemented."
            right={<Text style={s.statusSoon}>Soon</Text>}
          />
          <Row
            icon="watch"
            label="Apple Health"
            description="Coming later for iOS builds. This Android APK does not sync Apple Health."
            right={<Text style={s.statusSoon}>Later</Text>}
          />
        </Section>

        <Section icon="shield" title="Privacy And Data">
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
          <Row icon="file-text" label="Privacy Policy" description="What the app stores and why." onPress={() => showCopy("privacy")} />
          <Row icon="clipboard" label="Terms And Health Disclaimer" description="Fitness guidance boundaries." onPress={() => showCopy("terms")} />
          <Row icon="database" label="Export Or Delete Data" description="Production user-control roadmap." onPress={() => showCopy("data")} />
        </Section>

        <Section icon="server" title="Production Readiness">
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
          <Row icon="info" label="App Version" description="Ascension Quest mobile build 1.0.0" />
        </Section>
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
  statusSoon: { color: "#d9ad63", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  statusGood: { color: "#4ade80", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  statusBad: { color: "#f87171", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
});
