import { Wine, Package, DollarSign } from "lucide-react";
import type { CellarStats } from "@/types";

interface StatsCardsProps {
  stats: CellarStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-wood rounded-xl p-3 border border-burgundy/20">
        <Package className="text-gold mb-1" size={18} />
        <p className="text-2xl font-serif font-bold text-cream">{stats.total_bottles}</p>
        <p className="text-xs text-cream/60">Bottles</p>
      </div>
      <div className="bg-wood rounded-xl p-3 border border-burgundy/20">
        <Wine className="text-gold mb-1" size={18} />
        <p className="text-2xl font-serif font-bold text-cream">{stats.unique_wines}</p>
        <p className="text-xs text-cream/60">Wines</p>
      </div>
      <div className="bg-wood rounded-xl p-3 border border-burgundy/20">
        <DollarSign className="text-gold mb-1" size={18} />
        <p className="text-2xl font-serif font-bold text-cream">
          {stats.total_value > 0 ? `€${Math.round(stats.total_value).toLocaleString()}` : "—"}
        </p>
        <p className="text-xs text-cream/60">Est. Value</p>
      </div>
    </div>
  );
}
