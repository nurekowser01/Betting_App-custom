import { LiveMatchesList } from '../LiveMatchesList';
import type { Match } from '@/lib/types';

// todo: remove mock functionality
const mockMatches: Match[] = [
  {
    id: '1',
    game: 'FIFA 24',
    betAmount: 100,
    status: 'live',
    player1: { id: 'p1', username: 'Messi10' },
    player2: { id: 'p2', username: 'CR7Fan' },
    spectatorCount: 45,
    createdAt: new Date(),
  },
  {
    id: '2',
    game: 'NBA 2K24',
    betAmount: 75,
    status: 'live',
    player1: { id: 'p3', username: 'LeBronJr' },
    player2: { id: 'p4', username: 'Curry30' },
    spectatorCount: 32,
    createdAt: new Date(),
  },
  {
    id: '3',
    game: 'UFC 5',
    betAmount: 200,
    status: 'live',
    player1: { id: 'p5', username: 'KnockoutKing' },
    player2: { id: 'p6', username: 'TapMaster' },
    spectatorCount: 67,
    createdAt: new Date(),
  },
];

export default function LiveMatchesListExample() {
  return (
    <LiveMatchesList
      matches={mockMatches}
      onSpectate={(id) => console.log('Spectating:', id)}
    />
  );
}
