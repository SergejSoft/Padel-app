import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Archive,
  Ban,
  CalendarDays,
  Copy,
  Download,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  Trophy,
  UserPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getPublicAppUrl } from "@/lib/public-url";
import { generateAmericanFormat } from "@/lib/american-format";
import { generateTournamentPDF } from "@/lib/pdf-generator";
import RegistrationManagement from "@/components/registration-management";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TOURNAMENT_CONFIG } from "@shared/tournament-config";
import type { Round, Tournament } from "@shared/schema";

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
  const [, navigate] = useLocation();

  const [formData, setFormData] = useState({
    name: tournament?.name || "",
    date: tournament?.date || "",
    time: tournament?.time || "",
    location: tournament?.location || "",
    price: tournament?.price || "",
    currency: tournament?.currency || "EUR",
    pointsPerMatch: tournament?.pointsPerMatch || TOURNAMENT_CONFIG.DEFAULT_POINTS_PER_MATCH,
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
        time: tournament.time || "",
        location: tournament.location || "",
        price: tournament.price || "",
        currency: tournament.currency || "EUR",
        pointsPerMatch: tournament.pointsPerMatch,
      });
      setPlayers(playersFromTournament(tournament));
    }
  }, [tournament]);

  const isRegistrationMode = tournament?.tournamentMode === "registration";
  const hasSchedule = Array.isArray(tournament?.schedule) && tournament.schedule.length > 0;
  const hasRecordedScores = Array.isArray(tournament?.finalScores) && tournament.finalScores.length > 0;

  const actionMutation = useMutation({
    mutationFn: async ({ action }: { action: "active" | "cancelled" | "archived" }) => {
      if (!tournament) return;
      const response = action === "archived"
        ? await apiRequest("PATCH", `/api/tournaments/${tournament.id}/archive`, {})
        : await apiRequest("PATCH", `/api/tournaments/${tournament.id}/status`, { status: action });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: variables.action === "archived" ? "Tournament archived" : "Tournament status updated",
        description: variables.action === "archived"
          ? "The tournament remains safely stored in your archive."
          : `Tournament is now ${variables.action}.`,
      });
      if (variables.action === "archived") onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
    },
  });

  const regenerateScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!tournament || !hasSchedule || hasRecordedScores) return;

      const schedule = generateAmericanFormat({
        players: tournament.players,
        courts: tournament.courtsCount,
        pointsPerMatch: tournament.pointsPerMatch,
      });
      const response = await apiRequest("PUT", `/api/tournaments/${tournament.id}`, {
        schedule,
        finalScores: [],
        results: null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Schedule regenerated",
        description: "Pairings and sit-outs were rebuilt. Registrations were not changed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not regenerate schedule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
      const pointsChanged = data.details.pointsPerMatch !== tournament.pointsPerMatch;

      const payload: Record<string, unknown> = { ...data.details, players: playerNames };

      if (playersChanged || pointsChanged) {
        // Schedule references player names, so it must be regenerated
        payload.playersCount = playerNames.length;
        payload.schedule = generateAmericanFormat({
          players: playerNames,
          courts: tournament.courtsCount,
          pointsPerMatch: data.details.pointsPerMatch,
        });
        payload.finalScores = [];
        payload.results = null;
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

  // Registration link while sign-ups are open; the schedule page once the
  // tournament has been converted (registrationId is kept for history).
  const publicPath = tournament
    ? tournament.registrationId && tournament.tournamentMode === "registration"
      ? `/register/${tournament.registrationId}`
      : `/shared/${tournament.urlSlug || tournament.shareId}`
    : "/";

  const copyTournamentLink = async () => {
    if (!tournament) return;
    await navigator.clipboard.writeText(`${getPublicAppUrl()}${publicPath}`);
    toast({ title: "Link copied", description: "Tournament link copied to clipboard." });
  };

  const downloadSchedulePDF = () => {
    if (!tournament || !hasSchedule) return;
    const rounds = tournament.schedule as Round[];
    const pdf = generateTournamentPDF({
      tournamentName: tournament.name,
      tournamentDate: tournament.date ?? "",
      tournamentLocation: tournament.location ?? "",
      playersCount: tournament.playersCount,
      courtsCount: tournament.courtsCount,
      pointsPerMatch: tournament.pointsPerMatch,
      rounds,
      players: tournament.players ?? [],
    });
    pdf.save(`${tournament.name.replace(/\s+/g, "_")}_schedule.pdf`);
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
      <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Manage Tournament</DialogTitle>
        </DialogHeader>

        <section className="rounded-lg border bg-muted/30 p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            <Button type="button" variant="outline" onClick={copyTournamentLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy link
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(publicPath)}>
              <CalendarDays className="mr-2 h-4 w-4" />
              {hasSchedule ? "Open schedule" : "Preview"}
            </Button>
            {hasSchedule && (
              <Button type="button" variant="outline" onClick={downloadSchedulePDF}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            )}
            {hasSchedule && !isRegistrationMode && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={hasRecordedScores || regenerateScheduleMutation.isPending}
                    title={hasRecordedScores ? "Scores already recorded" : "Generate new pairings and sit-outs"}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate schedule
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate the match schedule?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will replace the current round-by-round pairings and sit-outs.
                      The number of rounds may change to give every player an equal number
                      of games. All registrations remain untouched.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep current schedule</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => regenerateScheduleMutation.mutate()}
                    >
                      Regenerate schedule
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {tournament.leaderboardId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/leaderboard/${tournament.leaderboardId}`)}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </Button>
            )}
            {tournament.status === "cancelled" ? (
              <Button
                type="button"
                variant="outline"
                disabled={actionMutation.isPending}
                onClick={() => actionMutation.mutate({ action: "active" })}
              >
                <Play className="mr-2 h-4 w-4" />
                Activate
              </Button>
            ) : tournament.status !== "archived" && tournament.status !== "completed" ? (
              <Button
                type="button"
                variant="outline"
                disabled={actionMutation.isPending}
                onClick={() => actionMutation.mutate({ action: "cancelled" })}
              >
                <Ban className="mr-2 h-4 w-4" />
                Cancel tournament
              </Button>
            ) : null}
            {tournament.status === "archived" && (
              <Button
                type="button"
                variant="outline"
                disabled={actionMutation.isPending}
                onClick={() => actionMutation.mutate({ action: "active" })}
              >
                <Play className="mr-2 h-4 w-4" />
                Restore
              </Button>
            )}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="Enter tournament location"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
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
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleChange("time", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points-per-match">Total points per match</Label>
              <Select
                value={String(formData.pointsPerMatch)}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  pointsPerMatch: Number(value),
                }))}
              >
                <SelectTrigger id="points-per-match">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOURNAMENT_CONFIG.POINTS_PER_MATCH_OPTIONS.map(points => (
                    <SelectItem key={points} value={String(points)}>
                      {points} points
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_7rem] gap-4 md:max-w-md">
            <div className="space-y-2">
              <Label htmlFor="price">Tournament price (optional)</Label>
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleChange("currency", value)}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-x-6">
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

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
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

        {isRegistrationMode && (
          <section className="border-t pt-5">
            <RegistrationManagement tournament={tournament} />
          </section>
        )}

        {tournament.status !== "archived" && (
        <section className="border-t pt-5">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" className="w-full text-amber-700 sm:w-auto">
                <Archive className="mr-2 h-4 w-4" />
                Archive tournament
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive {tournament.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  The tournament and all scores will remain stored. You can restore it later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep tournament</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => actionMutation.mutate({ action: "archived" })}
                >
                  Archive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
