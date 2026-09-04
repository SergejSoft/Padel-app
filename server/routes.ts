import type { Express } from "express";
import { storage } from "./storage.js";
import { insertTournamentSchema } from "../shared/schema.js";
import { setupAuth, getUserId, isAuthenticated, isAdmin, isOrganizer, isOwnerOrAdmin } from "./clerkAuth.js";
import { clerkClient } from "@clerk/express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { isRegisteredParticipant } from "./participant-query.js";
import { TOURNAMENT_CONFIG } from "../shared/tournament-config.js";

const registrationRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please wait a minute and try again." },
});

function toPublicTournament(tournament: any) {
  const {
    organizerId: _organizerId,
    coOrganizerId: _coOrganizerId,
    coOrganizerEmail: _coOrganizerEmail,
    registeredParticipants,
    finalScores,
    ...publicTournament
  } = tournament;

  return {
    ...publicTournament,
    registeredParticipants: (registeredParticipants ?? []).map(
      ({ email: _email, userId: _userId, ...participant }: any) => participant,
    ),
    finalScores: (finalScores ?? []).map(({ updatedBy: _updatedBy, ...score }: any) => score),
  };
}

async function getOrCreateUser(userId: string) {
  const existing = await storage.getUser(userId);
  if (existing) return storage.claimCoOrganizerByEmail(existing);

  const clerkUser = await clerkClient.users.getUser(userId);
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;

  // A user who existed under a previous Clerk instance (e.g. after the
  // dev -> production migration) signs in with a new Clerk ID but the same
  // email. Adopt the new ID so their role, rating, tournaments, and
  // registrations carry over instead of crashing on the unique email.
  if (email) {
    const sameEmailUser = await storage.getUserByEmail(email);
    if (sameEmailUser && sameEmailUser.id !== userId) {
      return storage.claimCoOrganizerByEmail(await storage.migrateUserId(sameEmailUser.id, userId, {
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        profileImageUrl: clerkUser.imageUrl,
      }));
    }
  }

  const created = await storage.upsertUser({
    id: userId,
    email,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    profileImageUrl: clerkUser.imageUrl,
  });
  return storage.claimCoOrganizerByEmail(created);
}

async function canManageTournament(req: any, tournament: any): Promise<boolean> {
  const userId = getUserId(req);
  if (!userId) return false;
  if (isTournamentManager(tournament, userId, (await storage.getUser(userId))?.email)) return true;
  return (await storage.getUser(userId))?.role === "admin";
}

function isTournamentManager(
  tournament: any,
  userId: string,
  email?: string | null,
): boolean {
  if (tournament.organizerId === userId || tournament.coOrganizerId === userId) return true;
  const normalizedEmail = email?.trim().toLowerCase();
  return !!normalizedEmail && tournament.coOrganizerEmail?.trim().toLowerCase() === normalizedEmail;
}

type TournamentAccess =
  | { canView: true; canEdit: boolean }
  | { canView: false; canEdit: false; status: 401 | 403; code: "sign_in_required" | "not_participant" };

/**
 * Schedules, scores and results are visible only to the organizer, admins,
 * and signed-in players who hold a registration in that tournament.
 */
async function getTournamentAccess(req: any, tournament: any): Promise<TournamentAccess> {
  const userId = getUserId(req);
  if (!userId) return { canView: false, canEdit: false, status: 401, code: "sign_in_required" };

  if (isTournamentManager(tournament, userId)) return { canView: true, canEdit: true };

  // First visit after sign-in may land here before /api/auth/user has synced
  // the profile; resolve the user (and their email) rather than treating a
  // registered player as a stranger.
  const user = await getOrCreateUser(userId);
  if (user.role === "admin") return { canView: true, canEdit: true };
  if (isTournamentManager(tournament, userId, user.email)) return { canView: true, canEdit: true };

  if (isRegisteredParticipant(tournament.registeredParticipants, userId, user.email)) {
    return { canView: true, canEdit: false };
  }

  return { canView: false, canEdit: false, status: 403, code: "not_participant" };
}

/** Sends the access-denied response; the body carries only the tournament name. */
function denyTournamentAccess(res: any, access: Extract<TournamentAccess, { canView: false }>, tournament: any) {
  const message = access.code === "sign_in_required"
    ? "Sign in to view this tournament"
    : "Only players registered in this tournament, its organizer, and admins can view it";
  return res.status(access.status).json({ error: message, code: access.code, tournamentName: tournament.name });
}

export async function registerRoutes(app: Express): Promise<void> {
  // Setup authentication middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req)!;
      const user = await getOrCreateUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/become-organizer', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req)!;
      const user = await getOrCreateUser(userId);

      if (user.role === "organizer" || user.role === "admin") {
        return res.json({ message: "Organizer access already enabled", user });
      }

      const updatedUser = await storage.setUserRole(userId, "organizer");
      res.json({ message: "Organizer access enabled", user: updatedUser });
    } catch (error: any) {
      console.error("Error enabling organizer access:", error);
      res.status(500).json({ message: "Failed to enable organizer access" });
    }
  });

  app.patch('/api/auth/profile', isAuthenticated, async (req: any, res) => {
    try {
      const { playtomicRating } = z.object({
        playtomicRating: z.number().min(0).max(7).nullable(),
      }).parse(req.body);
      const user = await storage.updateUserProfile(getUserId(req)!, { playtomicRating });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.issues?.[0]?.message ?? "Invalid profile" });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/my/registrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req)!;
      const user = await getOrCreateUser(userId);
      const joinedTournaments = await storage.getTournamentsByParticipant(userId, user.email);
      res.json(joinedTournaments);
    } catch (error: any) {
      console.error("Error fetching joined tournaments:", error);
      res.status(500).json({ message: "Failed to fetch joined tournaments" });
    }
  });

  // Public, privacy-safe list for the landing page.
  app.get("/api/public/upcoming-tournaments", async (_req, res) => {
    try {
      const upcomingTournaments = await storage.getUpcomingOpenTournaments();
      res.json(upcomingTournaments);
    } catch (error) {
      console.error("Error fetching upcoming tournaments:", error);
      res.status(500).json({ message: "Failed to fetch upcoming tournaments" });
    }
  });

  // Create tournament (organizer or admin only)
  app.post("/api/tournaments", isAuthenticated, isOrganizer, async (req: any, res) => {
    try {
      const userId = getUserId(req)!;
      const validatedData = insertTournamentSchema.parse({
        ...req.body,
        organizerId: userId,
      });
      const tournament = await storage.createTournament(validatedData);
      res.json(tournament);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get tournament by ID (owner or admin only)
  app.get("/api/tournaments/:id", isOwnerOrAdmin(async (req) => {
    return storage.getTournamentManagerIds(parseInt(req.params.id));
  }), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tournament = await storage.getTournament(id);
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json({
        ...toPublicTournament(tournament),
        canEdit: await canManageTournament(req, tournament),
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get tournaments (role-based access)  
  app.get("/api/tournaments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req)!;
      console.log(`API: Fetching tournaments for authenticated user: ${userId}`);
      
      const finalUser = await getOrCreateUser(userId);
      console.log(`API: User found: ${finalUser?.id} with role ${finalUser?.role}`);
      
      let tournaments = await storage.getTournamentsForManager(userId, finalUser.email);
      console.log(`API: User ${userId} owns ${tournaments.length} tournaments`);
      
      // If admin, also include all other tournaments
      if (finalUser?.role === 'admin') {
        const allTournaments = await storage.getAllTournaments();
        const ownTournamentIds = new Set(tournaments.map(t => t.id));
        const otherTournaments = allTournaments.filter(t => !ownTournamentIds.has(t.id));
        tournaments = [...tournaments, ...otherTournaments];
        console.log(`API: Admin user now has ${tournaments.length} total tournaments`);
      }
      
      console.log(`API: Returning ${tournaments.length} tournaments`);
      res.json(tournaments);
    } catch (error: any) {
      console.error('API Error fetching tournaments:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({ error: error.message });
    }
  });

  // Update tournament (owner or admin only)
  app.put("/api/tournaments/:id", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentManagerIds(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTournamentSchema.partial().parse(req.body);
      const tournament = await storage.updateTournament(id, validatedData);
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(tournament);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update tournament status (cancel/activate)
  app.patch("/api/tournaments/:id/status", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentManagerIds(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['active', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'active' or 'cancelled'" });
      }
      
      const tournament = await storage.updateTournamentStatus(id, status);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Backward-compatible archive endpoint. Tournaments are never hard-deleted.
  app.delete("/api/tournaments/:id", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentManagerIds(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);

      // Deleting archives by default so tournament history is never lost.
      // `?permanent=true` removes the row for good, but only once it has
      // already been archived (two-step safety); used by test cleanup.
      if (req.query.permanent === "true") {
        const existing = await storage.getTournament(id);
        if (!existing) return res.status(404).json({ error: "Tournament not found" });
        if (existing.status !== TOURNAMENT_CONFIG.STATUS.ARCHIVED) {
          return res.status(409).json({ error: "Archive the tournament before deleting it permanently" });
        }
        await storage.deleteTournamentPermanently(id);
        return res.status(204).end();
      }

      const tournament = await storage.archiveTournament(id);
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tournaments/:id/archive", isOwnerOrAdmin(async (req: any) => {
    return storage.getTournamentManagerIds(parseInt(req.params.id));
  }), async (req, res) => {
    try {
      const tournament = await storage.archiveTournament(parseInt(req.params.id));
      if (!tournament) return res.status(404).json({ error: "Tournament not found" });
      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin routes
  app.post("/api/admin/promote-user", isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.body;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const updatedUser = await storage.upsertUser({
        ...user,
        role: "admin",
        updatedAt: new Date(),
      });
      
      res.json({ message: "User promoted to admin", user: updatedUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/users", isAdmin, async (req: any, res) => {
    try {
      // For now, return empty array - would need to implement getAllUsers in storage
      res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate share ID for tournament
  app.post("/api/tournaments/:id/share", isOwnerOrAdmin(async (req) => {
    return storage.getTournamentManagerIds(parseInt(req.params.id));
  }), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid tournament ID" });
      }
      
      const shareId = await storage.generateShareId(id);
      const tournament = await storage.getTournament(id);
      res.json({ 
        shareId, 
        urlSlug: tournament?.urlSlug 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update tournament scores (requires owner or admin)
  app.put("/api/tournaments/:id/scores", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentManagerIds(id);
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { gameNumber, team1Score, team2Score } = req.body;
      const tournament = await storage.getTournament(id);

      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      // Validate input
      if (!gameNumber || team1Score === undefined || team2Score === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const pointsPerMatch = tournament.pointsPerMatch;
      if (team1Score + team2Score !== pointsPerMatch) {
        return res.status(400).json({ error: `Total score must equal ${pointsPerMatch} points` });
      }
      
      if (team1Score < 0 || team2Score < 0 || team1Score > pointsPerMatch || team2Score > pointsPerMatch) {
        return res.status(400).json({ error: `Individual scores must be between 0 and ${pointsPerMatch}` });
      }

      const userId = getUserId(req)!;
      const updatedTournament = await storage.updateTournamentScores(id, gameNumber, team1Score, team2Score, userId);
      
      if (!updatedTournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(updatedTournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Complete tournament and generate final leaderboard (requires owner or admin)
  app.post("/api/tournaments/:id/complete", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentManagerIds(id);
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { finalResults } = req.body;
      
      if (!finalResults || !Array.isArray(finalResults)) {
        return res.status(400).json({ error: "Final results array is required" });
      }

      const updatedTournament = await storage.completeTournament(id, finalResults);
      
      if (!updatedTournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(updatedTournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get tournament by share ID or URL slug
  app.get("/api/shared/:identifier", async (req, res) => {
    try {
      const { identifier } = req.params;
      
      // Try to find by shareId first, then by urlSlug
      let tournament = await storage.getTournamentByShareId(identifier);
      if (!tournament) {
        tournament = await storage.getTournamentByUrlSlug(identifier);
      }
      
      if (!tournament) {
        return res.status(404).json({ error: "Shared tournament not found" });
      }

      const access = await getTournamentAccess(req, tournament);
      if (!access.canView) return denyTournamentAccess(res, access, tournament);
      
      res.json({
        ...toPublicTournament(tournament),
        canEdit: access.canEdit,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Save tournament results
  app.patch("/api/tournaments/:id/results", isOwnerOrAdmin(async (req) => {
    return storage.getTournamentManagerIds(parseInt(req.params.id));
  }), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid tournament ID" });
      }

      const { results, schedule } = req.body;
      
      if (!results || !schedule) {
        return res.status(400).json({ error: "Results and schedule are required" });
      }

      const tournament = await storage.updateTournamentResults(id, results, schedule);
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get tournament leaderboard by leaderboard ID
  app.get("/api/leaderboard/:leaderboardId", async (req, res) => {
    try {
      const { leaderboardId } = req.params;
      
      const tournament = await storage.getTournamentByLeaderboardId(leaderboardId);
      
      if (!tournament) {
        return res.status(404).json({ error: "Leaderboard not found" });
      }

      const access = await getTournamentAccess(req, tournament);
      if (!access.canView) return denyTournamentAccess(res, access, tournament);

      if (tournament.status !== 'completed' || !tournament.results) {
        return res.status(404).json({ error: "Tournament results not available" });
      }

      const publicTournament = toPublicTournament(tournament);
      
      res.json({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        tournamentDate: tournament.date,
        tournamentTime: tournament.time,
        tournamentLocation: tournament.location,
        courtsCount: tournament.courtsCount,
        pointsPerMatch: tournament.pointsPerMatch,
        results: tournament.results,
        finalScores: publicTournament.finalScores,
        completedAt: tournament.completedAt,
        status: tournament.status
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get tournament scores page (public access)
  app.get("/api/shared/:identifier/scores", async (req, res) => {
    try {
      const { identifier } = req.params;
      
      // Try to find by shareId first, then by urlSlug
      let tournament = await storage.getTournamentByShareId(identifier);
      if (!tournament) {
        tournament = await storage.getTournamentByUrlSlug(identifier);
      }
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      const access = await getTournamentAccess(req, tournament);
      if (!access.canView) return denyTournamentAccess(res, access, tournament);
      
      // Return tournament with finalScores and results
      res.json({
        ...toPublicTournament({
          ...tournament,
          finalScores: tournament.finalScores || [],
          results: tournament.results || []
        }),
        canEdit: access.canEdit,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Registration validation schemas
  const registrationParticipantSchema = z.object({
    name: z.string().min(1, "Name is required").max(50, "Name too long"),
    email: z.string().email("Invalid email").optional(),
    playtomicRating: z.number().min(0, "Rating cannot be below 0").max(7, "Rating cannot exceed 7").nullable().optional(),
  });

  // === Self-Registration API Routes ===

  // Generate registration link (requires authentication)
  app.post("/api/tournaments/:id/registration", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentManagerIds(id);
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { maxParticipants, registrationDeadline } = req.body;
      
      // Update tournament for registration mode
      const tournament = await storage.getTournament(id);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      // Generate registration ID
      const registrationId = await storage.generateRegistrationId(id);
      
      // Update tournament with registration settings
      const updatedTournament = await storage.updateTournament(id, {
        tournamentMode: 'registration',
        maxParticipants: maxParticipants || tournament.playersCount,
        registrationStatus: 'open',
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null
      });
      
      res.json({ 
        registrationId, 
        registrationUrl: `/register/${registrationId}`,
        tournament: updatedTournament 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get registration info (public endpoint)
  app.get("/api/registration/:registrationId", async (req, res) => {
    try {
      const { registrationId } = req.params;
      
      const registrationInfo = await storage.getRegistrationInfo(registrationId);
      
      if (!registrationInfo) {
        return res.status(404).json({ error: "Registration not found" });
      }
      
      res.json(registrationInfo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get registered participants (public endpoint)
  app.get("/api/registration/:registrationId/participants", async (req, res) => {
    try {
      const { registrationId } = req.params;
      
      const tournament = await storage.getTournamentByRegistrationId(registrationId);
      
      if (!tournament) {
        return res.status(404).json({ error: "Registration not found" });
      }
      
      const participants = tournament.registeredParticipants || [];
      
      res.json({
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          playtomicRating: p.playtomicRating,
          registeredAt: p.registeredAt,
          status: p.status
        })), // Remove email for privacy
        count: participants.length,
        maxParticipants: tournament.maxParticipants || tournament.playersCount
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Register participant (sign-in required; tournament preview remains public)
  app.post("/api/registration/:registrationId/register", registrationRateLimit, isAuthenticated, async (req, res) => {
    try {
      const { registrationId } = req.params;
      const validatedData = registrationParticipantSchema.parse(req.body);
      const userId = getUserId(req)!;
      const user = await getOrCreateUser(userId);
      const participant = await storage.registerParticipant(registrationId, {
        ...validatedData,
        email: validatedData.email ?? user?.email ?? undefined,
        userId,
      });
      
      if (!participant) {
        return res.status(400).json({ 
          error: "Registration failed. Tournament may be full, closed, or name already taken." 
        });
      }

      if (validatedData.playtomicRating !== undefined) {
        await storage.updateUserProfile(userId, { playtomicRating: validatedData.playtomicRating });
      }
      
      // Real-time updates handled by client polling
      
      res.json(participant);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.issues?.[0]?.message ?? "Invalid registration" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Add participant manually (organizer only)
  app.post("/api/tournaments/:id/participants", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentManagerIds(id);
  }), async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const validatedData = registrationParticipantSchema.parse(req.body);

      const participant = await storage.addParticipantAsOrganizer(tournamentId, validatedData);

      res.json(participant);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.issues?.[0]?.message ?? "Invalid participant" });
      }
      if (error.message === "Tournament not found") {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // Remove participant (organizer only)
  app.delete("/api/tournaments/:id/participants/:participantId", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentManagerIds(id);
  }), async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { participantId } = req.params;
      
      const success = await storage.removeParticipant(tournamentId, participantId);
      
      if (!success) {
        return res.status(404).json({ error: "Participant not found" });
      }
      
      // Real-time updates handled by client polling
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update participant (organizer only)
  app.put("/api/tournaments/:id/participants/:participantId", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentManagerIds(id);
  }), async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { participantId } = req.params;
      const validatedData = registrationParticipantSchema.partial().parse(req.body);
      
      const updatedParticipant = await storage.updateParticipant(tournamentId, participantId, validatedData);
      
      if (!updatedParticipant) {
        return res.status(404).json({ error: "Participant not found" });
      }
      
      // Real-time updates handled by client polling
      
      res.json(updatedParticipant);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.issues?.[0]?.message ?? "Invalid participant update" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Convert registration to tournament (organizer only)
  app.post("/api/tournaments/:id/convert", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentManagerIds(id);
  }), async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      const tournament = await storage.convertRegistrationToTournament(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(tournament);
    } catch (error: any) {
      // Refusing to convert (already scheduled / too few players) is a
      // conflict with the current state, not a server failure.
      res.status(409).json({ error: error.message });
    }
  });

  // Update registration status (organizer only)
  app.put("/api/tournaments/:id/registration-status", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentManagerIds(id);
  }), async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['open', 'closed', 'full'].includes(status)) {
        return res.status(400).json({ error: "Invalid registration status" });
      }
      
      const tournament = await storage.updateRegistrationStatus(tournamentId, status);
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      // Real-time updates handled by client polling
      
      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


}
