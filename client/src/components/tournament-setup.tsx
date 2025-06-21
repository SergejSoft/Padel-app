import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      time: "",
      location: "",
      playersCount: 8,
      courtsCount: 2,
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

  const watchedValues = form.watch();

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

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!!validationError || !form.formState.isValid}
              >
                Continue to Players
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </CardContent>
  );
}
