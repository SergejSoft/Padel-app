import { Clock, Edit, MapPin, Share, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TournamentPhaseBadge } from "@/components/tournament-phase-badge";
import { formatTournamentDate } from "@/lib/tournament-dates";
import { cn } from "@/lib/utils";
import { describeCountdown, getTournamentPhase, type TournamentPhase } from "@shared/tournament-lifecycle";
import type { Tournament } from "@shared/schema";

interface OrganizerTournamentCardProps {
  tournament: Tournament;
  currentUserId?: string;
  onManage: (tournament: Tournament) => void;
}

function phaseLabel(tournament: Tournament, phase: TournamentPhase): string | undefined {
  if (phase !== "needs-results") return undefined;
  return tournament.schedule?.length ? "Scores not saved" : "No schedule yet";
}

function registrationCounts(tournament: Tournament) {
  const registered = tournament.registeredParticipants?.length ?? 0;
  const capacity = tournament.maxParticipants ?? tournament.playersCount;
  return { registered, capacity };
}

function registrationStatusLabel(status: string | null): string {
  if (status === "open") return "Registration open";
  if (status === "full") return "Full";
  return "Registration closed";
}

function ManagePill() {
  return (
    <span className="inline-flex w-full sm:w-auto min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
      <Edit className="mr-2 h-4 w-4" />
      Manage
    </span>
  );
}

const cardButtonClassName =
  "flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function OrganizerTournamentRow({ tournament, currentUserId, onManage }: OrganizerTournamentCardProps) {
  const phase = getTournamentPhase(tournament);
  const { registered, capacity } = registrationCounts(tournament);

  return (
    <button
      type="button"
      onClick={() => onManage(tournament)}
      aria-label={`Edit tournament ${tournament.name}`}
      className={cn(cardButtonClassName, "p-4 border-border bg-background hover:bg-accent hover:border-primary/40")}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="font-semibold text-foreground truncate flex-shrink-0">{tournament.name}</h3>
          <div className="flex flex-wrap gap-1">
            {tournament.tournamentMode === 'registration' ? (
              <Badge
                variant={tournament.registrationStatus === 'full' ? 'default' : 'outline'}
                className="text-xs"
                title="Registered players / capacity"
              >
                <Users className="mr-1 h-3 w-3" />
                {registered}/{capacity} registered
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                {tournament.playersCount} Players
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {tournament.courtsCount} {tournament.courtsCount === 1 ? 'Court' : 'Courts'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {tournament.pointsPerMatch} Points
            </Badge>
            <TournamentPhaseBadge phase={phase} label={phaseLabel(tournament, phase)} />
            {currentUserId && tournament.coOrganizerId === currentUserId && tournament.organizerId !== currentUserId && (
              <Badge variant="outline" className="text-xs">Co-organizer</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
          <span className="flex items-center">
            📅 {formatTournamentDate(tournament.date) ?? 'No date set'}
          </span>
          <span className="flex items-center truncate">
            📍 {tournament.location || 'No location set'}
          </span>
          {tournament.shareId && (
            <span className="flex items-center">
              <Share className="w-3 h-3 mr-1" />
              Shareable
            </span>
          )}
          {tournament.status === 'completed' && tournament.leaderboardId && (
            <span className="flex items-center">
              <Trophy className="w-3 h-3 mr-1" />
              Final Results
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center">
        <ManagePill />
      </div>
    </button>
  );
}

export function NextUpCard({ tournament, currentUserId, onManage }: OrganizerTournamentCardProps) {
  const { registered, capacity } = registrationCounts(tournament);
  const isRegistration = tournament.tournamentMode === "registration";
  const date = formatTournamentDate(tournament.date, { weekday: "long", day: "numeric", month: "long" });
  const isToday = getTournamentPhase(tournament) === "today";

  return (
    <button
      type="button"
      onClick={() => onManage(tournament)}
      aria-label={`Edit tournament ${tournament.name}`}
      data-testid="next-up-card"
      className={cn(cardButtonClassName, "p-5 border-primary/40 bg-primary/5 hover:bg-primary/10")}
    >
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={isToday ? "default" : "secondary"}>{describeCountdown(tournament.date)}</Badge>
          {date && <span className="font-medium text-foreground">{date}</span>}
          {tournament.time && (
            <span className="flex items-center text-muted-foreground">
              <Clock className="mr-1 h-3.5 w-3.5" />
              {tournament.time}
            </span>
          )}
          {currentUserId && tournament.coOrganizerId === currentUserId && tournament.organizerId !== currentUserId && (
            <Badge variant="outline" className="text-xs">Co-organizer</Badge>
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground truncate">{tournament.name}</h3>
          <p className="mt-1 flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{tournament.location || "No location set"}</span>
          </p>
        </div>
        {isRegistration ? (
          <div className="max-w-sm space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center font-medium">
                <Users className="mr-1 h-4 w-4" />
                {registered}/{capacity} registered
              </span>
              <span className="text-muted-foreground">{registrationStatusLabel(tournament.registrationStatus)}</span>
            </div>
            <Progress
              value={capacity > 0 ? Math.min(100, (registered / capacity) * 100) : 0}
              className="h-2"
              aria-label="Registration progress"
            />
          </div>
        ) : (
          <p className="flex items-center text-sm text-muted-foreground">
            <Users className="mr-1 h-4 w-4" />
            {tournament.playersCount} players
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {tournament.courtsCount} {tournament.courtsCount === 1 ? "court" : "courts"} · {tournament.pointsPerMatch} points per match
        </p>
      </div>
      <div className="flex items-center sm:self-end">
        <ManagePill />
      </div>
    </button>
  );
}
