import Link from "next/link";
import { winesApi } from "@/lib/api";
import type { CellarEntry, WineStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

const COLOR_BADGE: Record<string, string> = {
  red: "bg-red-900/50 text-red-200 border-red-700/30",
  white: "bg-yellow-900/50 text-yellow-200 border-yellow-700/30",
  "rosé": "bg-pink-900/50 text-pink-200 border-pink-700/30",
  sparkling: "bg-blue-900/50 text-blue-200 border-blue-700/30",
  dessert: "bg-amber-900/50 text-amber-200 border-amber-700/30",
  orange: "bg-orange-900/50 text-orange-200 border-orange-700/30",
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
      <div className="bg-wood rounded-xl border border-burgundy/20 hover:border-burgundy/60 transition-all active:scale-[0.98] overflow-hidden">
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
          <Badge
            className={`mt-2 text-[10px] capitalize border ${COLOR_BADGE[wine.color] ?? COLOR_BADGE.red}`}
            variant="outline"
          >
            {wine.color}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
