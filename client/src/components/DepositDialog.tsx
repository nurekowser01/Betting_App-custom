import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Wallet, Bitcoin, ExternalLink, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeposit?: (amount: number) => void;
  walletType?: 'personal' | 'spectator';
}

export function DepositDialog({ open, onOpenChange, onDeposit, walletType = 'personal' }: DepositDialogProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"fiat" | "crypto">("fiat");
  const { toast } = useToast();

  const cryptoMutation = useMutation({
    mutationFn: async (usdAmount: number) => {
      const res = await apiRequest("POST", "/api/crypto/create-charge", { amount: usdAmount });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.hostedUrl) {
        window.open(data.hostedUrl, "_blank");
        toast({
          title: "Crypto Payment Created",
          description: "Complete the payment in the new window. Your balance will update once confirmed.",
        });
        onOpenChange(false);
        setAmount("");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create crypto payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeposit = () => {
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      if (paymentMethod === "crypto") {
        if (numAmount < 5) {
          toast({
            title: "Minimum Amount",
            description: "Crypto deposits require a minimum of $5",
            variant: "destructive",
          });
          return;
        }
        cryptoMutation.mutate(numAmount);
      } else {
        onDeposit?.(numAmount);
        onOpenChange(false);
        setAmount("");
      }
    }
  };

  const quickAmounts = [50, 100, 250, 500];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {walletType === 'personal' ? 'Deposit Funds' : 'Add Spectator Funds'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
                data-testid="input-deposit-amount"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {quickAmounts.map((amt) => (
              <Button
                key={amt}
                size="sm"
                variant={parseFloat(amount) === amt ? "default" : "outline"}
                onClick={() => setAmount(amt.toString())}
                data-testid={`button-quick-deposit-${amt}`}
              >
                ${amt}
              </Button>
            ))}
          </div>

          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "fiat" | "crypto")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fiat" className="flex items-center gap-2" data-testid="tab-fiat">
                <CreditCard className="h-4 w-4" />
                Card
              </TabsTrigger>
              <TabsTrigger value="crypto" className="flex items-center gap-2" data-testid="tab-crypto">
                <Bitcoin className="h-4 w-4" />
                Crypto
              </TabsTrigger>
            </TabsList>
            <TabsContent value="fiat" className="mt-4">
              <div className="p-4 rounded-md bg-muted space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Card Payment</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Secure payment processing. Funds available instantly.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="crypto" className="mt-4">
              <div className="p-4 rounded-md bg-muted space-y-3">
                <div className="flex items-center gap-2">
                  <Bitcoin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Cryptocurrency</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pay with USDT, BTC, ETH, or 50+ other cryptocurrencies via Binance Pay. Converted to USD credits automatically.
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
                  Opens Binance Pay checkout
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            className="w-full" 
            onClick={handleDeposit}
            disabled={!amount || parseFloat(amount) <= 0 || cryptoMutation.isPending}
            data-testid="button-confirm-deposit"
          >
            {cryptoMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Payment...
              </>
            ) : (
              <>
                {paymentMethod === "crypto" ? "Pay with Crypto" : "Deposit"} ${amount || '0.00'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
