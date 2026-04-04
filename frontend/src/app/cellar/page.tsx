"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WineCard } from "@/components/wine/WineCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cellarApi } from "@/lib/api";
import type { WineColor } from "@/types";

const COLORS: WineColor[] = ["red", "white", "rosé", "sparkling", "dessert", "orange", "yellow"];

export default function CellarPage() {
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState<string>("all");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["cellar"],
    queryFn: cellarApi.list,
  });

  const filtered = entries.filter((e) => {
    const wine = e.wine;
    if (!wine) return false;
    const matchesSearch =
      !search ||
      wine.name.toLowerCase().includes(search.toLowerCase()) ||
      wine.producer.toLowerCase().includes(search.toLowerCase());
    const matchesColor = colorFilter === "all" || wine.color === colorFilter;
    return matchesSearch && matchesColor;
  });

  return (
    <div className="px-4 pt-6 space-y-4">
      <header>
        <h1 className="font-serif text-3xl font-bold text-cream">Cellar</h1>
        <p className="text-cream/50 text-sm mt-0.5">
          {entries.reduce((sum, e) => sum + e.quantity, 0)} bottles
        </p>
      </header>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/30"
            size={16}
          />
          <Input
            placeholder="Search wines…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-wood border-burgundy/30 text-cream placeholder:text-cream/30"
          />
        </div>
        <Select
          value={colorFilter}
          onValueChange={(value) => setColorFilter(value ?? "all")}
        >
          <SelectTrigger className="w-28 bg-wood border-burgundy/30 text-cream">
            <SlidersHorizontal size={14} className="mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-wood border-burgundy/30">
            <SelectItem value="all" className="text-cream">
              All
            </SelectItem>
            {COLORS.map((c) => (
              <SelectItem key={c} value={c} className="text-cream capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl bg-wood" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-cream/40">
          <p className="font-serif italic text-lg">No wines found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-4">
          {filtered.map((entry) => (
            <WineCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
