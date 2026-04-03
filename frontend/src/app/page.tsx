"use client";

import { useQuery } from "@tanstack/react-query";
import { cellarApi } from "@/lib/api";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentWines } from "@/components/dashboard/RecentWines";
import { PendingRatingsModal } from "@/components/dashboard/PendingRatingsModal";
import { PendingBottlesSection } from "@/components/dashboard/PendingBottlesSection";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["cellar", "stats"],
    queryFn: cellarApi.stats,
  });

  const { data: recent = [], isLoading: recentLoading } = useQuery({
    queryKey: ["cellar", "recent"],
    queryFn: cellarApi.recent,
  });

  return (
    <div className="px-4 pt-6 space-y-6">
      <PendingRatingsModal />

      <header>
        <h1 className="font-serif text-3xl font-bold text-cream">My Cellar</h1>
        <p className="text-cream/50 text-sm mt-0.5">Welcome back</p>
      </header>

      {statsLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-wood" />
          ))}
        </div>
      ) : stats ? (
        <StatsCards stats={stats} />
      ) : null}

      <PendingBottlesSection />

      <section>
        <h2 className="font-serif text-lg text-cream mb-3">Recently Added</h2>
        {recentLoading ? (
          <div className="space-y-2">
            {[0, 1, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl bg-wood" />
            ))}
          </div>
        ) : (
          <RecentWines entries={recent} />
        )}
      </section>
    </div>
  );
}
