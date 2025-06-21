import type { Round, Match, PlayerStats, MatchScore } from "@shared/schema";

/**
 * Tournament Scoring System
 * - 3 points for winning a match
 * - 1 point for each set won
 * - 0 points for losing a match
 */

export function calculatePlayerStats(rounds: Round[]): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>();
  
  // Initialize all players
  rounds.forEach(round => {
    round.matches.forEach(match => {
      [match.team1[0], match.team1[1], match.team2[0], match.team2[1]].forEach(player => {
        if (!statsMap.has(player)) {
          statsMap.set(player, {
            player,
            matchesPlayed: 0,
            matchesWon: 0,
            setsWon: 0,
            setsLost: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            winPercentage: 0,
            totalPoints: 0
          });
        }
      });
    });
  });

  // Calculate stats from completed matches
  rounds.forEach(round => {
    round.matches.forEach(match => {
      if (match.score && match.status === 'completed') {
        const team1Players = [match.team1[0], match.team1[1]];
        const team2Players = [match.team2[0], match.team2[1]];
        
        const team1Won = match.score.team1Score > match.score.team2Score;
        
        // Update match stats
        team1Players.forEach(player => {
          const stats = statsMap.get(player)!;
          stats.matchesPlayed++;
          if (team1Won) stats.matchesWon++;
          stats.setsWon += match.score!.team1Score;
          stats.setsLost += match.score!.team2Score;
        });
        
        team2Players.forEach(player => {
          const stats = statsMap.get(player)!;
          stats.matchesPlayed++;
          if (!team1Won) stats.matchesWon++;
          stats.setsWon += match.score!.team2Score;
          stats.setsLost += match.score!.team1Score;
        });

        // Add points from individual sets
        if (match.score.sets) {
          match.score.sets.forEach(set => {
            team1Players.forEach(player => {
              const stats = statsMap.get(player)!;
              stats.pointsFor += set.team1;
              stats.pointsAgainst += set.team2;
            });
            
            team2Players.forEach(player => {
              const stats = statsMap.get(player)!;
              stats.pointsFor += set.team2;
              stats.pointsAgainst += set.team1;
            });
          });
        }
      }
    });
  });

  // Calculate derived stats
  statsMap.forEach(stats => {
    stats.winPercentage = stats.matchesPlayed > 0 
      ? (stats.matchesWon / stats.matchesPlayed) * 100 
      : 0;
    
    // Tournament points: 3 for match win + 1 for each set won
    stats.totalPoints = (stats.matchesWon * 3) + stats.setsWon;
  });

  return Array.from(statsMap.values());
}

export function validateScore(score: MatchScore): boolean {
  // Basic validation
  if (score.team1Score < 0 || score.team2Score < 0) return false;
  if (!score.sets || score.sets.length === 0) return false;
  
  // Validate sets
  for (const set of score.sets) {
    if (set.team1 < 0 || set.team2 < 0) return false;
  }
  
  // Match score should match set wins
  const team1SetWins = score.sets.filter(set => set.team1 > set.team2).length;
  const team2SetWins = score.sets.filter(set => set.team2 > set.team1).length;
  
  return score.team1Score === team1SetWins && score.team2Score === team2SetWins;
}

export function updateMatchWithScore(match: Match, score: MatchScore): Match {
  return {
    ...match,
    score,
    status: 'completed'
  };
}

export function getTournamentProgress(rounds: Round[]): {
  completedMatches: number;
  totalMatches: number;
  progressPercentage: number;
  completedRounds: number;
} {
  const totalMatches = rounds.reduce((total, round) => total + round.matches.length, 0);
  const completedMatches = rounds.reduce((total, round) => 
    total + round.matches.filter(match => match.status === 'completed').length, 0
  );
  
  const completedRounds = rounds.filter(round => 
    round.matches.every(match => match.status === 'completed')
  ).length;
  
  const progressPercentage = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

  return {
    completedMatches,
    totalMatches,
    progressPercentage,
    completedRounds
  };
}