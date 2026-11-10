import { parseCalendarDate } from "@shared/tournament-lifecycle";

export function formatTournamentDate(
  date: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string | null {
  return date ? parseCalendarDate(date).toLocaleDateString(undefined, options) : null;
}
