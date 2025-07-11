/**
 * Comprehensive validation utilities for tournament system
 * Pure functions with no side effects
 */

import { TOURNAMENT_CONFIG } from './tournament-config';
import type { 
  ValidationResult, 
  TournamentConfiguration, 
  ValidatedMatchScore,
  AmericanFormatConfig,
  ImmutableMatch,
  ImmutableRound
} from './tournament-types';

/**
 * Validates tournament configuration
 */
export function validateTournamentConfiguration(config: Partial<TournamentConfiguration>): ValidationResult<TournamentConfiguration> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate players count
  if (!config.playersCount || config.playersCount < TOURNAMENT_CONFIG.MIN_PLAYERS) {
    errors.push(`Minimum ${TOURNAMENT_CONFIG.MIN_PLAYERS} players required`);
  }
  if (config.playersCount && config.playersCount > TOURNAMENT_CONFIG.MAX_PLAYERS) {
    errors.push(`Maximum ${TOURNAMENT_CONFIG.MAX_PLAYERS} players allowed`);
  }
  if (config.playersCount && config.playersCount % 4 !== 0) {
    errors.push('Player count must be divisible by 4 for proper team formation');
  }

  // Validate courts count
  if (!config.courtsCount || config.courtsCount < 1) {
    errors.push('At least 1 court is required');
  }
  if (config.courtsCount && config.courtsCount > TOURNAMENT_CONFIG.MAX_COURTS) {
    errors.push(`Maximum ${TOURNAMENT_CONFIG.MAX_COURTS} courts allowed`);
  }

  // Validate points per match
  if (!config.pointsPerMatch) {
    errors.push('Points per match is required');
  } else if (config.pointsPerMatch < TOURNAMENT_CONFIG.MIN_POINTS_PER_MATCH) {
    errors.push(`Minimum ${TOURNAMENT_CONFIG.MIN_POINTS_PER_MATCH} points per match`);
  } else if (config.pointsPerMatch > TOURNAMENT_CONFIG.MAX_POINTS_PER_MATCH) {
    errors.push(`Maximum ${TOURNAMENT_CONFIG.MAX_POINTS_PER_MATCH} points per match`);
  }

  // Validate game duration
  if (!config.gameDurationMinutes) {
    errors.push('Game duration is required');
  } else if (config.gameDurationMinutes < TOURNAMENT_CONFIG.MIN_GAME_DURATION) {
    errors.push(`Minimum ${TOURNAMENT_CONFIG.MIN_GAME_DURATION} minutes per game`);
  } else if (config.gameDurationMinutes > TOURNAMENT_CONFIG.MAX_GAME_DURATION) {
    errors.push(`Maximum ${TOURNAMENT_CONFIG.MAX_GAME_DURATION} minutes per game`);
  }

  // Warnings for non-optimal configurations
  if (config.playersCount && config.playersCount !== TOURNAMENT_CONFIG.OPTIMAL_PLAYERS) {
    warnings.push(`Optimal player count is ${TOURNAMENT_CONFIG.OPTIMAL_PLAYERS} for balanced American format`);
  }

  if (errors.length === 0) {
    return {
      isValid: true,
      data: config as TournamentConfiguration,
      errors: [],
      warnings
    };
  }

  return {
    isValid: false,
    errors,
    warnings
  };
}

/**
 * Validates player names
 */
export function validatePlayerNames(players: string[]): ValidationResult<readonly string[]> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!players || players.length === 0) {
    errors.push('Player list cannot be empty');
    return { isValid: false, errors, warnings };
  }

  // Check for duplicates
  const uniqueNames = new Set<string>();
  const duplicates = new Set<string>();
  
  players.forEach(player => {
    const trimmed = player.trim();
    if (uniqueNames.has(trimmed.toLowerCase())) {
      duplicates.add(trimmed);
    }
    uniqueNames.add(trimmed.toLowerCase());
  });

  if (duplicates.size > 0) {
    errors.push(`Duplicate player names: ${Array.from(duplicates).join(', ')}`);
  }

  // Validate individual names
  players.forEach((player, index) => {
    const trimmed = player.trim();
    if (trimmed.length < TOURNAMENT_CONFIG.VALIDATION.MIN_PLAYER_NAME_LENGTH) {
      errors.push(`Player ${index + 1}: Name cannot be empty`);
    }
    if (trimmed.length > TOURNAMENT_CONFIG.VALIDATION.MAX_PLAYER_NAME_LENGTH) {
      errors.push(`Player ${index + 1}: Name too long (max ${TOURNAMENT_CONFIG.VALIDATION.MAX_PLAYER_NAME_LENGTH} characters)`);
    }
  });

  if (errors.length === 0) {
    return {
      isValid: true,
      data: players.map(p => p.trim()),
      errors: [],
      warnings
    };
  }

  return {
    isValid: false,
    errors,
    warnings
  };
}

/**
 * Validates match score with configurable total points
 */
export function validateMatchScore(
  team1Score: number, 
  team2Score: number, 
  maxPoints: number = TOURNAMENT_CONFIG.DEFAULT_POINTS_PER_MATCH
): ValidatedMatchScore {
  const errors: string[] = [];
  
  // Basic validation
  if (!Number.isInteger(team1Score) || !Number.isInteger(team2Score)) {
    errors.push('Scores must be whole numbers');
  }
  
  if (team1Score < 0 || team2Score < 0) {
    errors.push('Scores cannot be negative');
  }
  
  const totalPoints = team1Score + team2Score;
  
  if (totalPoints !== maxPoints) {
    errors.push(`Total points must equal ${maxPoints} (currently ${totalPoints})`);
  }
  
  if (team1Score > maxPoints || team2Score > maxPoints) {
    errors.push(`Individual scores cannot exceed ${maxPoints}`);
  }

  return {
    team1Score,
    team2Score,
    totalPoints,
    isValid: errors.length === 0,
    validationErrors: errors
  };
}

/**
 * Validates American format configuration
 */
export function validateAmericanFormatConfiguration(config: AmericanFormatConfig): readonly string[] {
  const validation = validateAmericanFormatConfig(config);
  return validation.errors;
}

export function validateAmericanFormatConfig(config: AmericanFormatConfig): ValidationResult<AmericanFormatConfig> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate player names
  const playerValidation = validatePlayerNames(config.players);
  if (!playerValidation.isValid) {
    errors.push(...playerValidation.errors);
  }

  // Validate courts for player count
  const playersPerCourt = config.players.length / config.courts;
  if (playersPerCourt < 4) {
    errors.push('Too many courts for the number of players (minimum 4 players per court)');
  }

  // Check if American format is optimal
  if (config.players.length !== 8) {
    warnings.push('American format is optimized for 8 players');
  }

  if (config.courts !== 2 && config.players.length === 8) {
    warnings.push('8-player American format works best with 2 courts');
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? config : undefined,
    errors,
    warnings
  };
}

/**
 * Validates tournament schedule for American format rules
 */
export function validateAmericanFormatSchedule(rounds: readonly ImmutableRound[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rounds.length === 0) {
    errors.push('Schedule cannot be empty');
    return { isValid: false, errors, warnings };
  }

  // Extract all players
  const allPlayers = new Set<string>();
  rounds.forEach(round => {
    round.matches.forEach(match => {
      match.team1.forEach(player => allPlayers.add(player));
      match.team2.forEach(player => allPlayers.add(player));
    });
  });

  const playerList = Array.from(allPlayers);
  const partnerships = new Map<string, Set<string>>();
  const opponents = new Map<string, Set<string>>();
  const playerMatchCounts = new Map<string, number>();

  // Initialize tracking maps
  playerList.forEach(player => {
    partnerships.set(player, new Set());
    opponents.set(player, new Set());
    playerMatchCounts.set(player, 0);
  });

  // Validate each round
  rounds.forEach((round, roundIndex) => {
    const playersInRound = new Set<string>();
    
    round.matches.forEach(match => {
      // Track players in this round
      match.team1.forEach(player => playersInRound.add(player));
      match.team2.forEach(player => playersInRound.add(player));

      // Track partnerships
      const [p1, p2] = match.team1;
      const [p3, p4] = match.team2;

      // Check for repeated partnerships
      if (partnerships.get(p1)?.has(p2)) {
        errors.push(`Round ${round.round}: Repeated partnership ${p1} & ${p2}`);
      }
      if (partnerships.get(p3)?.has(p4)) {
        errors.push(`Round ${round.round}: Repeated partnership ${p3} & ${p4}`);
      }

      // Update partnership tracking
      partnerships.get(p1)?.add(p2);
      partnerships.get(p2)?.add(p1);
      partnerships.get(p3)?.add(p4);
      partnerships.get(p4)?.add(p3);

      // Update opponent tracking
      [p1, p2].forEach(teamPlayer => {
        [p3, p4].forEach(opponent => {
          opponents.get(teamPlayer)?.add(opponent);
          opponents.get(opponent)?.add(teamPlayer);
        });
      });

      // Update match counts
      [p1, p2, p3, p4].forEach(player => {
        playerMatchCounts.set(player, (playerMatchCounts.get(player) || 0) + 1);
      });
    });

    // Ensure all players participate in each round
    if (playersInRound.size !== playerList.length) {
      errors.push(`Round ${round.round}: Not all players participate (${playersInRound.size}/${playerList.length})`);
    }
  });

  // Check for balanced match distribution
  const matchCounts = Array.from(playerMatchCounts.values());
  const minMatches = Math.min(...matchCounts);
  const maxMatches = Math.max(...matchCounts);
  
  if (maxMatches - minMatches > 1) {
    warnings.push('Unbalanced match distribution between players');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}