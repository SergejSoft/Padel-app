import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, Users, Target, Ban, Home } from "lucide-react";
import { generateAmericanFormat } from "@/lib/american-format";
import { Footer } from "@/components/footer";
import type { Tournament } from "@shared/schema";
import { useMemo } from "react";

export default function SharedTournament() {
  const { shareId } = useParams();

  console.log('Component render - shareId:', shareId);

  const { data: tournament, isLoading, error } = useQuery({
    queryKey: ['/api/shared', shareId],
    queryFn: async () => {
      const response = await fetch(`/api/shared/${shareId}`);
      if (!response.ok) {
        throw new Error('Tournament not found');
      }
      const data = await response.json();
      console.log('Tournament data:', data);
      return data;
    },
    enabled: !!shareId,
  });

  const schedule = useMemo(() => {
    if (!tournament?.players) return [];
    return generateAmericanFormat({
      players: tournament.players,
      courts: tournament.courtsCount,
    });
  }, [tournament?.players, tournament?.courtsCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tournament Not Found</h1>
          <p className="text-gray-600 mb-6">This tournament link is invalid or has been removed.</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getTournamentStatus = (tournament: Tournament) => {
    if (tournament.status === 'cancelled') return 'cancelled';
    if (tournament.date && new Date(tournament.date) < new Date()) return 'past';
    return 'active';
  };

  const status = getTournamentStatus(tournament);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Status Alert for Cancelled Tournaments */}
        {status === 'cancelled' && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <Ban className="h-4 w-4" />
            <AlertDescription>
              <strong>Tournament Cancelled:</strong> This tournament has been cancelled and is no longer active.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Target className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{tournament.name}</h1>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-gray-600 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{tournament.date}</span>
              {tournament.time && <span>at {tournament.time}</span>}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{tournament.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{tournament.playersCount} players</span>
            </div>
          </div>
        </div>

        {/* Tournament Schedule */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tournament Schedule</h2>
          
          {schedule.map((round, roundIndex) => (
            <Card key={roundIndex} className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Round {round.round}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {round.matches.map((match, matchIndex) => (
                    <div key={matchIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">Court {match.court}</span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm font-medium text-gray-500">Game {match.gameNumber}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {match.team1.join(' & ')}
                          </div>
                        </div>
                        <span className="text-gray-400 font-medium">vs</span>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            {match.team2.join(' & ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-center">
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}