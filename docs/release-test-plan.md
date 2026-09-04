# Padel App Release Test Plan

Run this checklist against the deployment candidate using the production-like Neon database and Clerk test instance. Prefix temporary tournaments with `RELEASE-QA` so they are easy to delete.

## Release gates

- [x] `npm run check` passes
- [x] `npm test` passes (40 tests)
- [x] `npm run build` passes
- [x] `npm run test:e2e` passes locally (5 tests)
- [ ] All P0 scenarios below pass
- [ ] No browser console errors or failed API requests during the main flow
- [x] Automated `RELEASE-QA` data is removed

## Current preview candidate

- Vercel preview: `https://padel-app-preview.vercel.app`
- Neon branch: `release-preview` (expires September 2, 2026)
- API smoke test: passed (`404` JSON response for an unknown registration)
- Deployment protection is disabled so public tournament and registration links work without a Vercel account.

Automated coverage includes signed-out access, protected mutations, Clerk sign-in,
8-player/2-court registration and conversion, 20-point scoring, public-data
redaction, and cleanup. The unchecked scenarios below still require manual UI,
cross-account, concurrency, migrated-data, or responsive-layout verification.

## P0 — Migrated production data

### M1. Dashboard ownership

1. Sign in with the migrated Clerk organizer.
2. Open the dashboard.

Expected:

- Nine migrated tournaments are visible.
- Edit, registration management, scoring, sharing, cancellation, and deletion controls are available.
- No tournament appears ownerless.

### M2. Migrated tournament integrity

1. Open several migrated tournaments, including a completed tournament and a registration-mode tournament.
2. Compare names, dates, players, schedules, scores, participant lists, and statuses with the source copy.

Expected:

- Four completed tournaments still show their results and leaderboards.
- Two registration-mode tournaments retain their participant and registration data.
- Existing public share and registration links resolve.

## P0 — Authentication and authorization

### A1. Sign in and sign out

1. Open the app in a signed-out browser.
2. Sign in through Clerk.
3. Sign out from the dashboard.

Expected:

- Signed-out users see the landing page.
- Successful sign-in opens the organizer dashboard.
- Sign-out returns to the landing page and protected actions are unavailable.

### A2. Public access

1. Open a tournament share link and a registration link in an incognito window.

Expected:

- Neither page requires an account.
- The public participant list never exposes email addresses.
- Organizer controls are not shown.

### A3. Protected API

While signed out, attempt to update, delete, rotate the share ID, save scores, and edit participants.

Expected: every protected request returns `401 Unauthorized`.

### A4. Ownership isolation

1. Create a second temporary Clerk organizer.
2. Try to edit or delete the primary organizer's tournament.

Expected: every cross-owner operation returns `403 Access denied`.

## P0 — Tournament creation and scheduling

### T1. Standard Americano: 8 players, 2 courts

1. Create `RELEASE-QA 8x2`.
2. Register eight unique players and start the tournament.

Expected:

- Seven rounds and two matches per round.
- Every player plays every round.
- Every player partners every other player exactly once.
- Game numbers are sequential and courts are numbered 1–2.

### T2. Sit-outs: 9 players, 2 courts

1. Create `RELEASE-QA 9x2`.
2. Register nine players and start the tournament.

Expected:

- Eight players play and one rests in each round.
- Sit-outs rotate; match-count difference between players is at most one.
- No player is assigned twice in one round.

### T3. Limited capacity: 12 players, 2 courts

Expected:

- Two matches per round and four resting players.
- Resting time is distributed evenly.
- Repeated partnerships, when unavoidable, do not prevent schedule creation.

### T4. Maximum configuration: 20 players, 5 courts

Expected:

- Five simultaneous matches per round.
- All 20 players play in each round.
- No duplicate player assignment within a round.

### T5. Court selector and validation

Verify court values 2, 3, 4, and 5 can be selected. Verify fewer than 4 or more than 20 players and courts outside 2–5 are rejected.

## P0 — Registration management

### R1. Public registration

1. Register from two separate browsers.
2. Try an empty name, invalid email, and duplicate name with different capitalization.

Expected:

- Valid registrations appear for all viewers within five seconds.
- Invalid and duplicate submissions are rejected.

### R2. Organizer editing

Edit a participant's name/email, remove another participant, close registration, and reopen it.

Expected:

- Changes persist after refresh.
- Closed registration rejects new participants.
- Removing a participant from a full tournament makes a place available.

### R3. Capacity

Fill registration to its configured maximum.

Expected:

- Status changes to `full`.
- Additional registrations are rejected.

### R4. Convert to tournament

Start the tournament from registration management.

Expected:

- Registration closes.
- Registered names become the player list.
- A valid stored schedule is generated and remains unchanged after refresh.

## P0 — Scoring and leaderboard

### S1. Valid score

Save a score whose teams total the configured points, such as `10–6` for a 16-point match.

Expected: the score persists and appears on the public shared view.

### S2. Invalid score

Try negative values, decimals, values above the match total, and a total other than the configured points.

Expected: saving is blocked or the API returns `400`; no invalid score is stored.

### S3. Custom match total

Create a tournament configured for 20 points and save `12–8`.

Expected: the UI and API both accept 20 total points and reject totals other than 20.

### S4. Completion

Enter all results and complete a tournament.

Expected:

- Status becomes `completed`.
- The leaderboard link works without authentication.
- Rankings use total points, then matches played, then name.
- Tied players share a rank and the next rank is skipped appropriately.

## P1 — Sharing, persistence, and usability

### P1. Share links

Copy a share link, open it on another device, rotate the share ID, and retry the old link.

Expected: only the organizer can rotate the ID; the new link works and the old ID no longer resolves.

### P2. Persistence

Refresh after every mutation, restart the local server, and redeploy the app.

Expected: tournaments, registrations, schedules, scores, and ownership remain unchanged.

### P3. Responsive layout

Run the creation, registration, schedule, and scoring flows at approximately 375 px, 768 px, and desktop width.

Expected: controls remain usable, team names are readable, and no horizontal overflow hides actions.

### P4. Concurrent registration

Submit the final available registration place from two browsers at nearly the same time.

Expected: the tournament never exceeds its configured capacity.

## Post-test cleanup

1. Delete all tournaments prefixed with `RELEASE-QA`.
2. Remove the temporary second Clerk account.
3. Confirm migrated production counts remain nine tournaments and one primary organizer.
