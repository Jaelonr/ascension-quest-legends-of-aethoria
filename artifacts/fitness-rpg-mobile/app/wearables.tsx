import { Feather } from "@expo/vector-icons";
import { customFetch } from "@workspace/api-client-react";
import { loadMobileSettings, type Units } from "@/utils/mobile-settings";
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
import type { Permission, ReadRecordsOptions, RecordType } from "react-native-health-connect";

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

type HealthConnectModule = typeof import("react-native-health-connect");

type HealthImportEvent = {
  externalId: string;
  recordedAt: string;
  steps?: number;
  sleepHours?: number;
  hrv?: number;
  restingHr?: number;
  caloriesBurned?: number;
  activeMinutes?: number;
  weight?: number;
  provider?: string;
  recordType?: string;
};

const today = new Date().toISOString().slice(0, 10);

const HEALTH_CONNECT_PERMISSIONS: Permission[] = [
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "SleepSession" },
  { accessType: "read", recordType: "RestingHeartRate" },
  { accessType: "read", recordType: "HeartRateVariabilityRmssd" },
  { accessType: "read", recordType: "ActiveCaloriesBurned" },
  { accessType: "read", recordType: "Weight" },
  { accessType: "read", recordType: "ExerciseSession" },
];

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
    status: "Via Health Connect",
    icon: "smartphone" as const,
    body: "Best fit for your current devices. Galaxy Watch records should flow to Samsung Health first, then into Health Connect for Ascension Quest import.",
  },
  {
    id: "health_connect",
    label: "Health Connect",
    status: "Sync ready",
    icon: "heart" as const,
    body: "Android permission layer for importing steps, sleep, active calories, workouts, HRV, resting heart rate, and weight with duplicate protection.",
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

function formatEntrySource(source: string | null | undefined) {
  if (source === "samsung_health") return "Samsung Health";
  if (source === "health_connect") return "Health Connect";
  if (source === "apple_health") return "Apple Health";
  if (source === "manual") return "Manual";
  return source ? source.replace(/_/g, " ") : "Unknown";
}

const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number) => Math.round((lbs / 2.20462) * 100) / 100;
const msToHours = (ms: number) => Math.round((ms / 1000 / 60 / 60) * 100) / 100;
const msToMinutes = (ms: number) => Math.max(1, Math.round(ms / 1000 / 60));

function getRecordId(record: any, fallback: string) {
  return String(record?.metadata?.id ?? record?.metadata?.clientRecordId ?? fallback);
}

function getRecordEndTime(record: any) {
  return String(record?.endTime ?? record?.time ?? new Date().toISOString());
}

function getRecordStartTime(record: any) {
  return String(record?.startTime ?? record?.time ?? getRecordEndTime(record));
}

function getSamsungProvider(record: any) {
  const origin = String(record?.metadata?.dataOrigin ?? "").toLowerCase();
  return origin.includes("samsung") ? "samsung_health_via_health_connect" : "health_connect";
}

function durationMs(record: any) {
  const start = Date.parse(getRecordStartTime(record));
  const end = Date.parse(getRecordEndTime(record));
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? end - start : 0;
}

function oneWeekWindow(): ReadRecordsOptions {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return {
    timeRangeFilter: {
      operator: "between",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
    ascendingOrder: true,
    pageSize: 100,
  };
}

async function openHealthConnectSettingsSafely(module: HealthConnectModule) {
  try {
    await module.openHealthConnectSettings();
  } catch {
    Alert.alert(
      "Could not open settings",
      "Open Android Settings, find Health Connect, then allow Samsung Health and Ascension Quest to share supported records."
    );
  }
}

async function getHealthConnectModule(): Promise<HealthConnectModule | null> {
  if (Platform.OS !== "android") return null;
  try {
    return await import("react-native-health-connect");
  } catch {
    return null;
  }
}

async function readHealthConnectRecords(module: HealthConnectModule, recordType: RecordType, options: ReadRecordsOptions) {
  const records: any[] = [];
  let pageToken: string | undefined;
  do {
    try {
      const result = await module.readRecords(recordType, { ...options, pageToken });
      records.push(...((result as { records?: any[] }).records ?? []));
      pageToken = (result as { pageToken?: string }).pageToken;
    } catch {
      pageToken = undefined;
    }
  } while (pageToken && records.length < 500);
  return records;
}

function buildHealthConnectEvents(recordsByType: Record<string, any[]>) {
  const events: HealthImportEvent[] = [];

  for (const record of recordsByType.Steps ?? []) {
    const steps = Number(record?.count ?? 0);
    if (steps > 0) {
      events.push({
        externalId: `health-connect:steps:${getRecordId(record, `${getRecordStartTime(record)}:${getRecordEndTime(record)}`)}`,
        recordedAt: getRecordEndTime(record),
        steps: Math.round(steps),
        provider: getSamsungProvider(record),
        recordType: "Steps",
      });
    }
  }

  for (const record of recordsByType.SleepSession ?? []) {
    const sleepHours = msToHours(durationMs(record));
    if (sleepHours > 0) {
      events.push({
        externalId: `health-connect:sleep:${getRecordId(record, `${getRecordStartTime(record)}:${getRecordEndTime(record)}`)}`,
        recordedAt: getRecordEndTime(record),
        sleepHours,
        provider: getSamsungProvider(record),
        recordType: "SleepSession",
      });
    }
  }

  for (const record of recordsByType.RestingHeartRate ?? []) {
    const restingHr = Number(record?.beatsPerMinute ?? 0);
    if (restingHr > 0) {
      events.push({
        externalId: `health-connect:resting-hr:${getRecordId(record, getRecordEndTime(record))}`,
        recordedAt: getRecordEndTime(record),
        restingHr: Math.round(restingHr),
        provider: getSamsungProvider(record),
        recordType: "RestingHeartRate",
      });
    }
  }

  for (const record of recordsByType.HeartRateVariabilityRmssd ?? []) {
    const hrv = Number(record?.heartRateVariabilityMillis ?? 0);
    if (hrv > 0) {
      events.push({
        externalId: `health-connect:hrv:${getRecordId(record, getRecordEndTime(record))}`,
        recordedAt: getRecordEndTime(record),
        hrv: Math.round(hrv),
        provider: getSamsungProvider(record),
        recordType: "HeartRateVariabilityRmssd",
      });
    }
  }

  for (const record of recordsByType.ActiveCaloriesBurned ?? []) {
    const caloriesBurned = Number(record?.energy?.inKilocalories ?? 0);
    if (caloriesBurned > 0) {
      events.push({
        externalId: `health-connect:active-calories:${getRecordId(record, `${getRecordStartTime(record)}:${getRecordEndTime(record)}`)}`,
        recordedAt: getRecordEndTime(record),
        caloriesBurned: Math.round(caloriesBurned),
        provider: getSamsungProvider(record),
        recordType: "ActiveCaloriesBurned",
      });
    }
  }

  for (const record of recordsByType.ExerciseSession ?? []) {
    const activeMinutes = msToMinutes(durationMs(record));
    if (activeMinutes > 0) {
      events.push({
        externalId: `health-connect:exercise:${getRecordId(record, `${getRecordStartTime(record)}:${getRecordEndTime(record)}`)}`,
        recordedAt: getRecordEndTime(record),
        activeMinutes,
        provider: getSamsungProvider(record),
        recordType: "ExerciseSession",
      });
    }
  }

  for (const record of recordsByType.Weight ?? []) {
    const weight = Number(record?.weight?.inKilograms ?? 0);
    if (weight > 0) {
      events.push({
        externalId: `health-connect:weight:${getRecordId(record, getRecordEndTime(record))}`,
        recordedAt: getRecordEndTime(record),
        weight,
        provider: getSamsungProvider(record),
        recordType: "Weight",
      });
    }
  }

  return events.slice(0, 500);
}

function formatRecordCounts(recordsByType: Record<string, any[]>) {
  const labels: Record<string, string> = {
    Steps: "steps",
    SleepSession: "sleep",
    RestingHeartRate: "resting HR",
    HeartRateVariabilityRmssd: "HRV",
    ActiveCaloriesBurned: "calories",
    ExerciseSession: "workouts",
    Weight: "weight",
  };
  const found = Object.entries(recordsByType)
    .filter(([, records]) => records.length > 0)
    .map(([recordType, records]) => `${records.length} ${labels[recordType] ?? recordType}`);
  return found.length ? found.join(", ") : "no supported records";
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
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [unitSystem, setUnitSystem] = useState<Units>("imperial");

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
      const nextForm = buildForm(todayData);
      if (unitSystem === "imperial" && todayData?.weight != null) {
        nextForm.weight = String(kgToLbs(todayData.weight));
      }
      setForm(nextForm);
    } catch {
      Alert.alert("Vitals unavailable", "The Guild could not load recovery records right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMobileSettings()
      .then((settings) => setUnitSystem(settings.units))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadData();
  }, [unitSystem]);

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
    if (weight !== undefined) body.weight = unitSystem === "imperial" ? lbsToKg(weight) : weight;
    if (form.notes.trim()) body.notes = form.notes.trim();

    setSaving(true);
    try {
      const saved = await customFetch<WearableEntry>("/api/wearables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setTodayEntry(saved);
      setFormOpen(false);
      await loadData();
      Alert.alert("Vitals logged", "Aldric's next counsel can account for today's recovery record.");
    } catch {
      Alert.alert("Could not save", "The recovery record did not reach the Guild ledger.");
    } finally {
      setSaving(false);
    }
  };

  const handleHealthConnectSync = async () => {
    setSyncMessage(null);

    const healthConnect = await getHealthConnectModule();
    if (!healthConnect) {
      Alert.alert(
        "Health Connect unavailable",
        Platform.OS === "android"
          ? "Install the newest Ascension Quest preview APK. Expo Go and older builds cannot read Health Connect."
          : "Health Connect import is Android-only."
      );
      return;
    }

    setSyncing(true);
    try {
      const status = await healthConnect.getSdkStatus();
      if (status !== healthConnect.SdkAvailabilityStatus.SDK_AVAILABLE) {
        Alert.alert(
          "Open Health Connect",
          "Health Connect is not ready on this phone. Install or update it, then allow Samsung Health to share data there.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => void openHealthConnectSettingsSafely(healthConnect) },
          ]
        );
        return;
      }

      const initialized = await healthConnect.initialize();
      if (!initialized) {
        throw new Error("Health Connect could not initialize.");
      }

      const granted = await healthConnect.requestPermission(HEALTH_CONNECT_PERMISSIONS);
      const grantedTypes = new Set(
        granted
          .filter((permission): permission is Permission => "recordType" in permission && permission.accessType === "read")
          .map((permission) => permission.recordType)
      );

      if (!grantedTypes.size) {
        setSyncMessage("No Health Connect read permissions were granted.");
        Alert.alert(
          "Permission needed",
          "Ascension Quest cannot import Samsung/Health Connect records until at least one read permission is granted.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => void openHealthConnectSettingsSafely(healthConnect) },
          ]
        );
        return;
      }

      const options = oneWeekWindow();
      const recordTypes = [
        "Steps",
        "SleepSession",
        "RestingHeartRate",
        "HeartRateVariabilityRmssd",
        "ActiveCaloriesBurned",
        "ExerciseSession",
        "Weight",
      ] as const satisfies readonly RecordType[];
      const recordsByType: Record<string, any[]> = {};

      for (const recordType of recordTypes) {
        recordsByType[recordType] = grantedTypes.has(recordType)
          ? await readHealthConnectRecords(healthConnect, recordType, options)
          : [];
      }

      const events = buildHealthConnectEvents(recordsByType);
      const recordCountText = formatRecordCounts(recordsByType);
      const permissionText = `${grantedTypes.size}/${recordTypes.length} permissions granted`;
      if (!events.length) {
        setSyncMessage(`Health Connect is connected: ${permissionText}; found ${recordCountText} in the last seven days.`);
        Alert.alert(
          "No records found",
          "Health Connect did not return supported records yet. Confirm Samsung Health is sharing watch data into Health Connect, then try again.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => void openHealthConnectSettingsSafely(healthConnect) },
          ]
        );
        return;
      }

      const result = await customFetch<{
        imported: number;
        duplicates: number;
        total: number;
        samsungHealthEvents?: number;
        healthConnectEvents?: number;
        recordTypes?: Record<string, number>;
      }>("/api/health/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "health_connect", events }),
      });

      await loadData();
      const samsungEvents = result.samsungHealthEvents ?? events.filter((event) => event.provider === "samsung_health_via_health_connect").length;
      const samsungText = samsungEvents > 0 ? ` ${samsungEvents} came from Samsung Health through Health Connect.` : "";
      const message = `${permissionText}; found ${recordCountText}. Imported ${result.imported} record${result.imported === 1 ? "" : "s"}; ${result.duplicates} already in the ledger.${samsungText}`;
      setSyncMessage(message);
      Alert.alert("Health Connect synced", message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The import did not complete.";
      setSyncMessage("Health Connect sync failed. Check permissions and try again.");
      Alert.alert("Sync failed", message);
    } finally {
      setSyncing(false);
    }
  };

  const openHealthConnectSettings = async () => {
    const healthConnect = await getHealthConnectModule();
    if (!healthConnect) {
      Alert.alert(
        "Health Connect unavailable",
        Platform.OS === "android"
          ? "Install the newest Ascension Quest preview APK. Expo Go and older builds cannot open Health Connect settings."
          : "Health Connect settings are Android-only."
      );
      return;
    }
    try {
      await openHealthConnectSettingsSafely(healthConnect);
    } catch {
      Alert.alert("Could not open settings", "Open Android Settings, find Health Connect, then allow Samsung Health and Ascension Quest to share the supported records.");
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
              Manual health logging is live. Samsung watch records can import through Health Connect with permission and duplicate protection.
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
            <TouchableOpacity style={w.reportToggle} onPress={() => setFormOpen((value) => !value)} activeOpacity={0.82}>
              <Feather name={todayEntry ? "check" : "plus"} size={13} color={todayEntry ? "#4ade80" : "#d9ad63"} />
              <Text style={todayEntry ? w.statusGood : w.statusSoon}>{todayEntry ? "Logged" : "Log Today"}</Text>
              <Feather name={formOpen ? "chevron-up" : "chevron-down"} size={13} color="#8f887d" />
            </TouchableOpacity>
          </View>
          {formOpen ? (
            <View style={w.formCard}>
              <View style={w.formGrid}>
                <Field label="Steps" value={form.steps} onChangeText={(v) => setFormValue("steps", v)} placeholder="8500" />
                <Field label="Sleep Hours" value={form.sleepHours} onChangeText={(v) => setFormValue("sleepHours", v)} placeholder="7.5" />
                <Field label="HRV" value={form.hrv} onChangeText={(v) => setFormValue("hrv", v)} placeholder="55" />
                <Field label="Resting HR" value={form.restingHr} onChangeText={(v) => setFormValue("restingHr", v)} placeholder="60" />
                <Field label="Calories Burned" value={form.caloriesBurned} onChangeText={(v) => setFormValue("caloriesBurned", v)} placeholder="450" />
                <Field label="Active Minutes" value={form.activeMinutes} onChangeText={(v) => setFormValue("activeMinutes", v)} placeholder="45" />
              </View>
              <Field
                label={`Weight (${unitSystem === "metric" ? "kg" : "lbs"})`}
                value={form.weight}
                onChangeText={(v) => setFormValue("weight", v)}
                placeholder={unitSystem === "metric" ? "80" : "175"}
              />
              <Field
                label="Notes"
                value={form.notes}
                onChangeText={(v) => setFormValue("notes", v)}
                placeholder="Soreness, pain, travel, or unusual fatigue"
                keyboardType="default"
              />
              <View style={w.formActions}>
                <TouchableOpacity style={[w.saveBtn, saving && w.disabled]} onPress={handleSave} disabled={saving} activeOpacity={0.84}>
                  {saving ? <ActivityIndicator color="#0a0908" /> : <Text style={w.saveText}>Save Recovery Record</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={w.cancelBtn} onPress={() => setFormOpen(false)} activeOpacity={0.82}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={w.collapsedReport}>
              <Text style={w.collapsedReportTitle}>{todayEntry ? "Recovery record saved for today." : "No recovery record yet."}</Text>
              <Text style={w.collapsedReportText}>{todayEntry ? "Open the report if you need to revise steps, sleep, readiness, or notes." : "Open the field report to log steps, sleep, HRV, active minutes, weight, or recovery notes."}</Text>
            </View>
          )}
        </View>

        <View style={w.sectionBlock}>
          <Text style={w.sectionTitle}>Device Sync</Text>
          <View style={w.setupCard}>
            <View style={w.setupHeader}>
              <Feather name="smartphone" size={16} color="#49a3a0" />
              <Text style={w.setupTitle}>Samsung setup path</Text>
            </View>
            {[
              "Galaxy Watch records the activity.",
              "Samsung Health receives the watch data.",
              "Health Connect is allowed to read Samsung Health.",
              "Ascension Quest reads Health Connect and updates the Guild ledger.",
            ].map((step, index) => (
              <View key={step} style={w.setupStep}>
                <Text style={w.setupIndex}>{index + 1}</Text>
                <Text style={w.setupText}>{step}</Text>
              </View>
            ))}
            <TouchableOpacity style={w.settingsBtn} onPress={openHealthConnectSettings} activeOpacity={0.84}>
              <Feather name="settings" size={14} color="#d9ad63" />
              <Text style={w.settingsBtnText}>Open Health Connect Settings</Text>
            </TouchableOpacity>
          </View>
          <View style={w.syncPanel}>
            <View style={{ flex: 1 }}>
              <Text style={w.syncTitle}>Samsung Watch Import</Text>
              <Text style={w.syncText}>
                Sync Galaxy Watch data into Samsung Health, share it with Health Connect, then draw it into the Guild ledger.
              </Text>
              {syncMessage ? <Text style={w.syncMessage}>{syncMessage}</Text> : null}
            </View>
            <TouchableOpacity style={[w.syncBtn, syncing && w.disabled]} onPress={handleHealthConnectSync} disabled={syncing} activeOpacity={0.84}>
              {syncing ? <ActivityIndicator color="#0a0908" /> : <Feather name="refresh-cw" size={15} color="#0a0908" />}
              <Text style={w.syncBtnText}>{syncing ? "Syncing" : "Sync"}</Text>
            </TouchableOpacity>
          </View>
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
              <Text style={w.emptyText}>Log today's vitals manually or sync Samsung Health through Health Connect above.</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {summary.entries.map((entry) => (
                <View key={entry.id} style={w.historyCard}>
                  <View style={{ width: 74 }}>
                    <Text style={w.historyDate}>
                      {new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Text>
                    <Text style={w.historySource}>{formatEntrySource(entry.source)}</Text>
                  </View>
                  <View style={w.historyValues}>
                    {entry.steps != null ? <Text style={w.historyValue}>Steps {entry.steps.toLocaleString()}</Text> : null}
                    {entry.sleepHours != null ? <Text style={w.historyValue}>Sleep {entry.sleepHours}h</Text> : null}
                    {entry.hrv != null ? <Text style={w.historyValue}>HRV {entry.hrv}</Text> : null}
                    {entry.restingHr != null ? <Text style={w.historyValue}>Resting {entry.restingHr} bpm</Text> : null}
                    {entry.activeMinutes != null ? <Text style={w.historyValue}>Active {entry.activeMinutes}m</Text> : null}
                    {entry.weight != null ? (
                      <Text style={w.historyValue}>
                        Weight {unitSystem === "imperial" ? kgToLbs(entry.weight) : entry.weight}{unitSystem === "imperial" ? " lbs" : " kg"}
                      </Text>
                    ) : null}
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
  reportToggle: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", paddingHorizontal: 8, paddingVertical: 5 },
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
  formActions: { gap: 8 },
  cancelBtn: { minHeight: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09" },
  cancelText: { color: "#8f887d", fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  collapsedReport: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 12 },
  collapsedReportTitle: { color: "#d8c4a5", fontSize: 13, fontFamily: "Inter_700Bold" },
  collapsedReportText: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 4 },
  disabled: { opacity: 0.7 },
  statusGood: { color: "#4ade80", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  statusSoon: { color: "#d9ad63", fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  connectorGrid: { gap: 8 },
  setupCard: { borderWidth: 1, borderColor: "#345f5d", backgroundColor: "#071111", padding: 12, marginBottom: 10 },
  setupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  setupTitle: { color: "#49a3a0", fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  setupStep: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 7 },
  setupIndex: { width: 20, height: 20, color: "#0a0908", backgroundColor: "#d9ad63", textAlign: "center", textAlignVertical: "center", fontSize: 11, fontFamily: "Inter_700Bold", overflow: "hidden" },
  setupText: { flex: 1, color: "#d8c4a5", fontSize: 11, lineHeight: 16 },
  settingsBtn: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", marginTop: 12 },
  settingsBtnText: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  syncPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#4b3d2d",
    backgroundColor: "#14120f",
    padding: 12,
    marginBottom: 10,
  },
  syncTitle: { color: "#eee5d7", fontSize: 14, fontFamily: "Inter_700Bold" },
  syncText: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginTop: 4 },
  syncMessage: { color: "#49a3a0", fontSize: 11, lineHeight: 16, marginTop: 7 },
  syncBtn: {
    minWidth: 82,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#d9ad63",
    borderWidth: 1,
    borderColor: "#f0c77a",
  },
  syncBtnText: { color: "#0a0908", fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
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
