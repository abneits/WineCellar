package models

import (
	"time"

	"github.com/google/uuid"
)

type CellarEntry struct {
	ID            uuid.UUID  `json:"id"`
	WineID        uuid.UUID  `json:"wine_id"`
	Wine          *Wine      `json:"wine,omitempty"`
	Quantity      int        `json:"quantity"`
	Location      string     `json:"location"`
	PurchaseDate  *time.Time `json:"purchase_date,omitempty"`
	PurchasePrice *float64   `json:"purchase_price,omitempty"`
	AddedAt       time.Time  `json:"added_at"`
}

type CellarStats struct {
	TotalBottles int            `json:"total_bottles"`
	TotalValue   float64        `json:"total_value"`
	UniqueWines  int            `json:"unique_wines"`
	ByColor      map[string]int `json:"by_color"`
}

type MaturityEntry struct {
	WineID            uuid.UUID `json:"wine_id"`
	WineName          string    `json:"wine_name"`
	Vintage           *int      `json:"vintage,omitempty"`
	PeakMaturityStart *int      `json:"peak_maturity_start,omitempty"`
	PeakMaturityEnd   *int      `json:"peak_maturity_end,omitempty"`
	Quantity          int       `json:"quantity"`
	Status            string    `json:"status"` // "ready", "soon", "not_yet"
}

type AddToCellarRequest struct {
	WineID        uuid.UUID  `json:"wine_id"`
	Quantity      int        `json:"quantity"`
	Location      string     `json:"location"`
	PurchaseDate  *time.Time `json:"purchase_date,omitempty"`
	PurchasePrice *float64   `json:"purchase_price,omitempty"`
}

type ConsumeRequest struct {
	Quantity int    `json:"quantity"`
	Occasion string `json:"occasion"`
}
