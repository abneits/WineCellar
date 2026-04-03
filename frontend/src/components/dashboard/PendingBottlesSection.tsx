"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Clock, PenLine, CheckCircle } from "lucide-react";
import { winesApi } from "@/lib/api";
import type { PendingWine } from "@/types";

function PendingWineCard({ wine }: { wine: PendingWine }) {
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
        <p className="text-cream text-xs font-medium truncate">Unidentified bottle</p>
        <p className="text-cream/40 text-[10px]">
          {new Date(wine.created_at).toLocaleDateString()}
        </p>
      </div>
      <Link
        href={`/wines/${wine.id}/edit`}
        className="flex items-center gap-1 text-gold text-xs font-medium shrink-0"
      >
        <PenLine size={12} />
        Fill
      </Link>
    </div>
  );
}

export function PendingBottlesSection() {
  const { data: pendingWines = [] } = useQuery({
    queryKey: ["wines", "pending", "pending_recognition"],
    queryFn: () => winesApi.listPending("pending_recognition", 5),
  });

  const { data: recognizedWines = [] } = useQuery({
    queryKey: ["wines", "pending", "recognized"],
    queryFn: () => winesApi.listPending("recognized", 20),
  });

  const { data: enrichedWines = [] } = useQuery({
    queryKey: ["wines", "pending", "enriched"],
    queryFn: () => winesApi.listPending("enriched", 20),
  });

  const needsValidation = recognizedWines.length + enrichedWines.length;

  if (pendingWines.length === 0 && needsValidation === 0) return null;

  return (
    <section className="space-y-3">
      {needsValidation > 0 && (
        <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-gold shrink-0" />
          <div className="flex-1">
            <p className="text-cream text-sm font-medium">
              {needsValidation} bottle{needsValidation > 1 ? "s" : ""} ready to validate
            </p>
            <p className="text-cream/50 text-xs">AI has finished identifying your wines</p>
          </div>
          <Link
            href="/cellar"
            className="text-gold text-xs font-medium underline shrink-0"
          >
            Review
          </Link>
        </div>
      )}

      {pendingWines.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-cream/40" />
            <h2 className="font-serif text-sm text-cream/60">
              Awaiting Recognition ({pendingWines.length})
            </h2>
          </div>
          <div className="space-y-2">
            {pendingWines.map((wine: PendingWine) => (
              <PendingWineCard key={wine.id} wine={wine} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
