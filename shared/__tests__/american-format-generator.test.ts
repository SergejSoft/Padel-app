/**
 * Unit tests for American format generator
 * Comprehensive validation of tournament generation
 */

import { describe, it, expect } from 'vitest';
import { generateAmericanFormatTournament, planAmericanFormat } from '../american-format-generator';
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

  it('allows unavoidable repeated partnerships as warnings', () => {
    const result = generateAmericanFormatTournament({
      players: Array.from({ length: 12 }, (_, index) => `Player ${index + 1}`),
      courts: 3,
      pointsPerMatch: 16,
    });

    expect(result.validation.isValid).toBe(true);
    expect(result.rounds).toHaveLength(11);
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
        const result = generateAmericanFormatTournament({
          players,
          courts,
          pointsPerMatch: 16,
        });

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
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('planAmericanFormat', () => {
  it('matches the generated schedule for every supported configuration', () => {
    for (let playerCount = TOURNAMENT_CONFIG.MIN_PLAYERS; playerCount <= TOURNAMENT_CONFIG.MAX_PLAYERS; playerCount++) {
      for (let courts = TOURNAMENT_CONFIG.MIN_COURTS; courts <= TOURNAMENT_CONFIG.MAX_COURTS; courts++) {
        const label = `${playerCount} players / ${courts} courts`;
        const players = Array.from({ length: playerCount }, (_, index) => `P${index + 1}`);
        const plan = planAmericanFormat(playerCount, courts);
        const { rounds } = generateAmericanFormatTournament({ players, courts, pointsPerMatch: 16 });
        const counts = countGames(rounds, players);

        expect(rounds.length, label).toBe(plan.rounds);
        rounds.forEach((round) => expect(round.matches.length, label).toBe(plan.activeCourts));
        expect(plan.playingPerRound + plan.restingPerRound, label).toBe(playerCount);
        expect(Math.min(...counts), label).toBe(plan.minGamesPerPlayer);
        expect(Math.max(...counts), label).toBe(plan.maxGamesPerPlayer);
      }
    }
  });

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
      rounds: 12,
      minGamesPerPlayer: 11,
      maxGamesPerPlayer: 12,
    });
  });
});