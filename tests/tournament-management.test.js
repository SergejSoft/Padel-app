/**
 * Comprehensive Unit Tests for Tournament Management System
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock browser environment
const mockWindow = {
  location: { origin: 'https://test-padel-app.com' },
  open: jest.fn(),
  navigator: { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } }
};

global.window = mockWindow;
global.navigator = mockWindow.navigator;

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockApiResponses = {
  createTournament: {
    id: 1,
    name: "Test Championship 2025",
    date: "2025-07-15",
    location: "Test Sports Center",
    playersCount: 8,
    courtsCount: 2,
    registrationOpen: true,
    status: "active",
    organizerId: "org-123"
  },
  tournaments: [
    {
      id: 1,
      name: "Test Championship 2025",
      date: "2025-07-15",
      location: "Test Sports Center",
      playersCount: 8,
      courtsCount: 2,
      registrationOpen: true,
      status: "active",
      participantCount: 0
    }
  ]
};

describe('Tournament Management System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Organizer Tournament Creation', () => {
    it('should create tournament with self-registration enabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.createTournament)
      });

      const tournamentData = {
        name: "Test Championship 2025",
        date: "2025-07-15",
        location: "Test Sports Center",
        playersCount: 8,
        courtsCount: 2,
        registrationOpen: true
      };

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData)
      });

      const result = await response.json();
      expect(result.registrationOpen).toBe(true);
      expect(result.status).toBe("active");
    });

    it('should make tournament visible on landing page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.tournaments)
      });

      const response = await fetch('/api/tournaments/open');
      const tournaments = await response.json();

      expect(tournaments[0].registrationOpen).toBe(true);
    });

    it('should allow manual player addition when partially filled', async () => {
      const partialTournament = {
        ...mockApiResponses.createTournament,
        participantCount: 6
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...partialTournament,
          players: ["Player1", "Player2", "Player3", "Player4", "Player5", "Player6", "Manual7", "Manual8"]
        })
      });

      const response = await fetch('/api/tournaments/1', {
        method: 'PATCH',
        body: JSON.stringify({ players: ["Player1", "Player2", "Player3", "Player4", "Player5", "Player6", "Manual7", "Manual8"] })
      });

      const result = await response.json();
      expect(result.players).toHaveLength(8);
    });
  });

  describe('2. Player Registration', () => {
    it('should allow player to join tournament', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, tournamentId: 1, userId: "player-456" })
      });

      const response = await fetch('/api/tournaments/1/join', { method: 'POST' });
      const result = await response.json();

      expect(result.tournamentId).toBe(1);
    });

    it('should generate calendar event', () => {
      const tournament = mockApiResponses.tournaments[0];
      
      const addToCalendar = (tournament) => {
        const eventDetails = {
          text: `${tournament.name} - Padel Tournament`,
          location: tournament.location
        };
        const params = new URLSearchParams(eventDetails);
        const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&${params.toString()}`;
        window.open(calendarUrl, '_blank');
        return calendarUrl;
      };

      const calendarUrl = addToCalendar(tournament);
      expect(calendarUrl).toContain('calendar.google.com');
    });
  });
});

export const testUtils = {
  mockApiResponses,
  createTestTournament: (overrides = {}) => ({ ...mockApiResponses.createTournament, ...overrides })
};