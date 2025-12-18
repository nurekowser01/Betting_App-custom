import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { Express, Request, Response, NextFunction } from "express";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const SALT_ROUNDS = 10;

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      gamerUsername?: string | null;
      isAdmin?: number;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool,
        createTableIfMissing: false,
      }),
      secret: process.env.SESSION_SECRET || "gamestake-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "User not found" });
        }
        if (!user.password) {
          return done(null, false, { message: "Please use Google login for this account" });
        }
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, { id: user.id, username: user.username, gamerUsername: user.gamerUsername, isAdmin: user.isAdmin });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        done(null, { id: user.id, username: user.username, gamerUsername: user.gamerUsername, isAdmin: user.isAdmin });
      } else {
        done(null, false);
      }
    } catch (err) {
      done(err);
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
