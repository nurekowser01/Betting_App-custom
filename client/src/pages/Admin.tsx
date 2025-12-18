import { useState, useEffect } from "react";
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
import { Shield, Check, X, ArrowLeft, Users, Gamepad2, Clock, Eye, DollarSign, Settings, Zap, CheckCircle, XCircle, Loader2, Ban, Trash2, UserCheck, AlertTriangle, Link2, GripVertical, Plus, Wallet, HelpCircle, MessageSquare, Phone, FileQuestion } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface DisputedMatch extends Match {
  disputeRaisedBy?: { id: string; username: string } | null;
}

interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  displayOrder: number;
  isVisible: number;
}

const ICON_OPTIONS = [
  { value: "link", label: "Link", icon: Link2 },
  { value: "gamepad", label: "Games", icon: Gamepad2 },
  { value: "wallet", label: "Wallet", icon: Wallet },
  { value: "help", label: "How It Works", icon: HelpCircle },
  { value: "message", label: "Support", icon: MessageSquare },
  { value: "phone", label: "Contact", icon: Phone },
  { value: "faq", label: "FAQ", icon: FileQuestion },
  { value: "shield", label: "Dispute", icon: Shield },
  { value: "eye", label: "Live", icon: Eye },
];

function SortableQuickLink({ 
  link, 
  onSave, 
  onDelete,
  isPending 
}: { 
  link: QuickLink; 
  onSave: (id: string, data: Partial<QuickLink>) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const [localTitle, setLocalTitle] = useState(link.title);
  const [localUrl, setLocalUrl] = useState(link.url);

  useEffect(() => {
    setLocalTitle(link.title);
    setLocalUrl(link.url);
  }, [link.title, link.url]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = ICON_OPTIONS.find(i => i.value === link.icon)?.icon || Link2;

  const handleTitleBlur = () => {
    if (localTitle !== link.title) {
      onSave(link.id, { title: localTitle });
    }
  };

  const handleUrlBlur = () => {
    if (localUrl !== link.url) {
      onSave(link.id, { url: localUrl });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-md bg-card"
      data-testid={`sortable-link-${link.id}`}
    >
      <button
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-${link.id}`}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
        <Input
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Title"
          className="md:col-span-1"
          data-testid={`input-link-title-${link.id}`}
        />
        <Input
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="URL (e.g., /matches or https://...)"
          className="md:col-span-2"
          data-testid={`input-link-url-${link.id}`}
        />
        <Select
          value={link.icon}
          onValueChange={(value) => onSave(link.id, { icon: value })}
        >
          <SelectTrigger data-testid={`select-icon-${link.id}`}>
            <div className="flex items-center gap-2">
              <IconComponent className="h-4 w-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {ICON_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={link.isVisible === 1}
          onCheckedChange={(checked) => onSave(link.id, { isVisible: checked ? 1 : 0 })}
          data-testid={`switch-visible-${link.id}`}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(link.id)}
          disabled={isPending}
          data-testid={`button-delete-${link.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
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

  const { data: disputedMatches = [], isLoading: disputedLoading } = useQuery<DisputedMatch[]>({
    queryKey: ["/api/admin/matches/disputed"],
    enabled: user?.isAdmin !== undefined && user.isAdmin >= 1,
  });

  const { data: quickLinks = [], isLoading: quickLinksLoading } = useQuery<QuickLink[]>({
    queryKey: ["/api/admin/quick-links"],
    enabled: user?.isAdmin !== undefined && user.isAdmin >= 1,
  });

  const [disputeResolutions, setDisputeResolutions] = useState<Record<string, { winnerId: string; resolution: string }>>({});
  const [localQuickLinks, setLocalQuickLinks] = useState<QuickLink[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  useEffect(() => {
    if (quickLinks.length > 0 || !quickLinksLoading) {
      setLocalQuickLinks(quickLinks);
    }
  }, [quickLinks, quickLinksLoading]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const createQuickLinkMutation = useMutation({
    mutationFn: async (data: { title: string; url: string }) => {
      const res = await apiRequest("POST", "/api/admin/quick-links", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/quick-links"] });
      setNewLinkTitle("");
      setNewLinkUrl("");
      toast({ title: "Quick link created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create quick link", variant: "destructive" });
    },
  });

  const updateQuickLinkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<QuickLink> }) => {
      const res = await apiRequest("PATCH", `/api/admin/quick-links/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/quick-links"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update quick link", variant: "destructive" });
    },
  });

  const deleteQuickLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/quick-links/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/quick-links"] });
      toast({ title: "Quick link deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete quick link", variant: "destructive" });
    },
  });

  const reorderQuickLinksMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await apiRequest("PATCH", "/api/admin/quick-links/reorder", { orderedIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/quick-links"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reorder quick links", variant: "destructive" });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localQuickLinks.findIndex((link) => link.id === active.id);
      const newIndex = localQuickLinks.findIndex((link) => link.id === over.id);
      const newOrder = arrayMove(localQuickLinks, oldIndex, newIndex);
      setLocalQuickLinks(newOrder);
      reorderQuickLinksMutation.mutate(newOrder.map(l => l.id));
    }
  };

  const handleUpdateQuickLink = (id: string, data: Partial<QuickLink>) => {
    updateQuickLinkMutation.mutate({ id, data });
  };

  const handleCreateQuickLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      toast({ title: "Error", description: "Title and URL are required", variant: "destructive" });
      return;
    }
    createQuickLinkMutation.mutate({ title: newLinkTitle.trim(), url: newLinkUrl.trim() });
  };

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

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ matchId, winnerId, resolution }: { matchId: string; winnerId: string; resolution: string }) => {
      const res = await apiRequest("POST", `/api/admin/matches/${matchId}/resolve-dispute`, { winnerId, resolution });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/matches/disputed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      setDisputeResolutions((prev) => {
        const updated = { ...prev };
        delete updated[variables.matchId];
        return updated;
      });
      toast({ title: "Dispute Resolved", description: "The dispute has been resolved and funds transferred." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to resolve dispute", variant: "destructive" });
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
            <TabsTrigger value="disputes" className="gap-2" data-testid="tab-disputes">
              <AlertTriangle className="h-4 w-4" />
              Disputes ({disputedMatches.length})
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
            <TabsTrigger value="quick-links" className="gap-2" data-testid="tab-quick-links">
              <Link2 className="h-4 w-4" />
              Quick Links
            </TabsTrigger>
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

          <TabsContent value="disputes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Disputed Matches
                  {disputedMatches.length > 0 && (
                    <Badge variant="destructive">{disputedMatches.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {disputedLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : disputedMatches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No disputed matches
                  </div>
                ) : (
                  <div className="space-y-6">
                    {disputedMatches.map((match) => {
                      const resolution = disputeResolutions[match.id] || { winnerId: '', resolution: '' };
                      
                      return (
                        <div
                          key={match.id}
                          data-testid={`card-disputed-match-${match.id}`}
                          className="p-4 border rounded-md bg-destructive/5 border-destructive/20"
                        >
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                  <span className="font-medium">{match.game}</span>
                                  <Badge variant="destructive">Disputed</Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {match.player1?.username} vs {match.player2?.username}
                                </div>
                                <div className="text-sm">
                                  Bet: <span className="font-medium">${match.betAmount}</span> each (Total pot: ${parseFloat(match.betAmount) * 2})
                                </div>
                                {match.disputeRaisedBy && (
                                  <div className="text-sm">
                                    Dispute raised by: <span className="font-medium text-destructive">{match.disputeRaisedBy.username}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="p-3 rounded-md bg-muted/50">
                              <div className="text-sm font-medium mb-2">Dispute Reason:</div>
                              <p className="text-sm text-muted-foreground">{match.disputeReason || "No reason provided"}</p>
                              {match.disputeEvidence && (
                                <>
                                  <div className="text-sm font-medium mt-3 mb-2">Evidence:</div>
                                  <p className="text-sm text-muted-foreground">{match.disputeEvidence}</p>
                                </>
                              )}
                            </div>

                            <div className="space-y-3 pt-3 border-t">
                              <div className="text-sm font-medium">Resolve Dispute:</div>
                              
                              <div className="flex flex-wrap gap-2">
                                <Label className="text-sm text-muted-foreground">Select Winner:</Label>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant={resolution.winnerId === match.player1Id ? "default" : "outline"}
                                    onClick={() => setDisputeResolutions(prev => ({
                                      ...prev,
                                      [match.id]: { ...resolution, winnerId: match.player1Id }
                                    }))}
                                    data-testid={`button-select-player1-${match.id}`}
                                  >
                                    {match.player1?.username}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={resolution.winnerId === match.player2Id ? "default" : "outline"}
                                    onClick={() => setDisputeResolutions(prev => ({
                                      ...prev,
                                      [match.id]: { ...resolution, winnerId: match.player2Id! }
                                    }))}
                                    data-testid={`button-select-player2-${match.id}`}
                                  >
                                    {match.player2?.username}
                                  </Button>
                                </div>
                              </div>

                              <div>
                                <Label className="text-sm text-muted-foreground">Resolution Explanation (required):</Label>
                                <Textarea
                                  placeholder="Explain the resolution decision..."
                                  value={resolution.resolution}
                                  onChange={(e) => setDisputeResolutions(prev => ({
                                    ...prev,
                                    [match.id]: { ...resolution, resolution: e.target.value }
                                  }))}
                                  className="mt-1"
                                  data-testid={`input-resolution-${match.id}`}
                                />
                              </div>

                              <Button
                                onClick={() => resolveDisputeMutation.mutate({
                                  matchId: match.id,
                                  winnerId: resolution.winnerId,
                                  resolution: resolution.resolution
                                })}
                                disabled={!resolution.winnerId || resolution.resolution.length < 10 || resolveDisputeMutation.isPending}
                                data-testid={`button-resolve-${match.id}`}
                              >
                                {resolveDisputeMutation.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Resolving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Resolve Dispute
                                  </>
                                )}
                              </Button>
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

          <TabsContent value="quick-links">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Quick Links Manager
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 border rounded-md bg-muted/30">
                    <h4 className="font-medium mb-3">Add New Quick Link</h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        placeholder="Link title (e.g., Create Match)"
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                        className="flex-1"
                        data-testid="input-new-link-title"
                      />
                      <Input
                        placeholder="URL (e.g., /create-match)"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        className="flex-1"
                        data-testid="input-new-link-url"
                      />
                      <Button
                        onClick={handleCreateQuickLink}
                        disabled={createQuickLinkMutation.isPending || !newLinkTitle.trim() || !newLinkUrl.trim()}
                        data-testid="button-add-quick-link"
                      >
                        {createQuickLinkMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Link
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {quickLinksLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : localQuickLinks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No quick links yet.</p>
                      <p className="text-sm mt-1">Add your first quick link above!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Manage Links</h4>
                        <p className="text-sm text-muted-foreground">Drag to reorder, toggle visibility</p>
                      </div>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={localQuickLinks.map(l => l.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {localQuickLinks.map((link) => (
                              <SortableQuickLink
                                key={link.id}
                                link={link}
                                onSave={handleUpdateQuickLink}
                                onDelete={(id) => deleteQuickLinkMutation.mutate(id)}
                                isPending={deleteQuickLinkMutation.isPending || updateQuickLinkMutation.isPending}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}

                  <div className="p-4 border rounded-md bg-accent/20">
                    <h4 className="font-medium mb-2">How it works</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Add quick links that appear in the navigation and footer</li>
                      <li>Drag the handle to reorder links</li>
                      <li>Toggle visibility to show/hide links without deleting them</li>
                      <li>Choose an icon that represents each link</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
