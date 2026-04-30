package models

type CountByLabel struct {
	Label string `json:"label"`
	Count int    `json:"count"`
}

type ConsumptionByMonth struct {
	Month string `json:"month"` // "2025-01"
	Count int    `json:"count"`
}

type RatingDistribution struct {
	Rating int `json:"rating"` // 1-5
	Count  int `json:"count"`
}

type TopRatedWine struct {
	WineID   string  `json:"wine_id"`
	Name     string  `json:"name"`
	Vintage  *int    `json:"vintage,omitempty"`
	AvgRating float64 `json:"avg_rating"`
	NoteCount int    `json:"note_count"`
}

type StatsResponse struct {
	// Inventory
	TotalBottles int `json:"total_bottles"`
	UniqueWines  int `json:"unique_wines"`

	// Distribution
	ByColor   []CountByLabel `json:"by_color"`
	ByRegion  []CountByLabel `json:"by_region"`
	ByVintage []CountByLabel `json:"by_vintage"`

	// Consumption
	TotalConsumed        int                  `json:"total_consumed"`
	ConsumptionByMonth   []ConsumptionByMonth `json:"consumption_by_month"`

	// Ratings
	RatingDistribution []RatingDistribution `json:"rating_distribution"`
	TopRated           []TopRatedWine       `json:"top_rated"`
}
