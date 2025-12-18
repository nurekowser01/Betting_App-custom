import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Target, TrendingUp, DollarSign, Eye, Clock, Gamepad2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

interface UserProfileData {
  user: {
    id: string;
    username: string;
    gamerUsername: string | null;
    profileImageUrl: string | null;
  };
  stats: {
    wins: number;
    losses: number;
    totalMatches: number;
    winRate: string;
    totalEarnings: string;
  };
  spectatorStats: {
    wonBets: number;
    lostBets: number;
    pendingBets: number;
    totalBets: number;
  };
  matchHistory: Array<{
    id: string;
    game: string;
    betAmount: string;
    status: string;
    createdAt: string;
    player1: { id: string; username: string; gamerUsername: string | null } | null;
    player2: { id: string; username: string; gamerUsername: string | null } | null;
    winner: { id: string; username: string } | null;
    isWin: boolean;
  }>;
}

export default function UserProfile() {
  const params = useParams<{ id: string }>();
  const { user, logout } = useAuth();

  const { data: wallets = [] } = useQuery<{ balance: string; type: string }[]>({
    queryKey: ["/api/wallets"],
    enabled: !!user,
  });

  const personalWallet = wallets.find(w => w.type === "personal");

  const { data: profile, isLoading, error } = useQuery<UserProfileData>({
    queryKey: [`/api/users/${params.id}/profile`],
  });

  const getStatusBadge = (status: string, isWin: boolean) => {
    switch (status) {
      case "completed":
        return isWin ? (
          <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Won
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-red-500/20 text-red-500 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Lost
          </Badge>
        );
      case "live":
        return <Badge variant="default" className="bg-primary/20 text-primary">Live</Badge>;
      case "waiting":
        return <Badge variant="secondary">Waiting</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar 
          username={user?.username} 
          balance={parseFloat(personalWallet?.balance || "0")}
          isAdmin={user?.isAdmin !== undefined && user.isAdmin >= 1}
          onLogout={logout}
        />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-6 mb-8">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {[1,2,3,4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar 
          username={user?.username} 
          balance={parseFloat(personalWallet?.balance || "0")}
          isAdmin={user?.isAdmin !== undefined && user.isAdmin >= 1}
          onLogout={logout}
        />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">User not found</p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        username={user?.username} 
        balance={parseFloat(personalWallet?.balance || "0")}
        isAdmin={user?.isAdmin !== undefined && user.isAdmin >= 1}
        onLogout={logout}
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        <div className="flex flex-col items-center gap-4 mb-8">
          <Avatar className="h-24 w-24">
            {profile.user.profileImageUrl && (
              <AvatarImage src={profile.user.profileImageUrl} alt={profile.user.username} />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
              {profile.user.username?.slice(0, 2).toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h1 className="text-2xl font-bold" data-testid="text-profile-username">
              {profile.user.username}
            </h1>
            {profile.user.gamerUsername && (
              <p className="text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Gamepad2 className="h-4 w-4" />
                {profile.user.gamerUsername}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Matches</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-total-matches">
                {profile.stats.totalMatches}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Wins</CardTitle>
              <Trophy className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500" data-testid="text-wins">
                {profile.stats.wins}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-win-rate">
                {profile.stats.winRate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-earnings">
                ${profile.stats.totalEarnings}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Spectator Betting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-bets">
                  {profile.spectatorStats.totalBets}
                </p>
                <p className="text-sm text-muted-foreground">Total Bets</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500" data-testid="text-won-bets">
                  {profile.spectatorStats.wonBets}
                </p>
                <p className="text-sm text-muted-foreground">Won</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500" data-testid="text-lost-bets">
                  {profile.spectatorStats.lostBets}
                </p>
                <p className="text-sm text-muted-foreground">Lost</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-500" data-testid="text-pending-bets">
                  {profile.spectatorStats.pendingBets}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Match History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.matchHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No matches yet</p>
            ) : (
              <div className="space-y-3">
                {profile.matchHistory.map((match) => (
                  <div 
                    key={match.id} 
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md bg-muted/50"
                    data-testid={`match-history-${match.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Gamepad2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{match.game}</p>
                        <p className="text-sm text-muted-foreground">
                          vs {match.player1?.id === params.id 
                            ? (match.player2?.username || "Waiting") 
                            : (match.player1?.username || "Unknown")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline">${match.betAmount}</Badge>
                      {getStatusBadge(match.status, match.isWin)}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(match.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
