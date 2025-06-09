import {
  tournaments,
  users,
  type Tournament,
  type InsertTournament,
  type User,
  type UpsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Tournament operations
  getTournament(id: number): Promise<Tournament | undefined>;
  getTournamentByShareId(shareId: string): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  generateShareId(tournamentId: number): Promise<string>;
  getAllTournaments(): Promise<Tournament[]>;
  getTournamentsByOrganizer(organizerId: string): Promise<Tournament[]>;
  updateTournament(id: number, tournament: Partial<InsertTournament>): Promise<Tournament | undefined>;
  updateTournamentStatus(id: number, status: string): Promise<Tournament | undefined>;
  deleteTournament(id: number): Promise<boolean>;
  getTournamentOwnerId(id: number): Promise<string | null>;
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
    // Generate shareId immediately during creation to avoid duplicates
    const shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const [tournament] = await db
      .insert(tournaments)
      .values({
        ...insertTournament,
        shareId,
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

  async updateTournamentStatus(id: number, status: string): Promise<Tournament | undefined> {
    const [tournament] = await db
      .update(tournaments)
      .set({ status })
      .where(eq(tournaments.id, id))
      .returning();
    return tournament;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return await db.select().from(tournaments);
  }

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getTournamentsByOrganizer(organizerId: string): Promise<Tournament[]> {
    return db.select().from(tournaments).where(eq(tournaments.organizerId, organizerId));
  }

  async updateTournament(id: number, tournamentData: Partial<InsertTournament>): Promise<Tournament | undefined> {
    const [tournament] = await db
      .update(tournaments)
      .set({
        ...tournamentData,
        players: tournamentData.players as any,
        schedule: tournamentData.schedule as any,
      })
      .where(eq(tournaments.id, id))
      .returning();
    return tournament;
  }

  async deleteTournament(id: number): Promise<boolean> {
    const result = await db.delete(tournaments).where(eq(tournaments.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getTournamentOwnerId(id: number): Promise<string | null> {
    const [tournament] = await db
      .select({ organizerId: tournaments.organizerId })
      .from(tournaments)
      .where(eq(tournaments.id, id));
    return tournament?.organizerId || null;
  }
}

export const storage = new DatabaseStorage();
