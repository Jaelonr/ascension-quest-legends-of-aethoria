import { Feather } from "@expo/vector-icons";
import { markMobileOnboardingComplete } from "@/utils/onboarding";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Slide = {
  type: "narrative" | "system" | "world" | "final";
  title?: string;
  text: string;
  subtext: string;
};

const SLIDES: Slide[] = [
  {
    type: "narrative",
    text: "You were living an ordinary life.",
    subtext: "Work. Train. Sleep. Repeat. Then the air split open and something noticed you.",
  },
  {
    type: "narrative",
    text: "A Gate opened where no Gate should exist.",
    subtext: "A pull you could not resist. The feeling of falling through something infinite.",
  },
  {
    type: "system",
    title: "SYSTEM NOTIFICATION",
    text: "Otherworld transfer detected.\nCandidate bound to the System.",
    subtext: "Authority: UNKNOWN\nAbility: [Real-World Training Sync]",
  },
  {
    type: "system",
    title: "VESSEL SCAN REQUIRED",
    text: "The System requires identity, age, sex, activity, and available equipment.",
    subtext: "These records help the Guild assign fair duties. Your class must still be earned.",
  },
  {
    type: "world",
    text: "You open your eyes in Aethoria.",
    subtext: "A realm of magic and war. Its people know danger is coming, but only you can see the full warning.",
  },
  {
    type: "world",
    text: "The world danger level is critical.",
    subtext: "A great enemy gathers beyond the horizon. Aldric knows a summoning was attempted, but not the hidden System beneath it.",
  },
  {
    type: "final",
    title: "ASCENSION QUEST",
    text: "Train in your world. Fight in Aethoria.",
    subtext: "Every healthy decision becomes part of your legend. The System awaits your first scan.",
  },
];

const INTRO_SOUNDS = {
  select: require("../assets/sounds/system-select.wav"),
  warning: require("../assets/sounds/system-warning.wav"),
  complete: require("../assets/sounds/system-complete.wav"),
} as const;

function slidePalette(type: Slide["type"]) {
  if (type === "system") return { border: "#235e66", text: "#7ddce4", bg: "#071615", icon: "terminal" as const };
  if (type === "world") return { border: "#6b2f28", text: "#f09983", bg: "#1a0b08", icon: "globe" as const };
  if (type === "final") return { border: "#6b4d2f", text: "#d9ad63", bg: "#14100b", icon: "shield" as const };
  return { border: "#3b3328", text: "#eee5d7", bg: "#11100e", icon: "aperture" as const };
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const pulse = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;
  const palette = slidePalette(slide.type);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 80);
    reveal.setValue(0);
    flash.setValue(0);
    Animated.parallel([
      Animated.timing(reveal, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(flash, {
          toValue: 1,
          duration: 70,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flash, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    return () => clearTimeout(id);
  }, [flash, index, reveal]);

  const playCue = (type: keyof typeof INTRO_SOUNDS = "select") => {
    if (!soundEnabled) return;
    Audio.Sound.createAsync(INTRO_SOUNDS[type], { shouldPlay: true, volume: type === "complete" ? 0.42 : 0.26 })
      .then(({ sound }) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => undefined);
          }
        });
      })
      .catch(() => undefined);
    if (type === "warning") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Vibration.vibrate([0, 30, 50, 30]);
      return;
    }
    if (type === "complete") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate([0, 45, 80, 70]);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const advance = () => {
    if (last) return;
    playCue(slide.type === "world" ? "warning" : "select");
    setVisible(false);
    setTimeout(() => setIndex((prev) => Math.min(prev + 1, SLIDES.length - 1)), 160);
  };

  const finish = async () => {
    playCue("complete");
    await markMobileOnboardingComplete();
    router.replace("/setup" as any);
  };

  const skip = async () => {
    playCue("select");
    await markMobileOnboardingComplete();
    router.replace("/setup" as any);
  };

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.58] });
  const revealTranslate = reveal.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });

  return (
    <View style={[s.root, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 18 }]}>
      <Animated.View pointerEvents="none" style={[s.flash, { opacity: flash }]} />
      <View style={s.progress}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[s.dot, i <= index && { backgroundColor: palette.text, width: i === index ? 28 : 12 }]} />
        ))}
      </View>

      {!last ? (
        <TouchableOpacity style={s.skip} onPress={skip} activeOpacity={0.8}>
          <Text style={s.skipText}>Skip</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={s.soundToggle} onPress={() => { setSoundEnabled((value) => !value); playCue("select"); }} activeOpacity={0.8}>
        <Text style={s.soundText}>{soundEnabled ? "Sound On" : "Muted"}</Text>
      </TouchableOpacity>

      <Pressable style={s.pressArea} onPress={advance}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={[s.aura, { borderColor: palette.border, opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
          <View style={[s.symbol, { borderColor: palette.border, backgroundColor: palette.bg }]}>
            <Feather name={palette.icon} size={30} color={palette.text} />
          </View>

          {slide.title ? (
            <View style={[s.badge, { borderColor: palette.border, backgroundColor: palette.bg }]}>
              <Text style={[s.badgeText, { color: palette.text }]}>{slide.title}</Text>
            </View>
          ) : null}

          <Animated.View style={[s.card, { borderColor: palette.border, backgroundColor: palette.bg, opacity: visible ? reveal : 0.2, transform: [{ translateY: revealTranslate }] }]}>
            <Text style={[s.mainText, { color: palette.text }]}>{slide.text}</Text>
            <View style={[s.rule, { backgroundColor: palette.border }]} />
            <Text style={s.subText}>{slide.subtext}</Text>
          </Animated.View>

          {!last ? <Text style={s.tapHint}>Tap to continue</Text> : null}
        </ScrollView>
      </Pressable>

      {last ? (
        <View style={s.footer}>
          <TouchableOpacity style={s.beginBtn} onPress={finish} activeOpacity={0.86}>
            <Text style={s.beginText}>Begin The Scan</Text>
          </TouchableOpacity>
          <Text style={s.systemStatus}>SYSTEM STATUS: CRITICAL</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#030303", paddingHorizontal: 18 },
  flash: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, backgroundColor: "#7ddce4" },
  progress: { flexDirection: "row", justifyContent: "center", gap: 6, minHeight: 20 },
  dot: { width: 12, height: 3, backgroundColor: "#2a2520" },
  skip: { position: "absolute", top: 54, right: 18, zIndex: 2, borderWidth: 1, borderColor: "#3b3328", paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#0c0b09" },
  skipText: { color: "#8f887d", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  soundToggle: { position: "absolute", top: 54, left: 18, zIndex: 2, borderWidth: 1, borderColor: "#235e66", paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#071615" },
  soundText: { color: "#7ddce4", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  pressArea: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 28 },
  aura: { position: "absolute", width: 156, height: 156, borderRadius: 78, borderWidth: 1, top: "18%" },
  symbol: { width: 76, height: 76, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 18 },
  badge: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14 },
  badgeText: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  card: { width: "100%", borderWidth: 1, padding: 20 },
  mainText: { fontSize: 24, lineHeight: 34, textAlign: "center", fontFamily: "Inter_700Bold" },
  rule: { height: 1, width: 120, alignSelf: "center", marginVertical: 18, opacity: 0.8 },
  subText: { color: "#b6aa9c", fontSize: 14, lineHeight: 22, textAlign: "center" },
  tapHint: { color: "#5f574d", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginTop: 22, fontFamily: "Inter_700Bold" },
  footer: { gap: 10 },
  beginBtn: { backgroundColor: "#d9ad63", borderWidth: 1, borderColor: "#f0c77a", paddingVertical: 15, alignItems: "center" },
  beginText: { color: "#080706", fontFamily: "Inter_700Bold", fontSize: 14, textTransform: "uppercase", letterSpacing: 1.2 },
  systemStatus: { color: "#d95f45", textAlign: "center", fontSize: 10, letterSpacing: 2, fontFamily: "Inter_700Bold" },
});
