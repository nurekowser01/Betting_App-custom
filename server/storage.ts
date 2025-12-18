import { db } from "./db";
import { eq, and, desc, or } from "drizzle-orm";
import { 
  users, wallets, matches, spectatorBets, transactions,
  type User, type Wallet, type Match, type SpectatorBet, type Transaction,
  type InsertUser
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getWalletsByUserId(userId: string): Promise<Wallet[]>;
  getWallet(id: string): Promise<Wallet | undefined>;
  getWalletByUserAndType(userId: string, type: 'personal' | 'escrow' | 'spectator'): Promise<Wallet | undefined>;
  createWallet(userId: string, type: 'personal' | 'escrow' | 'spectator'): Promise<Wallet>;
  updateWalletBalance(id: string, newBalance: string): Promise<Wallet | undefined>;
  
  getMatches(): Promise<Match[]>;
  getMatch(id: string): Promise<Match | undefined>;
  getMatchesByUserId(userId: string): Promise<Match[]>;
  getPendingApprovalMatches(): Promise<Match[]>;
  createMatch(game: string, betAmount: string, player1Id: string): Promise<Match>;
  joinMatch(matchId: string, player2Id: string): Promise<Match | undefined>;
  reportMatchWinner(matchId: string, reportedWinnerId: string): Promise<Match | undefined>;
  approveMatch(matchId: string, winnerId: string): Promise<Match | undefined>;
  completeMatch(matchId: string, winnerId: string): Promise<Match | undefined>;
  updateMatchSpectatorCount(matchId: string, count: number): Promise<void>;
  
  getSpectatorBetsByMatch(matchId: string): Promise<SpectatorBet[]>;
  getSpectatorBetsByUser(userId: string): Promise<SpectatorBet[]>;
  createSpectatorBet(matchId: string, oddsMultiplier: string, userId: string, predictedWinnerId: string, amount: string): Promise<SpectatorBet>;
  updateSpectatorBetStatus(id: string, status: 'won' | 'lost'): Promise<void>;
  
  getTransactionsByUserId(userId: string): Promise<Transaction[]>;
  createTransaction(userId: string, walletId: string, type: 'deposit' | 'withdrawal' | 'bet' | 'winnings' | 'escrow' | 'refund', amount: string, description: string): Promise<Transaction>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    return db.select().from(wallets).where(eq(wallets.userId, userId));
  }

  async getWallet(id: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, id));
    return wallet;
  }

  async getWalletByUserAndType(userId: string, type: 'personal' | 'escrow' | 'spectator'): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(
      and(eq(wallets.userId, userId), eq(wallets.type, type))
    );
    return wallet;
  }

  async createWallet(userId: string, type: 'personal' | 'escrow' | 'spectator'): Promise<Wallet> {
    const [wallet] = await db.insert(wallets).values({ userId, type, balance: "0" }).returning();
    return wallet;
  }

  async updateWalletBalance(id: string, newBalance: string): Promise<Wallet | undefined> {
    const [wallet] = await db.update(wallets).set({ balance: newBalance }).where(eq(wallets.id, id)).returning();
    return wallet;
  }

  async getMatches(): Promise<Match[]> {
    return db.select().from(matches).orderBy(desc(matches.createdAt));
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async getMatchesByUserId(userId: string): Promise<Match[]> {
    return db.select().from(matches).where(
      or(eq(matches.player1Id, userId), eq(matches.player2Id, userId))
    ).orderBy(desc(matches.createdAt));
  }

  async createMatch(game: string, betAmount: string, player1Id: string): Promise<Match> {
    const [match] = await db.insert(matches).values({
      game,
      betAmount,
      player1Id,
      status: "waiting",
      spectatorCount: 0,
    }).returning();
    return match;
  }

  async joinMatch(matchId: string, player2Id: string): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({
      player2Id,
      status: "live",
    }).where(eq(matches.id, matchId)).returning();
    return match;
  }

  async getPendingApprovalMatches(): Promise<Match[]> {
    return db.select().from(matches).where(eq(matches.status, "pending_approval")).orderBy(desc(matches.createdAt));
  }

  async reportMatchWinner(matchId: string, reportedWinnerId: string): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({
      reportedWinnerId,
      status: "pending_approval",
    }).where(eq(matches.id, matchId)).returning();
    return match;
  }

  async approveMatch(matchId: string, winnerId: string): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({
      winnerId,
      status: "completed",
    }).where(eq(matches.id, matchId)).returning();
    return match;
  }

  async rejectMatch(matchId: string): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({
      status: "cancelled",
    }).where(eq(matches.id, matchId)).returning();
    return match;
  }

  async completeMatch(matchId: string, winnerId: string): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({
      winnerId,
      status: "completed",
    }).where(eq(matches.id, matchId)).returning();
    return match;
  }

  async updateMatchSpectatorCount(matchId: string, count: number): Promise<void> {
    await db.update(matches).set({ spectatorCount: count }).where(eq(matches.id, matchId));
  }

  async getSpectatorBetsByMatch(matchId: string): Promise<SpectatorBet[]> {
    return db.select().from(spectatorBets).where(eq(spectatorBets.matchId, matchId));
  }

  async getSpectatorBetsByUser(userId: string): Promise<SpectatorBet[]> {
    return db.select().from(spectatorBets).where(eq(spectatorBets.userId, userId)).orderBy(desc(spectatorBets.createdAt));
  }

  async createSpectatorBet(matchId: string, oddsMultiplier: string, userId: string, predictedWinnerId: string, amount: string): Promise<SpectatorBet> {
    const [bet] = await db.insert(spectatorBets).values({
      matchId,
      oddsMultiplier,
      userId,
      predictedWinnerId,
      amount,
      status: "pending",
    }).returning();
    return bet;
  }

  async updateSpectatorBetStatus(id: string, status: 'won' | 'lost'): Promise<void> {
    await db.update(spectatorBets).set({ status }).where(eq(spectatorBets.id, id));
  }

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }

  async createTransaction(userId: string, walletId: string, type: 'deposit' | 'withdrawal' | 'bet' | 'winnings' | 'escrow' | 'refund', amount: string, description: string): Promise<Transaction> {
    const [tx] = await db.insert(transactions).values({
      userId,
      walletId,
      type,
      amount,
      description,
    }).returning();
    return tx;
  }
}

export const storage = new DatabaseStorage();
