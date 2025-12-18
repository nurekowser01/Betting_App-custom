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
import { Shield, Check, X, ArrowLeft, Users, Gamepad2, Clock, Eye, DollarSign, Settings, Zap, CheckCircle, XCircle, Loader2, Ban, Trash2, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";

interface AdminUser {
  id: string;
  username: string;
  isAdmin: number;
  suspended: number;
}

interface Integration {
  id: string;
  type: 'binance_pay' | 'stripe' | 'coinbase';
  enabled: number;
  apiKey: string | null;
  secretKey: string | null;
  webhookSecret: string | null;
  additionalConfig: any;
  lastTestedAt: string | null;
  testStatus: string | null;
  updatedAt: string;
}

interface SpectatorBetSummary {
  totalBets: number;
  betsOnPlayer1: number;
  betsOnPlayer2: number;
  potentialPayoutPlayer1: number;
  potentialPayoutPlayer2: number;
  betCount: number;
}

interface LiveMatch extends Match {
  totalSpectatorBets?: number;
  spectatorBetSummary?: SpectatorBetSummary;
}

interface PendingMatch extends Match {
  spectatorBetSummary?: SpectatorBetSummary;
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

  const { data: pendingMatches = [], isLoading: pendingLoading } = useQuery<PendingMatch[]>({
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

  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: number }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/suspend`, { suspended });
      return res.json();
    },
    onSuccess: (_, { suspended }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ 
        title: suspended === 1 ? "User Suspended" : "User Unsuspended", 
        description: suspended === 1 ? "User has been suspended and cannot login." : "User account has been restored."
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Deleted", description: "User has been permanently deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    },
  });

  // Integration management
  const { data: allIntegrations = [], isLoading: integrationsLoading } = useQuery<Integration[]>({
    queryKey: ["/api/admin/integrations"],
    enabled: isSuperAdmin,
  });

  const [integrationForms, setIntegrationForms] = useState<Record<string, { apiKey: string; secretKey: string; webhookSecret: string }>>({
    binance_pay: { apiKey: '', secretKey: '', webhookSecret: '' },
    stripe: { apiKey: '', secretKey: '', webhookSecret: '' },
    coinbase: { apiKey: '', secretKey: '', webhookSecret: '' },
  });
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);

  const updateIntegrationMutation = useMutation({
    mutationFn: async ({ type, data }: { type: string; data: any }) => {
      const res = await apiRequest("POST", `/api/admin/integrations/${type}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrations"] });
      toast({ title: "Saved", description: "Integration settings updated." });
      // Clear the form
      setIntegrationForms({
        binance_pay: { apiKey: '', secretKey: '', webhookSecret: '' },
        stripe: { apiKey: '', secretKey: '', webhookSecret: '' },
        coinbase: { apiKey: '', secretKey: '', webhookSecret: '' },
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update integration", variant: "destructive" });
    },
  });

  const testIntegrationMutation = useMutation({
    mutationFn: async (type: string) => {
      setTestingIntegration(type);
      const res = await apiRequest("POST", `/api/admin/integrations/${type}/test`, {});
      return res.json();
    },
    onSuccess: (data) => {
      setTestingIntegration(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrations"] });
      if (data.success) {
        toast({ title: "Success", description: data.message });
      } else {
        toast({ title: "Test Failed", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      setTestingIntegration(null);
      toast({ title: "Error", description: "Failed to test connection", variant: "destructive" });
    },
  });

  const handleToggleIntegration = (type: string, currentEnabled: number) => {
    updateIntegrationMutation.mutate({ type, data: { enabled: currentEnabled === 1 ? 0 : 1 } });
  };

  const handleSaveIntegration = (type: string) => {
    const form = integrationForms[type];
    const data: any = {};
    if (form.apiKey) data.apiKey = form.apiKey;
    if (form.secretKey) data.secretKey = form.secretKey;
    if (form.webhookSecret) data.webhookSecret = form.webhookSecret;
    
    if (Object.keys(data).length === 0) {
      toast({ title: "No changes", description: "Enter at least one value to save", variant: "destructive" });
      return;
    }
    
    updateIntegrationMutation.mutate({ type, data });
  };

  const getIntegrationByType = (type: string) => allIntegrations.find(i => i.type === type);

  const integrationLabels: Record<string, { name: string; description: string }> = {
    binance_pay: { name: "Binance Pay", description: "Accept cryptocurrency payments via Binance" },
    stripe: { name: "Stripe", description: "Accept card and bank payments in EUR and other currencies" },
    coinbase: { name: "Coinbase Commerce", description: "Accept cryptocurrency payments via Coinbase" },
  };

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
            {isSuperAdmin && (
              <TabsTrigger value="integrations" className="gap-2" data-testid="tab-integrations">
                <Settings className="h-4 w-4" />
                Integrations
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
                            <div className="space-y-2">
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
                              
                              {match.spectatorBetSummary && match.spectatorBetSummary.betCount > 0 && (
                                <div className="mt-3 p-3 rounded-md bg-accent/30 space-y-2">
                                  <div className="text-sm font-medium flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    Spectator Bets ({match.spectatorBetSummary.betCount})
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="p-2 rounded bg-background/50">
                                      <div className="text-xs text-muted-foreground">Bets on {match.player1?.username}</div>
                                      <div className="font-bold">${match.spectatorBetSummary.betsOnPlayer1.toFixed(2)}</div>
                                      <div className="text-xs text-chart-2">
                                        Potential payout: ${match.spectatorBetSummary.potentialPayoutPlayer1.toFixed(2)}
                                      </div>
                                    </div>
                                    <div className="p-2 rounded bg-background/50">
                                      <div className="text-xs text-muted-foreground">Bets on {match.player2?.username}</div>
                                      <div className="font-bold">${match.spectatorBetSummary.betsOnPlayer2.toFixed(2)}</div>
                                      <div className="text-xs text-chart-2">
                                        Potential payout: ${match.spectatorBetSummary.potentialPayoutPlayer2.toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground pt-1 border-t">
                                    Total spectator stake: <span className="font-medium">${match.spectatorBetSummary.totalBets.toFixed(2)}</span>
                                  </div>
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
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="font-medium">{match.game}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {match.player1?.username} vs {match.player2?.username}
                            </div>
                            <div className="text-sm">
                              Match bet: <span className="font-medium">${match.betAmount}</span> each
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
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
                                <span>Bettors</span>
                              </div>
                              <div className="font-bold">{match.spectatorBetSummary?.betCount || 0}</div>
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
                        
                        {match.spectatorBetSummary && match.spectatorBetSummary.betCount > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="p-2 rounded bg-accent/30">
                                <div className="text-xs text-muted-foreground">Bets on {match.player1?.username}</div>
                                <div className="font-bold">${match.spectatorBetSummary.betsOnPlayer1.toFixed(2)}</div>
                                <div className="text-xs text-chart-2">
                                  Potential payout: ${match.spectatorBetSummary.potentialPayoutPlayer1.toFixed(2)}
                                </div>
                              </div>
                              <div className="p-2 rounded bg-accent/30">
                                <div className="text-xs text-muted-foreground">Bets on {match.player2?.username}</div>
                                <div className="font-bold">${match.spectatorBetSummary.betsOnPlayer2.toFixed(2)}</div>
                                <div className="text-xs text-chart-2">
                                  Potential payout: ${match.spectatorBetSummary.potentialPayoutPlayer2.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
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
                            {u.suspended === 1 && (
                              <Badge variant="destructive">Suspended</Badge>
                            )}
                            {u.id === user.id ? (
                              <Badge variant={adminLevelColors[u.isAdmin]}>
                                {adminLevelLabels[u.isAdmin]} (You)
                              </Badge>
                            ) : (
                              <>
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
                                {u.isAdmin === 0 && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant={u.suspended === 1 ? "outline" : "secondary"}
                                      onClick={() => suspendUserMutation.mutate({ userId: u.id, suspended: u.suspended === 1 ? 0 : 1 })}
                                      disabled={suspendUserMutation.isPending}
                                      data-testid={`button-suspend-${u.id}`}
                                      title={u.suspended === 1 ? "Unsuspend User" : "Suspend User"}
                                    >
                                      {u.suspended === 1 ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="destructive"
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to permanently delete user "${u.username}"? This cannot be undone.`)) {
                                          deleteUserMutation.mutate(u.id);
                                        }
                                      }}
                                      disabled={deleteUserMutation.isPending}
                                      data-testid={`button-delete-${u.id}`}
                                      title="Delete User"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </>
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

          {isSuperAdmin && (
            <TabsContent value="integrations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Payment Integrations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {integrationsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : (
                    <div className="space-y-6">
                      {['binance_pay', 'stripe', 'coinbase'].map((type) => {
                        const integration = getIntegrationByType(type);
                        const label = integrationLabels[type];
                        const form = integrationForms[type];
                        const isEnabled = integration?.enabled === 1;
                        const hasCredentials = integration?.apiKey && integration?.secretKey;
                        const isTesting = testingIntegration === type;
                        
                        return (
                          <div
                            key={type}
                            data-testid={`integration-${type}`}
                            className="p-4 border rounded-md bg-muted/30 space-y-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                  <div className="font-medium flex items-center gap-2">
                                    {label.name}
                                    {isEnabled && (
                                      <Badge variant="default" className="text-xs">Enabled</Badge>
                                    )}
                                    {!isEnabled && hasCredentials && (
                                      <Badge variant="secondary" className="text-xs">Disabled</Badge>
                                    )}
                                    {!hasCredentials && (
                                      <Badge variant="outline" className="text-xs">Not Configured</Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">{label.description}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {hasCredentials && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => testIntegrationMutation.mutate(type)}
                                    disabled={isTesting || testIntegrationMutation.isPending}
                                    data-testid={`button-test-${type}`}
                                  >
                                    {isTesting ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Testing...
                                      </>
                                    ) : (
                                      <>
                                        <Zap className="h-4 w-4 mr-2" />
                                        Test Connection
                                      </>
                                    )}
                                  </Button>
                                )}
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`toggle-${type}`} className="text-sm">
                                    {isEnabled ? 'On' : 'Off'}
                                  </Label>
                                  <Switch
                                    id={`toggle-${type}`}
                                    checked={isEnabled}
                                    onCheckedChange={() => handleToggleIntegration(type, integration?.enabled ?? 0)}
                                    disabled={!hasCredentials || updateIntegrationMutation.isPending}
                                    data-testid={`switch-${type}`}
                                  />
                                </div>
                              </div>
                            </div>

                            {integration?.testStatus && (
                              <div className={`flex items-center gap-2 text-sm ${
                                integration.testStatus === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {integration.testStatus === 'success' ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                Last test: {integration.testStatus}
                                {integration.lastTestedAt && (
                                  <span className="text-muted-foreground">
                                    ({new Date(integration.lastTestedAt).toLocaleString()})
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label htmlFor={`api-key-${type}`}>API Key</Label>
                                <Input
                                  id={`api-key-${type}`}
                                  type="password"
                                  placeholder={integration?.apiKey || "Enter API Key"}
                                  value={form.apiKey}
                                  onChange={(e) => setIntegrationForms(prev => ({
                                    ...prev,
                                    [type]: { ...prev[type], apiKey: e.target.value }
                                  }))}
                                  data-testid={`input-api-key-${type}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`secret-key-${type}`}>Secret Key</Label>
                                <Input
                                  id={`secret-key-${type}`}
                                  type="password"
                                  placeholder={integration?.secretKey || "Enter Secret Key"}
                                  value={form.secretKey}
                                  onChange={(e) => setIntegrationForms(prev => ({
                                    ...prev,
                                    [type]: { ...prev[type], secretKey: e.target.value }
                                  }))}
                                  data-testid={`input-secret-key-${type}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`webhook-${type}`}>Webhook Secret (optional)</Label>
                                <Input
                                  id={`webhook-${type}`}
                                  type="password"
                                  placeholder={integration?.webhookSecret || "Enter Webhook Secret"}
                                  value={form.webhookSecret}
                                  onChange={(e) => setIntegrationForms(prev => ({
                                    ...prev,
                                    [type]: { ...prev[type], webhookSecret: e.target.value }
                                  }))}
                                  data-testid={`input-webhook-${type}`}
                                />
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <Button
                                onClick={() => handleSaveIntegration(type)}
                                disabled={updateIntegrationMutation.isPending || (!form.apiKey && !form.secretKey && !form.webhookSecret)}
                                data-testid={`button-save-${type}`}
                              >
                                {updateIntegrationMutation.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  'Save Credentials'
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="p-4 border rounded-md bg-accent/20">
                        <h4 className="font-medium mb-2">How it works</h4>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Enter your API credentials for each payment provider</li>
                          <li>Use "Test Connection" to verify your credentials work</li>
                          <li>Toggle the switch to enable/disable each payment method</li>
                          <li>Only enabled payment methods will appear in the deposit dialog for users</li>
                        </ul>
                      </div>
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
