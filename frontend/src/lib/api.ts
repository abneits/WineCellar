// When served by Go (same origin), API_BASE is empty and requests go to /api/...
// For local dev, set NEXT_PUBLIC_API_URL=http://localhost:8080 in .env.local
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// Converts any image (including HEIC from iPhone) to a compressed JPEG via canvas.
async function toJpeg(file: File, maxWidth = 1920, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Failed to compress image")); return; }
          resolve(new File([blob], "bottle.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "APIError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new APIError(res.status, body.error ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

import type {
  Wine, ScanQueuedResponse, PendingWine, ListWinesResponse,
  CellarEntry, CellarStats, MaturityEntry, TastingNote, PendingRating,
  PairingRecommendation, AddToCellarRequest, ConsumeRequest, CreateTastingRequest,
} from "@/types";

export const winesApi = {
  list: (params?: { color?: string; country?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.color) q.set("color", params.color);
    if (params?.country) q.set("country", params.country);
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    return request<ListWinesResponse>(`/api/wines?${q}`);
  },
  get: (id: string) => request<Wine>(`/api/wines/${id}`),
  create: (wine: Partial<Wine>) =>
    request<Wine>("/api/wines", { method: "POST", body: JSON.stringify(wine) }),
  createWithImage: async (wine: Partial<Wine>, imageFile: File) => {
    const jpeg = await toJpeg(imageFile);
    const form = new FormData();
    form.append("wine", JSON.stringify(wine));
    form.append("image", jpeg);
    return fetch(`${API_BASE}/api/wines/with-image`, { method: "POST", body: form })
      .then(async (r) => {
        if (!r.ok) throw new APIError(r.status, (await r.json()).error);
        return r.json() as Promise<Wine>;
      });
  },
  update: (id: string, wine: Partial<Wine>) =>
    request<Wine>(`/api/wines/${id}`, { method: "PUT", body: JSON.stringify(wine) }),
  delete: (id: string) => request<void>(`/api/wines/${id}`, { method: "DELETE" }),
  getImageUrl: (id: string, thumbnail = false) =>
    `${API_BASE}/api/wines/${id}/image${thumbnail ? "?size=thumbnail" : ""}`,
  /** Uploads bottle photo; returns queue confirmation (no AI call made yet). */
  scan: async (imageFile: File) => {
    const jpeg = await toJpeg(imageFile);
    const form = new FormData();
    form.append("image", jpeg);
    return fetch(`${API_BASE}/api/wines/scan`, { method: "POST", body: form })
      .then(async (r) => {
        if (!r.ok) throw new APIError(r.status, (await r.json()).error);
        return r.json() as Promise<ScanQueuedResponse>;
      });
  },
  /** Returns wines awaiting n8n processing. Used by dashboard pending section. */
  listPending: (status = "pending_recognition", limit = 20) =>
    request<PendingWine[]>(`/api/wines/pending?status=${status}&limit=${limit}`),
};

export const cellarApi = {
  list: () => request<CellarEntry[]>("/api/cellar"),
  add: (req: AddToCellarRequest) =>
    request<CellarEntry>("/api/cellar", { method: "POST", body: JSON.stringify(req) }),
  update: (id: string, entry: Partial<CellarEntry>) =>
    request<CellarEntry>(`/api/cellar/${id}`, { method: "PUT", body: JSON.stringify(entry) }),
  delete: (id: string) => request<void>(`/api/cellar/${id}`, { method: "DELETE" }),
  consume: (id: string, req: ConsumeRequest) =>
    request<void>(`/api/cellar/${id}/consume`, { method: "POST", body: JSON.stringify(req) }),
  stats: () => request<CellarStats>("/api/cellar/stats"),
  recent: () => request<CellarEntry[]>("/api/cellar/recent"),
  maturity: () => request<MaturityEntry[]>("/api/cellar/maturity"),
};

export const tastingsApi = {
  list: () => request<TastingNote[]>("/api/tastings"),
  create: (req: CreateTastingRequest) =>
    request<TastingNote>("/api/tastings", { method: "POST", body: JSON.stringify(req) }),
  update: (id: string, note: Partial<TastingNote>) =>
    request<TastingNote>(`/api/tastings/${id}`, { method: "PUT", body: JSON.stringify(note) }),
  pending: () => request<PendingRating[]>("/api/tastings/pending"),
};

export const aiApi = {
  pairing: (meal: string) =>
    request<PairingRecommendation[]>("/api/ai/pairing", {
      method: "POST",
      body: JSON.stringify({ meal }),
    }),
};
