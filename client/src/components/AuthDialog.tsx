import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Gamepad2, Loader2, Info } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (tab === "login") {
        await login(username, password);
        toast({ title: "Welcome back!", description: "You have been logged in." });
      } else {
        await register(username, password);
        toast({ title: "Account created!", description: "You can now start betting." });
      }
      onOpenChange(false);
      setUsername("");
      setPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setTab(value as "login" | "register");
    setUsername("");
    setPassword("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <Gamepad2 className="h-6 w-6 text-primary" />
            GameStake
          </DialogTitle>
          <DialogDescription className="text-center">
            {tab === "login" ? "Sign in to your account" : "Create a new account to start betting"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
            <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-google-login"
          >
            <SiGoogle className="h-4 w-4 mr-2" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with username
              </span>
            </div>
          </div>
        </div>

        {tab === "register" && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-sm">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-muted-foreground">
              We recommend using your PlayStation (PSN) or Xbox (Gamertag) username for easy identification during matches.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={tab === "login" ? "Enter your username" : "e.g. YourPSN_ID or Gamertag"}
              data-testid="input-username"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === "login" ? "Enter your password" : "Create a password"}
              data-testid="input-password"
              autoComplete={tab === "login" ? "current-password" : "new-password"}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-auth-submit">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tab === "login" ? "Login" : "Create Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
