import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Target } from "lucide-react";

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
  onSaveResults?: () => void;
  canSaveResults?: boolean;
}

export function FinalsLeaderboard({ 
  isOpen, 
  onClose, 
  playerScores, 
  tournamentName, 
  onSaveResults,
  canSaveResults = false 
}: FinalsLeaderboardProps) {
  // Sort players by total points (descending)
  const sortedPlayers = [...playerScores].sort((a, b) => b.totalPoints - a.totalPoints);
  
  const bestFour = sortedPlayers.slice(0, 4);
  const worstFour = sortedPlayers.slice(4, 8);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      case 4: return <Award className="h-5 w-5 text-blue-500" />;
      default: return <span className="text-muted-foreground font-bold">#{rank}</span>;
    }
  };

  const PlayerCard = ({ player, rank, isTop }: { player: PlayerScore; rank: number; isTop: boolean }) => (
    <Card className={`${isTop ? 'border-green-200 bg-green-50/50' : 'border-orange-200 bg-orange-50/50'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getRankIcon(rank)}
            <div>
              <div className="font-semibold">{player.player}</div>
              <div className="text-sm text-muted-foreground">
                {player.gamesPlayed} games • Avg: {player.averageScore.toFixed(1)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{player.totalPoints}</div>
            <div className="text-xs text-muted-foreground">total points</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {tournamentName} - Finals Groups
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Best 4 Players */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">Championship Finals</h3>
              <Badge variant="default" className="bg-green-600">Top 4 Players</Badge>
            </div>
            <div className="space-y-2">
              {bestFour.map((player, index) => (
                <PlayerCard 
                  key={player.player} 
                  player={player} 
                  rank={index + 1} 
                  isTop={true}
                />
              ))}
            </div>
          </div>

          {/* Worst 4 Players */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Medal className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-orange-900">Consolation Finals</h3>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">Bottom 4 Players</Badge>
            </div>
            <div className="space-y-2">
              {worstFour.map((player, index) => (
                <PlayerCard 
                  key={player.player} 
                  player={player} 
                  rank={index + 5} 
                  isTop={false}
                />
              ))}
            </div>
          </div>

          {/* Finals Instructions */}
          <Card className="bg-blue-50/50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900 text-base">Finals Format</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800 space-y-2">
              <div><strong>Championship Finals:</strong> Top 4 players compete for 1st, 2nd, 3rd, and 4th place</div>
              <div><strong>Consolation Finals:</strong> Bottom 4 players compete for 5th, 6th, 7th, and 8th place</div>
              <div className="pt-2 text-xs">
                <strong>Scoring:</strong> Players are ranked by total points accumulated across all 7 games
              </div>
            </CardContent>
          </Card>

          {/* Save Results Button */}
          {canSaveResults && onSaveResults && (
            <div className="flex flex-col items-center gap-4 pt-4">
              <Button 
                onClick={onSaveResults}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Save Tournament Results
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Saving results will create a permanent leaderboard link that can be shared with players
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}