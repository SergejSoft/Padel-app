/**
 * Manual foundation testing suite
 * Runs comprehensive validation of the new tournament foundation
 */

import { 
  validateTournamentConfiguration,
  validatePlayerNames,
  validateMatchScore,
  validateAmericanFormatConfig
} from "@shared/validation-utils";
import { 
  calculatePlayerStats,
  rankPlayerStats,
  generateTournamentLeaderboard
} from "@shared/leaderboard-calculator";
import { generateAmericanFormatTournament } from "@shared/american-format-generator";
import { TOURNAMENT_CONFIG } from "@shared/tournament-config";
import type { ImmutableRound } from "@shared/tournament-types";

export interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

export function runFoundationTests(): TestResult[] {
  const results: TestResult[] = [];

  // Test 1: Tournament Configuration Validation
  try {
    const validConfig = validateTournamentConfiguration({
      playersCount: 8,
      courtsCount: 2,
      pointsPerMatch: 16,
      gameDurationMinutes: 13
    });
    
    results.push({
      testName: "Valid Tournament Configuration",
      passed: validConfig.isValid,
      details: validConfig
    });

    const invalidConfig = validateTournamentConfiguration({
      playersCount: 3, // Invalid
      courtsCount: 0,  // Invalid
      pointsPerMatch: 5, // Invalid
      gameDurationMinutes: 5 // Invalid
    });
    
    results.push({
      testName: "Invalid Tournament Configuration Detection",
      passed: !invalidConfig.isValid && invalidConfig.errors.length > 0,
      details: invalidConfig
    });
  } catch (error) {
    results.push({
      testName: "Tournament Configuration Validation",
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: Player Names Validation
  try {
    const validPlayers = validatePlayerNames(['Alice', 'Bob', 'Charlie', 'Diana']);
    results.push({
      testName: "Valid Player Names",
      passed: validPlayers.isValid,
      details: validPlayers
    });

    const duplicatePlayers = validatePlayerNames(['Alice', 'Bob', 'alice', 'Diana']);
    results.push({
      testName: "Duplicate Player Names Detection",
      passed: !duplicatePlayers.isValid,
      details: duplicatePlayers
    });
  } catch (error) {
    results.push({
      testName: "Player Names Validation",
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 3: Match Score Validation
  try {
    const validScore = validateMatchScore(10, 6, 16);
    results.push({
      testName: "Valid Match Score (10-6)",
      passed: validScore.isValid && validScore.totalPoints === 16,
      details: validScore
    });

    const invalidScore = validateMatchScore(8, 6, 16);
    results.push({
      testName: "Invalid Match Score Detection (8-6)",
      passed: !invalidScore.isValid,
      details: invalidScore
    });

    const perfectScore = validateMatchScore(16, 0, 16);
    results.push({
      testName: "Perfect Match Score (16-0)",
      passed: perfectScore.isValid,
      details: perfectScore
    });
  } catch (error) {
    results.push({
      testName: "Match Score Validation",
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 4: American Format Generation
  try {
    const tournament = generateAmericanFormatTournament({
      players: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'],
      courts: 2,
      pointsPerMatch: 16
    });

    results.push({
      testName: "8-Player American Format Generation",
      passed: tournament.validation.isValid && tournament.rounds.length === 7,
      details: {
        isValid: tournament.validation.isValid,
        roundsCount: tournament.rounds.length,
        validation: tournament.validation
      }
    });

    // Test partnership uniqueness
    const partnerships = new Set<string>();
    let duplicateFound = false;
    
    tournament.rounds.forEach(round => {
      round.matches.forEach(match => {
        const p1 = [match.team1[0], match.team1[1]].sort().join('-');
        const p2 = [match.team2[0], match.team2[1]].sort().join('-');
        
        if (partnerships.has(p1) || partnerships.has(p2)) {
          duplicateFound = true;
        }
        partnerships.add(p1);
        partnerships.add(p2);
      });
    });

    results.push({
      testName: "Partnership Uniqueness in 8-Player Format",
      passed: !duplicateFound && partnerships.size === 28, // 8 choose 2
      details: {
        totalPartnerships: partnerships.size,
        duplicateFound
      }
    });
  } catch (error) {
    results.push({
      testName: "American Format Generation",
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 5: Leaderboard Calculation
  try {
    // Create sample rounds with scores
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
    const alice = stats.find(s => s.player === 'Alice');
    
    results.push({
      testName: "Player Stats Calculation",
      passed: alice !== undefined && alice.totalPoints === 10 && alice.matchesPlayed === 1,
      details: { aliceStats: alice, allStats: stats }
    });

    const ranked = rankPlayerStats(stats);
    results.push({
      testName: "Player Ranking",
      passed: ranked.length > 0 && ranked[0].rank === 1,
      details: ranked
    });

    const leaderboard = generateTournamentLeaderboard(rounds);
    results.push({
      testName: "Tournament Leaderboard Generation",
      passed: leaderboard.players.length === 4 && leaderboard.completedMatches === 1,
      details: leaderboard
    });
  } catch (error) {
    results.push({
      testName: "Leaderboard Calculation",
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return results;
}

export function printTestResults(results: TestResult[]): void {
  console.log('\n=== Foundation Test Results ===\n');
  
  let passed = 0;
  let failed = 0;
  
  results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${result.testName}`);
    
    if (!result.passed) {
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`  Details:`, result.details);
      }
      failed++;
    } else {
      passed++;
    }
  });
  
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
  
  if (failed === 0) {
    console.log('🎉 All foundation tests passed! The tournament system is solid and ready.');
  } else {
    console.log('⚠️  Some tests failed. Please review the foundation implementation.');
  }
}