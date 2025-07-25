import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, Users, Target, Clock, Ban, Download, Eye, Trophy, Home, LayoutDashboard } from "lucide-react";
import { generateAmericanFormat } from "@/lib/american-format";
import { generateTournamentPDF } from "@/lib/pdf-generator";
import { PDFPreviewModal } from "@/components/pdf-preview-modal";
import { SimpleScoreInput } from "@/components/simple-score-input";
import { FinalsLeaderboard } from "@/components/finals-leaderboard";
import { Footer } from "@/components/footer";
import type { Tournament } from "@shared/schema";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function SharedTournament() {
  const { shareId } = useParams();
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [gameScores, setGameScores] = useState<Record<number, { team1Score: number; team2Score: number }>>({});
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { user } = useAuth();

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

  // Check if tournament is in registration mode
  const isRegistrationMode = tournament.tournamentMode === 'registration' && (!tournament.schedule || tournament.schedule.length === 0);

  // Only generate schedule if not in registration mode and has enough players
  const schedule = !isRegistrationMode && tournament.players && tournament.players.length >= 4 
    ? generateAmericanFormat({
        players: tournament.players,
        courts: tournament.courtsCount,
      })
    : [];

  const totalGames = schedule.length > 0 ? schedule.reduce((sum, round) => sum + round.matches.length, 0) : 0;
  const gamesPerPlayer = tournament.playersCount > 0 ? Math.floor(totalGames * 4 / tournament.playersCount) : 0;
  const avgGameMinutes = 13; // Average game length

  // Calculate player scores for leaderboard
  const calculatePlayerScores = () => {
    const playerScores: Record<string, { totalPoints: number; gamesPlayed: number }> = {};
    
    // Initialize all players
    tournament.players.forEach((player: string) => {
      playerScores[player] = { totalPoints: 0, gamesPlayed: 0 };
    });

    // Calculate scores from games
    schedule.forEach(round => {
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

  // Check if current user can edit scores (is organizer or admin)
  const canEditScores = () => {
    if (!user || !tournament) return false;
    return user.role === 'admin' || user.id === tournament.organizerId;
  };

  const handleScoreChange = (gameNumber: number, team1Score: number, team2Score: number) => {
    if (!canEditScores()) return; // Prevent score changes for non-organizers
    setGameScores(prev => ({
      ...prev,
      [gameNumber]: { team1Score, team2Score }
    }));
  };

  const allGamesHaveScores = () => {
    const totalMatches = schedule.reduce((sum, round) => sum + round.matches.length, 0);
    return Object.keys(gameScores).length === totalMatches;
  };

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
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>{tournament.courtsCount} Courts</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>~{avgGameMinutes} min/game</span>
            </div>
          </div>
        </div>

        {/* Tournament Stats */}
        {isRegistrationMode ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{tournament.registeredParticipants?.length || 0}</div>
                  <div className="text-sm text-gray-600">Registered</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{tournament.playersCount}</div>
                  <div className="text-sm text-gray-600">Max Players</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {tournament.registrationStatus === 'open' ? 'Open' : 
                     tournament.registrationStatus === 'full' ? 'Full' : 'Closed'}
                  </div>
                  <div className="text-sm text-gray-600">Registration</div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        )}

        {/* Leaderboard Button - only show if user can edit scores and all games have scores */}
        {canEditScores() && allGamesHaveScores() && (
          <div className="text-center mb-6">
            <Button 
              onClick={() => setShowLeaderboard(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg font-semibold w-full sm:w-auto"
            >
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              View Leaderboard
            </Button>
          </div>
        )}

        {/* Access Info Banner */}
        {!canEditScores() && (
          <div className="text-center mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <Eye className="h-4 w-4 inline mr-2" />
                You're viewing this tournament as a guest. Only the organizer can update scores.
              </p>
            </div>
          </div>
        )}

        {/* Registration Mode - Show Registered Participants */}
        {isRegistrationMode ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Registration Status</span>
                <Badge variant="outline" className="text-sm">
                  {tournament.registeredParticipants?.length || 0} / {tournament.playersCount} Registered
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription>
                    <p className="text-blue-800">
                      This tournament is accepting registrations. Once {tournament.playersCount} players have registered, 
                      the organizer will generate the tournament schedule.
                    </p>
                  </AlertDescription>
                </Alert>
                
                {tournament.registrationId && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-2">Share this registration link:</p>
                    <code className="bg-gray-100 px-3 py-1 rounded text-sm">
                      {window.location.origin}/register/{tournament.registrationId}
                    </code>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium">Registered Players:</h4>
                  {tournament.registeredParticipants && tournament.registeredParticipants.length > 0 ? (
                    <div className="space-y-2">
                      {tournament.registeredParticipants.map((participant: any, index: number) => (
                        <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 font-medium text-sm">{index + 1}</span>
                            </div>
                            <div>
                              <div className="font-medium">{participant.name}</div>
                              <div className="text-sm text-gray-500">
                                Registered {new Date(participant.registeredAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {participant.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No players registered yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Schedule */
          <Card>
            <CardHeader>
              <CardTitle>Tournament Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {schedule.map((round) => (
                <div key={round.round} className="border-l-2 border-gray-200 pl-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Round {round.round}</h3>
                  <div className="grid gap-3">
                    {round.matches.map((match, matchIndex) => (
                      <div key={matchIndex} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                            <div className="bg-white rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-700 flex-shrink-0">
                              Court {match.court}
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
                            {canEditScores() ? (
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
                            ) : (
                              <div className="bg-gray-100 rounded px-3 py-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <span>{gameScores[match.gameNumber]?.team1Score || 0}</span>
                                  <span>-</span>
                                  <span>{gameScores[match.gameNumber]?.team2Score || 0}</span>
                                </div>
                              </div>
                            )}
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
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          {!isRegistrationMode && (
            <>
              <Button 
                onClick={() => setShowPDFPreview(true)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview Schedule
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
            </>
          )}
          <Link href="/">
            <Button variant="outline" size="lg">
              Create New Tournament
            </Button>
          </Link>
        </div>
      </div>
      
      <Footer />
      
      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        tournamentName={tournament.name}
        tournamentDate={tournament.date}
        tournamentLocation={tournament.location}
        playersCount={tournament.playersCount}
        courtsCount={tournament.courtsCount}
        rounds={schedule}
        onDownload={() => {
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
      />

      <FinalsLeaderboard
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        playerScores={calculatePlayerScores()}
        tournamentName={tournament.name}
      />
    </div>
  );
}