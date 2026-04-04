"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/wine/StarRating";
import { tastingsApi } from "@/lib/api";
import type { PendingRating } from "@/types";

export function PendingRatingsModal() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const { data: pending = [] } = useQuery({
    queryKey: ["tastings", "pending"],
    queryFn: tastingsApi.pending,
  });

  const { mutate: submitRating, isPending } = useMutation({
    mutationFn: async (item: PendingRating) => {
      await tastingsApi.create({
        wine_id: item.wine_id,
        consumption_id: item.consumption_id,
        rating,
        comment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      if (currentIndex < pending.length - 1) {
        setCurrentIndex((i) => i + 1);
        setRating(0);
        setComment("");
      } else {
        setDismissed(true);
      }
    },
  });

  const open = pending.length > 0 && !dismissed;
  const current = pending[currentIndex];

  if (!open || !current) return null;

  return (
    <Dialog open={open} onOpenChange={() => setDismissed(true)}>
      <DialogContent className="bg-wood border-burgundy/30 text-cream max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-cream">
            Rate your wine
          </DialogTitle>
          <p className="text-xs text-cream/50">
            {currentIndex + 1} of {pending.length}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="font-serif font-semibold text-lg text-cream">
              {current.wine_name}
            </p>
            {current.vintage && (
              <p className="text-sm text-cream/60">{current.vintage}</p>
            )}
            {current.occasion && (
              <p className="text-xs text-cream/40 mt-1">Occasion: {current.occasion}</p>
            )}
          </div>

          <div className="flex justify-center">
            <StarRating value={rating} onChange={setRating} size={32} />
          </div>

          <Textarea
            placeholder="Tasting notes (optional)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="bg-wood-dark border-burgundy/30 text-cream placeholder:text-cream/30 resize-none"
            rows={3}
          />

          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 text-cream/50 hover:text-cream hover:bg-wood-dark"
              onClick={() => setDismissed(true)}
            >
              Skip all
            </Button>
            <Button
              className="flex-1 bg-burgundy hover:bg-burgundy-600 text-cream"
              disabled={rating === 0 || isPending}
              onClick={() => submitRating(current)}
            >
              {isPending ? "Saving…" : "Rate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
