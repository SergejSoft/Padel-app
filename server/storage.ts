import { tournaments, type Tournament, type InsertTournament } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getTournament(id: number): Promise<Tournament | undefined>;
  getTournamentByShareId(shareId: string): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  generateShareId(tournamentId: number): Promise<string>;
  getAllTournaments(): Promise<Tournament[]>;
}

export class DatabaseStorage implements IStorage {
  async getTournament(id: number): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return tournament || undefined;
  }

  async getTournamentByShareId(shareId: string): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.shareId, shareId));
    return tournament || undefined;
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const [tournament] = await db
      .insert(tournaments)
      .values({
        ...insertTournament,
        players: insertTournament.players as any,
        schedule: insertTournament.schedule as any,
      })
      .returning();
    return tournament;
  }

  async generateShareId(tournamentId: number): Promise<string> {
    const shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await db.update(tournaments).set({ shareId }).where(eq(tournaments.id, tournamentId));
    return shareId;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return await db.select().from(tournaments);
  }
}

export const storage = new DatabaseStorage();
