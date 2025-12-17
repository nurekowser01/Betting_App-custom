import { MatchCard } from "./MatchCard";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import type { Match } from "@/lib/types";

interface LiveMatchesListProps {
  matches: Match[];
  onSpectate?: (matchId: string) => void;
}

export function LiveMatchesList({ matches, onSpectate }: LiveMatchesListProps) {
  const liveMatches = matches.filter(m => m.status === 'live');
  const totalSpectators = liveMatches.reduce((sum, m) => sum + m.spectatorCount, 0);

  return (
    <section className="py-12" data-testid="section-live-matches">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Live Matches</h2>
          <Badge variant="destructive" className="text-xs">
            <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse" />
            {liveMatches.length} Live
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span className="text-sm">{totalSpectators} spectators watching</span>
        </div>
      </div>

      {liveMatches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No live matches right now</p>
          <p className="text-sm">Create a match or check back soon</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {liveMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onSpectate={() => onSpectate?.(match.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
