import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Link, 
  Users, 
  Copy, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  CheckCircle,
  XCircle,
  UserPlus 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getPublicAppUrl } from '@/lib/public-url';
import type { Tournament, RegisteredParticipant } from '@shared/schema';

interface RegistrationManagementProps {
  tournament: Tournament;
}

export default function RegistrationManagement({ tournament }: RegistrationManagementProps) {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<RegisteredParticipant | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPlaytomicRating, setEditPlaytomicRating] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPlaytomicRating, setNewPlaytomicRating] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isRegistrationMode = tournament.tournamentMode === 'registration';
  const participants = tournament.registeredParticipants || [];
  const registrationUrl = tournament.registrationId 
    ? `${getPublicAppUrl()}/register/${tournament.registrationId}`
    : null;

  // Generate registration link
  const generateLinkMutation = useMutation({
    mutationFn: async (data: { maxParticipants?: number; registrationDeadline?: string }) => {
      const response = await apiRequest('POST', `/api/tournaments/${tournament.id}/registration`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Link Generated",
        description: "Your tournament is now open for registration",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add participant manually (organizer)
  const addParticipantMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string; playtomicRating?: number }) => {
      const response = await apiRequest('POST', `/api/tournaments/${tournament.id}/participants`, data);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      toast({
        title: "Player Added",
        description: `${variables.name} has been added to the tournament`,
      });
      setIsAddDialogOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPlaytomicRating('');
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove participant
  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const response = await apiRequest('DELETE', `/api/tournaments/${tournament.id}/participants/${participantId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Participant Removed",
        description: "The participant has been removed from the tournament",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update participant
  const updateParticipantMutation = useMutation({
    mutationFn: async (data: { participantId: string; name: string; email?: string; playtomicRating: number | null }) => {
      const response = await apiRequest('PUT', `/api/tournaments/${tournament.id}/participants/${data.participantId}`, {
        name: data.name,
        email: data.email,
        playtomicRating: data.playtomicRating,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Participant Updated",
        description: "The participant information has been updated",
      });
      setEditingParticipant(null);
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update registration status
  const updateStatusMutation = useMutation({
    mutationFn: async (status: 'open' | 'closed' | 'full') => {
      const response = await apiRequest('PUT', `/api/tournaments/${tournament.id}/registration-status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Status Updated",
        description: "The registration status has been changed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Convert to tournament
  const convertToTournamentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/tournaments/${tournament.id}/convert`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedule generated",
        description: "Use \"Open schedule\" to see every round, or \"Download PDF\" to print score sheets.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyRegistrationLink = () => {
    if (registrationUrl) {
      navigator.clipboard.writeText(registrationUrl);
      toast({
        title: "Link Copied",
        description: "Registration link has been copied to clipboard",
      });
    }
  };

  const handleEditParticipant = (participant: RegisteredParticipant) => {
    setEditingParticipant(participant);
    setEditName(participant.name);
    setEditEmail(participant.email || '');
    setEditPlaytomicRating(
      participant.playtomicRating == null ? '' : String(participant.playtomicRating),
    );
  };

  const handleUpdateParticipant = () => {
    if (editingParticipant && editName.trim()) {
      updateParticipantMutation.mutate({
        participantId: editingParticipant.id,
        name: editName.trim(),
        email: editEmail.trim() || undefined,
        playtomicRating: editPlaytomicRating ? Number(editPlaytomicRating) : null,
      });
    }
  };

  const handleAddParticipant = () => {
    if (newName.trim()) {
      addParticipantMutation.mutate({
        name: newName.trim(),
        email: newEmail.trim() || undefined,
        playtomicRating: newPlaytomicRating ? Number(newPlaytomicRating) : undefined,
      });
    }
  };

  const maxParticipants = tournament.maxParticipants || tournament.playersCount;
  const isFull = participants.length >= maxParticipants;

  if (!isRegistrationMode && !tournament.registrationId) {
    return (
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Enable Self-Registration</span>
          </CardTitle>
          <CardDescription>
            Allow players to register themselves for this tournament
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => generateLinkMutation.mutate({})}
            disabled={generateLinkMutation.isPending}
            className="w-full"
          >
            {generateLinkMutation.isPending ? 'Generating...' : 'Generate Registration Link'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Registration Link */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5 text-green-600" />
            <span>Registration Link</span>
          </CardTitle>
          <CardDescription>
            Share this link with players to let them register
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input
              value={registrationUrl || ''}
              readOnly
              className="flex-1 bg-white"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={copyRegistrationLink}
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge 
                variant={tournament.registrationStatus === 'open' ? 'default' : 'secondary'}
                className="text-sm"
              >
                {tournament.registrationStatus}
              </Badge>
            </div>
            
            <Select
              value={tournament.registrationStatus || 'closed'}
              onValueChange={(value) => updateStatusMutation.mutate(value as 'open' | 'closed' | 'full')}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Participants Management */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <span>Registered Players</span>
            </span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {participants.length} / {maxParticipants}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
                disabled={isFull}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add Player
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Manage players who have registered for this tournament
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {participants.length > 0 ? (
              participants.map((participant, index) => (
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
                        {participant.email && `${participant.email} • `}
                        {new Date(participant.registeredAt).toLocaleString()}
                      </div>
                      {participant.playtomicRating != null && (
                        <div className="text-sm font-medium text-purple-700">
                          Playtomic {participant.playtomicRating.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditParticipant(participant)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Participant</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {participant.name} from the tournament?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => removeParticipantMutation.mutate(participant.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>No players registered yet</p>
                <p className="text-sm">Share the registration link or add players manually</p>
              </div>
            )}
          </div>
          
          {participants.length >= 4 && (
            <div className="mt-6 pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Generate Schedule & Start
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Generate the match schedule?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2">
                        <p>
                          This creates the round-by-round schedule for the {participants.length} registered
                          players on {tournament.courtsCount} {tournament.courtsCount === 1 ? 'court' : 'courts'}
                          {participants.length > tournament.courtsCount * 4 &&
                            `, with ${participants.length - tournament.courtsCount * 4} sitting out each round`}.
                        </p>
                        <p>
                          Registration closes for new sign-ups. All existing registrations stay stored, and
                          you can still edit the player list afterwards in Manage.
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => convertToTournamentMutation.mutate()}
                      disabled={convertToTournamentMutation.isPending}
                    >
                      Generate & Start
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Participant Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          setNewName('');
          setNewEmail('');
          setNewPlaytomicRating('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>
              Manually add a player to the tournament
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter player name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim() && !addParticipantMutation.isPending) {
                    handleAddParticipant();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter email (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-playtomic-rating">Playtomic rating</Label>
              <Input
                id="add-playtomic-rating"
                type="number"
                inputMode="decimal"
                min="0"
                max="7"
                step="0.01"
                value={newPlaytomicRating}
                onChange={(e) => setNewPlaytomicRating(e.target.value)}
                placeholder="Optional, from 0 to 7"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddParticipant}
              disabled={!newName.trim() || addParticipantMutation.isPending}
            >
              {addParticipantMutation.isPending ? 'Adding...' : 'Add Player'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Participant Dialog */}
      <Dialog open={!!editingParticipant} onOpenChange={() => setEditingParticipant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Participant</DialogTitle>
            <DialogDescription>
              Update the participant's information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Enter email (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-playtomic-rating">Playtomic rating</Label>
              <Input
                id="edit-playtomic-rating"
                type="number"
                inputMode="decimal"
                min="0"
                max="7"
                step="0.01"
                value={editPlaytomicRating}
                onChange={(e) => setEditPlaytomicRating(e.target.value)}
                placeholder="Optional, from 0 to 7"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setEditingParticipant(null)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateParticipant}
              disabled={!editName.trim() || updateParticipantMutation.isPending}
            >
              {updateParticipantMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}