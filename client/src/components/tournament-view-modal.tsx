import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import RegistrationManagement from "./registration-management";
import type { Tournament, Round } from "@shared/schema";

interface TournamentViewModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TournamentViewModal({ tournament, isOpen, onClose }: TournamentViewModalProps) {
  if (!tournament) return null;

  const players: string[] = Array.isArray(tournament.players)
    ? tournament.players
    : JSON.parse(tournament.players as unknown as string);

  const rounds: Round[] = tournament.schedule
    ? (Array.isArray(tournament.schedule)
        ? tournament.schedule
        : JSON.parse(tournament.schedule as unknown as string))
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tournament Details</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Tournament Details</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="registration">Registration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6">
            {/* Tournament Information */}
            <Card>
              <CardHeader>
                <CardTitle>Tournament Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tournament Name</Label>
                    <p className="text-sm font-medium mt-1">{tournament.name}</p>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <p className="text-sm font-medium mt-1">
                      {tournament.date ? new Date(tournament.date).toLocaleDateString() : "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <p className="text-sm font-medium mt-1">{tournament.location || "Not set"}</p>
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
                      <span className="flex-1 text-sm font-medium">{player}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            {/* Tournament Schedule */}
            {rounds.length > 0 ? (
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
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">
                    No schedule available yet. Complete the tournament setup to generate the schedule.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="registration" className="space-y-6">
            <RegistrationManagement tournament={tournament} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
