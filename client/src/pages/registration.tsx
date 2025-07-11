import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { RegistrationInfo, RegisteredParticipant } from '@shared/schema';

interface RegistrationPageProps {
  registrationId: string;
}

interface ParticipantsResponse {
  participants: RegisteredParticipant[];
  count: number;
  maxParticipants: number;
}

export default function RegistrationPage() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!registrationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Registration Not Found</CardTitle>
            <CardDescription>Invalid registration link</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Fetch registration info
  const { data: registrationInfo, isLoading: infoLoading } = useQuery<RegistrationInfo>({
    queryKey: ['registration', registrationId],
    queryFn: async () => {
      const response = await fetch(`/api/registration/${registrationId}`);
      if (!response.ok) throw new Error('Registration not found');
      return response.json();
    },
  });

  // Fetch participants
  const { data: participantsData, isLoading: participantsLoading } = useQuery<ParticipantsResponse>({
    queryKey: ['registration', registrationId, 'participants'],
    queryFn: async () => {
      const response = await fetch(`/api/registration/${registrationId}/participants`);
      if (!response.ok) throw new Error('Failed to fetch participants');
      return response.json();
    },
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string }) => {
      const response = await fetch(`/api/registration/${registrationId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful! 🎉",
        description: "You've been registered for the tournament",
      });
      setName('');
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['registration', registrationId, 'participants'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-refresh participants every 5 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['registration', registrationId, 'participants'] });
    }, 5000);

    return () => clearInterval(interval);
  }, [registrationId, queryClient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    registerMutation.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
    });
  };

  const isRegistrationClosed = registrationInfo?.registrationStatus !== 'open';
  const isFull = registrationInfo?.registrationStatus === 'full';

  if (infoLoading || participantsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle>Loading Tournament Registration...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!registrationInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Registration Not Found</CardTitle>
            <CardDescription>This registration link may have expired or been removed</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Tournament Header */}
        <Card className="border-blue-200 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-blue-800">
              {registrationInfo.tournamentName}
            </CardTitle>
            <CardDescription className="text-lg text-blue-600">
              Tournament Registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{registrationInfo.date}</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{registrationInfo.time}</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{registrationInfo.location}</span>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Badge 
                variant={isRegistrationClosed ? "destructive" : "default"}
                className="text-sm px-4 py-2"
              >
                {isFull ? "Tournament Full" : isRegistrationClosed ? "Registration Closed" : "Registration Open"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registration Form */}
          <Card className="border-green-200 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span>Join Tournament</span>
              </CardTitle>
              <CardDescription>
                Register to participate in this tournament
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isRegistrationClosed ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Player Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      maxLength={50}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={!name.trim() || registerMutation.isPending}
                  >
                    {registerMutation.isPending ? 'Registering...' : 'Register for Tournament'}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-600">
                    {isFull ? "Tournament Full" : "Registration Closed"}
                  </h3>
                  <p className="text-gray-600 mt-2">
                    {isFull 
                      ? "This tournament has reached its maximum number of participants"
                      : "Registration for this tournament is no longer available"
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participants List */}
          <Card className="border-purple-200 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span>Registered Players</span>
                </span>
                <Badge variant="outline" className="text-sm">
                  {participantsData?.count || 0} / {registrationInfo.maxParticipants}
                </Badge>
              </CardTitle>
              <CardDescription>
                Players who have registered for this tournament
                {wsConnection && (
                  <span className="ml-2 text-green-600">• Live Updates</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {participantsData?.participants?.length ? (
                  participantsData.participants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-medium text-sm">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {participant.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(participant.registeredAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p>No players registered yet</p>
                    <p className="text-sm">Be the first to join!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}