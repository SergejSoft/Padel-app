import { Link } from "wouter";
import { Clock, ExternalLink, MapPin, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TournamentPhaseBadge } from "@/components/tournament-phase-badge";
import { formatTournamentDate } from "@/lib/tournament-dates";
import { cn } from "@/lib/utils";
import { describeCountdown, getTournamentPhase, type TournamentPhase } from "@shared/tournament-lifecycle";
import type { JoinedTournamentSummary } from "@shared/schema";

function phaseLabel(tournament: JoinedTournamentSummary, phase: TournamentPhase): string | undefined {
  if (phase === "needs-results") return "Awaiting results";
  if (phase === "upcoming" && tournament.registrationStatus === "open") return "Registration open";
  if (phase === "upcoming" && tournament.registrationStatus === "full") return "Full";
  return undefined;
}

interface JoinedTournamentCardProps {
  tournament: JoinedTournamentSummary;
  /** Highlight as the player's next tournament. */
  featured?: boolean;
}

export function JoinedTournamentCard({ tournament, featured = false }: JoinedTournamentCardProps) {
  const publicIdentifier = tournament.urlSlug || tournament.shareId;
  const phase = getTournamentPhase(tournament);
  const date = formatTournamentDate(
    tournament.date,
    featured ? { weekday: "long", day: "numeric", month: "long" } : undefined,
  );

  return (
    <Card className={cn(featured && "border-primary/40 bg-primary/5")} data-testid={featured ? "player-next-up-card" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {featured && (
              <Badge variant={phase === "today" ? "default" : "secondary"} className="mb-2">
                {describeCountdown(tournament.date)}
              </Badge>
            )}
            <CardTitle className={cn("text-lg", featured && "text-xl")}>{tournament.name}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-x-2">
              <span>{date ?? "Date to be confirmed"}</span>
              {tournament.time && (
                <span className="flex items-center">
                  <Clock className="mr-1 h-3.5 w-3.5" />
                  {tournament.time}
                </span>
              )}
            </CardDescription>
          </div>
          {!featured && <TournamentPhaseBadge phase={phase} label={phaseLabel(tournament, phase)} className="self-start" />}
        </div>
      </CardHeader>
      <CardContent>
        {tournament.location && (
          <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {tournament.location}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {publicIdentifier && (
            <Button asChild size="sm">
              <Link href={`/shared/${publicIdentifier}`}>
                View tournament
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
          {publicIdentifier && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/shared/${publicIdentifier}/scores`}>Live scores</Link>
            </Button>
          )}
          {tournament.leaderboardId && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/leaderboard/${tournament.leaderboardId}`}>
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
