import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, hashPassword } from "./auth";
import { setupReplitAuth } from "./replitAuth";
import passport from "passport";
import { insertUserSchema, insertMatchSchema, insertSpectatorBetSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  
  await setupReplitAuth(app);

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      if (!parsed.data.password) {
        return res.status(400).json({ message: "Password is required" });
      }

      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(parsed.data.password);
      const user = await storage.createUser({
        username: parsed.data.username,
        password: hashedPassword,
      });
      
      // Create all three wallets for the user
      await storage.createWallet(user.id, "personal");
      await storage.createWallet(user.id, "escrow");
      await storage.createWallet(user.id, "spectator");

      req.login({ id: user.id, username: user.username, gamerUsername: user.gamerUsername }, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        res.json({ id: user.id, username: user.username, gamerUsername: user.gamerUsername });
      });
    } catch (error) {
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error("Login authentication error:", err);
        return res.status(500).json({ message: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session login error:", loginErr);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ id: user.id, username: user.username, gamerUsername: user.gamerUsername, isAdmin: user.isAdmin });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.patch("/api/auth/gamer-username", requireAuth, async (req, res) => {
    try {
      const { gamerUsername } = req.body;
      if (!gamerUsername || typeof gamerUsername !== 'string' || gamerUsername.trim().length < 2) {
        return res.status(400).json({ message: "Gamer username must be at least 2 characters" });
      }

      await storage.updateGamerUsername(req.user!.id, gamerUsername.trim());
      const updatedUser = await storage.getUser(req.user!.id);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update gamer username" });
    }
  });

  // Wallet routes
  app.get("/api/wallets", requireAuth, async (req, res) => {
    try {
      const wallets = await storage.getWalletsByUserId(req.user!.id);
      res.json(wallets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  app.post("/api/wallets/:type/deposit", requireAuth, async (req, res) => {
    try {
      const { type } = req.params as { type: 'personal' | 'spectator' };
      const { amount } = req.body;

      if (!['personal', 'spectator'].includes(type)) {
        return res.status(400).json({ message: "Invalid wallet type" });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const wallet = await storage.getWalletByUserAndType(req.user!.id, type);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      const newBalance = (parseFloat(wallet.balance) + numAmount).toFixed(2);
      await storage.updateWalletBalance(wallet.id, newBalance);
      await storage.createTransaction(req.user!.id, wallet.id, "deposit", numAmount.toFixed(2), `Deposited funds to ${type} wallet`);

      const updatedWallets = await storage.getWalletsByUserId(req.user!.id);
      res.json(updatedWallets);
    } catch (error) {
      res.status(500).json({ message: "Deposit failed" });
    }
  });

  app.post("/api/wallets/personal/withdraw", requireAuth, async (req, res) => {
    try {
      const { amount } = req.body;
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const wallet = await storage.getWalletByUserAndType(req.user!.id, "personal");
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      const currentBalance = parseFloat(wallet.balance);
      if (numAmount > currentBalance) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      const newBalance = (currentBalance - numAmount).toFixed(2);
      await storage.updateWalletBalance(wallet.id, newBalance);
      await storage.createTransaction(req.user!.id, wallet.id, "withdrawal", numAmount.toFixed(2), "Withdrew funds from personal wallet");

      const updatedWallets = await storage.getWalletsByUserId(req.user!.id);
      res.json(updatedWallets);
    } catch (error) {
      res.status(500).json({ message: "Withdrawal failed" });
    }
  });

  // Leaderboard and stats routes
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const leaderboard = await storage.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/stats/:userId", async (req, res) => {
    try {
      const stats = await storage.getPlayerStats(req.params.userId);
      if (!stats) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch player stats" });
    }
  });

  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getPlayerStats(req.user!.id);
      if (!stats) {
        return res.status(404).json({ message: "Stats not found" });
      }
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Match routes
  app.get("/api/matches", async (req, res) => {
    try {
      const matchList = await storage.getMatches();
      
      // Enrich with player info
      const enrichedMatches = await Promise.all(matchList.map(async (match) => {
        const player1 = await storage.getUser(match.player1Id);
        const player2 = match.player2Id ? await storage.getUser(match.player2Id) : null;
        const winner = match.winnerId ? await storage.getUser(match.winnerId) : null;
        const proposedBy = match.proposedByUserId ? await storage.getUser(match.proposedByUserId) : null;
        return {
          ...match,
          player1: player1 ? { id: player1.id, username: player1.username } : null,
          player2: player2 ? { id: player2.id, username: player2.username } : null,
          winner: winner ? { id: winner.id, username: winner.username } : null,
          proposedBy: proposedBy ? { id: proposedBy.id, username: proposedBy.username } : null,
        };
      }));

      res.json(enrichedMatches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.post("/api/matches", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        game: z.string().min(1),
        betAmount: z.number().positive(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const { game, betAmount } = parsed.data;
      const personalWallet = await storage.getWalletByUserAndType(req.user!.id, "personal");
      const escrowWallet = await storage.getWalletByUserAndType(req.user!.id, "escrow");

      if (!personalWallet || !escrowWallet) {
        return res.status(400).json({ message: "Wallets not found" });
      }

      const currentBalance = parseFloat(personalWallet.balance);
      if (betAmount > currentBalance) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // Transfer to escrow
      const newPersonalBalance = (currentBalance - betAmount).toFixed(2);
      const newEscrowBalance = (parseFloat(escrowWallet.balance) + betAmount).toFixed(2);

      await storage.updateWalletBalance(personalWallet.id, newPersonalBalance);
      await storage.updateWalletBalance(escrowWallet.id, newEscrowBalance);

      const match = await storage.createMatch(game, betAmount.toFixed(2), req.user!.id);
      await storage.createTransaction(req.user!.id, escrowWallet.id, "escrow", betAmount.toFixed(2), `Created match: ${game}`);

      res.json(match);
    } catch (error) {
      res.status(500).json({ message: "Failed to create match" });
    }
  });

  app.post("/api/matches/:id/join", requireAuth, async (req, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.status !== "waiting") {
        return res.status(400).json({ message: "Match is not available" });
      }

      if (match.player1Id === req.user!.id) {
        return res.status(400).json({ message: "Cannot join your own match" });
      }

      const betAmount = parseFloat(match.betAmount);
      const personalWallet = await storage.getWalletByUserAndType(req.user!.id, "personal");
      const escrowWallet = await storage.getWalletByUserAndType(req.user!.id, "escrow");

      if (!personalWallet || !escrowWallet) {
        return res.status(400).json({ message: "Wallets not found" });
      }

      const currentBalance = parseFloat(personalWallet.balance);
      if (betAmount > currentBalance) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // Transfer to escrow
      const newPersonalBalance = (currentBalance - betAmount).toFixed(2);
      const newEscrowBalance = (parseFloat(escrowWallet.balance) + betAmount).toFixed(2);

      await storage.updateWalletBalance(personalWallet.id, newPersonalBalance);
      await storage.updateWalletBalance(escrowWallet.id, newEscrowBalance);

      const updatedMatch = await storage.joinMatch(match.id, req.user!.id);
      await storage.createTransaction(req.user!.id, escrowWallet.id, "escrow", betAmount.toFixed(2), `Joined match: ${match.game}`);

      res.json(updatedMatch);
    } catch (error) {
      res.status(500).json({ message: "Failed to join match" });
    }
  });

  // Cancel match (creator only, if no one joined)
  app.post("/api/matches/:id/cancel", requireAuth, async (req, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.player1Id !== req.user!.id) {
        return res.status(403).json({ message: "Only the creator can cancel" });
      }

      if (match.status !== "waiting") {
        return res.status(400).json({ message: "Can only cancel waiting matches" });
      }

      if (match.player2Id) {
        return res.status(400).json({ message: "Cannot cancel after someone joined" });
      }

      // Refund creator from escrow
      const escrowWallet = await storage.getWalletByUserAndType(req.user!.id, "escrow");
      const personalWallet = await storage.getWalletByUserAndType(req.user!.id, "personal");

      if (!escrowWallet || !personalWallet) {
        return res.status(400).json({ message: "Wallets not found" });
      }

      const betAmount = parseFloat(match.betAmount);
      const newEscrowBalance = (parseFloat(escrowWallet.balance) - betAmount).toFixed(2);
      const newPersonalBalance = (parseFloat(personalWallet.balance) + betAmount).toFixed(2);

      await storage.updateWalletBalance(escrowWallet.id, newEscrowBalance);
      await storage.updateWalletBalance(personalWallet.id, newPersonalBalance);
      await storage.createTransaction(req.user!.id, personalWallet.id, "refund", betAmount.toFixed(2), `Cancelled match: ${match.game}`);

      const cancelledMatch = await storage.cancelMatch(match.id);
      res.json(cancelledMatch);
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel match" });
    }
  });

  // Propose different amount when joining
  app.post("/api/matches/:id/propose", requireAuth, async (req, res) => {
    try {
      const { proposedAmount } = req.body;
      const match = await storage.getMatch(req.params.id);

      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.status !== "waiting") {
        return res.status(400).json({ message: "Match is not available" });
      }

      if (match.player1Id === req.user!.id) {
        return res.status(400).json({ message: "Cannot propose on your own match" });
      }

      if (match.proposedByUserId) {
        return res.status(400).json({ message: "There is already a pending proposal" });
      }

      const amount = parseFloat(proposedAmount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const updatedMatch = await storage.proposeAmount(match.id, amount.toFixed(2), req.user!.id);
      res.json(updatedMatch);
    } catch (error) {
      res.status(500).json({ message: "Failed to propose amount" });
    }
  });

  // Creator accepts proposal
  app.post("/api/matches/:id/accept-proposal", requireAuth, async (req, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.player1Id !== req.user!.id) {
        return res.status(403).json({ message: "Only the creator can accept proposals" });
      }

      if (!match.proposedAmount || !match.proposedByUserId) {
        return res.status(400).json({ message: "No pending proposal" });
      }

      const proposedAmount = parseFloat(match.proposedAmount);
      const originalAmount = parseFloat(match.betAmount);

      // Refund creator's original escrow and put new amount
      const creatorEscrowWallet = await storage.getWalletByUserAndType(match.player1Id, "escrow");
      const creatorPersonalWallet = await storage.getWalletByUserAndType(match.player1Id, "personal");

      if (!creatorEscrowWallet || !creatorPersonalWallet) {
        return res.status(400).json({ message: "Creator wallets not found" });
      }

      // Calculate difference and adjust creator's wallets
      const difference = proposedAmount - originalAmount;
      const creatorPersonalBalance = parseFloat(creatorPersonalWallet.balance);

      if (difference > 0 && creatorPersonalBalance < difference) {
        return res.status(400).json({ message: "Insufficient funds to match the proposed amount" });
      }

      // Adjust creator's escrow to new amount
      const newCreatorEscrow = (parseFloat(creatorEscrowWallet.balance) + difference).toFixed(2);
      const newCreatorPersonal = (creatorPersonalBalance - difference).toFixed(2);

      await storage.updateWalletBalance(creatorEscrowWallet.id, newCreatorEscrow);
      await storage.updateWalletBalance(creatorPersonalWallet.id, newCreatorPersonal);

      if (difference !== 0) {
        const txType = difference > 0 ? "escrow" : "refund";
        const txAmount = Math.abs(difference).toFixed(2);
        await storage.createTransaction(match.player1Id, difference > 0 ? creatorEscrowWallet.id : creatorPersonalWallet.id, txType, txAmount, `Bet amount adjusted: ${match.game}`);
      }

      // Joiner pays the proposed amount
      const joinerPersonalWallet = await storage.getWalletByUserAndType(match.proposedByUserId, "personal");
      const joinerEscrowWallet = await storage.getWalletByUserAndType(match.proposedByUserId, "escrow");

      if (!joinerPersonalWallet || !joinerEscrowWallet) {
        return res.status(400).json({ message: "Joiner wallets not found" });
      }

      const joinerBalance = parseFloat(joinerPersonalWallet.balance);
      if (joinerBalance < proposedAmount) {
        return res.status(400).json({ message: "Joiner has insufficient funds" });
      }

      const newJoinerPersonal = (joinerBalance - proposedAmount).toFixed(2);
      const newJoinerEscrow = (parseFloat(joinerEscrowWallet.balance) + proposedAmount).toFixed(2);

      await storage.updateWalletBalance(joinerPersonalWallet.id, newJoinerPersonal);
      await storage.updateWalletBalance(joinerEscrowWallet.id, newJoinerEscrow);
      await storage.createTransaction(match.proposedByUserId, joinerEscrowWallet.id, "escrow", proposedAmount.toFixed(2), `Joined match: ${match.game}`);

      const updatedMatch = await storage.acceptProposal(match.id, proposedAmount.toFixed(2), match.proposedByUserId);
      res.json(updatedMatch);
    } catch (error) {
      res.status(500).json({ message: "Failed to accept proposal" });
    }
  });

  // Creator rejects proposal
  app.post("/api/matches/:id/reject-proposal", requireAuth, async (req, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.player1Id !== req.user!.id) {
        return res.status(403).json({ message: "Only the creator can reject proposals" });
      }

      if (!match.proposedAmount || !match.proposedByUserId) {
        return res.status(400).json({ message: "No pending proposal" });
      }

      const updatedMatch = await storage.rejectProposal(match.id);
      res.json(updatedMatch);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject proposal" });
    }
  });

  // Player reports winner - sets match to pending_approval
  app.post("/api/matches/:id/complete", requireAuth, async (req, res) => {
    try {
      const { winnerId } = req.body;
      const match = await storage.getMatch(req.params.id);

      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.status !== "live") {
        return res.status(400).json({ message: "Match is not live" });
      }

      if (match.player1Id !== req.user!.id && match.player2Id !== req.user!.id) {
        return res.status(403).json({ message: "You are not a participant" });
      }

      if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
        return res.status(400).json({ message: "Invalid winner" });
      }

      // Set to pending_approval - admin will approve and transfer funds
      const updatedMatch = await storage.reportMatchWinner(match.id, winnerId);
      res.json(updatedMatch);
    } catch (error) {
      res.status(500).json({ message: "Failed to report winner" });
    }
  });

  // Admin: Get pending approval matches
  app.get("/api/admin/matches/pending", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 1) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const pendingMatches = await storage.getPendingApprovalMatches();
      
      // Enrich with player info and spectator bet summary
      const enrichedMatches = await Promise.all(pendingMatches.map(async (match) => {
        const player1 = await storage.getUser(match.player1Id);
        const player2 = match.player2Id ? await storage.getUser(match.player2Id) : null;
        const reportedWinner = match.reportedWinnerId ? await storage.getUser(match.reportedWinnerId) : null;
        
        // Get spectator bets summary
        const spectatorBets = await storage.getSpectatorBetsByMatch(match.id);
        const totalSpectatorBets = spectatorBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
        const betsOnPlayer1 = spectatorBets
          .filter(bet => bet.predictedWinnerId === match.player1Id)
          .reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
        const betsOnPlayer2 = match.player2Id 
          ? spectatorBets.filter(bet => bet.predictedWinnerId === match.player2Id).reduce((sum, bet) => sum + parseFloat(bet.amount), 0)
          : 0;
        const potentialPayoutPlayer1 = betsOnPlayer1 * 1.9;
        const potentialPayoutPlayer2 = betsOnPlayer2 * 1.9;
        
        return {
          ...match,
          player1: player1 ? { id: player1.id, username: player1.username } : null,
          player2: player2 ? { id: player2.id, username: player2.username } : null,
          reportedWinner: reportedWinner ? { id: reportedWinner.id, username: reportedWinner.username } : null,
          spectatorBetSummary: {
            totalBets: totalSpectatorBets,
            betsOnPlayer1,
            betsOnPlayer2,
            potentialPayoutPlayer1,
            potentialPayoutPlayer2,
            betCount: spectatorBets.length,
          },
        };
      }));

      res.json(enrichedMatches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending matches" });
    }
  });

  // Admin: Approve match (funds held for 5-minute dispute window)
  app.post("/api/admin/matches/:id/approve", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 1) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { winnerId } = req.body;
      const match = await storage.getMatch(req.params.id);

      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.status !== "pending_approval") {
        return res.status(400).json({ message: "Match is not pending approval" });
      }

      if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
        return res.status(400).json({ message: "Invalid winner" });
      }

      // Just mark as approved - funds will be transferred after 5-minute dispute window
      const completedMatch = await storage.approveMatch(match.id, winnerId);
      res.json({ 
        ...completedMatch, 
        message: "Match approved. Funds will be transferred after 5-minute dispute window." 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve match" });
    }
  });

  // Admin: Reject match and refund both players
  app.post("/api/admin/matches/:id/reject", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 1) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const match = await storage.getMatch(req.params.id);

      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.status !== "pending_approval") {
        return res.status(400).json({ message: "Match is not pending approval" });
      }

      const betAmount = parseFloat(match.betAmount);

      // Refund player 1
      const player1Escrow = await storage.getWalletByUserAndType(match.player1Id, "escrow");
      const player1Personal = await storage.getWalletByUserAndType(match.player1Id, "personal");
      if (player1Escrow && player1Personal) {
        const newEscrowBalance = (parseFloat(player1Escrow.balance) - betAmount).toFixed(2);
        const newPersonalBalance = (parseFloat(player1Personal.balance) + betAmount).toFixed(2);
        await storage.updateWalletBalance(player1Escrow.id, newEscrowBalance);
        await storage.updateWalletBalance(player1Personal.id, newPersonalBalance);
        await storage.createTransaction(match.player1Id, player1Personal.id, "refund", betAmount.toFixed(2), `Match rejected: ${match.game}`);
      }

      // Refund player 2
      if (match.player2Id) {
        const player2Escrow = await storage.getWalletByUserAndType(match.player2Id, "escrow");
        const player2Personal = await storage.getWalletByUserAndType(match.player2Id, "personal");
        if (player2Escrow && player2Personal) {
          const newEscrowBalance = (parseFloat(player2Escrow.balance) - betAmount).toFixed(2);
          const newPersonalBalance = (parseFloat(player2Personal.balance) + betAmount).toFixed(2);
          await storage.updateWalletBalance(player2Escrow.id, newEscrowBalance);
          await storage.updateWalletBalance(player2Personal.id, newPersonalBalance);
          await storage.createTransaction(match.player2Id, player2Personal.id, "refund", betAmount.toFixed(2), `Match rejected: ${match.game}`);
        }
      }

      // Refund spectator bets
      const spectatorBets = await storage.getSpectatorBetsByMatch(match.id);
      for (const bet of spectatorBets) {
        await storage.updateSpectatorBetStatus(bet.id, "lost");
        const spectatorWallet = await storage.getWalletByUserAndType(bet.userId, "spectator");
        if (spectatorWallet) {
          const refundAmount = parseFloat(bet.amount);
          const newBalance = (parseFloat(spectatorWallet.balance) + refundAmount).toFixed(2);
          await storage.updateWalletBalance(spectatorWallet.id, newBalance);
          await storage.createTransaction(bet.userId, spectatorWallet.id, "refund", refundAmount.toFixed(2), `Match rejected: ${match.game}`);
        }
      }

      const cancelledMatch = await storage.rejectMatch(match.id);
      res.json(cancelledMatch);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject match" });
    }
  });

  // Raise dispute on a match
  app.post("/api/matches/:id/dispute", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        reason: z.string().min(10, "Please provide a detailed reason"),
        evidence: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.player1Id !== req.user!.id && match.player2Id !== req.user!.id) {
        return res.status(403).json({ message: "Only participants can raise a dispute" });
      }

      if (match.status !== "pending_approval" && match.status !== "completed") {
        return res.status(400).json({ message: "Can only dispute matches that are pending approval or completed" });
      }

      if (match.disputeStatus !== "none") {
        return res.status(400).json({ message: "This match already has a dispute" });
      }

      // Check if 5-minute dispute window has expired (only for completed/approved matches)
      if (match.status === "completed" && match.approvedAt) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (new Date(match.approvedAt) <= fiveMinutesAgo) {
          return res.status(400).json({ message: "Dispute window has expired. You can only dispute within 5 minutes of approval." });
        }
      }

      // Check if settlement already executed
      if (match.settlementExecutedAt) {
        return res.status(400).json({ message: "Cannot dispute - funds have already been transferred" });
      }

      const disputedMatch = await storage.raiseDispute(match.id, req.user!.id, parsed.data.reason, parsed.data.evidence);
      res.json(disputedMatch);
    } catch (error) {
      console.error("Failed to raise dispute:", error);
      res.status(500).json({ message: "Failed to raise dispute" });
    }
  });

  // Admin: Get disputed matches
  app.get("/api/admin/matches/disputed", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 1) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const disputedMatches = await storage.getDisputedMatches();
      
      const enrichedMatches = await Promise.all(disputedMatches.map(async (match) => {
        const player1 = await storage.getUser(match.player1Id);
        const player2 = match.player2Id ? await storage.getUser(match.player2Id) : null;
        const raisedBy = match.disputeRaisedById ? await storage.getUser(match.disputeRaisedById) : null;
        
        return {
          ...match,
          player1: player1 ? { id: player1.id, username: player1.username } : null,
          player2: player2 ? { id: player2.id, username: player2.username } : null,
          disputeRaisedBy: raisedBy ? { id: raisedBy.id, username: raisedBy.username } : null,
        };
      }));

      res.json(enrichedMatches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch disputed matches" });
    }
  });

  // Admin: Resolve dispute
  app.post("/api/admin/matches/:id/resolve-dispute", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 1) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const schema = z.object({
        winnerId: z.string(),
        resolution: z.string().min(10, "Please provide a resolution explanation"),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.status !== "disputed") {
        return res.status(400).json({ message: "Match is not disputed" });
      }

      const { winnerId, resolution } = parsed.data;

      if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
        return res.status(400).json({ message: "Winner must be one of the players" });
      }

      const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
      if (!loserId) {
        return res.status(400).json({ message: "Match doesn't have two players" });
      }

      const betAmount = parseFloat(match.betAmount);
      const totalPot = betAmount * 2;
      const platformFee = totalPot * 0.10;
      const winnerPayout = totalPot - platformFee;

      const winnerEscrow = await storage.getWalletByUserAndType(winnerId, "escrow");
      const winnerPersonal = await storage.getWalletByUserAndType(winnerId, "personal");
      const loserEscrow = await storage.getWalletByUserAndType(loserId, "escrow");
      const platformWallet = await storage.getPlatformWallet();

      if (!winnerEscrow || !winnerPersonal || !loserEscrow) {
        return res.status(400).json({ message: "Wallets not found" });
      }

      // Transfer from both escrows
      const newWinnerEscrow = (parseFloat(winnerEscrow.balance) - betAmount).toFixed(2);
      const newLoserEscrow = (parseFloat(loserEscrow.balance) - betAmount).toFixed(2);
      const newWinnerPersonal = (parseFloat(winnerPersonal.balance) + winnerPayout).toFixed(2);
      const newPlatformBalance = (parseFloat(platformWallet.balance) + platformFee).toFixed(2);

      await storage.updateWalletBalance(winnerEscrow.id, newWinnerEscrow);
      await storage.updateWalletBalance(loserEscrow.id, newLoserEscrow);
      await storage.updateWalletBalance(winnerPersonal.id, newWinnerPersonal);
      await storage.updateWalletBalance(platformWallet.id, newPlatformBalance);

      await storage.createTransaction(winnerId, winnerPersonal.id, "winnings", winnerPayout.toFixed(2), `Dispute resolved - Won: ${match.game}`);
      await storage.createTransaction(platformWallet.userId, platformWallet.id, "platform_fee", platformFee.toFixed(2), `Dispute resolved - Platform fee: ${match.game}`);

      // Handle spectator bets - only process pending bets to avoid double payouts
      const spectatorBets = await storage.getSpectatorBetsByMatch(match.id);
      for (const bet of spectatorBets) {
        // Skip if already processed
        if (bet.status === "won" || bet.status === "lost") continue;
        
        const spectatorWallet = await storage.getWalletByUserAndType(bet.userId, "spectator");
        if (!spectatorWallet) continue;

        if (bet.predictedWinnerId === winnerId) {
          await storage.updateSpectatorBetStatus(bet.id, "won");
          const payout = parseFloat(bet.amount) * parseFloat(bet.oddsMultiplier);
          const newBalance = (parseFloat(spectatorWallet.balance) + payout).toFixed(2);
          await storage.updateWalletBalance(spectatorWallet.id, newBalance);
          await storage.createTransaction(bet.userId, spectatorWallet.id, "winnings", payout.toFixed(2), `Dispute resolved - Spectator bet won: ${match.game}`);
        } else {
          await storage.updateSpectatorBetStatus(bet.id, "lost");
        }
      }

      const resolvedMatch = await storage.resolveDispute(match.id, req.user!.id, winnerId, resolution);
      res.json(resolvedMatch);
    } catch (error) {
      console.error("Failed to resolve dispute:", error);
      res.status(500).json({ message: "Failed to resolve dispute" });
    }
  });

  // Spectator bet routes
  app.post("/api/matches/:id/spectator-bet", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        predictedWinnerId: z.string(),
        amount: z.number().positive(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.status !== "live") {
        return res.status(400).json({ message: "Can only bet on live matches" });
      }

      if (match.player1Id === req.user!.id || match.player2Id === req.user!.id) {
        return res.status(400).json({ message: "Cannot bet on your own match" });
      }

      const { predictedWinnerId, amount } = parsed.data;

      if (predictedWinnerId !== match.player1Id && predictedWinnerId !== match.player2Id) {
        return res.status(400).json({ message: "Invalid predicted winner" });
      }

      const spectatorWallet = await storage.getWalletByUserAndType(req.user!.id, "spectator");
      if (!spectatorWallet) {
        return res.status(400).json({ message: "Spectator wallet not found" });
      }

      const currentBalance = parseFloat(spectatorWallet.balance);
      if (amount > currentBalance) {
        return res.status(400).json({ message: "Insufficient funds in spectator wallet" });
      }

      // Deduct from spectator wallet
      const newBalance = (currentBalance - amount).toFixed(2);
      await storage.updateWalletBalance(spectatorWallet.id, newBalance);

      const bet = await storage.createSpectatorBet(match.id, "1.90", req.user!.id, predictedWinnerId, amount.toFixed(2));
      await storage.createTransaction(req.user!.id, spectatorWallet.id, "bet", amount.toFixed(2), `Spectator bet on ${match.game}`);

      // Update spectator count
      await storage.updateMatchSpectatorCount(match.id, match.spectatorCount + 1);

      res.json(bet);
    } catch (error) {
      res.status(500).json({ message: "Failed to place bet" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const txs = await storage.getTransactionsByUserId(req.user!.id);
      res.json(txs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Admin: Get live matches
  app.get("/api/admin/matches/live", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 1) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const liveMatches = await storage.getLiveMatches();
      
      const enrichedMatches = await Promise.all(liveMatches.map(async (match) => {
        const player1 = await storage.getUser(match.player1Id);
        const player2 = match.player2Id ? await storage.getUser(match.player2Id) : null;
        const spectatorBets = await storage.getSpectatorBetsByMatch(match.id);
        
        const totalSpectatorBets = spectatorBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
        const betsOnPlayer1 = spectatorBets
          .filter(bet => bet.predictedWinnerId === match.player1Id)
          .reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
        const betsOnPlayer2 = match.player2Id 
          ? spectatorBets.filter(bet => bet.predictedWinnerId === match.player2Id).reduce((sum, bet) => sum + parseFloat(bet.amount), 0)
          : 0;
        const potentialPayoutPlayer1 = betsOnPlayer1 * 1.9;
        const potentialPayoutPlayer2 = betsOnPlayer2 * 1.9;
        
        return {
          ...match,
          player1: player1 ? { id: player1.id, username: player1.username } : null,
          player2: player2 ? { id: player2.id, username: player2.username } : null,
          totalSpectatorBets,
          spectatorBetSummary: {
            totalBets: totalSpectatorBets,
            betsOnPlayer1,
            betsOnPlayer2,
            potentialPayoutPlayer1,
            potentialPayoutPlayer2,
            betCount: spectatorBets.length,
          },
        };
      }));

      res.json(enrichedMatches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch live matches" });
    }
  });

  // Public: Get user profile with stats
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's matches
      const userMatches = await storage.getMatchesByUserId(req.params.id);
      
      // Calculate stats
      const completedMatches = userMatches.filter(m => m.status === 'completed');
      const wins = completedMatches.filter(m => m.winnerId === req.params.id).length;
      const losses = completedMatches.filter(m => m.winnerId && m.winnerId !== req.params.id).length;
      const totalMatches = completedMatches.length;
      
      // Calculate total earnings from wins
      let totalEarnings = 0;
      for (const match of completedMatches) {
        if (match.winnerId === req.params.id) {
          // Winner gets 90% of the pot (2x bet amount minus 10% platform fee)
          const pot = parseFloat(match.betAmount) * 2;
          const winnerShare = pot * 0.9;
          totalEarnings += winnerShare;
        }
      }

      // Get spectator betting stats
      const spectatorBets = await storage.getSpectatorBetsByUser(req.params.id);
      const wonBets = spectatorBets.filter(b => b.status === 'won').length;
      const lostBets = spectatorBets.filter(b => b.status === 'lost').length;
      const pendingBets = spectatorBets.filter(b => b.status === 'pending').length;

      // Get match history with player details
      const matchHistory = await Promise.all(userMatches.slice(0, 20).map(async (match) => {
        const player1 = await storage.getUser(match.player1Id);
        const player2 = match.player2Id ? await storage.getUser(match.player2Id) : null;
        const winner = match.winnerId ? await storage.getUser(match.winnerId) : null;
        
        return {
          id: match.id,
          game: match.game,
          betAmount: match.betAmount,
          status: match.status,
          createdAt: match.createdAt,
          player1: player1 ? { id: player1.id, username: player1.username, gamerUsername: player1.gamerUsername } : null,
          player2: player2 ? { id: player2.id, username: player2.username, gamerUsername: player2.gamerUsername } : null,
          winner: winner ? { id: winner.id, username: winner.username } : null,
          isWin: match.winnerId === req.params.id,
        };
      }));

      res.json({
        user: {
          id: targetUser.id,
          username: targetUser.username,
          gamerUsername: targetUser.gamerUsername,
          profileImageUrl: targetUser.profileImageUrl,
        },
        stats: {
          wins,
          losses,
          totalMatches,
          winRate: totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : "0.0",
          totalEarnings: totalEarnings.toFixed(2),
        },
        spectatorStats: {
          wonBets,
          lostBets,
          pendingBets,
          totalBets: spectatorBets.length,
        },
        matchHistory,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Admin: Get all users (super admin only)
  app.get("/api/admin/users", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 2) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const allUsers = await storage.getAllUsers();
      const usersWithoutPasswords = allUsers.map(({ password, ...rest }) => rest);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Update user admin level (super admin only)
  app.post("/api/admin/users/:id/admin-level", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 2) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const schema = z.object({
        level: z.number().int().min(0).max(2),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Cannot demote yourself
      if (targetUser.id === user.id) {
        return res.status(400).json({ message: "Cannot change your own admin level" });
      }

      const updatedUser = await storage.updateUserAdminLevel(req.params.id, parsed.data.level);
      if (updatedUser) {
        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update user admin level" });
    }
  });

  // Admin: Suspend/unsuspend user (super admin only)
  app.post("/api/admin/users/:id/suspend", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 2) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const schema = z.object({
        suspended: z.number().int().min(0).max(1),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Cannot suspend yourself
      if (targetUser.id === user.id) {
        return res.status(400).json({ message: "Cannot suspend yourself" });
      }

      // Cannot suspend other admins
      if (targetUser.isAdmin >= 1) {
        return res.status(400).json({ message: "Cannot suspend admin users" });
      }

      const updatedUser = await storage.suspendUser(req.params.id, parsed.data.suspended);
      if (updatedUser) {
        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to suspend user" });
    }
  });

  // Admin: Delete user (super admin only)
  app.delete("/api/admin/users/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 2) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Cannot delete yourself
      if (targetUser.id === user.id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }

      // Cannot delete other admins
      if (targetUser.isAdmin >= 1) {
        return res.status(400).json({ message: "Cannot delete admin users" });
      }

      await storage.deleteUser(req.params.id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Admin: Get all integrations
  app.get("/api/admin/integrations", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 2) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const allIntegrations = await storage.getAllIntegrations();
      
      // Mask sensitive keys for display (show only last 4 chars)
      const maskedIntegrations = allIntegrations.map(integration => ({
        ...integration,
        apiKey: integration.apiKey ? `****${integration.apiKey.slice(-4)}` : null,
        secretKey: integration.secretKey ? `****${integration.secretKey.slice(-4)}` : null,
        webhookSecret: integration.webhookSecret ? `****${integration.webhookSecret.slice(-4)}` : null,
      }));
      
      res.json(maskedIntegrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  // Admin: Update integration settings
  app.post("/api/admin/integrations/:type", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 2) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const validTypes = ['binance_pay', 'stripe', 'coinbase'] as const;
      const integrationType = req.params.type as typeof validTypes[number];
      
      if (!validTypes.includes(integrationType)) {
        return res.status(400).json({ message: "Invalid integration type" });
      }

      const schema = z.object({
        enabled: z.number().int().min(0).max(1).optional(),
        apiKey: z.string().optional(),
        secretKey: z.string().optional(),
        webhookSecret: z.string().optional(),
        additionalConfig: z.any().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      // Filter out empty strings
      const data: any = {};
      if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;
      if (parsed.data.apiKey && parsed.data.apiKey.trim()) data.apiKey = parsed.data.apiKey.trim();
      if (parsed.data.secretKey && parsed.data.secretKey.trim()) data.secretKey = parsed.data.secretKey.trim();
      if (parsed.data.webhookSecret && parsed.data.webhookSecret.trim()) data.webhookSecret = parsed.data.webhookSecret.trim();
      if (parsed.data.additionalConfig) data.additionalConfig = parsed.data.additionalConfig;

      const integration = await storage.upsertIntegration(integrationType, data);
      
      // Mask the response
      res.json({
        ...integration,
        apiKey: integration.apiKey ? `****${integration.apiKey.slice(-4)}` : null,
        secretKey: integration.secretKey ? `****${integration.secretKey.slice(-4)}` : null,
        webhookSecret: integration.webhookSecret ? `****${integration.webhookSecret.slice(-4)}` : null,
      });
    } catch (error) {
      console.error("Error updating integration:", error);
      res.status(500).json({ message: "Failed to update integration" });
    }
  });

  // Admin: Test integration connection
  app.post("/api/admin/integrations/:type/test", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 2) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const validTypes = ['binance_pay', 'stripe', 'coinbase'] as const;
      const integrationType = req.params.type as typeof validTypes[number];
      
      if (!validTypes.includes(integrationType)) {
        return res.status(400).json({ message: "Invalid integration type" });
      }

      const integration = await storage.getIntegration(integrationType);
      if (!integration || !integration.apiKey || !integration.secretKey) {
        return res.status(400).json({ message: "Integration not configured", success: false });
      }

      let testResult = { success: false, message: "" };

      if (integrationType === 'binance_pay') {
        try {
          const cryptoModule = await import('crypto');
          const timestamp = Date.now().toString();
          const nonce = cryptoModule.randomBytes(16).toString('hex');
          const requestBody = JSON.stringify({});
          const payload = timestamp + "\n" + nonce + "\n" + requestBody + "\n";
          const signature = cryptoModule.createHmac('sha512', integration.secretKey).update(payload).digest('hex').toUpperCase();
          
          const response = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v2/certificates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "BinancePay-Timestamp": timestamp,
              "BinancePay-Nonce": nonce,
              "BinancePay-Certificate-SN": integration.apiKey,
              "BinancePay-Signature": signature,
            },
            body: requestBody,
          });
          
          const data = await response.json();
          if (data.status === "SUCCESS") {
            testResult = { success: true, message: "Binance Pay connection successful" };
          } else {
            testResult = { success: false, message: data.errorMessage || "Connection failed" };
          }
        } catch (error: any) {
          testResult = { success: false, message: error.message || "Connection test failed" };
        }
      } else if (integrationType === 'stripe') {
        try {
          const response = await fetch("https://api.stripe.com/v1/balance", {
            headers: {
              "Authorization": `Bearer ${integration.secretKey}`,
            },
          });
          
          if (response.ok) {
            testResult = { success: true, message: "Stripe connection successful" };
          } else {
            const data = await response.json();
            testResult = { success: false, message: data.error?.message || "Connection failed" };
          }
        } catch (error: any) {
          testResult = { success: false, message: error.message || "Connection test failed" };
        }
      } else {
        testResult = { success: false, message: "Test not implemented for this integration" };
      }

      // Update the test status
      await storage.updateIntegrationTestStatus(integrationType, testResult.success ? "success" : "failed");
      
      res.json(testResult);
    } catch (error) {
      console.error("Error testing integration:", error);
      res.status(500).json({ message: "Failed to test integration", success: false });
    }
  });

  // Public: Get enabled payment methods
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const enabledIntegrations = await storage.getEnabledIntegrations();
      const methods = enabledIntegrations.map(i => ({
        type: i.type,
        enabled: true,
      }));
      res.json(methods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  // Crypto deposit routes using Binance Pay
  const crypto = await import('crypto');
  
  function generateBinanceSignature(timestamp: string, nonce: string, body: string, secretKey: string): string {
    const payload = timestamp + "\n" + nonce + "\n" + body + "\n";
    return crypto.createHmac('sha512', secretKey).update(payload).digest('hex').toUpperCase();
  }

  function generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  app.post("/api/crypto/create-charge", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        amount: z.number().positive().min(5).max(10000),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Amount must be between $5 and $10,000" });
      }

      const apiKey = process.env.BINANCE_PAY_API_KEY;
      const secretKey = process.env.BINANCE_PAY_SECRET_KEY;
      if (!apiKey || !secretKey) {
        return res.status(500).json({ message: "Crypto payments not configured" });
      }

      const timestamp = Date.now().toString();
      const nonce = generateNonce();
      const merchantTradeNo = `GS_${req.user!.id}_${Date.now()}`;
      
      const requestBody = {
        env: { terminalType: "WEB" },
        merchantTradeNo,
        orderAmount: parsed.data.amount,
        currency: "USDT",
        description: `GameStake Wallet Deposit - $${parsed.data.amount}`,
        goodsDetails: [{
          goodsType: "02",
          goodsCategory: "Z000",
          referenceGoodsId: "deposit",
          goodsName: "Wallet Deposit",
          goodsDetail: `Deposit $${parsed.data.amount} to your GameStake wallet`
        }],
        returnUrl: `${req.protocol}://${req.get('host')}/profile?deposit=success`,
        cancelUrl: `${req.protocol}://${req.get('host')}/profile?deposit=cancelled`,
      };

      const bodyString = JSON.stringify(requestBody);
      const signature = generateBinanceSignature(timestamp, nonce, bodyString, secretKey);

      const response = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v2/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "BinancePay-Timestamp": timestamp,
          "BinancePay-Nonce": nonce,
          "BinancePay-Certificate-SN": apiKey,
          "BinancePay-Signature": signature,
        },
        body: bodyString,
      });

      const data = await response.json();
      
      if (data.status !== "SUCCESS") {
        console.error("Binance Pay error:", data);
        return res.status(500).json({ message: "Failed to create crypto payment" });
      }

      const order = data.data;

      // Store the pending payment
      await storage.createCryptoPayment(
        req.user!.id,
        order.prepayId,
        merchantTradeNo,
        order.checkoutUrl,
        parsed.data.amount.toString()
      );

      res.json({
        chargeId: order.prepayId,
        hostedUrl: order.checkoutUrl,
        qrCode: order.qrcodeLink,
        code: merchantTradeNo,
      });
    } catch (error) {
      console.error("Crypto charge creation error:", error);
      res.status(500).json({ message: "Failed to create crypto payment" });
    }
  });

  // Cache for Binance Pay certificates
  let binanceCertificates: Map<string, string> = new Map();
  let certificatesFetchedAt: number = 0;
  const CERT_CACHE_DURATION = 3600000; // 1 hour

  async function fetchBinanceCertificates(apiKey: string, secretKey: string): Promise<void> {
    const now = Date.now();
    if (now - certificatesFetchedAt < CERT_CACHE_DURATION && binanceCertificates.size > 0) {
      return;
    }

    const timestamp = now.toString();
    const nonce = generateNonce();
    const body = "{}";
    const signature = generateBinanceSignature(timestamp, nonce, body, secretKey);

    const response = await fetch("https://bpay.binanceapi.com/binancepay/openapi/certificates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": timestamp,
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": apiKey,
        "BinancePay-Signature": signature,
      },
      body,
    });

    const data = await response.json();
    if (data.status === "SUCCESS" && data.data) {
      binanceCertificates.clear();
      for (const cert of data.data) {
        binanceCertificates.set(cert.certSerial, cert.certPublic);
      }
      certificatesFetchedAt = now;
      console.log(`Fetched ${binanceCertificates.size} Binance Pay certificates`);
    }
  }

  function verifyBinanceWebhookSignature(payload: string, signature: string, certSN: string): boolean {
    const publicKey = binanceCertificates.get(certSN);
    if (!publicKey) {
      console.error("Unknown certificate serial number:", certSN);
      return false;
    }

    try {
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(payload);
      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  // Binance Pay webhook handler
  app.post("/api/crypto/webhook", async (req, res) => {
    try {
      const apiKey = process.env.BINANCE_PAY_API_KEY;
      const secretKey = process.env.BINANCE_PAY_SECRET_KEY;
      if (!apiKey || !secretKey) {
        return res.status(500).json({ returnCode: "FAIL", returnMessage: "Not configured" });
      }

      // Fetch certificates if needed
      await fetchBinanceCertificates(apiKey, secretKey);

      // Verify Binance Pay webhook RSA signature
      const timestamp = req.headers["binancepay-timestamp"] as string;
      const nonce = req.headers["binancepay-nonce"] as string;
      const signature = req.headers["binancepay-signature"] as string;
      const certSN = req.headers["binancepay-certificate-sn"] as string;
      
      if (!timestamp || !nonce || !signature || !certSN) {
        return res.status(400).json({ returnCode: "FAIL", returnMessage: "Missing headers" });
      }

      // Build verification payload: timestamp\nnonce\nbody\n
      const bodyString = JSON.stringify(req.body);
      const verificationPayload = timestamp + "\n" + nonce + "\n" + bodyString + "\n";
      
      if (!verifyBinanceWebhookSignature(verificationPayload, signature, certSN)) {
        console.error("Invalid Binance webhook signature");
        return res.status(401).json({ returnCode: "FAIL", returnMessage: "Invalid signature" });
      }

      const { bizType, bizStatus, data } = req.body;
      
      console.log(`Received Binance webhook: ${bizType} - ${bizStatus}`);

      if (bizType === "PAY" && bizStatus === "PAY_SUCCESS") {
        const orderData = typeof data === 'string' ? JSON.parse(data) : data;
        const merchantTradeNo = orderData?.merchantTradeNo;
        
        if (!merchantTradeNo) {
          return res.json({ returnCode: "SUCCESS", returnMessage: "No trade number" });
        }

        const cryptoPayment = await storage.getCryptoPaymentByCode(merchantTradeNo);
        if (!cryptoPayment) {
          console.error("Crypto payment not found:", merchantTradeNo);
          return res.json({ returnCode: "SUCCESS", returnMessage: "Payment not found" });
        }

        if (cryptoPayment.status === "completed") {
          return res.json({ returnCode: "SUCCESS", returnMessage: "Already processed" });
        }

        const cryptoCurrency = orderData?.currency || "USDT";
        const cryptoAmount = orderData?.orderAmount?.toString() || cryptoPayment.usdAmount;

        // Update payment status
        await storage.updateCryptoPaymentStatus(
          cryptoPayment.chargeId,
          "completed",
          cryptoCurrency,
          cryptoAmount
        );

        // Credit user's personal wallet with database transaction safety
        const wallet = await storage.getWalletByUserAndType(cryptoPayment.userId, "personal");
        if (wallet) {
          const currentBalance = wallet.balance;
          const depositAmount = cryptoPayment.usdAmount;
          const newBalance = (parseFloat(currentBalance) + parseFloat(depositAmount)).toFixed(2);
          await storage.updateWalletBalance(wallet.id, newBalance);

          // Record transaction
          await storage.createTransaction(
            cryptoPayment.userId,
            wallet.id,
            "crypto_deposit",
            cryptoPayment.usdAmount,
            `Crypto deposit (${cryptoAmount} ${cryptoCurrency} → $${cryptoPayment.usdAmount})`
          );
        }

        console.log(`Crypto payment completed: ${merchantTradeNo}, credited $${cryptoPayment.usdAmount} to user ${cryptoPayment.userId}`);
      } else if (bizStatus === "PAY_CLOSED" || bizStatus === "EXPIRED") {
        const orderData = typeof data === 'string' ? JSON.parse(data) : data;
        const merchantTradeNo = orderData?.merchantTradeNo;
        if (merchantTradeNo) {
          const cryptoPayment = await storage.getCryptoPaymentByCode(merchantTradeNo);
          if (cryptoPayment) {
            await storage.updateCryptoPaymentStatus(
              cryptoPayment.chargeId,
              bizStatus === "EXPIRED" ? "expired" : "cancelled"
            );
          }
        }
      }

      res.json({ returnCode: "SUCCESS", returnMessage: "OK" });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ returnCode: "FAIL", returnMessage: "Processing failed" });
    }
  });

  // Get user's crypto payment history
  app.get("/api/crypto/payments", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getCryptoPaymentsByUserId(req.user!.id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch crypto payments" });
    }
  });

  // Helper function to settle a single match (transfer funds)
  async function settleMatch(matchId: string): Promise<boolean> {
    try {
      // Re-fetch match to get current state (prevents race conditions)
      const match = await storage.getMatch(matchId);
      if (!match) return false;

      // Final safety checks before settlement
      if (match.status !== "completed") return false;
      if (match.disputeStatus !== "none") return false;
      if (match.settlementExecutedAt) return false;
      if (!match.approvedAt) return false;
      
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (new Date(match.approvedAt) > fiveMinutesAgo) return false; // Window not yet expired

      const winnerId = match.winnerId;
      if (!winnerId) return false;
      
      const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
      const betAmount = parseFloat(match.betAmount);
      const totalPot = betAmount * 2;
      const adminFee = totalPot * 0.10;
      const winnerPrize = totalPot - adminFee;

      // Transfer admin fee to platform wallet
      const platformWallet = await storage.getPlatformWallet();
      const newPlatformBalance = (parseFloat(platformWallet.balance) + adminFee).toFixed(2);
      await storage.updateWalletBalance(platformWallet.id, newPlatformBalance);
      await storage.createTransaction(platformWallet.userId, platformWallet.id, "platform_fee", adminFee.toFixed(2), `Fee from match: ${match.game}`);

      // Update winner's wallets
      const winnerEscrow = await storage.getWalletByUserAndType(winnerId, "escrow");
      const winnerPersonal = await storage.getWalletByUserAndType(winnerId, "personal");

      if (winnerEscrow && winnerPersonal) {
        const newEscrowBalance = (parseFloat(winnerEscrow.balance) - betAmount).toFixed(2);
        const newPersonalBalance = (parseFloat(winnerPersonal.balance) + winnerPrize).toFixed(2);
        await storage.updateWalletBalance(winnerEscrow.id, newEscrowBalance);
        await storage.updateWalletBalance(winnerPersonal.id, newPersonalBalance);
        await storage.createTransaction(winnerId, winnerPersonal.id, "winnings", winnerPrize.toFixed(2), `Won match: ${match.game} (after 10% fee)`);
      }

      // Update loser's escrow
      if (loserId) {
        const loserEscrow = await storage.getWalletByUserAndType(loserId, "escrow");
        if (loserEscrow) {
          const newLoserEscrow = (parseFloat(loserEscrow.balance) - betAmount).toFixed(2);
          await storage.updateWalletBalance(loserEscrow.id, newLoserEscrow);
        }
      }

      // Process spectator bets - only process pending bets to avoid double payouts
      const spectatorBets = await storage.getSpectatorBetsByMatch(match.id);
      for (const bet of spectatorBets) {
        if (bet.status === "won" || bet.status === "lost") continue;
        
        const won = bet.predictedWinnerId === winnerId;
        await storage.updateSpectatorBetStatus(bet.id, won ? "won" : "lost");

        const spectatorWallet = await storage.getWalletByUserAndType(bet.userId, "spectator");
        if (spectatorWallet && won) {
          const winnings = parseFloat(bet.amount) * parseFloat(bet.oddsMultiplier);
          const newBalance = (parseFloat(spectatorWallet.balance) + winnings).toFixed(2);
          await storage.updateWalletBalance(spectatorWallet.id, newBalance);
          await storage.createTransaction(bet.userId, spectatorWallet.id, "winnings", winnings.toFixed(2), `Won spectator bet on ${match.game}`);
        }
      }

      // Mark settlement as executed
      await storage.markSettlementExecuted(match.id);
      return true;
    } catch (error) {
      console.error(`Failed to settle match ${matchId}:`, error);
      return false;
    }
  }

  // Process pending settlements (admin only endpoint for manual trigger)
  app.post("/api/settlements/process", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin < 1) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const matchesReady = await storage.getMatchesReadyForSettlement();
      const results = [];

      for (const match of matchesReady) {
        const success = await settleMatch(match.id);
        results.push({ matchId: match.id, settled: success });
      }

      res.json({ processed: results.length, results });
    } catch (error) {
      res.status(500).json({ message: "Failed to process settlements" });
    }
  });

  // Start settlement processing interval (check every 30 seconds)
  setInterval(async () => {
    try {
      const matchesReady = await storage.getMatchesReadyForSettlement();
      for (const match of matchesReady) {
        const success = await settleMatch(match.id);
        if (success) {
          console.log(`Auto-settled match ${match.id}`);
        }
      }
    } catch (error) {
      console.error("Settlement processing error:", error);
    }
  }, 30000);

  return httpServer;
}
