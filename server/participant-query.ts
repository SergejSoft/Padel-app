import { sql } from "drizzle-orm";
import { tournaments } from "../shared/schema.js";

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
