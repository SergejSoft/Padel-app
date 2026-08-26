/**
 * Unit tests for validation utilities
 * Comprehensive test coverage for all validation functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateTournamentConfiguration,
  validatePlayerNames,
  validateMatchScore,
  validateAmericanFormatConfig,
  validateAmericanFormatSchedule
} from '../validation-utils';
import { TOURNAMENT_CONFIG } from '../tournament-config';
import type { ImmutableRound, ImmutableMatch } from '../tournament-types';

describe('validateTournamentConfiguration', () => {
  it('should validate correct configuration', () => {
    const config = {
      playersCount: 8,
      courtsCount: 2,
      pointsPerMatch: 16,
      gameDurationMinutes: 13
    };
    
    const result = validateTournamentConfiguration(config);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data).toEqual(config);
  });

  it('should reject insufficient players', () => {
    const config = {
      playersCount: 2,
      courtsCount: 2,
      pointsPerMatch: 16,
      gameDurationMinutes: 13
    };
    
    const result = validateTournamentConfiguration(config);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Minimum 4 players required');
  });

  it('should accept player counts that require rotating sit-outs', () => {
    const config = {
      playersCount: 6,
      courtsCount: 2,
      pointsPerMatch: 16,
      gameDurationMinutes: 13
    };
    
    const result = validateTournamentConfiguration(config);
    expect(result.isValid).toBe(true);
  });

  it('should warn about non-optimal player count', () => {
    const config = {
      playersCount: 12,
      courtsCount: 3,
      pointsPerMatch: 16,
      gameDurationMinutes: 13
    };
    
    const result = validateTournamentConfiguration(config);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain('Optimal player count is 8 for balanced American format');
  });

  it.each([16, 24, 32])('should accept the supported %i-point format', (pointsPerMatch) => {
    const result = validateTournamentConfiguration({
      playersCount: 8,
      courtsCount: 2,
      pointsPerMatch,
      gameDurationMinutes: 13,
    });

    expect(result.isValid).toBe(true);
  });

  it('should reject unsupported match totals', () => {
    const result = validateTournamentConfiguration({
      playersCount: 8,
      courtsCount: 2,
      pointsPerMatch: 20,
      gameDurationMinutes: 13,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Points per match must be 16, 24, or 32');
  });
});

describe('validatePlayerNames', () => {
  it('should validate correct player names', () => {
    const players = ['Alice', 'Bob', 'Charlie', 'Diana'];
    const result = validatePlayerNames(players);
    
    expect(result.isValid).toBe(true);
    expect(result.data).toEqual(['Alice', 'Bob', 'Charlie', 'Diana']);
  });

  it('should detect duplicate names (case insensitive)', () => {
    const players = ['Alice', 'bob', 'ALICE', 'Diana'];
    const result = validatePlayerNames(players);
    
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Duplicate player names');
  });

  it('should trim whitespace from names', () => {
    const players = [' Alice ', '  Bob  ', 'Charlie', 'Diana'];
    const result = validatePlayerNames(players);
    
    expect(result.isValid).toBe(true);
    expect(result.data).toEqual(['Alice', 'Bob', 'Charlie', 'Diana']);
  });

  it('should reject empty names', () => {
    const players = ['Alice', '', 'Charlie', 'Diana'];
    const result = validatePlayerNames(players);
    
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Player 2: Name cannot be empty');
  });
});

describe('validateMatchScore', () => {
  it('should validate correct scores totaling 16', () => {
    const result = validateMatchScore(10, 6, 16);
    
    expect(result.isValid).toBe(true);
    expect(result.totalPoints).toBe(16);
    expect(result.validationErrors).toHaveLength(0);
  });

  it('should reject scores not totaling required points', () => {
    const result = validateMatchScore(8, 6, 16);
    
    expect(result.isValid).toBe(false);
    expect(result.validationErrors).toContain('Total points must equal 16 (currently 14)');
  });

  it('should reject negative scores', () => {
    const result = validateMatchScore(-2, 18, 16);
    
    expect(result.isValid).toBe(false);
    expect(result.validationErrors).toContain('Scores cannot be negative');
  });

  it('should reject non-integer scores', () => {
    const result = validateMatchScore(8.5, 7.5, 16);
    
    expect(result.isValid).toBe(false);
    expect(result.validationErrors).toContain('Scores must be whole numbers');
  });

  it('should work with custom point totals', () => {
    const result = validateMatchScore(15, 5, 20);
    
    expect(result.isValid).toBe(true);
    expect(result.totalPoints).toBe(20);
  });
});

describe('validateAmericanFormatSchedule', () => {
  it('should validate a proper 8-player schedule', () => {
    const rounds: ImmutableRound[] = [
      {
        round: 1,
        matches: [
          {
            court: 1,
            team1: ['Alice', 'Bob'],
            team2: ['Charlie', 'Diana'],
            round: 1,
            gameNumber: 1,
            status: 'pending'
          },
          {
            court: 2,
            team1: ['Eve', 'Frank'],
            team2: ['Grace', 'Henry'],
            round: 1,
            gameNumber: 2,
            status: 'pending'
          }
        ]
      }
    ];
    
    const result = validateAmericanFormatSchedule(rounds);
    expect(result.isValid).toBe(true);
  });

  it('should detect repeated partnerships', () => {
    const rounds: ImmutableRound[] = [
      {
        round: 1,
        matches: [
          {
            court: 1,
            team1: ['Alice', 'Bob'],
            team2: ['Charlie', 'Diana'],
            round: 1,
            gameNumber: 1,
            status: 'pending'
          }
        ]
      },
      {
        round: 2,
        matches: [
          {
            court: 1,
            team1: ['Alice', 'Bob'], // Repeated partnership
            team2: ['Eve', 'Frank'],
            round: 2,
            gameNumber: 2,
            status: 'pending'
          }
        ]
      }
    ];
    
    const result = validateAmericanFormatSchedule(rounds);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain('Round 2: Repeated partnership Alice & Bob');
  });

  it('should detect when not all players participate in a round', () => {
    const rounds: ImmutableRound[] = [
      {
        round: 1,
        matches: [
          {
            court: 1,
            team1: ['Alice', 'Bob'],
            team2: ['Charlie', 'Diana'],
            round: 1,
            gameNumber: 1,
            status: 'pending'
          }
          // Missing second match - only 4 players participate
        ]
      }
    ];
    
    const result = validateAmericanFormatSchedule(
      rounds,
      ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'],
    );
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Eve is not scheduled in any round');
  });
});