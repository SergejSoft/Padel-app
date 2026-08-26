import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { useAuth as useClerkAuth } from "@clerk/react";
import { queryClient, setAuthTokenProvider } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import PlayerHome from "@/pages/player-home";
import Tournament from "@/pages/tournament";
import SharedTournament from "@/pages/shared-tournament";
import SharedTournamentScores from "@/pages/shared-tournament-scores";
import Leaderboard from "@/pages/leaderboard";
import RegistrationPage from "@/pages/registration";
import AmericanFormatRules from "@/pages/american-format-rules";
import NotFound from "@/pages/not-found";

function AuthTokenBridge() {
  const { getToken } = useClerkAuth();

  useEffect(() => {
    setAuthTokenProvider(getToken);
    return () => setAuthTokenProvider(null);
  }, [getToken]);

  return null;
}

function Router() {
  const { isAuthenticated, isLoading, isPlayer } = useAuth();

  const isPublicRoute = window.location.pathname.includes('/american-format-rules') ||
                       window.location.pathname.includes('/shared/') ||
                       window.location.pathname.includes('/leaderboard/') ||
                       window.location.pathname.includes('/register/');

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
      <Route
        path="/"
        component={!isAuthenticated ? Landing : isPlayer ? PlayerHome : Dashboard}
      />
      <Route path="/login" component={Login} />
      <Route path="/shared/:shareId/scores" component={SharedTournamentScores} />
      <Route path="/shared/:shareId" component={SharedTournament} />
      <Route path="/leaderboard/:leaderboardId" component={Leaderboard} />
      <Route path="/register/:registrationId" component={RegistrationPage} />
      <Route path="/american-format-rules" component={AmericanFormatRules} />
      {isAuthenticated && <Route path="/tournament" component={Tournament} />}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthTokenBridge />
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
