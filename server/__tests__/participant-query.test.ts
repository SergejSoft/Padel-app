import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { buildParticipantRegistrationPredicate } from "../participant-query";

const dialect = new PgDialect();

describe("participant registration query", () => {
  it("matches linked registrations by user ID", () => {
    const query = dialect.sqlToQuery(
      buildParticipantRegistrationPredicate("user_123"),
    );

    expect(query.sql).toContain("participant->>'userId'");
    expect(query.params).toEqual(["user_123"]);
  });

  it("also matches past anonymous registrations by email case-insensitively", () => {
    const query = dialect.sqlToQuery(
      buildParticipantRegistrationPredicate("user_123", "Player@Example.com"),
    );

    expect(query.sql).toContain("lower(participant->>'email') = lower(");
    expect(query.params).toEqual(["user_123", "Player@Example.com"]);
  });

  it("excludes removed registrations", () => {
    const query = dialect.sqlToQuery(
      buildParticipantRegistrationPredicate("user_123"),
    );

    expect(query.sql).toContain(
      "COALESCE(participant->>'status', 'registered') <> 'removed'",
    );
  });
});
