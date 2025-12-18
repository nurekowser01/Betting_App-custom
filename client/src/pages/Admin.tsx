import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Match } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Check, X, ArrowLeft, Users, Gamepad2, Clock, Eye, DollarSign } from "lucide-react";
import { Link } from "wouter";

interface AdminUser {
  id: string;
  username: string;
  isAdmin: number;
}

interface LiveMatch extends Match {
  totalSpectatorBets?: number;
}

const adminLevelLabels: Record<number, string> = {
  0: "User",
  1: "Admin",
  2: "Super Admin",
};

const adminLevelColors: Record<number, "default" | "secondary" | "destructive"> = {
  0: "secondary",
  1: "default",
  2: "destructive",
};

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedWinners, setSelectedWinners] = useState<Record<string, string>>({});

  const isSuperAdmin = user?.isAdmin === 2;

  const { data: pendingMatches = [], isLoading: pendingLoading } = useQuery<Match[]>({
    queryKey: ["/api/admin/matches/pending"],
    enabled: user?.isAdmin !== undefined && user.isAdmin >= 1,
  });

  const { data: liveMatches = [], isLoading: liveLoading } = useQuery<LiveMatch[]>({
    queryKey: ["/api/admin/matches/live"],
    enabled: user?.isAdmin !== undefined && user.isAdmin >= 1,
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isSuperAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ matchId, winnerId }: { matchId: string; winnerId: string }) => {
      const res = await apiRequest("POST", `/api/admin/matches/${matchId}/approve`, { winnerId });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/matches/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      setSelectedWinners((prev) => {
        const updated = { ...prev };
        delete updated[variables.matchId];
        return updated;
      });
      toast({ title: "Match approved", description: "Funds have been transferred to the winner." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve match", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await apiRequest("POST", `/api/admin/matches/${matchId}/reject`, {});
      return res.json();
    },
    onSuccess: (_, matchId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/matches/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      setSelectedWinners((prev) => {
        const updated = { ...prev };
        delete updated[matchId];
        return updated;
      });
      toast({ title: "Match rejected", description: "Funds have been refunded to both players." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject match", variant: "destructive" });
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: async ({ userId, level }: { userId: string; level: number }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/admin-level`, { level });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Updated", description: "User privilege level updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    },
  });

  const selectWinner = (matchId: string, winnerId: string) => {
    setSelectedWinners((prev) => ({ ...prev, [matchId]: winnerId }));
  };

  const handleConfirm = (matchId: string) => {
    const winnerId = selectedWinners[matchId];
    if (winnerId) {
      approveMutation.mutate({ matchId, winnerId });
    }
  };

  if (!user || user.isAdmin === undefined || user.isAdmin < 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You need admin access to view this page.</p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <Badge variant={adminLevelColors[user.isAdmin]}>
              {adminLevelLabels[user.isAdmin]}
            </Badge>
          </div>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to App
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending">
              <Clock className="h-4 w-4" />
              Pending ({pendingMatches.length})
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-2" data-testid="tab-live">
              <Gamepad2 className="h-4 w-4" />
              Live ({liveMatches.length})
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
                <Users className="h-4 w-4" />
                Users ({allUsers.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Pending Approvals
                  {pendingMatches.length > 0 && (
                    <Badge variant="secondary">{pendingMatches.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : pendingMatches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No matches pending approval
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingMatches.map((match) => {
                      const selectedWinner = selectedWinners[match.id];
                      const isPlayer1Selected = selectedWinner === match.player1Id;
                      const isPlayer2Selected = selectedWinner === match.player2Id;

                      return (
                        <div
                          key={match.id}
                          data-testid={`card-pending-match-${match.id}`}
                          className="p-4 border rounded-md bg-muted/30"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="font-medium">{match.game}</div>
                              <div className="text-sm text-muted-foreground">
                                {match.player1?.username} vs {match.player2?.username}
                              </div>
                              <div className="text-sm">
                                Bet: <span className="font-medium">${match.betAmount}</span> each (Total pot: ${parseFloat(match.betAmount) * 2})
                              </div>
                              {match.reportedWinner && (
                                <div className="text-sm">
                                  Reported winner: <span className="font-medium text-primary">{match.reportedWinner.username}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="text-sm text-muted-foreground mb-1">Select winner:</div>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  onClick={() => selectWinner(match.id, match.player1Id)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  data-testid={`button-select-player1-${match.id}`}
                                  variant={isPlayer1Selected ? "default" : "outline"}
                                  className={isPlayer1Selected ? "ring-2 ring-primary ring-offset-2" : ""}
                                >
                                  {match.player1?.username}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => selectWinner(match.id, match.player2Id!)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending || !match.player2Id}
                                  data-testid={`button-select-player2-${match.id}`}
                                  variant={isPlayer2Selected ? "default" : "outline"}
                                  className={isPlayer2Selected ? "ring-2 ring-primary ring-offset-2" : ""}
                                >
                                  {match.player2?.username}
                                </Button>
                              </div>
                              <div className="flex gap-2 flex-wrap mt-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirm(match.id)}
                                  disabled={!selectedWinner || approveMutation.isPending || rejectMutation.isPending}
                                  data-testid={`button-confirm-${match.id}`}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Confirm Winner
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectMutation.mutate(match.id)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  data-testid={`button-reject-${match.id}`}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Reject & Refund
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Live Matches
                  {liveMatches.length > 0 && (
                    <Badge variant="destructive">{liveMatches.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {liveLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : liveMatches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No live matches currently
                  </div>
                ) : (
                  <div className="space-y-4">
                    {liveMatches.map((match) => (
                      <div
                        key={match.id}
                        data-testid={`card-live-match-${match.id}`}
                        className="p-4 border rounded-md bg-muted/30"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="font-medium">{match.game}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {match.player1?.username} vs {match.player2?.username}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <DollarSign className="h-4 w-4" />
                                <span>Pot</span>
                              </div>
                              <div className="font-bold">${parseFloat(match.betAmount) * 2}</div>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Eye className="h-4 w-4" />
                                <span>Spectators</span>
                              </div>
                              <div className="font-bold">{match.spectatorCount}</div>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <DollarSign className="h-4 w-4" />
                                <span>Side Bets</span>
                              </div>
                              <div className="font-bold">${match.totalSpectatorBets?.toFixed(2) || '0.00'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    User Management
                    <Badge variant="secondary">{allUsers.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : allUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allUsers.map((u) => (
                        <div
                          key={u.id}
                          data-testid={`row-user-${u.id}`}
                          className="flex flex-wrap items-center justify-between gap-4 p-3 border rounded-md bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                              {u.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{u.username}</div>
                              <div className="text-xs text-muted-foreground">ID: {u.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {u.id === user.id ? (
                              <Badge variant={adminLevelColors[u.isAdmin]}>
                                {adminLevelLabels[u.isAdmin]} (You)
                              </Badge>
                            ) : (
                              <Select
                                value={u.isAdmin.toString()}
                                onValueChange={(value) => updateAdminMutation.mutate({ userId: u.id, level: parseInt(value) })}
                                disabled={updateAdminMutation.isPending}
                              >
                                <SelectTrigger className="w-36" data-testid={`select-admin-level-${u.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">User</SelectItem>
                                  <SelectItem value="1">Admin</SelectItem>
                                  <SelectItem value="2">Super Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
