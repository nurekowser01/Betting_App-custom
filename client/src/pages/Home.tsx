import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { WalletCard } from "@/components/WalletCard";
import { MatchCard } from "@/components/MatchCard";
import { LiveMatchesList } from "@/components/LiveMatchesList";
import { CreateMatchDialog } from "@/components/CreateMatchDialog";
import { DepositDialog } from "@/components/DepositDialog";
import { SpectatorBetDialog } from "@/components/SpectatorBetDialog";
import { CompleteMatchDialog } from "@/components/CompleteMatchDialog";
import { TransactionList } from "@/components/TransactionList";
import { AuthDialog } from "@/components/AuthDialog";
import { Footer } from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Trophy, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Match, Wallet, Transaction } from "@/lib/types";

export default function Home() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [authOpen, setAuthOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositType, setDepositType] = useState<'personal' | 'spectator'>('personal');
  const [spectatorBetOpen, setSpectatorBetOpen] = useState(false);
  const [completeMatchOpen, setCompleteMatchOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const { data: wallets = [], isLoading: walletsLoading } = useQuery<Wallet[]>({
    queryKey: ["/api/wallets"],
    enabled: !!user,
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const personalWallet = wallets.find(w => w.type === 'personal');
  const escrowWallet = wallets.find(w => w.type === 'escrow');
  const spectatorWallet = wallets.find(w => w.type === 'spectator');

  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance), 0);

  const depositMutation = useMutation({
    mutationFn: async ({ type, amount }: { type: 'personal' | 'spectator'; amount: number }) => {
      const res = await apiRequest("POST", `/api/wallets/${type}/deposit`, { amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Success", description: "Funds deposited successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to deposit funds", variant: "destructive" });
    },
  });

  const createMatchMutation = useMutation({
    mutationFn: async ({ game, betAmount }: { game: string; betAmount: number }) => {
      const res = await apiRequest("POST", "/api/matches", { game, betAmount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Match Created", description: "Waiting for an opponent to join" });
    },
    onError: (error: any) => {
      const message = error.message?.includes("Insufficient") 
        ? "Insufficient funds. Please deposit money first." 
        : error.message || "Failed to create match";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const joinMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/join`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Match Joined", description: "Game is now live!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to join match", variant: "destructive" });
    },
  });

  const completeMatchMutation = useMutation({
    mutationFn: async ({ matchId, winnerId }: { matchId: string; winnerId: string }) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/complete`, { winnerId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setCompleteMatchOpen(false);
      toast({ title: "Winner Reported", description: "Waiting for admin approval to transfer funds." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to complete match", variant: "destructive" });
    },
  });

  const spectatorBetMutation = useMutation({
    mutationFn: async ({ matchId, predictedWinnerId, amount }: { matchId: string; predictedWinnerId: string; amount: number }) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/spectator-bet`, { predictedWinnerId, amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setSpectatorBetOpen(false);
      toast({ title: "Bet Placed", description: "Good luck!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to place bet", variant: "destructive" });
    },
  });

  const cancelMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/cancel`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Match Cancelled", description: "Your funds have been refunded" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to cancel match", variant: "destructive" });
    },
  });

  const proposeMutation = useMutation({
    mutationFn: async ({ matchId, proposedAmount }: { matchId: string; proposedAmount: number }) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/propose`, { proposedAmount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({ title: "Proposal Sent", description: "Waiting for the creator to accept" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send proposal", variant: "destructive" });
    },
  });

  const acceptProposalMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/accept-proposal`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Proposal Accepted", description: "Match is now live!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to accept proposal", variant: "destructive" });
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/reject-proposal`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({ title: "Proposal Declined", description: "The proposal has been rejected" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject proposal", variant: "destructive" });
    },
  });

  const handleDeposit = (amount: number) => {
    depositMutation.mutate({ type: depositType, amount });
    setDepositOpen(false);
  };

  const handleCreateMatch = (game: string, betAmount: number) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    createMatchMutation.mutate({ game, betAmount });
  };

  const handleJoinMatch = (matchId: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    joinMatchMutation.mutate(matchId);
  };

  const handleSpectate = (matchId: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const match = matches.find(m => m.id === matchId);
    if (match) {
      setSelectedMatch(match);
      setSpectatorBetOpen(true);
    }
  };

  const handleCompleteMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match) {
      setSelectedMatch(match);
      setCompleteMatchOpen(true);
    }
  };

  const handleSpectatorBet = (playerId: string, amount: number) => {
    if (selectedMatch) {
      spectatorBetMutation.mutate({ matchId: selectedMatch.id, predictedWinnerId: playerId, amount });
    }
  };

  const handleConfirmWinner = (winnerId: string) => {
    if (selectedMatch) {
      completeMatchMutation.mutate({ matchId: selectedMatch.id, winnerId });
    }
  };

  const openMatches = matches.filter(m => m.status === 'waiting');
  const liveMatches = matches.filter(m => m.status === 'live');
  const completedMatches = matches.filter(m => m.status === 'completed');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar 
        username={user?.username} 
        balance={totalBalance}
        isAdmin={user?.isAdmin !== undefined && user.isAdmin >= 1}
        onLogout={logout}
        onLogin={() => setAuthOpen(true)}
      />
      
      <HeroSection 
        onCreateMatch={() => {
          if (!user) {
            setAuthOpen(true);
          } else {
            document.querySelector<HTMLButtonElement>('[data-testid="button-create-match"]')?.click();
          }
        }}
        onBrowseFixtures={() => document.getElementById('fixtures')?.scrollIntoView({ behavior: 'smooth' })}
        totalBets={matches.length * 100 + 15234}
        activePlayers={liveMatches.length * 2 + 487}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        {user && (
          <section className="mb-12">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <h2 className="text-2xl font-bold">Your Wallets</h2>
              <CreateMatchDialog 
                onCreateMatch={handleCreateMatch} 
                maxBet={personalWallet ? parseFloat(personalWallet.balance) : 0} 
              />
            </div>
            {walletsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <WalletCard 
                  type="personal" 
                  balance={personalWallet ? parseFloat(personalWallet.balance) : 0}
                  onDeposit={() => { setDepositType('personal'); setDepositOpen(true); }}
                  onWithdraw={() => console.log('Withdraw')}
                />
                <WalletCard 
                  type="escrow" 
                  balance={escrowWallet ? parseFloat(escrowWallet.balance) : 0} 
                />
                <WalletCard 
                  type="spectator" 
                  balance={spectatorWallet ? parseFloat(spectatorWallet.balance) : 0}
                  onDeposit={() => { setDepositType('spectator'); setDepositOpen(true); }}
                />
              </div>
            )}
          </section>
        )}

        <LiveMatchesList 
          matches={matches.map(m => ({
            ...m,
            player1: m.player1 || { id: m.player1Id, username: 'Player 1' },
            player2: m.player2 || undefined,
          }))} 
          onSpectate={handleSpectate}
          currentUserId={user?.id}
          onComplete={handleCompleteMatch}
        />

        <section id="fixtures" className="py-12">
          <Tabs defaultValue="open" className="w-full">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <TabsList>
                <TabsTrigger value="open" className="gap-2" data-testid="tab-open-matches">
                  <Clock className="h-4 w-4" />
                  Open ({openMatches.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2" data-testid="tab-completed">
                  <Trophy className="h-4 w-4" />
                  Completed ({completedMatches.length})
                </TabsTrigger>
              </TabsList>
              {!user && (
                <Button onClick={() => setAuthOpen(true)} data-testid="button-get-started">
                  Login to Play
                </Button>
              )}
            </div>

            <TabsContent value="open">
              {matchesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : openMatches.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-lg mb-4">No open matches available</p>
                  {user && <CreateMatchDialog onCreateMatch={handleCreateMatch} maxBet={personalWallet ? parseFloat(personalWallet.balance) : 0} />}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {openMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onJoin={() => handleJoinMatch(match.id)}
                      onCancel={() => cancelMatchMutation.mutate(match.id)}
                      onPropose={(amount) => proposeMutation.mutate({ matchId: match.id, proposedAmount: amount })}
                      onAcceptProposal={() => acceptProposalMutation.mutate(match.id)}
                      onRejectProposal={() => rejectProposalMutation.mutate(match.id)}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed">
              {completedMatches.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-lg">No completed matches yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onViewResults={() => console.log('View results:', match.id)}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {user && transactions.length > 0 && (
          <section className="py-12">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Recent Transactions</CardTitle>
                <Button variant="ghost" size="sm">View All</Button>
              </CardHeader>
              <CardContent>
                <TransactionList transactions={transactions.slice(0, 5)} />
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      <Footer />

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      <DepositDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        onDeposit={handleDeposit}
        walletType={depositType}
      />

      {selectedMatch && (
        <>
          <SpectatorBetDialog
            match={{
              ...selectedMatch,
              player1: selectedMatch.player1 || { id: selectedMatch.player1Id, username: 'Player 1' },
              player2: selectedMatch.player2 || undefined,
            }}
            open={spectatorBetOpen}
            onOpenChange={setSpectatorBetOpen}
            onPlaceBet={handleSpectatorBet}
            maxBet={spectatorWallet ? parseFloat(spectatorWallet.balance) : 0}
          />
          <CompleteMatchDialog
            match={selectedMatch}
            open={completeMatchOpen}
            onOpenChange={setCompleteMatchOpen}
            onComplete={handleConfirmWinner}
            isLoading={completeMatchMutation.isPending}
          />
        </>
      )}
    </div>
  );
}
