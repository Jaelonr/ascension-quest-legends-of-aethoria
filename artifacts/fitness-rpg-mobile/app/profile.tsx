import { useGetBiometrics, useUpdateBiometrics } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EQUIPMENT_TYPES = [
  { id: "power_rack", label: "Power Rack" },
  { id: "squat_rack", label: "Squat Rack" },
  { id: "smith_machine", label: "Smith Machine" },
  { id: "barbell", label: "Barbell" },
  { id: "plates", label: "Plates" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "adjustable_dumbbells", label: "Adjustable Dumbbells" },
  { id: "kettlebells", label: "Kettlebells" },
  { id: "adjustable_bench", label: "Adjustable Bench" },
  { id: "flat_bench", label: "Flat Bench" },
  { id: "incline_bench", label: "Incline Bench" },
  { id: "cable_machine", label: "Cable Machine" },
  { id: "functional_trainer", label: "Functional Trainer" },
  { id: "lat_pulldown", label: "Lat Pulldown" },
  { id: "leg_press", label: "Leg Press" },
  { id: "hack_squat", label: "Hack Squat" },
  { id: "belt_squat", label: "Belt Squat" },
  { id: "pull_up_bar", label: "Pull-Up Bar" },
  { id: "dip_station", label: "Dip Station" },
  { id: "resistance_bands", label: "Resistance Bands" },
  { id: "treadmill", label: "Treadmill" },
  { id: "bike", label: "Bike" },
  { id: "rower", label: "Rower" },
  { id: "elliptical", label: "Elliptical" },
  { id: "stair_climber", label: "Stair Climber" },
  { id: "jump_rope", label: "Jump Rope" },
  { id: "heavy_bag", label: "Heavy Bag" },
  { id: "fightcamp", label: "FightCamp" },
  { id: "speed_bag", label: "Speed Bag" },
  { id: "double_end_bag", label: "Double-End Bag" },
  { id: "wrestling_mat", label: "Wrestling Mat" },
  { id: "yoga_mat", label: "Yoga Mat" },
  { id: "medicine_ball", label: "Medicine Ball" },
  { id: "slam_ball", label: "Slam Ball" },
  { id: "sled", label: "Sled" },
  { id: "battle_ropes", label: "Battle Ropes" },
  { id: "foam_roller", label: "Foam Roller" },
  { id: "bodyweight", label: "Bodyweight Only" },
];

type FormState = {
  height: string;
  weight: string;
  bodyFatPct: string;
  squat1rm: string;
  bench1rm: string;
  deadlift1rm: string;
  ohp1rm: string;
  row1rm: string;
  equipmentTypes: string[];
  notes: string;
};

const empty: FormState = {
  height: "",
  weight: "",
  bodyFatPct: "",
  squat1rm: "",
  bench1rm: "",
  deadlift1rm: "",
  ohp1rm: "",
  row1rm: "",
  equipmentTypes: [],
  notes: "",
};

const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number) => Math.round((lbs / 2.20462) * 100) / 100;
const cmToIn = (cm: number) => Math.round((cm / 2.54) * 10) / 10;
const inToCm = (inches: number) => Math.round(inches * 2.54 * 10) / 10;
const numOrNull = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && value.trim() !== "" ? parsed : null;
};

function inToFtIn(inches: number) {
  const ft = Math.floor(inches / 12);
  const rem = Math.round(inches % 12);
  return `${ft}'${rem}"`;
}

function toForm(data: any): FormState {
  const lift = (value: number | null | undefined) => value == null ? "" : String(kgToLbs(value));
  return {
    height: data?.heightCm != null ? String(cmToIn(data.heightCm)) : "",
    weight: data?.weightKg != null ? String(kgToLbs(data.weightKg)) : "",
    bodyFatPct: data?.bodyFatPct != null ? String(data.bodyFatPct) : "",
    squat1rm: lift(data?.squat1rm),
    bench1rm: lift(data?.bench1rm),
    deadlift1rm: lift(data?.deadlift1rm),
    ohp1rm: lift(data?.ohp1rm),
    row1rm: lift(data?.row1rm),
    equipmentTypes: data?.equipmentTypes ?? [],
    notes: data?.notes ?? "",
  };
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading } = useGetBiometrics();
  const update = useUpdateBiometrics();
  const [form, setForm] = useState<FormState>(empty);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(toForm(data));
      setDirty(false);
    }
  }, [data]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const toggleEquipment = (id: string) => {
    setForm((prev) => ({
      ...prev,
      equipmentTypes: prev.equipmentTypes.includes(id)
        ? prev.equipmentTypes.filter((item) => item !== id)
        : [...prev.equipmentTypes, id],
    }));
    setDirty(true);
  };

  const save = () => {
    const toKg = (value: string) => {
      const parsed = numOrNull(value);
      return parsed == null ? null : lbsToKg(parsed);
    };
    const toCm = (value: string) => {
      const parsed = numOrNull(value);
      return parsed == null ? null : inToCm(parsed);
    };
    update.mutate(
      {
        data: {
          heightCm: toCm(form.height),
          weightKg: toKg(form.weight),
          bodyFatPct: numOrNull(form.bodyFatPct),
          squat1rm: toKg(form.squat1rm) != null ? Math.round(toKg(form.squat1rm)!) : null,
          bench1rm: toKg(form.bench1rm) != null ? Math.round(toKg(form.bench1rm)!) : null,
          deadlift1rm: toKg(form.deadlift1rm) != null ? Math.round(toKg(form.deadlift1rm)!) : null,
          ohp1rm: toKg(form.ohp1rm) != null ? Math.round(toKg(form.ohp1rm)!) : null,
          row1rm: toKg(form.row1rm) != null ? Math.round(toKg(form.row1rm)!) : null,
          equipmentTypes: form.equipmentTypes,
          notes: form.notes || null,
        },
      },
      {
        onSuccess: () => {
          setDirty(false);
          Alert.alert("System Record saved", "The Guild planner will use these details.");
        },
        onError: () => Alert.alert("Save failed", "The System Record could not be updated."),
      }
    );
  };

  const heightNum = parseFloat(form.height);
  const heightHint = Number.isFinite(heightNum) && heightNum > 0 ? inToFtIn(heightNum) : null;
  const lifts: Array<{ field: keyof FormState; label: string; placeholder: string }> = [
    { field: "squat1rm", label: "Squat", placeholder: "315" },
    { field: "bench1rm", label: "Bench Press", placeholder: "225" },
    { field: "deadlift1rm", label: "Deadlift", placeholder: "405" },
    { field: "ohp1rm", label: "Overhead Press", placeholder: "155" },
    { field: "row1rm", label: "Barbell Row", placeholder: "245" },
  ];

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }}>
      <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>Back to Character</Text></TouchableOpacity>
      <Text style={s.kicker}>SYSTEM RECORD</Text>
      <Text style={s.title}>System Record</Text>
      <Text style={s.subtitle}>Biometrics, strength marks, and equipment access.</Text>

      <View style={s.unitCard}>
        <Text style={s.unitLabel}>Unit System</Text>
        <Text style={s.unitValue}>Imperial default: lbs / inches</Text>
      </View>

      <View style={s.infoCard}>
        <Text style={s.infoText}>
          The System uses this record to set fair commissions and recommend training loads. The Guild ledger receives only the practical details needed to avoid unsafe work.
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#d9ad63" style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={s.card}>
            <Text style={s.cardTitle}>Body Metrics</Text>
            <View style={s.fieldRow}>
              <Field label={`Height ${heightHint ? `(${heightHint})` : ""}`} value={form.height} onChangeText={(v) => setField("height", v)} placeholder="70" suffix="in" />
              <Field label="Weight" value={form.weight} onChangeText={(v) => setField("weight", v)} placeholder="190" suffix="lbs" />
            </View>
            <Field label="Body Fat" value={form.bodyFatPct} onChangeText={(v) => setField("bodyFatPct", v)} placeholder="18" suffix="%" />
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Strength Marks</Text>
            <Text style={s.cardMeta}>These help the planner recommend reasonable loads. Leave unknown lifts blank.</Text>
            {lifts.map((lift) => (
              <Field key={lift.field} label={lift.label} value={String(form[lift.field] ?? "")} onChangeText={(v) => setField(lift.field, v)} placeholder={lift.placeholder} suffix="lbs" />
            ))}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Owned Equipment</Text>
            <Text style={s.cardMeta}>Commissions and generated workouts should respect what you can actually use.</Text>
            <View style={s.equipmentGrid}>
              {EQUIPMENT_TYPES.map((item) => {
                const selected = form.equipmentTypes.includes(item.id);
                return (
                  <TouchableOpacity key={item.id} style={[s.equipmentChip, selected && s.equipmentChipActive]} onPress={() => toggleEquipment(item.id)}>
                    <Text style={[s.equipmentText, selected && s.equipmentTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Notes</Text>
            <TextInput
              style={s.notes}
              placeholder="Injuries, preferences, schedule limits..."
              placeholderTextColor="#6b5d4f"
              value={form.notes}
              onChangeText={(v) => setField("notes", v)}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={[s.saveBtn, (!dirty || update.isPending) && { opacity: 0.55 }]} onPress={save} disabled={!dirty || update.isPending}>
            {update.isPending ? <ActivityIndicator color="#0a0908" /> : <Text style={s.saveText}>Save System Record</Text>}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, placeholder, suffix }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; suffix: string }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6b5d4f"
          keyboardType="decimal-pad"
        />
        <Text style={s.suffix}>{suffix}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0908" },
  back: { color: "#d9ad63", fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 18 },
  kicker: { color: "#9d8f80", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  title: { color: "#eee5d7", fontSize: 26, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2 },
  subtitle: { color: "#9f9586", fontSize: 12, marginTop: 4, marginBottom: 16, fontFamily: "Inter_400Regular" },
  unitCard: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 12, marginBottom: 12 },
  unitLabel: { color: "#8f887d", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  unitValue: { color: "#d9ad63", fontSize: 11, fontFamily: "Inter_700Bold" },
  infoCard: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 14, marginBottom: 12 },
  infoText: { color: "#cfc5b8", fontSize: 12, lineHeight: 18 },
  card: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", padding: 14, marginBottom: 12 },
  cardTitle: { color: "#d9ad63", fontSize: 16, fontFamily: "PlayfairDisplay_700Bold", fontWeight: "900", marginBottom: 8 },
  cardMeta: { color: "#8f887d", fontSize: 11, lineHeight: 16, marginBottom: 10 },
  fieldRow: { flexDirection: "row", gap: 10 },
  field: { flex: 1, marginBottom: 10 },
  fieldLabel: { color: "#8f887d", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09" },
  input: { flex: 1, color: "#eee5d7", padding: 10, fontSize: 14 },
  suffix: { color: "#8f887d", fontSize: 11, paddingRight: 10 },
  equipmentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  equipmentChip: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", paddingHorizontal: 10, paddingVertical: 8 },
  equipmentChipActive: { borderColor: "#d9ad63", backgroundColor: "#d9ad6318" },
  equipmentText: { color: "#8f887d", fontSize: 11, fontFamily: "Inter_700Bold" },
  equipmentTextActive: { color: "#d9ad63" },
  notes: { minHeight: 92, borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09", color: "#eee5d7", padding: 10, fontSize: 13, lineHeight: 18 },
  saveBtn: { backgroundColor: "#d9ad63", padding: 14, alignItems: "center", marginTop: 4 },
  saveText: { color: "#0a0908", fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
});
