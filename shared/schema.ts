import { pgTable, text, serial, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  playersCount: integer("players_count").notNull(),
  courtsCount: integer("courts_count").notNull(),
  players: json("players").$type<string[]>().notNull(),
  schedule: json("schedule").$type<any[]>().notNull(),
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
});

export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;

// Validation schemas
export const tournamentSetupSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
  playersCount: z.number().min(4, "Minimum 4 players required").max(16, "Maximum 16 players allowed"),
  courtsCount: z.number().min(1, "At least 1 court required").max(4, "Maximum 4 courts allowed"),
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
