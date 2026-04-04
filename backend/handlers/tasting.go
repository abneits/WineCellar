package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"wine-cellar/models"
	"wine-cellar/repository"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type TastingHandler struct {
	repo repository.TastingRepo
}

func NewTastingHandler(repo repository.TastingRepo) *TastingHandler {
	return &TastingHandler{repo: repo}
}

func (h *TastingHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateTastingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Rating < 1 || req.Rating > 5 {
		jsonError(w, "rating must be between 1 and 5", http.StatusBadRequest)
		return
	}
	note := &models.TastingNote{
		WineID:  req.WineID,
		Rating:  req.Rating,
		Comment: req.Comment,
	}
	if req.TastedAt != nil {
		if t, err := time.Parse("2006-01-02", *req.TastedAt); err == nil {
			note.TastedAt = t
		}
	}
	if note.TastedAt.IsZero() {
		note.TastedAt = time.Now()
	}
	if err := h.repo.Create(r.Context(), note); err != nil {
		jsonError(w, "failed to save tasting note", http.StatusInternalServerError)
		return
	}
	if req.ConsumptionID != nil {
		if err := h.repo.MarkRated(r.Context(), *req.ConsumptionID); err != nil {
			log.Printf("ERROR mark rated (consumption_id=%s): %v", req.ConsumptionID, err)
		}
	}
	jsonResponseStatus(w, note, http.StatusCreated)
}

func (h *TastingHandler) List(w http.ResponseWriter, r *http.Request) {
	notes, err := h.repo.List(r.Context())
	if err != nil {
		jsonError(w, "failed to list tasting notes", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, notes)
}

func (h *TastingHandler) Pending(w http.ResponseWriter, r *http.Request) {
	pending, err := h.repo.GetPending(r.Context())
	if err != nil {
		jsonError(w, "failed to get pending ratings", http.StatusInternalServerError)
		return
	}
	if pending == nil {
		pending = []*models.PendingRating{}
	}
	jsonResponse(w, pending)
}

func (h *TastingHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		jsonError(w, "invalid id", http.StatusBadRequest)
		return
	}
	var note models.TastingNote
	if err := json.NewDecoder(r.Body).Decode(&note); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	note.ID = id
	if err := h.repo.Update(r.Context(), &note); err != nil {
		jsonError(w, "failed to update tasting note", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, note)
}
