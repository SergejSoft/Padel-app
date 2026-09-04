import { buildHeaders } from "@/lib/queryClient";

export type TournamentAccessCode = "sign_in_required" | "not_participant";

/**
 * Thrown when the server refuses to show a tournament view. Carries the
 * reason so pages can offer "sign in" versus "you're not in this tournament".
 */
export class TournamentAccessError extends Error {
  constructor(
    public readonly code: TournamentAccessCode,
    public readonly tournamentName: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "TournamentAccessError";
  }
}

export function isTournamentAccessError(error: unknown): error is TournamentAccessError {
  return error instanceof TournamentAccessError;
}

/**
 * Fetches a protected tournament view (schedule, scores, leaderboard) with the
 * signed-in user's token attached. Callers should wait for Clerk to load
 * before invoking, otherwise a signed-in user is seen as anonymous.
 */
export async function fetchTournamentView<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: await buildHeaders(),
    credentials: "include",
  });

  if (response.status === 401 || response.status === 403) {
    const body = await response.json().catch(() => ({}));
    const code: TournamentAccessCode = body.code === "not_participant" ? "not_participant" : "sign_in_required";
    throw new TournamentAccessError(code, body.tournamentName, body.error ?? "Access denied");
  }

  if (!response.ok) {
    const text = (await response.text()) || response.statusText;
    throw new Error(`${response.status}: ${text}`);
  }

  return response.json();
}
