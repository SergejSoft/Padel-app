ALTER TABLE "tournaments" ALTER COLUMN "points_per_match" SET DEFAULT 24;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "playtomic_rating" real;