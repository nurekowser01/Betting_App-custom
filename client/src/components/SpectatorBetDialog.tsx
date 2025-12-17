import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Player {
  id: string;
  username: string;
}

interface MatchForBetting {
  id: string;
  game: string;
  betAmount: string;
  player1: Player;
  player2?: Player;
}

interface SpectatorBetDialogProps {
  match: MatchForBetting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaceBet?: (playerId: string, amount: number) => void;
  maxBet?: number;
}

export function SpectatorBetDialog({ match, open, onOpenChange, onPlaceBet, maxBet = 200 }: SpectatorBetDialogProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(25);

  const handlePlaceBet = () => {
    if (selectedPlayer) {
      onPlaceBet?.(selectedPlayer, betAmount);
      setSelectedPlayer(null);
      setBetAmount(25);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Place Your Bet</span>
            <Badge variant="destructive" className="text-xs">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse" />
              Live
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">{match.game}</p>
            <p className="text-lg font-medium">Who will win?</p>
          </div>

          <div className="flex items-center justify-around gap-4">
            <button
              className={`flex flex-col items-center p-4 rounded-md transition-all ${
                selectedPlayer === match.player1.id 
                  ? 'bg-primary/20 ring-2 ring-primary' 
                  : 'bg-muted hover-elevate'
              }`}
              onClick={() => setSelectedPlayer(match.player1.id)}
              data-testid="button-select-player1"
            >
              <Avatar className="h-16 w-16 mb-2">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {match.player1.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{match.player1.username}</span>
            </button>

            <span className="text-muted-foreground font-bold">VS</span>

            {match.player2 && (
              <button
                className={`flex flex-col items-center p-4 rounded-md transition-all ${
                  selectedPlayer === match.player2.id 
                    ? 'bg-chart-2/20 ring-2 ring-chart-2' 
                    : 'bg-muted hover-elevate'
                }`}
                onClick={() => setSelectedPlayer(match.player2!.id)}
                data-testid="button-select-player2"
              >
                <Avatar className="h-16 w-16 mb-2">
                  <AvatarFallback className="bg-chart-2 text-white text-xl">
                    {match.player2.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{match.player2.username}</span>
              </button>
            )}
          </div>

          {selectedPlayer && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your bet amount</span>
                <span className="text-2xl font-bold text-primary" data-testid="text-spectator-bet">
                  ${betAmount}
                </span>
              </div>
              <Slider
                value={[betAmount]}
                onValueChange={(v) => setBetAmount(v[0])}
                min={5}
                max={maxBet}
                step={5}
                data-testid="slider-spectator-bet"
              />
              <p className="text-xs text-muted-foreground text-center">
                Potential win: ${(betAmount * 1.9).toFixed(2)}
              </p>
            </div>
          )}

          <Button 
            className="w-full" 
            onClick={handlePlaceBet}
            disabled={!selectedPlayer}
            data-testid="button-confirm-spectator-bet"
          >
            {selectedPlayer ? `Bet $${betAmount} on ${
              selectedPlayer === match.player1.id ? match.player1.username : (match.player2?.username ?? 'Player 2')
            }` : 'Select a player'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
