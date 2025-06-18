import { pgTable, text, serial, integer, json, timestamp, varchar, index, boolean } from "drizzle-orm/pg-core";
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
  role: varchar("role").default("player").notNull(), // 'admin', 'organizer', 'player'
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
  registrationOpen: text("registration_open").default("false").notNull(),
  organizerId: varchar("organizer_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tournament participants table to track player registrations
export const tournamentParticipants = pgTable("tournament_participants", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  // Unique constraint to prevent duplicate registrations
  index("unique_tournament_user").on(table.tournamentId, table.userId),
]);

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
});

export const insertTournamentParticipantSchema = createInsertSchema(tournamentParticipants).omit({
  id: true,
  joinedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournamentParticipant = z.infer<typeof insertTournamentParticipantSchema>;
export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;

// Validation schemas
export const tournamentSetupSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
  date: z.string().min(1, "Tournament date is required"),
  location: z.string().min(1, "Tournament location is required"),
  playersCount: z.literal(8, { errorMap: () => ({ message: "American format requires exactly 8 players" }) }),
  courtsCount: z.literal(2, { errorMap: () => ({ message: "American format requires exactly 2 courts" }) }),
  registrationOpen: z.boolean().optional().default(false),
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
}

export interface Round {
  round: number;
  matches: Match[];
}
