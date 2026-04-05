package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"reflect"
	"strconv"

	"wine-cellar/models"
	"wine-cellar/repository"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type WineHandler struct {
	repo           repository.WineRepo
	maxImageSizeMB int
}

func NewWineHandler(repo repository.WineRepo, maxImageSizeMB int) *WineHandler {
	return &WineHandler{repo: repo, maxImageSizeMB: maxImageSizeMB}
}

func (h *WineHandler) List(w http.ResponseWriter, r *http.Request) {
	filter := models.WineFilter{
		Color:   r.URL.Query().Get("color"),
		Country: r.URL.Query().Get("country"),
		Search:  r.URL.Query().Get("search"),
	}
	if p := r.URL.Query().Get("page"); p != "" {
		filter.Page, _ = strconv.Atoi(p)
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		filter.Limit, _ = strconv.Atoi(l)
	}

	wines, total, err := h.repo.List(r.Context(), filter)
	if err != nil {
		jsonError(w, "failed to list wines", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]interface{}{"wines": wines, "total": total})
}

func (h *WineHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		jsonError(w, "invalid wine id", http.StatusBadRequest)
		return
	}
	wine, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		jsonError(w, "wine not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, wine)
}

func (h *WineHandler) Create(w http.ResponseWriter, r *http.Request) {
	var wine models.Wine
	if err := json.NewDecoder(r.Body).Decode(&wine); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if wine.Name == "" {
		jsonError(w, "name is required", http.StatusBadRequest)
		return
	}
	wine.Status = "validated"
	if err := h.repo.Create(r.Context(), &wine, nil); err != nil {
		log.Printf("ERROR create wine: %v", err)
		jsonError(w, "failed to create wine", http.StatusInternalServerError)
		return
	}
	jsonResponseStatus(w, wine, http.StatusCreated)
}

func (h *WineHandler) CreateWithImage(w http.ResponseWriter, r *http.Request) {
	maxBytes := int64(h.maxImageSizeMB) << 20
	r.ParseMultipartForm(maxBytes)

	var wine models.Wine
	wineJSON := r.FormValue("wine")
	if err := json.Unmarshal([]byte(wineJSON), &wine); err != nil {
		jsonError(w, "invalid wine data", http.StatusBadRequest)
		return
	}

	var imageData []byte
	file, _, err := r.FormFile("image")
	if err == nil {
		defer file.Close()
		imageData, err = io.ReadAll(io.LimitReader(file, maxBytes))
		if err != nil {
			jsonError(w, "failed to read image", http.StatusBadRequest)
			return
		}
	}

	wine.Status = "validated"
	if err := h.repo.Create(r.Context(), &wine, imageData); err != nil {
		log.Printf("ERROR create wine with image: %v", err)
		jsonError(w, "failed to save wine", http.StatusInternalServerError)
		return
	}
	jsonResponseStatus(w, wine, http.StatusCreated)
}

func (h *WineHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		jsonError(w, "invalid wine id", http.StatusBadRequest)
		return
	}
	wine, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		jsonError(w, "wine not found", http.StatusNotFound)
		return
	}
	if err := json.NewDecoder(r.Body).Decode(wine); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	wine.ID = id
	if err := h.repo.Update(r.Context(), wine); err != nil {
		jsonError(w, "failed to update wine", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, wine)
}

func (h *WineHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		jsonError(w, "invalid wine id", http.StatusBadRequest)
		return
	}
	if err := h.repo.Delete(r.Context(), id); err != nil {
		jsonError(w, "failed to delete wine", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *WineHandler) GetImage(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		jsonError(w, "invalid wine id", http.StatusBadRequest)
		return
	}
	thumbnail := r.URL.Query().Get("size") == "thumbnail"
	data, err := h.repo.GetImage(r.Context(), id, thumbnail)
	if err != nil || len(data) == 0 {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Write(data)
}

// Scan saves the bottle photo and creates a wine record with status "pending_recognition".
// No AI call is made — recognition is handled overnight by n8n.
func (h *WineHandler) Scan(w http.ResponseWriter, r *http.Request) {
	maxBytes := int64(h.maxImageSizeMB) << 20
	r.ParseMultipartForm(maxBytes)

	file, _, err := r.FormFile("image")
	if err != nil {
		jsonError(w, "image file required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	imageData, err := io.ReadAll(io.LimitReader(file, maxBytes))
	if err != nil {
		jsonError(w, "failed to read image", http.StatusBadRequest)
		return
	}

	wine := &models.Wine{
		Name:   "",
		Color:  "red",
		Status: "pending_recognition",
	}
	if err := h.repo.Create(r.Context(), wine, imageData); err != nil {
		jsonError(w, "failed to save bottle", http.StatusInternalServerError)
		return
	}

	jsonResponseStatus(w, models.ScanQueuedResponse{
		ID:       wine.ID,
		Status:   wine.Status,
		HasImage: true,
	}, http.StatusCreated)
}

// Pending returns wines awaiting n8n processing, including base64-encoded image.
func (h *WineHandler) Pending(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status == "" {
		status = "pending_recognition"
	}
	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	wines, err := h.repo.ListPending(r.Context(), status, limit)
	if err != nil {
		jsonError(w, "failed to list pending wines", http.StatusInternalServerError)
		return
	}
	if wines == nil {
		wines = []*models.PendingWine{}
	}
	jsonResponse(w, wines)
}

// UpdateRecognition is called by n8n after Ollama Vision identifies the bottle.
// If confidence < 80% or any key identity field is missing, status is set to
// "needs_review" so the user can complete the data before enrichment proceeds.
func (h *WineHandler) UpdateRecognition(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		jsonError(w, "invalid wine id", http.StatusBadRequest)
		return
	}
	var req models.RecognitionUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Determine target status
	status := "recognized"
	lowConfidence := req.AIConfidence == nil || *req.AIConfidence < 0.80
	missingFields := req.Name == "" || req.Country == "" || req.Color == "" ||
		req.Appellation == "" || req.Region == "" || req.Producer == "" || req.Vintage == nil
	if lowConfidence || missingFields {
		status = "needs_review"
		log.Printf("INFO recognition needs_review (wine=%s, confidence=%v, missing_fields=%v)", id, req.AIConfidence, missingFields)
	}

	if err := h.repo.UpdateRecognition(r.Context(), id, &req, status); err != nil {
		jsonError(w, fmt.Sprintf("failed to update recognition: %s", err.Error()), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]string{"status": status})
}

// UpdateEnrichment is called by n8n after web search + tasting data is added.
func (h *WineHandler) UpdateEnrichment(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		jsonError(w, "invalid wine id", http.StatusBadRequest)
		return
	}
	var req models.EnrichmentUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if err := h.repo.UpdateEnrichment(r.Context(), id, &req); err != nil {
		jsonError(w, fmt.Sprintf("failed to update enrichment: %s", err.Error()), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]string{"status": "enriched"})
}

// UpdateStatus is called by n8n to set an arbitrary status (e.g. "failed").
func (h *WineHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		jsonError(w, "invalid wine id", http.StatusBadRequest)
		return
	}
	var req models.StatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Status == "" {
		jsonError(w, "status is required", http.StatusBadRequest)
		return
	}
	if err := h.repo.UpdateStatus(r.Context(), id, req.Status); err != nil {
		jsonError(w, "failed to update status", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]string{"status": req.Status})
}

// helpers
func jsonResponse(w http.ResponseWriter, data interface{}) {
	jsonResponseStatus(w, data, http.StatusOK)
}

func jsonResponseStatus(w http.ResponseWriter, data interface{}, status int) {
	// Go encodes nil slices as JSON null; frontend expects [].
	if data != nil {
		v := reflect.ValueOf(data)
		if v.Kind() == reflect.Slice && v.IsNil() {
			data = []struct{}{}
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
