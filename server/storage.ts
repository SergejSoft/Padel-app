import { tournaments, type Tournament, type InsertTournament } from "@shared/schema";

export interface IStorage {
  getTournament(id: number): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  getAllTournaments(): Promise<Tournament[]>;
}

export class MemStorage implements IStorage {
  private tournaments: Map<number, Tournament>;
  private currentId: number;

  constructor() {
    this.tournaments = new Map();
    this.currentId = 1;
  }

  async getTournament(id: number): Promise<Tournament | undefined> {
    return this.tournaments.get(id);
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const id = this.currentId++;
    const tournament: Tournament = { ...insertTournament, id };
    this.tournaments.set(id, tournament);
    return tournament;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return Array.from(this.tournaments.values());
  }
}

export const storage = new MemStorage();
