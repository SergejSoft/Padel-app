# Padel Americano

A React and Express application for organizing Americano padel tournaments. Organizers can choose 2–5 courts, share a public registration link, manage participants, generate a fair schedule, enter scores, and publish a leaderboard.

## Architecture

- React, Vite, TypeScript, TanStack Query, and shadcn/ui
- Express API deployed as a Vercel function
- Clerk authentication for organizers and admins
- Neon Postgres accessed through Drizzle ORM's stateless HTTP driver
- Public participant registration; participants do not need accounts

## Local development

Requirements: Node.js 20+ and either Docker (for the local database) or a Neon Postgres database.

### Option A: everything local (no Neon or Clerk account)

```sh
npm install
cp .env.example .env      # already points at the docker-compose database with local auth on
npm run db:local          # starts Postgres 16 in Docker on localhost:5432
npm run db:migrate        # applies migrations
npm run db:seed           # wipes and seeds users + sample tournaments
npm run dev               # http://localhost:5000 (set PORT in .env if 5000 is taken, e.g. by macOS AirPlay)
```

`LOCAL_AUTH=true` / `VITE_LOCAL_AUTH=true` replace Clerk with a dev-only stand-in:
the login page lists the seeded users (organizer, admin, two players) and the
user menu becomes a switcher. The client sends `Authorization: Bearer local:<id>`
and the server trusts it. This mode is refused when `NODE_ENV=production`.
The seed script refuses to run against a Neon host.

### Option B: Neon + Clerk

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create `.env` (set `LOCAL_AUTH` and `VITE_LOCAL_AUTH` to `false` or leave them out):

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
- `npm run db:local` / `npm run db:local:down` — start/stop the local Postgres container
- `npm run db:seed` — reset and seed the local database (local Postgres only)
