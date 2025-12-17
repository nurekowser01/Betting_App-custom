import { MatchCard } from '../MatchCard';
import type { Match } from '@/lib/types';

// todo: remove mock functionality
const mockMatches: Match[] = [
  {
    id: '1',
    game: 'FIFA 24',
    betAmount: 50,
    status: 'waiting',
    player1: { id: 'p1', username: 'ProGamer99' },
    spectatorCount: 0,
    createdAt: new Date(),
  },
  {
    id: '2',
    game: 'Call of Duty: MW3',
    betAmount: 100,
    status: 'live',
    player1: { id: 'p1', username: 'SniperElite' },
    player2: { id: 'p2', username: 'RunNGun' },
    spectatorCount: 24,
    createdAt: new Date(),
  },
  {
    id: '3',
    game: 'Mortal Kombat 1',
    betAmount: 75,
    status: 'completed',
    player1: { id: 'p1', username: 'FatalityKing' },
    player2: { id: 'p2', username: 'Kombatant' },
    winner: 'p1',
    spectatorCount: 15,
    createdAt: new Date(),
  },
];

export default function MatchCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {mockMatches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          onJoin={() => console.log('Join match:', match.id)}
          onSpectate={() => console.log('Spectate match:', match.id)}
          onViewResults={() => console.log('View results:', match.id)}
        />
      ))}
    </div>
  );
}
