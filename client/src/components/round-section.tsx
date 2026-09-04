import type { ReactNode, Ref } from "react";
import { CheckCircle2, Coffee } from "lucide-react";
import type { Round } from "@shared/schema";
import { cn } from "@/lib/utils";

export type RoundStatus = "played" | "current" | "upcoming";

/**
 * A round is "played" once every game has a saved score. Among the others,
 * the one the organizer has scrolled into focus is "current"; the rest are
 * "upcoming". `firstOpenRound` is where the page scrolls to on load.
 */
export function deriveRoundStatuses(
  rounds: readonly Round[],
  gameScores: Record<number, unknown>,
  focusedRound: number | null,
): { byRound: Map<number, RoundStatus>; firstOpenRound: number | null } {
  const byRound = new Map<number, RoundStatus>();
  let firstOpenRound: number | null = null;

  for (const round of [...rounds].sort((a, b) => a.round - b.round)) {
    const played = round.matches.every((match) => gameScores[match.gameNumber] != null);
    if (played) {
      byRound.set(round.round, "played");
      continue;
    }
    if (firstOpenRound === null) firstOpenRound = round.round;
    byRound.set(round.round, round.round === focusedRound ? "current" : "upcoming");
  }

  return { byRound, firstOpenRound };
}

/** Classes for one court card and its "Court N" chip, matching the round state. */
export function roundCardStyles(status: RoundStatus): { card: string; courtChip: string } {
  switch (status) {
    case "played":
      return {
        card: "rounded-lg bg-gray-100/70 p-2 ring-1 ring-inset ring-gray-200/70 sm:p-3",
        courtChip: "bg-white text-gray-600",
      };
    case "upcoming":
      return {
        card: "rounded-lg border border-dashed border-gray-300 bg-white p-2 sm:p-3",
        courtChip: "bg-gray-100 text-gray-600",
      };
    case "current":
    default:
      return {
        card: "rounded-xl bg-white p-3 ring-1 ring-inset ring-gray-300 sm:p-5",
        courtChip: "bg-gray-950 text-white",
      };
  }
}

interface RoundSectionProps {
  round: Round;
  status: RoundStatus;
  /** The round sitting in the middle of the viewport. */
  isFocused?: boolean;
  /** Another round is focused, so this one steps back a little. */
  isDimmed?: boolean;
  scoredCount: number;
  sittingOut: readonly string[];
  sectionRef?: Ref<HTMLElement>;
  children: ReactNode;
}

const SECTION_BY_STATUS: Record<RoundStatus, string> = {
  played: "mx-2 border-gray-200 bg-gray-50 sm:mx-6",
  current: "mx-0 border-gray-950 bg-white ring-[3px] ring-gray-950 shadow-2xl shadow-gray-950/30",
  upcoming: "mx-2 border-dashed border-gray-300 bg-white sm:mx-6",
};

const HEADER_BY_STATUS: Record<RoundStatus, string> = {
  played: "border-gray-200 bg-gray-100 text-gray-600",
  current: "border-gray-950 bg-gray-950 text-white",
  upcoming: "border-gray-200 border-dashed bg-white text-gray-600",
};

const BADGE_BY_STATUS: Record<RoundStatus, string> = {
  played: "bg-gray-300 text-gray-700",
  current: "bg-white text-gray-950",
  upcoming: "bg-white text-gray-500 ring-1 ring-inset ring-gray-300",
};

const BODY_BY_STATUS: Record<RoundStatus, string> = {
  played: "bg-gray-50",
  current: "bg-white",
  upcoming: "bg-white",
};

/**
 * One round of the schedule: a status-coloured header plus the court cards
 * passed as children. Played rounds recede into gray, the round scrolled
 * into focus is the single dark element on the page, the rest are dashed.
 */
export function RoundSection({
  round,
  status,
  isFocused = false,
  isDimmed = false,
  scoredCount,
  sittingOut,
  sectionRef,
  children,
}: RoundSectionProps) {
  const total = round.matches.length;
  const isCurrent = status === "current";

  return (
    <section
      ref={sectionRef}
      data-round={round.round}
      data-status={status}
      data-focused={isFocused ? "true" : undefined}
      aria-label={`Round ${round.round}`}
      aria-current={isCurrent ? "step" : undefined}
      className={cn(
        "scroll-mt-4 overflow-hidden rounded-xl border transition-[opacity,box-shadow] duration-300 ease-out motion-reduce:transition-none",
        SECTION_BY_STATUS[status],
        isFocused && "shadow-lg shadow-gray-900/10",
        isDimmed && !isCurrent && "opacity-60",
      )}
    >
      <header
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 sm:px-4",
          isCurrent ? "py-3 sm:py-4" : "py-2 sm:py-2.5",
          HEADER_BY_STATUS[status],
        )}
      >
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
            isCurrent ? "h-11 w-11 text-xl sm:h-12 sm:w-12 sm:text-2xl" : "h-8 w-8 text-base sm:h-9 sm:w-9 sm:text-lg",
            BADGE_BY_STATUS[status],
          )}
        >
          {round.round}
        </span>
        <h3 className={cn("font-bold tracking-tight", isCurrent ? "text-2xl text-white sm:text-3xl" : "text-lg text-gray-900 sm:text-xl", status === "played" && "text-gray-600")}>
          Round {round.round}
        </h3>
        {isCurrent && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-950 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            Now playing
          </span>
        )}
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 text-xs sm:text-sm",
            isCurrent ? "font-medium text-gray-300" : "text-gray-500",
          )}
        >
          {scoredCount === total ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Complete
            </>
          ) : (
            `${scoredCount}/${total} scored`
          )}
        </span>
        {sittingOut.length > 0 && (
          <span
            className="inline-flex w-full items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200 sm:w-auto"
            title="These players rest this round"
          >
            <Coffee className="h-3 w-3" />
            Sitting out: {sittingOut.join(", ")}
          </span>
        )}
      </header>
      <div className={cn("grid", isCurrent ? "gap-3 p-3 sm:gap-4 sm:p-4" : "gap-2 p-2 sm:gap-3 sm:p-3", BODY_BY_STATUS[status])}>{children}</div>
    </section>
  );
}
