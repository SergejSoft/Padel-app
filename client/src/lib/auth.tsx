/**
 * Single import point for auth UI and hooks. In normal builds this is Clerk.
 * With VITE_LOCAL_AUTH=true (local development without a Clerk account) it
 * becomes a small in-browser stand-in: the "signed-in" user is one of the
 * fixed local users, kept in localStorage, and API calls carry a
 * `Bearer local:<id>` token that the server accepts when LOCAL_AUTH=true.
 */
import * as Clerk from "@clerk/react";
import { useSyncExternalStore, type ReactNode } from "react";

export const isLocalAuth = import.meta.env.VITE_LOCAL_AUTH === "true";

// Keep in sync with server/localAuth.ts
const LOCAL_USERS = [
  { id: "local_organizer", email: "organizer@local.test", firstName: "Olivia", lastName: "Organizer", role: "organizer" },
  { id: "local_admin", email: "admin@local.test", firstName: "Adam", lastName: "Admin", role: "admin" },
  { id: "local_player", email: "player@local.test", firstName: "Pat", lastName: "Player", role: "player" },
  { id: "local_newcomer", email: "newcomer@local.test", firstName: "Nina", lastName: "Newcomer", role: "player" },
] as const;

type LocalUser = (typeof LOCAL_USERS)[number];

const STORAGE_KEY = "localAuthUser";
const listeners = new Set<() => void>();

function readUserId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeUserId(userId: string | null) {
  try {
    if (userId) localStorage.setItem(STORAGE_KEY, userId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore: private mode or storage disabled
  }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function useLocalUser(): LocalUser | null {
  const userId = useSyncExternalStore(subscribe, readUserId, () => null);
  return LOCAL_USERS.find(user => user.id === userId) ?? null;
}

function LocalProvider({ children }: { children: ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}

function useLocalAuthHook() {
  const user = useLocalUser();
  return {
    isLoaded: true,
    isSignedIn: !!user,
    userId: user?.id ?? null,
    getToken: async () => (user ? `local:${user.id}` : null),
  };
}

function useLocalUserHook() {
  const user = useLocalUser();
  return {
    isLoaded: true,
    isSignedIn: !!user,
    user: user
      ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          primaryEmailAddress: { emailAddress: user.email },
        }
      : null,
  };
}

function useLocalClerk() {
  return {
    signOut: async (options?: { redirectUrl?: string }) => {
      writeUserId(null);
      window.location.assign(options?.redirectUrl ?? "/");
    },
  };
}

function LocalUserButton() {
  const user = useLocalUser();
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-dashed border-amber-400 bg-amber-50 px-2 py-1 text-xs text-amber-900">
      <span className="font-medium">Local</span>
      <select
        aria-label="Switch local user"
        className="bg-transparent text-xs"
        value={user?.id ?? ""}
        onChange={event => {
          writeUserId(event.target.value || null);
          window.location.reload();
        }}
      >
        <option value="">Signed out</option>
        {LOCAL_USERS.map(option => (
          <option key={option.id} value={option.id}>
            {option.firstName} ({option.role})
          </option>
        ))}
      </select>
    </label>
  );
}

function LocalSignIn({ forceRedirectUrl }: { forceRedirectUrl?: string; [key: string]: unknown }) {
  return (
    <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
      <p className="mb-1 text-sm font-semibold">Local sign-in</p>
      <p className="mb-4 text-xs text-muted-foreground">
        Clerk is disabled (VITE_LOCAL_AUTH). Pick a seeded user.
      </p>
      <div className="grid gap-2">
        {LOCAL_USERS.map(option => (
          <button
            key={option.id}
            type="button"
            className="flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => {
              writeUserId(option.id);
              window.location.assign(forceRedirectUrl ?? "/");
            }}
          >
            <span>
              {option.firstName} {option.lastName}
              <span className="block text-xs text-muted-foreground">{option.email}</span>
            </span>
            <span className="text-xs uppercase text-muted-foreground">{option.role}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const ClerkProvider: typeof Clerk.ClerkProvider = isLocalAuth
  ? (LocalProvider as unknown as typeof Clerk.ClerkProvider)
  : Clerk.ClerkProvider;
export const useAuth = isLocalAuth
  ? (useLocalAuthHook as unknown as typeof Clerk.useAuth)
  : Clerk.useAuth;
export const useUser = isLocalAuth
  ? (useLocalUserHook as unknown as typeof Clerk.useUser)
  : Clerk.useUser;
export const useClerk = isLocalAuth
  ? (useLocalClerk as unknown as typeof Clerk.useClerk)
  : Clerk.useClerk;
export const UserButton = isLocalAuth
  ? (LocalUserButton as unknown as typeof Clerk.UserButton)
  : Clerk.UserButton;
export const SignIn = isLocalAuth
  ? (LocalSignIn as unknown as typeof Clerk.SignIn)
  : Clerk.SignIn;
