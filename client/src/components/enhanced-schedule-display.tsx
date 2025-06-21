import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Trophy, 
  Plus, 
  Clock, 
  CheckCircle, 
  PlayCircle, 
  BarChart3,
  Target,
  Medal
} from "lucide-react";
import { ScoreInputModal } from "./score-input-modal";
import { LeaderboardModal } from "./leaderboard-modal";
import type { Round, Match, PlayerStats, MatchScore } from "@shared/schema";

interface EnhancedScheduleDisplayProps {
  rounds: Round[];
  tournamentName: string;
  onScoreUpdate: (gameNumber: number, score: MatchScore) => void;
}

export function EnhancedScheduleDisplay({ 
  rounds, 
  tournamentName, 
  onScoreUpdate 
}: EnhancedScheduleDisplayProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const handleScoreClick = (match: Match) => {
    setSelectedMatch(match);
    setShowScoreModal(true);
  };

  const handleScoreSave = async (gameNumber: number, score: MatchScore) => {
    await onScoreUpdate(gameNumber, score);
    setShowScoreModal(false);
  };

  const calculatePlayerStats = (): PlayerStats[] => {
    const statsMap = new Map<string, PlayerStats>();
    
    // Initialize all players
    rounds.forEach(round => {
      round.matches.forEach(match => {
        [match.team1[0], match.team1[1], match.team2[0], match.team2[1]].forEach(player => {
          if (!statsMap.has(player)) {
            statsMap.set(player, {
              player,
              matchesPlayed: 0,
              matchesWon: 0,
              setsWon: 0,
              setsLost: 0,
              pointsFor: 0,
              pointsAgainst: 0,
              winPercentage: 0,
              totalPoints: 0
            });
          }
        });
      });
    });

    // Calculate stats from completed matches
    rounds.forEach(round => {
      round.matches.forEach(match => {
        if (match.score && match.status === 'completed') {
          const team1Players = [match.team1[0], match.team1[1]];
          const team2Players = [match.team2[0], match.team2[1]];
          
          const team1Won = match.score.team1Score > match.score.team2Score;
          
          // Update match stats
          team1Players.forEach(player => {
            const stats = statsMap.get(player)!;
            stats.matchesPlayed++;
            if (team1Won) stats.matchesWon++;
            stats.setsWon += match.score!.team1Score;
            stats.setsLost += match.score!.team2Score;
          });
          
          team2Players.forEach(player => {
            const stats = statsMap.get(player)!;
            stats.matchesPlayed++;
            if (!team1Won) stats.matchesWon++;
            stats.setsWon += match.score!.team2Score;
            stats.setsLost += match.score!.team1Score;
          });

          // Add points from individual sets
          if (match.score.sets) {
            match.score.sets.forEach(set => {
              team1Players.forEach(player => {
                const stats = statsMap.get(player)!;
                stats.pointsFor += set.team1;
                stats.pointsAgainst += set.team2;
              });
              
              team2Players.forEach(player => {
                const stats = statsMap.get(player)!;
                stats.pointsFor += set.team2;
                stats.pointsAgainst += set.team1;
              });
            });
          }
        }
      });
    });

    // Calculate derived stats
    statsMap.forEach(stats => {
      stats.winPercentage = stats.matchesPlayed > 0 
        ? (stats.matchesWon / stats.matchesPlayed) * 100 
        : 0;
      
      // Tournament points: 3 for match win + 1 for each set won
      stats.totalPoints = (stats.matchesWon * 3) + stats.setsWon;
    });

    return Array.from(statsMap.values());
  };

  const getMatchStatusIcon = (match: Match) => {
    switch (match.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMatchStatusBadge = (match: Match) => {
    switch (match.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const completedMatches = rounds.reduce((total, round) => 
    total + round.matches.filter(match => match.status === 'completed').length, 0
  );
  
  const totalMatches = rounds.reduce((total, round) => total + round.matches.length, 0);
  const progressPercentage = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Tournament Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {tournamentName} - Live Scoring
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track scores and view live leaderboard
              </p>
            </div>
            <Button 
              onClick={() => setShowLeaderboard(true)}
              variant="default"
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              View Leaderboard
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tournament Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedMatches} of {totalMatches} matches completed
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rounds Display */}
      <div className="space-y-4">
        {rounds.map((round) => (
          <Card key={round.round}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Round {round.round}</span>
                <Badge variant="outline">
                  {round.matches.filter(m => m.status === 'completed').length}/{round.matches.length} completed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {round.matches.map((match, matchIndex) => (
                <div key={match.gameNumber}>
                  <Card className="border-l-4 border-l-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Court {match.court}</Badge>
                          <Badge variant="secondary">Game #{match.gameNumber}</Badge>
                          {getMatchStatusIcon(match)}
                        </div>
                        {getMatchStatusBadge(match)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Team 1 */}
                        <div className="text-center">
                          <div className="font-semibold mb-1">
                            {match.team1[0]} & {match.team1[1]}
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {match.score?.team1Score ?? '-'}
                          </div>
                          {match.score?.sets && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {match.score.sets.map((set, i) => `${set.team1}`).join(' | ')}
                            </div>
                          )}
                        </div>

                        {/* VS & Actions */}
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <span className="text-muted-foreground font-semibold">VS</span>
                          <Button 
                            onClick={() => handleScoreClick(match)}
                            variant={match.status === 'completed' ? "outline" : "default"}
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            {match.status === 'completed' ? (
                              <>
                                <Target className="h-3 w-3" />
                                Edit Score
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3" />
                                Add Score
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Team 2 */}
                        <div className="text-center">
                          <div className="font-semibold mb-1">
                            {match.team2[0]} & {match.team2[1]}
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {match.score?.team2Score ?? '-'}
                          </div>
                          {match.score?.sets && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {match.score.sets.map((set, i) => `${set.team2}`).join(' | ')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Winner Display */}
                      {match.score && match.status === 'completed' && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-center">
                            <Badge variant="default" className="bg-green-500">
                              <Medal className="h-3 w-3 mr-1" />
                              Winner: {match.score.team1Score > match.score.team2Score 
                                ? `${match.team1[0]} & ${match.team1[1]}`
                                : `${match.team2[0]} & ${match.team2[1]}`
                              }
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {matchIndex < round.matches.length - 1 && <Separator className="my-3" />}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Score Input Modal */}
      <ScoreInputModal
        match={selectedMatch}
        isOpen={showScoreModal}
        onClose={() => setShowScoreModal(false)}
        onSave={handleScoreSave}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        playerStats={calculatePlayerStats()}
        tournamentName={tournamentName}
      />
    </div>
  );
}