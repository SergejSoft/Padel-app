import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Lock, LogIn } from "lucide-react";
import type { TournamentAccessError } from "@/lib/tournament-access";

interface TournamentAccessGateProps {
  error: TournamentAccessError;
  /** Path to return to after signing in (defaults to the current page). */
  returnTo?: string;
}

/**
 * Full-page state shown when a tournament view is restricted: prompts a
 * sign-in, or explains that only registered players and the organizer can see it.
 */
export function TournamentAccessGate({ error, returnTo }: TournamentAccessGateProps) {
  const redirect = returnTo ?? `${window.location.pathname}${window.location.search}`;
  const needsSignIn = error.code === "sign_in_required";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {needsSignIn ? <LogIn className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            {needsSignIn ? "Sign in to view this tournament" : "This tournament is private"}
          </h1>
          <CardDescription>
            {error.tournamentName && (
              <span className="block font-medium text-foreground mb-1">{error.tournamentName}</span>
            )}
            {needsSignIn
              ? "The schedule and scores are only visible to players registered in this tournament, its organizer, and admins."
              : "Only players registered in this tournament, its organizer, and admins can see the schedule and scores. If you registered with a different email, sign in with that account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {needsSignIn && (
            <Button asChild>
              <a href={`/login?redirect=${encodeURIComponent(redirect)}`}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </a>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/">Go to home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
