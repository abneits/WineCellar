package repository

import (
	"context"

	"wine-cellar/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type StatsRepo interface {
	GetStats(ctx context.Context) (*models.StatsResponse, error)
}

type statsRepo struct {
	db *pgxpool.Pool
}

func NewStatsRepo(db *pgxpool.Pool) StatsRepo {
	return &statsRepo{db: db}
}

func (r *statsRepo) GetStats(ctx context.Context) (*models.StatsResponse, error) {
	stats := &models.StatsResponse{
		ByColor:            []models.CountByLabel{},
		ByRegion:           []models.CountByLabel{},
		ByVintage:          []models.CountByLabel{},
		ConsumptionByMonth: []models.ConsumptionByMonth{},
		RatingDistribution: []models.RatingDistribution{},
		TopRated:           []models.TopRatedWine{},
	}

	// Inventory totals
	if err := r.db.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(ce.quantity), 0),
			COUNT(DISTINCT ce.wine_id)
		FROM cellar_entries ce
		WHERE ce.quantity > 0`,
	).Scan(&stats.TotalBottles, &stats.UniqueWines); err != nil {
		return nil, err
	}

	// By color
	rows, err := r.db.Query(ctx, `
		SELECT w.color, SUM(ce.quantity)
		FROM cellar_entries ce JOIN wines w ON w.id = ce.wine_id
		WHERE ce.quantity > 0
		GROUP BY w.color ORDER BY SUM(ce.quantity) DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var c models.CountByLabel
		if err := rows.Scan(&c.Label, &c.Count); err != nil {
			return nil, err
		}
		stats.ByColor = append(stats.ByColor, c)
	}
	rows.Close()

	// By region (top 10)
	rows, err = r.db.Query(ctx, `
		SELECT COALESCE(NULLIF(w.region, ''), 'Unknown'), SUM(ce.quantity)
		FROM cellar_entries ce JOIN wines w ON w.id = ce.wine_id
		WHERE ce.quantity > 0
		GROUP BY COALESCE(NULLIF(w.region, ''), 'Unknown')
		ORDER BY SUM(ce.quantity) DESC LIMIT 10`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var c models.CountByLabel
		if err := rows.Scan(&c.Label, &c.Count); err != nil {
			return nil, err
		}
		stats.ByRegion = append(stats.ByRegion, c)
	}
	rows.Close()

	// By vintage (bottles in cellar)
	rows, err = r.db.Query(ctx, `
		SELECT COALESCE(w.vintage::text, 'N/A'), SUM(ce.quantity)
		FROM cellar_entries ce JOIN wines w ON w.id = ce.wine_id
		WHERE ce.quantity > 0
		GROUP BY w.vintage ORDER BY w.vintage ASC NULLS LAST`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var c models.CountByLabel
		if err := rows.Scan(&c.Label, &c.Count); err != nil {
			return nil, err
		}
		stats.ByVintage = append(stats.ByVintage, c)
	}
	rows.Close()

	// Total consumed
	if err := r.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(quantity), 0) FROM consumption_log`,
	).Scan(&stats.TotalConsumed); err != nil {
		return nil, err
	}

	// Consumption by month (last 12 months)
	rows, err = r.db.Query(ctx, `
		SELECT to_char(consumed_at, 'YYYY-MM') as month, SUM(quantity)
		FROM consumption_log
		WHERE consumed_at >= NOW() - INTERVAL '12 months'
		GROUP BY month ORDER BY month ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var c models.ConsumptionByMonth
		if err := rows.Scan(&c.Month, &c.Count); err != nil {
			return nil, err
		}
		stats.ConsumptionByMonth = append(stats.ConsumptionByMonth, c)
	}
	rows.Close()

	// Rating distribution
	rows, err = r.db.Query(ctx, `
		SELECT rating, COUNT(*) FROM tasting_notes
		GROUP BY rating ORDER BY rating ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var rd models.RatingDistribution
		if err := rows.Scan(&rd.Rating, &rd.Count); err != nil {
			return nil, err
		}
		stats.RatingDistribution = append(stats.RatingDistribution, rd)
	}
	rows.Close()

	// Top rated wines (min 1 note)
	rows, err = r.db.Query(ctx, `
		SELECT w.id::text, w.name, w.vintage,
			ROUND(AVG(tn.rating)::numeric, 1), COUNT(tn.id)
		FROM tasting_notes tn JOIN wines w ON w.id = tn.wine_id
		GROUP BY w.id, w.name, w.vintage
		HAVING COUNT(tn.id) >= 1
		ORDER BY AVG(tn.rating) DESC, COUNT(tn.id) DESC
		LIMIT 5`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var t models.TopRatedWine
		if err := rows.Scan(&t.WineID, &t.Name, &t.Vintage, &t.AvgRating, &t.NoteCount); err != nil {
			return nil, err
		}
		stats.TopRated = append(stats.TopRated, t)
	}

	return stats, rows.Err()
}
