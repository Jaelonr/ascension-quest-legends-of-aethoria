import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/main-layout";
import { useEffect } from "react";

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
import { hasCompletedOnboarding } from "@/hooks/use-story";

const queryClient = new QueryClient();

function OnboardingGuard() {
  const [location, navigate] = useLocation();
  useEffect(() => {
    if (location !== "/onboarding" && !hasCompletedOnboarding()) {
      navigate("/onboarding");
    }
  }, []);
  return null;
}

function AppRoutes() {
  const [location] = useLocation();

  if (location === "/onboarding") {
    return <Onboarding />;
  }

  return (
    <MainLayout>
      <OnboardingGuard />
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
        <Route path="/inventory" component={Inventory} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
        <Route path="/onboarding" component={Onboarding} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
