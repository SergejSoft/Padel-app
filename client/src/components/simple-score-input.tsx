import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const handleTeam1Change = (value: string) => {
    const score = Math.max(0, Math.min(16, parseInt(value) || 0));
    onScoreChange(score, team2Score);
  };

  const handleTeam2Change = (value: string) => {
    const score = Math.max(0, Math.min(16, parseInt(value) || 0));
    onScoreChange(team1Score, score);
  };

  return (
    <div className="space-y-3 min-w-[120px]">
      <div className="text-xs font-medium text-muted-foreground text-center">
        Game #{gameNumber} Score
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-right w-8">{team1[0]}</Label>
          <Input
            type="number"
            min="0"
            max="16"
            value={team1Score}
            onChange={(e) => handleTeam1Change(e.target.value)}
            className="w-12 h-8 text-center text-sm"
            placeholder="0"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Label className="text-xs text-right w-8">{team1[1]}</Label>
          <Input
            type="number"
            min="0"
            max="16"
            value={team1Score}
            onChange={(e) => handleTeam1Change(e.target.value)}
            className="w-12 h-8 text-center text-sm bg-muted/50"
            placeholder="0"
            disabled
          />
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground">vs</div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-right w-8">{team2[0]}</Label>
          <Input
            type="number"
            min="0"
            max="16"
            value={team2Score}
            onChange={(e) => handleTeam2Change(e.target.value)}
            className="w-12 h-8 text-center text-sm"
            placeholder="0"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Label className="text-xs text-right w-8">{team2[1]}</Label>
          <Input
            type="number"
            min="0"
            max="16"
            value={team2Score}
            onChange={(e) => handleTeam2Change(e.target.value)}
            className="w-12 h-8 text-center text-sm bg-muted/50"
            placeholder="0"
            disabled
          />
        </div>
      </div>
    </div>
  );
}