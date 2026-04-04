import Link from "next/link";
import { winesApi } from "@/lib/api";
import type { CellarEntry, WineStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

const COLOR_BADGE: Record<string, string> = {
  red:      "bg-red-900/60 text-red-300 border-red-600/40",
  white:    "bg-stone-600/40 text-stone-200 border-stone-400/30",
  "rosé":   "bg-pink-800/50 text-pink-300 border-pink-500/40",
  sparkling:"bg-sky-900/50 text-sky-200 border-sky-600/30",
  dessert:  "bg-amber-800/50 text-amber-200 border-amber-500/40",
  orange:   "bg-orange-800/50 text-orange-300 border-orange-500/40",
  yellow:   "bg-yellow-700/50 text-yellow-200 border-yellow-500/40",
};

const STATUS_BADGE: Partial<Record<WineStatus, { label: string; className: string }>> = {
  pending_recognition: {
    label: "Pending",
    className: "bg-yellow-900/40 text-yellow-300 border-yellow-600/30",
  },
  recognized: {
    label: "Validate",
    className: "bg-emerald-900/40 text-emerald-300 border-emerald-600/30",
  },
  enriched: {
    label: "Validate",
    className: "bg-emerald-900/40 text-emerald-300 border-emerald-600/30",
  },
  failed: {
    label: "Failed",
    className: "bg-red-900/40 text-red-300 border-red-600/30",
  },
};

interface WineCardProps {
  entry: CellarEntry;
}

export function WineCard({ entry }: WineCardProps) {
  const wine = entry.wine!;
  const statusBadge = STATUS_BADGE[wine.status];

  return (
    <Link href={`/cellar/${wine.id}`}>
      <div className={`bg-wood rounded-xl border border-burgundy/20 hover:border-burgundy/60 transition-all active:scale-[0.98] overflow-hidden${entry.quantity === 0 ? " opacity-50" : ""}`}>
        <div className="aspect-[3/4] bg-wood-dark relative">
          {wine.has_image ? (
            <img
              src={winesApi.getImageUrl(wine.id, true)}
              alt={wine.name || "Unidentified bottle"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-20">🍷</span>
            </div>
          )}
          <div className="absolute top-2 right-2 bg-wood/80 rounded-full w-7 h-7 flex items-center justify-center">
            <span className="text-xs font-bold text-gold">{entry.quantity}</span>
          </div>
          {statusBadge && (
            <div className="absolute bottom-2 left-2">
              <Badge
                className={`text-[9px] border ${statusBadge.className}`}
                variant="outline"
              >
                {statusBadge.label}
              </Badge>
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="font-serif font-semibold text-cream text-sm leading-tight line-clamp-2">
            {wine.name || "Unidentified bottle"}
          </p>
          {wine.vintage && (
            <p className="text-xs text-cream/50 mt-0.5">{wine.vintage}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <Badge
              className={`text-[10px] capitalize border ${COLOR_BADGE[wine.color] ?? COLOR_BADGE.red}`}
              variant="outline"
            >
              {wine.color}
            </Badge>
            {entry.avg_rating != null && (
              <span className="text-[10px] text-gold">
                {"★".repeat(Math.round(entry.avg_rating))}{"☆".repeat(5 - Math.round(entry.avg_rating))}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
