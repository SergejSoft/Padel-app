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
  location: text("location"),
  playersCount: integer("players_count").notNull(),
  courtsCount: integer("courts_count").notNull(),
  players: json("players").$type<string[]>().notNull(),
  schedule: json("schedule").$type<any[]>().notNull(),
  shareId: text("share_id").unique(),
  urlSlug: text("url_slug").unique(), // Custom friendly URL slug
  status: text("status").notNull().default("active"), // active, cancelled, past
  organizerId: varchar("organizer_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;

// Validation schemas
export const tournamentSetupSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
  date: z.string().min(1, "Tournament date is required"),
  location: z.string().min(1, "Tournament location is required"),
  playersCount: z.literal(8, { errorMap: () => ({ message: "American format requires exactly 8 players" }) }),
  courtsCount: z.literal(2, { errorMap: () => ({ message: "American format requires exactly 2 courts" }) }),
});

export const playersSchema = z.object({
  players: z.array(z.string().min(1, "Player name is required")).min(4, "At least 4 players required"),
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
