export type WineColor = "red" | "white" | "rosé" | "sparkling" | "dessert" | "orange" | "yellow";

export type WineStatus =
  | "pending_recognition"
  | "pending_enrichment"
  | "recognized"
  | "enriched"
  | "failed"
  | "validated";

export interface Wine {
  id: string;
  name: string;
  appellation: string;
  region: string;
  country: string;
  producer: string;
  vintage?: number;
  color: WineColor;
  grape_varieties: string[];
  alcohol_content?: number;
  description: string;
  tasting_notes: {
    nose?: string;
    palate?: string;
    finish?: string;
  };
  food_pairings: string[];
  peak_maturity_start?: number;
  peak_maturity_end?: number;
  average_price?: number;
  ai_confidence?: number;
  enrichment_confidence?: number;
  status: WineStatus;
  has_image: boolean;
  created_at: string;
  updated_at: string;
}

/** Returned by POST /api/wines/scan — bottle queued for overnight recognition */
export interface ScanQueuedResponse {
  id: string;
  status: "pending_recognition";
  has_image: boolean;
}

/** Returned by GET /api/wines/pending — for n8n polling and dashboard display */
export interface PendingWine {
  id: string;
  name: string;
  status: WineStatus;
  has_image: boolean;
  image_base64?: string;
  ai_confidence?: number;
  enrichment_confidence?: number;
  created_at: string;
}

export interface CellarEntry {
  id: string;
  wine_id: string;
  wine?: Wine;
  quantity: number;
  location: string;
  purchase_date?: string;
  purchase_price?: number;
  added_at: string;
  avg_rating?: number;
}

export interface CellarStats {
  total_bottles: number;
  total_value: number;
  unique_wines: number;
  by_color: Record<WineColor, number>;
}

export interface MaturityEntry {
  wine_id: string;
  wine_name: string;
  vintage?: number;
  peak_maturity_start?: number;
  peak_maturity_end?: number;
  quantity: number;
  status: "ready" | "soon" | "not_yet" | "unknown";
}

export interface TastingNote {
  id: string;
  wine_id: string;
  wine?: Pick<Wine, "name" | "vintage" | "color">;
  rating: number;
  comment: string;
  tasted_at: string;
  created_at: string;
}

export interface PendingRating {
  consumption_id: string;
  wine_id: string;
  wine_name: string;
  vintage?: number;
  consumed_at: string;
  occasion: string;
  has_thumbnail: boolean;
}

export interface PairingRecommendation {
  wine_id: string;
  wine_name: string;
  reason: string;
  serving_temp: string;
}

export interface ListWinesResponse {
  wines: Wine[];
  total: number;
}

export interface AddToCellarRequest {
  wine_id: string;
  quantity: number;
  location: string;
  purchase_date?: string;
  purchase_price?: number;
}

export interface ConsumeRequest {
  quantity: number;
  occasion: string;
}

export interface CreateTastingRequest {
  wine_id: string;
  consumption_id?: string;
  rating: number;
  comment: string;
  tasted_at?: string;
}
