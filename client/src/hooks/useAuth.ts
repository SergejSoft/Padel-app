import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/react";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const { isLoaded, isSignedIn } = useClerkAuth();

  // The app's user record (including role) lives in our own database;
  // /api/auth/user syncs the Clerk profile on first sign-in.
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoaded && isSignedIn,
    retry: false,
  });

  return {
    user: user ?? undefined,
    isLoading: !isLoaded || (!!isSignedIn && isLoading),
    isAuthenticated: !!isSignedIn,
    error,
    isAdmin: user?.role === 'admin',
    isPlayer: user?.role === 'player',
    isOrganizer: user?.role === 'organizer' || user?.role === 'admin',
  };
}
