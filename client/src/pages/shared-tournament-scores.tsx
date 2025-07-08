import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Calendar, MapPin, Users, Clock, ArrowLeft } from "lucide-react";
import { SimpleScoreInput } from "@/components/simple-score-input";
import { FinalsLeaderboard } from "@/components/finals-leaderboard";
import { type Tournament, type Match, type Round, type PlayerStats } from "@shared/schema";

export default function SharedTournamentScores() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const shareId = params.shareId as string;

  const { data: tournament, isLoading, error } = useQuery<Tournament>({
    queryKey: ['/api/shared', shareId, 'scores'],
    queryFn: async () => {
      const response = await fetch(`/api/shared/${shareId}/scores`);
      if (!response.ok) {
        throw new Error('Failed to fetch tournament scores');
      }
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getMatchScore = (match: Match) => {
    const finalScores = tournament?.finalScores || [];
    const scoreEntry = finalScores.find((s: any) => s.gameNumber === match.gameNumber);
    return scoreEntry ? { team1Score: scoreEntry.team1Score, team2Score: scoreEntry.team2Score } : null;
  };

  const getMatchStatusIcon = (match: Match) => {
    const score = getMatchScore(match);
    if (!score) return <div className="w-3 h-3 bg-gray-300 rounded-full" />;
    
    if (score.team1Score > score.team2Score) {
      return <div className="w-3 h-3 bg-green-500 rounded-full" />;
    } else if (score.team2Score > score.team1Score) {
      return <div className="w-3 h-3 bg-blue-500 rounded-full" />;
    } else {
      return <div className="w-3 h-3 bg-yellow-500 rounded-full" />;
    }
  };

  const getMatchStatusBadge = (match: Match) => {
    const score = getMatchScore(match);
    if (!score) return <Badge variant="secondary">Pending</Badge>;
    
    return <Badge variant="outline">{score.team1Score} - {score.team2Score}</Badge>;
  };

  const calculatePlayerStats = (): PlayerStats[] => {
    if (!tournament?.schedule || !tournament?.finalScores) return [];
    
    const playerStats: { [key: string]: PlayerStats } = {};
    const rounds = tournament.schedule as Round[];
    const finalScores = tournament.finalScores as any[];
    
    // Initialize player stats
    const allPlayers = Array.from(new Set(
      rounds.flatMap(round => 
        round.matches.flatMap(match => [...match.team1, ...match.team2])
      )
    ));
    
    allPlayers.forEach(player => {
      playerStats[player] = {
        player,
        matchesPlayed: 0,
        matchesWon: 0,
        setsWon: 0,
        setsLost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        winPercentage: 0,
        totalPoints: 0
      };
    });
    
    // Process each match with scores
    rounds.forEach(round => {
      round.matches.forEach(match => {
        const scoreEntry = finalScores.find(s => s.gameNumber === match.gameNumber);
        if (scoreEntry) {
          const { team1Score, team2Score } = scoreEntry;
          
          // Update stats for team1 players
          match.team1.forEach(player => {
            playerStats[player].matchesPlayed++;
            playerStats[player].pointsFor += team1Score;
            playerStats[player].pointsAgainst += team2Score;
            
            if (team1Score > team2Score) {
              playerStats[player].matchesWon++;
              playerStats[player].setsWon++;
            } else {
              playerStats[player].setsLost++;
            }
          });
          
          // Update stats for team2 players
          match.team2.forEach(player => {
            playerStats[player].matchesPlayed++;
            playerStats[player].pointsFor += team2Score;
            playerStats[player].pointsAgainst += team1Score;
            
            if (team2Score > team1Score) {
              playerStats[player].matchesWon++;
              playerStats[player].setsWon++;
            } else {
              playerStats[player].setsLost++;
            }
          });
        }
      });
    });
    
    // Calculate win percentage and total points
    Object.values(playerStats).forEach(stats => {
      stats.winPercentage = stats.matchesPlayed > 0 ? (stats.matchesWon / stats.matchesPlayed) * 100 : 0;
      stats.totalPoints = stats.pointsFor;
    });
    
    return Object.values(playerStats).sort((a, b) => b.totalPoints - a.totalPoints);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading tournament scores...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading tournament scores. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Tournament not found.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const playerStats = calculatePlayerStats();
  const rounds = tournament.schedule as Round[];

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/shared/${shareId}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tournament
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {tournament.name} - Live Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{formatDate(tournament.date)}</span>
            </div>
            {tournament.time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{formatTime(tournament.time)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{tournament.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{tournament.players?.length || 0} players</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setLeaderboardOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              View Leaderboard
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {rounds.map((round, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">Round {round.round}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {round.matches.map((match, matchIndex) => (
                  <div
                    key={matchIndex}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {getMatchStatusIcon(match)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Court {match.court}</span>
                          <span className="text-sm text-gray-500">Game {match.gameNumber}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="font-medium">{match.team1.join(" & ")}</span>
                          </div>
                          <span className="text-gray-400">vs</span>
                          <div className="text-sm">
                            <span className="font-medium">{match.team2.join(" & ")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getMatchStatusBadge(match)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FinalsLeaderboard
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        playerScores={playerStats.map(stat => ({
          player: stat.player,
          totalPoints: stat.totalPoints,
          gamesPlayed: stat.matchesPlayed,
          averageScore: stat.matchesPlayed > 0 ? stat.totalPoints / stat.matchesPlayed : 0
        }))}
        tournamentName={tournament.name}
      />
    </div>
  );
}