import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED or DATABASE_URL must be configured",
  );
}

/**
 * Neon's HTTP driver only talks to Neon. Any other Postgres (the local
 * docker-compose database, for instance) goes through node-postgres.
 */
export function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

function createDb(url: string) {
  if (isNeonUrl(url)) {
    return drizzleNeon(neon(url), { schema });
  }
  const pool = new pg.Pool({ connectionString: url });
  return drizzlePg(pool, { schema });
}

// Both drivers expose the same query builder; the union of the two client
// types is what the storage layer needs.
export const db = createDb(databaseUrl) as ReturnType<typeof drizzleNeon<typeof schema>>;
