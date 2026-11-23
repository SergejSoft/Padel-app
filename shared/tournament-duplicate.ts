import { nanoid } from "nanoid";
import { generateAmericanFormatTournament } from "./american-format-generator.js";
import { TOURNAMENT_CONFIG } from "./tournament-config.js";
import { isBeforeToday, localDateString } from "./tournament-lifecycle.js";
import type { InsertTournament, RegisteredParticipant, Round, Tournament } from "./schema.js";

export interface DuplicateTournamentOptions {
  name: string;
  /** Calendar day ("YYYY-MM-DD") for the copy; defaults to the source's date. */
  date?: string | null;
}

/**
 * Name offered for a copy: a trailing number is bumped ("Americano Day 3" ->
 * "Americano Day 4") so a series of daily sessions stays in order; anything
 * else gets a "(copy)" suffix.
 */
export function suggestDuplicateName(name: string): string {
  const trimmed = name.trim();
  const trailingNumber = trimmed.match(/^(.*?)(\d+)$/);
  const suggestion = trailingNumber
    ? `${trailingNumber[1]}${Number(trailingNumber[2]) + 1}`
    : `${trimmed} (copy)`;
  return suggestion.slice(0, TOURNAMENT_CONFIG.VALIDATION.MAX_TOURNAMENT_NAME_LENGTH);
}

/** A copy of a tournament that has already happened is meant for today. */
export function suggestDuplicateDate(
  sourceDate: string | null | undefined,
  today: string = localDateString(),
): string {
  if (!sourceDate || isBeforeToday(sourceDate, today)) return today;
  return sourceDate.slice(0, 10);
}

function generateSchedule(players: string[], courts: number, pointsPerMatch: number): Round[] {
  const { rounds, validation } = generateAmericanFormatTournament({ players, courts, pointsPerMatch });
  if (!validation.isValid) {
    throw new Error(`Failed to generate schedule: ${validation.errors.join(", ")}`);
  }
  return rounds.map(round => ({
    round: round.round,
    matches: round.matches.map(match => ({
      court: match.court,
      team1: [match.team1[0], match.team1[1]] as [string, string],
      team2: [match.team2[0], match.team2[1]] as [string, string],
      round: match.round,
      gameNumber: match.gameNumber,
    })),
  }));
}

/**
 * Builds the insert payload for a new tournament with the same format,
 * settings, managers and players (in the same order) as `source`, but with
 * no scores or results and a freshly generated schedule.
 *
 * `source` is only read. Everything copied is cloned so the new row never
 * shares objects with the source's JSON columns.
 */
export function buildDuplicateTournament(
  source: Tournament,
  { name, date }: DuplicateTournamentOptions,
): InsertTournament {
  const players = [...(source.players ?? [])];
  const isOpenRegistration =
    source.tournamentMode === TOURNAMENT_CONFIG.TOURNAMENT_MODE.SELF_REGISTRATION &&
    !(Array.isArray(source.schedule) && source.schedule.length > 0);

  // Registrations give players access to the schedule, so they come along
  // (as fresh entries) for both fixed and still-open registration tournaments.
  const registeredAt = new Date().toISOString();
  const registeredParticipants: RegisteredParticipant[] = (source.registeredParticipants ?? [])
    .filter(participant => participant.status !== "removed")
    .map(participant => ({ ...participant, id: nanoid(8), registeredAt }));

  const base = {
    name: name.trim(),
    date: date === undefined ? source.date : date,
    time: source.time,
    location: source.location,
    price: source.price,
    currency: source.currency,
    courtsCount: source.courtsCount,
    pointsPerMatch: source.pointsPerMatch,
    organizerId: source.organizerId,
    coOrganizerId: source.coOrganizerId,
    coOrganizerEmail: source.coOrganizerEmail,
    maxParticipants: source.maxParticipants,
    registeredParticipants,
    status: TOURNAMENT_CONFIG.STATUS.ACTIVE,
    results: null,
    finalScores: [],
  };

  if (isOpenRegistration) {
    const capacity = source.maxParticipants ?? source.playersCount;
    return {
      ...base,
      playersCount: source.playersCount,
      players,
      schedule: [],
      tournamentMode: TOURNAMENT_CONFIG.TOURNAMENT_MODE.SELF_REGISTRATION,
      registrationId: nanoid(12),
      registrationStatus: registeredParticipants.length >= capacity
        ? TOURNAMENT_CONFIG.REGISTRATION_STATUS.FULL
        : TOURNAMENT_CONFIG.REGISTRATION_STATUS.OPEN,
    };
  }

  return {
    ...base,
    playersCount: players.length,
    players,
    schedule: generateSchedule(players, source.courtsCount, source.pointsPerMatch),
    tournamentMode: TOURNAMENT_CONFIG.TOURNAMENT_MODE.FIXED_PLAYERS,
    registrationStatus: TOURNAMENT_CONFIG.REGISTRATION_STATUS.CLOSED,
  };
}
