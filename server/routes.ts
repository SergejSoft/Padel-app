import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTournamentSchema, insertTournamentParticipantSchema } from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin, isOwnerOrAdmin } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Create tournament (requires authentication)
  app.post("/api/tournaments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Get open tournaments (must come before /:id route)
  app.get("/api/tournaments/open", async (req, res) => {
    try {
      console.log("Fetching open tournaments...");
      const openTournaments = await storage.getOpenTournaments();
      console.log("Open tournaments fetched:", openTournaments.length);
      res.json(openTournaments);
    } catch (error: any) {
      console.error("Error in /api/tournaments/open:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get tournament by ID
  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tournament = await storage.getTournament(id);
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(tournament);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get tournaments (role-based access)
  app.get("/api/tournaments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      let tournaments;
      if (user?.role === 'admin') {
        // Admin can see all tournaments
        tournaments = await storage.getAllTournaments();
      } else {
        // Organizers can only see their own tournaments
        tournaments = await storage.getTournamentsByOrganizer(userId);
      }
      res.json(tournaments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update tournament (owner or admin only)
  app.put("/api/tournaments/:id", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentOwnerId(parseInt(req.params.id));
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
    return await storage.getTournamentOwnerId(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, registrationOpen } = req.body;
      
      if (!['active', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'active' or 'cancelled'" });
      }
      
      // Update both status and registration open state
      let tournament = await storage.updateTournamentStatus(id, status);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      // If registrationOpen is provided, update that too
      if (typeof registrationOpen === 'boolean') {
        tournament = await storage.updateTournament(id, { registrationOpen });
      }
      
      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete tournament (owner or admin only)
  app.delete("/api/tournaments/:id", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentOwnerId(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTournament(id);
      
      if (!success) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json({ success: true });
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

  // Development helper: Mock login as different user types (remove in production)
  app.post("/api/dev/login", async (req: any, res) => {
    try {
      const { userType } = req.body; // 'admin', 'organizer', or 'player'
      
      let mockUser;
      switch (userType) {
        case 'admin':
          mockUser = {
            id: "mock-admin-123",
            email: "admin@test.com",
            firstName: "Admin",
            lastName: "User",
            profileImageUrl: null,
            role: "admin"
          };
          break;
        case 'organizer':
          mockUser = {
            id: "mock-organizer-456", 
            email: "organizer@test.com",
            firstName: "Tournament",
            lastName: "Organizer",
            profileImageUrl: null,
            role: "organizer"
          };
          break;
        case 'player':
        default:
          mockUser = {
            id: "mock-player-789",
            email: "player@test.com", 
            firstName: "Test",
            lastName: "Player",
            profileImageUrl: null,
            role: "player"
          };
          break;
      }
      
      // Create or update the mock user in database
      await storage.upsertUser(mockUser);
      
      // Create mock session data
      const mockSession = {
        claims: {
          sub: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.firstName,
          last_name: mockUser.lastName,
          profile_image_url: mockUser.profileImageUrl
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };
      
      // Store in session
      req.session.passport = { user: mockSession };
      
      res.json({ message: `Logged in as ${userType}`, user: mockUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Development helper: Make current user admin (remove in production) 
  app.post("/api/dev/make-admin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const updatedUser = await storage.upsertUser({
        ...user,
        role: "admin",
        updatedAt: new Date(),
      });
      
      res.json({ message: "You are now an admin", user: updatedUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get tournament participants
  app.get("/api/tournaments/:id/participants", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentOwnerId(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const participants = await storage.getTournamentParticipants(tournamentId);
      res.json(participants);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add player manually to tournament
  app.post("/api/tournaments/:id/add-player", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentOwnerId(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { playerName } = req.body;
      
      if (!playerName) {
        return res.status(400).json({ error: "Player name is required" });
      }

      // Check current participant count
      const participants = await storage.getTournamentParticipants(tournamentId);
      if (participants.length >= 8) {
        return res.status(400).json({ error: "Tournament is full" });
      }

      // Create a mock user entry for manually added players
      const mockUserId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const participant = await storage.joinTournament({
        tournamentId,
        userId: mockUserId,
        playerName,
      });
      
      res.json(participant);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove participant from tournament
  app.delete("/api/tournaments/:id/participants/:userId", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentOwnerId(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { userId } = req.params;
      
      const success = await storage.leaveTournament(tournamentId, userId);
      if (!success) {
        return res.status(404).json({ error: "Participant not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate schedule for tournament with participants
  app.post("/api/tournaments/:id/generate-schedule", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentOwnerId(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      // Get tournament and participants
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      const participants = await storage.getTournamentParticipants(tournamentId);
      if (participants.length !== 8) {
        return res.status(400).json({ error: "Exactly 8 players required to generate schedule" });
      }

      // Generate schedule with participant names
      const playerNames = participants.map(p => p.playerName || p.userId);
      // Note: Schedule generation would happen here using the American format algorithm
      // For now, we'll update the tournament with the player list
      
      const updatedTournament = await storage.updateTournament(tournamentId, {
        players: playerNames,
        // schedule would be generated here
      });
      
      res.json(updatedTournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Tournament participant routes
  app.post("/api/tournaments/:id/join", isAuthenticated, async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      if (isNaN(tournamentId)) {
        return res.status(400).json({ error: "Invalid tournament ID" });
      }

      // Check if tournament exists and is open for registration
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      if (!tournament.registrationOpen) {
        return res.status(400).json({ error: "Tournament is not open for registration" });
      }

      // Check if user is already registered
      const isAlreadyRegistered = await storage.isUserRegisteredInTournament(tournamentId, userId);
      if (isAlreadyRegistered) {
        return res.status(400).json({ error: "You are already registered for this tournament" });
      }

      // Check if tournament is full
      const participants = await storage.getTournamentParticipants(tournamentId);
      if (participants.length >= tournament.playersCount) {
        return res.status(400).json({ error: "Tournament is full" });
      }

      const participant = await storage.joinTournament({ tournamentId, userId });
      res.json(participant);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/tournaments/:id/leave", isAuthenticated, async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      if (isNaN(tournamentId)) {
        return res.status(400).json({ error: "Invalid tournament ID" });
      }

      const success = await storage.leaveTournament(tournamentId, userId);
      if (!success) {
        return res.status(404).json({ error: "Registration not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tournaments/:id/participants", async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      if (isNaN(tournamentId)) {
        return res.status(400).json({ error: "Invalid tournament ID" });
      }

      const participants = await storage.getTournamentParticipants(tournamentId);
      res.json(participants);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/user/tournaments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tournaments = await storage.getTournamentsByParticipant(userId);
      res.json(tournaments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate share ID for tournament
  app.post("/api/tournaments/:id/share", async (req, res) => {
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
      
      res.json(tournament);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
