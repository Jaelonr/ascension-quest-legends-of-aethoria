import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const queryClient = new QueryClient();

function Router() {
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
        <Route path="/inventory" component={Inventory} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
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
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
