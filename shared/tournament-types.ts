/**
 * Comprehensive TypeScript interfaces for tournament system
 * Separated from schema to maintain clean data structure
 */

import { TOURNAMENT_CONFIG, type TournamentStatus, type MatchStatus } from './tournament-config';

// Core tournament configuration
export interface TournamentConfiguration {
  readonly playersCount: number;
  readonly courtsCount: number;
  readonly pointsPerMatch: number;
  readonly gameDurationMinutes: number;
}

// Tournament creation data
export interface TournamentCreationData {
  readonly name: string;
  readonly date: string;
  readonly time: string;
  readonly location: string;
  readonly players: readonly string[];
  readonly configuration: TournamentConfiguration;
}

// Match result with validation
export interface ValidatedMatchScore {
  readonly team1Score: number;
  readonly team2Score: number;
  readonly isValid: boolean;
  readonly totalPoints: number;
  readonly validationErrors: readonly string[];
}

// Immutable match data
export interface ImmutableMatch {
  readonly court: number;
  readonly team1: readonly [string, string];
  readonly team2: readonly [string, string];
  readonly round: number;
  readonly gameNumber: number;
  readonly score?: ValidatedMatchScore;
  readonly status: MatchStatus;
}

// Immutable round data
export interface ImmutableRound {
  readonly round: number;
  readonly matches: readonly ImmutableMatch[];
}

// Player statistics (immutable)
export interface ImmutablePlayerStats {
  readonly player: string;
  readonly matchesPlayed: number;
  readonly totalPoints: number;
  readonly pointsFor: number;
  readonly pointsAgainst: number;
  readonly winPercentage: number;
  readonly averageScore: number;
  readonly rank: number;
}

// Leaderboard data
export interface TournamentLeaderboard {
  readonly players: readonly ImmutablePlayerStats[];
  readonly lastUpdated: Date;
  readonly isComplete: boolean;
  readonly totalMatches: number;
  readonly completedMatches: number;
}

// Tournament state (immutable)
export interface ImmutableTournamentState {
  readonly id: number;
  readonly name: string;
  readonly date: string;
  readonly location: string;
  readonly status: TournamentStatus;
  readonly configuration: TournamentConfiguration;
  readonly players: readonly string[];
  readonly rounds: readonly ImmutableRound[];
  readonly leaderboard: TournamentLeaderboard;
  readonly createdAt: Date;
  readonly completedAt?: Date;
}

// Partner tracking for validation
export interface PartnershipTracking {
  readonly partnerships: ReadonlyMap<string, readonly string[]>;
  readonly partnerCounts: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly opponentCounts: ReadonlyMap<string, ReadonlyMap<string, number>>;
}

// Validation result
export interface ValidationResult<T = any> {
  readonly isValid: boolean;
  readonly data?: T;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

// American format specific types
export interface AmericanFormatConfig {
  readonly players: readonly string[];
  readonly courts: number;
  readonly pointsPerMatch: number;
}

export interface AmericanFormatResult {
  readonly rounds: readonly ImmutableRound[];
  readonly partnershipTracking: PartnershipTracking;
  readonly validation: ValidationResult;
}