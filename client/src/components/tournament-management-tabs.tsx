import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, MapPin, Users, Download, Eye, CalendarPlus, Trophy } from "lucide-react";
import { Tournament } from "@shared/schema";
import padelIconPath from "@assets/Padel_1750333696869.png";

interface TournamentManagementTabsProps {
  className?: string;
}

export function TournamentManagementTabs({ className }: TournamentManagementTabsProps) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Get user's tournaments
  const { data: userTournaments = [], isLoading: isLoadingUserTournaments } = useQuery<Tournament[]>({
    queryKey: ["/api/user/tournaments"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Get open tournaments for joining
  const { data: openTournaments = [], isLoading: isLoadingOpen } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments/open"],
    retry: false,
  });

  // Join tournament mutation
  const joinTournament = useMutation({
    mutationFn: async (tournamentId: number) => {
      const response = await fetch(`/api/tournaments/${tournamentId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tournament Joined",
        description: "You have successfully joined the tournament!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments/open"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Join",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add to calendar function
  const addToCalendar = (tournament: Tournament) => {
    const startDate = tournament.date ? new Date(tournament.date) : new Date();
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 4); // Assume 4-hour tournament

    const eventDetails = {
      text: `${tournament.name} - Padel Tournament`,
      dates: `${formatDateForCalendar(startDate)}/${formatDateForCalendar(endDate)}`,
      details: `Padel Tournament: ${tournament.name}\nLocation: ${tournament.location}\nPlayers: ${tournament.playersCount}\nCourts: ${tournament.courtsCount}`,
      location: tournament.location || '',
      sprop: 'website:padel-scheduler.com'
    };

    const params = new URLSearchParams(eventDetails);
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&${params.toString()}`;
    
    window.open(googleCalendarUrl, '_blank');
    
    toast({
      title: "Calendar Event Created",
      description: "Tournament has been added to your calendar",
    });
  };

  const formatDateForCalendar = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const getTournamentStatus = (tournament: Tournament) => {
    const now = new Date();
    const tournamentDate = tournament.date ? new Date(tournament.date) : null;
    
    if (!tournamentDate) return { status: "pending", color: "gray" };
    
    if (tournamentDate < now) {
      return { status: "completed", color: "green" };
    } else if (tournamentDate > now) {
      return { status: "upcoming", color: "blue" };
    }
    return { status: "active", color: "yellow" };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date TBD";
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please log in to view tournaments</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Tabs defaultValue="my-tournaments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-tournaments" className="flex items-center gap-2">
            <img 
              src={padelIconPath} 
              alt="Padel Player" 
              className="w-4 h-4 object-contain"
            />
            My Tournaments
          </TabsTrigger>
          <TabsTrigger value="available">Available Tournaments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-tournaments" className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <img 
              src={padelIconPath} 
              alt="Padel Player" 
              className="w-8 h-8 object-contain"
            />
            <h2 className="text-2xl font-bold">My Tournaments</h2>
          </div>

          {isLoadingUserTournaments ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading your tournaments...</p>
            </div>
          ) : userTournaments.length === 0 ? (
            <div className="text-center py-12">
              <img 
                src={padelIconPath} 
                alt="Padel Player" 
                className="w-16 h-16 object-contain mx-auto mb-4 opacity-50"
              />
              <h3 className="text-lg font-semibold mb-2">No Tournaments Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't joined any tournaments yet. Browse available tournaments to get started!
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {userTournaments.map((tournament) => {
                const { status, color } = getTournamentStatus(tournament);
                
                return (
                  <Card key={tournament.id} className="border-l-4" style={{ borderLeftColor: color === "blue" ? "#3b82f6" : color === "green" ? "#10b981" : color === "yellow" ? "#f59e0b" : "#6b7280" }}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {tournament.name}
                            <Badge 
                              variant="outline" 
                              className={`
                                ${color === "blue" ? "text-blue-600 border-blue-600" : ""}
                                ${color === "green" ? "text-green-600 border-green-600" : ""}
                                ${color === "yellow" ? "text-yellow-600 border-yellow-600" : ""}
                                ${color === "gray" ? "text-gray-600 border-gray-600" : ""}
                              `}
                            >
                              {status}
                            </Badge>
                          </CardTitle>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(tournament.date)}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {tournament.location || "Location TBD"}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {tournament.playersCount} players
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addToCalendar(tournament)}
                        >
                          <CalendarPlus className="w-4 h-4 mr-2" />
                          Add to Calendar
                        </Button>
                        
                        {status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Tournament Results",
                                description: "View tournament results and final standings",
                              });
                            }}
                          >
                            <Trophy className="w-4 h-4 mr-2" />
                            View Results
                          </Button>
                        )}
                        
                        {(status === "upcoming" || status === "active") && tournament.schedule && tournament.schedule.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Download Schedule",
                                description: "Tournament schedule download will start",
                              });
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Schedule
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="available" className="space-y-4">
          <h2 className="text-2xl font-bold mb-6">Available Tournaments</h2>
          
          {isLoadingOpen ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading available tournaments...</p>
            </div>
          ) : openTournaments.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Open Tournaments</h3>
              <p className="text-muted-foreground">
                There are no tournaments open for registration at the moment.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {openTournaments.map((tournament) => (
                <Card key={tournament.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{tournament.name}</h3>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Open
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(tournament.date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {tournament.location || "Location TBD"}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Players: {(tournament as any).participantCount || 0}/{tournament.playersCount}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => joinTournament.mutate(tournament.id)}
                        disabled={joinTournament.isPending}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {joinTournament.isPending ? "Joining..." : "Join Tournament"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}