import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, Gamepad2 } from "lucide-react";
import { PLAYSTATION_GAMES } from "@/lib/types";

interface CreateMatchDialogProps {
  onCreateMatch?: (game: string, betAmount: number) => void;
  maxBet?: number;
}

export function CreateMatchDialog({ onCreateMatch, maxBet = 1000 }: CreateMatchDialogProps) {
  const [open, setOpen] = useState(false);
  const [game, setGame] = useState("");
  const [betAmount, setBetAmount] = useState(50);

  const handleCreate = () => {
    if (game && betAmount > 0) {
      onCreateMatch?.(game, betAmount);
      setOpen(false);
      setGame("");
      setBetAmount(50);
    }
  };

  const quickBets = [25, 50, 100, 250];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-match">
          <Plus className="h-4 w-4 mr-2" />
          Create Match
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Create New Match
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="game">Select Game</Label>
            <Select value={game} onValueChange={setGame}>
              <SelectTrigger data-testid="select-game">
                <SelectValue placeholder="Choose a PlayStation game" />
              </SelectTrigger>
              <SelectContent>
                {PLAYSTATION_GAMES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Bet Amount</Label>
              <span className="text-2xl font-bold text-primary" data-testid="text-bet-preview">
                ${betAmount}
              </span>
            </div>
            <Slider
              value={[betAmount]}
              onValueChange={(v) => setBetAmount(v[0])}
              min={10}
              max={maxBet}
              step={5}
              data-testid="slider-bet-amount"
            />
            <div className="flex gap-2 flex-wrap">
              {quickBets.map((amount) => (
                <Button
                  key={amount}
                  size="sm"
                  variant={betAmount === amount ? "default" : "outline"}
                  onClick={() => setBetAmount(amount)}
                  data-testid={`button-quick-bet-${amount}`}
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleCreate}
            disabled={!game}
            data-testid="button-confirm-create"
          >
            Create Match for ${betAmount}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
