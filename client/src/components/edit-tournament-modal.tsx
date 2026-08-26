import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateAmericanFormat } from "@/lib/american-format";
import { TOURNAMENT_CONFIG } from "@shared/tournament-config";
import type { Tournament } from "@shared/schema";

interface EditTournamentModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
}

// One row in the players editor. Registration-mode rows keep the participant id
// so we can diff against the server state on save.
interface EditablePlayer {
  participantId?: string;
  name: string;
}

function playersFromTournament(tournament: Tournament): EditablePlayer[] {
  if (tournament.tournamentMode === "registration") {
    return (tournament.registeredParticipants || []).map(p => ({
      participantId: p.id,
      name: p.name,
    }));
  }
  return (tournament.players || []).map(name => ({ name }));
}

export function EditTournamentModal({ tournament, isOpen, onClose }: EditTournamentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: tournament?.name || "",
    date: tournament?.date || "",
    location: tournament?.location || "",
  });
  const [players, setPlayers] = useState<EditablePlayer[]>(
    tournament ? playersFromTournament(tournament) : []
  );

  // Reset form when tournament changes
  useEffect(() => {
    if (tournament) {
      setFormData({
        name: tournament.name,
        date: tournament.date || "",
        location: tournament.location || "",
      });
      setPlayers(playersFromTournament(tournament));
    }
  }, [tournament]);

  const isRegistrationMode = tournament?.tournamentMode === "registration";

  const updateMutation = useMutation({
    mutationFn: async (data: { details: typeof formData; players: EditablePlayer[] }) => {
      if (!tournament) return;

      if (isRegistrationMode) {
        // Sync participant changes through the participant API
        const original = tournament.registeredParticipants || [];

        const removed = original.filter(
          o => !data.players.some(p => p.participantId === o.id)
        );
        const renamed = data.players.filter(p => {
          if (!p.participantId) return false;
          const before = original.find(o => o.id === p.participantId);
          return before && before.name !== p.name;
        });
        const added = data.players.filter(p => !p.participantId);

        for (const participant of removed) {
          await apiRequest(
            "DELETE",
            `/api/tournaments/${tournament.id}/participants/${participant.id}`
          );
        }
        for (const player of renamed) {
          await apiRequest(
            "PUT",
            `/api/tournaments/${tournament.id}/participants/${player.participantId}`,
            { name: player.name }
          );
        }
        for (const player of added) {
          await apiRequest(
            "POST",
            `/api/tournaments/${tournament.id}/participants`,
            { name: player.name }
          );
        }

        const response = await apiRequest("PUT", `/api/tournaments/${tournament.id}`, data.details);
        return response.json();
      }

      // Fixed mode: players live directly on the tournament
      const playerNames = data.players.map(p => p.name);
      const playersChanged =
        JSON.stringify(playerNames) !== JSON.stringify(tournament.players);

      const payload: Record<string, unknown> = { ...data.details, players: playerNames };

      if (playersChanged) {
        // Schedule references player names, so it must be regenerated
        payload.playersCount = playerNames.length;
        payload.schedule = generateAmericanFormat({
          players: playerNames,
          courts: tournament.courtsCount,
          pointsPerMatch: tournament.pointsPerMatch,
        });
      }

      const response = await apiRequest("PUT", `/api/tournaments/${tournament.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Tournament updated",
        description: "Tournament details have been successfully updated.",
      });
      onClose();
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Error updating tournament",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedPlayers = players.map(p => ({ ...p, name: p.name.trim() }));

    if (trimmedPlayers.some(p => !p.name)) {
      toast({
        title: "Invalid players",
        description: "Player names cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    const uniqueNames = new Set(trimmedPlayers.map(p => p.name.toLowerCase()));
    if (uniqueNames.size !== trimmedPlayers.length) {
      toast({
        title: "Invalid players",
        description: "All player names must be unique.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({ details: formData, players: trimmedPlayers });
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePlayerChange = (index: number, value: string) => {
    setPlayers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: value };
      return updated;
    });
  };

  const handleAddPlayer = () => {
    setPlayers(prev => [...prev, { name: "" }]);
  };

  const handleRemovePlayer = (index: number) => {
    setPlayers(prev => prev.filter((_, i) => i !== index));
  };

  if (!tournament) return null;

  const maxPlayers = isRegistrationMode
    ? tournament.maxParticipants || tournament.playersCount
    : TOURNAMENT_CONFIG.MAX_PLAYERS;
  const minPlayers = isRegistrationMode ? 0 : TOURNAMENT_CONFIG.MIN_PLAYERS;
  const canAddPlayer = players.length < maxPlayers;
  const canRemovePlayer = players.length > minPlayers;

  const originalPlayers = playersFromTournament(tournament);
  const playersChanged =
    JSON.stringify(players) !== JSON.stringify(originalPlayers);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tournament</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter tournament name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="Enter tournament location"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Players ({players.length}
                {isRegistrationMode ? ` / ${maxPlayers}` : ""})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPlayer}
                disabled={!canAddPlayer}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Add Player
              </Button>
            </div>
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No players yet. Use "Add Player" to add them manually
                {isRegistrationMode ? " or share the registration link." : "."}
              </p>
            ) : (
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div key={player.participantId ?? `new-${index}`} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 w-8">#{index + 1}</span>
                    <Input
                      value={player.name}
                      onChange={(e) => handlePlayerChange(index, e.target.value)}
                      placeholder={`Player ${index + 1} name`}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 shrink-0"
                      onClick={() => handleRemovePlayer(index)}
                      disabled={!canRemovePlayer}
                      title={
                        canRemovePlayer
                          ? "Remove player"
                          : `Minimum ${minPlayers} players required`
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {!isRegistrationMode && playersChanged && (
              <p className="text-xs text-amber-600">
                Changing players will regenerate the match schedule. Any scores
                already recorded may no longer match the new schedule.
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Tournament"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
