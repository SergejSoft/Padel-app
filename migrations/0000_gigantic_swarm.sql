CREATE TABLE "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"date" text,
	"time" text,
	"location" text,
	"price" text,
	"currency" text,
	"players_count" integer NOT NULL,
	"courts_count" integer NOT NULL,
	"points_per_match" integer DEFAULT 16 NOT NULL,
	"players" json NOT NULL,
	"schedule" json NOT NULL,
	"results" json,
	"final_scores" json,
	"leaderboard_id" text,
	"share_id" text,
	"url_slug" text,
	"status" text DEFAULT 'active' NOT NULL,
	"organizer_id" text,
	"tournament_mode" text DEFAULT 'fixed' NOT NULL,
	"registration_id" text,
	"registration_status" text DEFAULT 'closed',
	"max_participants" integer,
	"registered_participants" json DEFAULT '[]'::json,
	"registration_deadline" timestamp,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "tournaments_leaderboard_id_unique" UNIQUE("leaderboard_id"),
	CONSTRAINT "tournaments_share_id_unique" UNIQUE("share_id"),
	CONSTRAINT "tournaments_url_slug_unique" UNIQUE("url_slug"),
	CONSTRAINT "tournaments_registration_id_unique" UNIQUE("registration_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'organizer' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;