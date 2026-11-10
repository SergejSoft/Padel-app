/**
 * Where a tournament sits in its lifecycle, derived from its stored status
 * and its calendar date. Shared by the organizer dashboard, the player home
 * and the public tournament page so they all agree on what "past" means.
 *
 * Tournament dates are calendar days ("YYYY-MM-DD") without a timezone, so
 * they are compared as strings against the viewer's local day. Parsing them
 * with `new Date(date)` would treat them as UTC midnight and flip a same-day
 * tournament to "past" in any timezone east of UTC.
 */

export type TournamentPhase =
  | "today"
  | "upcoming"
  | "needs-results"
  | "completed"
  | "cancelled"
  | "archived";

export interface LifecycleTournament {
  id: number;
  status: string;
  date: string | null;
}

export interface TournamentGroups<T> {
  /** Today and future tournaments, soonest first; undated ones last. */
  upcoming: T[];
  /** Date has passed but the tournament was never completed or cancelled. */
  needsResults: T[];
  /** Completed and cancelled tournaments, newest first. */
  finished: T[];
  archived: T[];
}

export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarDay(date: string | null | undefined): string | null {
  return date ? date.slice(0, 10) : null;
}

/** Local midnight of a "YYYY-MM-DD" date, for display formatting. */
export function parseCalendarDate(date: string): Date {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isBeforeToday(date: string | null | undefined, today: string = localDateString()): boolean {
  const day = calendarDay(date);
  return day !== null && day < today;
}

/** Whole days from `today` to `date` (negative when the date has passed). */
export function daysUntil(date: string, today: string = localDateString()): number {
  const toUtc = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(date) - toUtc(today)) / 86_400_000);
}

export function describeCountdown(date: string | null | undefined, today: string = localDateString()): string {
  if (!date) return "Date to be confirmed";
  const days = daysUntil(date, today);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

export function getTournamentPhase(
  tournament: Pick<LifecycleTournament, "status" | "date">,
  today: string = localDateString(),
): TournamentPhase {
  if (tournament.status === "archived") return "archived";
  if (tournament.status === "completed") return "completed";
  if (tournament.status === "cancelled") return "cancelled";

  const day = calendarDay(tournament.date);
  if (day === null || day > today) return "upcoming";
  if (day === today) return "today";
  return "needs-results";
}

export function compareSoonestFirst(a: LifecycleTournament, b: LifecycleTournament): number {
  const dayA = calendarDay(a.date);
  const dayB = calendarDay(b.date);
  if (dayA && dayB && dayA !== dayB) return dayA < dayB ? -1 : 1;
  if (dayA && !dayB) return -1;
  if (!dayA && dayB) return 1;
  return a.id - b.id;
}

export function compareNewestFirst(a: LifecycleTournament, b: LifecycleTournament): number {
  const dayA = calendarDay(a.date);
  const dayB = calendarDay(b.date);
  if (dayA && dayB && dayA !== dayB) return dayA > dayB ? -1 : 1;
  if (dayA && !dayB) return -1;
  if (!dayA && dayB) return 1;
  return b.id - a.id;
}

export function groupTournaments<T extends LifecycleTournament>(
  tournaments: readonly T[],
  today: string = localDateString(),
): TournamentGroups<T> {
  const groups: TournamentGroups<T> = {
    upcoming: [],
    needsResults: [],
    finished: [],
    archived: [],
  };

  for (const tournament of tournaments) {
    switch (getTournamentPhase(tournament, today)) {
      case "today":
      case "upcoming":
        groups.upcoming.push(tournament);
        break;
      case "needs-results":
        groups.needsResults.push(tournament);
        break;
      case "completed":
      case "cancelled":
        groups.finished.push(tournament);
        break;
      case "archived":
        groups.archived.push(tournament);
        break;
    }
  }

  groups.upcoming.sort(compareSoonestFirst);
  groups.needsResults.sort(compareNewestFirst);
  groups.finished.sort(compareNewestFirst);
  groups.archived.sort(compareNewestFirst);
  return groups;
}
