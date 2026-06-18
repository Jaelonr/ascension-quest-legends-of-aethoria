import { useSignIn, useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

const COLORS = {
  background: "#0c0d13",
  card: "#111520",
  border: "#1c2033",
  primary: "#0dcef5",
  accent: "#ffbf00",
  foreground: "#e8eaf6",
  muted: "#6b7280",
  danger: "#ef4444",
  secondaryBg: "#161b2e",
};

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [ssoLoading, setSsoLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const handleEmailSignIn = async () => {
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          if (url.startsWith("http")) return;
          router.replace("/(tabs)" as never);
        },
      });
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code: verifyCode });
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          if (url.startsWith("http")) return;
          router.replace("/(tabs)" as never);
        },
      });
    }
  };

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setSsoLoading(true);
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: async ({ decorateUrl }) => {
            const url = decorateUrl("/");
            if (url.startsWith("http")) return;
            router.replace("/(tabs)" as never);
          },
        });
      }
    } catch (err) {
      console.error("Google SSO error:", JSON.stringify(err, null, 2));
    } finally {
      setSsoLoading(false);
    }
  }, [startSSOFlow, router]);

  if (signIn.status === "needs_client_trust") {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.title}>Verify Identity</Text>
        <Text style={styles.subtitle}>Enter the code sent to your email</Text>
        <TextInput
          style={styles.input}
          value={verifyCode}
          placeholder="Verification code"
          placeholderTextColor={COLORS.muted}
          onChangeText={setVerifyCode}
          keyboardType="numeric"
          autoComplete="one-time-code"
        />
        {errors.fields.code && (
          <Text style={styles.error}>{errors.fields.code.message}</Text>
        )}
        <Pressable
          style={[
            styles.primaryBtn,
            fetchStatus === "fetching" && styles.btnDisabled,
          ]}
          onPress={handleVerify}
          disabled={fetchStatus === "fetching"}
        >
          {fetchStatus === "fetching" ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.primaryBtnText}>Verify</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.textBtn}
          onPress={() => signIn.mfa.sendEmailCode()}
        >
          <Text style={styles.textBtnText}>Resend code</Text>
        </Pressable>
        <Pressable style={styles.textBtn} onPress={() => signIn.reset()}>
          <Text style={styles.textBtnText}>Start over</Text>
        </Pressable>
      </View>
    );
  }

  const isLoading = fetchStatus === "fetching";
  const canSubmit = email.length > 0 && password.length > 0 && !isLoading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.rank}>⚔</Text>
          <Text style={styles.title}>Welcome Back, Hunter</Text>
          <Text style={styles.subtitle}>
            Your journey continues. Sign in to access your power.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            placeholder="hunter@realm.gg"
            placeholderTextColor={COLORS.muted}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          {errors.fields.identifier && (
            <Text style={styles.error}>{errors.fields.identifier.message}</Text>
          )}

          <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            placeholder="••••••••"
            placeholderTextColor={COLORS.muted}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
          />
          {errors.fields.password && (
            <Text style={styles.error}>{errors.fields.password.message}</Text>
          )}

          <Pressable
            style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]}
            onPress={handleEmailSignIn}
            disabled={!canSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={[styles.oauthBtn, ssoLoading && styles.btnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={ssoLoading}
          >
            {ssoLoading ? (
              <ActivityIndicator color={COLORS.foreground} />
            ) : (
              <>
                <Text style={styles.oauthIcon}>G</Text>
                <Text style={styles.oauthBtnText}>Continue with Google</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to the realm? </Text>
          <Pressable onPress={() => router.push("/(auth)/sign-up" as never)}>
            <Text style={styles.footerLink}>Create Account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    gap: 14,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    gap: 10,
  },
  rank: {
    fontSize: 40,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: COLORS.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.secondaryBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: COLORS.foreground,
    marginBottom: 4,
  },
  error: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.danger,
    marginBottom: 4,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    minHeight: 50,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#000",
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.muted,
  },
  oauthBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.secondaryBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 13,
    minHeight: 50,
  },
  oauthIcon: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
  },
  oauthBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.foreground,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.muted,
  },
  footerLink: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.primary,
  },
  textBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  textBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: COLORS.primary,
  },
});
