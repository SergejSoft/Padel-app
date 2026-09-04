import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { buildParticipantRegistrationPredicate, isRegisteredParticipant } from "../participant-query";
import type { RegisteredParticipant } from "../../shared/schema";

const dialect = new PgDialect();

const participant = (overrides: Partial<RegisteredParticipant>): RegisteredParticipant => ({
  id: "p1",
  name: "Player",
  registeredAt: "2026-09-01T10:00:00.000Z",
  status: "registered",
  ...overrides,
});

describe("isRegisteredParticipant", () => {
  it("matches a registration linked to the user's Clerk ID", () => {
    const participants = [participant({ userId: "user_123" })];
    expect(isRegisteredParticipant(participants, "user_123")).toBe(true);
    expect(isRegisteredParticipant(participants, "user_999")).toBe(false);
  });

  it("matches a manually added registration by email, case-insensitively", () => {
    const participants = [participant({ email: "Player@Example.com" })];
    expect(isRegisteredParticipant(participants, "user_123", " player@example.com ")).toBe(true);
    expect(isRegisteredParticipant(participants, "user_123", "other@example.com")).toBe(false);
    expect(isRegisteredParticipant(participants, "user_123", null)).toBe(false);
  });

  it("ignores removed registrations", () => {
    const participants = [participant({ userId: "user_123", email: "a@b.c", status: "removed" })];
    expect(isRegisteredParticipant(participants, "user_123", "a@b.c")).toBe(false);
  });

  it("treats a missing list as no access", () => {
    expect(isRegisteredParticipant(null, "user_123", "a@b.c")).toBe(false);
    expect(isRegisteredParticipant(undefined, "user_123")).toBe(false);
  });
});

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
