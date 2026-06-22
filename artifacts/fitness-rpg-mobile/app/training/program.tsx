import { useCreateWorkoutSession } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ProgramDay = { label: string; focus: string; exercises: string[]; sets: string; note?: string };
type ProgramWeek = { week: number; title: string; theme: string; intensity: string; days: ProgramDay[] };

const PROGRAM: ProgramWeek[] = [
  { week: 1, title: "Foundation", theme: "Base Building", intensity: "60% effort", days: [
    { label: "Day 1", focus: "Upper Body", exercises: ["Bench Press", "Barbell Row", "Overhead Press", "Barbell Curl"], sets: "3x10", note: "Controlled tempo, learn the movement." },
    { label: "Day 3", focus: "Lower Body", exercises: ["Squat", "Romanian Deadlift", "Leg Press", "Calf Raise"], sets: "3x10" },
    { label: "Day 5", focus: "Full Body + Conditioning", exercises: ["Deadlift", "Pull-up / Lat Pulldown", "Incline Press", "Heavy Bag 3x3min"], sets: "3x8" },
  ] },
  { week: 2, title: "Foundation+", theme: "Volume Increase", intensity: "65% effort", days: [
    { label: "Day 1", focus: "Upper Body", exercises: ["Bench Press +5lb", "Barbell Row +5lb", "Overhead Press", "Tricep Pushdown", "Barbell Curl"], sets: "3x10" },
    { label: "Day 3", focus: "Lower Body", exercises: ["Squat +5lb", "Romanian Deadlift +5lb", "Leg Press", "Lunges", "Calf Raise"], sets: "3x10" },
    { label: "Day 5", focus: "Full Body + Conditioning", exercises: ["Deadlift +5lb", "Pull-up", "Incline Press", "Striking 4x3min"], sets: "3x8" },
  ] },
  { week: 3, title: "Intermediate", theme: "Rep Range Drop", intensity: "70% effort", days: [
    { label: "Day 1", focus: "Upper Push/Pull", exercises: ["Bench Press", "Weighted Pull-up", "Overhead Press", "Cable Row", "Face Pull"], sets: "4x8" },
    { label: "Day 3", focus: "Legs", exercises: ["Squat", "Romanian Deadlift", "Leg Press", "Bulgarian Split Squat", "Leg Curl"], sets: "4x8" },
    { label: "Day 5", focus: "Full Body Power", exercises: ["Deadlift", "Bench Press", "Barbell Row", "Conditioning Circuit"], sets: "4x6" },
  ] },
  { week: 4, title: "Deload", theme: "Active Recovery", intensity: "50% effort", days: [
    { label: "Day 1", focus: "Light Upper", exercises: ["Bench Press -20%", "Row -20%", "Face Pull", "Band Pull-Apart"], sets: "2x10", note: "Focus on technique. Move well." },
    { label: "Day 3", focus: "Light Lower", exercises: ["Squat -20%", "Hip Hinge", "Leg Press -20%", "Stretching"], sets: "2x10" },
    { label: "Day 5", focus: "Active Recovery", exercises: ["Bike / Walk 20min", "Mobility work", "Grappling drills (light)"], sets: "Low intensity" },
  ] },
  { week: 5, title: "Strength Phase", theme: "Heavier Loads", intensity: "75-80% effort", days: [
    { label: "Day 1", focus: "Upper Strength", exercises: ["Bench Press 4x6", "Weighted Pull-up 4x6", "Overhead Press 4x6", "Barbell Row 4x6"], sets: "4x6" },
    { label: "Day 3", focus: "Lower Strength", exercises: ["Squat 4x6", "Deadlift 4x5", "Leg Press 3x8", "Hamstring Curl 3x10"], sets: "4x6" },
    { label: "Day 5", focus: "Power + Combat", exercises: ["Power Clean or Jump Squat", "Push Press", "Weighted Dips", "Sparring / Grappling 20min"], sets: "4x5" },
  ] },
  { week: 6, title: "Strength+", theme: "Volume + Intensity", intensity: "80% effort", days: [
    { label: "Day 1", focus: "Upper Strength", exercises: ["Bench Press +5lb", "Weighted Pull-up +5lb", "Overhead Press +5lb", "Cable Row 3x10"], sets: "4x5-6" },
    { label: "Day 3", focus: "Lower Strength", exercises: ["Squat +5lb", "Deadlift +5lb", "Bulgarian Split Squat 3x8", "Leg Curl 3x10"], sets: "4x5" },
    { label: "Day 5", focus: "Power + Conditioning", exercises: ["Clean Pull", "Bench Press", "Weighted Chin-up", "Combat Conditioning"], sets: "4x4" },
  ] },
  { week: 7, title: "Peak Week", theme: "Max Intensity", intensity: "85-90% effort", days: [
    { label: "Day 1", focus: "Upper Peak", exercises: ["Bench Press 5x3", "Weighted Pull-up 5x3", "Overhead Press 4x4", "Accessory work 2x12"], sets: "5x3", note: "Heavy. Focus. Execute." },
    { label: "Day 3", focus: "Lower Peak", exercises: ["Squat 5x3", "Deadlift 4x3", "Leg Press 3x6", "Core circuit"], sets: "5x3" },
    { label: "Day 5", focus: "Full Body Primer", exercises: ["Bench Press 3x3 @ 85%", "Deadlift 3x3 @ 85%", "Pull-up 3x5", "Light conditioning"], sets: "3x3" },
  ] },
  { week: 8, title: "Test Week", theme: "Max Effort - Prove Yourself", intensity: "100% effort", days: [
    { label: "Day 1", focus: "Upper Max", exercises: ["Bench Press 1RM attempt", "Overhead Press 3RM attempt", "Weighted Pull-up 3RM", "Record all PRs"], sets: "1-3RM", note: "This is why you trained. Finish strong." },
    { label: "Day 3", focus: "Lower Max", exercises: ["Squat 1RM attempt", "Deadlift 1RM attempt", "Record all PRs"], sets: "1RM" },
    { label: "Day 5", focus: "Combat Assessment", exercises: ["Heavy bag 5x3min full effort", "Grappling sparring", "Conditioning test - max rounds"], sets: "All out" },
  ] },
];

export default function TrainingProgramScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const createSession = useCreateWorkoutSession();
  const [expandedWeek, setExpandedWeek] = useState(1);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const startDay = (day: ProgramDay) => {
    createSession.mutate(
      { data: { name: `${day.focus} - ${day.sets}`, templateId: undefined as any } },
      {
        onSuccess: (session: any) => router.push(`/session/${session.id}` as any),
        onError: () => Alert.alert("Session failed", "Could not start this program session."),
      }
    );
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }}>
      <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>Back to Training Yard</Text></TouchableOpacity>
      <Text style={s.kicker}>8-WEEK CAMPAIGN PROGRAM</Text>
      <Text style={s.title}>8-Week Program</Text>
      <Text style={s.subtitle}>Progressive strength and combat training.</Text>
      <View style={s.overview}>
        <Text style={s.overviewTitle}>Progressive Overload Protocol</Text>
        <Text style={s.overviewText}>3 sessions/week. Full body strength, striking, grappling, recovery, and a Week 8 assessment.</Text>
      </View>

      {PROGRAM.map((week) => {
        const open = expandedWeek === week.week;
        return (
          <View key={week.week} style={[s.weekCard, week.week === 1 && s.currentWeek]}>
            <TouchableOpacity style={s.weekHeader} onPress={() => setExpandedWeek(open ? 0 : week.week)} activeOpacity={0.75}>
              <View style={s.weekBadge}><Text style={s.weekBadgeText}>W{week.week}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.weekTitle}>{week.title}</Text>
                <Text style={s.weekMeta}>{week.theme} - {week.intensity}</Text>
              </View>
              <Text style={s.expand}>{open ? "Close" : "Open"}</Text>
            </TouchableOpacity>
            {open && week.days.map((day) => {
              const key = `${week.week}-${day.label}`;
              const dayOpen = expandedDay === key;
              return (
                <View key={key} style={s.dayBlock}>
                  <TouchableOpacity style={s.dayHeader} onPress={() => setExpandedDay(dayOpen ? null : key)}>
                    <Text style={s.dayLabel}>{day.label}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.dayFocus}>{day.focus}</Text>
                      <Text style={s.dayMeta}>{day.sets} - {day.exercises.length} exercises</Text>
                    </View>
                    <Text style={s.expand}>{dayOpen ? "Hide" : "View"}</Text>
                  </TouchableOpacity>
                  {dayOpen && (
                    <View style={s.exerciseList}>
                      {day.note && <Text style={s.note}>{day.note}</Text>}
                      {day.exercises.map((exercise, index) => (
                        <Text key={exercise} style={s.exercise}>{index + 1}. {exercise}</Text>
                      ))}
                      <TouchableOpacity style={[s.startBtn, createSession.isPending && { opacity: 0.65 }]} onPress={() => startDay(day)} disabled={createSession.isPending}>
                        {createSession.isPending ? <ActivityIndicator color="#f1dfc6" /> : <Text style={s.startText}>Start This Session</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0908" },
  back: { color: "#d9ad63", fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 18 },
  kicker: { color: "#9d8f80", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Inter_400Regular" },
  title: { color: "#eee5d7", fontSize: 26, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold", marginTop: 2 },
  subtitle: { color: "#9f9586", fontSize: 12, marginTop: 4, fontFamily: "Inter_400Regular" },
  overview: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 14, marginTop: 16, marginBottom: 14 },
  overviewTitle: { color: "#d9ad63", fontSize: 16, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  overviewText: { color: "#cfc5b8", fontSize: 12, lineHeight: 18, marginTop: 4, fontFamily: "Inter_400Regular" },
  weekCard: { borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#11100e", marginBottom: 10 },
  currentWeek: { borderColor: "#8c6a36" },
  weekHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  weekBadge: { width: 38, height: 38, borderWidth: 1, borderColor: "#8c6a36", alignItems: "center", justifyContent: "center", backgroundColor: "#15130f" },
  weekBadgeText: { color: "#d9ad63", fontSize: 12, fontFamily: "Inter_700Bold" },
  weekTitle: { color: "#eee5d7", fontSize: 15, fontWeight: "900", fontFamily: "PlayfairDisplay_700Bold" },
  weekMeta: { color: "#8f887d", fontSize: 11, marginTop: 2 },
  expand: { color: "#d9ad63", fontSize: 10, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  dayBlock: { borderTopWidth: 1, borderTopColor: "#2a2520", paddingHorizontal: 14 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  dayLabel: { color: "#8f887d", fontSize: 10, width: 44, fontFamily: "Inter_700Bold" },
  dayFocus: { color: "#d8c4a5", fontSize: 13, fontFamily: "Inter_700Bold" },
  dayMeta: { color: "#8f887d", fontSize: 10, marginTop: 2 },
  exerciseList: { paddingBottom: 14, gap: 7 },
  note: { color: "#d9ad63", fontSize: 11, lineHeight: 16, borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#15130f", padding: 8 },
  exercise: { color: "#d8c4a5", fontSize: 12, lineHeight: 18 },
  startBtn: { borderWidth: 1, borderColor: "#c08c4e", backgroundColor: "#74291f", padding: 12, alignItems: "center", marginTop: 4 },
  startText: { color: "#f1dfc6", fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
});
