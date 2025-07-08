import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, Users, Trophy, Ban, Eye, Download } from "lucide-react";
import { generateAmericanFormat } from "@/lib/american-format";
import { generateTournamentPDF } from "@/lib/pdf-generator";
import { Footer } from "@/components/footer";
import type { Tournament } from "@shared/schema";

export default function SharedTournamentMinimal() {
  const { shareId } = useParams();

  const { data: tournament, isLoading, error } = useQuery({
    queryKey: ['/api/shared', shareId],
    queryFn: async () => {
      const response = await fetch(`/api/shared/${shareId}`);
      if (!response.ok) {
        throw new Error('Tournament not found');
      }
      return response.json();
    },
    enabled: !!shareId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tournament Not Found</h1>
          <p className="text-gray-600 mb-6">The shared tournament link is invalid or has expired.</p>
          <Link href="/">
            <Button>Create New Tournament</Button>
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

  const schedule = generateAmericanFormat({
    players: tournament.players,
    courts: tournament.courtsCount,
  });

  const totalGames = schedule.reduce((sum, round) => sum + round.matches.length, 0);
  const gamesPerPlayer = Math.floor(totalGames * 4 / tournament.playersCount);
  const avgGameMinutes = 13;

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
            <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
            {status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
            {status === 'past' && <Badge variant="secondary">Past</Badge>}
            {status === 'active' && <Badge variant="default">Active</Badge>}
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-gray-600">
            {tournament.date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(tournament.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  {tournament.time && ` at ${tournament.time}`}
                </span>
              </div>
            )}
            {tournament.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{tournament.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{tournament.playersCount} Players</span>
            </div>
          </div>
        </div>

        {/* Tournament Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{schedule.length}</div>
                <div className="text-sm text-gray-600">Rounds</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{totalGames}</div>
                <div className="text-sm text-gray-600">Total Games</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{gamesPerPlayer}</div>
                <div className="text-sm text-gray-600">Games per Player</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Tournament Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {schedule.map((round) => (
                <div key={round.round} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">
                    Round {round.round}
                  </h3>
                  <div className="grid gap-3">
                    {round.matches.map((match) => (
                      <div key={match.gameNumber} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="flex-shrink-0 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                              {match.court}
                            </div>
                            <div className="text-gray-900 flex-1 min-w-0">
                              <div className="block sm:inline">
                                <span className="font-medium text-sm sm:text-base">{match.team1[0]} & {match.team1[1]}</span>
                                <span className="mx-1 sm:mx-2 text-gray-500 text-sm">vs</span>
                                <span className="font-medium text-sm sm:text-base">{match.team2[0]} & {match.team2[1]}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="bg-gray-100 rounded px-3 py-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <span>0</span>
                                <span>-</span>
                                <span>0</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button 
            onClick={() => window.open(`/shared/${shareId}/scores`, '_blank')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Trophy className="h-4 w-4" />
            Live Scores
          </Button>
          <Button 
            onClick={() => {
              const pdf = generateTournamentPDF({
                tournamentName: tournament.name,
                tournamentDate: tournament.date,
                tournamentLocation: tournament.location,
                playersCount: tournament.playersCount,
                courtsCount: tournament.courtsCount,
                rounds: schedule,
              });
              pdf.save(`${tournament.name.replace(/\s+/g, '_')}_schedule.pdf`);
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}