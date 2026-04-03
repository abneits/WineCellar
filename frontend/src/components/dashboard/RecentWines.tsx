import Link from "next/link";
import { winesApi } from "@/lib/api";
import type { CellarEntry } from "@/types";

interface RecentWinesProps {
  entries: CellarEntry[];
}

const COLOR_DOT: Record<string, string> = {
  red: "bg-red-700",
  white: "bg-yellow-100",
  "rosé": "bg-pink-300",
  sparkling: "bg-blue-200",
  dessert: "bg-amber-400",
  orange: "bg-orange-400",
};

export function RecentWines({ entries }: RecentWinesProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-cream/40">
        <p className="font-serif italic">Your cellar is empty.</p>
        <p className="text-sm mt-1">Scan a bottle to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <Link
          key={entry.id}
          href={`/cellar/${entry.wine_id}`}
          className="flex items-center gap-3 bg-wood rounded-xl p-3 border border-burgundy/20 hover:border-burgundy/50 transition-colors"
        >
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-wood-dark flex-shrink-0">
            {entry.wine?.has_image ? (
              <img
                src={winesApi.getImageUrl(entry.wine_id, true)}
                alt={entry.wine?.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className={`w-3 h-3 rounded-full ${COLOR_DOT[entry.wine?.color ?? "red"]}`} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-serif font-semibold text-cream truncate">{entry.wine?.name}</p>
            <p className="text-xs text-cream/60 truncate">
              {entry.wine?.producer} {entry.wine?.vintage ? `· ${entry.wine.vintage}` : ""}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-medium text-gold">{entry.quantity}</p>
            <p className="text-xs text-cream/40">btl</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
