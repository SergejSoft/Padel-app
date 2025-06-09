import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tournament, Round } from "@shared/schema";

interface TournamentViewModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TournamentViewModal({ tournament, isOpen, onClose }: TournamentViewModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    location: "",
  });
  const [players, setPlayers] = useState<string[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);

  // Reset form when tournament changes
  useEffect(() => {
    if (tournament) {
      setFormData({
        name: tournament.name,
        date: tournament.date || "",
        location: tournament.location || "",
      });
      
      if (tournament.players) {
        setPlayers(Array.isArray(tournament.players) ? tournament.players : JSON.parse(tournament.players));
      }
      
      if (tournament.schedule) {
        setRounds(Array.isArray(tournament.schedule) ? tournament.schedule : JSON.parse(tournament.schedule));
      }
    }
  }, [tournament]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!tournament) return;
      
      // Generate new schedule with updated player names
      const { generateAmericanFormat } = await import("@/lib/american-format");
      const newSchedule = generateAmericanFormat({
        players: players,
        courts: tournament.courtsCount,
      });
      
      console.log("Updated players:", players);
      console.log("Generated new schedule:", newSchedule);
      
      const response = await apiRequest("PUT", `/api/tournaments/${tournament.id}`, {
        name: formData.name,
        date: formData.date || null,
        location: formData.location || null,
        players: players,
        schedule: newSchedule,
      });
      return response.json();
    },
    onSuccess: (updatedTournament) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      
      // Force update local state with the new data immediately
      if (updatedTournament) {
        setFormData({
          name: updatedTournament.name || "",
          date: updatedTournament.date || "",
          location: updatedTournament.location || "",
        });
        setPlayers([...updatedTournament.players]);
        
        // Ensure schedule is properly updated with new player names
        if (updatedTournament.schedule) {
          const newSchedule = Array.isArray(updatedTournament.schedule) 
            ? updatedTournament.schedule 
            : JSON.parse(updatedTournament.schedule);
          setRounds([...newSchedule]);
        }
      }
      
      toast({
        title: "Tournament updated",
        description: "Player names and schedule have been updated successfully.",
      });
      setIsEditing(false);
      
      // Force a re-render by clearing and resetting tournament data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating tournament",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePlayerChange = (index: number, value: string) => {
    setPlayers(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Tournament name is required.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate();
  };

  const handleCancel = () => {
    // Reset form data to original tournament values
    if (tournament) {
      setFormData({
        name: tournament.name || "",
        date: tournament.date || "",
        location: tournament.location || "",
      });
      setPlayers(tournament.players || []);
      if (tournament.schedule) {
        setRounds(Array.isArray(tournament.schedule) ? tournament.schedule : JSON.parse(tournament.schedule));
      }
    }
    setIsEditing(false);
  };

  if (!tournament) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Tournament Details</span>
            <div className="flex gap-2 mr-6">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tournament Information */}
          <Card>
            <CardHeader>
              <CardTitle>Tournament Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name">Tournament Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Enter tournament name"
                    />
                  ) : (
                    <p className="text-sm font-medium mt-1">{tournament.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  {isEditing ? (
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleChange("date", e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-medium mt-1">
                      {tournament.date ? new Date(tournament.date).toLocaleDateString() : "Not set"}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  {isEditing ? (
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleChange("location", e.target.value)}
                      placeholder="Enter location"
                    />
                  ) : (
                    <p className="text-sm font-medium mt-1">{tournament.location || "Not set"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Players */}
          <Card>
            <CardHeader>
              <CardTitle>Players ({players.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {players.map((player, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center text-xs">
                      {index + 1}
                    </Badge>
                    {isEditing ? (
                      <Input
                        value={player}
                        onChange={(e) => handlePlayerChange(index, e.target.value)}
                        placeholder={`Player ${index + 1}`}
                        className="flex-1"
                      />
                    ) : (
                      <span className="flex-1 text-sm font-medium">{player}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tournament Schedule */}
          {rounds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tournament Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {rounds.map((round) => (
                    <div key={round.round}>
                      <h4 className="font-semibold mb-3">Round {round.round}</h4>
                      <div className="grid gap-3">
                        {round.matches.map((match, matchIndex) => (
                          <div
                            key={matchIndex}
                            className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                          >
                            <div className="flex items-center space-x-4">
                              <Badge variant="secondary">Court {match.court}</Badge>
                              <div className="text-sm">
                                <span className="font-medium">
                                  {match.team1[0]} & {match.team1[1]}
                                </span>
                                <span className="mx-2 text-muted-foreground">vs</span>
                                <span className="font-medium">
                                  {match.team2[0]} & {match.team2[1]}
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline">Game {match.gameNumber}</Badge>
                          </div>
                        ))}
                      </div>
                      {round.round < rounds.length && <Separator className="mt-6" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}