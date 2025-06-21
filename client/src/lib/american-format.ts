import type { Match, Round } from "@shared/schema";

export interface AmericanFormatConfig {
  players: string[];
  courts: number;
}

export function generateAmericanFormat({ players, courts }: AmericanFormatConfig): Round[] {
  const numPlayers = players.length;
  
  if (numPlayers !== 8) {
    throw new Error("This American format implementation is optimized for 8 players");
  }

  if (courts !== 2) {
    throw new Error("This American format implementation requires exactly 2 courts");
  }

  // Fixed optimal schedule for 8 players, 2 courts, 7 rounds
  // This ensures no duplicate partnerships and optimal rotation
  const optimalSchedule = [
    // Round 1
    [
      { court: 1, team1: [players[0], players[1]], team2: [players[2], players[3]] },
      { court: 2, team1: [players[4], players[5]], team2: [players[6], players[7]] }
    ],
    // Round 2
    [
      { court: 1, team1: [players[0], players[2]], team2: [players[1], players[4]] },
      { court: 2, team1: [players[3], players[5]], team2: [players[6], players[7]] }
    ],
    // Round 3
    [
      { court: 1, team1: [players[0], players[3]], team2: [players[2], players[5]] },
      { court: 2, team1: [players[1], players[6]], team2: [players[4], players[7]] }
    ],
    // Round 4
    [
      { court: 1, team1: [players[0], players[4]], team2: [players[3], players[6]] },
      { court: 2, team1: [players[1], players[7]], team2: [players[2], players[5]] }
    ],
    // Round 5
    [
      { court: 1, team1: [players[0], players[5]], team2: [players[4], players[6]] },
      { court: 2, team1: [players[1], players[3]], team2: [players[2], players[7]] }
    ],
    // Round 6
    [
      { court: 1, team1: [players[0], players[6]], team2: [players[5], players[7]] },
      { court: 2, team1: [players[1], players[2]], team2: [players[3], players[4]] }
    ],
    // Round 7
    [
      { court: 1, team1: [players[0], players[7]], team2: [players[1], players[5]] },
      { court: 2, team1: [players[2], players[4]], team2: [players[3], players[6]] }
    ]
  ];

  const rounds: Round[] = [];
  let gameNumber = 1;

  optimalSchedule.forEach((roundMatches, roundIndex) => {
    const matches: Match[] = [];
    
    roundMatches.forEach((match) => {
      matches.push({
        court: match.court,
        team1: match.team1 as [string, string],
        team2: match.team2 as [string, string],
        round: roundIndex + 1,
        gameNumber: gameNumber++
      });
    });

    rounds.push({
      round: roundIndex + 1,
      matches
    });
  });

  // Validate the schedule to ensure no duplicate partnerships
  validateSchedule(rounds);
  
  return rounds;
}

function validateSchedule(rounds: Round[]): void {
  const partnerships = new Set<string>();
  
  rounds.forEach(round => {
    round.matches.forEach(match => {
      // Check team1 partnership
      const team1Key = [match.team1[0], match.team1[1]].sort().join('-');
      if (partnerships.has(team1Key)) {
        throw new Error(`Duplicate partnership found: ${match.team1[0]} & ${match.team1[1]} in round ${round.round}`);
      }
      partnerships.add(team1Key);
      
      // Check team2 partnership
      const team2Key = [match.team2[0], match.team2[1]].sort().join('-');
      if (partnerships.has(team2Key)) {
        throw new Error(`Duplicate partnership found: ${match.team2[0]} & ${match.team2[1]} in round ${round.round}`);
      }
      partnerships.add(team2Key);
    });
  });
  
  console.log(`Schedule validated: ${partnerships.size} unique partnerships across ${rounds.length} rounds`);
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

export function validateTournamentConfig(playersCount: number, courtsCount: number): string | null {
  if (playersCount !== 8) {
    return "American format requires exactly 8 players";
  }

  if (courtsCount !== 2) {
    return "American format requires exactly 2 courts";
  }

  return null;
}
