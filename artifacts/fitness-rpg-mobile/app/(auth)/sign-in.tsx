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

const OAUTH_REDIRECT_URL = AuthSession.makeRedirectUri({
  scheme: "fitness-rpg-mobile",
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
};

function getAuthErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown }).errors)
  ) {
    const firstError = (error as { errors: Array<{ longMessage?: string; message?: string }> }).errors[0];
    return firstError?.longMessage || firstError?.message || "Google sign-in could not be completed.";
  }

  if (error instanceof Error) return error.message;

  return "Google sign-in could not be completed. Check that Google sign-in is enabled for this app.";
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

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [ssoLoading, setSsoLoading] = useState<"google" | "apple" | null>(null);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCodeSentAt, setResetCodeSentAt] = useState<Date | null>(null);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const handleEmailSignIn = async () => {
    try {
      setEmailError(null);
      const { error } = await signIn.password({ emailAddress: email.trim(), password });
      if (error) {
        setEmailError(getEmailAuthErrorMessage(error, "Sign-in failed. Check your email and password."));
        return;
      }

      if (signIn.status === "complete") {
        await finalizeSignIn();
      }
    } catch (err) {
      setEmailError(getEmailAuthErrorMessage(err, "Sign-in failed. Check your email and password."));
    }
  };

  const finalizeSignIn = async () => {
    const { error } = await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl("/");
        if (url.startsWith("http")) return;
        router.replace("/(tabs)" as never);
      },
    });
    if (error) {
      setEmailError(getEmailAuthErrorMessage(error, "Sign-in could not be completed."));
    }
  };

  const handleVerify = async () => {
    try {
      setEmailError(null);
      const { error } = await signIn.mfa.verifyEmailCode({ code: verifyCode });
      if (error) {
        setEmailError(getEmailAuthErrorMessage(error, "That verification code could not be accepted."));
        return;
      }
      if (signIn.status === "complete") {
        await finalizeSignIn();
      }
    } catch (err) {
      setEmailError(getEmailAuthErrorMessage(err, "That verification code could not be accepted."));
    }
  };

  const startPasswordReset = async () => {
    try {
      const identifier = (resetEmail || email).trim();
      setEmailError(null);
      if (!identifier) {
        setEmailError("Enter the email address attached to your account first.");
        return;
      }

      const { error: createError } = await signIn.create({ identifier });
      if (createError) {
        setEmailError(getEmailAuthErrorMessage(createError, "A reset code could not be requested for that email."));
        return;
      }

      const { error: sendCodeError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendCodeError) {
        setEmailError(getEmailAuthErrorMessage(sendCodeError, "A reset code could not be sent to that email."));
        return;
      }

      setResetEmail(identifier);
      setResetCodeSent(true);
      setResetCodeSentAt(new Date());
    } catch (err) {
      setEmailError(getEmailAuthErrorMessage(err, "A reset code could not be sent to that email."));
    }
  };

  const verifyResetCode = async () => {
    try {
      setEmailError(null);
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code: resetCode });
      if (error) {
        setEmailError(getEmailAuthErrorMessage(error, "That reset code could not be accepted."));
      }
    } catch (err) {
      setEmailError(getEmailAuthErrorMessage(err, "That reset code could not be accepted."));
    }
  };

  const submitNewPassword = async () => {
    try {
      setEmailError(null);
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });
      if (error) {
        setEmailError(getEmailAuthErrorMessage(error, "That password could not be saved."));
        return;
      }

      if (signIn.status === "complete") {
        await finalizeSignIn();
      } else if (signIn.status === "needs_second_factor") {
        setEmailError("Your password was reset, but this account requires another verification step.");
      } else {
        setEmailError("Your password was reset, but sign-in could not be completed automatically. Try signing in again.");
      }
    } catch (err) {
      setEmailError(getEmailAuthErrorMessage(err, "That password could not be saved."));
    }
  };

  const resetPasswordFlow = () => {
    setResetCodeSent(false);
    setResetCode("");
    setNewPassword("");
    setResetCodeSentAt(null);
    setEmailError(null);
    signIn.reset();
  };

  const isLoading = fetchStatus === "fetching";

  const handleSSOSignIn = useCallback(
    async (strategy: "oauth_google" | "oauth_apple") => {
      try {
        setSsoError(null);
        setSsoLoading(strategy === "oauth_google" ? "google" : "apple");
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
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
        console.error(`${strategy} SSO error:`, JSON.stringify(err, null, 2));
        setSsoError(getAuthErrorMessage(err));
      } finally {
        setSsoLoading(null);
      }
    },
    [startSSOFlow, router],
  );

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
        {emailError && <Text style={styles.error}>{emailError}</Text>}
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

  if (resetCodeSent || signIn.status === "needs_new_password") {
    const canVerifyReset = resetCode.length >= 6 && !isLoading;
    const canSubmitNewPassword = newPassword.length >= 8 && !isLoading;

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
            <Text style={styles.title}>
              {signIn.status === "needs_new_password" ? "Set New Password" : "Check Your Email"}
            </Text>
            <Text style={styles.subtitle}>
              {signIn.status === "needs_new_password"
                ? "Choose a new password for your Ascension Quest account."
                : `A reset code was sent to ${resetEmail}.`}
            </Text>
            {resetCodeSentAt && signIn.status !== "needs_new_password" && (
              <Text style={styles.hint}>
                Sent at {resetCodeSentAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
                Check spam or promotions if it is not in your inbox.
              </Text>
            )}
          </View>

          <View style={styles.card}>
            {signIn.status === "needs_new_password" ? (
              <>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  placeholder="Min 8 characters"
                  placeholderTextColor={COLORS.muted}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
                {errors.fields.password && (
                  <Text style={styles.error}>{errors.fields.password.message}</Text>
                )}
                {emailError && <Text style={styles.error}>{emailError}</Text>}

                <Pressable
                  style={[styles.primaryBtn, !canSubmitNewPassword && styles.btnDisabled]}
                  onPress={submitNewPassword}
                  disabled={!canSubmitNewPassword}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.background} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Set Password & Sign In</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>Reset Code</Text>
                <TextInput
                  style={styles.input}
                  value={resetCode}
                  placeholder="000000"
                  placeholderTextColor={COLORS.muted}
                  onChangeText={setResetCode}
                  keyboardType="numeric"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                />
                {errors.fields.code && (
                  <Text style={styles.error}>{errors.fields.code.message}</Text>
                )}
                {emailError && <Text style={styles.error}>{emailError}</Text>}

                <Pressable
                  style={[styles.primaryBtn, !canVerifyReset && styles.btnDisabled]}
                  onPress={verifyResetCode}
                  disabled={!canVerifyReset}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.background} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify Code</Text>
                  )}
                </Pressable>

                <Pressable style={styles.textBtn} onPress={startPasswordReset}>
                  <Text style={styles.textBtnText}>Send another code to {resetEmail}</Text>
                </Pressable>
              </>
            )}

            <Pressable style={styles.textBtn} onPress={resetPasswordFlow}>
              <Text style={styles.textBtnText}>Back to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
          <View style={styles.brandSeal}>
            <Text style={styles.brandName}>Ascension Quest</Text>
            <Text style={styles.brandSub}>Legends of Aethoria</Text>
          </View>
          <Text style={styles.rank}>SYSTEM</Text>
          <Text style={styles.title}>Welcome Back, Adventurer</Text>
          <Text style={styles.subtitle}>
            Return to Aethoria and continue the record of your ascent.
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
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
          />
          {errors.fields.password && (
            <Text style={styles.error}>{errors.fields.password.message}</Text>
          )}
          {emailError && <Text style={styles.error}>{emailError}</Text>}

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

          <Pressable
            style={styles.textBtn}
            onPress={() => {
              setResetEmail(email.trim());
              void startPasswordReset();
            }}
          >
            <Text style={styles.textBtnText}>Forgot or need to set your password?</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={[styles.oauthBtn, ssoLoading !== null && styles.btnDisabled]}
            onPress={() => handleSSOSignIn("oauth_google")}
            disabled={ssoLoading !== null}
          >
            {ssoLoading === "google" ? (
              <ActivityIndicator color={COLORS.foreground} />
            ) : (
              <>
                <Text style={styles.oauthIcon}>G</Text>
                <Text style={styles.oauthBtnText}>Continue with Google</Text>
              </>
            )}
          </Pressable>
          {ssoError && <Text style={styles.oauthError}>{ssoError}</Text>}

          {Platform.OS === "ios" && (
            <Pressable
              style={[
                styles.oauthBtn,
                styles.appleBtn,
                ssoLoading !== null && styles.btnDisabled,
              ]}
              onPress={() => handleSSOSignIn("oauth_apple")}
              disabled={ssoLoading !== null}
            >
              {ssoLoading === "apple" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.appleBtnText}>Continue with Apple</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Aethoria? </Text>
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
  appleBtn: {
    backgroundColor: "#000",
    borderColor: "#333",
    marginTop: 10,
  },
  appleIcon: {
    fontSize: 18,
    color: "#fff",
  },
  appleBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
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
