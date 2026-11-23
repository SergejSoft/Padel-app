/**
 * Unit tests for American format generator
 * Comprehensive validation of tournament generation
 */

import { describe, it, expect } from 'vitest';
import { buildAmericanRounds, generateAmericanFormatTournament, planAmericanFormat } from '../american-format-generator';
import { TOURNAMENT_CONFIG } from '../tournament-config';

function countGames(rounds: ReturnType<typeof generateAmericanFormatTournament>['rounds'], players: string[]) {
  const counts = new Map(players.map((player) => [player, 0]));
  rounds.forEach((round) => {
    round.matches.forEach((match) => {
      [...match.team1, ...match.team2].forEach((player) => {
        counts.set(player, counts.get(player)! + 1);
      });
    });
  });
  return [...counts.values()];
}

type Rounds = ReturnType<typeof generateAmericanFormatTournament>['rounds'];

const generatedSchedules = new Map<string, ReturnType<typeof generateAmericanFormatTournament>>();

/** Generates each player/court combination once; the loops below share them. */
function scheduleFor(playerCount: number, courts: number) {
  const key = `${playerCount}/${courts}`;
  if (!generatedSchedules.has(key)) {
    const players = Array.from({ length: playerCount }, (_, index) => `P${index + 1}`);
    generatedSchedules.set(key, generateAmericanFormatTournament({ players, courts, pointsPerMatch: 16 }));
  }
  return generatedSchedules.get(key)!;
}

function forEachSupportedSetup(check: (playerCount: number, courts: number, label: string) => void) {
  for (let playerCount = TOURNAMENT_CONFIG.MIN_PLAYERS; playerCount <= TOURNAMENT_CONFIG.MAX_PLAYERS; playerCount++) {
    for (let courts = TOURNAMENT_CONFIG.MIN_COURTS; courts <= TOURNAMENT_CONFIG.MAX_COURTS; courts++) {
      check(playerCount, courts, `${playerCount} players / ${courts} courts`);
    }
  }
}

const pairKey = (a: string, b: string) => [a, b].sort().join(' + ');

function pairCounts(rounds: Rounds) {
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  const bump = (counts: Map<string, number>, a: string, b: string) =>
    counts.set(pairKey(a, b), (counts.get(pairKey(a, b)) ?? 0) + 1);

  rounds.forEach((round) => {
    round.matches.forEach((match) => {
      bump(partners, match.team1[0], match.team1[1]);
      bump(partners, match.team2[0], match.team2[1]);
      match.team1.forEach((a) => match.team2.forEach((b) => bump(opponents, a, b)));
    });
  });
  return { partners, opponents };
}

function allPairs(players: string[]): string[] {
  return players.flatMap((a, index) => players.slice(index + 1).map((b) => pairKey(a, b)));
}

function restingRounds(rounds: Rounds, players: string[]): Map<string, number[]> {
  const resting = new Map(players.map((player) => [player, [] as number[]]));
  rounds.forEach((round) => {
    const playing = new Set(round.matches.flatMap((match) => [...match.team1, ...match.team2]));
    players.filter((player) => !playing.has(player)).forEach((player) => resting.get(player)!.push(round.round));
  });
  return resting;
}

function backToBackRests(rounds: Rounds, players: string[]): number {
  return [...restingRounds(rounds, players).values()]
    .reduce((total, list) => total + list.filter((round, index) => list[index - 1] === round - 1).length, 0);
}

describe('generateAmericanFormatTournament', () => {
  it('should generate valid 8-player tournament', () => {
    const config = {
      players: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'],
      courts: 2,
      pointsPerMatch: 16
    };

    const result = generateAmericanFormatTournament(config);
    
    expect(result.validation.isValid).toBe(true);
    expect(result.rounds).toHaveLength(7); // 8 players should have 7 rounds
    
    // Each round should have 2 matches (2 courts)
    result.rounds.forEach(round => {
      expect(round.matches).toHaveLength(2);
    });
    
    // Validate all players participate in each round
    result.rounds.forEach(round => {
      const playersInRound = new Set<string>();
      round.matches.forEach(match => {
        match.team1.forEach(player => playersInRound.add(player));
        match.team2.forEach(player => playersInRound.add(player));
      });
      expect(playersInRound.size).toBe(8); // All players participate
    });
  });

  it('should reject invalid player counts', () => {
    const config = {
      players: ['Alice', 'Bob', 'Charlie'], // Only 3 players
      courts: 2,
      pointsPerMatch: 16
    };

    const result = generateAmericanFormatTournament(config);
    
    expect(result.validation.isValid).toBe(false);
    expect(result.rounds).toHaveLength(0);
  });

  it('should ensure no repeated partnerships in 8-player format', () => {
    const config = {
      players: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'],
      courts: 2,
      pointsPerMatch: 16
    };

    const result = generateAmericanFormatTournament(config);
    
    // Track all partnerships
    const partnerships = new Set<string>();
    
    result.rounds.forEach(round => {
      round.matches.forEach(match => {
        // Check team1 partnership
        const team1Partnership = [match.team1[0], match.team1[1]].sort().join('-');
        expect(partnerships.has(team1Partnership)).toBe(false);
        partnerships.add(team1Partnership);
        
        // Check team2 partnership
        const team2Partnership = [match.team2[0], match.team2[1]].sort().join('-');
        expect(partnerships.has(team2Partnership)).toBe(false);
        partnerships.add(team2Partnership);
      });
    });
    
    // With 8 players, there should be 28 unique partnerships (8 choose 2)
    // In 7 rounds with 2 matches each, we get 28 partnerships total
    expect(partnerships.size).toBe(28);
  });

  it('should balance match counts for all players', () => {
    const config = {
      players: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'],
      courts: 2,
      pointsPerMatch: 16
    };

    const result = generateAmericanFormatTournament(config);
    
    // Count matches per player
    const matchCounts = new Map<string, number>();
    config.players.forEach(player => matchCounts.set(player, 0));
    
    result.rounds.forEach(round => {
      round.matches.forEach(match => {
        match.team1.forEach(player => {
          matchCounts.set(player, (matchCounts.get(player) || 0) + 1);
        });
        match.team2.forEach(player => {
          matchCounts.set(player, (matchCounts.get(player) || 0) + 1);
        });
      });
    });
    
    // All players should have exactly 7 matches
    Array.from(matchCounts.values()).forEach(count => {
      expect(count).toBe(7);
    });
  });

  it('should work with 4 players', () => {
    const config = {
      players: ['Alice', 'Bob', 'Charlie', 'Diana'],
      courts: 2,
      pointsPerMatch: 16
    };

    const result = generateAmericanFormatTournament(config);
    
    expect(result.validation.isValid).toBe(true);
    expect(result.rounds.length).toBeGreaterThan(0);
    
    // With 4 players, each round should have 1 match
    result.rounds.forEach(round => {
      expect(round.matches).toHaveLength(1);
      
      // All 4 players should participate
      const playersInRound = new Set<string>();
      round.matches.forEach(match => {
        match.team1.forEach(player => playersInRound.add(player));
        match.team2.forEach(player => playersInRound.add(player));
      });
      expect(playersInRound.size).toBe(4);
    });
  });

  it('should assign correct game numbers', () => {
    const config = {
      players: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'],
      courts: 2,
      pointsPerMatch: 16
    };

    const result = generateAmericanFormatTournament(config);
    
    let expectedGameNumber = 1;
    result.rounds.forEach(round => {
      round.matches.forEach(match => {
        expect(match.gameNumber).toBe(expectedGameNumber);
        expectedGameNumber++;
      });
    });
  });

  it('should assign correct court numbers', () => {
    const config = {
      players: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'],
      courts: 2,
      pointsPerMatch: 16
    };

    const result = generateAmericanFormatTournament(config);
    
    result.rounds.forEach(round => {
      // Should have matches on court 1 and court 2
      const courts = round.matches.map(match => match.court);
      expect(courts).toContain(1);
      expect(courts).toContain(2);
      expect(courts).toHaveLength(2);
    });
  });

  it('rotates sit-outs fairly when players exceed court capacity', () => {
    const players = Array.from({ length: 9 }, (_, index) => `Player ${index + 1}`);
    const result = generateAmericanFormatTournament({
      players,
      courts: 2,
      pointsPerMatch: 16,
    });

    expect(result.validation.isValid).toBe(true);
    expect(result.rounds).toHaveLength(9);
    result.rounds.forEach((round) => expect(round.matches).toHaveLength(2));

    const matchCounts = new Map(players.map((player) => [player, 0]));
    result.rounds.forEach((round) => {
      round.matches.forEach((match) => {
        [...match.team1, ...match.team2].forEach((player) => {
          matchCounts.set(player, matchCounts.get(player)! + 1);
        });
      });
    });

    const counts = [...matchCounts.values()];
    expect(new Set(counts)).toEqual(new Set([8]));
    expect(result.validation.warnings).not.toContain('Players have unequal game counts');
  });

  it('gives 10 players equal games and sit-outs on 2 courts', () => {
    const players = Array.from({ length: 10 }, (_, index) => `Player ${index + 1}`);
    const result = generateAmericanFormatTournament({
      players,
      courts: 2,
      pointsPerMatch: 24,
    });

    expect(result.validation.isValid).toBe(true);
    expect(result.rounds).toHaveLength(10);
    result.rounds.forEach((round) => expect(round.matches).toHaveLength(2));

    const matchCounts = new Map(players.map((player) => [player, 0]));
    result.rounds.forEach((round) => {
      round.matches.forEach((match) => {
        [...match.team1, ...match.team2].forEach((player) => {
          matchCounts.set(player, matchCounts.get(player)! + 1);
        });
      });
    });

    expect(new Set(matchCounts.values())).toEqual(new Set([8]));
    expect(result.validation.warnings).not.toContain('Players have unequal game counts');
  });

  it('gives 12 players on 3 courts a new partner every round', () => {
    const result = generateAmericanFormatTournament({
      players: Array.from({ length: 12 }, (_, index) => `Player ${index + 1}`),
      courts: 3,
      pointsPerMatch: 16,
    });

    expect(result.validation.isValid).toBe(true);
    expect(result.rounds).toHaveLength(11);
    expect(Math.max(...pairCounts(result.rounds).partners.values())).toBe(1);
  });

  it('plays 7 players on a single court with 3 resting each round', () => {
    const players = Array.from({ length: 7 }, (_, index) => `Player ${index + 1}`);
    const result = generateAmericanFormatTournament({ players, courts: 1, pointsPerMatch: 24 });

    expect(result.validation.isValid).toBe(true);
    expect(result.rounds).toHaveLength(7);
    result.rounds.forEach((round) => expect(round.matches).toHaveLength(1));
    expect(new Set(countGames(result.rounds, players))).toEqual(new Set([4]));
  });

  it('generates valid and fair schedules for every supported configuration', () => {
    for (let playerCount = TOURNAMENT_CONFIG.MIN_PLAYERS; playerCount <= TOURNAMENT_CONFIG.MAX_PLAYERS; playerCount++) {
      for (let courts = TOURNAMENT_CONFIG.MIN_COURTS; courts <= TOURNAMENT_CONFIG.MAX_COURTS; courts++) {
        const players = Array.from({ length: playerCount }, (_, index) => `P${index + 1}`);
        const result = scheduleFor(playerCount, courts);

        expect(result.validation.isValid, `${playerCount} players / ${courts} courts`).toBe(true);

        const matchCounts = new Map(players.map((player) => [player, 0]));
        result.rounds.forEach((round) => {
          const playersInRound = new Set<string>();
          round.matches.forEach((match) => {
            [...match.team1, ...match.team2].forEach((player) => {
              expect(playersInRound.has(player)).toBe(false);
              playersInRound.add(player);
              matchCounts.set(player, matchCounts.get(player)! + 1);
            });
          });
        });

        const counts = [...matchCounts.values()];
        expect(new Set(counts).size, `${playerCount} players / ${courts} courts`).toBe(1);
      }
    }
  }, 60_000);
});

describe('planAmericanFormat', () => {
  it('matches the generated schedule for every supported configuration', () => {
    for (let playerCount = TOURNAMENT_CONFIG.MIN_PLAYERS; playerCount <= TOURNAMENT_CONFIG.MAX_PLAYERS; playerCount++) {
      for (let courts = TOURNAMENT_CONFIG.MIN_COURTS; courts <= TOURNAMENT_CONFIG.MAX_COURTS; courts++) {
        const label = `${playerCount} players / ${courts} courts`;
        const players = Array.from({ length: playerCount }, (_, index) => `P${index + 1}`);
        const plan = planAmericanFormat(playerCount, courts);
        const { rounds } = scheduleFor(playerCount, courts);
        const counts = countGames(rounds, players);

        expect(rounds.length, label).toBe(plan.rounds);
        expect(plan.minGamesPerPlayer, label).toBe(plan.maxGamesPerPlayer);
        expect((plan.rounds * plan.playingPerRound) % playerCount, label).toBe(0);
        rounds.forEach((round) => expect(round.matches.length, label).toBe(plan.activeCourts));
        expect(plan.playingPerRound + plan.restingPerRound, label).toBe(playerCount);
        expect(Math.min(...counts), label).toBe(plan.minGamesPerPlayer);
        expect(Math.max(...counts), label).toBe(plan.maxGamesPerPlayer);
      }
    }
  }, 60_000);

  it('only counts the courts the players can fill', () => {
    expect(planAmericanFormat(7, 2)).toMatchObject({
      activeCourts: 1,
      playingPerRound: 4,
      restingPerRound: 3,
    });
  });

  it('rests one player per round with 13 players on 3 courts', () => {
    expect(planAmericanFormat(13, 3)).toMatchObject({
      activeCourts: 3,
      playingPerRound: 12,
      restingPerRound: 1,
      rounds: 13,
      minGamesPerPlayer: 12,
      maxGamesPerPlayer: 12,
    });
  });

  it.each([
    { playerCount: 13, courts: 1, rounds: 13, games: 4 },
    { playerCount: 13, courts: 2, rounds: 13, games: 8 },
    { playerCount: 15, courts: 1, rounds: 15, games: 4 },
    { playerCount: 15, courts: 2, rounds: 15, games: 8 },
    { playerCount: 17, courts: 4, rounds: 17, games: 16 },
    { playerCount: 19, courts: 4, rounds: 19, games: 16 },
  ])('goes past 12 rounds when $playerCount players on $courts courts need it for equal games', ({ playerCount, courts, rounds, games }) => {
    expect(planAmericanFormat(playerCount, courts)).toMatchObject({
      rounds,
      minGamesPerPlayer: games,
      maxGamesPerPlayer: games,
    });
  });
});

describe('partner rotation', () => {
  it('never repeats a partner and gives everyone the same games for 4 to 20 players on 1 to 5 courts', () => {
    forEachSupportedSetup((playerCount, courts, label) => {
      const players = Array.from({ length: playerCount }, (_, index) => `P${index + 1}`);
      const plan = planAmericanFormat(playerCount, courts);
      const { rounds, validation } = scheduleFor(playerCount, courts);
      const games = countGames(rounds, players);

      expect(validation.isValid, label).toBe(true);
      expect(new Set(games), label).toEqual(new Set([plan.minGamesPerPlayer]));
      expect(validation.warnings, label).not.toContain('Players have unequal game counts');

      // Each player needs fewer partners than there are other players, so
      // every one of these schedules can avoid repeats entirely.
      expect(plan.maxGamesPerPlayer, label).toBeLessThanOrEqual(playerCount - 1);
      expect(Math.max(...pairCounts(rounds).partners.values()), label).toBe(1);
      expect(validation.warnings.some((warning) => warning.includes('Repeated partnership')), label).toBe(false);
    });
  }, 60_000);

  it('gives 7 players the best possible single-court schedule', () => {
    const players = ['Sergio', 'Emilio', 'Alejandro', 'Gartenflus', 'Filipino', 'Marek', 'Antonio'];
    for (const courts of [1, 2]) {
      const { rounds } = generateAmericanFormatTournament({ players, courts, pointsPerMatch: 16 });
      const { partners, opponents } = pairCounts(rounds);

      expect(rounds).toHaveLength(7);
      expect(new Set(countGames(rounds, players))).toEqual(new Set([4]));
      restingRounds(rounds, players).forEach((list) => expect(list).toHaveLength(3));
      expect(Math.max(...partners.values())).toBe(1);
      expect(partners.size).toBe(14);
      // 28 opponent meetings over 21 pairs: everyone meets, nobody more than twice.
      allPairs(players).forEach((pair) => {
        expect(opponents.get(pair) ?? 0, pair).toBeGreaterThanOrEqual(1);
        expect(opponents.get(pair) ?? 0, pair).toBeLessThanOrEqual(2);
      });
      // Zero back-to-back rests is impossible alongside the rules above.
      expect(backToBackRests(rounds, players)).toBe(1);
    }
  });

  it('gives 8 players on 2 courts every partner once and every opponent at least once', () => {
    const players = Array.from({ length: 8 }, (_, index) => `P${index + 1}`);
    const { rounds } = generateAmericanFormatTournament({ players, courts: 2, pointsPerMatch: 16 });
    const { partners, opponents } = pairCounts(rounds);

    allPairs(players).forEach((pair) => {
      expect(partners.get(pair), pair).toBe(1);
      expect(opponents.get(pair) ?? 0, pair).toBeGreaterThanOrEqual(1);
    });
  });

  it.each([
    { playerCount: 4, roundCount: 9, perPair: [3] },
    { playerCount: 5, roundCount: 10, perPair: [2] },
    { playerCount: 6, roundCount: 12, perPair: [1, 2] },
    { playerCount: 7, roundCount: 14, perPair: [1, 2] },
  ])('spreads unavoidable repeats evenly for $playerCount players over $roundCount rounds', ({ playerCount, roundCount, perPair }) => {
    const players = Array.from({ length: playerCount }, (_, index) => `P${index + 1}`);
    const rounds = buildAmericanRounds(players, 1, roundCount);
    const { partners } = pairCounts(rounds);

    expect(rounds).toHaveLength(roundCount);
    expect(new Set(countGames(rounds, players)).size).toBe(1);
    expect(new Set(allPairs(players).map((pair) => partners.get(pair) ?? 0))).toEqual(new Set(perPair));
  });

  it('reports counted partner and opponent history', () => {
    const players = Array.from({ length: 4 }, (_, index) => `P${index + 1}`);
    const rounds = buildAmericanRounds(players, 1, 6);
    const { partnershipTracking } = generateAmericanFormatTournament({ players, courts: 1, pointsPerMatch: 16 });

    expect(Math.max(...pairCounts(rounds).partners.values())).toBe(2);
    players.forEach((player) => {
      const partnerCounts = partnershipTracking.partnerCounts.get(player)!;
      const opponentCounts = partnershipTracking.opponentCounts.get(player)!;
      expect([...partnerCounts.values()]).toEqual([1, 1, 1]);
      expect([...opponentCounts.values()].reduce((sum, count) => sum + count, 0)).toBe(6);
    });
  });

  it('builds the same schedule for the same players', () => {
    const players = Array.from({ length: 11 }, (_, index) => `P${index + 1}`);
    const first = generateAmericanFormatTournament({ players, courts: 2, pointsPerMatch: 16 });
    const second = generateAmericanFormatTournament({ players, courts: 2, pointsPerMatch: 16 });
    expect(second.rounds).toEqual(first.rounds);
  });
});
