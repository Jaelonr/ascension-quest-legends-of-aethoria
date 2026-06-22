import { Feather } from "@expo/vector-icons";
import { customFetch } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type WearableEntry = {
  id: number;
  date: string;
  steps: number | null;
  sleepHours: number | null;
  hrv: number | null;
  restingHr: number | null;
  caloriesBurned: number | null;
  activeMinutes: number | null;
  weight: number | null;
  source: string;
  notes?: string | null;
};

type WearableSummary = {
  days: number;
  avgSteps: number | null;
  avgSleepHours: number | null;
  avgHrv: number | null;
  avgRestingHr: number | null;
  entries: WearableEntry[];
};

type WearableForm = {
  date: string;
  steps: string;
  sleepHours: string;
  hrv: string;
  restingHr: string;
  caloriesBurned: string;
  activeMinutes: string;
  weight: string;
  notes: string;
};

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: WearableForm = {
  date: today,
  steps: "",
  sleepHours: "",
  hrv: "",
  restingHr: "",
  caloriesBurned: "",
  activeMinutes: "",
  weight: "",
  notes: "",
};

const CONNECTORS = [
  {
    id: "samsung_health",
    label: "Samsung Health",
    status: "Target path",
    icon: "smartphone" as const,
    body: "Best fit for your current devices. Requires native permission collection, Health Connect/Samsung data mapping, and duplicate protection before it can award progress.",
  },
  {
    id: "health_connect",
    label: "Health Connect",
    status: "Android bridge",
    icon: "heart" as const,
    body: "The likely Android permission layer for steps, sleep, workouts, calories, and body metrics once native integration is wired.",
  },
  {
    id: "apple_health",
    label: "Apple Health",
    status: "Later",
    icon: "watch" as const,
    body: "Reserved for an iOS build. This Android development APK should not imply Apple Health syncing.",
  },
  {
    id: "garmin_fitbit",
    label: "Garmin / Fitbit",
    status: "Post V1",
    icon: "wifi-off" as const,
    body: "Useful later, but not the first integration path for current Samsung-device testing.",
  },
];

function toField(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function buildForm(entry: WearableEntry | null): WearableForm {
  if (!entry) return EMPTY_FORM;
  return {
    date: entry.date ?? today,
    steps: toField(entry.steps),
    sleepHours: toField(entry.sleepHours),
    hrv: toField(entry.hrv),
    restingHr: toField(entry.restingHr),
    caloriesBurned: toField(entry.caloriesBurned),
    activeMinutes: toField(entry.activeMinutes),
    weight: toField(entry.weight),
    notes: entry.notes ?? "",
  };
}

function toNumber(value: string, integer = false) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = integer ? parseInt(trimmed, 10) : parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: number | null | undefined;
  unit: string;
  color: string;
}) {
  return (
    <View style={w.statCard}>
      <View style={w.statHeader}>
        <Feather name={icon} size={14} color={color} />
        <Text style={w.statLabel}>{label}</Text>
      </View>
      <Text style={[w.statValue, { color }]}>
        {value == null ? "--" : value.toLocaleString()}
        {value != null ? <Text style={w.statUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "numeric",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "numeric" | "default";
}) {
  return (
    <View style={w.field}>
      <Text style={w.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#5f574d"
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        style={w.input}
      />
    </View>
  );
}

export default function WearablesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<WearableSummary | null>(null);
  const [todayEntry, setTodayEntry] = useState<WearableEntry | null>(null);
  const [form, setForm] = useState<WearableForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const entryCount = summary?.entries?.length ?? 0;
  const readinessLabel = useMemo(() => {
    if (!summary || summary.days === 0) return "Awaiting report";
    const sleep = summary.avgSleepHours ?? 0;
    const steps = summary.avgSteps ?? 0;
    if (sleep >= 7 && steps >= 6000) return "Field-ready";
    if (sleep > 0 && sleep < 6) return "Recovery advised";
    return "Partially charted";
  }, [summary]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, todayData] = await Promise.all([
        customFetch<WearableSummary>("/api/wearables/summary"),
        customFetch<WearableEntry | null>("/api/wearables/today"),
      ]);
      setSummary(summaryData);
      setTodayEntry(todayData);
      setForm(buildForm(todayData));
    } catch {
      Alert.alert("Vitals unavailable", "The Guild could not load recovery records right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const setFormValue = (key: keyof WearableForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const body: Record<string, unknown> = {
      date: form.date || today,
      source: "manual",
    };
    const steps = toNumber(form.steps, true);
    const sleepHours = toNumber(form.sleepHours);
    const hrv = toNumber(form.hrv);
    const restingHr = toNumber(form.restingHr, true);
    const caloriesBurned = toNumber(form.caloriesBurned, true);
    const activeMinutes = toNumber(form.activeMinutes, true);
    const weight = toNumber(form.weight);

    if (steps !== undefined) body.steps = steps;
    if (sleepHours !== undefined) body.sleepHours = sleepHours;
    if (hrv !== undefined) body.hrv = hrv;
    if (restingHr !== undefined) body.restingHr = restingHr;
    if (caloriesBurned !== undefined) body.caloriesBurned = caloriesBurned;
    if (activeMinutes !== undefined) body.activeMinutes = activeMinutes;
    if (weight !== undefined) body.weight = weight;
    if (form.notes.trim()) body.notes = form.notes.trim();

    setSaving(true);
    try {
      const saved = await customFetch<WearableEntry>("/api/wearables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setTodayEntry(saved);
      await loadData();
      Alert.alert("Vitals logged", "Aldric's next counsel can account for today's recovery record.");
    } catch {
      Alert.alert("Could not save", "The recovery record did not reach the Guild ledger.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={w.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={w.topRow}>
          <TouchableOpacity style={w.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Feather name="chevron-left" size={20} color="#d9ad63" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={w.eyebrow}>VITALS AND RECOVERY</Text>
            <Text style={w.title}>Healer's Field Ledger</Text>
          </View>
        </View>

        <View style={w.hero}>
          <View style={w.heroIcon}>
            <Feather name="activity" size={24} color="#49a3a0" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={w.heroTitle}>{readinessLabel}</Text>
            <Text style={w.heroText}>
              Manual health logging is live. Device sync is staged honestly so Samsung testing can be added without duplicate rewards or false claims.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={w.loadingBox}>
            <ActivityIndicator color="#d9ad63" />
            <Text style={w.muted}>Reading the healer's ledger...</Text>
          </View>
        ) : (
          <>
            <View style={w.summaryHeader}>
              <Text style={w.sectionTitle}>7-Day Body Report</Text>
              <Text style={w.smallMuted}>{summary?.days ?? 0} days logged</Text>
            </View>
            <View style={w.statGrid}>
              <StatCard icon="trending-up" label="Avg Steps" value={summary?.avgSteps} unit="steps" color="#4ade80" />
              <StatCard icon="moon" label="Avg Sleep" value={summary?.avgSleepHours} unit="hrs" color="#60a5fa" />
              <StatCard icon="activity" label="Avg HRV" value={summary?.avgHrv} unit="ms" color="#c084fc" />
              <StatCard icon="heart" label="Resting HR" value={summary?.avgRestingHr} unit="bpm" color="#f87171" />
            </View>
          </>
        )}

        <View style={w.sectionBlock}>
          <View style={w.summaryHeader}>
            <Text style={w.sectionTitle}>Today's Field Report</Text>
            <Text style={todayEntry ? w.statusGood : w.statusSoon}>{todayEntry ? "Logged" : "Open"}</Text>
          </View>
          <View style={w.formCard}>
            <View style={w.formGrid}>
              <Field label="Steps" value={form.steps} onChangeText={(v) => setFormValue("steps", v)} placeholder="8500" />
              <Field label="Sleep Hours" value={form.sleepHours} onChangeText={(v) => setFormValue("sleepHours", v)} placeholder="7.5" />
              <Field label="HRV" value={form.hrv} onChangeText={(v) => setFormValue("hrv", v)} placeholder="55" />
              <Field label="Resting HR" value={form.restingHr} onChangeText={(v) => setFormValue("restingHr", v)} placeholder="60" />
              <Field label="Calories Burned" value={form.caloriesBurned} onChangeText={(v) => setFormValue("caloriesBurned", v)} placeholder="450" />
              <Field label="Active Minutes" value={form.activeMinutes} onChangeText={(v) => setFormValue("activeMinutes", v)} placeholder="45" />
            </View>
            <Field label="Weight" value={form.weight} onChangeText={(v) => setFormValue("weight", v)} placeholder="175" />
            <Field
              label="Notes"
              value={form.notes}
              onChangeText={(v) => setFormValue("notes", v)}
              placeholder="Soreness, pain, travel, or unusual fatigue"
              keyboardType="default"
            />
            <TouchableOpacity style={[w.saveBtn, saving && w.disabled]} onPress={handleSave} disabled={saving} activeOpacity={0.84}>
              {saving ? <ActivityIndicator color="#0a0908" /> : <Text style={w.saveText}>Save Recovery Record</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={w.sectionBlock}>
          <Text style={w.sectionTitle}>Device Sync</Text>
          <View style={w.connectorGrid}>
            {CONNECTORS.map((connector) => (
              <View key={connector.id} style={w.connectorCard}>
                <View style={w.connectorHeader}>
                  <View style={w.connectorIcon}>
                    <Feather name={connector.icon} size={17} color="#d9ad63" />
                  </View>
                  <Text style={w.connectorStatus}>{connector.status}</Text>
                </View>
                <Text style={w.connectorTitle}>{connector.label}</Text>
                <Text style={w.connectorBody}>{connector.body}</Text>
              </View>
            ))}
          </View>
          <Text style={w.disclaimer}>
            Native imports must normalize source identifiers and deduplicate records before steps, workouts, or sleep can affect progression.
          </Text>
        </View>

        <View style={w.sectionBlock}>
          <View style={w.summaryHeader}>
            <Text style={w.sectionTitle}>Recent Field Reports</Text>
            <Text style={w.smallMuted}>{entryCount} entries</Text>
          </View>
          {!summary?.entries?.length ? (
            <View style={w.emptyCard}>
              <Feather name="clipboard" size={20} color="#6b5d4f" />
              <Text style={w.emptyTitle}>No recovery records yet</Text>
              <Text style={w.emptyText}>Log today's vitals manually while native Samsung import is prepared.</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {summary.entries.map((entry) => (
                <View key={entry.id} style={w.historyCard}>
                  <View style={{ width: 74 }}>
                    <Text style={w.historyDate}>
                      {new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Text>
                    <Text style={w.historySource}>{entry.source}</Text>
                  </View>
                  <View style={w.historyValues}>
                    {entry.steps != null ? <Text style={w.historyValue}>Steps {entry.steps.toLocaleString()}</Text> : null}
                    {entry.sleepHours != null ? <Text style={w.historyValue}>Sleep {entry.sleepHours}h</Text> : null}
                    {entry.hrv != null ? <Text style={w.historyValue}>HRV {entry.hrv}</Text> : null}
                    {entry.restingHr != null ? <Text style={w.historyValue}>Resting {entry.restingHr} bpm</Text> : null}
                    {entry.activeMinutes != null ? <Text style={w.historyValue}>Active {entry.activeMinutes}m</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={w.aldricNote}>
          <Feather name="shield" size={16} color="#d9ad63" />
          <Text style={w.aldricText}>
            "Recovery data helps me guide the work between battles. Log it faithfully, and I can ask less guesswork of you."
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const w = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0908" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3b3328",
    backgroundColor: "#11100e",
  },
  eyebrow: { color: "#9d8f80", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  title: { color: "#eee5d7", fontSize: 23, fontWeight: "900", fontFamily: "Inter_700Bold", marginTop: 2 },
  hero: { flexDirection: "row", gap: 12, borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 14, marginBottom: 16 },
  heroIcon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09" },
  heroTitle: { color: "#d9ad63", fontSize: 17, fontFamily: "Inter_700Bold" },
  heroText: { color: "#8f887d", fontSize: 12, lineHeight: 18, marginTop: 5 },
  loadingBox: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 20, alignItems: "center", gap: 8, marginBottom: 16 },
  muted: { color: "#8f887d", fontSize: 12 },
  smallMuted: { color: "#8f887d", fontSize: 11 },
  summaryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  sectionTitle: { color: "#d9ad63", fontSize: 14, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  sectionBlock: { marginTop: 16 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: { width: "48.6%", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 12 },
  statHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 7 },
  statLabel: { color: "#8f887d", fontSize: 11 },
  statValue: { fontSize: 19, fontFamily: "Inter_700Bold" },
  statUnit: { color: "#8f887d", fontSize: 10, fontFamily: "Inter_400Regular" },
  formCard: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 12, gap: 10 },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  field: { flexGrow: 1, flexBasis: "47%", gap: 5 },
  fieldLabel: { color: "#9d8f80", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  input: { borderWidth: 1, borderColor: "#2a2520", backgroundColor: "#0c0b09", color: "#eee5d7", minHeight: 42, paddingHorizontal: 10, fontSize: 13 },
  saveBtn: { minHeight: 46, alignItems: "center", justifyContent: "center", backgroundColor: "#d9ad63", borderWidth: 1, borderColor: "#f0c77a", marginTop: 2 },
  saveText: { color: "#0a0908", fontFamily: "Inter_700Bold", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  disabled: { opacity: 0.7 },
  statusGood: { color: "#4ade80", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  statusSoon: { color: "#d9ad63", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  connectorGrid: { gap: 8 },
  connectorCard: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 12 },
  connectorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  connectorIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09" },
  connectorStatus: { color: "#49a3a0", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  connectorTitle: { color: "#eee5d7", fontSize: 14, fontFamily: "Inter_700Bold" },
  connectorBody: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 5 },
  disclaimer: { color: "#6b5d4f", fontSize: 11, lineHeight: 16, marginTop: 10, textAlign: "center" },
  emptyCard: { borderWidth: 1, borderColor: "#3b3328", borderStyle: "dashed", backgroundColor: "#11100e", padding: 18, alignItems: "center", gap: 7 },
  emptyTitle: { color: "#d8c4a5", fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyText: { color: "#8f887d", fontSize: 12, textAlign: "center", lineHeight: 18 },
  historyCard: { flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 12 },
  historyDate: { color: "#eee5d7", fontSize: 12, fontFamily: "Inter_700Bold" },
  historySource: { color: "#6b5d4f", fontSize: 10, textTransform: "uppercase", marginTop: 2 },
  historyValues: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  historyValue: { color: "#d8c4a5", fontSize: 11, borderWidth: 1, borderColor: "#2a2520", paddingHorizontal: 7, paddingVertical: 4, backgroundColor: "#0c0b09" },
  aldricNote: { flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#18130d", padding: 12, marginTop: 16 },
  aldricText: { flex: 1, color: "#d8c4a5", fontSize: 12, lineHeight: 18, fontStyle: "italic" },
});
