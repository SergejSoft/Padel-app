/**
 * Unit tests for American format generator
 * Comprehensive validation of tournament generation
 */

import { describe, it, expect } from 'vitest';
import { generateAmericanFormatTournament } from '../american-format-generator';

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
      courts: 1,
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
      courts: 1,
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
});