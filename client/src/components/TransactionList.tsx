import { ArrowUpRight, ArrowDownLeft, Lock, Trophy, Gamepad2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/lib/types";

interface TransactionListProps {
  transactions: Transaction[];
}

const typeConfig = {
  deposit: { icon: ArrowDownLeft, color: "text-chart-3", label: "Deposit" },
  withdrawal: { icon: ArrowUpRight, color: "text-chart-5", label: "Withdrawal" },
  bet: { icon: Gamepad2, color: "text-chart-1", label: "Bet" },
  winnings: { icon: Trophy, color: "text-chart-4", label: "Winnings" },
  escrow: { icon: Lock, color: "text-chart-2", label: "Escrow" },
  refund: { icon: RotateCcw, color: "text-chart-3", label: "Refund" },
};

export function TransactionList({ transactions }: TransactionListProps) {
  return (
    <div className="space-y-2" data-testid="list-transactions">
      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No transactions yet</p>
      ) : (
        transactions.map((tx) => {
          const config = typeConfig[tx.type];
          const Icon = config.icon;
          const isPositive = tx.type === 'deposit' || tx.type === 'winnings' || tx.type === 'refund';
          const date = new Date(tx.createdAt);

          return (
            <div
              key={tx.id}
              className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
              data-testid={`row-transaction-${tx.id}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md bg-background ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-bold tabular-nums ${isPositive ? 'text-chart-3' : ''}`}>
                  {isPositive ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
