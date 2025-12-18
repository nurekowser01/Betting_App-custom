import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, Trophy, Gamepad2 } from "lucide-react";
import type { Match } from "@/lib/types";

interface MatchCardProps {
  match: Match;
  onJoin?: () => void;
  onSpectate?: () => void;
  onViewResults?: () => void;
  onComplete?: () => void;
  currentUserId?: string;
}

const statusConfig = {
  waiting: { label: "Waiting", variant: "secondary" as const },
  live: { label: "Live", variant: "destructive" as const },
  completed: { label: "Completed", variant: "outline" as const },
  cancelled: { label: "Cancelled", variant: "outline" as const },
  pending_approval: { label: "Pending Approval", variant: "secondary" as const },
};

export function MatchCard({ match, onJoin, onSpectate, onViewResults, onComplete, currentUserId }: MatchCardProps) {
  const status = statusConfig[match.status];
  const betAmount = parseFloat(match.betAmount);
  const isParticipant = currentUserId && (match.player1Id === currentUserId || match.player2Id === currentUserId);

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
          <div className="flex flex-col items-center flex-1">
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

          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-muted-foreground">VS</span>
            <span className="text-xl font-bold text-primary" data-testid="text-bet-amount">
              ${betAmount.toFixed(0)}
            </span>
          </div>

          <div className="flex flex-col items-center flex-1">
            {match.player2 ? (
              <>
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
              </>
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

        <div className="flex gap-2">
          {match.status === 'waiting' && !match.player2 && !isParticipant && (
            <Button className="flex-1" onClick={onJoin} data-testid="button-join-match">
              Join Match
            </Button>
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
          {match.status === 'waiting' && isParticipant && (
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
