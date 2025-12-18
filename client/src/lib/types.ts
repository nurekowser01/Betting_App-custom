export type WalletType = 'personal' | 'escrow' | 'spectator';

export interface User {
  id: string;
  username: string;
  gamerUsername?: string | null;
  isAdmin?: number;
}

export interface Wallet {
  id: string;
  userId: string;
  type: WalletType;
  balance: string;
}

export type MatchStatus = 'waiting' | 'live' | 'completed' | 'cancelled' | 'pending_approval' | 'disputed';
export type DisputeStatus = 'none' | 'open' | 'under_review' | 'resolved';

export interface Match {
  id: string;
  game: string;
  betAmount: string;
  status: MatchStatus;
  player1Id: string;
  player2Id?: string | null;
  winnerId?: string | null;
  reportedWinnerId?: string | null;
  spectatorCount: number;
  proposedAmount?: string | null;
  proposedByUserId?: string | null;
  disputeStatus?: DisputeStatus;
  disputeReason?: string | null;
  disputeEvidence?: string | null;
  disputeRaisedById?: string | null;
  disputeResolvedById?: string | null;
  disputeResolution?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  settlementExecutedAt?: string | null;
  player1?: { id: string; username: string } | null;
  player2?: { id: string; username: string } | null;
  winner?: { id: string; username: string } | null;
  reportedWinner?: { id: string; username: string } | null;
  proposedBy?: { id: string; username: string } | null;
  disputeRaisedBy?: { id: string; username: string } | null;
}

export interface SpectatorBet {
  id: string;
  matchId: string;
  userId: string;
  predictedWinnerId: string;
  amount: string;
  status: 'pending' | 'won' | 'lost';
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'winnings' | 'escrow' | 'refund' | 'platform_fee';
  amount: string;
  description: string;
  createdAt: string;
}

export const PLAYSTATION_GAMES = [
  'FIFA 24',
  'NBA 2K24',
  'Call of Duty: MW3',
  'Madden NFL 24',
  'UFC 5',
  'Gran Turismo 7',
  'Mortal Kombat 1',
  'Street Fighter 6',
  'Tekken 8',
  'EA Sports FC 24'
];
