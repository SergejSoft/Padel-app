import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

interface SimpleScoreInputProps {
  team1: [string, string];
  team2: [string, string];
  team1Score: number;
  team2Score: number;
  onScoreChange: (team1Score: number, team2Score: number) => void;
  gameNumber: number;
}

export function SimpleScoreInput({ 
  team1, 
  team2, 
  team1Score, 
  team2Score, 
  onScoreChange,
  gameNumber 
}: SimpleScoreInputProps) {
  const [team1Input, setTeam1Input] = useState(team1Score === 0 ? "" : team1Score.toString());
  const [team2Input, setTeam2Input] = useState(team2Score === 0 ? "" : team2Score.toString());
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    // Only update if the props have actually changed and are not zero (empty scores)
    if (team1Score > 0 || team1Input === "") {
      setTeam1Input(team1Score === 0 ? "" : team1Score.toString());
    }
    if (team2Score > 0 || team2Input === "") {
      setTeam2Input(team2Score === 0 ? "" : team2Score.toString());
    }
  }, [team1Score, team2Score]);

  const validateAndUpdate = (newTeam1: string, newTeam2: string) => {
    const score1 = parseInt(newTeam1) || 0;
    const score2 = parseInt(newTeam2) || 0;
    const sum = score1 + score2;
    
    // Validate scores are in range and sum is 16
    const valid = score1 >= 0 && score1 <= 16 && score2 >= 0 && score2 <= 16 && sum === 16;
    setIsValid(valid);
    
    if (valid) {
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
    </div>
  );
}