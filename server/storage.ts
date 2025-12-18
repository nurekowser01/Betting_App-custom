import { db } from "./db";
import { eq, and, desc, or, gte } from "drizzle-orm";
import { 
  users, wallets, matches, spectatorBets, transactions, cryptoPayments, integrations,
  type User, type Wallet, type Match, type SpectatorBet, type Transaction, type CryptoPayment, type Integration,
  type InsertUser, type UpsertUser
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserAdminLevel(userId: string, level: number): Promise<User | undefined>;
  updateGamerUsername(userId: string, gamerUsername: string): Promise<User | undefined>;
  suspendUser(userId: string, suspended: number): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;
  
  getWalletsByUserId(userId: string): Promise<Wallet[]>;
  getWallet(id: string): Promise<Wallet | undefined>;
  getWalletByUserAndType(userId: string, type: 'personal' | 'escrow' | 'spectator' | 'platform'): Promise<Wallet | undefined>;
  createWallet(userId: string, type: 'personal' | 'escrow' | 'spectator' | 'platform'): Promise<Wallet>;
  getPlatformWallet(): Promise<Wallet>;
  updateWalletBalance(id: string, newBalance: string): Promise<Wallet | undefined>;
  
  getMatches(): Promise<Match[]>;
  getMatch(id: string): Promise<Match | undefined>;
  getMatchesByUserId(userId: string): Promise<Match[]>;
  getPendingApprovalMatches(): Promise<Match[]>;
  getLiveMatches(): Promise<Match[]>;
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
  createTransaction(userId: string, walletId: string, type: 'deposit' | 'withdrawal' | 'bet' | 'winnings' | 'escrow' | 'refund' | 'platform_fee' | 'crypto_deposit', amount: string, description: string): Promise<Transaction>;
  
  createCryptoPayment(userId: string, chargeId: string, chargeCode: string, hostedUrl: string, usdAmount: string): Promise<CryptoPayment>;
  getCryptoPaymentByChargeId(chargeId: string): Promise<CryptoPayment | undefined>;
  getCryptoPaymentByCode(chargeCode: string): Promise<CryptoPayment | undefined>;
  updateCryptoPaymentStatus(chargeId: string, status: 'pending' | 'completed' | 'expired' | 'cancelled', cryptoCurrency?: string, cryptoAmount?: string): Promise<CryptoPayment | undefined>;
  getCryptoPaymentsByUserId(userId: string): Promise<CryptoPayment[]>;
  
  getAllIntegrations(): Promise<Integration[]>;
  getIntegration(type: 'binance_pay' | 'stripe' | 'coinbase'): Promise<Integration | undefined>;
  upsertIntegration(type: 'binance_pay' | 'stripe' | 'coinbase', data: { enabled?: number; apiKey?: string; secretKey?: string; webhookSecret?: string; additionalConfig?: any }): Promise<Integration>;
  updateIntegrationTestStatus(type: 'binance_pay' | 'stripe' | 'coinbase', testStatus: string): Promise<Integration | undefined>;
  getEnabledIntegrations(): Promise<Integration[]>;
  
  raiseDispute(matchId: string, userId: string, reason: string, evidence?: string): Promise<Match | undefined>;
  getDisputedMatches(): Promise<Match[]>;
  resolveDispute(matchId: string, adminId: string, winnerId: string, resolution: string): Promise<Match | undefined>;
  
  getMatchesReadyForSettlement(): Promise<Match[]>;
  markSettlementExecuted(matchId: string): Promise<Match | undefined>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingById = await this.getUser(userData.id!);
    if (existingById) {
      const [user] = await db
        .update(users)
        .set({
          email: userData.email,
          profileImageUrl: userData.profileImageUrl,
        })
        .where(eq(users.id, userData.id!))
        .returning();
      return user;
    }

    let username = userData.username!;
    let existingByUsername = await this.getUserByUsername(username);
    let suffix = 1;
    while (existingByUsername) {
      username = `${userData.username}_${suffix}`;
      existingByUsername = await this.getUserByUsername(username);
      suffix++;
    }

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        username,
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUserAdminLevel(userId: string, level: number): Promise<User | undefined> {
    const [user] = await db.update(users).set({ isAdmin: level }).where(eq(users.id, userId)).returning();
    return user;
  }

  async updateGamerUsername(userId: string, gamerUsername: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ gamerUsername }).where(eq(users.id, userId)).returning();
    return user;
  }

  async suspendUser(userId: string, suspended: number): Promise<User | undefined> {
    const [user] = await db.update(users).set({ suspended }).where(eq(users.id, userId)).returning();
    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    // Delete related data first (cascade)
    // Get user's wallets first to delete transactions
    const userWallets = await this.getWalletsByUserId(userId);
    const walletIds = userWallets.map(w => w.id);
    
    // Delete transactions for user's wallets
    if (walletIds.length > 0) {
      for (const walletId of walletIds) {
        await db.delete(transactions).where(eq(transactions.walletId, walletId));
      }
    }
    
    // Delete spectator bets by user
    await db.delete(spectatorBets).where(eq(spectatorBets.userId, userId));
    
    // Delete crypto payments by user
    await db.delete(cryptoPayments).where(eq(cryptoPayments.userId, userId));
    
    // Delete wallets
    await db.delete(wallets).where(eq(wallets.userId, userId));
    
    // Finally delete the user
    await db.delete(users).where(eq(users.id, userId));
    return true;
  }

  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    return db.select().from(wallets).where(eq(wallets.userId, userId));
  }

  async getWallet(id: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, id));
    return wallet;
  }

  async getWalletByUserAndType(userId: string, type: 'personal' | 'escrow' | 'spectator' | 'platform'): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(
      and(eq(wallets.userId, userId), eq(wallets.type, type))
    );
    return wallet;
  }

  async createWallet(userId: string, type: 'personal' | 'escrow' | 'spectator' | 'platform'): Promise<Wallet> {
    const [wallet] = await db.insert(wallets).values({ userId, type, balance: "0" }).returning();
    return wallet;
  }

  async getPlatformWallet(): Promise<Wallet> {
    // Get any admin user's platform wallet (level 1 or 2), or create one
    const [adminUser] = await db.select().from(users).where(gte(users.isAdmin, 1)).limit(1);
    
    if (!adminUser) {
      throw new Error("No admin user found for platform wallet");
    }

    let platformWallet = await this.getWalletByUserAndType(adminUser.id, "platform");
    if (!platformWallet) {
      platformWallet = await this.createWallet(adminUser.id, "platform");
    }
    return platformWallet;
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

  async getLiveMatches(): Promise<Match[]> {
    return db.select().from(matches).where(eq(matches.status, "live")).orderBy(desc(matches.createdAt));
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
      approvedAt: new Date(),
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

  async cancelMatch(matchId: string): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({
      status: "cancelled",
    }).where(eq(matches.id, matchId)).returning();
    return match;
  }

  async proposeAmount(matchId: string, proposedAmount: string, proposedByUserId: string): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({
      proposedAmount,
      proposedByUserId,
    }).where(eq(matches.id, matchId)).returning();
    return match;
  }

  async acceptProposal(matchId: string, newAmount: string, player2Id: string): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({
      betAmount: newAmount,
      player2Id,
      status: "live",
      proposedAmount: null,
      proposedByUserId: null,
    }).where(eq(matches.id, matchId)).returning();
    return match;
  }

  async rejectProposal(matchId: string): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({
      proposedAmount: null,
      proposedByUserId: null,
    }).where(eq(matches.id, matchId)).returning();
    return match;
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

  async createTransaction(userId: string, walletId: string, type: 'deposit' | 'withdrawal' | 'bet' | 'winnings' | 'escrow' | 'refund' | 'platform_fee' | 'crypto_deposit', amount: string, description: string): Promise<Transaction> {
    const [tx] = await db.insert(transactions).values({
      userId,
      walletId,
      type,
      amount,
      description,
    }).returning();
    return tx;
  }

  async createCryptoPayment(userId: string, chargeId: string, chargeCode: string, hostedUrl: string, usdAmount: string): Promise<CryptoPayment> {
    const [payment] = await db.insert(cryptoPayments).values({
      userId,
      chargeId,
      chargeCode,
      hostedUrl,
      usdAmount,
      status: "pending",
    }).returning();
    return payment;
  }

  async getCryptoPaymentByChargeId(chargeId: string): Promise<CryptoPayment | undefined> {
    const [payment] = await db.select().from(cryptoPayments).where(eq(cryptoPayments.chargeId, chargeId));
    return payment;
  }

  async getCryptoPaymentByCode(chargeCode: string): Promise<CryptoPayment | undefined> {
    const [payment] = await db.select().from(cryptoPayments).where(eq(cryptoPayments.chargeCode, chargeCode));
    return payment;
  }

  async updateCryptoPaymentStatus(chargeId: string, status: 'pending' | 'completed' | 'expired' | 'cancelled', cryptoCurrency?: string, cryptoAmount?: string): Promise<CryptoPayment | undefined> {
    const updateData: any = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    if (cryptoCurrency) {
      updateData.cryptoCurrency = cryptoCurrency;
    }
    if (cryptoAmount) {
      updateData.cryptoAmount = cryptoAmount;
    }
    const [payment] = await db.update(cryptoPayments).set(updateData).where(eq(cryptoPayments.chargeId, chargeId)).returning();
    return payment;
  }

  async getCryptoPaymentsByUserId(userId: string): Promise<CryptoPayment[]> {
    return db.select().from(cryptoPayments).where(eq(cryptoPayments.userId, userId)).orderBy(desc(cryptoPayments.createdAt));
  }

  async getAllIntegrations(): Promise<Integration[]> {
    return db.select().from(integrations);
  }

  async getIntegration(type: 'binance_pay' | 'stripe' | 'coinbase'): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(eq(integrations.type, type));
    return integration;
  }

  async upsertIntegration(type: 'binance_pay' | 'stripe' | 'coinbase', data: { enabled?: number; apiKey?: string; secretKey?: string; webhookSecret?: string; additionalConfig?: any }): Promise<Integration> {
    const existing = await this.getIntegration(type);
    if (existing) {
      const [updated] = await db.update(integrations).set({
        ...data,
        updatedAt: new Date(),
      }).where(eq(integrations.type, type)).returning();
      return updated;
    }
    const [created] = await db.insert(integrations).values({
      type,
      enabled: data.enabled ?? 0,
      apiKey: data.apiKey,
      secretKey: data.secretKey,
      webhookSecret: data.webhookSecret,
      additionalConfig: data.additionalConfig,
    }).returning();
    return created;
  }

  async updateIntegrationTestStatus(type: 'binance_pay' | 'stripe' | 'coinbase', testStatus: string): Promise<Integration | undefined> {
    const [integration] = await db.update(integrations).set({
      testStatus,
      lastTestedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(integrations.type, type)).returning();
    return integration;
  }

  async getEnabledIntegrations(): Promise<Integration[]> {
    return db.select().from(integrations).where(eq(integrations.enabled, 1));
  }

  async raiseDispute(matchId: string, userId: string, reason: string, evidence?: string): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({
      status: "disputed",
      disputeStatus: "open",
      disputeReason: reason,
      disputeEvidence: evidence || null,
      disputeRaisedById: userId,
    }).where(eq(matches.id, matchId)).returning();
    return match;
  }

  async getDisputedMatches(): Promise<Match[]> {
    return db.select().from(matches).where(eq(matches.status, "disputed")).orderBy(desc(matches.createdAt));
  }

  async resolveDispute(matchId: string, adminId: string, winnerId: string, resolution: string): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({
      status: "completed",
      disputeStatus: "resolved",
      disputeResolvedById: adminId,
      disputeResolution: resolution,
      winnerId: winnerId,
      approvedAt: new Date(),
    }).where(eq(matches.id, matchId)).returning();
    return match;
  }

  async getMatchesReadyForSettlement(): Promise<Match[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const allCompleted = await db.select().from(matches).where(
      and(
        eq(matches.status, "completed"),
        eq(matches.disputeStatus, "none")
      )
    );
    return allCompleted.filter(match => 
      match.approvedAt && 
      match.approvedAt <= fiveMinutesAgo && 
      !match.settlementExecutedAt
    );
  }

  async markSettlementExecuted(matchId: string): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({
      settlementExecutedAt: new Date(),
    }).where(eq(matches.id, matchId)).returning();
    return match;
  }
}

export const storage = new DatabaseStorage();
