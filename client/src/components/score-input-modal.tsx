import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Trophy, Clock } from "lucide-react";
import type { Match, MatchScore, SetScore } from "@shared/schema";

interface ScoreInputModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (matchId: number, score: MatchScore) => void;
}

export function ScoreInputModal({ match, isOpen, onClose, onSave }: ScoreInputModalProps) {
  const [sets, setSets] = useState<SetScore[]>(match?.score?.sets || [{ team1: 0, team2: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!match) return null;

  const addSet = () => {
    if (sets.length < 3) {
      setSets([...sets, { team1: 0, team2: 0 }]);
    }
  };

  const removeSet = () => {
    if (sets.length > 1) {
      setSets(sets.slice(0, -1));
    }
  };

  const updateSetScore = (setIndex: number, team: 'team1' | 'team2', value: number) => {
    const newSets = [...sets];
    newSets[setIndex] = { ...newSets[setIndex], [team]: Math.max(0, value) };
    setSets(newSets);
  };

  const calculateMatchScore = (): MatchScore => {
    const team1Sets = sets.filter(set => set.team1 > set.team2).length;
    const team2Sets = sets.filter(set => set.team2 > set.team1).length;
    
    return {
      team1Score: team1Sets,
      team2Score: team2Sets,
      sets
    };
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const score = calculateMatchScore();
      await onSave(match.gameNumber, score);
      onClose();
    } catch (error) {
      console.error('Failed to save score:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchScore = calculateMatchScore();
  const hasWinner = matchScore.team1Score !== matchScore.team2Score;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Round {match.round} - Court {match.court} Score
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Match Info */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <Badge variant="outline">Game #{match.gameNumber}</Badge>
              <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>
                {match.status === 'completed' ? 'Completed' : 'In Progress'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="font-semibold text-lg">{match.team1[0]} & {match.team1[1]}</div>
                <div className="text-2xl font-bold text-primary mt-1">{matchScore.team1Score}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">{match.team2[0]} & {match.team2[1]}</div>
                <div className="text-2xl font-bold text-primary mt-1">{matchScore.team2Score}</div>
              </div>
            </div>
          </div>

          {/* Sets Scoring */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">Set Scores</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeSet}
                  disabled={sets.length <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSet}
                  disabled={sets.length >= 3}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {sets.map((set, index) => (
              <div key={index} className="space-y-2">
                <Label className="text-sm text-muted-foreground">Set {index + 1}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">{match.team1[0]} & {match.team1[1]}</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateSetScore(index, 'team1', set.team1 - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={set.team1 === 0 ? "" : set.team1}
                        onChange={(e) => updateSetScore(index, 'team1', parseInt(e.target.value) || 0)}
                        className="text-center w-16"
                        min="0"
                        placeholder=""
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateSetScore(index, 'team1', set.team1 + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">{match.team2[0]} & {match.team2[1]}</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateSetScore(index, 'team2', set.team2 - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={set.team2 === 0 ? "" : set.team2}
                        onChange={(e) => updateSetScore(index, 'team2', parseInt(e.target.value) || 0)}
                        className="text-center w-16"
                        min="0"
                        placeholder=""
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateSetScore(index, 'team2', set.team2 + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                {index < sets.length - 1 && <Separator />}
              </div>
            ))}
          </div>

          {/* Winner Display */}
          {hasWinner && (
            <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg text-center">
              <div className="text-sm text-muted-foreground mb-1">Match Winner</div>
              <div className="font-semibold text-primary">
                {matchScore.team1Score > matchScore.team2Score 
                  ? `${match.team1[0]} & ${match.team1[1]}`
                  : `${match.team2[0]} & ${match.team2[1]}`
                }
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Score'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}