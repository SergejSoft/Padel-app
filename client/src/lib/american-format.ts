import type { Match, Round } from "@shared/schema";
import { generateAmericanFormatTournament } from "@shared/american-format-generator";
import { TOURNAMENT_CONFIG } from "@shared/tournament-config";
import { validateMatchScore } from "@shared/validation-utils";

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

function validateSchedule(rounds: Round[]): void {
  const partnerships = new Set<string>();
  const playerMatchCounts = new Map<string, number>();
  const playerPartners = new Map<string, Set<string>>();
  
  rounds.forEach(round => {
    const playersInRound = new Set<string>();
    
    round.matches.forEach(match => {
      // Check each team
      [match.team1, match.team2].forEach(team => {
        const [player1, player2] = team;
        
        // Count matches per player
        playerMatchCounts.set(player1, (playerMatchCounts.get(player1) || 0) + 1);
        playerMatchCounts.set(player2, (playerMatchCounts.get(player2) || 0) + 1);
        
        // Track players in this round
        playersInRound.add(player1);
        playersInRound.add(player2);
        
        // Track partners for each player
        if (!playerPartners.has(player1)) playerPartners.set(player1, new Set());
        if (!playerPartners.has(player2)) playerPartners.set(player2, new Set());
        
        // Check for duplicate partnerships
        const partnership = [player1, player2].sort().join('-');
        if (partnerships.has(partnership)) {
          throw new Error(`Duplicate partnership found: ${player1} & ${player2} in round ${round.round}`);
        }
        partnerships.add(partnership);
        
        // Add partners to each player's set
        playerPartners.get(player1)!.add(player2);
        playerPartners.get(player2)!.add(player1);
      });
    });
    
    // Ensure all 8 players play in each round
    if (playersInRound.size !== 8) {
      throw new Error(`Round ${round.round} doesn't include all 8 players`);
    }
  });
  
  // Ensure each player plays exactly 7 matches
  playerMatchCounts.forEach((count, player) => {
    if (count !== 7) {
      throw new Error(`Player ${player} plays ${count} matches instead of 7`);
    }
  });
  
  // Ensure each player has exactly 7 unique partners
  playerPartners.forEach((partners, player) => {
    if (partners.size !== 7) {
      throw new Error(`Player ${player} has ${partners.size} partners instead of 7`);
    }
  });
  
  console.log('✅ Schedule validation passed: No duplicate partnerships, all players play 7 rounds with 7 unique partners');
}

function calculateOptimalRounds(numPlayers: number): number {
  // Calculate number of rounds needed for good variety
  if (numPlayers === 4) return 1;
  if (numPlayers === 8) return 3;
  if (numPlayers === 12) return 4;
  if (numPlayers === 16) return 5;
  
  return Math.ceil(numPlayers / 4);
}

function generateOptimalMatch(
  availablePlayers: string[],
  partnerships: Map<string, Set<string>>,
  opponents: Map<string, Set<string>>
): { team1: [string, string]; team2: [string, string] } | null {
  
  if (availablePlayers.length < 4) return null;

  // Try to find the best combination with least repeated partnerships/opponents
  let bestMatch: { team1: [string, string]; team2: [string, string] } | null = null;
  let bestScore = Infinity;

  for (let i = 0; i < availablePlayers.length - 3; i++) {
    for (let j = i + 1; j < availablePlayers.length - 2; j++) {
      for (let k = j + 1; k < availablePlayers.length - 1; k++) {
        for (let l = k + 1; l < availablePlayers.length; l++) {
          const players = [
            availablePlayers[i],
            availablePlayers[j],
            availablePlayers[k],
            availablePlayers[l]
          ];

          // Try different team combinations
          const combinations = [
            { team1: [players[0], players[1]] as [string, string], team2: [players[2], players[3]] as [string, string] },
            { team1: [players[0], players[2]] as [string, string], team2: [players[1], players[3]] as [string, string] },
            { team1: [players[0], players[3]] as [string, string], team2: [players[1], players[2]] as [string, string] }
          ];

          for (const combo of combinations) {
            const score = calculateMatchScore(combo, partnerships, opponents);
            if (score < bestScore) {
              bestScore = score;
              bestMatch = combo;
            }
          }
        }
      }
    }
  }

  return bestMatch;
}

function calculateMatchScore(
  match: { team1: [string, string]; team2: [string, string] },
  partnerships: Map<string, Set<string>>,
  opponents: Map<string, Set<string>>
): number {
  let score = 0;

  // Check partnership repetitions
  const [p1, p2] = match.team1;
  const [p3, p4] = match.team2;

  if (partnerships.get(p1)?.has(p2)) score += 10;
  if (partnerships.get(p3)?.has(p4)) score += 10;

  // Check opponent repetitions
  if (opponents.get(p1)?.has(p3) || opponents.get(p1)?.has(p4)) score += 5;
  if (opponents.get(p2)?.has(p3) || opponents.get(p2)?.has(p4)) score += 5;

  return score;
}

function updatePartnershipTracking(
  match: { team1: [string, string]; team2: [string, string] },
  partnerships: Map<string, Set<string>>,
  opponents: Map<string, Set<string>>
): void {
  const [p1, p2] = match.team1;
  const [p3, p4] = match.team2;

  // Track partnerships
  partnerships.get(p1)?.add(p2);
  partnerships.get(p2)?.add(p1);
  partnerships.get(p3)?.add(p4);
  partnerships.get(p4)?.add(p3);

  // Track opponents
  [p1, p2].forEach(teammate => {
    [p3, p4].forEach(opponent => {
      opponents.get(teammate)?.add(opponent);
      opponents.get(opponent)?.add(teammate);
    });
  });
}

function rotatePlayersArray(players: string[]): void {
  if (players.length > 1) {
    const first = players.shift();
    if (first) players.push(first);
  }
}

/**
 * Legacy validation function - now uses the new comprehensive validation
 */
export function validateTournamentConfig(playersCount: number, courtsCount: number): string | null {
  // Use new validation system
  const configValidation = validateTournamentConfiguration({
    playersCount,
    courtsCount,
    pointsPerMatch: TOURNAMENT_CONFIG.DEFAULT_POINTS_PER_MATCH,
    gameDurationMinutes: TOURNAMENT_CONFIG.DEFAULT_GAME_DURATION
  });

  if (!configValidation.isValid) {
    return configValidation.errors[0] || 'Invalid tournament configuration';
  }

  return null;
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

/**
 * Legacy function maintained for compatibility
 */
export function validateTournamentConfigLegacy(playersCount: number, courtsCount: number): string | null {
  if (playersCount !== 8) {
    return "American format requires exactly 8 players";
  }

  if (courtsCount !== 2) {
    return "American format requires exactly 2 courts";
  }

  return null;
}
