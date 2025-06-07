import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download, Eye } from "lucide-react";
import { generateAmericanFormat } from "@/lib/american-format";
import { generateTournamentPDF } from "@/lib/pdf-generator";
import { PDFPreviewModal } from "./pdf-preview-modal";
import { apiRequest } from "@/lib/queryClient";
import type { TournamentSetup, Round, InsertTournament } from "@shared/schema";

interface ScheduleDisplayProps {
  tournamentSetup: TournamentSetup;
  players: string[];
  onBack: () => void;
  onReset: () => void;
}

export function ScheduleDisplay({ tournamentSetup, players, onBack, onReset }: ScheduleDisplayProps) {
  const [schedule, setSchedule] = useState<Round[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  
  const queryClient = useQueryClient();

  const saveTournamentMutation = useMutation({
    mutationFn: async (tournamentData: InsertTournament) => {
      const response = await apiRequest("POST", "/api/tournaments", tournamentData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });

  useEffect(() => {
    const generateSchedule = async () => {
      setIsGenerating(true);
      setError(null);

      try {
        // Simulate processing time for better UX
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const generatedSchedule = generateAmericanFormat({
          players,
          courts: tournamentSetup.courtsCount,
        });

        setSchedule(generatedSchedule);

        // Save tournament to backend
        const tournamentData: InsertTournament = {
          name: tournamentSetup.name,
          playersCount: tournamentSetup.playersCount,
          courtsCount: tournamentSetup.courtsCount,
          players,
          schedule: generatedSchedule,
        };

        saveTournamentMutation.mutate(tournamentData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate schedule");
      } finally {
        setIsGenerating(false);
      }
    };

    generateSchedule();
  }, [tournamentSetup, players]);

  const handleDownloadPDF = () => {
    const pdf = generateTournamentPDF({
      tournamentName: tournamentSetup.name,
      playersCount: tournamentSetup.playersCount,
      courtsCount: tournamentSetup.courtsCount,
      rounds: schedule,
    });

    pdf.save(`${tournamentSetup.name.replace(/\s+/g, '_')}_schedule.pdf`);
  };

  const totalGames = schedule.reduce((sum, round) => sum + round.matches.length, 0);
  const gamesPerPlayer = Math.floor(totalGames * 4 / tournamentSetup.playersCount);
  const estimatedMinutes = totalGames * 30 + (schedule.length - 1) * 10;

  if (isGenerating) {
    return (
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Generate Schedule</h2>
          <p className="text-muted-foreground">Creating your American Format tournament schedule</p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-muted border border-border rounded-lg p-8 text-center">
            <div className="mb-6">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Calculating Optimal Schedule</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Balancing partnerships and matchups for fair play...
            </p>
            
            <div className="space-y-2 text-left">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                <span className="text-muted-foreground">Analyzing player combinations</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                <span className="text-muted-foreground">Optimizing court usage</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                <span className="text-muted-foreground">Finalizing round structure</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    );
  }

  if (error) {
    return (
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Schedule Generation Failed</h2>
          <p className="text-muted-foreground">There was an error generating the tournament schedule</p>
        </div>

        <div className="max-w-md mx-auto">
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <div className="flex space-x-4">
            <Button variant="outline" onClick={onBack} className="flex-1">
              Back to Players
            </Button>
            <Button onClick={onReset} className="flex-1">
              Start Over
            </Button>
          </div>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Tournament Schedule</h2>
        <p className="text-muted-foreground">
          American Format • {tournamentSetup.playersCount} Players • {tournamentSetup.courtsCount} Courts
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          Back to Players
        </Button>
        <div className="space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowPDFPreview(true)}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview PDF
          </Button>
          <Button onClick={handleDownloadPDF} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Schedule Display */}
      <div className="bg-muted rounded-xl p-6 mb-8">
        <div className="space-y-6">
          {schedule.map((round) => (
            <div key={round.round} className="tournament-card">
              <h3 className="text-lg font-semibold text-foreground mb-4">Round {round.round}</h3>
              <div className="grid gap-4">
                {round.matches.map((match) => (
                  <div key={match.gameNumber} className="match-card">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-foreground">Court {match.court}</span>
                      <span className="text-sm text-muted-foreground">Game {match.gameNumber}</span>
                    </div>
                    <div className="team-vs-team">
                      <div className="team-names">
                        <div className="font-medium text-foreground">{match.team1[0]}</div>
                        <div className="font-medium text-foreground">{match.team1[1]}</div>
                        <div className="text-xs text-muted-foreground mt-1">Team 1</div>
                      </div>
                      <div className="vs-divider">VS</div>
                      <div className="team-names">
                        <div className="font-medium text-foreground">{match.team2[0]}</div>
                        <div className="font-medium text-foreground">{match.team2[1]}</div>
                        <div className="text-xs text-muted-foreground mt-1">Team 2</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tournament Statistics */}
      <div className="bg-background border border-border rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Tournament Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{schedule.length}</div>
            <div className="text-sm text-muted-foreground">Rounds</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{totalGames}</div>
            <div className="text-sm text-muted-foreground">Total Games</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">~{gamesPerPlayer}</div>
            <div className="text-sm text-muted-foreground">Games per Player</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {Math.floor(estimatedMinutes / 60)}h {estimatedMinutes % 60}m
            </div>
            <div className="text-sm text-muted-foreground">Est. Duration</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button variant="outline" onClick={onReset}>
          Create New Tournament
        </Button>
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        tournamentName={tournamentSetup.name}
        playersCount={tournamentSetup.playersCount}
        courtsCount={tournamentSetup.courtsCount}
        rounds={schedule}
        onDownload={handleDownloadPDF}
      />
    </CardContent>
  );
}
