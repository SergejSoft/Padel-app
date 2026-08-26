# Padel Americano

A React and Express application for organizing Americano padel tournaments. Organizers can choose 2–5 courts, share a public registration link, manage participants, generate a fair schedule, enter scores, and publish a leaderboard.

## Architecture

- React, Vite, TypeScript, TanStack Query, and shadcn/ui
- Express API deployed as a Vercel function
- Clerk authentication for organizers and admins
- Neon Postgres accessed through Drizzle ORM's stateless HTTP driver
- Public participant registration; participants do not need accounts

## Local development

Requirements: Node.js 20+ and a Neon Postgres database.

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create `.env`:

   ```dotenv
   DATABASE_URL=postgresql://...-pooler.../database
   DATABASE_URL_UNPOOLED=postgresql://.../database
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

3. Apply the schema and start the app:

   ```sh
   npm run db:push
   npm run dev
   ```

The local Express/Vite server listens on port 5000.

## Vercel deployment

1. Import the repository into Vercel.
2. Add the Neon integration from the Vercel Marketplace, or manually set `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
3. Add `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
4. Add the Vercel production domain in Clerk's allowed origins.
5. Deploy. `vercel.json` builds the SPA and sends `/api/*` requests to the Express function.
6. Run `npm run db:push` once with the production `DATABASE_URL`.

## Roles

New users receive the `organizer` role. Admins can manage all tournaments. Promote an account directly in Postgres:

```sql
UPDATE users SET role = 'admin' WHERE id = 'user_clerk_id';
```

## Commands

- `npm run dev` — local development server
- `npm run check` — TypeScript check
- `npm test` — test suite
- `npm run build` — production build
- `npm run db:push` — apply the Drizzle schema
