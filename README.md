# Padel Tournament Scheduler

A React-based Padel tournament scheduling application that simplifies tournament organization with an American Format algorithm and advanced management capabilities.

## Features

- **Tournament Creation**: Create 8-player American Format tournaments with automatic scheduling
- **Real-time Management**: Edit player names, tournament details, and manage status
- **Status Management**: Active, Cancelled, and Past tournament states
- **Shareable Links**: Generate unique links for tournament viewing
- **PDF Generation**: Export tournament schedules and scorecards
- **Role-based Access**: Admin and Organizer roles with appropriate permissions

## User Roles

### Default Role: Organizer
- All users start as Organizers by default
- Can create, edit, and manage their own tournaments
- Can cancel and reactivate their tournaments
- Can generate shareable links
- Can view and edit player details

### Admin Role
- Can view and manage ALL tournaments in the system
- Has full access to all tournament operations
- Can manage user roles (see below)

## Changing User Roles

To change a user's role from Organizer to Admin, you need to update the database directly:

### Using SQL Command
```sql
UPDATE users 
SET role = 'admin' 
WHERE id = 'USER_ID_HERE';
```

### Steps:
1. Find the user ID from the users table:
   ```sql
   SELECT id, email, role FROM users;
   ```

2. Update the specific user's role:
   ```sql
   UPDATE users 
   SET role = 'admin' 
   WHERE id = '37856078';  -- Replace with actual user ID
   ```

3. The user will need to sign out and sign back in for role changes to take effect.

### Available Roles:
- `organizer` (default) - Can manage own tournaments
- `admin` - Can manage all tournaments and users

## Tournament Status

### Status Types:
- **Active**: Tournament is running and accepting participants
- **Cancelled**: Tournament has been cancelled by organizer/admin
- **Past**: Tournament date has passed (automatic)

### Status Management:
- Organizers can cancel their own tournaments
- Cancelled tournaments can be reactivated
- Past tournaments are read-only
- Status is displayed on both dashboard and shared links

## Database Schema

### Key Tables:
- `users` - User information and roles
- `tournaments` - Tournament data with status column
- `sessions` - Authentication sessions

### Tournament Status Column:
The `status` column was added to handle tournament states:
```sql
ALTER TABLE tournaments ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
```

## Development

### Prerequisites:
- Node.js 18+
- PostgreSQL database
- Environment variables configured

### Setup:
1. Install dependencies: `npm install`
2. Configure database: Set `DATABASE_URL` environment variable
3. Run migrations: `npm run db:push`
4. Start development server: `npm run dev`

### Environment Variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Replit application ID
- `REPLIT_DOMAINS` - Allowed domains for authentication

## API Endpoints

### Tournament Management:
- `GET /api/tournaments` - List user's tournaments
- `POST /api/tournaments` - Create new tournament
- `PUT /api/tournaments/:id` - Update tournament
- `PATCH /api/tournaments/:id/status` - Update tournament status
- `DELETE /api/tournaments/:id` - Delete tournament

### Status Values:
- `active` - Tournament is active
- `cancelled` - Tournament cancelled by user
- `past` - Automatically set for past dates

### Shared Access:
- `GET /api/shared/:shareId` - View shared tournament (public)

## Deployment

The application is designed for Replit deployment with automatic builds and hosting. Ensure all environment variables are properly configured in your Replit environment.