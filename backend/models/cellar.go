package models

import (
	"fmt"
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
	AvgRating     *float64   `json:"avg_rating,omitempty"`
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
	WineID        uuid.UUID `json:"wine_id"`
	Quantity      int       `json:"quantity"`
	Location      string    `json:"location"`
	// PurchaseDate accepts both RFC3339 ("2006-01-02T15:04:05Z") and date-only ("2006-01-02") formats.
	PurchaseDate  *FlexDate `json:"purchase_date,omitempty"`
	PurchasePrice *float64  `json:"purchase_price,omitempty"`
}

// FlexDate is a time.Time that also accepts plain date strings (YYYY-MM-DD).
type FlexDate struct {
	time.Time
}

func (f *FlexDate) UnmarshalJSON(data []byte) error {
	s := string(data)
	// Strip quotes
	if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
		s = s[1 : len(s)-1]
	}
	// Try RFC3339 first
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		f.Time = t
		return nil
	}
	// Fall back to date-only
	if t, err := time.Parse("2006-01-02", s); err == nil {
		f.Time = t
		return nil
	}
	return fmt.Errorf("cannot parse %q as date", s)
}

type ConsumeRequest struct {
	Quantity int    `json:"quantity"`
	Occasion string `json:"occasion"`
}
