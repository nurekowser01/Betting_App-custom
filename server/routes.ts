import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, hashPassword } from "./auth";
import passport from "passport";
import { insertUserSchema, insertMatchSchema, insertSpectatorBetSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
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

      req.login({ id: user.id, username: user.username }, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        res.json({ id: user.id, username: user.username });
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
        res.json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
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

  // Match routes
  app.get("/api/matches", async (req, res) => {
    try {
      const matchList = await storage.getMatches();
      
      // Enrich with player info
      const enrichedMatches = await Promise.all(matchList.map(async (match) => {
        const player1 = await storage.getUser(match.player1Id);
        const player2 = match.player2Id ? await storage.getUser(match.player2Id) : null;
        const winner = match.winnerId ? await storage.getUser(match.winnerId) : null;
        return {
          ...match,
          player1: player1 ? { id: player1.id, username: player1.username } : null,
          player2: player2 ? { id: player2.id, username: player2.username } : null,
          winner: winner ? { id: winner.id, username: winner.username } : null,
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
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const pendingMatches = await storage.getPendingApprovalMatches();
      
      // Enrich with player info
      const enrichedMatches = await Promise.all(pendingMatches.map(async (match) => {
        const player1 = await storage.getUser(match.player1Id);
        const player2 = match.player2Id ? await storage.getUser(match.player2Id) : null;
        const reportedWinner = match.reportedWinnerId ? await storage.getUser(match.reportedWinnerId) : null;
        return {
          ...match,
          player1: player1 ? { id: player1.id, username: player1.username } : null,
          player2: player2 ? { id: player2.id, username: player2.username } : null,
          reportedWinner: reportedWinner ? { id: reportedWinner.id, username: reportedWinner.username } : null,
        };
      }));

      res.json(enrichedMatches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending matches" });
    }
  });

  // Admin: Approve match and transfer funds
  app.post("/api/admin/matches/:id/approve", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.isAdmin !== 1) {
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

      const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
      const betAmount = parseFloat(match.betAmount);
      const totalPrize = betAmount * 2;

      // Update winner's wallets
      const winnerEscrow = await storage.getWalletByUserAndType(winnerId, "escrow");
      const winnerPersonal = await storage.getWalletByUserAndType(winnerId, "personal");

      if (winnerEscrow && winnerPersonal) {
        const newEscrowBalance = (parseFloat(winnerEscrow.balance) - betAmount).toFixed(2);
        const newPersonalBalance = (parseFloat(winnerPersonal.balance) + totalPrize).toFixed(2);
        await storage.updateWalletBalance(winnerEscrow.id, newEscrowBalance);
        await storage.updateWalletBalance(winnerPersonal.id, newPersonalBalance);
        await storage.createTransaction(winnerId, winnerPersonal.id, "winnings", totalPrize.toFixed(2), `Won match: ${match.game}`);
      }

      // Update loser's escrow
      if (loserId) {
        const loserEscrow = await storage.getWalletByUserAndType(loserId, "escrow");
        if (loserEscrow) {
          const newLoserEscrow = (parseFloat(loserEscrow.balance) - betAmount).toFixed(2);
          await storage.updateWalletBalance(loserEscrow.id, newLoserEscrow);
        }
      }

      // Process spectator bets
      const spectatorBets = await storage.getSpectatorBetsByMatch(match.id);
      for (const bet of spectatorBets) {
        const won = bet.predictedWinnerId === winnerId;
        await storage.updateSpectatorBetStatus(bet.id, won ? "won" : "lost");

        const spectatorWallet = await storage.getWalletByUserAndType(bet.userId, "spectator");
        if (spectatorWallet) {
          if (won) {
            const winnings = parseFloat(bet.amount) * parseFloat(bet.oddsMultiplier);
            const newBalance = (parseFloat(spectatorWallet.balance) + winnings).toFixed(2);
            await storage.updateWalletBalance(spectatorWallet.id, newBalance);
            await storage.createTransaction(bet.userId, spectatorWallet.id, "winnings", winnings.toFixed(2), `Won spectator bet on ${match.game}`);
          }
        }
      }

      const completedMatch = await storage.approveMatch(match.id, winnerId);
      res.json(completedMatch);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve match" });
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

  return httpServer;
}
