import { useCallback, useEffect, useRef, useState } from "react";

interface UseRoundFocusOptions {
  /** Round to scroll to on load; null when every round is played. */
  currentRound: number | null;
  /** True once saved scores are hydrated, so the auto-scroll targets the real current round. */
  ready: boolean;
}

/** Vertical band around the middle of the viewport that "focuses" a round. */
const BAND_START = 0.45;
const BAND_END = 0.55;

/**
 * Tracks which round section sits in the middle of the viewport and, once per
 * page load, scrolls the current round to the top so the organizer lands on
 * the games being played rather than on round 1.
 */
export function useRoundFocus({ currentRound, ready }: UseRoundFocusOptions) {
  const elements = useRef(new Map<number, HTMLElement>());
  const roundOf = useRef(new Map<Element, number>());
  const refCallbacks = useRef(new Map<number, (el: HTMLElement | null) => void>());
  const observer = useRef<IntersectionObserver | null>(null);
  const inBand = useRef(new Set<number>());
  const didAutoScroll = useRef(false);
  const [focusedRound, setFocusedRound] = useState<number | null>(null);

  /** Stable ref callback for a round's <section>; safe to pass on every render. */
  const registerRound = useCallback((round: number) => {
    let cb = refCallbacks.current.get(round);
    if (!cb) {
      cb = (el: HTMLElement | null) => {
        const prev = elements.current.get(round);
        if (prev && prev !== el) {
          observer.current?.unobserve(prev);
          roundOf.current.delete(prev);
          inBand.current.delete(round);
        }
        if (el) {
          elements.current.set(round, el);
          roundOf.current.set(el, round);
          observer.current?.observe(el);
        } else {
          elements.current.delete(round);
        }
      };
      refCallbacks.current.set(round, cb);
    }
    return cb;
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const pickFocused = () => {
      // Several sections can touch the band at once (short sections, the gap
      // between two rounds); keep the one that covers most of it.
      const viewport = window.innerHeight;
      const bandTop = viewport * BAND_START;
      const bandBottom = viewport * BAND_END;
      let best: number | null = null;
      let bestOverlap = 0;
      inBand.current.forEach((round) => {
        const el = elements.current.get(round);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const overlap = Math.min(rect.bottom, bandBottom) - Math.max(rect.top, bandTop);
        if (overlap > bestOverlap) {
          best = round;
          bestOverlap = overlap;
        }
      });
      setFocusedRound(best);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const round = roundOf.current.get(entry.target);
          if (round === undefined) continue;
          if (entry.isIntersecting) inBand.current.add(round);
          else inBand.current.delete(round);
        }
        pickFocused();
      },
      { rootMargin: `-${BAND_START * 100}% 0px -${(1 - BAND_END) * 100}% 0px`, threshold: 0 },
    );
    observer.current = io;
    elements.current.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      observer.current = null;
      inBand.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!ready || didAutoScroll.current) return;
    didAutoScroll.current = true;
    // Round 1 is already at the top of the schedule; nothing to skip past.
    if (currentRound === null || currentRound <= 1) return;
    const el = elements.current.get(currentRound);
    if (!el) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    el.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  }, [ready, currentRound]);

  return { registerRound, focusedRound };
}
