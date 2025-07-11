/**
 * Unit tests for leaderboard calculation logic
 * Comprehensive test coverage including edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePlayerStats,
  rankPlayerStats,
  generateTournamentLeaderboard,
  validateLeaderboardIntegrity,
  calculateTournamentProgress
} from '../leaderboard-calculator';
import type { ImmutableRound, ImmutableMatch, ImmutablePlayerStats } from '../tournament-types';

describe('calculatePlayerStats', () => {
  it('should calculate stats for completed matches', () => {
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
            status: 'completed',
            score: {
              team1Score: 10,
              team2Score: 6,
              isValid: true,
              totalPoints: 16,
              validationErrors: []
            }
          }
        ]
      }
    ];

    const stats = calculatePlayerStats(rounds);
    
    // Alice and Bob should have 10 points each
    const alice = stats.find(s => s.player === 'Alice')!;
    const bob = stats.find(s => s.player === 'Bob')!;
    const charlie = stats.find(s => s.player === 'Charlie')!;
    const diana = stats.find(s => s.player === 'Diana')!;

    expect(alice.totalPoints).toBe(10);
    expect(alice.pointsFor).toBe(10);
    expect(alice.pointsAgainst).toBe(6);
    expect(alice.matchesPlayed).toBe(1);
    expect(alice.winPercentage).toBe(100);

    expect(charlie.totalPoints).toBe(6);
    expect(charlie.pointsFor).toBe(6);
    expect(charlie.pointsAgainst).toBe(10);
    expect(charlie.winPercentage).toBe(0);
  });

  it('should ignore matches without valid scores', () => {
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
            // No score
          }
        ]
      }
    ];

    const stats = calculatePlayerStats(rounds);
    
    stats.forEach(stat => {
      expect(stat.matchesPlayed).toBe(0);
      expect(stat.totalPoints).toBe(0);
    });
  });

  it('should handle multiple rounds correctly', () => {
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
            status: 'completed',
            score: {
              team1Score: 12,
              team2Score: 4,
              isValid: true,
              totalPoints: 16,
              validationErrors: []
            }
          }
        ]
      },
      {
        round: 2,
        matches: [
          {
            court: 1,
            team1: ['Alice', 'Charlie'],
            team2: ['Bob', 'Diana'],
            round: 2,
            gameNumber: 2,
            status: 'completed',
            score: {
              team1Score: 8,
              team2Score: 8,
              isValid: true,
              totalPoints: 16,
              validationErrors: []
            }
          }
        ]
      }
    ];

    const stats = calculatePlayerStats(rounds);
    const alice = stats.find(s => s.player === 'Alice')!;
    
    expect(alice.matchesPlayed).toBe(2);
    expect(alice.totalPoints).toBe(20); // 12 + 8
    expect(alice.averageScore).toBe(10);
  });
});

describe('rankPlayerStats', () => {
  it('should rank by total points (primary)', () => {
    const stats: ImmutablePlayerStats[] = [
      {
        player: 'Alice',
        matchesPlayed: 2,
        totalPoints: 20,
        pointsFor: 20,
        pointsAgainst: 12,
        winPercentage: 100,
        averageScore: 10,
        rank: 0
      },
      {
        player: 'Bob',
        matchesPlayed: 2,
        totalPoints: 25,
        pointsFor: 25,
        pointsAgainst: 7,
        winPercentage: 100,
        averageScore: 12.5,
        rank: 0
      }
    ];

    const ranked = rankPlayerStats(stats);
    
    expect(ranked[0].player).toBe('Bob'); // Higher total points
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].player).toBe('Alice');
    expect(ranked[1].rank).toBe(2);
  });

  it('should rank by games played when total points are equal', () => {
    const stats: ImmutablePlayerStats[] = [
      {
        player: 'Alice',
        matchesPlayed: 2,
        totalPoints: 20,
        pointsFor: 20,
        pointsAgainst: 12,
        winPercentage: 100,
        averageScore: 10,
        rank: 0
      },
      {
        player: 'Bob',
        matchesPlayed: 3,
        totalPoints: 20,
        pointsFor: 20,
        pointsAgainst: 16,
        winPercentage: 66.67,
        averageScore: 6.67,
        rank: 0
      }
    ];

    const ranked = rankPlayerStats(stats);
    
    expect(ranked[0].player).toBe('Bob'); // More games played
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
  });

  it('should rank alphabetically when points and games are equal', () => {
    const stats: ImmutablePlayerStats[] = [
      {
        player: 'Charlie',
        matchesPlayed: 2,
        totalPoints: 20,
        pointsFor: 20,
        pointsAgainst: 12,
        winPercentage: 100,
        averageScore: 10,
        rank: 0
      },
      {
        player: 'Alice',
        matchesPlayed: 2,
        totalPoints: 20,
        pointsFor: 20,
        pointsAgainst: 12,
        winPercentage: 100,
        averageScore: 10,
        rank: 0
      }
    ];

    const ranked = rankPlayerStats(stats);
    
    expect(ranked[0].player).toBe('Alice'); // Alphabetically first
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].player).toBe('Charlie');
    expect(ranked[1].rank).toBe(1); // Same rank due to tie
  });

  it('should handle ties correctly', () => {
    const stats: ImmutablePlayerStats[] = [
      {
        player: 'Alice',
        matchesPlayed: 2,
        totalPoints: 20,
        pointsFor: 20,
        pointsAgainst: 12,
        winPercentage: 100,
        averageScore: 10,
        rank: 0
      },
      {
        player: 'Bob',
        matchesPlayed: 2,
        totalPoints: 20,
        pointsFor: 20,
        pointsAgainst: 12,
        winPercentage: 100,
        averageScore: 10,
        rank: 0
      },
      {
        player: 'Charlie',
        matchesPlayed: 2,
        totalPoints: 15,
        pointsFor: 15,
        pointsAgainst: 17,
        winPercentage: 50,
        averageScore: 7.5,
        rank: 0
      }
    ];

    const ranked = rankPlayerStats(stats);
    
    expect(ranked[0].rank).toBe(1); // Alice
    expect(ranked[1].rank).toBe(1); // Bob (tied with Alice)
    expect(ranked[2].rank).toBe(3); // Charlie (skips rank 2)
  });
});

describe('validateLeaderboardIntegrity', () => {
  it('should validate correct leaderboard', () => {
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
            status: 'completed',
            score: {
              team1Score: 10,
              team2Score: 6,
              isValid: true,
              totalPoints: 16,
              validationErrors: []
            }
          }
        ]
      }
    ];

    const leaderboard = generateTournamentLeaderboard(rounds);
    const isValid = validateLeaderboardIntegrity(leaderboard, rounds);
    
    expect(isValid).toBe(true);
  });

  it('should detect incorrect ranking order', () => {
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
            status: 'completed',
            score: {
              team1Score: 10,
              team2Score: 6,
              isValid: true,
              totalPoints: 16,
              validationErrors: []
            }
          }
        ]
      }
    ];

    const leaderboard = generateTournamentLeaderboard(rounds);
    
    // Manually corrupt the order
    const corruptedLeaderboard = {
      ...leaderboard,
      players: [...leaderboard.players].reverse() // Reverse the correct order
    };
    
    const isValid = validateLeaderboardIntegrity(corruptedLeaderboard, rounds);
    expect(isValid).toBe(false);
  });
});

describe('calculateTournamentProgress', () => {
  it('should calculate progress correctly', () => {
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
            status: 'completed',
            score: {
              team1Score: 10,
              team2Score: 6,
              isValid: true,
              totalPoints: 16,
              validationErrors: []
            }
          },
          {
            court: 2,
            team1: ['Eve', 'Frank'],
            team2: ['Grace', 'Henry'],
            round: 1,
            gameNumber: 2,
            status: 'pending'
            // No score - not completed
          }
        ]
      }
    ];

    const progress = calculateTournamentProgress(rounds);
    
    expect(progress.totalMatches).toBe(2);
    expect(progress.completedMatches).toBe(1);
    expect(progress.progressPercentage).toBe(50);
    expect(progress.estimatedTimeRemaining).toBe(13); // 1 remaining match * 13 minutes
  });

  it('should handle empty tournament', () => {
    const progress = calculateTournamentProgress([]);
    
    expect(progress.totalMatches).toBe(0);
    expect(progress.completedMatches).toBe(0);
    expect(progress.progressPercentage).toBe(0);
    expect(progress.estimatedTimeRemaining).toBe(0);
  });
});