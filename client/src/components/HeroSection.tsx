import { Button } from "@/components/ui/button";
import { Gamepad2, Eye } from "lucide-react";
import heroImage from "@assets/generated_images/playstation_gaming_setup_hero.png";

interface HeroSectionProps {
  onCreateMatch?: () => void;
  onBrowseFixtures?: () => void;
  totalBets?: number;
  activePlayers?: number;
}

export function HeroSection({ onCreateMatch, onBrowseFixtures, totalBets = 12847, activePlayers = 342 }: HeroSectionProps) {
  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
      
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Bet. Play. <span className="text-primary">Win.</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Challenge players to PlayStation matches, stake your claim, and win big. 
            Secure escrow protection ensures fair play.
          </p>

          <div className="flex flex-wrap items-center gap-6 mb-10">
            <div className="text-center">
              <p className="text-3xl font-bold text-white tabular-nums">{totalBets.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Bets Placed</p>
            </div>
            <div className="w-px h-12 bg-gray-600" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white tabular-nums">{activePlayers}</p>
              <p className="text-sm text-gray-400">Active Players</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button 
              size="lg" 
              onClick={onCreateMatch}
              className="text-base"
              data-testid="button-hero-create-match"
            >
              <Gamepad2 className="h-5 w-5 mr-2" />
              Create Match
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={onBrowseFixtures}
              className="text-base bg-white/10 border-white/20 text-white backdrop-blur-sm"
              data-testid="button-hero-browse"
            >
              <Eye className="h-5 w-5 mr-2" />
              Browse Fixtures
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
