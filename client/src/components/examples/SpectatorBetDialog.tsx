import { useState } from 'react';
import { SpectatorBetDialog } from '../SpectatorBetDialog';
import { Button } from '@/components/ui/button';
import type { Match } from '@/lib/types';

// todo: remove mock functionality
const mockMatch: Match = {
  id: '1',
  game: 'Call of Duty: MW3',
  betAmount: 100,
  status: 'live',
  player1: { id: 'p1', username: 'SniperElite' },
  player2: { id: 'p2', username: 'RunNGun' },
  spectatorCount: 24,
  createdAt: new Date(),
};

export default function SpectatorBetDialogExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Spectator Bet</Button>
      <SpectatorBetDialog
        match={mockMatch}
        open={open}
        onOpenChange={setOpen}
        onPlaceBet={(playerId, amount) => console.log('Bet placed:', playerId, amount)}
      />
    </>
  );
}
