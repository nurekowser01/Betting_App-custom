# GameStake - PlayStation Gaming Betting Platform

## Overview

GameStake is a PlayStation gaming betting platform where users can create matches, challenge other players, stake bets with secure escrow protection, and spectate live matches while placing side bets. The platform features a three-wallet system (personal, escrow, spectator) to manage different types of funds throughout the betting lifecycle.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **Styling**: Tailwind CSS with custom design tokens for a PlayStation/gaming aesthetic
- **Component Library**: shadcn/ui (Radix UI primitives with custom styling)
- **Build Tool**: Vite with custom path aliases (`@/` for client source, `@shared/` for shared code)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Authentication**: Passport.js with local strategy, bcrypt for password hashing
- **Session Management**: express-session with PostgreSQL session store (connect-pg-simple)
- **API Pattern**: RESTful JSON API under `/api` prefix

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: Drizzle Kit with `db:push` command

### Key Data Models
- **Users**: Dual auth with username/password and Google OAuth, optional email and profile image
- **Wallets**: Four types (personal, escrow, spectator, platform) with decimal balance
- **Matches**: Game matches with status lifecycle (waiting → live → pending_approval → completed/cancelled)
- **Spectator Bets**: Side bets on live matches with odds multiplier
- **Transactions**: Full audit trail of all wallet movements

### Authentication Flow
- **Dual authentication system**: Username/password (local) and Google OAuth (via Replit Auth)
- Session-based authentication stored in PostgreSQL (`sessions` table)
- Local auth uses Passport.js LocalStrategy with bcrypt password hashing
- OAuth uses Replit Auth with OpenID Connect (supports Google, GitHub, Apple, etc.)
- Protected routes use `requireAuth` middleware
- User context provided via React Context on frontend
- Registration advises users to use their PlayStation (PSN) or Xbox Gamertag for easy identification

### Build & Deployment
- **Development**: `npm run dev` runs Vite dev server with HMR proxied through Express
- **Production**: `npm run build` bundles client with Vite and server with esbuild
- **Static Serving**: Production serves built files from `dist/public`

## External Dependencies

### Database
- PostgreSQL (connection via `DATABASE_URL` environment variable)
- Session table auto-created by connect-pg-simple

### Frontend Libraries
- React ecosystem (react, react-dom)
- TanStack Query for data fetching
- Radix UI primitives (via shadcn/ui)
- Lucide React and react-icons for icons
- date-fns for date formatting

### Backend Libraries
- Express with standard middleware
- Passport.js for authentication
- Drizzle ORM for database operations
- Zod for runtime validation

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Optional, defaults to hardcoded value (should be set in production)