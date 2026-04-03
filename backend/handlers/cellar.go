package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"wine-cellar/models"
	"wine-cellar/repository"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type CellarHandler struct {
	repo repository.CellarRepo
}

func NewCellarHandler(repo repository.CellarRepo) *CellarHandler {
	return &CellarHandler{repo: repo}
}

func (h *CellarHandler) Add(w http.ResponseWriter, r *http.Request) {
	var req models.AddToCellarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Quantity < 1 {
		jsonError(w, "quantity must be at least 1", http.StatusBadRequest)
		return
	}
	entry := &models.CellarEntry{
		WineID:        req.WineID,
		Quantity:      req.Quantity,
		Location:      req.Location,
		PurchaseDate:  req.PurchaseDate,
		PurchasePrice: req.PurchasePrice,
	}
	if err := h.repo.Add(r.Context(), entry); err != nil {
		log.Printf("ERROR add to cellar (wine_id=%s): %v", req.WineID, err)
		jsonError(w, "failed to add to cellar", http.StatusInternalServerError)
		return
	}
	jsonResponseStatus(w, entry, http.StatusCreated)
}

func (h *CellarHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		jsonError(w, "invalid id", http.StatusBadRequest)
		return
	}
	entry, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		jsonError(w, "entry not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, entry)
}

func (h *CellarHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		jsonError(w, "invalid id", http.StatusBadRequest)
		return
	}
	entry, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		jsonError(w, "entry not found", http.StatusNotFound)
		return
	}
	if err := json.NewDecoder(r.Body).Decode(entry); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	entry.ID = id
	if err := h.repo.Update(r.Context(), entry); err != nil {
		jsonError(w, "failed to update entry", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, entry)
}

func (h *CellarHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		jsonError(w, "invalid id", http.StatusBadRequest)
		return
	}
	if err := h.repo.Delete(r.Context(), id); err != nil {
		jsonError(w, "failed to delete entry", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CellarHandler) Consume(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		jsonError(w, "invalid id", http.StatusBadRequest)
		return
	}
	var req models.ConsumeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Quantity < 1 {
		req.Quantity = 1
	}
	if err := h.repo.Consume(r.Context(), id, &req); err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CellarHandler) List(w http.ResponseWriter, r *http.Request) {
	entries, err := h.repo.List(r.Context())
	if err != nil {
		jsonError(w, "failed to list cellar", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, entries)
}

func (h *CellarHandler) Stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.repo.GetStats(r.Context())
	if err != nil {
		jsonError(w, "failed to get stats", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, stats)
}

func (h *CellarHandler) Recent(w http.ResponseWriter, r *http.Request) {
	entries, err := h.repo.GetRecent(r.Context(), 5)
	if err != nil {
		jsonError(w, "failed to get recent wines", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, entries)
}

func (h *CellarHandler) Maturity(w http.ResponseWriter, r *http.Request) {
	entries, err := h.repo.GetMaturity(r.Context())
	if err != nil {
		jsonError(w, "failed to get maturity data", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, entries)
}
