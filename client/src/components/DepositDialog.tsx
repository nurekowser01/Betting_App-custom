import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Wallet } from "lucide-react";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeposit?: (amount: number) => void;
  walletType?: 'personal' | 'spectator';
}

export function DepositDialog({ open, onOpenChange, onDeposit, walletType = 'personal' }: DepositDialogProps) {
  const [amount, setAmount] = useState("");

  const handleDeposit = () => {
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      onDeposit?.(numAmount);
      onOpenChange(false);
      setAmount("");
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

          <div className="p-4 rounded-md bg-muted space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Payment Method</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Secure payment processing. Funds available instantly.
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleDeposit}
            disabled={!amount || parseFloat(amount) <= 0}
            data-testid="button-confirm-deposit"
          >
            Deposit ${amount || '0.00'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
