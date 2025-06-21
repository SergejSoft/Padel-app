import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserPlus, UserMinus, Users, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tournament, TournamentParticipant } from "@shared/schema";

interface TournamentParticipantsModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TournamentParticipantsModal({ tournament, isOpen, onClose }: TournamentParticipantsModalProps) {
  const [newPlayerName, setNewPlayerName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: participantsData = [], isLoading } = useQuery({
    queryKey: [`/api/tournaments/${tournament?.id}/participants`],
    enabled: !!tournament?.id && isOpen,
  });

  const participants = participantsData as TournamentParticipant[];

  // Debug logging for participant count
  useEffect(() => {
    if (participants && participants.length >= 0) {
      console.log(`Participants for tournament ${tournament?.id}:`, participants);
      console.log(`Participant count: ${participants.length}`);
    }
  }, [participants, tournament?.id]);

  const addPlayerMutation = useMutation({
    mutationFn: async (playerName: string) => {
      console.log(`Adding player "${playerName}" to tournament ${tournament?.id}`);
      const response = await apiRequest("POST", `/api/tournaments/${tournament?.id}/add-player`, {
        playerName,
      });
      const result = await response.json();
      console.log('Add player response:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament?.id}/participants`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      setNewPlayerName("");
      toast({
        title: "Player added",
        description: "Player has been successfully added to the tournament.",
      });
    },
    onError: () => {
      toast({
        title: "Error adding player",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const removePlayerMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/tournaments/${tournament?.id}/participants/${userId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament?.id}/participants`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Player removed",
        description: "Player has been successfully removed from the tournament.",
      });
    },
    onError: () => {
      toast({
        title: "Error removing player",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const generateScheduleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/tournaments/${tournament?.id}/generate-schedule`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Schedule generated!",
        description: "Tournament schedule has been successfully created.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error generating schedule",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleAddPlayer = () => {
    if (newPlayerName.trim() && participants.length < 8) {
      addPlayerMutation.mutate(newPlayerName.trim());
    }
  };

  const canGenerateSchedule = participants.length === 8;
  const spotsRemaining = 8 - participants.length;

  if (!tournament) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Tournament Participants - {tournament.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tournament Info */}
          <div className="bg-muted rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-foreground">Date</div>
                <div className="text-muted-foreground">
                  {tournament.date ? new Date(tournament.date).toLocaleDateString() : 'No date set'}
                </div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground">Location</div>
                <div className="text-muted-foreground">{tournament.location}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground">Spots</div>
                <div className="text-muted-foreground">
                  {participants.length}/{tournament.playersCount}
                </div>
              </div>
            </div>
          </div>

          {/* Status Alert */}
          {spotsRemaining > 0 && (
            <Alert>
              <AlertDescription>
                {spotsRemaining} {spotsRemaining === 1 ? 'spot' : 'spots'} remaining. 
                {spotsRemaining === 1 ? ' Add one more player to generate the tournament schedule.' : ''}
              </AlertDescription>
            </Alert>
          )}

          {/* Add Player */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Enter player name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                disabled={participants.length >= 8}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              />
              <Button
                onClick={handleAddPlayer}
                disabled={!newPlayerName.trim() || participants.length >= 8 || addPlayerMutation.isPending}
              >
                {addPlayerMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Participants List */}
          <div className="space-y-3">
            <h3 className="font-semibold">Registered Players</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading participants...</span>
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No players registered yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{participant.playerName || participant.userId}</span>
                      <span className="text-sm text-muted-foreground">
                        Joined {participant.joinedAt ? new Date(participant.joinedAt).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePlayerMutation.mutate(participant.userId)}
                      disabled={removePlayerMutation.isPending}
                    >
                      {removePlayerMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserMinus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate Schedule Button */}
          {canGenerateSchedule && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-800">Ready to Generate Schedule!</h3>
                  <p className="text-sm text-green-600">All 8 players are registered. You can now create the tournament schedule.</p>
                </div>
                <Button
                  onClick={() => generateScheduleMutation.mutate()}
                  disabled={generateScheduleMutation.isPending}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {generateScheduleMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trophy className="w-4 h-4 mr-2" />
                  )}
                  Generate Schedule
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}