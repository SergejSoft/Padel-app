/**
 * Helpers for reading a generated schedule.
 *
 * Sit-outs are not stored on the schedule: a player rests in a round simply
 * by not appearing in any of that round's matches. These helpers derive that
 * information so every view (web, PDF, preview) shows the same answer.
 */

interface ScheduleMatchLike {
  team1: readonly [string, string];
  team2: readonly [string, string];
}

interface ScheduleRoundLike {
  round: number;
  matches: readonly ScheduleMatchLike[];
}

/** Every player who takes part in at least one match of the schedule. */
export function getSchedulePlayers(rounds: readonly ScheduleRoundLike[]): string[] {
  const players = new Set<string>();
  for (const round of rounds) {
    for (const match of round.matches) {
      match.team1.forEach(player => players.add(player));
      match.team2.forEach(player => players.add(player));
    }
  }
  return Array.from(players);
}

/** Players who are on court in the given round. */
export function getActivePlayers(round: ScheduleRoundLike): Set<string> {
  const active = new Set<string>();
  for (const match of round.matches) {
    match.team1.forEach(player => active.add(player));
    match.team2.forEach(player => active.add(player));
  }
  return active;
}

/**
 * Players who rest in the given round, in the order of `players`.
 * `players` should be the tournament's full player list; when it is missing
 * (e.g. an older record) callers can fall back to `getSchedulePlayers`.
 */
export function getSittingOutPlayers(
  round: ScheduleRoundLike,
  players: readonly string[],
): string[] {
  const active = getActivePlayers(round);
  return players.filter(player => !active.has(player));
}
