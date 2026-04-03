"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Clock, PenLine } from "lucide-react";
import { ScanCapture } from "@/components/scan/ScanCapture";
import { WineForm } from "@/components/wine/WineForm";
import { winesApi, cellarApi } from "@/lib/api";
import type { Wine, ScanQueuedResponse } from "@/types";

type ScanState = "capture" | "queued" | "manual";

export default function ScanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [scanState, setScanState] = useState<ScanState>("capture");
  const [queuedResult, setQueuedResult] = useState<ScanQueuedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutate: scanBottle, isPending: scanning } = useMutation({
    mutationFn: winesApi.scan,
    onSuccess: (result) => {
      setQueuedResult(result);
      setScanState("queued");
      setError(null);
      // Invalidate pending wines query so dashboard updates
      queryClient.invalidateQueries({ queryKey: ["wines", "pending"] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const { mutate: saveWine, isPending: saving } = useMutation({
    mutationFn: async ({
      data,
      quantity,
      imageFile,
    }: {
      data: Partial<Wine>;
      quantity: number;
      imageFile?: File;
    }) => {
      let wine: Wine;
      if (imageFile) {
        wine = await winesApi.createWithImage(data, imageFile);
      } else {
        wine = await winesApi.create(data);
      }
      await cellarApi.add({ wine_id: wine.id, quantity, location: "" });
      return wine;
    },
    onSuccess: (wine) => {
      queryClient.invalidateQueries({ queryKey: ["cellar"] });
      router.push(`/cellar/${wine.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleCapture = (file: File) => {
    scanBottle(file);
  };

  const handleSubmit = (
    data: Partial<Wine>,
    quantity: number,
    imageFile?: File
  ) => {
    saveWine({ data, quantity, imageFile });
  };

  return (
    <div className="min-h-screen bg-wine-gradient">
      <header className="px-4 pt-6 pb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-cream">
          Scan Bottle
        </h1>
        <button
          onClick={() => router.back()}
          className="text-cream/50 hover:text-cream p-2"
        >
          <X size={20} />
        </button>
      </header>

      {error && (
        <div className="mx-4 mb-4 bg-red-900/30 border border-red-700/30 rounded-lg p-3 text-red-300 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {scanState === "capture" && (
        <ScanCapture onCapture={handleCapture} isLoading={scanning} />
      )}

      {scanState === "queued" && (
        <div className="px-4 space-y-6">
          <div className="bg-wood rounded-xl border border-burgundy/30 p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-burgundy/20 rounded-full flex items-center justify-center mx-auto">
              <Clock size={32} className="text-gold" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold text-cream mb-1">
                Bottle Saved!
              </h2>
              <p className="text-cream/60 text-sm leading-relaxed">
                Your bottle has been added to the queue. It will be identified
                overnight and ready for you tomorrow.
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-burgundy text-cream rounded-lg py-3 font-medium"
            >
              Back to Cellar
            </button>
          </div>

          <div className="bg-wood/50 rounded-xl border border-burgundy/20 p-4">
            <button
              onClick={() => setScanState("manual")}
              className="w-full flex items-center gap-3 text-left"
            >
              <div className="w-10 h-10 bg-wood rounded-lg flex items-center justify-center shrink-0">
                <PenLine size={18} className="text-gold" />
              </div>
              <div>
                <p className="text-cream text-sm font-medium">Fill in details now</p>
                <p className="text-cream/40 text-xs">
                  Know the wine? Add it manually instead.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {scanState === "manual" && (
        <div>
          <div className="px-4 mb-4 flex items-center justify-between">
            <p className="text-sm text-cream/60 font-serif italic">
              Fill in wine details
            </p>
            <button
              onClick={() => setScanState("queued")}
              className="text-xs text-cream/40 underline"
            >
              Cancel
            </button>
          </div>
          <WineForm
            initialData={{}}
            onSubmit={handleSubmit}
            isLoading={saving}
          />
        </div>
      )}
    </div>
  );
}
