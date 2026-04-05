"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Clock, PenLine, Sparkles, CheckCircle, AlertTriangle } from "lucide-react";
import { winesApi } from "@/lib/api";
import type { PendingWine } from "@/types";

function PendingWineCard({
  wine,
  action,
}: {
  wine: PendingWine;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 bg-wood rounded-lg p-3 border border-burgundy/20">
      <div className="w-12 h-12 bg-wood-dark rounded-lg overflow-hidden shrink-0">
        {wine.has_image && wine.image_base64 ? (
          <img
            src={`data:image/jpeg;base64,${wine.image_base64}`}
            alt="Bottle"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xl opacity-20">🍷</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-cream text-xs font-medium truncate">
          {wine.name || "Unidentified bottle"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-cream/40 text-[10px]">
            {new Date(wine.created_at).toLocaleDateString()}
          </p>
          {wine.ai_confidence != null && (
            <p className="text-[10px] text-gold/70">
              ID {Math.round(wine.ai_confidence * 100)}%
            </p>
          )}
          {wine.enrichment_confidence != null && (
            <p className="text-[10px] text-gold/70">
              Enrich {Math.round(wine.enrichment_confidence * 100)}%
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="font-serif text-sm text-cream/60">
        {title} ({count})
      </h2>
    </div>
  );
}

export function PendingBottlesSection() {
  const { data: pendingWines = [] } = useQuery({
    queryKey: ["wines", "pending", "pending_recognition"],
    queryFn: () => winesApi.listPending("pending_recognition", 5),
  });

  const { data: needsReviewWines = [] } = useQuery({
    queryKey: ["wines", "pending", "needs_review"],
    queryFn: () => winesApi.listPending("needs_review", 20),
  });

  const { data: recognizedWines = [] } = useQuery({
    queryKey: ["wines", "pending", "recognized"],
    queryFn: () => winesApi.listPending("recognized", 20),
  });

  const { data: enrichedWines = [] } = useQuery({
    queryKey: ["wines", "pending", "enriched"],
    queryFn: () => winesApi.listPending("enriched", 20),
  });

  if (
    pendingWines.length === 0 &&
    needsReviewWines.length === 0 &&
    recognizedWines.length === 0 &&
    enrichedWines.length === 0
  )
    return null;

  return (
    <section className="space-y-4">
      {pendingWines.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            icon={<Clock size={14} className="text-cream/40" />}
            title="Awaiting Recognition"
            count={pendingWines.length}
          />
          {pendingWines.map((wine: PendingWine) => (
            <PendingWineCard
              key={wine.id}
              wine={wine}
              action={
                <Link
                  href={`/cellar/${wine.id}`}
                  className="flex items-center gap-1 text-gold text-xs font-medium shrink-0"
                >
                  <PenLine size={12} />
                  Fill
                </Link>
              }
            />
          ))}
        </div>
      )}

      {needsReviewWines.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            icon={<AlertTriangle size={14} className="text-orange-400" />}
            title="Needs Your Input"
            count={needsReviewWines.length}
          />
          {needsReviewWines.map((wine: PendingWine) => (
            <PendingWineCard
              key={wine.id}
              wine={wine}
              action={
                <Link
                  href={`/cellar/${wine.id}`}
                  className="flex items-center gap-1 text-orange-400 text-xs font-medium shrink-0"
                >
                  <AlertTriangle size={12} />
                  Review
                </Link>
              }
            />
          ))}
        </div>
      )}

      {recognizedWines.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            icon={<Sparkles size={14} className="text-cream/40" />}
            title="Waiting for Enrichment"
            count={recognizedWines.length}
          />
          {recognizedWines.map((wine: PendingWine) => (
            <PendingWineCard key={wine.id} wine={wine} />
          ))}
        </div>
      )}

      {enrichedWines.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            icon={<CheckCircle size={14} className="text-gold" />}
            title="Ready to Validate"
            count={enrichedWines.length}
          />
          {enrichedWines.map((wine: PendingWine) => (
            <PendingWineCard
              key={wine.id}
              wine={wine}
              action={
                <Link
                  href={`/cellar/${wine.id}`}
                  className="flex items-center gap-1 text-gold text-xs font-medium shrink-0"
                >
                  <CheckCircle size={12} />
                  Review
                </Link>
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
