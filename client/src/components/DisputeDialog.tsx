import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Match } from "@/lib/types";

interface DisputeDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DisputeDialog({ match, open, onOpenChange }: DisputeDialogProps) {
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const { toast } = useToast();

  const disputeMutation = useMutation({
    mutationFn: async () => {
      if (!match) throw new Error("No match selected");
      const res = await apiRequest("POST", `/api/matches/${match.id}/dispute`, {
        reason,
        evidence: evidence || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Dispute Raised",
        description: "Your dispute has been submitted for admin review.",
      });
      setReason("");
      setEvidence("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to raise dispute",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.length < 10) {
      toast({
        title: "Invalid reason",
        description: "Please provide a detailed reason (at least 10 characters)",
        variant: "destructive",
      });
      return;
    }
    disputeMutation.mutate();
  };

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Raise Dispute
          </DialogTitle>
          <DialogDescription>
            Contest the result of this match. An admin will review your dispute.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-md bg-muted/50">
            <p className="text-sm text-muted-foreground">Match</p>
            <p className="font-medium">{match.game}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {match.player1?.username} vs {match.player2?.username}
            </p>
            <p className="text-sm font-medium text-primary mt-1">${match.betAmount} stake</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Dispute *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why you're disputing this match result..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-dispute-reason"
            />
            <p className="text-xs text-muted-foreground">Minimum 10 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence">Evidence (Optional)</Label>
            <Textarea
              id="evidence"
              placeholder="Provide any evidence or links to screenshots/videos..."
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              className="min-h-[80px]"
              data-testid="input-dispute-evidence"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={disputeMutation.isPending || reason.length < 10}
              data-testid="button-submit-dispute"
            >
              {disputeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Dispute"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
