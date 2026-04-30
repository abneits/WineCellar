"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiApi } from "@/lib/api";
import type { PairingRecommendation } from "@/types";

export function PairingWidget() {
  const [meal, setMeal] = useState("");
  const [results, setResults] = useState<PairingRecommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutate: getPairings, isPending } = useMutation({
    mutationFn: aiApi.pairing,
    onSuccess: (data) => setResults(data),
    onError: (err: Error) => setError(err.message),
  });

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-lg text-cream">Food Pairing</h2>

      <div className="space-y-2">
        <Textarea
          placeholder="Describe your meal and I'll recommend wines from your cellar…"
          value={meal}
          onChange={(e) => setMeal(e.target.value)}
          className="bg-wood border-burgundy/30 text-cream placeholder:text-cream/30 resize-none min-h-[80px]"
          rows={3}
        />
        <Button
          onClick={() => {
            setResults(null);
            setError(null);
            getPairings(meal);
          }}
          disabled={!meal.trim() || isPending}
          className="w-full bg-burgundy hover:bg-burgundy/80 text-cream gap-2"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
              Thinking…
            </>
          ) : (
            <>
              <Send size={15} />
              Get Recommendations
            </>
          )}
        </Button>

        {error && (
          <div className="bg-red-900/30 border border-red-700/30 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>

      {results !== null && (
        <div className="space-y-2">
          {results.length === 0 ? (
            <div className="text-center py-6 text-cream/40">
              <Utensils className="mx-auto mb-2 opacity-30" size={28} />
              <p className="font-serif italic text-sm">No matches found in your cellar</p>
            </div>
          ) : (
            results.map((rec, i) => (
              <div
                key={i}
                className="bg-wood rounded-xl p-3 border border-burgundy/20 space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif font-semibold text-cream text-sm">
                    {rec.wine_name}
                  </p>
                  <span className="text-xs text-gold flex-shrink-0">{rec.serving_temp}</span>
                </div>
                <p className="text-xs text-cream/60 leading-relaxed">{rec.reason}</p>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
