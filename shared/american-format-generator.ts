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
} from './tournament-types.js';
import { validateAmericanFormatConfig, validateAmericanFormatSchedule } from './validation-utils.js';
import { TOURNAMENT_CONFIG } from './tournament-config.js';

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
  const { players, courts } = config;
  const playerCount = players.length;
  const activePlayerCount = Math.min(
    Math.floor(playerCount / 4) * 4,
    courts * 4,
  );
  const activeCourts = activePlayerCount / 4;
  const optimalRounds = Math.min(playerCount - 1, 12);

  const rounds: ImmutableMatch[][] = [];
  const partnershipHistory = new Map<string, Set<string>>();
  const opponentHistory = new Map<string, Set<string>>();
  const matchCounts = new Map<string, number>();
  
  players.forEach(player => {
    partnershipHistory.set(player, new Set());
    opponentHistory.set(player, new Set());
    matchCounts.set(player, 0);
  });

  let gameNumber = 1;

  for (let round = 1; round <= optimalRounds; round++) {
    const activePlayers = selectActivePlayers(
      players,
      activePlayerCount,
      matchCounts,
      round,
    );
    const matches = generateBestRound(
      activePlayers,
      activeCourts,
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
    
    matches.forEach(match => {
      updatePartnershipHistory(match, partnershipHistory, opponentHistory);
      [...match.team1, ...match.team2].forEach((player) => {
        matchCounts.set(player, (matchCounts.get(player) ?? 0) + 1);
      });
    });
  }

  const immutableRounds: ImmutableRound[] = rounds.map((matches, index) => ({
    round: index + 1,
    matches
  }));

  const validation = validateAmericanFormatSchedule(immutableRounds, players);
  const partnershipTracking = calculatePartnershipTracking(immutableRounds);

  return {
    rounds: immutableRounds,
    partnershipTracking,
    validation
  };
}

/**
 * Selects the players with the fewest matches. The rotating tie-breaker keeps
 * sit-outs deterministic and evenly distributed.
 */
function selectActivePlayers(
  players: readonly string[],
  activePlayerCount: number,
  matchCounts: ReadonlyMap<string, number>,
  round: number,
): string[] {
  const startIndex = (round - 1) % players.length;
  return [...players]
    .sort((left, right) => {
      const countDifference = (matchCounts.get(left) ?? 0) - (matchCounts.get(right) ?? 0);
      if (countDifference !== 0) return countDifference;

      const leftIndex = (players.indexOf(left) - startIndex + players.length) % players.length;
      const rightIndex = (players.indexOf(right) - startIndex + players.length) % players.length;
      return leftIndex - rightIndex;
    })
    .slice(0, activePlayerCount);
}

/**
 * Scores complete round assignments instead of committing court by court.
 * Deterministic seeded shuffles provide broad coverage without exponential
 * backtracking for 20-player tournaments.
 */
function generateBestRound(
  activePlayers: readonly string[],
  courts: number,
  round: number,
  startGameNumber: number,
  partnershipHistory: Map<string, Set<string>>,
  opponentHistory: Map<string, Set<string>>,
): ImmutableMatch[] {
  let bestMatches: ImmutableMatch[] = [];
  let bestScore = Infinity;

  for (let attempt = 0; attempt < 256; attempt++) {
    const orderedPlayers = seededShuffle(activePlayers, round * 1009 + attempt);
    const candidateMatches: ImmutableMatch[] = [];
    let candidateScore = 0;

    for (let courtIndex = 0; courtIndex < courts; courtIndex++) {
      const group = orderedPlayers.slice(courtIndex * 4, courtIndex * 4 + 4);
      const arrangements = [
        { team1: [group[0], group[1]], team2: [group[2], group[3]] },
        { team1: [group[0], group[2]], team2: [group[1], group[3]] },
        { team1: [group[0], group[3]], team2: [group[1], group[2]] },
      ];

      let bestArrangement = arrangements[0];
      let arrangementScore = Infinity;
      for (const arrangement of arrangements) {
        const score = calculateMatchScore(arrangement, partnershipHistory, opponentHistory);
        if (score < arrangementScore) {
          arrangementScore = score;
          bestArrangement = arrangement;
        }
      }

      candidateScore += arrangementScore;
      candidateMatches.push({
        court: courtIndex + 1,
        team1: bestArrangement.team1 as [string, string],
        team2: bestArrangement.team2 as [string, string],
        round,
        gameNumber: startGameNumber + courtIndex,
        status: "pending",
      });
    }

    if (candidateScore < bestScore) {
      bestScore = candidateScore;
      bestMatches = candidateMatches;
      if (bestScore === 0) break;
    }
  }

  return bestMatches;
}

function seededShuffle(players: readonly string[], seed: number): string[] {
  const result = [...players];
  let state = seed >>> 0;

  for (let index = result.length - 1; index > 0; index--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
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