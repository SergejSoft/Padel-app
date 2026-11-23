import type { PlayerStats } from "./schema.js";
import { scoreProgress } from "./tournament-lifecycle.js";

interface ScheduleMatch {
  gameNumber: number;
  team1: readonly string[];
  team2: readonly string[];
  [key: string]: unknown;
}

interface ScheduleRound {
  round: number;
  matches: readonly ScheduleMatch[];
}

interface SavedScore {
  gameNumber: number;
  team1Score: number;
  team2Score: number;
}

export interface CompletableTournament {
  schedule?: readonly ScheduleRound[] | null;
  finalScores?: readonly SavedScore[] | null;
}

/** Why a tournament cannot be marked complete yet, or null when it can. */
export function completionBlocker(tournament: CompletableTournament): string | null {
  const { scored, total } = scoreProgress(tournament);
  if (total === 0) return "The tournament has no schedule yet.";
  if (scored < total) return `Only ${scored} of ${total} games have a saved score.`;
  return null;
}

function scoresByGame(finalScores: readonly SavedScore[] | null | undefined): Map<number, SavedScore> {
  return new Map((finalScores ?? []).map((score) => [score.gameNumber, score]));
}

/**
 * Final standings from the stored schedule and saved scores, ranked by total
 * points, then name. Scores are keyed by game number; the schedule itself
 * never carries them.
 */
export function calculateFinalResults(tournament: CompletableTournament): PlayerStats[] {
  const scores = scoresByGame(tournament.finalScores);
  const stats = new Map<string, PlayerStats>();
  const statsFor = (player: string) => {
    if (!stats.has(player)) {
      stats.set(player, {
        player,
        matchesPlayed: 0,
        matchesWon: 0,
        setsWon: 0,
        setsLost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        winPercentage: 0,
        totalPoints: 0,
      });
    }
    return stats.get(player)!;
  };

  for (const round of tournament.schedule ?? []) {
    for (const match of round.matches) {
      const sides = [
        { players: match.team1, own: "team1Score", other: "team2Score" },
        { players: match.team2, own: "team2Score", other: "team1Score" },
      ] as const;
      for (const side of sides) side.players.forEach(statsFor);

      const score = scores.get(match.gameNumber);
      if (!score) continue;
      for (const side of sides) {
        const own = score[side.own];
        const other = score[side.other];
        for (const player of side.players) {
          const playerStats = statsFor(player);
          playerStats.matchesPlayed++;
          playerStats.pointsFor += own;
          playerStats.pointsAgainst += other;
          playerStats.totalPoints += own;
          if (own > other) {
            playerStats.matchesWon++;
            playerStats.setsWon++;
          } else {
            playerStats.setsLost++;
          }
        }
      }
    }
  }

  return [...stats.values()]
    .map((playerStats) => ({
      ...playerStats,
      winPercentage: playerStats.matchesPlayed > 0 ? (playerStats.matchesWon / playerStats.matchesPlayed) * 100 : 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.player.localeCompare(b.player));
}

/** The schedule with each match's saved score attached, for printing. */
export function scheduleWithScores(tournament: CompletableTournament): ScheduleRound[] {
  const scores = scoresByGame(tournament.finalScores);
  return (tournament.schedule ?? []).map((round) => ({
    ...round,
    matches: round.matches.map((match) => {
      const score = scores.get(match.gameNumber);
      return score
        ? { ...match, status: "completed", score: { team1Score: score.team1Score, team2Score: score.team2Score } }
        : match;
    }),
  }));
}
