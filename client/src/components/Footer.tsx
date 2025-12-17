import { Gamepad2, Shield, Lock, Trophy } from "lucide-react";
import { SiPlaystation } from "react-icons/si";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">GameStake</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The premier PlayStation gaming betting platform with secure escrow and fair play.
            </p>
            <div className="flex items-center gap-3">
              <SiPlaystation className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover-elevate rounded px-1 -mx-1">Create Match</a></li>
              <li><a href="#" className="hover-elevate rounded px-1 -mx-1">Live Matches</a></li>
              <li><a href="#" className="hover-elevate rounded px-1 -mx-1">My Wallet</a></li>
              <li><a href="#" className="hover-elevate rounded px-1 -mx-1">How It Works</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover-elevate rounded px-1 -mx-1">Help Center</a></li>
              <li><a href="#" className="hover-elevate rounded px-1 -mx-1">Contact Us</a></li>
              <li><a href="#" className="hover-elevate rounded px-1 -mx-1">Dispute Resolution</a></li>
              <li><a href="#" className="hover-elevate rounded px-1 -mx-1">FAQs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Trust & Security</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-chart-3" />
                <span>Secure Escrow System</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 text-chart-1" />
                <span>Encrypted Transactions</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4 text-chart-4" />
                <span>Fair Play Guaranteed</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>2024 GameStake. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover-elevate rounded px-1 -mx-1">Terms of Service</a>
            <a href="#" className="hover-elevate rounded px-1 -mx-1">Privacy Policy</a>
            <a href="#" className="hover-elevate rounded px-1 -mx-1">Responsible Gaming</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
