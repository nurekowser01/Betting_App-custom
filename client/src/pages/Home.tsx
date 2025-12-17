import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { WalletCard } from "@/components/WalletCard";
import { MatchCard } from "@/components/MatchCard";
import { LiveMatchesList } from "@/components/LiveMatchesList";
import { CreateMatchDialog } from "@/components/CreateMatchDialog";
import { DepositDialog } from "@/components/DepositDialog";
import { SpectatorBetDialog } from "@/components/SpectatorBetDialog";
import { TransactionList } from "@/components/TransactionList";
import { Footer } from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, Trophy } from "lucide-react";
import type { Match, Transaction } from "@/lib/types";

// todo: remove mock functionality
const mockUser = { id: 'u1', username: 'ProGamer99' };

const mockMatches: Match[] = [
  { id: '1', game: 'FIFA 24', betAmount: 100, status: 'live', player1: { id: 'p1', username: 'Messi10' }, player2: { id: 'p2', username: 'CR7Fan' }, spectatorCount: 45, createdAt: new Date() },
  { id: '2', game: 'NBA 2K24', betAmount: 75, status: 'live', player1: { id: 'p3', username: 'LeBronJr' }, player2: { id: 'p4', username: 'Curry30' }, spectatorCount: 32, createdAt: new Date() },
  { id: '3', game: 'UFC 5', betAmount: 200, status: 'live', player1: { id: 'p5', username: 'KnockoutKing' }, player2: { id: 'p6', username: 'TapMaster' }, spectatorCount: 67, createdAt: new Date() },
  { id: '4', game: 'Call of Duty: MW3', betAmount: 50, status: 'waiting', player1: { id: 'p7', username: 'SniperElite' }, spectatorCount: 0, createdAt: new Date() },
  { id: '5', game: 'Mortal Kombat 1', betAmount: 150, status: 'waiting', player1: { id: 'p8', username: 'FatalityKing' }, spectatorCount: 0, createdAt: new Date() },
  { id: '6', game: 'Gran Turismo 7', betAmount: 100, status: 'completed', player1: { id: 'p9', username: 'SpeedDemon' }, player2: { id: 'p10', username: 'DriftMaster' }, winner: 'p9', spectatorCount: 28, createdAt: new Date(Date.now() - 3600000) },
];

const mockTransactions: Transaction[] = [
  { id: '1', type: 'deposit', amount: 500, description: 'Added funds via card', createdAt: new Date(), status: 'completed' },
  { id: '2', type: 'escrow', amount: 100, description: 'Match vs RunNGun', createdAt: new Date(Date.now() - 3600000), status: 'pending' },
  { id: '3', type: 'winnings', amount: 190, description: 'Won match vs ProGamer', createdAt: new Date(Date.now() - 7200000), status: 'completed' },
  { id: '4', type: 'bet', amount: 50, description: 'Spectator bet on Match #23', createdAt: new Date(Date.now() - 86400000), status: 'completed' },
];

export default function Home() {
  const [personalBalance, setPersonalBalance] = useState(1250);
  const [escrowBalance] = useState(500);
  const [spectatorBalance, setSpectatorBalance] = useState(350);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositType, setDepositType] = useState<'personal' | 'spectator'>('personal');
  const [spectatorBetOpen, setSpectatorBetOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matches, setMatches] = useState(mockMatches);
  const [transactions, setTransactions] = useState(mockTransactions);

  const totalBalance = personalBalance + spectatorBalance;

  const handleDeposit = (amount: number) => {
    if (depositType === 'personal') {
      setPersonalBalance(prev => prev + amount);
    } else {
      setSpectatorBalance(prev => prev + amount);
    }
    setTransactions(prev => [
      { id: Date.now().toString(), type: 'deposit', amount, description: `Added funds to ${depositType} wallet`, createdAt: new Date(), status: 'completed' },
      ...prev
    ]);
  };

  const handleCreateMatch = (game: string, betAmount: number) => {
    if (betAmount <= personalBalance) {
      setPersonalBalance(prev => prev - betAmount);
      const newMatch: Match = {
        id: Date.now().toString(),
        game,
        betAmount,
        status: 'waiting',
        player1: mockUser,
        spectatorCount: 0,
        createdAt: new Date(),
      };
      setMatches(prev => [newMatch, ...prev]);
      setTransactions(prev => [
        { id: Date.now().toString(), type: 'escrow', amount: betAmount, description: `Match created: ${game}`, createdAt: new Date(), status: 'pending' },
        ...prev
      ]);
    }
  };

  const handleSpectate = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match) {
      setSelectedMatch(match);
      setSpectatorBetOpen(true);
    }
  };

  const handleSpectatorBet = (playerId: string, amount: number) => {
    if (amount <= spectatorBalance) {
      setSpectatorBalance(prev => prev - amount);
      const match = matches.find(m => m.id === selectedMatch?.id);
      const playerName = playerId === match?.player1.id ? match.player1.username : match?.player2?.username;
      setTransactions(prev => [
        { id: Date.now().toString(), type: 'bet', amount, description: `Bet on ${playerName}`, createdAt: new Date(), status: 'pending' },
        ...prev
      ]);
    }
  };

  const handleJoinMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match && match.betAmount <= personalBalance) {
      setPersonalBalance(prev => prev - match.betAmount);
      setMatches(prev => prev.map(m => 
        m.id === matchId 
          ? { ...m, status: 'live' as const, player2: mockUser, spectatorCount: Math.floor(Math.random() * 20) + 5 }
          : m
      ));
      setTransactions(prev => [
        { id: Date.now().toString(), type: 'escrow', amount: match.betAmount, description: `Joined match: ${match.game}`, createdAt: new Date(), status: 'pending' },
        ...prev
      ]);
    }
  };

  const openMatches = matches.filter(m => m.status === 'waiting');
  const completedMatches = matches.filter(m => m.status === 'completed');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar username={mockUser.username} balance={totalBalance} onLogout={() => console.log('Logout')} />
      
      <HeroSection 
        onCreateMatch={() => document.querySelector<HTMLButtonElement>('[data-testid="button-create-match"]')?.click()}
        onBrowseFixtures={() => document.getElementById('fixtures')?.scrollIntoView({ behavior: 'smooth' })}
        totalBets={15234}
        activePlayers={487}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <section className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <h2 className="text-2xl font-bold">Your Wallets</h2>
            <CreateMatchDialog onCreateMatch={handleCreateMatch} maxBet={personalBalance} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WalletCard 
              type="personal" 
              balance={personalBalance}
              onDeposit={() => { setDepositType('personal'); setDepositOpen(true); }}
              onWithdraw={() => console.log('Withdraw')}
            />
            <WalletCard type="escrow" balance={escrowBalance} />
            <WalletCard 
              type="spectator" 
              balance={spectatorBalance}
              onDeposit={() => { setDepositType('spectator'); setDepositOpen(true); }}
            />
          </div>
        </section>

        <LiveMatchesList matches={matches} onSpectate={handleSpectate} />

        <section id="fixtures" className="py-12">
          <Tabs defaultValue="open" className="w-full">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <TabsList>
                <TabsTrigger value="open" className="gap-2" data-testid="tab-open-matches">
                  <Clock className="h-4 w-4" />
                  Open Matches
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2" data-testid="tab-completed">
                  <Trophy className="h-4 w-4" />
                  Completed
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="open">
              {openMatches.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-lg mb-4">No open matches available</p>
                  <CreateMatchDialog onCreateMatch={handleCreateMatch} maxBet={personalBalance} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {openMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onJoin={() => handleJoinMatch(match.id)}
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
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

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
      </main>

      <Footer />

      <DepositDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        onDeposit={handleDeposit}
        walletType={depositType}
      />

      {selectedMatch && (
        <SpectatorBetDialog
          match={selectedMatch}
          open={spectatorBetOpen}
          onOpenChange={setSpectatorBetOpen}
          onPlaceBet={handleSpectatorBet}
          maxBet={spectatorBalance}
        />
      )}
    </div>
  );
}
