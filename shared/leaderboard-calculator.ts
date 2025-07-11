/**
 * Immutable leaderboard calculation logic
 * Pure functions with comprehensive statistics calculation
 */

import type { 
  ImmutableMatch, 
  ImmutableRound, 
  ImmutablePlayerStats, 
  TournamentLeaderboard,
  ValidatedMatchScore 
} from './tournament-types';

/**
 * Calculates comprehensive player statistics from tournament matches
 * Returns immutable player stats with proper ranking
 */
export function calculatePlayerStats(rounds: readonly ImmutableRound[]): readonly ImmutablePlayerStats[] {
  // Initialize player data tracking
  const playerData = new Map<string, {
    matchesPlayed: number;
    totalPoints: number;
    pointsFor: number;
    pointsAgainst: number;
    wins: number;
  }>();

  // Extract all players from rounds
  const allPlayers = new Set<string>();
  rounds.forEach(round => {
    round.matches.forEach(match => {
      match.team1.forEach(player => allPlayers.add(player));
      match.team2.forEach(player => allPlayers.add(player));
    });
  });

  // Initialize all players
  allPlayers.forEach(player => {
    playerData.set(player, {
      matchesPlayed: 0,
      totalPoints: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      wins: 0
    });
  });

  // Calculate statistics from completed matches
  rounds.forEach(round => {
    round.matches.forEach(match => {
      // Only process matches with scores
      if (!match.score || !match.score.isValid) {
        return;
      }

      const { team1Score, team2Score } = match.score;
      const team1Won = team1Score > team2Score;

      // Update team 1 players
      match.team1.forEach(player => {
        const data = playerData.get(player)!;
        data.matchesPlayed += 1;
        data.pointsFor += team1Score;
        data.pointsAgainst += team2Score;
        data.totalPoints += team1Score;
        if (team1Won) data.wins += 1;
      });

      // Update team 2 players
      match.team2.forEach(player => {
        const data = playerData.get(player)!;
        data.matchesPlayed += 1;
        data.pointsFor += team2Score;
        data.pointsAgainst += team1Score;
        data.totalPoints += team2Score;
        if (!team1Won) data.wins += 1;
      });
    });
  });

  // Convert to immutable player stats
  const playerStats: ImmutablePlayerStats[] = Array.from(playerData.entries()).map(([player, data]) => ({
    player,
    matchesPlayed: data.matchesPlayed,
    totalPoints: data.totalPoints,
    pointsFor: data.pointsFor,
    pointsAgainst: data.pointsAgainst,
    winPercentage: data.matchesPlayed > 0 ? (data.wins / data.matchesPlayed) * 100 : 0,
    averageScore: data.matchesPlayed > 0 ? data.totalPoints / data.matchesPlayed : 0,
    rank: 0 // Will be set during ranking
  }));

  // Sort and rank players according to strict ranking rules
  return rankPlayerStats(playerStats);
}

/**
 * Ranks player statistics according to strict priority rules:
 * 1. Total Points Scored (primary ranking factor)
 * 2. Games Played (to account for different participation levels)
 * 3. Name (alphabetical, as tiebreaker)
 */
export function rankPlayerStats(stats: readonly ImmutablePlayerStats[]): readonly ImmutablePlayerStats[] {
  // Create mutable copy for sorting
  const sortedStats = [...stats].sort((a, b) => {
    // Primary: Total Points (descending)
    if (a.totalPoints !== b.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    
    // Secondary: Games Played (descending - more participation ranks higher)
    if (a.matchesPlayed !== b.matchesPlayed) {
      return b.matchesPlayed - a.matchesPlayed;
    }
    
    // Tertiary: Name (alphabetical ascending)
    return a.player.localeCompare(b.player);
  });

  // Assign ranks (handle ties properly)
  return sortedStats.map((stat, index) => {
    let rank = index + 1;
    
    // Check for ties with previous player
    if (index > 0) {
      const prevStat = sortedStats[index - 1];
      if (stat.totalPoints === prevStat.totalPoints && 
          stat.matchesPlayed === prevStat.matchesPlayed) {
        rank = prevStat.rank;
      }
    }
    
    return {
      ...stat,
      rank
    };
  });
}

/**
 * Generates complete tournament leaderboard with metadata
 */
export function generateTournamentLeaderboard(rounds: readonly ImmutableRound[]): TournamentLeaderboard {
  const playerStats = calculatePlayerStats(rounds);
  
  // Calculate tournament completion metrics
  const totalMatches = rounds.reduce((sum, round) => sum + round.matches.length, 0);
  const completedMatches = rounds.reduce((sum, round) => {
    return sum + round.matches.filter(match => match.score?.isValid).length;
  }, 0);
  
  return {
    players: playerStats,
    lastUpdated: new Date(),
    isComplete: completedMatches === totalMatches && totalMatches > 0,
    totalMatches,
    completedMatches
  };
}

/**
 * Updates leaderboard with new match result (immutable operation)
 */
export function updateLeaderboardWithMatchResult(
  currentLeaderboard: TournamentLeaderboard,
  rounds: readonly ImmutableRound[]
): TournamentLeaderboard {
  // Recalculate complete leaderboard to ensure accuracy
  return generateTournamentLeaderboard(rounds);
}

/**
 * Validates leaderboard data integrity
 */
export function validateLeaderboardIntegrity(
  leaderboard: TournamentLeaderboard,
  rounds: readonly ImmutableRound[]
): boolean {
  // Verify all players from rounds are in leaderboard
  const roundPlayers = new Set<string>();
  rounds.forEach(round => {
    round.matches.forEach(match => {
      match.team1.forEach(player => roundPlayers.add(player));
      match.team2.forEach(player => roundPlayers.add(player));
    });
  });

  const leaderboardPlayers = new Set(leaderboard.players.map(p => p.player));
  
  // Check if all round players are in leaderboard
  for (const player of roundPlayers) {
    if (!leaderboardPlayers.has(player)) {
      return false;
    }
  }

  // Check if all leaderboard players are in rounds
  for (const player of leaderboardPlayers) {
    if (!roundPlayers.has(player)) {
      return false;
    }
  }

  // Verify ranking order
  for (let i = 1; i < leaderboard.players.length; i++) {
    const current = leaderboard.players[i];
    const previous = leaderboard.players[i - 1];
    
    // Current player should not have more total points than previous
    if (current.totalPoints > previous.totalPoints) {
      return false;
    }
    
    // If same total points, check games played
    if (current.totalPoints === previous.totalPoints && 
        current.matchesPlayed > previous.matchesPlayed) {
      return false;
    }
    
    // If same points and games, check alphabetical order
    if (current.totalPoints === previous.totalPoints && 
        current.matchesPlayed === previous.matchesPlayed &&
        current.player < previous.player) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates tournament progress statistics
 */
export function calculateTournamentProgress(rounds: readonly ImmutableRound[]): {
  readonly totalMatches: number;
  readonly completedMatches: number;
  readonly progressPercentage: number;
  readonly estimatedTimeRemaining: number; // in minutes
} {
  const totalMatches = rounds.reduce((sum, round) => sum + round.matches.length, 0);
  const completedMatches = rounds.reduce((sum, round) => {
    return sum + round.matches.filter(match => match.score?.isValid).length;
  }, 0);
  
  const progressPercentage = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
  const remainingMatches = totalMatches - completedMatches;
  
  // Estimate remaining time (13 minutes per match on average)
  const estimatedTimeRemaining = remainingMatches * 13;
  
  return {
    totalMatches,
    completedMatches,
    progressPercentage,
    estimatedTimeRemaining
  };
}