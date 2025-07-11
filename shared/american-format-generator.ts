/**
 * Improved American Format Generator
 * Supports flexible player counts with strict rule adherence
 */

import type { 
  AmericanFormatConfig, 
  AmericanFormatResult,
  ImmutableRound, 
  ImmutableMatch,
  PartnershipTracking,
  ValidationResult
} from './tournament-types';
import { validateAmericanFormatConfig, validateAmericanFormatSchedule } from './validation-utils';
import { TOURNAMENT_CONFIG } from './tournament-config';

/**
 * Generates American format tournament schedule with strict rule adherence
 */
export function generateAmericanFormatTournament(config: AmericanFormatConfig): AmericanFormatResult {
  // Validate input configuration
  const configValidation = validateAmericanFormatConfig(config);
  if (!configValidation.isValid) {
    return {
      rounds: [],
      partnershipTracking: createEmptyPartnershipTracking(),
      validation: configValidation
    };
  }

  const { players, courts, pointsPerMatch } = config;
  
  // Use optimized 8-player algorithm when applicable
  if (players.length === 8 && courts === 2) {
    return generateOptimal8PlayerFormat(config);
  }
  
  // Use general algorithm for other configurations
  return generateGeneralAmericanFormat(config);
}

/**
 * Optimized algorithm for 8 players, 2 courts (most common case)
 */
function generateOptimal8PlayerFormat(config: AmericanFormatConfig): AmericanFormatResult {
  const { players, pointsPerMatch } = config;
  
  // Pre-calculated optimal schedule for 8 players ensuring:
  // - Each player partners with every other player exactly once
  // - Minimal repeated opponents
  // - Perfect balance across 7 rounds
  const scheduleMatrix = [
    // Round 1: [Team1], [Team2], [Team3], [Team4]
    [[0, 1], [2, 3], [4, 5], [6, 7]],
    // Round 2: Rotate partnerships
    [[0, 2], [4, 6], [1, 3], [5, 7]],
    // Round 3: Continue rotation
    [[0, 3], [5, 6], [1, 4], [2, 7]],
    // Round 4: Ensure all partnerships covered
    [[0, 4], [1, 7], [2, 5], [3, 6]],
    // Round 5: Continue systematic rotation
    [[0, 5], [3, 7], [1, 6], [2, 4]],
    // Round 6: Near completion of all partnerships
    [[0, 6], [1, 2], [3, 5], [4, 7]],
    // Round 7: Complete all unique partnerships
    [[0, 7], [3, 4], [1, 5], [2, 6]]
  ];

  const rounds: ImmutableMatch[][] = [];
  let gameNumber = 1;

  scheduleMatrix.forEach((roundTeams, roundIndex) => {
    const matches: ImmutableMatch[] = [];
    
    // Create two matches per round (2 courts)
    for (let courtIndex = 0; courtIndex < 2; courtIndex++) {
      const team1Indices = roundTeams[courtIndex * 2];
      const team2Indices = roundTeams[courtIndex * 2 + 1];
      
      const match: ImmutableMatch = {
        court: courtIndex + 1,
        team1: [players[team1Indices[0]], players[team1Indices[1]]],
        team2: [players[team2Indices[0]], players[team2Indices[1]]],
        round: roundIndex + 1,
        gameNumber: gameNumber++,
        status: 'pending'
      };
      
      matches.push(match);
    }
    
    rounds.push(matches);
  });

  const immutableRounds: ImmutableRound[] = rounds.map((matches, index) => ({
    round: index + 1,
    matches
  }));

  // Validate the generated schedule
  const validation = validateAmericanFormatSchedule(immutableRounds);
  const partnershipTracking = calculatePartnershipTracking(immutableRounds);

  return {
    rounds: immutableRounds,
    partnershipTracking,
    validation
  };
}

/**
 * General algorithm for flexible player counts
 * Uses round-robin approach with partnership rotation
 */
function generateGeneralAmericanFormat(config: AmericanFormatConfig): AmericanFormatResult {
  const { players, courts, pointsPerMatch } = config;
  const playerCount = players.length;
  
  if (playerCount % 4 !== 0) {
    return {
      rounds: [],
      partnershipTracking: createEmptyPartnershipTracking(),
      validation: {
        isValid: false,
        errors: ['Player count must be divisible by 4 for team formation'],
        warnings: []
      }
    };
  }

  // Calculate optimal number of rounds
  // Each player should partner with as many different players as possible
  const maxPartnerships = playerCount - 1;
  const partnershipsPerRound = 1; // Each player gets 1 partner per round
  const optimalRounds = Math.min(maxPartnerships, 12); // Cap at reasonable number

  const rounds: ImmutableMatch[][] = [];
  const partnershipHistory = new Map<string, Set<string>>();
  const opponentHistory = new Map<string, Set<string>>();
  
  // Initialize tracking
  players.forEach(player => {
    partnershipHistory.set(player, new Set());
    opponentHistory.set(player, new Set());
  });

  let gameNumber = 1;

  for (let round = 1; round <= optimalRounds; round++) {
    const matches = generateRoundMatches(
      players,
      courts,
      round,
      gameNumber,
      partnershipHistory,
      opponentHistory
    );
    
    if (matches.length === 0) {
      break; // Can't generate more valid rounds
    }
    
    rounds.push(matches);
    gameNumber += matches.length;
    
    // Update tracking
    matches.forEach(match => {
      updatePartnershipHistory(match, partnershipHistory, opponentHistory);
    });
  }

  const immutableRounds: ImmutableRound[] = rounds.map((matches, index) => ({
    round: index + 1,
    matches
  }));

  const validation = validateAmericanFormatSchedule(immutableRounds);
  const partnershipTracking = calculatePartnershipTracking(immutableRounds);

  return {
    rounds: immutableRounds,
    partnershipTracking,
    validation
  };
}

/**
 * Generates matches for a single round, avoiding repeated partnerships
 */
function generateRoundMatches(
  players: readonly string[],
  courts: number,
  round: number,
  startGameNumber: number,
  partnershipHistory: Map<string, Set<string>>,
  opponentHistory: Map<string, Set<string>>
): ImmutableMatch[] {
  const availablePlayers = [...players];
  const matches: ImmutableMatch[] = [];
  let gameNumber = startGameNumber;

  for (let court = 1; court <= courts; court++) {
    if (availablePlayers.length < 4) {
      break; // Not enough players for another match
    }

    const match = findOptimalMatch(availablePlayers, partnershipHistory, opponentHistory, court, round, gameNumber);
    if (match) {
      matches.push(match);
      gameNumber++;
      
      // Remove players from available pool
      [match.team1[0], match.team1[1], match.team2[0], match.team2[1]].forEach(player => {
        const index = availablePlayers.indexOf(player);
        if (index > -1) {
          availablePlayers.splice(index, 1);
        }
      });
    }
  }

  return matches;
}

/**
 * Finds optimal match pairing to minimize repeated partnerships/opponents
 */
function findOptimalMatch(
  availablePlayers: string[],
  partnershipHistory: Map<string, Set<string>>,
  opponentHistory: Map<string, Set<string>>,
  court: number,
  round: number,
  gameNumber: number
): ImmutableMatch | null {
  if (availablePlayers.length < 4) return null;

  let bestMatch: ImmutableMatch | null = null;
  let bestScore = Infinity;

  // Try different combinations
  for (let i = 0; i < availablePlayers.length - 3; i++) {
    for (let j = i + 1; j < availablePlayers.length - 2; j++) {
      for (let k = j + 1; k < availablePlayers.length - 1; k++) {
        for (let l = k + 1; l < availablePlayers.length; l++) {
          const players = [availablePlayers[i], availablePlayers[j], availablePlayers[k], availablePlayers[l]];
          
          // Try both team arrangements
          const arrangements = [
            { team1: [players[0], players[1]], team2: [players[2], players[3]] },
            { team1: [players[0], players[2]], team2: [players[1], players[3]] },
            { team1: [players[0], players[3]], team2: [players[1], players[2]] }
          ];
          
          arrangements.forEach(arrangement => {
            const score = calculateMatchScore(arrangement, partnershipHistory, opponentHistory);
            if (score < bestScore) {
              bestScore = score;
              bestMatch = {
                court,
                team1: arrangement.team1 as [string, string],
                team2: arrangement.team2 as [string, string],
                round,
                gameNumber,
                status: 'pending'
              };
            }
          });
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Calculates penalty score for a match (lower is better)
 */
function calculateMatchScore(
  arrangement: { team1: string[], team2: string[] },
  partnershipHistory: Map<string, Set<string>>,
  opponentHistory: Map<string, Set<string>>
): number {
  let score = 0;
  
  // Penalty for repeated partnerships
  if (partnershipHistory.get(arrangement.team1[0])?.has(arrangement.team1[1])) {
    score += 100; // Heavy penalty for repeated partnership
  }
  if (partnershipHistory.get(arrangement.team2[0])?.has(arrangement.team2[1])) {
    score += 100;
  }
  
  // Penalty for repeated opponents (lighter)
  arrangement.team1.forEach(player1 => {
    arrangement.team2.forEach(player2 => {
      if (opponentHistory.get(player1)?.has(player2)) {
        score += 10;
      }
    });
  });
  
  return score;
}

/**
 * Updates partnership and opponent tracking after a match
 */
function updatePartnershipHistory(
  match: ImmutableMatch,
  partnershipHistory: Map<string, Set<string>>,
  opponentHistory: Map<string, Set<string>>
): void {
  // Update partnerships
  const [p1, p2] = match.team1;
  const [p3, p4] = match.team2;
  
  partnershipHistory.get(p1)?.add(p2);
  partnershipHistory.get(p2)?.add(p1);
  partnershipHistory.get(p3)?.add(p4);
  partnershipHistory.get(p4)?.add(p3);
  
  // Update opponents
  [p1, p2].forEach(teamPlayer => {
    [p3, p4].forEach(opponent => {
      opponentHistory.get(teamPlayer)?.add(opponent);
      opponentHistory.get(opponent)?.add(teamPlayer);
    });
  });
}

/**
 * Calculates partnership tracking from completed schedule
 */
function calculatePartnershipTracking(rounds: readonly ImmutableRound[]): PartnershipTracking {
  const partnerships = new Map<string, string[]>();
  const partnerCounts = new Map<string, Map<string, number>>();
  const opponentCounts = new Map<string, Map<string, number>>();
  
  rounds.forEach(round => {
    round.matches.forEach(match => {
      const [p1, p2] = match.team1;
      const [p3, p4] = match.team2;
      
      // Track partnerships
      if (!partnerships.has(p1)) partnerships.set(p1, []);
      if (!partnerships.has(p2)) partnerships.set(p2, []);
      if (!partnerships.has(p3)) partnerships.set(p3, []);
      if (!partnerships.has(p4)) partnerships.set(p4, []);
      
      partnerships.get(p1)!.push(p2);
      partnerships.get(p2)!.push(p1);
      partnerships.get(p3)!.push(p4);
      partnerships.get(p4)!.push(p3);
      
      // Track counts (implementation would continue...)
    });
  });
  
  return {
    partnerships: new Map(Array.from(partnerships.entries()).map(([k, v]) => [k, v as readonly string[]])),
    partnerCounts: new Map(),
    opponentCounts: new Map()
  };
}

/**
 * Creates empty partnership tracking
 */
function createEmptyPartnershipTracking(): PartnershipTracking {
  return {
    partnerships: new Map(),
    partnerCounts: new Map(),
    opponentCounts: new Map()
  };
}