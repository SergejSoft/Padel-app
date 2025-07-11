import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { validateMatchScore } from "@shared/validation-utils";
import { TOURNAMENT_CONFIG } from "@shared/tournament-config";

interface SimpleScoreInputProps {
  team1: [string, string];
  team2: [string, string];
  team1Score: number;
  team2Score: number;
  onScoreChange: (team1Score: number, team2Score: number) => void;
  gameNumber: number;
  tournamentId?: number;
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
  readOnly = false
}: SimpleScoreInputProps) {
  const [team1Input, setTeam1Input] = useState(team1Score === 0 ? "" : team1Score.toString());
  const [team2Input, setTeam2Input] = useState(team2Score === 0 ? "" : team2Score.toString());
  const [isValid, setIsValid] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveScoreMutation = useMutation({
    mutationFn: async ({ gameNumber, team1Score, team2Score }: { gameNumber: number; team1Score: number; team2Score: number }) => {
      const response = await fetch(`/api/tournaments/${tournamentId}/scores`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameNumber,
          team1Score,
          team2Score,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save score');
      }

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
    setTeam1Input(team1Score === 0 ? "" : team1Score.toString());
    setTeam2Input(team2Score === 0 ? "" : team2Score.toString());
  }, [team1Score, team2Score]);

  const validateAndUpdate = (newTeam1: string, newTeam2: string) => {
    const score1 = parseInt(newTeam1) || 0;
    const score2 = parseInt(newTeam2) || 0;
    
    // Use the comprehensive validation system
    const validation = validateMatchScore(score1, score2, TOURNAMENT_CONFIG.DEFAULT_POINTS_PER_MATCH);
    setIsValid(validation.isValid);
    
    if (validation.isValid) {
      onScoreChange(score1, score2);
    }
  };

  const handleTeam1Change = (value: string) => {
    setTeam1Input(value);
    validateAndUpdate(value, team2Input);
  };

  const handleTeam2Change = (value: string) => {
    setTeam2Input(value);
    validateAndUpdate(team1Input, value);
  };

  const handleSave = () => {
    if (isValid && tournamentId) {
      const t1Score = parseInt(team1Input) || 0;
      const t2Score = parseInt(team2Input) || 0;
      saveScoreMutation.mutate({ gameNumber, team1Score: t1Score, team2Score: t2Score });
    }
  };

  const currentSum = (parseInt(team1Input) || 0) + (parseInt(team2Input) || 0);

  return (
    <div className="flex items-center gap-1 sm:gap-2 min-w-[80px] sm:min-w-[100px]">
      {/* Team 1 Score */}
      <Input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="16"
        value={team1Input}
        onChange={(e) => handleTeam1Change(e.target.value)}
        className={`w-10 sm:w-12 h-7 sm:h-8 text-center text-xs sm:text-sm font-medium ${!isValid ? 'border-red-500' : ''} touch-manipulation [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
        max="16"
        value={team2Input}
        onChange={(e) => handleTeam2Change(e.target.value)}
        className={`w-10 sm:w-12 h-7 sm:h-8 text-center text-xs sm:text-sm font-medium ${!isValid ? 'border-red-500' : ''} touch-manipulation [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        placeholder=""
      />

      {/* Validation Indicator */}
      <div className="flex items-center ml-0.5 sm:ml-1">
        {currentSum === 16 && isValid ? (
          <div className="text-green-600 text-xs">✓</div>
        ) : (
          <div className="text-red-500 text-xs">{currentSum}/16</div>
        )}
      </div>

      {/* Save Button (only for organizers) */}
      {!readOnly && tournamentId && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!isValid || saveScoreMutation.isPending}
          className="ml-2 h-7 w-8 p-0 flex items-center justify-center"
        >
          <Save className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}