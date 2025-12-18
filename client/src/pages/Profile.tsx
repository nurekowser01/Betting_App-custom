import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Trophy, Target, Shield, TrendingUp, TrendingDown, Gamepad2, Eye } from "lucide-react";
import type { Wallet as WalletType } from "@/lib/types";

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

export default function Profile() {
  const { user, logout } = useAuth();

  const { data: wallets = [] } = useQuery<WalletType[]>({
    queryKey: ["/api/wallets"],
    enabled: !!user,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<PlayerStats>({
    queryKey: ["/api/stats"],
    enabled: !!user,
  });

  const personalWallet = wallets.find(w => w.type === "personal");
  const escrowWallet = wallets.find(w => w.type === "escrow");
  const spectatorWallet = wallets.find(w => w.type === "spectator");

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
          <Avatar className="h-24 w-24">
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
              {user?.username?.slice(0, 2).toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h1 className="text-2xl font-bold" data-testid="text-profile-username">{user?.username}</h1>
            {user?.isAdmin !== undefined && user.isAdmin >= 1 && (
              <Badge variant="secondary" className="mt-2">
                <Shield className="h-3 w-3 mr-1" />
                {user.isAdmin === 2 ? "Super Admin" : "Admin"}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Personal Wallet</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-personal-balance">
                ${parseFloat(personalWallet?.balance || "0").toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Escrow</CardTitle>
              <Target className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-escrow-balance">
                ${parseFloat(escrowWallet?.balance || "0").toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Spectator Wallet</CardTitle>
              <Trophy className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-spectator-balance">
                ${parseFloat(spectatorWallet?.balance || "0").toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Match Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 rounded-md bg-muted/50">
                    <p className="text-2xl font-bold text-green-500" data-testid="text-matches-won">
                      {stats.wins}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Wins
                    </p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <p className="text-2xl font-bold text-red-500" data-testid="text-matches-lost">
                      {stats.losses}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Losses
                    </p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-win-rate">
                      {stats.winRate}%
                    </p>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <p
                      className={`text-2xl font-bold ${
                        stats.totalEarnings >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                      data-testid="text-net-earnings"
                    >
                      {stats.totalEarnings >= 0 ? "+" : ""}${stats.totalEarnings.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Net Earnings</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <p>Total matches played: <span className="font-medium text-foreground">{stats.totalMatches}</span></p>
                    <p>Total bet amount: <span className="font-medium text-foreground">${stats.totalBetAmount.toFixed(2)}</span></p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Spectator bets won: <span className="font-medium text-green-500 ml-1">{stats.spectatorBetsWon}</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Spectator bets lost: <span className="font-medium text-red-500 ml-1">{stats.spectatorBetsLost}</span>
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No match statistics yet.</p>
                <p className="text-sm mt-1">Complete your first match to see your stats!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
