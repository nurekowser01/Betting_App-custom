import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, pgEnum, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const walletTypeEnum = pgEnum('wallet_type', ['personal', 'escrow', 'spectator', 'platform']);
export const matchStatusEnum = pgEnum('match_status', ['waiting', 'live', 'pending_approval', 'completed', 'cancelled']);
export const transactionTypeEnum = pgEnum('transaction_type', ['deposit', 'withdrawal', 'bet', 'winnings', 'escrow', 'refund', 'platform_fee']);
export const betStatusEnum = pgEnum('bet_status', ['pending', 'won', 'lost']);

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password"),
  email: varchar("email"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: integer("is_admin").notNull().default(0),
});

export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: walletTypeEnum("type").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  game: text("game").notNull(),
  betAmount: decimal("bet_amount", { precision: 10, scale: 2 }).notNull(),
  status: matchStatusEnum("status").notNull().default("waiting"),
  player1Id: varchar("player1_id").notNull().references(() => users.id),
  player2Id: varchar("player2_id").references(() => users.id),
  reportedWinnerId: varchar("reported_winner_id").references(() => users.id),
  winnerId: varchar("winner_id").references(() => users.id),
  spectatorCount: integer("spectator_count").notNull().default(0),
  proposedAmount: decimal("proposed_amount", { precision: 10, scale: 2 }),
  proposedByUserId: varchar("proposed_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const spectatorBets = pgTable("spectator_bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => matches.id),
  oddsMultiplier: decimal("odds_multiplier", { precision: 4, scale: 2 }).notNull().default("1.90"),
  userId: varchar("user_id").notNull().references(() => users.id),
  predictedWinnerId: varchar("predicted_winner_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: betStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  walletId: varchar("wallet_id").notNull().references(() => wallets.id),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// For OAuth users (Replit Auth)
export const upsertUserSchema = createInsertSchema(users).omit({
  isAdmin: true,
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  status: true,
  player2Id: true,
  winnerId: true,
  spectatorCount: true,
  createdAt: true,
});

export const insertSpectatorBetSchema = createInsertSchema(spectatorBets).omit({
  id: true,
  status: true,
  createdAt: true,
  oddsMultiplier: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type SpectatorBet = typeof spectatorBets.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
