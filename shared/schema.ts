import { pgTable, text, serial, integer, json, timestamp, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { TOURNAMENT_CONFIG } from './tournament-config.js';

// Application profile keyed by Clerk's user ID. Clerk owns credentials and sessions.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  playtomicRating: real("playtomic_rating"),
  role: varchar("role").default("player").notNull(), // 'player', 'organizer', 'admin'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date"),
  time: text("time"), // Format: "HH:MM"
  location: text("location"),
  price: text("price"),
  currency: text("currency"),
  playersCount: integer("players_count").notNull(),
  courtsCount: integer("courts_count").notNull(),
  pointsPerMatch: integer("points_per_match").notNull().default(24),
  players: json("players").$type<string[]>().notNull(),
  schedule: json("schedule").$type<any[]>().notNull(),
  results: json("results").$type<PlayerStats[]>(), // Final leaderboard results
  finalScores: json("final_scores").$type<any[]>(), // Match scores with results
  leaderboardId: text("leaderboard_id").unique(), // Unique ID for leaderboard access
  shareId: text("share_id").unique(),
  urlSlug: text("url_slug").unique(), // Custom friendly URL slug
  status: text("status").notNull().default("active"), // active, cancelled, past, completed
  organizerId: text("organizer_id").references(() => users.id),
  
  // New self-registration fields (all optional for backward compatibility)
  tournamentMode: text("tournament_mode").notNull().default("fixed"), // 'fixed' or 'registration'
  registrationId: text("registration_id").unique(), // Unique ID for public registration link
  registrationStatus: text("registration_status").default("closed"), // 'open', 'closed', 'full'
  maxParticipants: integer("max_participants"), // Registration limit (defaults to playersCount)
  registeredParticipants: json("registered_participants").$type<RegisteredParticipant[]>().default([]), // Self-registered players
  registrationDeadline: timestamp("registration_deadline"), // Optional deadline for registration
  
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"), // When tournament was completed
});

export const insertTournamentSchema = createInsertSchema(tournaments, {
  pointsPerMatch: z.number().refine(
    value => (TOURNAMENT_CONFIG.POINTS_PER_MATCH_OPTIONS as readonly number[]).includes(value),
    "Points per match must be 16, 24, or 32",
  ).optional(),
  players: z.array(z.string()),
  schedule: z.array(z.any()),
}).omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;

// Self-registration types
export interface RegisteredParticipant {
  id: string; // Unique participant ID
  userId?: string; // Clerk user ID when registration is linked to an account
  name: string; // Player name
  email?: string; // Optional contact info
  playtomicRating?: number | null; // Optional Playtomic level (0-7)
  registeredAt: string; // ISO timestamp
  status: 'registered' | 'confirmed' | 'removed'; // Participant status
}

export interface RegistrationInfo {
  tournamentId: number;
  tournamentName: string;
  date: string;
  time: string;
  location: string;
  price?: string;
  currency?: string;
  currentParticipants: number;
  maxParticipants: number;
  pointsPerMatch: number;
  registrationStatus: 'open' | 'closed' | 'full';
  deadline?: string;
  /** Public schedule page, present once the organizer has generated the schedule. */
  schedulePath?: string;
}

export interface UpcomingTournament {
  id: number;
  name: string;
  date: string;
  time: string;
  location: string;
  price?: string;
  currency?: string;
  currentParticipants: number;
  maxParticipants: number;
  pointsPerMatch: number;
  registrationId: string;
}

export interface JoinedTournamentSummary {
  id: number;
  name: string;
  date: string | null;
  time: string | null;
  location: string | null;
  status: string;
  shareId: string | null;
  urlSlug: string | null;
  leaderboardId: string | null;
  registrationStatus: string | null;
}

// Validation schemas with configurable constraints
export const tournamentSetupSchema = z.object({
  name: z.string()
    .min(TOURNAMENT_CONFIG.VALIDATION.MIN_TOURNAMENT_NAME_LENGTH, "Tournament name is required")
    .max(TOURNAMENT_CONFIG.VALIDATION.MAX_TOURNAMENT_NAME_LENGTH, "Tournament name too long"),
  date: z.string().min(1, "Tournament date is required"),
  time: z.string().min(1, "Tournament time is required"),
  location: z.string()
    .min(TOURNAMENT_CONFIG.VALIDATION.MIN_LOCATION_LENGTH, "Tournament location is required")
    .max(TOURNAMENT_CONFIG.VALIDATION.MAX_LOCATION_LENGTH, "Tournament location too long"),
  price: z.string()
    .trim()
    .refine(
      value => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
      "Price cannot be negative",
    )
    .optional(),
  currency: z.enum(["EUR", "GBP", "USD"]).default("EUR").optional(),
  playersCount: z.number()
    .min(TOURNAMENT_CONFIG.MIN_PLAYERS, `Minimum ${TOURNAMENT_CONFIG.MIN_PLAYERS} players required`)
    .max(TOURNAMENT_CONFIG.MAX_PLAYERS, `Maximum ${TOURNAMENT_CONFIG.MAX_PLAYERS} players allowed`),
  courtsCount: z.number()
    .min(TOURNAMENT_CONFIG.MIN_COURTS, `Minimum ${TOURNAMENT_CONFIG.MIN_COURTS} courts required`)
    .max(TOURNAMENT_CONFIG.MAX_COURTS, `Maximum ${TOURNAMENT_CONFIG.MAX_COURTS} courts allowed`),
  pointsPerMatch: z.number()
    .refine(
      value => (TOURNAMENT_CONFIG.POINTS_PER_MATCH_OPTIONS as readonly number[]).includes(value),
      "Points per match must be 16, 24, or 32",
    )
    .default(TOURNAMENT_CONFIG.DEFAULT_POINTS_PER_MATCH).optional(),
});

export const playersSchema = z.object({
  players: z.array(
    z.string()
      .min(TOURNAMENT_CONFIG.VALIDATION.MIN_PLAYER_NAME_LENGTH, "Player name is required")
      .max(TOURNAMENT_CONFIG.VALIDATION.MAX_PLAYER_NAME_LENGTH, "Player name too long")
      .transform(name => name.trim())
  )
    .min(TOURNAMENT_CONFIG.MIN_PLAYERS, `At least ${TOURNAMENT_CONFIG.MIN_PLAYERS} players required`)
    .max(TOURNAMENT_CONFIG.MAX_PLAYERS, `Maximum ${TOURNAMENT_CONFIG.MAX_PLAYERS} players allowed`)
    .refine(players => {
      const uniqueNames = new Set(players.map(p => p.toLowerCase()));
      return uniqueNames.size === players.length;
    }, { message: "All player names must be unique" }),
});

export type TournamentSetup = z.infer<typeof tournamentSetupSchema>;
export type Players = z.infer<typeof playersSchema>;

// Tournament schedule types
export interface Match {
  court: number;
  team1: [string, string];
  team2: [string, string];
  round: number;
  gameNumber: number;
  score?: MatchScore;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface MatchScore {
  team1Score: number;
  team2Score: number;
  isValid: boolean;
  totalPoints: number;
  validationErrors: readonly string[];
  sets?: SetScore[];
}

export interface SetScore {
  team1: number;
  team2: number;
}

export interface Round {
  round: number;
  matches: Match[];
}

export interface PlayerStats {
  player: string;
  matchesPlayed: number;
  matchesWon: number;
  setsWon: number;
  setsLost: number;
  pointsFor: number;
  pointsAgainst: number;
  winPercentage: number;
  totalPoints: number;
}
