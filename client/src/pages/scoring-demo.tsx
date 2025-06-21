import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleScoreInput } from "@/components/simple-score-input";
import { FinalsLeaderboard } from "@/components/finals-leaderboard";
import { ArrowLeft, Users, Calendar, MapPin, Trophy } from "lucide-react";
import type { Round } from "@shared/schema";

export default function ScoringDemo() {
  const [gameScores, setGameScores] = useState<Record<number, { team1Score: number; team2Score: number }>>({
    1: { team1Score: 12, team2Score: 4 },
    2: { team1Score: 10, team2Score: 6 },
    3: { team1Score: 9, team2Score: 7 },
    4: { team1Score: 11, team2Score: 5 },
    5: { team1Score: 13, team2Score: 3 },
    6: { team1Score: 8, team2Score: 8 },
    7: { team1Score: 14, team2Score: 2 }
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Demo tournament data with sample scores
  const [rounds] = useState<Round[]>([
    {
      round: 1,
      matches: [
        {
          court: 1,
          team1: ["Alex Rodriguez", "Maria Santos"],
          team2: ["Carlos Mendez", "Ana Garcia"],
          round: 1,
          gameNumber: 1
        },
        {
          court: 2,
          team1: ["Diego Silva", "Elena Rodriguez"],
          team2: ["Miguel Torres", "Sofia Vargas"],
          round: 1,
          gameNumber: 2
        }
      ]
    },
    {
      round: 2,
      matches: [
        {
          court: 1,
          team1: ["Alex Rodriguez", "Carlos Mendez"],
          team2: ["Maria Santos", "Diego Silva"],
          round: 2,
          gameNumber: 3
        },
        {
          court: 2,
          team1: ["Ana Garcia", "Elena Rodriguez"],
          team2: ["Miguel Torres", "Sofia Vargas"],
          round: 2,
          gameNumber: 4
        }
      ]
    },
    {
      round: 3,
      matches: [
        {
          court: 1,
          team1: ["Alex Rodriguez", "Ana Garcia"],
          team2: ["Carlos Mendez", "Elena Rodriguez"],
          round: 3,
          gameNumber: 5
        },
        {
          court: 2,
          team1: ["Maria Santos", "Miguel Torres"],
          team2: ["Diego Silva", "Sofia Vargas"],
          round: 3,
          gameNumber: 6
        }
      ],
    },
    {
      round: 4,
      matches: [
        {
          court: 1,
          team1: ["Alex Rodriguez", "Miguel Torres"],
          team2: ["Carlos Mendez", "Sofia Vargas"],
          round: 4,
          gameNumber: 7
        }
      ]
    }
  ]);

  const players = ["Alex Rodriguez", "Maria Santos", "Carlos Mendez", "Ana Garcia", 
                  "Diego Silva", "Elena Rodriguez", "Miguel Torres", "Sofia Vargas"];

  // Calculate player scores for leaderboard
  const calculatePlayerScores = () => {
    const playerScores: Record<string, { totalPoints: number; gamesPlayed: number }> = {};
    
    // Initialize all players
    players.forEach(player => {
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
  };

  const handleScoreChange = (gameNumber: number, team1Score: number, team2Score: number) => {
    setGameScores(prev => ({
      ...prev,
      [gameNumber]: { team1Score, team2Score }
    }));
  };

  const allGamesHaveScores = () => {
    const totalMatches = rounds.reduce((sum, round) => sum + round.matches.length, 0);
    return Object.keys(gameScores).length === totalMatches;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">P</span>
              </div>
              <h1 className="text-xl font-semibold text-foreground">Scoring Demo</h1>
            </div>
            <Badge variant="default">Live Tournament</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tournament Info Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">Summer Championship 2024</CardTitle>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    June 21, 2025
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Central Padel Club
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    8 Players, 2 Courts
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                Active Tournament
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Live Score Tracking</h3>
              <p className="text-sm text-blue-700">
                Click "Add Score" on any match to input set-by-set results with an intuitive interface.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-900 mb-2">Real-time Leaderboard</h3>
              <p className="text-sm text-green-700">
                Automatic ranking calculation based on matches won, sets won, and tournament points.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-purple-900 mb-2">Tournament Progress</h3>
              <p className="text-sm text-purple-700">
                Visual progress tracking shows completion status across all rounds and matches.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Button */}
        {allGamesHaveScores() && (
          <div className="text-center mb-6">
            <Button 
              onClick={() => setShowLeaderboard(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold"
            >
              <Trophy className="h-5 w-5 mr-2" />
              View Leaderboard
            </Button>
          </div>
        )}

        {/* Tournament Schedule with Scoring */}
        <Card>
          <CardHeader>
            <CardTitle>Tournament Schedule with Live Scoring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {rounds.map((round) => (
                <div key={round.round} className="border-l-2 border-gray-200 pl-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Round {round.round}</h3>
                  <div className="grid gap-3">
                    {round.matches.map((match, matchIndex) => (
                      <div key={matchIndex} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="bg-white rounded-full px-3 py-1 text-sm font-medium text-gray-700">
                              Court {match.court}
                            </div>
                            <div className="text-gray-900 flex-1">
                              <span className="font-medium">{match.team1[0]} & {match.team1[1]}</span>
                              <span className="mx-2 text-gray-500">vs</span>
                              <span className="font-medium">{match.team2[0]} & {match.team2[1]}</span>
                            </div>
                          </div>
                          <SimpleScoreInput
                            team1={match.team1}
                            team2={match.team2}
                            team1Score={gameScores[match.gameNumber]?.team1Score || 0}
                            team2Score={gameScores[match.gameNumber]?.team2Score || 0}
                            onScoreChange={(team1Score, team2Score) => 
                              handleScoreChange(match.gameNumber, team1Score, team2Score)
                            }
                            gameNumber={match.gameNumber}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <FinalsLeaderboard
          isOpen={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
          playerScores={calculatePlayerScores()}
          tournamentName="Summer Championship 2024"
        />

        {/* Instructions */}
        <Card className="mt-8 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-orange-900">How to Use the Scoring System</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-orange-800 space-y-2">
            <div><strong>1. Enter Scores:</strong> Input scores for each team using two number inputs - one per pair</div>
            <div><strong>2. Validation:</strong> The sum of both scores must equal 16 (validated automatically)</div>
            <div><strong>3. Live Updates:</strong> Player scores are calculated automatically as you enter game results</div>
            <div><strong>4. View Leaderboard:</strong> Once all 7 games have valid scores, click "View Leaderboard"</div>
            <div><strong>5. Finals Groups:</strong> The leaderboard separates the best 4 and worst 4 players for finals competition</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}