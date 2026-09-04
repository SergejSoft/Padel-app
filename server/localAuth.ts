/**
 * Dev-only stand-in for Clerk. Enabled with LOCAL_AUTH=true (never in
 * production). The client sends `Authorization: Bearer local:<userId>` and
 * the server trusts it; profiles come from the fixed list below, which the
 * seed script also uses. See README "Local development without Clerk".
 */

export interface LocalUserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "player" | "organizer" | "admin";
}

export const LOCAL_USERS: readonly LocalUserProfile[] = [
  { id: "local_organizer", email: "organizer@local.test", firstName: "Olivia", lastName: "Organizer", role: "organizer" },
  { id: "local_admin", email: "admin@local.test", firstName: "Adam", lastName: "Admin", role: "admin" },
  { id: "local_player", email: "player@local.test", firstName: "Pat", lastName: "Player", role: "player" },
  { id: "local_newcomer", email: "newcomer@local.test", firstName: "Nina", lastName: "Newcomer", role: "player" },
];

export const LOCAL_TOKEN_PREFIX = "local:";

export function isLocalAuthEnabled(): boolean {
  return process.env.LOCAL_AUTH === "true" && process.env.NODE_ENV !== "production";
}

export function getLocalUserProfile(userId: string): LocalUserProfile | undefined {
  return LOCAL_USERS.find(user => user.id === userId);
}

/** Extracts the local user id from the request, or null when signed out. */
export function getLocalUserId(authorization: string | undefined): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);
  if (!token.startsWith(LOCAL_TOKEN_PREFIX)) return null;
  const userId = token.slice(LOCAL_TOKEN_PREFIX.length);
  return getLocalUserProfile(userId) ? userId : null;
}
