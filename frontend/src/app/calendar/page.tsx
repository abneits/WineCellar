"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { cellarApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { MaturityEntry } from "@/types";

const STATUS_CONFIG = {
  ready: { dot: "bg-green-500", label: "Ready now", text: "text-green-400" },
  soon: { dot: "bg-amber-400", label: "Ready soon", text: "text-amber-400" },
  not_yet: { dot: "bg-red-500/60", label: "Not yet", text: "text-red-400/60" },
  unknown: { dot: "bg-cream/20", label: "Unknown", text: "text-cream/40" },
} as const;

export default function CalendarPage() {
  const { data: maturity = [], isLoading } = useQuery({
    queryKey: ["cellar", "maturity"],
    queryFn: cellarApi.maturity,
  });

  const grouped = maturity.reduce<Record<string, MaturityEntry[]>>(
    (acc, entry) => {
      const year = entry.peak_maturity_start
        ? String(entry.peak_maturity_start)
        : "Unknown";
      if (!acc[year]) acc[year] = [];
      acc[year].push(entry);
      return acc;
    },
    {}
  );

  const sortedYears = Object.keys(grouped).sort((a, b) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return Number(a) - Number(b);
  });

  return (
    <div className="px-4 pt-6 space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-bold text-cream">Maturity</h1>
        <p className="text-cream/50 text-sm mt-0.5">When to open your wines</p>
      </header>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-cream/60">
        {(["ready", "soon", "not_yet"] as const).map((key) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[key].dot}`} />
            {STATUS_CONFIG[key].label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-wood" />
          ))}
        </div>
      ) : maturity.length === 0 ? (
        <div className="text-center py-16 text-cream/40">
          <p className="font-serif italic text-lg">No maturity data available</p>
          <p className="text-sm mt-1">
            Add wines with peak maturity years to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-6 pb-4">
          {sortedYears.map((year) => (
            <section key={year}>
              <h2 className="font-serif text-xl text-gold mb-3">{year}</h2>
              <div className="space-y-2">
                {grouped[year].map((entry) => {
                  const cfg = STATUS_CONFIG[entry.status];
                  return (
                    <Link
                      key={entry.wine_id}
                      href={`/cellar/${entry.wine_id}`}
                      className="flex items-center gap-3 bg-wood rounded-xl p-3 border border-burgundy/20 hover:border-burgundy/50 transition-colors"
                    >
                      <span
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-serif font-semibold text-cream truncate">
                          {entry.wine_name}
                        </p>
                        <p className="text-xs text-cream/40">
                          {entry.vintage ? `${entry.vintage} · ` : ""}
                          {entry.peak_maturity_start}–
                          {entry.peak_maturity_end ?? "?"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-gold">
                          {entry.quantity}
                        </p>
                        <p className={`text-xs ${cfg.text}`}>{cfg.label}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
