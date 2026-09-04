ALTER TABLE "tournaments" ADD COLUMN "co_organizer_id" text;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "co_organizer_email" text;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_co_organizer_id_users_id_fk" FOREIGN KEY ("co_organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
