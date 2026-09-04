import { useCallback, useEffect, useRef, useState } from "react";

interface UseRoundFocusOptions {
  /** Round to scroll to on load (first round with an open game); null when every round is played. */
  initialRound: number | null;
  /** True once saved scores are hydrated, so the auto-scroll targets the right round. */
  ready: boolean;
}

/**
 * Fraction of the viewport height that acts as the "focus line". The focused
 * round is the last one whose top edge has scrolled above this line, which is
 * monotonic in the scroll position, so a round changing size when it gains
 * or loses focus cannot flip the choice back and forth.
 */
const FOCUS_LINE = 0.4;

/**
 * Scroll spy over the round sections: the organizer picks the current round
 * by scrolling it into focus. Also scrolls once, on load, to `initialRound`.
 */
export function useRoundFocus({ initialRound, ready }: UseRoundFocusOptions) {
  const elements = useRef(new Map<number, HTMLElement>());
  const refCallbacks = useRef(new Map<number, (el: HTMLElement | null) => void>());
  const didAutoScroll = useRef(false);
  const frame = useRef<number | null>(null);
  const [focusedRound, setFocusedRound] = useState<number | null>(null);

  const pickFocused = useCallback(() => {
    frame.current = null;
    const rounds = Array.from(elements.current.entries()).sort((a, b) => a[0] - b[0]);
    if (rounds.length === 0) return;

    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    if (atBottom) {
      setFocusedRound(rounds[rounds.length - 1][0]);
      return;
    }

    const line = window.innerHeight * FOCUS_LINE;
    let focused = rounds[0][0];
    for (const [round, el] of rounds) {
      if (el.getBoundingClientRect().top <= line) focused = round;
      else break;
    }
    setFocusedRound(focused);
  }, []);

  const schedulePick = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(pickFocused);
  }, [pickFocused]);

  /** Stable ref callback for a round's <section>; safe to pass on every render. */
  const registerRound = useCallback((round: number) => {
    let cb = refCallbacks.current.get(round);
    if (!cb) {
      cb = (el: HTMLElement | null) => {
        if (el) elements.current.set(round, el);
        else elements.current.delete(round);
        schedulePick();
      };
      refCallbacks.current.set(round, cb);
    }
    return cb;
  }, [schedulePick]);

  useEffect(() => {
    window.addEventListener("scroll", schedulePick, { passive: true });
    window.addEventListener("resize", schedulePick);
    schedulePick();
    return () => {
      window.removeEventListener("scroll", schedulePick);
      window.removeEventListener("resize", schedulePick);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, [schedulePick]);

  useEffect(() => {
    if (!ready || didAutoScroll.current) return;
    didAutoScroll.current = true;
    // Round 1 is already at the top of the schedule; nothing to skip past.
    if (initialRound === null || initialRound <= 1) return;
    const el = elements.current.get(initialRound);
    if (!el) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    el.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  }, [ready, initialRound]);

  return { registerRound, focusedRound };
}
