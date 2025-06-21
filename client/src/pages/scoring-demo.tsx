import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnhancedScheduleDisplay } from "@/components/enhanced-schedule-display";
import { ArrowLeft, Users, Calendar, MapPin } from "lucide-react";
import type { Round, Match, MatchScore } from "@shared/schema";

export default function ScoringDemo() {
  // Demo tournament data with sample scores
  const [rounds, setRounds] = useState<Round[]>([
    {
      round: 1,
      matches: [
        {
          court: 1,
          team1: ["Alex Rodriguez", "Maria Santos"],
          team2: ["Carlos Mendez", "Ana Garcia"],
          round: 1,
          gameNumber: 1,
          score: {
            team1Score: 2,
            team2Score: 1,
            sets: [
              { team1: 6, team2: 4 },
              { team1: 4, team2: 6 },
              { team1: 6, team2: 3 }
            ]
          },
          status: 'completed' as const
        },
        {
          court: 2,
          team1: ["Diego Silva", "Elena Rodriguez"],
          team2: ["Miguel Torres", "Sofia Vargas"],
          round: 1,
          gameNumber: 2,
          score: {
            team1Score: 2,
            team2Score: 0,
            sets: [
              { team1: 6, team2: 3 },
              { team1: 6, team2: 4 }
            ]
          },
          status: 'completed' as const
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
          gameNumber: 3,
          score: {
            team1Score: 1,
            team2Score: 2,
            sets: [
              { team1: 6, team2: 4 },
              { team1: 3, team2: 6 },
              { team1: 4, team2: 6 }
            ]
          },
          status: 'completed' as const
        },
        {
          court: 2,
          team1: ["Ana Garcia", "Elena Rodriguez"],
          team2: ["Miguel Torres", "Sofia Vargas"],
          round: 2,
          gameNumber: 4,
          status: 'in_progress' as const
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
          gameNumber: 5,
          status: 'pending' as const
        },
        {
          court: 2,
          team1: ["Maria Santos", "Miguel Torres"],
          team2: ["Diego Silva", "Sofia Vargas"],
          round: 3,
          gameNumber: 6,
          status: 'pending' as const
        }
      ]
    }
  ]);

  const handleScoreUpdate = async (gameNumber: number, score: MatchScore) => {
    setRounds(prevRounds => 
      prevRounds.map(round => ({
        ...round,
        matches: round.matches.map(match => 
          match.gameNumber === gameNumber 
            ? { ...match, score, status: 'completed' as const }
            : match
        )
      }))
    );
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

        {/* Enhanced Schedule with Scoring */}
        <EnhancedScheduleDisplay
          rounds={rounds}
          tournamentName="Summer Championship 2024"
          onScoreUpdate={handleScoreUpdate}
        />

        {/* Instructions */}
        <Card className="mt-8 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-orange-900">How to Use the Scoring System</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-orange-800 space-y-2">
            <div><strong>1. Add Scores:</strong> Click "Add Score" on any match to open the scoring modal</div>
            <div><strong>2. Set-by-Set Entry:</strong> Input individual set scores (e.g., 6-4, 6-2) using the intuitive interface</div>
            <div><strong>3. View Leaderboard:</strong> Click "View Leaderboard" to see live player rankings and statistics</div>
            <div><strong>4. Track Progress:</strong> Monitor tournament completion with the visual progress bar</div>
            <div><strong>5. Edit Scores:</strong> Completed matches can be edited if needed by clicking "Edit Score"</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}