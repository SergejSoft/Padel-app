import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Clock, MapPin, Users, Download, Eye, CalendarPlus } from "lucide-react";
import { Tournament } from "@shared/schema";
import padelIconPath from "@assets/Padel_1750333696869.png";

interface MyTournamentsTabProps {
  className?: string;
}

export function MyTournamentsTab({ className }: MyTournamentsTabProps) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Get user's tournaments
  const { data: userTournaments = [], isLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/user/tournaments"],
    enabled: isAuthenticated,
    retry: false,
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

    // Create Google Calendar URL
    const params = new URLSearchParams(eventDetails);
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&${params.toString()}`;
    
    // Open Google Calendar in new tab
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
        <p className="text-muted-foreground">Please log in to view your tournaments</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading your tournaments...</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-6">
        <img 
          src={padelIconPath} 
          alt="Padel Player" 
          className="w-8 h-8 object-contain"
        />
        <h2 className="text-2xl font-bold">My Tournaments</h2>
      </div>

      {userTournaments.length === 0 ? (
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
                          // TODO: Implement tournament details view
                          toast({
                            title: "Tournament Details",
                            description: "View tournament results and schedule",
                          });
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Results
                      </Button>
                    )}
                    
                    {(status === "upcoming" || status === "active") && tournament.schedule && tournament.schedule.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Implement schedule download
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
    </div>
  );
}