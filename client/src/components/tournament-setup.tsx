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
                name="playersCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Players</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const numValue = parseInt(value);
                        field.onChange(numValue);
                        validateConfiguration(numValue, watchedValues.courtsCount);
                      }}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="focus:ring-primary focus:border-primary">
                          <SelectValue placeholder="Select players" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="4">4 Players</SelectItem>
                        <SelectItem value="8">8 Players</SelectItem>
                        <SelectItem value="12">12 Players</SelectItem>
                        <SelectItem value="16">16 Players</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Select
                      onValueChange={(value) => {
                        const numValue = parseInt(value);
                        field.onChange(numValue);
                        validateConfiguration(watchedValues.playersCount, numValue);
                      }}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="focus:ring-primary focus:border-primary">
                          <SelectValue placeholder="Select courts" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Court</SelectItem>
                        <SelectItem value="2">2 Courts</SelectItem>
                        <SelectItem value="3">3 Courts</SelectItem>
                        <SelectItem value="4">4 Courts</SelectItem>
                      </SelectContent>
                    </Select>
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
                <h4 className="font-medium text-foreground mb-2">Tournament Format</h4>
                <p className="text-sm text-muted-foreground">
                  American Format ensures each player partners with different players and faces varied opponents across multiple rounds for maximum engagement.
                </p>
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
