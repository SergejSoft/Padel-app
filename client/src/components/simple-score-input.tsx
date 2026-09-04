import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { complementScore, validateMatchScore } from "@shared/validation-utils";
import { TOURNAMENT_CONFIG } from "@shared/tournament-config";
import { apiRequest } from "@/lib/queryClient";

interface SimpleScoreInputProps {
  team1: [string, string];
  team2: [string, string];
  team1Score: number;
  team2Score: number;
  onScoreChange: (team1Score: number, team2Score: number) => void;
  gameNumber: number;
  tournamentId?: number;
  pointsPerMatch?: number;
  readOnly?: boolean;
}

export function SimpleScoreInput({ 
  team1, 
  team2, 
  team1Score, 
  team2Score, 
  onScoreChange,
  gameNumber,
  tournamentId,
  pointsPerMatch = TOURNAMENT_CONFIG.DEFAULT_POINTS_PER_MATCH,
  readOnly = false
}: SimpleScoreInputProps) {
  const hasInitialScore = team1Score + team2Score === pointsPerMatch;
  const [team1Input, setTeam1Input] = useState(
    hasInitialScore ? team1Score.toString() : "",
  );
  const [team2Input, setTeam2Input] = useState(
    hasInitialScore ? team2Score.toString() : "",
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveScoreMutation = useMutation({
    mutationFn: async ({ gameNumber, team1Score, team2Score }: { gameNumber: number; team1Score: number; team2Score: number }) => {
      const response = await apiRequest('PUT', `/api/tournaments/${tournamentId}/scores`, {
        gameNumber,
        team1Score,
        team2Score,
      });

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Score Saved",
        description: "Game score has been saved successfully.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/shared'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const hasSavedScore = team1Score + team2Score === pointsPerMatch;
    setTeam1Input(hasSavedScore ? team1Score.toString() : "");
    setTeam2Input(hasSavedScore ? team2Score.toString() : "");
  }, [team1Score, team2Score, pointsPerMatch]);

  const handleTeam1Change = (value: string) => {
    setTeam1Input(value);
    const complement = complementScore(value, pointsPerMatch);
    if (complement === null) return;

    setTeam2Input(complement.toString());
    onScoreChange(Number(value), complement);
  };

  const handleTeam2Change = (value: string) => {
    setTeam2Input(value);
    const complement = complementScore(value, pointsPerMatch);
    if (complement === null) return;

    setTeam1Input(complement.toString());
    onScoreChange(complement, Number(value));
  };

  const parsedTeam1 = team1Input === "" ? Number.NaN : Number(team1Input);
  const parsedTeam2 = team2Input === "" ? Number.NaN : Number(team2Input);
  const scoreValidation = validateMatchScore(
    parsedTeam1,
    parsedTeam2,
    pointsPerMatch,
  );
  const isValid = scoreValidation.isValid;

  const handleSave = () => {
    if (!isValid || !tournamentId) return;

    saveScoreMutation.mutate({
      gameNumber,
      team1Score: parsedTeam1,
      team2Score: parsedTeam2,
    });
  };

  const currentSum =
    (Number.isFinite(parsedTeam1) ? parsedTeam1 : 0)
    + (Number.isFinite(parsedTeam2) ? parsedTeam2 : 0);

  return (
    <div className="flex items-center gap-2 min-w-[120px] md:min-w-[148px]">
      {/* Team 1 Score */}
      <Input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max={pointsPerMatch}
        value={team1Input}
        onChange={(e) => handleTeam1Change(e.target.value)}
        aria-label={`${team1.join(" and ")} score`}
        className={`w-12 md:w-14 h-11 text-center text-base font-medium ${!isValid ? 'border-red-500' : ''} touch-manipulation [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        placeholder=""
      />
      
      {/* Separator */}
      <span className="text-muted-foreground text-xs sm:text-sm">-</span>
      
      {/* Team 2 Score */}
      <Input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max={pointsPerMatch}
        value={team2Input}
        onChange={(e) => handleTeam2Change(e.target.value)}
        aria-label={`${team2.join(" and ")} score`}
        className={`w-12 md:w-14 h-11 text-center text-base font-medium ${!isValid ? 'border-red-500' : ''} touch-manipulation [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        placeholder=""
      />

      {/* Validation Indicator */}
      <div className="flex items-center ml-0.5 sm:ml-1">
        {currentSum === pointsPerMatch && isValid ? (
          <div className="text-green-600 text-xs">✓</div>
        ) : (
          <div className="text-red-500 text-xs">{currentSum}/{pointsPerMatch}</div>
        )}
      </div>

      {/* Save Button (only for organizers) */}
      {!readOnly && tournamentId && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!isValid || saveScoreMutation.isPending}
          className="ml-2 h-11 w-11 p-0 flex items-center justify-center"
        >
          <Save className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}