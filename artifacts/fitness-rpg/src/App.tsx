import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/main-layout";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Nutrition from "@/pages/nutrition";
import Training from "@/pages/training";
import ActiveSession from "@/pages/active-session";
import Equipment from "@/pages/equipment";
import Skills from "@/pages/skills";
import Quests from "@/pages/quests";
import Inventory from "@/pages/inventory";
import Analytics from "@/pages/analytics";
import Planner from "@/pages/planner";
import Raids from "@/pages/raids";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Program from "@/pages/program";
import World from "@/pages/world";
import Onboarding from "@/pages/onboarding";
import CharacterSetup from "@/pages/character-setup";
import ClassPage from "@/pages/class";
import Landing from "@/pages/landing";
import { hasCompletedOnboarding, hasCompletedSetup } from "@/hooks/use-story";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#00d4e8",
    colorForeground: "#dde5f0",
    colorMutedForeground: "#8b95a8",
    colorDanger: "#e03c5a",
    colorBackground: "#0d0f1a",
    colorInput: "#1c2035",
    colorInputForeground: "#dde5f0",
    colorNeutral: "#1c2035",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0d0f1a] border border-[#1c2035] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_0_40px_rgba(0,212,232,0.1)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#dde5f0] font-semibold",
    headerSubtitle: "text-[#8b95a8]",
    socialButtonsBlockButtonText: "text-[#dde5f0]",
    formFieldLabel: "text-[#8b95a8]",
    footerActionLink: "text-[#00d4e8] hover:text-[#00e5ff]",
    footerActionText: "text-[#8b95a8]",
    dividerText: "text-[#8b95a8]",
    identityPreviewEditButton: "text-[#00d4e8]",
    formFieldSuccessText: "text-[#4ade80]",
    alertText: "text-[#dde5f0]",
    logoBox: "mb-2",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border-[#1c2035] bg-[#131520] hover:bg-[#1c2035] text-[#dde5f0]",
    formButtonPrimary: "bg-[#00d4e8] hover:bg-[#00e5ff] text-[#0d0f1a] font-semibold",
    formFieldInput: "bg-[#1c2035] border-[#2a2f45] text-[#dde5f0]",
    footerAction: "border-t border-[#1c2035]",
    dividerLine: "bg-[#1c2035]",
    alert: "border-[#e03c5a]/30 bg-[#e03c5a]/10",
    otpCodeFieldInput: "bg-[#1c2035] border-[#2a2f45] text-[#dde5f0]",
    formFieldRow: "",
    main: "",
  },
};

function AppRoutes() {
  const [location] = useLocation();

  const onboarded = hasCompletedOnboarding();
  const setup = hasCompletedSetup();

  if (!onboarded && location !== "/onboarding" && location !== "/setup") {
    return <Redirect to="/onboarding" />;
  }

  if (onboarded && !setup && location !== "/setup") {
    return <Redirect to="/setup" />;
  }

  if (location === "/onboarding") {
    return <Onboarding />;
  }

  if (location === "/setup") {
    return <CharacterSetup />;
  }

  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/nutrition" component={Nutrition} />
        <Route path="/training" component={Training} />
        <Route path="/training/planner" component={Planner} />
        <Route path="/training/program" component={Program} />
        <Route path="/training/session/:id" component={ActiveSession} />
        <Route path="/equipment" component={Equipment} />
        <Route path="/skills" component={Skills} />
        <Route path="/quests" component={Quests} />
        <Route path="/raids" component={Raids} />
        <Route path="/world" component={World} />
        <Route path="/class" component={ClassPage} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ProtectedShell() {
  const [location] = useLocation();
  return (
    <>
      <Show when="signed-in">
        <AppRoutes />
      </Show>
      <Show when="signed-out">
        {location === "/" ? <Landing /> : <Redirect to="/sign-in" />}
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back, Hunter",
            subtitle: "Sign in to continue your journey",
          },
        },
        signUp: {
          start: {
            title: "Awaken Your Power",
            subtitle: "Create your hunter account to begin",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={ProtectedShell} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
