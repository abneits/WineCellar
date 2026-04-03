"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import type { Wine, WineColor } from "@/types";

type WineFormData = Partial<Wine>;

interface WineFormProps {
  initialData?: WineFormData;
  imageFile?: File;
  onSubmit: (data: WineFormData, quantity: number, imageFile?: File) => void;
  isLoading: boolean;
  aiConfidence?: number;
}

const COLORS: WineColor[] = ["red", "white", "rosé", "sparkling", "dessert", "orange"];

export function WineForm({
  initialData,
  imageFile,
  onSubmit,
  isLoading,
  aiConfidence,
}: WineFormProps) {
  const [form, setForm] = useState<WineFormData>(initialData ?? {});
  const [quantity, setQuantity] = useState(1);

  const set =
    (field: keyof WineFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const setNum =
    (field: keyof WineFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setForm((f) => ({ ...f, [field]: v === "" ? undefined : Number(v) }));
    };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form, quantity, imageFile);
      }}
      className="space-y-4 px-4 pb-8"
    >
      {aiConfidence !== undefined && (
        <div className="flex items-center gap-2 bg-wood rounded-lg p-3 border border-gold/20">
          <span className="text-gold text-xs">
            AI confidence: {Math.round(aiConfidence * 100)}%
          </span>
          <p className="text-xs text-cream/40">Review and adjust as needed</p>
        </div>
      )}

      <Field label="Wine Name *">
        <Input
          value={form.name ?? ""}
          onChange={set("name")}
          required
          className="bg-wood-dark border-burgundy/30 text-cream"
          placeholder="Château Margaux"
        />
      </Field>

      <Field label="Producer">
        <Input
          value={form.producer ?? ""}
          onChange={set("producer")}
          className="bg-wood-dark border-burgundy/30 text-cream"
          placeholder="Château Margaux"
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
            value={form.color ?? "red"}
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

      <Field label="Appellation / AOC">
        <Input
          value={form.appellation ?? ""}
          onChange={set("appellation")}
          className="bg-wood-dark border-burgundy/30 text-cream"
          placeholder="Margaux AOC"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Region">
          <Input
            value={form.region ?? ""}
            onChange={set("region")}
            className="bg-wood-dark border-burgundy/30 text-cream"
            placeholder="Bordeaux"
          />
        </Field>
        <Field label="Country">
          <Input
            value={form.country ?? ""}
            onChange={set("country")}
            className="bg-wood-dark border-burgundy/30 text-cream"
            placeholder="France"
          />
        </Field>
      </div>

      <Field label="Description">
        <Textarea
          value={form.description ?? ""}
          onChange={set("description")}
          className="bg-wood-dark border-burgundy/30 text-cream resize-none"
          rows={3}
        />
      </Field>

      <Field label="Quantity to add">
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

      <Button
        type="submit"
        disabled={isLoading || !form.name}
        className="w-full bg-burgundy hover:bg-burgundy-600 text-cream"
        size="lg"
      >
        {isLoading ? "Saving…" : "Add to Cellar"}
      </Button>
    </form>
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
