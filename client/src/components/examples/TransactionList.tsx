import { TransactionList } from '../TransactionList';
import type { Transaction } from '@/lib/types';

// todo: remove mock functionality
const mockTransactions: Transaction[] = [
  { id: '1', type: 'deposit', amount: 500, description: 'Added funds via card', createdAt: new Date(), status: 'completed' },
  { id: '2', type: 'escrow', amount: 100, description: 'Match vs RunNGun', createdAt: new Date(Date.now() - 3600000), status: 'pending' },
  { id: '3', type: 'winnings', amount: 190, description: 'Won match vs ProGamer', createdAt: new Date(Date.now() - 7200000), status: 'completed' },
  { id: '4', type: 'bet', amount: 50, description: 'Spectator bet on Match #23', createdAt: new Date(Date.now() - 86400000), status: 'completed' },
];

export default function TransactionListExample() {
  return <TransactionList transactions={mockTransactions} />;
}
