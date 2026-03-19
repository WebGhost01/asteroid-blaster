import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppLayout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import JobsPage from "@/pages/jobs/index";
import LinksPage from "@/pages/links/index";
import HabitsPage from "@/pages/habits/index";
import EventsPage from "@/pages/events/index";
import FlashcardsPage from "@/pages/flashcards/index";
import AIPage from "@/pages/ai/index";
import GamePage from "@/pages/game/index";
import AIStudioPage from "@/pages/ai-studio/index";
import AsteroidsPage from "@/pages/asteroids/index";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/jobs" component={JobsPage} />
        <Route path="/links" component={LinksPage} />
        <Route path="/habits" component={HabitsPage} />
        <Route path="/events" component={EventsPage} />
        <Route path="/flashcards" component={FlashcardsPage} />
        <Route path="/ai" component={AIPage} />
        <Route path="/ai-studio" component={AIStudioPage} />
        <Route path="/game" component={GamePage} />
        <Route path="/asteroids" component={AsteroidsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
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
