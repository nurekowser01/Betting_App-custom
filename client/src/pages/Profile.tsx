import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Wallet, Trophy, Target, Shield } from "lucide-react";
import type { Wallet as WalletType, Match } from "@/lib/types";

export default function Profile() {
  const { user, logout } = useAuth();

  const { data: wallets = [] } = useQuery<WalletType[]>({
    queryKey: ["/api/wallets"],
    enabled: !!user,
  });

  const { data: matches = [] } = useQuery<Match[]>({
    queryKey: ["/api/matches/my"],
    enabled: !!user,
  });

  const personalWallet = wallets.find(w => w.type === "personal");
  const escrowWallet = wallets.find(w => w.type === "escrow");
  const spectatorWallet = wallets.find(w => w.type === "spectator");

  const completedMatches = matches.filter(m => m.status === "completed");
  const wonMatches = completedMatches.filter(m => m.winnerId === user?.id);
  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        username={user?.username} 
        balance={parseFloat(personalWallet?.balance || "0")}
        isAdmin={user?.isAdmin === 1}
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
            {user?.isAdmin === 1 && (
              <Badge variant="secondary" className="mt-2">
                <Shield className="h-3 w-3 mr-1" />
                Admin
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
            <CardTitle>Match Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold" data-testid="text-matches-played">{completedMatches.length}</p>
                <p className="text-sm text-muted-foreground">Matches Played</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-500" data-testid="text-matches-won">{wonMatches.length}</p>
                <p className="text-sm text-muted-foreground">Matches Won</p>
              </div>
              <div>
                <p className="text-3xl font-bold" data-testid="text-win-rate">
                  {completedMatches.length > 0 
                    ? Math.round((wonMatches.length / completedMatches.length) * 100) 
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Win Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
