import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Eye, Trophy, Gamepad2, X, Check, DollarSign } from "lucide-react";
import type { Match } from "@/lib/types";

interface MatchCardProps {
  match: Match;
  onJoin?: () => void;
  onSpectate?: () => void;
  onViewResults?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onPropose?: (amount: number) => void;
  onAcceptProposal?: () => void;
  onRejectProposal?: () => void;
  currentUserId?: string;
}

const statusConfig = {
  waiting: { label: "Waiting", variant: "secondary" as const },
  live: { label: "Live", variant: "destructive" as const },
  completed: { label: "Completed", variant: "outline" as const },
  cancelled: { label: "Cancelled", variant: "outline" as const },
  pending_approval: { label: "Pending Approval", variant: "secondary" as const },
};

export function MatchCard({ 
  match, 
  onJoin, 
  onSpectate, 
  onViewResults, 
  onComplete, 
  onCancel,
  onPropose,
  onAcceptProposal,
  onRejectProposal,
  currentUserId 
}: MatchCardProps) {
  const [showPropose, setShowPropose] = useState(false);
  const [proposedAmount, setProposedAmount] = useState(match.betAmount);
  
  const status = statusConfig[match.status];
  const betAmount = parseFloat(match.betAmount);
  const isParticipant = currentUserId && (match.player1Id === currentUserId || match.player2Id === currentUserId);
  const isCreator = currentUserId === match.player1Id;
  const hasProposal = match.proposedAmount && match.proposedByUserId;

  const handlePropose = () => {
    const amount = parseFloat(proposedAmount);
    if (!isNaN(amount) && amount > 0) {
      onPropose?.(amount);
      setShowPropose(false);
    }
  };

  return (
    <Card className="overflow-visible" data-testid={`card-match-${match.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{match.game}</span>
          </div>
          <div className="flex items-center gap-2">
            {match.status === 'live' && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                {match.spectatorCount}
              </span>
            )}
            <Badge variant={status.variant} className="text-xs">
              {match.status === 'live' && (
                <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse" />
              )}
              {status.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-4">
          <Link href={match.player1Id ? `/user/${match.player1Id}` : "#"}>
            <div className="flex flex-col items-center flex-1 hover-elevate active-elevate-2 p-2 rounded-md cursor-pointer" data-testid={`link-player1-${match.id}`}>
              <Avatar className="h-12 w-12 mb-2">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {match.player1?.username?.slice(0, 2).toUpperCase() || 'P1'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate max-w-full" data-testid="text-player1">
                {match.player1?.username || 'Player 1'}
              </span>
              {match.winnerId === match.player1Id && (
                <Trophy className="h-4 w-4 text-chart-4 mt-1" />
              )}
            </div>
          </Link>

          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-muted-foreground">VS</span>
            <span className="text-xl font-bold text-primary" data-testid="text-bet-amount">
              ${betAmount.toFixed(0)}
            </span>
          </div>

          <div className="flex flex-col items-center flex-1">
            {match.player2 ? (
              <Link href={`/user/${match.player2Id}`}>
                <div className="flex flex-col items-center hover-elevate active-elevate-2 p-2 rounded-md cursor-pointer" data-testid={`link-player2-${match.id}`}>
                  <Avatar className="h-12 w-12 mb-2">
                    <AvatarFallback className="bg-chart-2 text-white">
                      {match.player2.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate max-w-full" data-testid="text-player2">
                    {match.player2.username}
                  </span>
                  {match.winnerId === match.player2Id && (
                    <Trophy className="h-4 w-4 text-chart-4 mt-1" />
                  )}
                </div>
              </Link>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center mb-2">
                  <span className="text-muted-foreground text-xl">?</span>
                </div>
                <span className="text-sm text-muted-foreground">Waiting...</span>
              </>
            )}
          </div>
        </div>

        {hasProposal && isCreator && (
          <div className="mb-4 p-3 rounded-md bg-muted/50 border">
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium text-foreground">{match.proposedBy?.username}</span> proposed:
            </p>
            <p className="text-lg font-bold text-primary mb-3">
              ${parseFloat(match.proposedAmount!).toFixed(2)} each
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={onAcceptProposal} data-testid="button-accept-proposal">
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={onRejectProposal} data-testid="button-reject-proposal">
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          </div>
        )}

        {hasProposal && !isCreator && match.proposedByUserId === currentUserId && (
          <div className="mb-4 p-3 rounded-md bg-muted/50 border">
            <p className="text-sm text-muted-foreground">
              Your proposal of <span className="font-medium text-foreground">${parseFloat(match.proposedAmount!).toFixed(2)}</span> is pending...
            </p>
          </div>
        )}

        {showPropose && (
          <div className="mb-4 p-3 rounded-md bg-muted/50 border">
            <p className="text-sm text-muted-foreground mb-2">Propose a different amount:</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={proposedAmount}
                  onChange={(e) => setProposedAmount(e.target.value)}
                  className="pl-8"
                  min="1"
                  step="1"
                  data-testid="input-propose-amount"
                />
              </div>
              <Button size="sm" onClick={handlePropose} data-testid="button-send-proposal">
                Send
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPropose(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {match.status === 'waiting' && !match.player2 && !isParticipant && !hasProposal && (
            <>
              <Button className="flex-1" onClick={onJoin} data-testid="button-join-match">
                Join Match
              </Button>
              <Button variant="outline" onClick={() => setShowPropose(!showPropose)} data-testid="button-propose-amount">
                <DollarSign className="h-4 w-4" />
              </Button>
            </>
          )}
          {match.status === 'live' && !isParticipant && (
            <Button className="flex-1" variant="outline" onClick={onSpectate} data-testid="button-spectate">
              <Eye className="h-4 w-4 mr-2" />
              Watch & Bet
            </Button>
          )}
          {match.status === 'live' && isParticipant && (
            <Button className="flex-1" onClick={onComplete} data-testid="button-complete-match">
              <Trophy className="h-4 w-4 mr-2" />
              Report Result
            </Button>
          )}
          {match.status === 'completed' && (
            <Button className="flex-1" variant="secondary" onClick={onViewResults} data-testid="button-view-results">
              View Results
            </Button>
          )}
          {match.status === 'waiting' && isCreator && !match.player2 && !hasProposal && (
            <>
              <Badge variant="secondary" className="flex-1 justify-center py-2">
                Your Match - Waiting
              </Badge>
              <Button variant="destructive" size="sm" onClick={onCancel} data-testid="button-cancel-match">
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </>
          )}
          {match.status === 'waiting' && isParticipant && !isCreator && (
            <Badge variant="secondary" className="flex-1 justify-center py-2">
              Your Match - Waiting for opponent
            </Badge>
          )}
          {match.status === 'pending_approval' && isParticipant && (
            <Badge variant="secondary" className="flex-1 justify-center py-2">
              Awaiting Admin Approval
            </Badge>
          )}
          {match.status === 'pending_approval' && !isParticipant && (
            <Badge variant="outline" className="flex-1 justify-center py-2">
              Pending Verification
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
