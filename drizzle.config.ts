import { defineConfig } from "drizzle-kit";

const migrationUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL must be configured");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
