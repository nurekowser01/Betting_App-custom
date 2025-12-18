import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Gamepad2, Target, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface PlayerStats {
  userId: string;
  username: string;
  gamerUsername: string | null;
  profileImageUrl: string | null;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  totalEarnings: number;
  totalBetAmount: number;
  spectatorBetsWon: number;
  spectatorBetsLost: number;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm text-muted-foreground font-medium w-5 text-center">{rank}</span>;
}

function getRankBadge(rank: number) {
  if (rank === 1) return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
  if (rank === 2) return "bg-gray-400/20 text-gray-400 border-gray-400/30";
  if (rank === 3) return "bg-amber-600/20 text-amber-600 border-amber-600/30";
  return "";
}

function PlayerRow({ player, rank }: { player: PlayerStats; rank: number }) {
  const displayName = player.gamerUsername || player.username;
  const initials = displayName.slice(0, 2).toUpperCase();
  const isTopThree = rank <= 3;

  return (
    <Link href={`/user/${player.userId}`}>
      <div
        className={`flex items-center gap-4 p-4 hover-elevate cursor-pointer rounded-md ${
          isTopThree ? getRankBadge(rank) : ""
        }`}
        data-testid={`row-player-${player.userId}`}
      >
        <div className="flex items-center justify-center w-8">
          {getRankIcon(rank)}
        </div>

        <Avatar className="h-10 w-10">
          <AvatarImage src={player.profileImageUrl || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" data-testid={`text-username-${player.userId}`}>
            {displayName}
          </p>
          <p className="text-sm text-muted-foreground">
            {player.totalMatches} matches played
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="font-medium text-green-500" data-testid={`text-wins-${player.userId}`}>
              {player.wins}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="font-medium text-red-500" data-testid={`text-losses-${player.userId}`}>
              {player.losses}
            </span>
          </div>
          <Badge variant="outline" className="min-w-[60px] justify-center">
            {player.winRate}%
          </Badge>
          <div className="w-24 text-right">
            <span
              className={`font-medium ${
                player.totalEarnings >= 0 ? "text-green-500" : "text-red-500"
              }`}
              data-testid={`text-earnings-${player.userId}`}
            >
              {player.totalEarnings >= 0 ? "+" : ""}${player.totalEarnings.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MyStats({ stats }: { stats: PlayerStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Your Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-md bg-muted/50">
            <p className="text-2xl font-bold text-green-500" data-testid="text-my-wins">
              {stats.wins}
            </p>
            <p className="text-sm text-muted-foreground">Wins</p>
          </div>
          <div className="text-center p-3 rounded-md bg-muted/50">
            <p className="text-2xl font-bold text-red-500" data-testid="text-my-losses">
              {stats.losses}
            </p>
            <p className="text-sm text-muted-foreground">Losses</p>
          </div>
          <div className="text-center p-3 rounded-md bg-muted/50">
            <p className="text-2xl font-bold" data-testid="text-my-winrate">
              {stats.winRate}%
            </p>
            <p className="text-sm text-muted-foreground">Win Rate</p>
          </div>
          <div className="text-center p-3 rounded-md bg-muted/50">
            <p
              className={`text-2xl font-bold ${
                stats.totalEarnings >= 0 ? "text-green-500" : "text-red-500"
              }`}
              data-testid="text-my-earnings"
            >
              {stats.totalEarnings >= 0 ? "+" : ""}${stats.totalEarnings.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">Net Earnings</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <span>Total bet amount: ${stats.totalBetAmount.toFixed(2)}</span>
          <span>
            Spectator bets: {stats.spectatorBetsWon} won / {stats.spectatorBetsLost} lost
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<PlayerStats[]>({
    queryKey: ["/api/leaderboard"],
  });

  const { data: myStats, isLoading: statsLoading } = useQuery<PlayerStats>({
    queryKey: ["/api/stats"],
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Gamepad2 className="h-8 w-8" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Top players ranked by wins, win rate, and earnings
            </p>
          </div>
        </div>

        {user && (
          <div className="mb-8">
            {statsLoading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : myStats ? (
              <MyStats stats={myStats} />
            ) : null}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Players
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {leaderboardLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="divide-y">
                {leaderboard.map((player, index) => (
                  <PlayerRow key={player.userId} player={player} rank={index + 1} />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No players with completed matches yet.</p>
                <p className="text-sm mt-1">Be the first to compete!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
