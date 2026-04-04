"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Minus, Plus } from "lucide-react";
import type { Wine, WineColor } from "@/types";

const COLORS: WineColor[] = ["red", "white", "rosé", "sparkling", "dessert", "orange", "yellow"];

interface Props {
  wine: Wine;
  onValidate: (data: Partial<Wine>, quantity: number) => void;
  isLoading: boolean;
}

export function WineValidationForm({ wine, onValidate, isLoading }: Props) {
  const [form, setForm] = useState({
    name: wine.name ?? "",
    producer: wine.producer ?? "",
    vintage: wine.vintage as number | undefined,
    color: (wine.color ?? "red") as WineColor,
    appellation: wine.appellation ?? "",
    region: wine.region ?? "",
    country: wine.country ?? "",
    description: wine.description ?? "",
    alcohol_content: wine.alcohol_content as number | undefined,
    nose: wine.tasting_notes?.nose ?? "",
    palate: wine.tasting_notes?.palate ?? "",
    finish: wine.tasting_notes?.finish ?? "",
    food_pairings: Array.isArray(wine.food_pairings)
      ? wine.food_pairings.join(", ")
      : "",
    grape_varieties: Array.isArray(wine.grape_varieties)
      ? wine.grape_varieties.join(", ")
      : "",
    peak_maturity_start: wine.peak_maturity_start as number | undefined,
    peak_maturity_end: wine.peak_maturity_end as number | undefined,
    average_price: wine.average_price as number | undefined,
  });
  const [quantity, setQuantity] = useState(1);

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const setNum =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({
        ...f,
        [field]: e.target.value === "" ? undefined : Number(e.target.value),
      }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Partial<Wine> = {
      name: form.name,
      producer: form.producer,
      vintage: form.vintage,
      color: form.color,
      appellation: form.appellation,
      region: form.region,
      country: form.country,
      description: form.description,
      alcohol_content: form.alcohol_content,
      tasting_notes: {
        nose: form.nose,
        palate: form.palate,
        finish: form.finish,
      },
      food_pairings: form.food_pairings
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      grape_varieties: form.grape_varieties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      peak_maturity_start: form.peak_maturity_start,
      peak_maturity_end: form.peak_maturity_end,
      average_price: form.average_price,
    };
    onValidate(data, quantity);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 px-4 pb-8">
      <Section title="Identity">
        <Field label="Wine Name *">
          <Input
            value={form.name}
            onChange={set("name")}
            required
            className="bg-wood-dark border-burgundy/30 text-cream"
          />
        </Field>
        <Field label="Producer">
          <Input
            value={form.producer}
            onChange={set("producer")}
            className="bg-wood-dark border-burgundy/30 text-cream"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vintage">
            <Input
              type="number"
              value={form.vintage ?? ""}
              onChange={setNum("vintage")}
              className="bg-wood-dark border-burgundy/30 text-cream"
              placeholder="2019"
              min="1800"
              max="2030"
            />
          </Field>
          <Field label="Color">
            <Select
              value={form.color}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, color: (v ?? "red") as WineColor }))
              }
            >
              <SelectTrigger className="bg-wood-dark border-burgundy/30 text-cream">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-wood border-burgundy/30">
                {COLORS.map((c) => (
                  <SelectItem key={c} value={c} className="text-cream capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Grape Varieties">
          <Input
            value={form.grape_varieties}
            onChange={set("grape_varieties")}
            className="bg-wood-dark border-burgundy/30 text-cream"
            placeholder="Pinot Noir, Chardonnay"
          />
        </Field>
        <Field label="Alcohol (%)">
          <Input
            type="number"
            value={form.alcohol_content ?? ""}
            onChange={setNum("alcohol_content")}
            className="bg-wood-dark border-burgundy/30 text-cream"
            placeholder="13.5"
            step="0.1"
          />
        </Field>
      </Section>

      <Section title="Origin">
        <Field label="Appellation / AOC">
          <Input
            value={form.appellation}
            onChange={set("appellation")}
            className="bg-wood-dark border-burgundy/30 text-cream"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Region">
            <Input
              value={form.region}
              onChange={set("region")}
              className="bg-wood-dark border-burgundy/30 text-cream"
            />
          </Field>
          <Field label="Country">
            <Input
              value={form.country}
              onChange={set("country")}
              className="bg-wood-dark border-burgundy/30 text-cream"
            />
          </Field>
        </div>
      </Section>

      <Section title="Description">
        <Field label="General">
          <Textarea
            value={form.description}
            onChange={set("description")}
            className="bg-wood-dark border-burgundy/30 text-cream resize-none"
            rows={2}
          />
        </Field>
      </Section>

      <Section title="Tasting Notes">
        <Field label="Nose">
          <Textarea
            value={form.nose}
            onChange={set("nose")}
            className="bg-wood-dark border-burgundy/30 text-cream resize-none"
            rows={2}
          />
        </Field>
        <Field label="Palate">
          <Textarea
            value={form.palate}
            onChange={set("palate")}
            className="bg-wood-dark border-burgundy/30 text-cream resize-none"
            rows={2}
          />
        </Field>
        <Field label="Finish">
          <Textarea
            value={form.finish}
            onChange={set("finish")}
            className="bg-wood-dark border-burgundy/30 text-cream resize-none"
            rows={2}
          />
        </Field>
      </Section>

      <Section title="Food Pairings">
        <Field label="Pairings (comma-separated)">
          <Input
            value={form.food_pairings}
            onChange={set("food_pairings")}
            className="bg-wood-dark border-burgundy/30 text-cream"
            placeholder="Beef, Lamb, Cheese"
          />
        </Field>
      </Section>

      <Section title="Maturity & Price">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ready from">
            <Input
              type="number"
              value={form.peak_maturity_start ?? ""}
              onChange={setNum("peak_maturity_start")}
              className="bg-wood-dark border-burgundy/30 text-cream"
              placeholder="2025"
            />
          </Field>
          <Field label="Peak until">
            <Input
              type="number"
              value={form.peak_maturity_end ?? ""}
              onChange={setNum("peak_maturity_end")}
              className="bg-wood-dark border-burgundy/30 text-cream"
              placeholder="2030"
            />
          </Field>
        </div>
        <Field label="Average Price (€)">
          <Input
            type="number"
            value={form.average_price ?? ""}
            onChange={setNum("average_price")}
            className="bg-wood-dark border-burgundy/30 text-cream"
            placeholder="15"
            step="0.01"
          />
        </Field>
      </Section>

      <Section title="Add to Cellar">
        <Field label="Quantity">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-full bg-wood-dark border border-burgundy/30 flex items-center justify-center text-cream"
            >
              <Minus size={16} />
            </button>
            <span className="text-xl font-bold text-cream w-8 text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              className="w-10 h-10 rounded-full bg-wood-dark border border-burgundy/30 flex items-center justify-center text-cream"
            >
              <Plus size={16} />
            </button>
          </div>
        </Field>
      </Section>

      <Button
        type="submit"
        disabled={isLoading || !form.name}
        className="w-full bg-burgundy hover:bg-burgundy-600 text-cream"
        size="lg"
      >
        {isLoading ? "Validating…" : "Validate & Add to Cellar"}
      </Button>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-serif text-sm font-semibold text-gold border-b border-burgundy/20 pb-1">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-cream/60">{label}</Label>
      {children}
    </div>
  );
}
