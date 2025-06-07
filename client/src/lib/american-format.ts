import type { Match, Round } from "@shared/schema";

export interface AmericanFormatConfig {
  players: string[];
  courts: number;
}

export function generateAmericanFormat({ players, courts }: AmericanFormatConfig): Round[] {
  const numPlayers = players.length;
  
  if (numPlayers < 4) {
    throw new Error("American format requires at least 4 players");
  }

  if (numPlayers % 4 !== 0) {
    throw new Error("American format requires a multiple of 4 players");
  }

  const rounds: Round[] = [];
  const maxRounds = calculateOptimalRounds(numPlayers);
  const playersArray = [...players];

  // Track partnerships and opponents to ensure variety
  const partnerships = new Map<string, Set<string>>();
  const opponents = new Map<string, Set<string>>();

  // Initialize tracking
  players.forEach(player => {
    partnerships.set(player, new Set());
    opponents.set(player, new Set());
  });

  for (let roundNum = 1; roundNum <= maxRounds; roundNum++) {
    const matches: Match[] = [];
    const roundPlayers = [...playersArray];
    let gameNumber = (roundNum - 1) * courts + 1;

    // Generate matches for this round
    for (let court = 1; court <= courts && roundPlayers.length >= 4; court++) {
      const match = generateOptimalMatch(roundPlayers, partnerships, opponents);
      
      if (match) {
        matches.push({
          court,
          team1: match.team1,
          team2: match.team2,
          round: roundNum,
          gameNumber
        });

        // Update tracking
        updatePartnershipTracking(match, partnerships, opponents);
        
        // Remove used players from round
        [match.team1[0], match.team1[1], match.team2[0], match.team2[1]].forEach(player => {
          const index = roundPlayers.indexOf(player);
          if (index > -1) roundPlayers.splice(index, 1);
        });

        gameNumber++;
      }
    }

    if (matches.length > 0) {
      rounds.push({
        round: roundNum,
        matches
      });
    }

    // Rotate players for next round
    if (roundNum < maxRounds) {
      rotatePlayersArray(playersArray);
    }
  }

  return rounds;
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
  if (playersCount < 4) {
    return "Minimum 4 players required for American format";
  }

  if (playersCount % 4 !== 0) {
    return "Player count must be a multiple of 4 for American format";
  }

  if (courtsCount < 1) {
    return "At least 1 court is required";
  }

  if (courtsCount > Math.floor(playersCount / 4)) {
    return `Maximum ${Math.floor(playersCount / 4)} courts for ${playersCount} players`;
  }

  return null;
}
