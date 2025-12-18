import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Wallet, Bitcoin, ExternalLink, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EnabledPaymentMethod {
  type: 'binance_pay' | 'stripe' | 'coinbase';
  name: string;
}

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeposit?: (amount: number) => void;
  walletType?: 'personal' | 'spectator';
}

export function DepositDialog({ open, onOpenChange, onDeposit, walletType = 'personal' }: DepositDialogProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("stripe");
  const { toast } = useToast();

  // Fetch enabled payment methods
  const { data: enabledMethods = [] } = useQuery<EnabledPaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
    enabled: open,
  });

  // Set default payment method when methods load
  useEffect(() => {
    if (enabledMethods.length > 0 && !enabledMethods.find(m => m.type === paymentMethod)) {
      setPaymentMethod(enabledMethods[0].type);
    }
  }, [enabledMethods, paymentMethod]);

  const hasFiat = enabledMethods.some(m => m.type === 'stripe');
  const hasCrypto = enabledMethods.some(m => m.type === 'binance_pay' || m.type === 'coinbase');
  const hasAnyPaymentMethod = enabledMethods.length > 0;

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
      const isCrypto = paymentMethod === "binance_pay" || paymentMethod === "coinbase";
      if (isCrypto) {
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
        // Stripe / fiat deposit
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

          {!hasAnyPaymentMethod ? (
            <div className="p-4 rounded-md bg-muted text-center">
              <p className="text-sm text-muted-foreground">
                No payment methods are currently available. Please contact support.
              </p>
            </div>
          ) : (
            <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
              <TabsList className={`grid w-full ${enabledMethods.length === 1 ? 'grid-cols-1' : enabledMethods.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {enabledMethods.some(m => m.type === 'stripe') && (
                  <TabsTrigger value="stripe" className="flex items-center gap-2" data-testid="tab-stripe">
                    <CreditCard className="h-4 w-4" />
                    Card
                  </TabsTrigger>
                )}
                {enabledMethods.some(m => m.type === 'binance_pay') && (
                  <TabsTrigger value="binance_pay" className="flex items-center gap-2" data-testid="tab-binance">
                    <Bitcoin className="h-4 w-4" />
                    Binance Pay
                  </TabsTrigger>
                )}
                {enabledMethods.some(m => m.type === 'coinbase') && (
                  <TabsTrigger value="coinbase" className="flex items-center gap-2" data-testid="tab-coinbase">
                    <Bitcoin className="h-4 w-4" />
                    Coinbase
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="stripe" className="mt-4">
                <div className="p-4 rounded-md bg-muted space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Card Payment (Stripe)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Secure payment processing. Funds available instantly. Supports EUR and other currencies.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="binance_pay" className="mt-4">
                <div className="p-4 rounded-md bg-muted space-y-3">
                  <div className="flex items-center gap-2">
                    <Bitcoin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Binance Pay</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pay with USDT, BTC, ETH, or 50+ other cryptocurrencies. Converted to USD credits automatically.
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    Opens Binance Pay checkout
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="coinbase" className="mt-4">
                <div className="p-4 rounded-md bg-muted space-y-3">
                  <div className="flex items-center gap-2">
                    <Bitcoin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Coinbase Commerce</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pay with BTC, ETH, USDC and other major cryptocurrencies via Coinbase.
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    Opens Coinbase Commerce checkout
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <Button 
            className="w-full" 
            onClick={handleDeposit}
            disabled={!amount || parseFloat(amount) <= 0 || cryptoMutation.isPending || !hasAnyPaymentMethod}
            data-testid="button-confirm-deposit"
          >
            {cryptoMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Payment...
              </>
            ) : (
              <>
                {paymentMethod === "stripe" ? "Deposit" : "Pay with Crypto"} ${amount || '0.00'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
