import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TournamentPhase } from "@shared/tournament-lifecycle";

const PHASE_BADGES: Record<TournamentPhase, { label: string; variant: BadgeProps["variant"]; className?: string }> = {
  today: { label: "Today", variant: "default" },
  upcoming: { label: "Upcoming", variant: "secondary" },
  "needs-results": { label: "Needs results", variant: "outline", className: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", variant: "default", className: "bg-green-600 hover:bg-green-600" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  archived: { label: "Archived", variant: "outline" },
};

interface TournamentPhaseBadgeProps {
  phase: TournamentPhase;
  label?: string;
  className?: string;
}

export function TournamentPhaseBadge({ phase, label, className }: TournamentPhaseBadgeProps) {
  const badge = PHASE_BADGES[phase];
  return (
    <Badge variant={badge.variant} className={cn("text-xs", badge.className, className)}>
      {label ?? badge.label}
    </Badge>
  );
}
