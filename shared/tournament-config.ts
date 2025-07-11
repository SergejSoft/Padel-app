/**
 * Tournament Configuration Constants
 * Centralized configuration for all tournament-related magic numbers and settings
 */

export const TOURNAMENT_CONFIG = {
  // Player constraints
  MIN_PLAYERS: 4,
  MAX_PLAYERS: 16, // Support for larger tournaments
  OPTIMAL_PLAYERS: 8, // Optimal for American format
  
  // Court configuration
  DEFAULT_COURTS: 2,
  MAX_COURTS: 8, // For larger tournaments
  
  // Scoring configuration
  DEFAULT_POINTS_PER_MATCH: 16,
  MIN_POINTS_PER_MATCH: 10,
  MAX_POINTS_PER_MATCH: 30,
  
  // Time configuration (in minutes)
  DEFAULT_GAME_DURATION: 13,
  MIN_GAME_DURATION: 10,
  MAX_GAME_DURATION: 20,
  
  // Tournament status
  STATUS: {
    ACTIVE: 'active',
    CANCELLED: 'cancelled', 
    PAST: 'past',
    COMPLETED: 'completed'
  } as const,
  
  // Registration status
  REGISTRATION_STATUS: {
    OPEN: 'open',
    CLOSED: 'closed', 
    FULL: 'full'
  } as const,
  
  // Tournament modes
  TOURNAMENT_MODE: {
    FIXED_PLAYERS: 'fixed',    // Traditional: organizer enters all players
    SELF_REGISTRATION: 'registration'  // New: players self-register
  } as const,
  
  // Match status
  MATCH_STATUS: {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
  } as const,
  
  // Validation rules
  VALIDATION: {
    MIN_TOURNAMENT_NAME_LENGTH: 1,
    MAX_TOURNAMENT_NAME_LENGTH: 100,
    MIN_PLAYER_NAME_LENGTH: 1,
    MAX_PLAYER_NAME_LENGTH: 50,
    MIN_LOCATION_LENGTH: 1,
    MAX_LOCATION_LENGTH: 100
  } as const
} as const;

// Type exports for type safety
export type TournamentStatus = typeof TOURNAMENT_CONFIG.STATUS[keyof typeof TOURNAMENT_CONFIG.STATUS];
export type MatchStatus = typeof TOURNAMENT_CONFIG.MATCH_STATUS[keyof typeof TOURNAMENT_CONFIG.MATCH_STATUS];
export type RegistrationStatus = typeof TOURNAMENT_CONFIG.REGISTRATION_STATUS[keyof typeof TOURNAMENT_CONFIG.REGISTRATION_STATUS];
export type TournamentMode = typeof TOURNAMENT_CONFIG.TOURNAMENT_MODE[keyof typeof TOURNAMENT_CONFIG.TOURNAMENT_MODE];