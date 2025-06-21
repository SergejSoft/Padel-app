/**
 * Internal Scoring Algorithm Validation Test
 * 
 * This test validates that our scoring system works correctly by:
 * - Simulating 7 rounds of play (full American format tournament)
 * - Ensuring player 1 is on the winning team every time
 * - Confirming that the scoring system adds up to the correct total
 * - Failing clearly if the result is wrong
 */

import { generateAmericanFormat } from '../american-format';
import type { Round } from '@shared/schema';

interface TestGameScore {
  team1Score: number;
  team2Score: number;
}

interface PlayerStats {
  player: string;
  totalPoints: number;
  gamesPlayed: number;
  averageScore: number;
}

/**
 * Calculate player scores from tournament rounds and game scores
 */
function calculatePlayerScores(rounds: Round[], gameScores: Record<number, TestGameScore>): PlayerStats[] {
  const playerScores: Record<string, { totalPoints: number; gamesPlayed: number }> = {};
  
  // Get all unique players from rounds
  const allPlayers = new Set<string>();
  rounds.forEach(round => {
    round.matches.forEach(match => {
      match.team1.forEach(player => allPlayers.add(player));
      match.team2.forEach(player => allPlayers.add(player));
    });
  });

  // Initialize all players
  Array.from(allPlayers).forEach(player => {
    playerScores[player] = { totalPoints: 0, gamesPlayed: 0 };
  });

  // Calculate scores from games
  rounds.forEach(round => {
    round.matches.forEach(match => {
      const score = gameScores[match.gameNumber];
      if (score) {
        // Team 1 players
        match.team1.forEach(player => {
          playerScores[player].totalPoints += score.team1Score;
          playerScores[player].gamesPlayed += 1;
        });
        
        // Team 2 players  
        match.team2.forEach(player => {
          playerScores[player].totalPoints += score.team2Score;
          playerScores[player].gamesPlayed += 1;
        });
      }
    });
  });

  return Object.entries(playerScores).map(([player, data]) => ({
    player,
    totalPoints: data.totalPoints,
    gamesPlayed: data.gamesPlayed,
    averageScore: data.gamesPlayed > 0 ? data.totalPoints / data.gamesPlayed : 0
  }));
}

/**
 * Run the scoring validation test
 */
function runScoringValidationTest(): { success: boolean; message: string; details?: any } {
  try {
    console.log('🧪 Starting Scoring Algorithm Validation Test...');
    
    // Test data - 8 players for American format
    const players = [
      'Player 1', 'Player 2', 'Player 3', 'Player 4',
      'Player 5', 'Player 6', 'Player 7', 'Player 8'
    ];
    
    // Generate tournament schedule
    const rounds = generateAmericanFormat({
      players,
      courts: 2
    });
    
    console.log(`✓ Generated ${rounds.length} rounds with ${rounds.reduce((sum, r) => sum + r.matches.length, 0)} total matches`);
    
    // Verify we have exactly 7 rounds (American format requirement)
    if (rounds.length !== 7) {
      return {
        success: false,
        message: `Expected 7 rounds, got ${rounds.length}`,
        details: { rounds: rounds.length }
      };
    }
    
    // Create game scores where Player 1's team always wins
    const gameScores: Record<number, TestGameScore> = {};
    let player1Games = 0;
    
    rounds.forEach(round => {
      round.matches.forEach(match => {
        const isPlayer1InTeam1 = match.team1.includes('Player 1');
        const isPlayer1InTeam2 = match.team2.includes('Player 1');
        
        if (isPlayer1InTeam1) {
          // Player 1 is in team 1 - they win with 12 points
          gameScores[match.gameNumber] = { team1Score: 12, team2Score: 4 };
          player1Games++;
        } else if (isPlayer1InTeam2) {
          // Player 1 is in team 2 - they win with 12 points
          gameScores[match.gameNumber] = { team1Score: 4, team2Score: 12 };
          player1Games++;
        } else {
          // Player 1 not in this match - balanced score
          gameScores[match.gameNumber] = { team1Score: 8, team2Score: 8 };
        }
        
        // Validate that scores sum to 16
        const sum = gameScores[match.gameNumber].team1Score + gameScores[match.gameNumber].team2Score;
        if (sum !== 16) {
          throw new Error(`Game ${match.gameNumber}: Scores sum to ${sum}, expected 16`);
        }
      });
    });
    
    console.log(`✓ Created scores for all games. Player 1 participates in ${player1Games} games`);
    
    // Calculate player statistics
    const playerStats = calculatePlayerScores(rounds, gameScores);
    const player1Stats = playerStats.find(p => p.player === 'Player 1');
    
    if (!player1Stats) {
      return {
        success: false,
        message: 'Player 1 not found in calculated statistics',
        details: { playerStats }
      };
    }
    
    console.log(`✓ Player 1 stats: ${player1Stats.totalPoints} points in ${player1Stats.gamesPlayed} games (avg: ${player1Stats.averageScore.toFixed(1)})`);
    
    // Validation checks
    const expectedPlayer1Points = player1Games * 12; // Player 1 always scores 12 when playing
    const expectedPlayer1Games = 7; // In American format, each player plays exactly 7 games
    
    // Check that Player 1 played the correct number of games
    if (player1Stats.gamesPlayed !== expectedPlayer1Games) {
      return {
        success: false,
        message: `Player 1 played ${player1Stats.gamesPlayed} games, expected ${expectedPlayer1Games}`,
        details: { actual: player1Stats.gamesPlayed, expected: expectedPlayer1Games }
      };
    }
    
    // Check that Player 1 has the correct total points
    if (player1Stats.totalPoints !== expectedPlayer1Points) {
      return {
        success: false,
        message: `Player 1 scored ${player1Stats.totalPoints} points, expected ${expectedPlayer1Points}`,
        details: { actual: player1Stats.totalPoints, expected: expectedPlayer1Points }
      };
    }
    
    // Check that Player 1 has the highest score (since they always win)
    const sortedStats = playerStats.sort((a, b) => b.totalPoints - a.totalPoints);
    if (sortedStats[0].player !== 'Player 1') {
      return {
        success: false,
        message: `Player 1 should have highest score, but ${sortedStats[0].player} has ${sortedStats[0].totalPoints} points`,
        details: { leaderboard: sortedStats.slice(0, 3) }
      };
    }
    
    // Verify total points distribution
    const totalPointsDistributed = playerStats.reduce((sum, p) => sum + p.totalPoints, 0);
    const expectedTotalPoints = Object.values(gameScores).reduce((sum, score) => sum + score.team1Score + score.team2Score, 0);
    
    if (totalPointsDistributed !== expectedTotalPoints) {
      return {
        success: false,
        message: `Total points mismatch: distributed ${totalPointsDistributed}, expected ${expectedTotalPoints}`,
        details: { distributed: totalPointsDistributed, expected: expectedTotalPoints }
      };
    }
    
    console.log(`✓ All validations passed!`);
    console.log(`✓ Total points distributed: ${totalPointsDistributed}`);
    console.log(`✓ Player 1 is ranked #1 with ${player1Stats.totalPoints} points`);
    
    return {
      success: true,
      message: 'Scoring algorithm validation successful',
      details: {
        rounds: rounds.length,
        totalGames: Object.keys(gameScores).length,
        player1Stats,
        totalPointsDistributed,
        leaderboard: sortedStats.slice(0, 5)
      }
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Test failed with error: ${error instanceof Error ? error.message : String(error)}`,
      details: { error }
    };
  }
}

// Export for use in components or manual testing
export { runScoringValidationTest, calculatePlayerScores };

// Auto-run test in development (disabled for deployment)
if (typeof window !== 'undefined' && import.meta.env.DEV && false) {
  // Run test after a short delay to ensure everything is loaded
  setTimeout(() => {
    const result = runScoringValidationTest();
    if (result.success) {
      console.log('✅ SCORING VALIDATION PASSED:', result.message);
      console.log('📊 Details:', result.details);
    } else {
      console.error('❌ SCORING VALIDATION FAILED:', result.message);
      console.error('🔍 Details:', result.details);
    }
  }, 1000);
}