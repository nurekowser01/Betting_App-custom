import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trophy, User } from "lucide-react";
import type { Match } from "@/lib/types";

interface MatchResultsDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchResultsDialog({ match, open, onOpenChange }: MatchResultsDialogProps) {
  if (!match) return null;

  const winner = match.winnerId === match.player1Id ? match.player1 : match.player2;
  const loser = match.winnerId === match.player1Id ? match.player2 : match.player1;
  const totalPot = parseFloat(match.betAmount) * 2;
  const platformFee = totalPot * 0.1;
  const winnerPayout = totalPot - platformFee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Match Results
          </DialogTitle>
          <DialogDescription>
            Final results for this match
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-md bg-muted/50">
            <p className="text-sm text-muted-foreground">Game</p>
            <p className="font-medium text-lg">{match.game}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Winner</span>
              </div>
              <p className="font-medium">{winner?.username || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                +${winnerPayout.toFixed(2)}
              </p>
            </div>

            <div className="p-3 rounded-md bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Runner-up</span>
              </div>
              <p className="font-medium">{loser?.username || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                -${match.betAmount}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-md bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Pot</span>
              <span className="font-medium">${totalPot.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Platform Fee (10%)</span>
              <span className="text-sm">-${platformFee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-sm font-medium">Winner Payout</span>
              <span className="font-medium text-green-600 dark:text-green-400">${winnerPayout.toFixed(2)}</span>
            </div>
          </div>

          {match.disputeStatus && match.disputeStatus !== 'none' && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm font-medium text-destructive">
                Dispute Status: {match.disputeStatus}
              </p>
              {match.disputeReason && (
                <p className="text-sm text-muted-foreground mt-1">{match.disputeReason}</p>
              )}
            </div>
          )}

          <Badge 
            variant={match.status === 'completed' ? 'default' : 'secondary'} 
            className="w-full justify-center py-2"
            data-testid="badge-match-status"
          >
            {match.status === 'completed' ? 'Match Completed' : match.status}
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}
