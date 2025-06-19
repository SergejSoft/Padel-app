import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateTournamentConfig } from "@/lib/american-format";
import { tournamentSetupSchema, type TournamentSetup } from "@shared/schema";

interface TournamentSetupProps {
  onComplete: (setup: TournamentSetup) => void;
  onBack: () => void;
}

export function TournamentSetup({ onComplete, onBack }: TournamentSetupProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  const form = useForm<TournamentSetup>({
    resolver: zodResolver(tournamentSetupSchema),
    defaultValues: {
      name: "",
      date: "",
      location: "",
      playersCount: 8,
      courtsCount: 2,
      registrationOpen: false,
    },
  });

  const validateConfiguration = (playersCount: number, courtsCount: number) => {
    const error = validateTournamentConfig(playersCount, courtsCount);
    setValidationError(error);
    return !error;
  };

  const onSubmit = (data: TournamentSetup) => {
    if (validateConfiguration(data.playersCount, data.courtsCount)) {
      onComplete(data);
    }
  };

  const watchRegistrationOpen = form.watch("registrationOpen");

  return (
    <CardContent className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Tournament Setup</h2>
        <p className="text-muted-foreground">Configure your American Format padel tournament</p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-muted border border-border rounded-lg p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter tournament name"
                        {...field}
                        className="focus:ring-primary focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="focus:ring-primary focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter venue or location"
                        {...field}
                        className="focus:ring-primary focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="playersCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Players</FormLabel>
                    <FormControl>
                      <Input
                        value="8 Players"
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="courtsCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Courts</FormLabel>
                    <FormControl>
                      <Input
                        value="2 Courts"
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Tournament Type</h3>
                  <p className="text-sm text-muted-foreground">Choose how players will join your tournament</p>
                </div>
                
                <FormField
                  control={form.control}
                  name="registrationOpen"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        {/* Simple Flow Option */}
                        <div 
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            !field.value 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => field.onChange(false)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              !field.value ? 'border-primary bg-primary' : 'border-border'
                            }`} />
                            <div>
                              <div className="font-semibold">Simple Flow</div>
                              <div className="text-sm text-muted-foreground">
                                Add all 8 players now and generate schedule immediately
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Open Registration Option */}
                        <div 
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            field.value 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => field.onChange(true)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              field.value ? 'border-primary bg-primary' : 'border-border'
                            }`} />
                            <div>
                              <div className="font-semibold">Open Registration</div>
                              <div className="text-sm text-muted-foreground">
                                Let players register themselves, generate schedule when full
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {validationError && (
                <Alert variant="destructive">
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              <div className="bg-background border border-border rounded-md p-4">
                <h4 className="font-medium text-foreground mb-2">Americano Format</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  7 rounds with optimal partner and opponent rotation. Each player plays exactly once per round across 2 courts simultaneously.
                </p>
                <div className="text-xs text-muted-foreground">
                  • Rally-point scoring to 16 points<br/>
                  • 4-rally serve blocks with changeover at 8 points<br/>
                  • ~90 minutes total duration including warm-up
                </div>
              </div>

              <div className="space-y-3">
                {watchRegistrationOpen ? (
                  <Button
                    type="submit"
                    className="w-full bg-green-600 text-white hover:bg-green-700"
                    disabled={!!validationError || !form.formState.isValid}
                  >
                    Create Tournament & Open Registration
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={!!validationError || !form.formState.isValid}
                  >
                    Continue to Add Players
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </CardContent>
  );
}
