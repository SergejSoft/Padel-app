# Padel Tournament Scheduler

## Overview
This is a React-based Padel Tournament Scheduler that enables users to create and manage American Format padel tournaments. The application features an intelligent scheduling algorithm for 8-player tournaments, real-time management capabilities, and PDF generation for tournament schedules and scorecards.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with custom theme configuration
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions stored in PostgreSQL
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful API with role-based access control

### Database Design
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema**: Defined using Drizzle ORM
- **Key Tables**:
  - `users`: User profiles with role-based permissions (admin/organizer)
  - `tournaments`: Tournament data with JSON fields for players and schedules
  - `sessions`: Session storage for authentication

## Key Components

### Tournament Management System
- **American Format Algorithm**: Optimized scheduling for 8 players across 2 courts over 7 rounds
- **Tournament Creation Wizard**: Multi-step process (Setup → Players → Schedule)
- **Real-time Editing**: Live updates to tournament details and player information
- **Status Management**: Active, Cancelled, and Past tournament states

### Authentication & Authorization
- **Role-based Access Control**: Admin and Organizer roles with appropriate permissions
- **Replit Auth Integration**: Secure authentication using OpenID Connect
- **Session Management**: PostgreSQL-backed session storage

### PDF Generation System
- **jsPDF Integration**: Client-side PDF generation for schedules and scorecards
- **Print-optimized Layout**: A4 format with responsive design
- **Preview Modal**: Real-time PDF preview before download

### Sharing System
- **Unique Share Links**: Generate shareable tournament URLs
- **Public Tournament View**: Anonymous access to shared tournaments
- **Copy-to-clipboard**: Easy sharing functionality

## Data Flow

1. **User Authentication**: Users authenticate via Replit Auth, creating/updating user records
2. **Tournament Creation**: Wizard collects tournament details, player names, and generates optimal schedule
3. **Schedule Generation**: American Format algorithm creates balanced tournament brackets
4. **Database Storage**: Tournament data stored with JSON fields for flexible schema
5. **Real-time Updates**: TanStack Query manages cache invalidation and real-time updates
6. **PDF Export**: Client-side generation of printable tournament materials
7. **Sharing**: Generate unique identifiers for public tournament access

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **jspdf**: PDF generation
- **passport**: Authentication middleware
- **openid-client**: OpenID Connect integration

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **ESBuild**: Production bundling

## Deployment Strategy

### Environment Configuration
- **Development**: Uses Vite dev server with hot module replacement
- **Production**: Static build with Express server for API
- **Database**: PostgreSQL connection via environment variable
- **Sessions**: Secure session management with PostgreSQL storage

### Build Process
1. Frontend builds to `dist/public` directory
2. Backend compiles to `dist/index.js` with ESBuild
3. Static assets served by Express in production
4. Database migrations managed via Drizzle Kit

### Replit Integration
- **Autoscale Deployment**: Configured for Replit's autoscale infrastructure
- **Port Configuration**: External port 80 mapped to internal port 5000
- **Development Banner**: Replit development mode integration

## Changelog
- July 8, 2025. Fixed React infinite loop error by temporarily reverting to simpler shared tournament component while preserving leaderboard functionality
- June 27, 2025. Fixed Button component import error preventing tournament display and added duplicate prevention in tournament creation
- June 21, 2025. Added permanent leaderboard functionality with database storage for final results and dedicated leaderboard page access via unique URLs
- June 21, 2025. Implemented mobile-responsive dashboard, fixed empty score inputs, and added tournament result saving with completion status
- June 21, 2025. Fixed tournament scheduling algorithm and added wizard state persistence to prevent data loss when navigating between steps
- June 21, 2025. Prepared app for deployment: hidden dev-only tests, added time input to tournament creation
- June 21, 2025. Added internal scoring algorithm validation test with simulated tournament scenarios
- June 21, 2025. Implemented responsive mobile optimizations for score entry with touch-friendly inputs, compact layouts, and improved mobile UX
- June 21, 2025. Added comprehensive scoring system visual proposal with live score tracking, leaderboards, and demo page
- June 18, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.