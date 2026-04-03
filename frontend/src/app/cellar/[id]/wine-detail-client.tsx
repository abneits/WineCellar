"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { winesApi, cellarApi } from "@/lib/api";

export default function WineDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [consumeOpen, setConsumeOpen] = useState(false);
  const [consumeQty, setConsumeQty] = useState(1);
  const [occasion, setOccasion] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: wine, isLoading } = useQuery({
    queryKey: ["wines", id],
    queryFn: () => winesApi.get(id),
  });

  const { data: cellarEntries = [] } = useQuery({
    queryKey: ["cellar"],
    queryFn: cellarApi.list,
  });

  const cellarEntry = cellarEntries.find((e) => e.wine_id === id);

  const { mutate: consumeBottle, isPending: consuming } = useMutation({
    mutationFn: () =>
      cellarApi.consume(cellarEntry!.id, { quantity: consumeQty, occasion }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cellar"] });
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      setConsumeOpen(false);
      setConsumeQty(1);
      setOccasion("");
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const { mutate: deleteWine, isPending: deleting } = useMutation({
    mutationFn: () => winesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cellar"] });
      router.push("/cellar");
    },
    onError: (err: Error) => setActionError(err.message),
  });

  if (isLoading) {
    return (
      <div className="px-4 pt-4 space-y-4">
        <Skeleton className="h-64 rounded-xl bg-wood" />
        <Skeleton className="h-8 w-2/3 bg-wood" />
        <Skeleton className="h-4 w-1/2 bg-wood" />
      </div>
    );
  }

  if (!wine) return <div className="p-4 text-cream/50">Wine not found</div>;

  const foodPairings: string[] = Array.isArray(wine.food_pairings)
    ? wine.food_pairings
    : [];
  const currentYear = new Date().getFullYear();
  const isReady =
    wine.peak_maturity_start != null && currentYear >= wine.peak_maturity_start;

  return (
    <div className="pb-8">
      {/* Header image */}
      <div className="relative h-64 bg-wood-dark">
        {wine.has_image ? (
          <img
            src={winesApi.getImageUrl(id)}
            alt={wine.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-8xl opacity-10">🍷</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-wood-dark/90 to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 bg-wood/70 rounded-full p-2"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-cream" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 -mt-8 space-y-4">
        {actionError && (
          <div className="bg-red-900/30 border border-red-700/30 rounded-lg p-3 text-red-300 text-sm">
            {actionError}
          </div>
        )}
        <div>
          <h1 className="font-serif text-2xl font-bold text-cream">{wine.name}</h1>
          <p className="text-cream/60 text-sm">
            {wine.producer} {wine.vintage ? `· ${wine.vintage}` : ""}
          </p>
          <p className="text-cream/40 text-xs mt-1 capitalize">
            {wine.color} · {wine.appellation} · {wine.region}, {wine.country}
          </p>
        </div>

        {/* Maturity indicator */}
        {wine.peak_maturity_start != null && (
          <div
            className={`rounded-lg p-3 border text-sm ${
              isReady
                ? "bg-green-900/20 border-green-700/30 text-green-300"
                : "bg-amber-900/20 border-amber-700/30 text-amber-300"
            }`}
          >
            {isReady
              ? `✓ In drinking window (${wine.peak_maturity_start}–${wine.peak_maturity_end ?? "?"})`
              : `⏳ Ready from ${wine.peak_maturity_start}`}
          </div>
        )}

        {/* Description */}
        {wine.description && (
          <p className="text-cream/70 text-sm leading-relaxed">{wine.description}</p>
        )}

        {/* Food pairings */}
        {foodPairings.length > 0 && (
          <div>
            <h2 className="font-serif text-sm font-semibold text-gold mb-2">
              Food Pairings
            </h2>
            <div className="flex flex-wrap gap-2">
              {foodPairings.map((p, i) => (
                <span
                  key={i}
                  className="bg-wood-dark rounded-full px-3 py-1 text-xs text-cream/70 border border-burgundy/20"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cellar status + actions */}
        {cellarEntry && (
          <div className="bg-wood rounded-xl p-4 border border-burgundy/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-cream/60 text-sm">In cellar</span>
              <span className="text-gold font-bold text-lg">
                {cellarEntry.quantity} bottles
              </span>
            </div>
            {cellarEntry.location && (
              <p className="text-xs text-cream/40">
                Location: {cellarEntry.location}
              </p>
            )}
            <Button
              className="w-full bg-burgundy hover:bg-burgundy-600 text-cream"
              onClick={() => setConsumeOpen(true)}
              disabled={cellarEntry.quantity === 0}
            >
              Open a Bottle
            </Button>
          </div>
        )}

        {/* Delete */}
        <button
          onClick={() => {
            if (confirm("Delete this wine from your cellar?")) deleteWine();
          }}
          className="flex items-center gap-2 text-red-400/50 hover:text-red-400 text-sm w-full justify-center py-2"
          disabled={deleting}
        >
          <Trash2 size={14} />
          {deleting ? "Deleting…" : "Delete wine"}
        </button>
      </div>

      {/* Consume dialog */}
      <Dialog open={consumeOpen} onOpenChange={(open) => setConsumeOpen(open)}>
        <DialogContent className="bg-wood border-burgundy/30 text-cream max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-cream">
              Open a Bottle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-cream/60 text-xs">Quantity</Label>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => setConsumeQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full bg-wood-dark border border-burgundy/30 flex items-center justify-center text-cream hover:border-burgundy transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="text-xl font-bold text-cream w-8 text-center">
                  {consumeQty}
                </span>
                <button
                  onClick={() =>
                    setConsumeQty((q) =>
                      Math.min(cellarEntry?.quantity ?? 1, q + 1)
                    )
                  }
                  className="w-10 h-10 rounded-full bg-wood-dark border border-burgundy/30 flex items-center justify-center text-cream hover:border-burgundy transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div>
              <Label className="text-cream/60 text-xs">
                Occasion (optional)
              </Label>
              <Input
                placeholder="Dinner with friends…"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="mt-1 bg-wood-dark border-burgundy/30 text-cream placeholder:text-cream/30"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setConsumeOpen(false)}
              className="text-cream/50"
            >
              Cancel
            </Button>
            <Button
              className="bg-burgundy hover:bg-burgundy-600 text-cream"
              onClick={() => consumeBottle()}
              disabled={consuming}
            >
              {consuming ? "Opening…" : "Open"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
