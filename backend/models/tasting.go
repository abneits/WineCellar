package models

import (
	"time"

	"github.com/google/uuid"
)

type TastingNote struct {
	ID        uuid.UUID `json:"id"`
	WineID    uuid.UUID `json:"wine_id"`
	Wine      *Wine     `json:"wine,omitempty"`
	Rating    int       `json:"rating"`
	Comment   string    `json:"comment"`
	TastedAt  time.Time `json:"tasted_at"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateTastingRequest struct {
	WineID   uuid.UUID `json:"wine_id"`
	Rating   int       `json:"rating"`
	Comment  string    `json:"comment"`
	TastedAt *string   `json:"tasted_at,omitempty"` // ISO date string, defaults to today
}
