import { useEffect, useRef, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TOURNAMENT_CONFIG } from "@shared/tournament-config";
import { cn } from "@/lib/utils";

interface ScoreSliderProps {
  team1: readonly [string, string];
  team2: readonly [string, string];
  /** Saved score, or null when the game has not been scored yet. */
  score: { team1Score: number; team2Score: number } | null;
  pointsPerMatch?: number;
  gameNumber: number;
  tournamentId: number;
  onScoreChange: (team1Score: number, team2Score: number) => void;
  /** Larger names, digits and thumb, used for the round currently being played. */
  emphasis?: boolean;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Touch-first score entry for one match. A single thumb splits the match
 * points between the two teams: dragging right gives points to the right
 * team and takes them from the left, so the two scores always add up to
 * `pointsPerMatch`. Digits update while dragging; the score is saved when
 * the thumb is released (or shortly after tapping a digit).
 */
export function ScoreSlider({
  team1,
  team2,
  score,
  pointsPerMatch = TOURNAMENT_CONFIG.DEFAULT_POINTS_PER_MATCH,
  gameNumber,
  tournamentId,
  onScoreChange,
  emphasis = false,
}: ScoreSliderProps) {
  const half = Math.round(pointsPerMatch / 2);
  const [team2Score, setTeam2Score] = useState(score?.team2Score ?? half);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const hasScore = score !== null || saveState !== "idle";
  const team1Score = pointsPerMatch - team2Score;

  // Follow the server value when it changes underneath us (another organizer,
  // a refetch), but never while the user is mid-edit.
  useEffect(() => {
    if (saveState === "dirty" || saveState === "saving") return;
    setTeam2Score(score?.team2Score ?? half);
  }, [score?.team1Score, score?.team2Score, half, saveState]);

  const saveMutation = useMutation({
    mutationFn: async (next: { team1Score: number; team2Score: number }) => {
      const response = await apiRequest("PUT", `/api/tournaments/${tournamentId}/scores`, {
        gameNumber,
        ...next,
      });
      return response.json();
    },
    onMutate: () => setSaveState("saving"),
    onSuccess: (_data, next) => {
      setSaveState("saved");
      onScoreChange(next.team1Score, next.team2Score);
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/shared"] });
    },
    onError: (error: Error) => {
      setSaveState("error");
      setTeam2Score(score?.team2Score ?? half);
      toast({
        title: "Score not saved",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scheduleSave = (nextTeam2: number, delayMs: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveMutation.mutate({ team1Score: pointsPerMatch - nextTeam2, team2Score: nextTeam2 });
    }, delayMs);
  };

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const handleDrag = (values: number[]) => {
    setTeam2Score(values[0]);
    setSaveState("dirty");
  };

  const handleRelease = (values: number[]) => {
    scheduleSave(values[0], 0);
  };

  const nudge = (delta: number) => {
    const next = Math.min(pointsPerMatch, Math.max(0, team2Score + delta));
    if (next === team2Score) return;
    setTeam2Score(next);
    setSaveState("dirty");
    scheduleSave(next, 600);
  };

  const team1Leads = team1Score > team2Score;
  const team2Leads = team2Score > team1Score;

  // Diverging fill from the centre: the filled part shows who leads and by how much.
  const position = (team2Score / pointsPerMatch) * 100;
  const fillLeft = Math.min(50, position);
  const fillWidth = Math.abs(position - 50);

  const team1Label = `${team1[0]} & ${team1[1]}`;
  const team2Label = `${team2[0]} & ${team2[1]}`;

  return (
    <div className="space-y-2" data-testid={`score-slider-${gameNumber}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:gap-3">
        <div className="min-w-0 text-left">
          <div className={cn("truncate font-medium text-gray-900", emphasis ? "text-base sm:text-lg" : "text-sm sm:text-base")}>{team1[0]}</div>
          <div className={cn("truncate font-medium text-gray-900", emphasis ? "text-base sm:text-lg" : "text-sm sm:text-base")}>{team1[1]}</div>
        </div>
        <SaveIndicator state={saveState} hasScore={hasScore} />
        <div className="min-w-0 text-right">
          <div className={cn("truncate font-medium text-gray-900", emphasis ? "text-base sm:text-lg" : "text-sm sm:text-base")}>{team2[0]}</div>
          <div className={cn("truncate font-medium text-gray-900", emphasis ? "text-base sm:text-lg" : "text-sm sm:text-base")}>{team2[1]}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <ScoreDigit
          value={team1Score}
          placeholder={!hasScore}
          leading={team1Leads}
          label={`Give a point to ${team1Label}`}
          onTap={() => nudge(-1)}
          testId={`team1-score-${gameNumber}`}
          emphasis={emphasis}
        />

        <SliderPrimitive.Root
          className="relative flex h-10 flex-1 touch-none select-none items-center sm:h-11"
          min={0}
          max={pointsPerMatch}
          step={1}
          value={[team2Score]}
          onValueChange={handleDrag}
          onValueCommit={handleRelease}
          aria-label={`Score split between ${team1Label} and ${team2Label}`}
        >
          <SliderPrimitive.Track className={cn("relative w-full grow rounded-full bg-gray-200", emphasis ? "h-3 sm:h-4" : "h-2.5 sm:h-3")}>
            <div
              className={cn(
                "absolute h-full rounded-full transition-colors",
                hasScore ? "bg-gray-900" : "bg-gray-400",
              )}
              style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
            />
            <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-gray-400 sm:h-5" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className={cn(
              "block rounded-full border-[3px] bg-white shadow-md ring-offset-background transition-colors sm:border-4",
              emphasis ? "h-9 w-9 sm:h-11 sm:w-11" : "h-7 w-7 sm:h-9 sm:w-9",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              hasScore ? "border-gray-900" : "border-gray-400",
            )}
            aria-valuetext={`${team1Label} ${team1Score}, ${team2Label} ${team2Score}`}
          />
        </SliderPrimitive.Root>

        <ScoreDigit
          value={team2Score}
          placeholder={!hasScore}
          leading={team2Leads}
          label={`Give a point to ${team2Label}`}
          onTap={() => nudge(1)}
          testId={`team2-score-${gameNumber}`}
          emphasis={emphasis}
        />
      </div>
    </div>
  );
}

function ScoreDigit({
  value,
  placeholder,
  leading,
  label,
  onTap,
  testId,
  emphasis,
}: {
  value: number;
  placeholder: boolean;
  leading: boolean;
  label: string;
  onTap: () => void;
  testId: string;
  emphasis: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={label}
      title={label}
      data-testid={testId}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg font-bold tabular-nums transition-colors sm:rounded-xl",
        emphasis ? "h-14 w-14 text-3xl sm:h-[4.5rem] sm:w-[4.5rem] sm:text-4xl" : "h-11 w-11 text-2xl sm:h-14 sm:w-14 sm:text-3xl",
        "touch-manipulation select-none active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        placeholder
          ? "bg-gray-100 text-gray-400"
          : leading
            ? "bg-gray-900 text-white"
            : "bg-white text-gray-900 ring-1 ring-inset ring-gray-200",
      )}
    >
      {value}
    </button>
  );
}

function SaveIndicator({ state, hasScore }: { state: SaveState; hasScore: boolean }) {
  const base = "flex h-5 items-center justify-center gap-1 text-xs whitespace-nowrap";
  switch (state) {
    case "saving":
      return (
        <div className={cn(base, "text-gray-500")} role="status">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving
        </div>
      );
    case "saved":
      return (
        <div className={cn(base, "text-green-600")} role="status">
          <Check className="h-3 w-3" />
          Saved
        </div>
      );
    case "dirty":
      return <div className={cn(base, "text-gray-400")}>Release to save</div>;
    case "error":
      return <div className={cn(base, "text-red-600")} role="status">Not saved</div>;
    default:
      return (
        <div className={cn(base, "text-gray-400")}>
          {hasScore ? "Drag or tap to adjust" : "Drag to score"}
        </div>
      );
  }
}
