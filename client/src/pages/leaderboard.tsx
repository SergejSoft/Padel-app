import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, Trophy, Medal, Award, Crown, ArrowLeft, Download } from "lucide-react";
import { generateTournamentPDF } from "@/lib/pdf-generator";
import { Footer } from "@/components/footer";
import type { PlayerStats } from "@shared/schema";

interface LeaderboardData {
  tournamentId: number;
  tournamentName: string;
  tournamentDate: string;
  tournamentTime?: string;
  tournamentLocation: string;
  results: PlayerStats[];
  finalScores: any[];
  completedAt: string;
  status: string;
}

export default function Leaderboard() {
  const { leaderboardId } = useParams();

  const { data: leaderboardData, isLoading, error } = useQuery<LeaderboardData>({
    queryKey: ['/api/leaderboard', leaderboardId],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard/${leaderboardId}`);
      if (!response.ok) {
        throw new Error('Leaderboard not found');
      }
      return response.json();
    },
    enabled: !!leaderboardId,
  });

  const handleDownloadPDF = () => {
    if (!leaderboardData) return;
    
    const pdf = generateTournamentPDF({
      tournamentName: leaderboardData.tournamentName,
      tournamentDate: leaderboardData.tournamentDate,
      tournamentTime: leaderboardData.tournamentTime,
      tournamentLocation: leaderboardData.tournamentLocation,
      playersCount: leaderboardData.results.length,
      courtsCount: 2, // Assuming 2 courts for American format
      rounds: leaderboardData.finalScores || [],
    });

    pdf.save(`${leaderboardData.tournamentName.replace(/\s+/g, '_')}_final_results.pdf`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error || !leaderboardData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Leaderboard Not Found</h1>
          <p className="text-gray-600 mb-6">This leaderboard may have been removed or doesn't exist.</p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const sortedResults = [...leaderboardData.results].sort((a, b) => b.totalPoints - a.totalPoints);
  const bestFour = sortedResults.slice(0, 4);
  const worstFour = sortedResults.slice(4, 8);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      case 4: return <Award className="h-5 w-5 text-blue-500" />;
      default: return <span className="text-muted-foreground font-bold">#{rank}</span>;
    }
  };

  const PlayerCard = ({ player, rank, isTop }: { player: PlayerStats; rank: number; isTop: boolean }) => (
    <Card className={`${isTop ? 'border-green-200 bg-green-50/50' : 'border-orange-200 bg-orange-50/50'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getRankIcon(rank)}
            <div>
              <div className="font-semibold text-lg">{player.player}</div>
              <div className="text-sm text-muted-foreground">
                {player.matchesPlayed} matches • {player.matchesWon}W-{player.matchesPlayed - player.matchesWon}L
              </div>
              <div className="text-xs text-muted-foreground">
                {player.setsWon} sets won • {player.winPercentage.toFixed(1)}% win rate
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
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900">{leaderboardData.tournamentName}</h1>
            <Badge variant="default" className="bg-green-600">Final Results</Badge>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-gray-600 mb-4">
            {leaderboardData.tournamentDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(leaderboardData.tournamentDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  {leaderboardData.tournamentTime && ` at ${leaderboardData.tournamentTime}`}
                </span>
              </div>
            )}
            {leaderboardData.tournamentLocation && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{leaderboardData.tournamentLocation}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Completed on {new Date(leaderboardData.completedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Button onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download Results PDF
          </Button>
        </div>

        {/* Final Groups */}
        <div className="space-y-8">
          {/* Championship Finals */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="h-6 w-6 text-green-600" />
              <h2 className="text-2xl font-semibold text-green-900">Championship Finals</h2>
              <Badge variant="default" className="bg-green-600">Top 4 Players</Badge>
            </div>
            <div className="space-y-3">
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

          {/* Consolation Finals */}
          {worstFour.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Medal className="h-6 w-6 text-orange-600" />
                <h2 className="text-2xl font-semibold text-orange-900">Consolation Finals</h2>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">Bottom 4 Players</Badge>
              </div>
              <div className="space-y-3">
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
          )}
        </div>

        {/* Tournament Information */}
        <Card className="mt-8 bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Tournament Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <div><strong>Format:</strong> American Format Padel Tournament</div>
            <div><strong>Scoring System:</strong> 3 points for match win + 1 point per set won</div>
            <div><strong>Championship Finals:</strong> Top 4 players (ranked 1st-4th)</div>
            <div><strong>Consolation Finals:</strong> Bottom 4 players (ranked 5th-8th)</div>
          </CardContent>
        </Card>

        {/* Create Tournament CTA */}
        <div className="text-center mt-12 p-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Want to organize your own tournament?</h3>
          <p className="text-gray-600 mb-4">Create and manage American Format padel tournaments with ease</p>
          <Link href="/">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Create New Tournament
            </Button>
          </Link>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}