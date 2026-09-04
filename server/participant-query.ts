import { sql } from "drizzle-orm";
import { tournaments } from "../shared/schema.js";
import type { RegisteredParticipant } from "../shared/schema.js";

/**
 * In-memory twin of `buildParticipantRegistrationPredicate`: does this signed-in
 * user hold an active registration in the given participant list? Matches by
 * Clerk user ID or (case-insensitively) by email, ignoring removed entries.
 */
export function isRegisteredParticipant(
  participants: readonly RegisteredParticipant[] | null | undefined,
  userId: string,
  email?: string | null,
): boolean {
  const normalizedEmail = email?.trim().toLowerCase() || null;
  return (participants ?? []).some(participant => {
    if ((participant.status ?? "registered") === "removed") return false;
    if (participant.userId === userId) return true;
    return !!normalizedEmail && participant.email?.trim().toLowerCase() === normalizedEmail;
  });
}

export function buildParticipantRegistrationPredicate(userId: string, email?: string | null) {
  const emailMatch = email
    ? sql`OR lower(participant->>'email') = lower(${email})`
    : sql``;

  return sql`
    EXISTS (
      SELECT 1
      FROM json_array_elements(COALESCE(${tournaments.registeredParticipants}, '[]'::json)) AS participant
      WHERE COALESCE(participant->>'status', 'registered') <> 'removed'
        AND (
          participant->>'userId' = ${userId}
          ${emailMatch}
        )
    )
  `;
}
