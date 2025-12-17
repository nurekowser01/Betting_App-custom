export type WalletType = 'personal' | 'escrow' | 'spectator';

export interface Wallet {
  id: string;
  type: WalletType;
  balance: number;
  userId: string;
}

export interface User {
  id: string;
  username: string;
  avatar?: string;
}

export type MatchStatus = 'waiting' | 'live' | 'completed';

export interface Match {
  id: string;
  game: string;
  betAmount: number;
  status: MatchStatus;
  player1: User;
  player2?: User;
  winner?: string;
  spectatorCount: number;
  createdAt: Date;
}

export interface SpectatorBet {
  id: string;
  matchId: string;
  userId: string;
  predictedWinner: string;
  amount: number;
  status: 'pending' | 'won' | 'lost';
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'winnings' | 'escrow';
  amount: number;
  description: string;
  createdAt: Date;
  status: 'completed' | 'pending';
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
