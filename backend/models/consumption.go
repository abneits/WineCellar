package models

import (
	"time"

	"github.com/google/uuid"
)

type ConsumptionLog struct {
	ID            uuid.UUID `json:"id"`
	CellarEntryID uuid.UUID `json:"cellar_entry_id"`
	WineID        uuid.UUID `json:"wine_id"`
	Quantity      int       `json:"quantity"`
	ConsumedAt    time.Time `json:"consumed_at"`
	Occasion      string    `json:"occasion"`
	Rated         bool      `json:"rated"`
}

// PendingRating is returned by GET /api/tastings/pending
type PendingRating struct {
	ConsumptionID uuid.UUID `json:"consumption_id"`
	WineID        uuid.UUID `json:"wine_id"`
	WineName      string    `json:"wine_name"`
	Vintage       *int      `json:"vintage,omitempty"`
	ConsumedAt    time.Time `json:"consumed_at"`
	Occasion      string    `json:"occasion"`
	HasThumbnail  bool      `json:"has_thumbnail"`
}
