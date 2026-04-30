"use client";

import { useQuery } from "@tanstack/react-query";
import { statsApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { StatsResponse } from "@/types";

const COLOR_MAP: Record<string, string> = {
  red: "#722F37",
  white: "#C9A84C",
  rosé: "#D4778A",
  sparkling: "#A8C5DA",
  dessert: "#8B6914",
  orange: "#C87941",
  yellow: "#E2C96E",
};

const PIE_FALLBACK_COLORS = [
  "#722F37", "#C9A84C", "#D4778A", "#A8C5DA", "#8B6914", "#C87941", "#E2C96E",
];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-wood rounded-xl p-4 border border-burgundy/20 flex flex-col gap-1">
      <p className="text-cream/50 text-xs uppercase tracking-widest">{label}</p>
      <p className="font-serif text-3xl font-bold text-cream">{value}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-xl text-gold mb-3">{children}</h2>
  );
}

function EmptyChart() {
  return (
    <p className="text-cream/30 text-sm italic text-center py-6">No data yet</p>
  );
}

function ColorPie({ data }: { data: StatsResponse["by_color"] }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.label}
              fill={COLOR_MAP[entry.label] ?? PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#3E2723", border: "1px solid #722F37", borderRadius: 8 }}
          labelStyle={{ color: "#FFF8E7" }}
          itemStyle={{ color: "#C9A84C" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function HorizontalBar({ data }: { data: { label: string; count: number }[] }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 80)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={90}
          tick={{ fill: "#FFF8E7", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{ background: "#3E2723", border: "1px solid #722F37", borderRadius: 8 }}
          labelStyle={{ color: "#FFF8E7" }}
          itemStyle={{ color: "#C9A84C" }}
          cursor={{ fill: "rgba(114,47,55,0.2)" }}
        />
        <Bar dataKey="count" fill="#722F37" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function VintageBar({ data }: { data: { label: string; count: number }[] }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: "#FFF8E7", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: "#3E2723", border: "1px solid #722F37", borderRadius: 8 }}
          labelStyle={{ color: "#FFF8E7" }}
          itemStyle={{ color: "#C9A84C" }}
          cursor={{ fill: "rgba(114,47,55,0.2)" }}
        />
        <Bar dataKey="count" fill="#C9A84C" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ConsumptionBar({ data }: { data: StatsResponse["consumption_by_month"] }) {
  if (!data.length) return <EmptyChart />;
  const formatted = data.map((d) => ({
    ...d,
    label: d.month.slice(0, 7),
  }));
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={formatted} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: "#FFF8E7", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis hide allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#3E2723", border: "1px solid #722F37", borderRadius: 8 }}
          labelStyle={{ color: "#FFF8E7" }}
          itemStyle={{ color: "#C9A84C" }}
          cursor={{ fill: "rgba(114,47,55,0.2)" }}
        />
        <Bar dataKey="count" fill="#722F37" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function RatingBar({ data }: { data: StatsResponse["rating_distribution"] }) {
  if (!data.length) return <EmptyChart />;
  // Fill missing ratings 1-5
  const filled = [1, 2, 3, 4, 5].map((r) => ({
    label: "★".repeat(r),
    count: data.find((d) => d.rating === r)?.count ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={filled} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: "#C9A84C", fontSize: 14 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis hide allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#3E2723", border: "1px solid #722F37", borderRadius: 8 }}
          labelStyle={{ color: "#FFF8E7" }}
          itemStyle={{ color: "#C9A84C" }}
          cursor={{ fill: "rgba(114,47,55,0.2)" }}
        />
        <Bar dataKey="count" fill="#C9A84C" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function StatsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: statsApi.get,
  });

  if (isLoading || !stats) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <header>
          <h1 className="font-serif text-3xl font-bold text-cream">Stats</h1>
        </header>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl bg-wood" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-6 space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-bold text-cream">Stats</h1>
        <p className="text-cream/50 text-sm mt-0.5">Your cellar at a glance</p>
      </header>

      {/* Inventory */}
      <section>
        <SectionTitle>Inventory</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Bottles" value={stats.total_bottles} />
          <StatCard label="Unique wines" value={stats.unique_wines} />
          <StatCard label="Consumed" value={stats.total_consumed} />
        </div>
      </section>

      {/* By color */}
      <section>
        <SectionTitle>By color</SectionTitle>
        <div className="bg-wood rounded-xl p-4 border border-burgundy/20">
          <ColorPie data={stats.by_color} />
        </div>
      </section>

      {/* By region */}
      <section>
        <SectionTitle>By region</SectionTitle>
        <div className="bg-wood rounded-xl p-4 border border-burgundy/20">
          <HorizontalBar data={stats.by_region} />
        </div>
      </section>

      {/* By vintage */}
      <section>
        <SectionTitle>By vintage</SectionTitle>
        <div className="bg-wood rounded-xl p-4 border border-burgundy/20">
          <VintageBar data={stats.by_vintage} />
        </div>
      </section>

      {/* Consumption */}
      <section>
        <SectionTitle>Consumption — last 12 months</SectionTitle>
        <div className="bg-wood rounded-xl p-4 border border-burgundy/20">
          <ConsumptionBar data={stats.consumption_by_month} />
        </div>
      </section>

      {/* Ratings */}
      <section>
        <SectionTitle>Ratings</SectionTitle>
        <div className="bg-wood rounded-xl p-4 border border-burgundy/20">
          <RatingBar data={stats.rating_distribution} />
        </div>
      </section>

      {/* Top rated */}
      {stats.top_rated.length > 0 && (
        <section>
          <SectionTitle>Top rated</SectionTitle>
          <div className="space-y-2">
            {stats.top_rated.map((wine, i) => (
              <div
                key={wine.wine_id}
                className="flex items-center gap-3 bg-wood rounded-xl p-3 border border-burgundy/20"
              >
                <span className="font-serif text-gold text-lg w-6 text-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-semibold text-cream truncate">
                    {wine.name}
                  </p>
                  <p className="text-xs text-cream/40">
                    {wine.vintage ? `${wine.vintage} · ` : ""}
                    {wine.note_count} {wine.note_count === 1 ? "note" : "notes"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gold font-semibold">
                    {"★".repeat(Math.round(wine.avg_rating))}
                  </p>
                  <p className="text-xs text-cream/50">{wine.avg_rating.toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
