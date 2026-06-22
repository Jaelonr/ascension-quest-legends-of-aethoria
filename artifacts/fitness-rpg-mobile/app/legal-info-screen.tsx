import { LEGAL_COPY, type LegalCopyKey } from "@/utils/legal-copy";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function LegalInfoScreen({ type }: { type: LegalCopyKey }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const copy = LEGAL_COPY[type];

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.kicker}>GUILD RECORD</Text>
        <Text style={s.title}>{copy.title}</Text>
        <View style={s.panel}>
          <Text style={s.body}>{copy.body}</Text>
        </View>
        <TouchableOpacity style={s.button} onPress={() => router.replace("/(tabs)/inventory" as never)} activeOpacity={0.82}>
          <Text style={s.buttonText}>Back to Character</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0a0908" },
  kicker: { color: "#9d8f80", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
  title: { color: "#e5c386", fontSize: 24, lineHeight: 30, marginTop: 8, marginBottom: 18, fontFamily: "PlayfairDisplay_700Bold" },
  panel: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", padding: 16 },
  body: { color: "#d8c4a5", fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular" },
  button: { marginTop: 16, borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#0c0b09", paddingVertical: 13, alignItems: "center" },
  buttonText: { color: "#d9ad63", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
});
