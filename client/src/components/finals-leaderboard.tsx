import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, Crown, Radio, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerScore {
  player: string;
  totalPoints: number;
  gamesPlayed: number;
  averageScore: number;
}

interface FinalsLeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  playerScores: PlayerScore[];
  tournamentName: string;
  /** Games with a saved score; used to label the standings as live or final. */
  gamesScored?: number;
  /** Total games in the schedule. */
  totalGames?: number;
  onSaveResults?: () => void;
  canSaveResults?: boolean;
}

const FINALISTS = 4;

/**
 * Ranks every player by accumulated team points. Ties share a rank, so two
 * players on 84 points are both 3rd and the next player is 5th.
 */
export function rankPlayers(playerScores: readonly PlayerScore[]): Array<PlayerScore & { rank: number }> {
  const sorted = [...playerScores].sort(
    (a, b) => b.totalPoints - a.totalPoints || a.player.localeCompare(b.player),
  );
  const ranked: Array<PlayerScore & { rank: number }> = [];
  sorted.forEach((player, index) => {
    const previous = ranked[index - 1];
    const rank = previous && previous.totalPoints === player.totalPoints ? previous.rank : index + 1;
    ranked.push({ ...player, rank });
  });
  return ranked;
}

export function FinalsLeaderboard({
  isOpen,
  onClose,
  playerScores,
  tournamentName,
  gamesScored,
  totalGames,
  onSaveResults,
  canSaveResults = false,
}: FinalsLeaderboardProps) {
  const ranked = rankPlayers(playerScores);
  const knowsProgress = typeof gamesScored === "number" && typeof totalGames === "number" && totalGames > 0;
  const isFinal = !knowsProgress || gamesScored >= totalGames;
  const hasConsolation = ranked.length >= FINALISTS * 2;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" aria-label="1st" />;
      case 2: return <Trophy className="h-5 w-5 text-gray-400" aria-label="2nd" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" aria-label="3rd" />;
      case 4: return <Award className="h-5 w-5 text-blue-500" aria-label="4th" />;
      default: return <span className="w-5 text-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const groupFor = (rank: number): "top" | "consolation" | "rest" => {
    if (!isFinal) return "rest";
    if (rank <= FINALISTS) return "top";
    if (hasConsolation && rank <= FINALISTS * 2) return "consolation";
    return "rest";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <Trophy className="h-5 w-5" />
            {tournamentName}
            {knowsProgress && (
              isFinal ? (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Final standings
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  <Radio className="mr-1 h-3 w-3" />
                  Live · {gamesScored}/{totalGames} games scored
                </Badge>
              )
            )}
          </DialogTitle>
          <DialogDescription>
            {isFinal
              ? "Players ranked by total points collected with their teams across the tournament."
              : "Standings update as scores are saved. Players who have played fewer games so far may still catch up."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ol className="space-y-2" aria-label="Standings">
            {ranked.map((player) => {
              const group = groupFor(player.rank);
              return (
                <li key={player.player}>
                  <Card
                    className={cn(
                      group === "top" && "border-green-200 bg-green-50/50",
                      group === "consolation" && "border-orange-200 bg-orange-50/50",
                    )}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex w-5 shrink-0 justify-center">{getRankIcon(player.rank)}</div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{player.player}</div>
                            <div className="text-sm text-muted-foreground">
                              {player.gamesPlayed} {player.gamesPlayed === 1 ? "game" : "games"} · avg {player.averageScore.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-2xl font-bold tabular-nums text-primary">{player.totalPoints}</div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>

          {isFinal && ranked.length >= FINALISTS && (
            <Card className="bg-blue-50/50 border-blue-200">
              <CardContent className="space-y-1 p-4 text-sm text-blue-800">
                <div>
                  <strong className="text-green-800">Championship finals:</strong> top {FINALISTS} players
                  (highlighted green) play for 1st to 4th place.
                </div>
                {hasConsolation && (
                  <div>
                    <strong className="text-orange-800">Consolation finals:</strong> players ranked
                    {" "}{FINALISTS + 1} to {FINALISTS * 2} (highlighted orange) play for 5th to 8th place.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {canSaveResults && onSaveResults && (
            <div className="flex flex-col items-center gap-4 pt-2">
              <Button
                onClick={onSaveResults}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Save Tournament Results & Mark Complete
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                This will mark the tournament as completed and create a permanent leaderboard link
              </p>
            </div>
          )}

          <div className="flex justify-center border-t pt-4">
            <Button variant="outline" onClick={onClose} className="px-6">
              Back to Tournament
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
