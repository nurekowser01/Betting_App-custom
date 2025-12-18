import { useQuery } from "@tanstack/react-query";
import { Gamepad2, Shield, Lock, Trophy, Link2, Eye, Wallet, HelpCircle, MessageSquare, Phone, FileQuestion, type LucideIcon } from "lucide-react";
import { SiPlaystation } from "react-icons/si";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  displayOrder: number;
  isVisible: number;
}

const ICON_MAP: Record<string, LucideIcon> = {
  link: Link2,
  gamepad: Gamepad2,
  wallet: Wallet,
  help: HelpCircle,
  message: MessageSquare,
  phone: Phone,
  faq: FileQuestion,
  shield: Shield,
  eye: Eye,
};

export function Footer() {
  const { data: quickLinks = [], isLoading } = useQuery<QuickLink[]>({
    queryKey: ["/api/public/quick-links"],
  });

  const visibleLinks = quickLinks.filter(link => link.isVisible === 1);
  const halfLength = Math.ceil(visibleLinks.length / 2);
  const firstColumnLinks = visibleLinks.slice(0, halfLength);
  const secondColumnLinks = visibleLinks.slice(halfLength);

  const renderLink = (link: QuickLink) => {
    const IconComponent = ICON_MAP[link.icon] || Link2;
    const isExternal = link.url.startsWith("http");

    if (isExternal) {
      return (
        <li key={link.id}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover-elevate rounded px-1 -mx-1 flex items-center gap-2"
            data-testid={`footer-link-${link.id}`}
          >
            <IconComponent className="h-3 w-3" />
            {link.title}
          </a>
        </li>
      );
    }

    return (
      <li key={link.id}>
        <Link
          href={link.url}
          className="hover-elevate rounded px-1 -mx-1 flex items-center gap-2"
          data-testid={`footer-link-${link.id}`}
        >
          <IconComponent className="h-3 w-3" />
          {link.title}
        </Link>
      </li>
    );
  };

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
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-5 w-24" />
                ))}
              </div>
            ) : firstColumnLinks.length > 0 ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {firstColumnLinks.map(renderLink)}
              </ul>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/create-match" className="hover-elevate rounded px-1 -mx-1">Create Match</Link></li>
                <li><Link href="/matches" className="hover-elevate rounded px-1 -mx-1">Live Matches</Link></li>
                <li><Link href="/wallet" className="hover-elevate rounded px-1 -mx-1">My Wallet</Link></li>
              </ul>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-5 w-24" />
                ))}
              </div>
            ) : secondColumnLinks.length > 0 ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {secondColumnLinks.map(renderLink)}
              </ul>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="text-muted-foreground/60">Help Center</span></li>
                <li><span className="text-muted-foreground/60">Contact Us</span></li>
                <li><span className="text-muted-foreground/60">Dispute Resolution</span></li>
                <li><span className="text-muted-foreground/60">FAQs</span></li>
              </ul>
            )}
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
