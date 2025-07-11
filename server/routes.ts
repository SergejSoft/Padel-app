import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertTournamentSchema } from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin, isOwnerOrAdmin } from "./replitAuth";
import { z } from "zod";

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
  app.get("/api/tournaments", async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        console.log('API: User not authenticated for tournaments endpoint');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.claims.sub;
      console.log(`API: Fetching tournaments for authenticated user: ${userId}`);
      
      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`API: User ${userId} not found in database, creating default organizer`);
        // Create user with organizer role if not exists
        const newUser = await storage.upsertUser({
          id: userId,
          email: req.user.claims.email || null,
          firstName: req.user.claims.first_name || null,
          lastName: req.user.claims.last_name || null,
          profileImageUrl: req.user.claims.profile_image_url || null,
          role: 'organizer'
        });
        console.log(`API: Created new user: ${newUser.id} with role ${newUser.role}`);
      }
      
      const finalUser = user || await storage.getUser(userId);
      console.log(`API: User found: ${finalUser?.id} with role ${finalUser?.role}`);
      
      let tournaments = await storage.getTournamentsByOrganizer(userId);
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

  // Update tournament scores (requires owner or admin)
  app.put("/api/tournaments/:id/scores", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentOwnerId(id);
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { gameNumber, team1Score, team2Score } = req.body;
      
      // Validate input
      if (!gameNumber || team1Score === undefined || team2Score === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Validate 16-point total
      if (team1Score + team2Score !== 16) {
        return res.status(400).json({ error: "Total score must equal 16 points" });
      }
      
      if (team1Score < 0 || team2Score < 0 || team1Score > 16 || team2Score > 16) {
        return res.status(400).json({ error: "Individual scores must be between 0 and 16" });
      }

      const userId = req.user.claims.sub;
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
    return await storage.getTournamentOwnerId(id);
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
      
      res.json(tournament);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Save tournament results
  app.patch("/api/tournaments/:id/results", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid tournament ID" });
      }

      const { results, schedule } = req.body;
      
      if (!results || !schedule) {
        return res.status(400).json({ error: "Results and schedule are required" });
      }

      // Check if user owns tournament or is admin
      const userId = req.user?.id;
      const tournamentOwnerId = await storage.getTournamentOwnerId(id);
      const user = await storage.getUser(userId!);
      
      if (tournamentOwnerId !== userId && user?.role !== 'admin') {
        return res.status(403).json({ error: "Not authorized to save results for this tournament" });
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

      if (tournament.status !== 'completed' || !tournament.results) {
        return res.status(404).json({ error: "Tournament results not available" });
      }
      
      res.json({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        tournamentDate: tournament.date,
        tournamentTime: tournament.time,
        tournamentLocation: tournament.location,
        results: tournament.results,
        finalScores: tournament.finalScores,
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
      
      // Return tournament with finalScores and results
      res.json({
        ...tournament,
        finalScores: tournament.finalScores || [],
        results: tournament.results || []
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Registration validation schemas
  const registrationParticipantSchema = z.object({
    name: z.string().min(1, "Name is required").max(50, "Name too long"),
    email: z.string().email("Invalid email").optional()
  });

  // === Self-Registration API Routes ===

  // Generate registration link (requires authentication)
  app.post("/api/tournaments/:id/registration", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentOwnerId(id);
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

  // Register participant (public endpoint)
  app.post("/api/registration/:registrationId/register", async (req, res) => {
    try {
      const { registrationId } = req.params;
      const validatedData = registrationParticipantSchema.parse(req.body);
      
      const participant = await storage.registerParticipant(registrationId, validatedData);
      
      if (!participant) {
        return res.status(400).json({ 
          error: "Registration failed. Tournament may be full, closed, or name already taken." 
        });
      }
      
      // Broadcast update to WebSocket clients
      broadcastRegistrationUpdate(registrationId, 'participant_registered', participant);
      
      res.json(participant);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Remove participant (organizer only)
  app.delete("/api/tournaments/:id/participants/:participantId", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentOwnerId(id);
  }), async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { participantId } = req.params;
      
      const success = await storage.removeParticipant(tournamentId, participantId);
      
      if (!success) {
        return res.status(404).json({ error: "Participant not found" });
      }
      
      // Get tournament registration ID for WebSocket broadcast
      const tournament = await storage.getTournament(tournamentId);
      if (tournament?.registrationId) {
        broadcastRegistrationUpdate(tournament.registrationId, 'participant_removed', { participantId });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update participant (organizer only)
  app.put("/api/tournaments/:id/participants/:participantId", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentOwnerId(id);
  }), async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { participantId } = req.params;
      const validatedData = registrationParticipantSchema.partial().parse(req.body);
      
      const updatedParticipant = await storage.updateParticipant(tournamentId, participantId, validatedData);
      
      if (!updatedParticipant) {
        return res.status(404).json({ error: "Participant not found" });
      }
      
      // Get tournament registration ID for WebSocket broadcast
      const tournament = await storage.getTournament(tournamentId);
      if (tournament?.registrationId) {
        broadcastRegistrationUpdate(tournament.registrationId, 'participant_updated', updatedParticipant);
      }
      
      res.json(updatedParticipant);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Convert registration to tournament (organizer only)
  app.post("/api/tournaments/:id/convert", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentOwnerId(id);
  }), async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      const tournament = await storage.convertRegistrationToTournament(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update registration status (organizer only)
  app.put("/api/tournaments/:id/registration-status", isAuthenticated, isOwnerOrAdmin(async (req) => {
    const id = parseInt(req.params.id);
    return await storage.getTournamentOwnerId(id);
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
      
      // Broadcast status update
      if (tournament.registrationId) {
        broadcastRegistrationUpdate(tournament.registrationId, 'status_updated', { status });
      }
      
      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // === WebSocket Integration ===

  // Create HTTP server
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store WebSocket connections by registration ID
  const registrationConnections = new Map<string, Set<WebSocket>>();
  
  wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'join_registration') {
          const { registrationId } = data;
          
          // Add connection to registration room
          if (!registrationConnections.has(registrationId)) {
            registrationConnections.set(registrationId, new Set());
          }
          registrationConnections.get(registrationId)?.add(ws);
          
          // Store registration ID on WebSocket for cleanup
          (ws as any).registrationId = registrationId;
          
          console.log(`Client joined registration room: ${registrationId}`);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Clean up connection from registration rooms
      const registrationId = (ws as any).registrationId;
      if (registrationId && registrationConnections.has(registrationId)) {
        registrationConnections.get(registrationId)?.delete(ws);
        if (registrationConnections.get(registrationId)?.size === 0) {
          registrationConnections.delete(registrationId);
        }
      }
      console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Function to broadcast registration updates
  function broadcastRegistrationUpdate(registrationId: string, eventType: string, data: any) {
    const connections = registrationConnections.get(registrationId);
    if (!connections) return;
    
    const message = JSON.stringify({
      type: eventType,
      registrationId,
      data,
      timestamp: new Date().toISOString()
    });
    
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
    
    console.log(`Broadcast to ${connections.size} clients: ${eventType} for ${registrationId}`);
  }
  
  return httpServer;
}
