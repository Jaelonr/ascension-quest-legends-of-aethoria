import { useSignUp, useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
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

const OAUTH_REDIRECT_URL = AuthSession.makeRedirectUri({
  scheme: "ascension-quest",
  path: "sso-callback",
});

const COLORS = {
  background: "#0c0b09",
  card: "#11100e",
  border: "#3b3328",
  primary: "#d9ad63",
  accent: "#ffbf00",
  foreground: "#eee5d7",
  muted: "#8f887d",
  danger: "#ef4444",
  secondaryBg: "#171510",
  success: "#22c55e",
};

function getAuthErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown }).errors)
  ) {
    const firstError = (error as { errors: Array<{ longMessage?: string; message?: string }> }).errors[0];
    return firstError?.longMessage || firstError?.message || "Google sign-up could not be completed.";
  }

  if (error instanceof Error) return error.message;

  return "Google sign-up could not be completed. Check that Google sign-in is enabled for this app.";
}

function getEmailAuthErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown }).errors)
  ) {
    const firstError = (error as { errors: Array<{ longMessage?: string; message?: string }> }).errors[0];
    return firstError?.longMessage || firstError?.message || fallback;
  }

  if (error instanceof Error) return error.message;

  return fallback;
}

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [emailFlowError, setEmailFlowError] = useState<string | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);
  const [lastCodeSentAt, setLastCodeSentAt] = useState<Date | null>(null);

  const handleSignUp = async () => {
    try {
      setEmailFlowError(null);
      const { error } = await signUp.password({ emailAddress: email.trim(), password });
      if (error) {
        setEmailFlowError(getEmailAuthErrorMessage(error, "Account creation could not be started."));
        return;
      }

      const { error: verificationError } = await signUp.verifications.sendEmailCode();
      if (verificationError) {
        setEmailFlowError(
          getEmailAuthErrorMessage(
            verificationError,
            "The verification email could not be sent. Check the Clerk email settings for this production instance.",
          ),
        );
        return;
      }

      setLastCodeSentAt(new Date());
      setVerificationPending(true);
    } catch (err) {
      setEmailFlowError(
        getEmailAuthErrorMessage(
          err,
          "The verification email could not be sent. Check the email address, spam folder, and Clerk email settings.",
        ),
      );
    }
  };

  const handleVerify = async () => {
    try {
      setEmailFlowError(null);
      const { error } = await signUp.verifications.verifyEmailCode({ code });
      if (error) {
        setEmailFlowError(getEmailAuthErrorMessage(error, "That verification code could not be accepted."));
        return;
      }

      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl("/");
            if (url.startsWith("http")) return;
            router.replace("/(tabs)" as never);
          },
        });
      }
    } catch (err) {
      setEmailFlowError(getEmailAuthErrorMessage(err, "That verification code could not be accepted."));
    }
  };

  const handleResendCode = async () => {
    try {
      setEmailFlowError(null);
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) {
        setEmailFlowError(getEmailAuthErrorMessage(error, "A new verification code could not be sent."));
        return;
      }
      setLastCodeSentAt(new Date());
    } catch (err) {
      setEmailFlowError(getEmailAuthErrorMessage(err, "A new verification code could not be sent."));
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setSsoError(null);
      setSsoLoading(true);
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: OAUTH_REDIRECT_URL,
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
      console.error("Google sign-up error:", JSON.stringify(err, null, 2));
      setSsoError(getAuthErrorMessage(err));
    } finally {
      setSsoLoading(false);
    }
  };

  const isLoading = fetchStatus === "fetching";
  const needsVerification =
    (verificationPending || signUp.status === "missing_requirements") &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  if (needsVerification) {
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
            <View style={styles.brandSeal}>
              <Text style={styles.brandName}>Ascension Quest</Text>
              <Text style={styles.brandSub}>Legends of Aethoria</Text>
            </View>
            <Text style={styles.rank}>SYSTEM</Text>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              A code was sent to {email}. Enter it below to activate your account.
            </Text>
            {lastCodeSentAt && (
              <Text style={styles.hint}>
                Sent at {lastCodeSentAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
                Check spam or promotions if it is not in your inbox.
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.input}
              value={code}
              placeholder="000000"
              placeholderTextColor={COLORS.muted}
              onChangeText={setCode}
              keyboardType="numeric"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
            />
            {errors.fields.code && (
              <Text style={styles.error}>{errors.fields.code.message}</Text>
            )}
            {emailFlowError && <Text style={styles.error}>{emailFlowError}</Text>}

            <Pressable
              style={[
                styles.primaryBtn,
                (code.length < 6 || isLoading) && styles.btnDisabled,
              ]}
              onPress={handleVerify}
              disabled={code.length < 6 || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify & Enter</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.textBtn}
              onPress={handleResendCode}
            >
              <Text style={styles.textBtnText}>Send another code to {email}</Text>
            </Pressable>
            <Pressable
              style={styles.textBtn}
              onPress={() => {
                setVerificationPending(false);
                setEmailFlowError(null);
                setCode("");
                void signUp.reset();
              }}
            >
              <Text style={styles.textBtnText}>Change email address</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const canSubmit = email.length > 0 && password.length >= 8 && !isLoading;

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
          <View style={styles.brandSeal}>
            <Text style={styles.brandName}>Ascension Quest</Text>
            <Text style={styles.brandSub}>Legends of Aethoria</Text>
          </View>
          <Text style={styles.rank}>SYSTEM</Text>
          <Text style={styles.title}>Begin Your Journey</Text>
          <Text style={styles.subtitle}>
            Create your adventurer account and answer Aethoria's call.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            placeholder="adventurer@example.com"
            placeholderTextColor={COLORS.muted}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          {errors.fields.emailAddress && (
            <Text style={styles.error}>{errors.fields.emailAddress.message}</Text>
          )}

          <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            placeholder="Min 8 characters"
            placeholderTextColor={COLORS.muted}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
          />
          {errors.fields.password && (
            <Text style={styles.error}>{errors.fields.password.message}</Text>
          )}
          {emailFlowError && <Text style={styles.error}>{emailFlowError}</Text>}

          <Pressable
            style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]}
            onPress={handleSignUp}
            disabled={!canSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={[styles.oauthBtn, ssoLoading && styles.btnDisabled]}
            onPress={handleGoogleSignUp}
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
          {ssoError && <Text style={styles.oauthError}>{ssoError}</Text>}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.push("/(auth)/sign-in" as never)}>
            <Text style={styles.footerLink}>Sign In</Text>
          </Pressable>
        </View>

        {/* Required for Clerk bot protection */}
        <View nativeID="clerk-captcha" />
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
  header: {
    alignItems: "center",
    marginBottom: 32,
    gap: 10,
  },
  brandSeal: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6f4b2a",
    backgroundColor: "#090705",
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 6,
    minWidth: 230,
  },
  brandName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: COLORS.foreground,
    letterSpacing: 1.1,
    textAlign: "center",
  },
  brandSub: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
    letterSpacing: 2.6,
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
  },
  rank: {
    fontSize: 11,
    letterSpacing: 4,
    color: COLORS.accent,
    fontFamily: "Inter_700Bold",
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
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 4,
    borderLeftColor: COLORS.primary,
    borderLeftWidth: 2,
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
    borderRadius: 0,
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
  oauthError: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.danger,
    lineHeight: 17,
    marginTop: 10,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 0,
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
    borderRadius: 0,
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
