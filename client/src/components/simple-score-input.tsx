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
  const [team1Input, setTeam1Input] = useState(team1Score.toString());
  const [team2Input, setTeam2Input] = useState(team2Score.toString());
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setTeam1Input(team1Score.toString());
    setTeam2Input(team2Score.toString());
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
    <div className="space-y-3 min-w-[160px]">
      <div className="text-xs font-medium text-muted-foreground text-center">
        Game #{gameNumber}
      </div>
      
      <div className="space-y-3">
        {/* Team 1 Input */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {team1[0]} & {team1[1]}
          </Label>
          <Input
            type="number"
            min="0"
            max="16"
            value={team1Input}
            onChange={(e) => handleTeam1Change(e.target.value)}
            className={`h-9 text-center font-medium ${!isValid ? 'border-red-500' : ''}`}
            placeholder="0"
          />
        </div>

        {/* VS Divider */}
        <div className="text-center text-xs text-muted-foreground font-medium">
          VS
        </div>

        {/* Team 2 Input */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {team2[0]} & {team2[1]}
          </Label>
          <Input
            type="number"
            min="0"
            max="16"
            value={team2Input}
            onChange={(e) => handleTeam2Change(e.target.value)}
            className={`h-9 text-center font-medium ${!isValid ? 'border-red-500' : ''}`}
            placeholder="0"
          />
        </div>
      </div>

      {/* Validation Message */}
      <div className="text-center">
        {currentSum === 16 && isValid ? (
          <div className="text-xs text-green-600 font-medium">✓ Valid</div>
        ) : (
          <div className="text-xs text-red-500">
            Sum: {currentSum}/16
          </div>
        )}
      </div>
    </div>
  );
}