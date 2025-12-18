import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Gamepad2 } from "lucide-react";
import { SiPlaystation } from "react-icons/si";
import { Gamepad } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function GamerUsernameDialog() {
  const { user, updateGamerUsername } = useAuth();
  const { toast } = useToast();
  const [gamerUsername, setGamerUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsGamerUsername = user && !user.gamerUsername;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gamerUsername.trim() || gamerUsername.trim().length < 2) {
      toast({
        title: "Invalid Username",
        description: "Please enter a valid gamer username (at least 2 characters)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateGamerUsername(gamerUsername.trim());
      toast({
        title: "Welcome!",
        description: "Your gamer username has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save gamer username. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!needsGamerUsername) {
    return null;
  }

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Set Your Gamer Username
          </DialogTitle>
          <DialogDescription>
            Enter your PlayStation (PSN) or Xbox Gamertag so other players can find and challenge you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <SiPlaystation className="h-6 w-6" />
              <span className="text-sm">PSN</span>
            </div>
            <span className="text-muted-foreground">or</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Gamepad className="h-6 w-6" />
              <span className="text-sm">Xbox</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gamerUsername">Gamer Username</Label>
            <Input
              id="gamerUsername"
              data-testid="input-gamer-username"
              placeholder="Enter your PSN ID or Xbox Gamertag"
              value={gamerUsername}
              onChange={(e) => setGamerUsername(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This will be displayed to other players when you create or join matches.
            </p>
          </div>

          <Button
            type="submit"
            data-testid="button-save-gamer-username"
            className="w-full"
            disabled={isSubmitting || !gamerUsername.trim()}
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
