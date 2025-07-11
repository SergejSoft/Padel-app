import { pgTable, text, serial, integer, json, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("organizer").notNull(), // 'admin', 'organizer'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date"),
  time: text("time"), // Format: "HH:MM"
  location: text("location"),
  playersCount: integer("players_count").notNull(),
  courtsCount: integer("courts_count").notNull(),
  pointsPerMatch: integer("points_per_match").notNull().default(16),
  players: json("players").$type<string[]>().notNull(),
  schedule: json("schedule").$type<any[]>().notNull(),
  results: json("results").$type<PlayerStats[]>(), // Final leaderboard results
  finalScores: json("final_scores").$type<any[]>(), // Match scores with results
  leaderboardId: text("leaderboard_id").unique(), // Unique ID for leaderboard access
  shareId: text("share_id").unique(),
  urlSlug: text("url_slug").unique(), // Custom friendly URL slug
  status: text("status").notNull().default("active"), // active, cancelled, past, completed
  organizerId: text("organizer_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"), // When tournament was completed
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;

// Import new foundation
import { TOURNAMENT_CONFIG } from './tournament-config';

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
  playersCount: z.number()
    .min(TOURNAMENT_CONFIG.MIN_PLAYERS, `Minimum ${TOURNAMENT_CONFIG.MIN_PLAYERS} players required`)
    .max(TOURNAMENT_CONFIG.MAX_PLAYERS, `Maximum ${TOURNAMENT_CONFIG.MAX_PLAYERS} players allowed`)
    .refine(count => count % 4 === 0, { message: "Player count must be divisible by 4 for proper team formation" }),
  courtsCount: z.number()
    .min(1, "At least 1 court is required")
    .max(TOURNAMENT_CONFIG.MAX_COURTS, `Maximum ${TOURNAMENT_CONFIG.MAX_COURTS} courts allowed`),
  pointsPerMatch: z.number()
    .min(TOURNAMENT_CONFIG.MIN_POINTS_PER_MATCH, `Minimum ${TOURNAMENT_CONFIG.MIN_POINTS_PER_MATCH} points per match`)
    .max(TOURNAMENT_CONFIG.MAX_POINTS_PER_MATCH, `Maximum ${TOURNAMENT_CONFIG.MAX_POINTS_PER_MATCH} points per match`)
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
