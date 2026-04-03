"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiApi } from "@/lib/api";
import type { PairingRecommendation } from "@/types";

export default function PairingPage() {
  const [meal, setMeal] = useState("");
  const [results, setResults] = useState<PairingRecommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutate: getPairings, isPending } = useMutation({
    mutationFn: aiApi.pairing,
    onSuccess: (data) => setResults(data),
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="px-4 pt-6 space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-bold text-cream">
          Food Pairing
        </h1>
        <p className="text-cream/50 text-sm mt-0.5">
          Describe your meal and I&apos;ll recommend wines from your cellar
        </p>
      </header>

      <div className="space-y-3">
        <Textarea
          placeholder="e.g. Grilled lamb with rosemary, roasted vegetables…"
          value={meal}
          onChange={(e) => setMeal(e.target.value)}
          className="bg-wood border-burgundy/30 text-cream placeholder:text-cream/30 resize-none min-h-[100px]"
          rows={4}
        />
        <Button
          onClick={() => {
            setResults(null);
            setError(null);
            getPairings(meal);
          }}
          disabled={!meal.trim() || isPending}
          className="w-full bg-burgundy hover:bg-burgundy-600 text-cream gap-2"
          size="lg"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
              Thinking…
            </>
          ) : (
            <>
              <Send size={16} />
              Get Recommendations
            </>
          )}
        </Button>
        {error && (
          <div className="bg-red-900/30 border border-red-700/30 rounded-lg p-3 text-red-300 text-sm">
            {error} — Check that the backend is running and your cellar has wines.
          </div>
        )}
      </div>

      {results !== null && (
        <div className="space-y-3">
          <h2 className="font-serif text-lg text-cream">
            Recommended from your cellar
          </h2>
          {results.length === 0 ? (
            <div className="text-center py-8 text-cream/40">
              <Utensils className="mx-auto mb-2 opacity-30" size={32} />
              <p className="font-serif italic">No matches found in your cellar</p>
              <p className="text-sm mt-1">
                Try adding more wines or adjusting your description
              </p>
            </div>
          ) : (
            results.map((rec, i) => (
              <div
                key={i}
                className="bg-wood rounded-xl p-4 border border-burgundy/20 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif font-semibold text-cream">
                    {rec.wine_name}
                  </p>
                  <span className="text-xs text-gold flex-shrink-0">
                    {rec.serving_temp}
                  </span>
                </div>
                <p className="text-sm text-cream/70 leading-relaxed">
                  {rec.reason}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
