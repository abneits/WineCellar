package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Wine struct {
	ID                uuid.UUID       `json:"id"`
	Name              string          `json:"name"`
	Appellation       string          `json:"appellation"`
	Region            string          `json:"region"`
	Country           string          `json:"country"`
	Producer          string          `json:"producer"`
	Vintage           *int            `json:"vintage,omitempty"`
	Color             string          `json:"color"`
	GrapeVarieties    json.RawMessage `json:"grape_varieties"`
	AlcoholContent    *float64        `json:"alcohol_content,omitempty"`
	Description       string          `json:"description"`
	TastingNotes      json.RawMessage `json:"tasting_notes"`
	FoodPairings      json.RawMessage `json:"food_pairings"`
	PeakMaturityStart *int            `json:"peak_maturity_start,omitempty"`
	PeakMaturityEnd   *int            `json:"peak_maturity_end,omitempty"`
	AveragePrice      *float64        `json:"average_price,omitempty"`
	AIConfidence      *float64        `json:"ai_confidence,omitempty"`
	AIRawResponse     json.RawMessage `json:"ai_raw_response,omitempty"`
	WebSearchData     json.RawMessage `json:"web_search_data,omitempty"`
	Status            string          `json:"status"`
	HasImage          bool            `json:"has_image"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

// ScanQueuedResponse is returned from POST /api/wines/scan.
// The bottle is saved and queued for overnight AI recognition.
type ScanQueuedResponse struct {
	ID       uuid.UUID `json:"id"`
	Status   string    `json:"status"`
	HasImage bool      `json:"has_image"`
}

// PendingWine is returned from GET /api/wines/pending for n8n batch jobs.
type PendingWine struct {
	ID          uuid.UUID `json:"id"`
	Status      string    `json:"status"`
	HasImage    bool      `json:"has_image"`
	ImageBase64 string    `json:"image_base64,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// RecognitionUpdateRequest is posted by n8n with Ollama Vision results.
type RecognitionUpdateRequest struct {
	Name           string          `json:"name"`
	Producer       string          `json:"producer"`
	Vintage        *int            `json:"vintage,omitempty"`
	Appellation    string          `json:"appellation"`
	Region         string          `json:"region"`
	Country        string          `json:"country"`
	Color          string          `json:"color"`
	GrapeVarieties json.RawMessage `json:"grape_varieties"`
	AlcoholContent *float64        `json:"alcohol_content,omitempty"`
	Description    string          `json:"description"`
	AIConfidence   *float64        `json:"ai_confidence,omitempty"`
	AIRawResponse  json.RawMessage `json:"ai_raw_response,omitempty"`
}

// EnrichmentUpdateRequest is posted by n8n with web search / tasting data.
type EnrichmentUpdateRequest struct {
	TastingNotes      json.RawMessage `json:"tasting_notes,omitempty"`
	FoodPairings      json.RawMessage `json:"food_pairings,omitempty"`
	WebSearchData     json.RawMessage `json:"web_search_data,omitempty"`
	PeakMaturityStart *int            `json:"peak_maturity_start,omitempty"`
	PeakMaturityEnd   *int            `json:"peak_maturity_end,omitempty"`
	AveragePrice      *float64        `json:"average_price,omitempty"`
}

// StatusUpdateRequest is used by n8n to set a wine's status (e.g. "failed").
type StatusUpdateRequest struct {
	Status string `json:"status"`
}

// WineFilter is used for listing wines.
type WineFilter struct {
	Color   string
	Country string
	Search  string
	Page    int
	Limit   int
}
