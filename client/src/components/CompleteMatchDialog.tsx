import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Loader2 } from "lucide-react";
import type { Match } from "@/lib/types";

interface CompleteMatchDialogProps {
  match: Match;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (winnerId: string) => void;
  isLoading?: boolean;
}

export function CompleteMatchDialog({ match, open, onOpenChange, onComplete, isLoading }: CompleteMatchDialogProps) {
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);

  const handleComplete = () => {
    if (selectedWinner) {
      onComplete?.(selectedWinner);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-chart-4" />
            Report Match Result
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">{match.game}</p>
            <p className="text-lg font-medium">Who won the match?</p>
          </div>

          <div className="flex items-center justify-around gap-4">
            <button
              className={`flex flex-col items-center p-4 rounded-md transition-all ${
                selectedWinner === match.player1Id 
                  ? 'bg-chart-4/20 ring-2 ring-chart-4' 
                  : 'bg-muted hover-elevate'
              }`}
              onClick={() => setSelectedWinner(match.player1Id)}
              data-testid="button-winner-player1"
            >
              <Avatar className="h-16 w-16 mb-2">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {match.player1?.username?.slice(0, 2).toUpperCase() || 'P1'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{match.player1?.username || 'Player 1'}</span>
              {selectedWinner === match.player1Id && (
                <Trophy className="h-4 w-4 text-chart-4 mt-1" />
              )}
            </button>

            <span className="text-muted-foreground font-bold">VS</span>

            {match.player2 && (
              <button
                className={`flex flex-col items-center p-4 rounded-md transition-all ${
                  selectedWinner === match.player2Id 
                    ? 'bg-chart-4/20 ring-2 ring-chart-4' 
                    : 'bg-muted hover-elevate'
                }`}
                onClick={() => setSelectedWinner(match.player2Id!)}
                data-testid="button-winner-player2"
              >
                <Avatar className="h-16 w-16 mb-2">
                  <AvatarFallback className="bg-chart-2 text-white text-xl">
                    {match.player2.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{match.player2.username}</span>
                {selectedWinner === match.player2Id && (
                  <Trophy className="h-4 w-4 text-chart-4 mt-1" />
                )}
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Prize pool: ${(parseFloat(match.betAmount) * 2).toFixed(2)} goes to the winner
          </p>

          <Button 
            className="w-full" 
            onClick={handleComplete}
            disabled={!selectedWinner || isLoading}
            data-testid="button-confirm-winner"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {selectedWinner ? `Confirm Winner` : 'Select the winner'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
