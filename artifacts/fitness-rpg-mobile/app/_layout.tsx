import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL || `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const devAuthBypass = process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS === "true";
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

setBaseUrl(apiBaseUrl);
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function DevAuthGuard() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    setAuthTokenGetter(null);
  }, []);

  useEffect(() => {
    const inAuthGroup = (segments[0] as string) === "(auth)";
    if (inAuthGroup) {
      router.replace("/(tabs)" as never);
    }
  }, [segments]);

  return null;
}

function AuthGuard() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    const inAuthGroup = (segments[0] as string) === "(auth)";
    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in" as never);
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)" as never);
    }
  }, [isSignedIn, isLoaded, segments]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      {devAuthBypass ? <DevAuthGuard /> : <AuthGuard />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="session" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="training" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="records" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const app = (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );

  if (devAuthBypass) {
    return app;
  }

  if (!publishableKey) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#0c0b09" }}>
          <Text style={{ color: "#d9ad63", fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
            Ascension Quest is missing mobile auth configuration.
          </Text>
          <Text style={{ color: "#d8c4a5", fontSize: 14, lineHeight: 20 }}>
            Rebuild the APK with EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY set in the EAS profile.
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl}
    >
      <ClerkLoaded>
        {app}
      </ClerkLoaded>
    </ClerkProvider>
  );
}
