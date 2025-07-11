import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Tournament from "@/pages/tournament";
import SharedTournament from "@/pages/shared-tournament";
import SharedTournamentScores from "@/pages/shared-tournament-scores";
import Leaderboard from "@/pages/leaderboard";
import AmericanFormatRules from "@/pages/american-format-rules";
import ScoringDemo from "@/pages/scoring-demo";
import FoundationTest from "@/pages/foundation-test";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, error } = useAuth();

  // Only show loading for protected routes, not for public pages like scoring demo
  const isPublicRoute = window.location.pathname.includes('/scoring-demo') || 
                       window.location.pathname.includes('/american-format-rules') ||
                       window.location.pathname.includes('/shared/') ||
                       window.location.pathname.includes('/leaderboard/');

  if (isLoading && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={!isAuthenticated ? Landing : Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/shared/:shareId/scores" component={SharedTournamentScores} />
      <Route path="/shared/:shareId" component={SharedTournament} />
      <Route path="/leaderboard/:leaderboardId" component={Leaderboard} />
      <Route path="/american-format-rules" component={AmericanFormatRules} />
      <Route path="/scoring-demo" component={ScoringDemo} />
      <Route path="/foundation-test" component={FoundationTest} />
      {isAuthenticated && <Route path="/tournament" component={Tournament} />}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
