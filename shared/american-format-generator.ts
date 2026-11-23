/**
 * Improved American Format Generator
 * Supports flexible player counts with strict rule adherence
 */

import type { 
  AmericanFormatConfig, 
  AmericanFormatResult,
  ImmutableRound, 
  ImmutableMatch,
  PartnershipTracking,
  ValidationResult
} from './tournament-types.js';
import { validateAmericanFormatConfig, validateAmericanFormatSchedule } from './validation-utils.js';
import { TOURNAMENT_CONFIG } from './tournament-config.js';

const MAX_ROUNDS = 12;

export interface AmericanFormatPlan {
  /** Courts in use each round; never more than the players can fill. */
  readonly activeCourts: number;
  readonly playingPerRound: number;
  readonly restingPerRound: number;
  readonly rounds: number;
  readonly minGamesPerPlayer: number;
  readonly maxGamesPerPlayer: number;
}

/**
 * Describes the schedule the generator will build for a player and court
 * count, without generating it.
 */
export function planAmericanFormat(playerCount: number, courts: number): AmericanFormatPlan {
  const perCourt = TOURNAMENT_CONFIG.PLAYERS_PER_COURT;
  const activeCourts = Math.max(0, Math.min(Math.floor(playerCount / perCourt), courts));
  const playingPerRound = activeCourts * perCourt;
  const rounds = activeCourts > 0
    ? chooseFairRoundCount(
        playerCount,
        playingPerRound,
        Math.min(playerCount - 1, MAX_ROUNDS),
        MAX_ROUNDS,
      )
    : 0;
  const playerSlots = rounds * playingPerRound;

  return {
    activeCourts,
    playingPerRound,
    restingPerRound: Math.max(0, playerCount - playingPerRound),
    rounds,
    minGamesPerPlayer: playerCount > 0 ? Math.floor(playerSlots / playerCount) : 0,
    maxGamesPerPlayer: playerCount > 0 ? Math.ceil(playerSlots / playerCount) : 0,
  };
}

/**
 * Generates American format tournament schedule with strict rule adherence
 */
export function generateAmericanFormatTournament(config: AmericanFormatConfig): AmericanFormatResult {
  // Validate input configuration
  const configValidation = validateAmericanFormatConfig(config);
  if (!configValidation.isValid) {
    return {
      rounds: [],
      partnershipTracking: createEmptyPartnershipTracking(),
      validation: configValidation
    };
  }

  return generateGeneralAmericanFormat(config);
}

/**
 * General algorithm for flexible player counts.
 *
 * Builds a complete schedule greedily, then improves it with simulated
 * annealing. Every move keeps each player's game count unchanged, so the
 * equal distribution chosen by planAmericanFormat always survives. The cost
 * squares how often each pair partnered or faced each other, so repeats are
 * avoided whenever the schedule allows it and spread evenly when they cannot.
 */
function generateGeneralAmericanFormat(config: AmericanFormatConfig): AmericanFormatResult {
  const { players, courts } = config;
  const { rounds: roundCount } = planAmericanFormat(players.length, courts);
  const immutableRounds = buildAmericanRounds(players, courts, roundCount);

  const validation = validateAmericanFormatSchedule(immutableRounds, players);
  const partnershipTracking = calculatePartnershipTracking(immutableRounds);

  return {
    rounds: immutableRounds,
    partnershipTracking,
    validation
  };
}

/**
 * Builds a fixed number of rounds. Exported so schedules longer than
 * planAmericanFormat allows, where partners must repeat, can be checked.
 */
export function buildAmericanRounds(
  players: readonly string[],
  courts: number,
  roundCount: number,
): ImmutableRound[] {
  const activeCourts = Math.max(0, Math.min(courts, Math.floor(players.length / TOURNAMENT_CONFIG.PLAYERS_PER_COURT)));
  const orders = new ScheduleOptimiser(players.length, activeCourts, roundCount).optimise();

  return orders.map((order, roundIndex) => ({
    round: roundIndex + 1,
    matches: Array.from({ length: activeCourts }, (_, courtIndex): ImmutableMatch => {
      const base = courtIndex * TOURNAMENT_CONFIG.PLAYERS_PER_COURT;
      return {
        court: courtIndex + 1,
        team1: [players[order[base]], players[order[base + 1]]],
        team2: [players[order[base + 2]], players[order[base + 3]]],
        round: roundIndex + 1,
        gameNumber: roundIndex * activeCourts + courtIndex + 1,
        status: "pending",
      };
    }),
  }));
}

// A repeated partner must always cost more than any opponent or rest gain.
const PARTNER_WEIGHT = 1000;
const OPPONENT_WEIGHT = 10;
const BACK_TO_BACK_REST_WEIGHT = 5;
const ANNEALING_RESTARTS = 4;
const START_TEMPERATURE = 50;
const END_TEMPERATURE = 0.5;
const ITERATIONS_PER_MATCH = 1_500;
const MIN_ITERATIONS = 20_000;

type SlotSwap = readonly [round: number, left: number, right: number];

/**
 * Holds one round per row as a player order: the first `playing` entries are
 * the courts (slots 0-1 team 1, slots 2-3 team 2), the rest are resting.
 */
class ScheduleOptimiser {
  private readonly playing: number;
  private readonly partnerCounts: Int32Array;
  private readonly opponentCounts: Int32Array;
  private orders: number[][] = [];
  private positions: number[][] = [];
  private cost = 0;
  /** Sum of squared partner counts; equals the team count when nobody repeats. */
  private partnerSquares = 0;
  private random: () => number = () => 0;

  constructor(
    private readonly playerCount: number,
    private readonly courts: number,
    private readonly roundCount: number,
  ) {
    this.playing = courts * TOURNAMENT_CONFIG.PLAYERS_PER_COURT;
    this.partnerCounts = new Int32Array(playerCount * playerCount);
    this.opponentCounts = new Int32Array(playerCount * playerCount);
  }

  optimise(): number[][] {
    if (this.roundCount === 0 || this.courts === 0) return [];

    const { total: lowerBound, partnerSquares: partnerLowerBound } = this.lowerBound();
    const iterations = Math.max(MIN_ITERATIONS, ITERATIONS_PER_MATCH * this.roundCount * this.courts);
    let best: { cost: number; partnerSquares: number; orders: number[][] } | null = null;

    // Restarts only help while some partnership still repeats more than it must.
    for (
      let restart = 0;
      restart < ANNEALING_RESTARTS && (!best || best.partnerSquares > partnerLowerBound);
      restart++
    ) {
      this.random = createRandom(
        this.playerCount * 7919 + this.courts * 104_729 + this.roundCount * 31 + restart * 1_000_003,
      );
      this.buildInitialSchedule();
      const result = this.anneal(iterations, lowerBound);
      if (!best || result.cost < best.cost) best = result;
    }

    return best!.orders;
  }

  /** Cost if pair counts were spread as evenly as the slot totals allow. */
  private lowerBound(): { total: number; partnerSquares: number } {
    const pairs = (this.playerCount * (this.playerCount - 1)) / 2;
    const spread = (total: number) => {
      const base = Math.floor(total / pairs);
      const extra = total % pairs;
      return extra * (base + 1) ** 2 + (pairs - extra) * base ** 2;
    };
    const matches = this.roundCount * this.courts;
    const partnerSquares = spread(matches * 2);
    return { total: PARTNER_WEIGHT * partnerSquares + OPPONENT_WEIGHT * spread(matches * 4), partnerSquares };
  }

  /**
   * Fills rounds one at a time. Players with the fewest games must play;
   * ties prefer whoever rested last round, then whoever has the most unused
   * partners among the players already chosen.
   */
  private buildInitialSchedule(): void {
    const { playerCount, playing } = this;
    this.partnerCounts.fill(0);
    this.opponentCounts.fill(0);
    this.orders = [];
    this.positions = [];
    this.cost = 0;
    this.partnerSquares = 0;

    const games = new Array<number>(playerCount).fill(0);
    let restedLastRound = new Set<number>();

    for (let round = 0; round < this.roundCount; round++) {
      const byGames = this.shuffled(range(playerCount)).sort((a, b) => games[a] - games[b]);
      const cutoff = games[byGames[playing - 1]];
      const selected = byGames.filter((player) => games[player] < cutoff);
      const tied = byGames.filter((player) => games[player] === cutoff);

      while (selected.length < playing) {
        let bestIndex = 0;
        let bestScore = -Infinity;
        tied.forEach((candidate, index) => {
          const freshPartners = selected.filter((other) => this.partners(candidate, other) === 0).length;
          const score = (restedLastRound.has(candidate) ? playerCount : 0) + freshPartners;
          if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
          }
        });
        selected.push(tied.splice(bestIndex, 1)[0]);
      }

      const order = [...this.arrangeCourts(selected)];
      const active = new Set(order);
      const resting = range(playerCount).filter((player) => !active.has(player));
      order.push(...resting);

      this.orders.push(order);
      this.positions.push(indexPositions(order));
      for (let court = 0; court < this.courts; court++) {
        this.cost += this.applyMatch(round, court, 1);
      }
      order.slice(0, playing).forEach((player) => games[player]++);
      resting.forEach((player) => {
        if (restedLastRound.has(player)) this.cost += BACK_TO_BACK_REST_WEIGHT;
      });
      restedLastRound = new Set(resting);
    }
  }

  /** Greedily pairs the least-partnered players, then the least-met teams. */
  private arrangeCourts(selected: readonly number[]): number[] {
    const remaining = [...selected];
    const teams: [number, number][] = [];
    while (remaining.length > 0) {
      const player = remaining.shift()!;
      let partnerIndex = 0;
      remaining.forEach((candidate, index) => {
        if (this.partners(player, candidate) < this.partners(player, remaining[partnerIndex])) {
          partnerIndex = index;
        }
      });
      teams.push([player, remaining.splice(partnerIndex, 1)[0]]);
    }

    const order: number[] = [];
    while (teams.length > 0) {
      const team = teams.shift()!;
      let rivalIndex = 0;
      let rivalScore = Infinity;
      teams.forEach((candidate, index) => {
        const score = this.opponentScore(team, candidate);
        if (score < rivalScore) {
          rivalScore = score;
          rivalIndex = index;
        }
      });
      order.push(...team, ...teams.splice(rivalIndex, 1)[0]);
    }
    return order;
  }

  private anneal(
    iterations: number,
    lowerBound: number,
  ): { cost: number; partnerSquares: number; orders: number[][] } {
    let bestCost = this.cost;
    let bestPartnerSquares = this.partnerSquares;
    let bestOrders = this.orders.map((order) => [...order]);
    const cooling = Math.pow(END_TEMPERATURE / START_TEMPERATURE, 1 / iterations);
    let temperature = START_TEMPERATURE;

    for (let step = 0; step < iterations && bestCost > lowerBound; step++, temperature *= cooling) {
      const swaps = this.proposeMove();
      if (!swaps) continue;

      const delta = this.applySwaps(swaps);
      if (delta <= 0 || this.random() < Math.exp(-delta / temperature)) {
        this.cost += delta;
        if (this.cost < bestCost) {
          bestCost = this.cost;
          bestPartnerSquares = this.partnerSquares;
          bestOrders = this.orders.map((order) => [...order]);
        }
      } else {
        this.applySwaps([...swaps].reverse());
      }
    }

    return { cost: bestCost, partnerSquares: bestPartnerSquares, orders: bestOrders };
  }

  /**
   * Picks a move that leaves every player's game count unchanged: swap two
   * players within a round, swap two teams across courts, or trade a playing
   * and a resting player in one round and back again in another.
   */
  private proposeMove(): SlotSwap[] | null {
    const { playing, playerCount } = this;
    const round = this.randomInt(this.roundCount);
    const kind = this.random();

    if (playing < playerCount && kind < 0.4) {
      const slot = this.randomInt(playing);
      const restSlot = playing + this.randomInt(playerCount - playing);
      const player = this.orders[round][slot];
      const rester = this.orders[round][restSlot];
      const offset = this.randomInt(this.roundCount);
      let other = -1;
      for (let step = 0; step < this.roundCount && other < 0; step++) {
        const candidate = (offset + step) % this.roundCount;
        if (
          candidate !== round
          && this.positions[candidate][rester] < playing
          && this.positions[candidate][player] >= playing
        ) {
          other = candidate;
        }
      }
      if (other < 0) return null;
      return [
        [round, slot, restSlot],
        [other, this.positions[other][rester], this.positions[other][player]],
      ];
    }

    if (this.courts > 1 && kind < 0.55) {
      const first = this.randomInt(this.courts);
      const second = (first + 1 + this.randomInt(this.courts - 1)) % this.courts;
      const left = first * 4 + 2 * this.randomInt(2);
      const right = second * 4 + 2 * this.randomInt(2);
      return [[round, left, right], [round, left + 1, right + 1]];
    }

    const left = this.randomInt(playing);
    const right = this.randomInt(playing);
    if (Math.floor(left / 2) === Math.floor(right / 2)) return null;
    return [[round, left, right]];
  }

  /** Applies the swaps in order and returns the change in cost. */
  private applySwaps(swaps: readonly SlotSwap[]): number {
    const affected: number[] = [];
    const restChanges: number[] = [];
    const addCourt = (round: number, slot: number) => {
      if (slot >= this.playing) return;
      const key = round * this.courts + Math.floor(slot / 4);
      if (!affected.includes(key)) affected.push(key);
    };
    for (const [round, left, right] of swaps) {
      addCourt(round, left);
      addCourt(round, right);
      if ((left < this.playing) !== (right < this.playing)) {
        for (const player of [this.orders[round][left], this.orders[round][right]]) {
          if (!restChanges.includes(player)) restChanges.push(player);
        }
      }
    }

    let delta = 0;
    for (const key of affected) delta += this.applyMatch(Math.floor(key / this.courts), key % this.courts, -1);
    for (const player of restChanges) delta -= this.backToBackRests(player);

    for (const [round, left, right] of swaps) {
      const order = this.orders[round];
      [order[left], order[right]] = [order[right], order[left]];
      this.positions[round][order[left]] = left;
      this.positions[round][order[right]] = right;
    }

    for (const key of affected) delta += this.applyMatch(Math.floor(key / this.courts), key % this.courts, 1);
    for (const player of restChanges) delta += this.backToBackRests(player);
    return delta;
  }

  /** Adds (sign 1) or removes (sign -1) one court's pairings; returns the cost change. */
  private applyMatch(round: number, court: number, sign: 1 | -1): number {
    const order = this.orders[round];
    const base = court * 4;
    const [a1, a2, b1, b2] = [order[base], order[base + 1], order[base + 2], order[base + 3]];
    const partnerDelta = this.bump(this.partnerCounts, a1, a2, sign) + this.bump(this.partnerCounts, b1, b2, sign);
    this.partnerSquares += partnerDelta;
    let delta = PARTNER_WEIGHT * partnerDelta;
    for (const a of [a1, a2]) {
      for (const b of [b1, b2]) {
        delta += OPPONENT_WEIGHT * this.bump(this.opponentCounts, a, b, sign);
      }
    }
    return delta;
  }

  /** Changes a pair count and returns the change in its squared value. */
  private bump(counts: Int32Array, a: number, b: number, sign: 1 | -1): number {
    const current = counts[a * this.playerCount + b];
    const next = current + sign;
    counts[a * this.playerCount + b] = next;
    counts[b * this.playerCount + a] = next;
    return next * next - current * current;
  }

  private backToBackRests(player: number): number {
    let total = 0;
    for (let round = 1; round < this.roundCount; round++) {
      if (this.positions[round][player] >= this.playing && this.positions[round - 1][player] >= this.playing) {
        total++;
      }
    }
    return total * BACK_TO_BACK_REST_WEIGHT;
  }

  private partners(a: number, b: number): number {
    return this.partnerCounts[a * this.playerCount + b];
  }

  private opponentScore(team: readonly number[], rivals: readonly number[]): number {
    let score = 0;
    for (const a of team) {
      for (const b of rivals) score += this.opponentCounts[a * this.playerCount + b];
    }
    return score;
  }

  private randomInt(limit: number): number {
    return Math.floor(this.random() * limit);
  }

  private shuffled(values: number[]): number[] {
    for (let index = values.length - 1; index > 0; index--) {
      const swapIndex = this.randomInt(index + 1);
      [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
    }
    return values;
  }
}

/** Deterministic mulberry32 generator so the same inputs give the same schedule. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function range(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}

function indexPositions(order: readonly number[]): number[] {
  const positions = new Array<number>(order.length);
  order.forEach((player, slot) => { positions[player] = slot; });
  return positions;
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    [a, b] = [b, a % b];
  }

  return a;
}

/**
 * Picks a round count that gives every player the same number of games when
 * some players must sit out. Equal distribution requires the total number of
 * player-slots (rounds * activePlayerCount) to divide evenly by playerCount.
 */
function chooseFairRoundCount(
  playerCount: number,
  activePlayerCount: number,
  targetRounds: number,
  maxRounds: number,
): number {
  if (activePlayerCount === playerCount) return targetRounds;

  const period = playerCount / greatestCommonDivisor(playerCount, activePlayerCount);
  if (period > maxRounds) return targetRounds;

  const candidates: number[] = [];
  for (let rounds = period; rounds <= maxRounds; rounds += period) {
    candidates.push(rounds);
  }

  return candidates.reduce((best, candidate) => {
    const candidateDistance = Math.abs(candidate - targetRounds);
    const bestDistance = Math.abs(best - targetRounds);
    return candidateDistance < bestDistance
      || (candidateDistance === bestDistance && candidate > best)
      ? candidate
      : best;
  });
}

/**
 * Calculates partnership tracking from completed schedule
 */
function calculatePartnershipTracking(rounds: readonly ImmutableRound[]): PartnershipTracking {
  const partnerships = new Map<string, string[]>();
  const partnerCounts = new Map<string, Map<string, number>>();
  const opponentCounts = new Map<string, Map<string, number>>();
  
  rounds.forEach(round => {
    round.matches.forEach(match => {
      const [p1, p2] = match.team1;
      const [p3, p4] = match.team2;
      
      // Track partnerships
      if (!partnerships.has(p1)) partnerships.set(p1, []);
      if (!partnerships.has(p2)) partnerships.set(p2, []);
      if (!partnerships.has(p3)) partnerships.set(p3, []);
      if (!partnerships.has(p4)) partnerships.set(p4, []);
      
      partnerships.get(p1)!.push(p2);
      partnerships.get(p2)!.push(p1);
      partnerships.get(p3)!.push(p4);
      partnerships.get(p4)!.push(p3);
      
      addPairCount(partnerCounts, p1, p2);
      addPairCount(partnerCounts, p3, p4);
      [p1, p2].forEach(teamPlayer => {
        [p3, p4].forEach(opponent => addPairCount(opponentCounts, teamPlayer, opponent));
      });
    });
  });
  
  return {
    partnerships: new Map(Array.from(partnerships.entries()).map(([k, v]) => [k, v as readonly string[]])),
    partnerCounts,
    opponentCounts
  };
}

function addPairCount(counts: Map<string, Map<string, number>>, a: string, b: string): void {
  for (const [player, other] of [[a, b], [b, a]]) {
    if (!counts.has(player)) counts.set(player, new Map());
    const playerCounts = counts.get(player)!;
    playerCounts.set(other, (playerCounts.get(other) ?? 0) + 1);
  }
}

/**
 * Creates empty partnership tracking
 */
function createEmptyPartnershipTracking(): PartnershipTracking {
  return {
    partnerships: new Map(),
    partnerCounts: new Map(),
    opponentCounts: new Map()
  };
}