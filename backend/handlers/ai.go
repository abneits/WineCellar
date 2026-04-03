package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"wine-cellar/repository"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AIHandler struct {
	webhookURL string
	httpClient *http.Client
	db         *pgxpool.Pool
}

func NewAIHandler(webhookURL string, db *pgxpool.Pool) *AIHandler {
	return &AIHandler{
		webhookURL: webhookURL,
		httpClient: &http.Client{Timeout: 60 * time.Second},
		db:         db,
	}
}

type pairingWebhookPayload struct {
	Prompt string          `json:"prompt"`
	Cellar json.RawMessage `json:"cellar"`
}

func (h *AIHandler) Pairing(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Meal string `json:"meal"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Meal == "" {
		jsonError(w, "meal description is required", http.StatusBadRequest)
		return
	}

	if h.webhookURL == "" {
		jsonError(w, "pairing service not configured", http.StatusServiceUnavailable)
		return
	}

	cellar, err := repository.WineSummaryForAI(r.Context(), h.db)
	if err != nil {
		jsonError(w, "failed to load cellar", http.StatusInternalServerError)
		return
	}

	payload := pairingWebhookPayload{
		Prompt: req.Meal,
		Cellar: cellar,
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		jsonError(w, "failed to build payload", http.StatusInternalServerError)
		return
	}

	resp, err := h.httpClient.Post(h.webhookURL, "application/json", bytes.NewReader(payloadBytes))
	if err != nil {
		jsonError(w, "pairing service unavailable", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		jsonError(w, "failed to read pairing response", http.StatusInternalServerError)
		return
	}

	// Forward n8n response directly to client
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)
}
