import type { Match, Round } from "@shared/schema";
import { generateAmericanFormatTournament } from "@shared/american-format-generator";
import { TOURNAMENT_CONFIG } from "@shared/tournament-config";
import { validateMatchScore, validateAmericanFormatConfiguration } from "@shared/validation-utils";

export interface AmericanFormatConfig {
  players: string[];
  courts: number;
  pointsPerMatch?: number;
}

export function generateAmericanFormat({ players, courts, pointsPerMatch = TOURNAMENT_CONFIG.DEFAULT_POINTS_PER_MATCH }: AmericanFormatConfig): Round[] {
  // Use the new comprehensive tournament generator
  const result = generateAmericanFormatTournament({
    players,
    courts,
    pointsPerMatch
  });

  if (!result.validation.isValid) {
    throw new Error(`Tournament generation failed: ${result.validation.errors.join(', ')}`);
  }

  // Convert to legacy format for compatibility
  return result.rounds.map(round => ({
    round: round.round,
    matches: round.matches.map(match => ({
      court: match.court,
      team1: [match.team1[0], match.team1[1]] as [string, string],
      team2: [match.team2[0], match.team2[1]] as [string, string],
      round: match.round,
      gameNumber: match.gameNumber,
      score: match.score,
      status: match.status
    }))
  }));
}

/**
 * Validates the player/court selection before schedule generation.
 */
export function validateTournamentConfig(playersCount: number, courtsCount: number): string | null {
  // Use the validation utility
  const errors = validateAmericanFormatConfiguration({
    players: Array(playersCount).fill(0).map((_, i) => `Player ${i + 1}`),
    courts: courtsCount,
    pointsPerMatch: TOURNAMENT_CONFIG.DEFAULT_POINTS_PER_MATCH
  });

  return errors.length > 0 ? errors[0] : null;
}

/**
 * Enhanced score validation using the new system
 */
export function validateScore(team1Score: number, team2Score: number, pointsPerMatch: number = TOURNAMENT_CONFIG.DEFAULT_POINTS_PER_MATCH): string | null {
  const validation = validateMatchScore(team1Score, team2Score, pointsPerMatch);
  
  if (!validation.isValid) {
    return validation.validationErrors[0] || 'Invalid score';
  }

  return null;
}
