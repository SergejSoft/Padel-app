import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Award, TrendingUp, Target } from "lucide-react";
import type { PlayerStats } from "@shared/schema";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerStats: PlayerStats[];
  tournamentName: string;
}

export function LeaderboardModal({ isOpen, onClose, playerStats, tournamentName }: LeaderboardModalProps) {
  const sortedPlayers = [...playerStats].sort((a, b) => {
    // Primary: Total points (descending)
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    
    // Secondary: Win percentage (descending)
    if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
    
    // Tertiary: Sets won (descending)
    return b.setsWon - a.setsWon;
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-muted-foreground font-bold">#{rank}</span>;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1: return "default";
      case 2: return "secondary";
      case 3: return "outline";
      default: return "outline";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {tournamentName} - Final Leaderboard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Podium Top 3 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {sortedPlayers.slice(0, 3).map((player, index) => (
              <Card key={player.player} className={`relative ${index === 0 ? 'ring-2 ring-yellow-500/50' : ''}`}>
                <CardContent className="p-4 text-center">
                  <div className="flex justify-center mb-2">
                    {getRankIcon(index + 1)}
                  </div>
                  <div className="font-semibold text-sm mb-1">{player.player}</div>
                  <div className="text-2xl font-bold text-primary mb-1">{player.totalPoints}</div>
                  <div className="text-xs text-muted-foreground">points</div>
                  <Badge variant={getRankBadgeVariant(index + 1)} className="mt-2">
                    {Math.round(player.winPercentage)}% wins
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Rankings */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Detailed Rankings
            </h3>
            
            {sortedPlayers.map((player, index) => (
              <Card key={player.player} className={`${index < 3 ? 'bg-muted/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 min-w-[60px]">
                        {getRankIcon(index + 1)}
                        <span className="font-semibold">{player.player}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-4 text-center flex-1 max-w-md">
                      <div>
                        <div className="text-lg font-bold text-primary">{player.totalPoints}</div>
                        <div className="text-xs text-muted-foreground">Points</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-semibold">{player.matchesWon}/{player.matchesPlayed}</div>
                        <div className="text-xs text-muted-foreground">Matches</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-semibold">{player.setsWon}/{player.setsWon + player.setsLost}</div>
                        <div className="text-xs text-muted-foreground">Sets</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-semibold">{Math.round(player.winPercentage)}%</div>
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-semibold">{player.pointsFor}/{player.pointsAgainst}</div>
                        <div className="text-xs text-muted-foreground">Points +/-</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Scoring System Info */}
          <Card className="bg-muted/20">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Scoring System
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>• <strong>3 points</strong> for winning a match</div>
                <div>• <strong>1 point</strong> for each set won</div>
                <div>• <strong>0 points</strong> for losing a match</div>
                <div className="pt-2 text-xs">
                  Rankings determined by: Total Points → Win Percentage → Sets Won
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}