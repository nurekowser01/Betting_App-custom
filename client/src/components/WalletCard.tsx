import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowUpRight, ArrowDownLeft, Lock, Eye } from "lucide-react";
import type { WalletType } from "@/lib/types";

interface WalletCardProps {
  type: WalletType;
  balance: number;
  onDeposit?: () => void;
  onWithdraw?: () => void;
}

const walletConfig = {
  personal: {
    title: "Personal Wallet",
    description: "Your available balance",
    icon: Wallet,
    color: "text-primary",
  },
  escrow: {
    title: "Escrow Wallet",
    description: "Funds locked in active matches",
    icon: Lock,
    color: "text-chart-4",
  },
  spectator: {
    title: "Spectator Wallet",
    description: "Balance for betting on matches",
    icon: Eye,
    color: "text-chart-2",
  },
};

export function WalletCard({ type, balance, onDeposit, onWithdraw }: WalletCardProps) {
  const config = walletConfig[type];
  const Icon = config.icon;

  return (
    <Card data-testid={`card-wallet-${type}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md bg-muted ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-medium">{config.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold tabular-nums" data-testid={`text-balance-${type}`}>
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          {type === 'personal' && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onDeposit} data-testid="button-deposit">
                <ArrowDownLeft className="h-4 w-4 mr-1" />
                Deposit
              </Button>
              <Button size="sm" variant="outline" onClick={onWithdraw} data-testid="button-withdraw">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Withdraw
              </Button>
            </div>
          )}
          {type === 'spectator' && (
            <Button size="sm" variant="outline" onClick={onDeposit} data-testid="button-add-funds">
              <ArrowDownLeft className="h-4 w-4 mr-1" />
              Add Funds
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
