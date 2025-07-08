import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, MapPin, ArrowLeft } from "lucide-react";
import { Footer } from "@/components/footer";

interface PlayerScore {
  player: string;
  totalPoints: number;
  gamesPlayed: number;
  averageScore: number;
}

export default function SharedLeaderboard() {
  const { shareId } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/shared', shareId, 'scores'],
    queryFn: async () => {
      const response = await fetch(`/api/shared/${shareId}/scores`);
      if (!response.ok) {
        throw new Error('Leaderboard not found');
      }
      return response.json();
    },
    enabled: !!shareId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Leaderboard Not Found</h1>
          <p className="text-gray-600 mb-6">
            This tournament's results are not available yet or the link is invalid.
          </p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { tournament, finalScores, results } = data;
  
  // Use results if available, otherwise calculate from finalScores
  const playerScores: PlayerScore[] = results || finalScores || [];

  const sortedPlayers = [...playerScores].sort((a, b) => b.totalPoints - a.totalPoints);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Trophy className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Trophy className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getPlayerCardStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300";
      case 2:
        return "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300";
      case 3:
        return "bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300";
      default:
        return "bg-white border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {tournament.name} - Final Results
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-gray-600 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{tournament.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{tournament.location}</span>
            </div>
          </div>

          <Link href={`/shared/${shareId}`}>
            <Button variant="outline" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              View Tournament Schedule
            </Button>
          </Link>
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              <Trophy className="h-6 w-6 inline mr-2" />
              Final Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedPlayers.map((player, index) => {
                const rank = index + 1;
                return (
                  <div
                    key={player.player}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${getPlayerCardStyle(rank)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {getRankIcon(rank)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {player.player}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {player.gamesPlayed} games played
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {player.totalPoints}
                        </div>
                        <div className="text-sm text-gray-600">
                          {player.averageScore.toFixed(1)} avg
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Share Info */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Share this leaderboard: {window.location.href}
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}