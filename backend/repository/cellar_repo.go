package repository

import (
	"context"
	"fmt"
	"time"

	"wine-cellar/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type cellarRepo struct {
	db *pgxpool.Pool
}

func NewCellarRepo(db *pgxpool.Pool) CellarRepo {
	return &cellarRepo{db: db}
}

func (r *cellarRepo) Add(ctx context.Context, entry *models.CellarEntry) error {
	entry.ID = uuid.New()
	entry.AddedAt = time.Now()
	_, err := r.db.Exec(ctx, `
		INSERT INTO cellar_entries (id, wine_id, quantity, location, purchase_date, purchase_price, added_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		entry.ID, entry.WineID, entry.Quantity, entry.Location,
		entry.PurchaseDate, entry.PurchasePrice, entry.AddedAt,
	)
	return err
}

func (r *cellarRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.CellarEntry, error) {
	entry := &models.CellarEntry{}
	err := r.db.QueryRow(ctx, `
		SELECT id, wine_id, quantity, location, purchase_date, purchase_price, added_at
		FROM cellar_entries WHERE id = $1`, id,
	).Scan(&entry.ID, &entry.WineID, &entry.Quantity, &entry.Location,
		&entry.PurchaseDate, &entry.PurchasePrice, &entry.AddedAt)
	if err != nil {
		return nil, err
	}
	return entry, nil
}

func (r *cellarRepo) Update(ctx context.Context, entry *models.CellarEntry) error {
	_, err := r.db.Exec(ctx, `
		UPDATE cellar_entries SET quantity=$1, location=$2, purchase_date=$3, purchase_price=$4
		WHERE id=$5`,
		entry.Quantity, entry.Location, entry.PurchaseDate, entry.PurchasePrice, entry.ID,
	)
	return err
}

func (r *cellarRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, "DELETE FROM cellar_entries WHERE id = $1", id)
	return err
}

func (r *cellarRepo) Consume(ctx context.Context, entryID uuid.UUID, req *models.ConsumeRequest) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Get current entry
	var wineID uuid.UUID
	var currentQty int
	if err := tx.QueryRow(ctx,
		"SELECT wine_id, quantity FROM cellar_entries WHERE id = $1", entryID,
	).Scan(&wineID, &currentQty); err != nil {
		return fmt.Errorf("get cellar entry: %w", err)
	}
	if req.Quantity > currentQty {
		return fmt.Errorf("cannot consume %d bottles, only %d in stock", req.Quantity, currentQty)
	}

	// Decrement quantity
	if _, err := tx.Exec(ctx,
		"UPDATE cellar_entries SET quantity = quantity - $1 WHERE id = $2",
		req.Quantity, entryID,
	); err != nil {
		return err
	}

	// Log consumption
	if _, err := tx.Exec(ctx, `
		INSERT INTO consumption_log (id, cellar_entry_id, wine_id, quantity, consumed_at, occasion, rated)
		VALUES ($1, $2, $3, $4, NOW(), $5, false)`,
		uuid.New(), entryID, wineID, req.Quantity, req.Occasion,
	); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *cellarRepo) List(ctx context.Context) ([]*models.CellarEntry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT ce.id, ce.wine_id, ce.quantity, ce.location, ce.purchase_date, ce.purchase_price, ce.added_at,
			w.id, w.name, w.producer, w.vintage, w.color, w.appellation, w.region,
			(w.image IS NOT NULL) as has_image, w.average_price
		FROM cellar_entries ce
		JOIN wines w ON w.id = ce.wine_id
		ORDER BY ce.added_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*models.CellarEntry
	for rows.Next() {
		e := &models.CellarEntry{Wine: &models.Wine{}}
		if err := rows.Scan(
			&e.ID, &e.WineID, &e.Quantity, &e.Location, &e.PurchaseDate, &e.PurchasePrice, &e.AddedAt,
			&e.Wine.ID, &e.Wine.Name, &e.Wine.Producer, &e.Wine.Vintage, &e.Wine.Color,
			&e.Wine.Appellation, &e.Wine.Region, &e.Wine.HasImage, &e.Wine.AveragePrice,
		); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func (r *cellarRepo) GetStats(ctx context.Context) (*models.CellarStats, error) {
	stats := &models.CellarStats{ByColor: make(map[string]int)}

	err := r.db.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(ce.quantity), 0) as total_bottles,
			COALESCE(SUM(ce.quantity * COALESCE(ce.purchase_price, w.average_price, 0)), 0) as total_value,
			COUNT(DISTINCT ce.wine_id) as unique_wines
		FROM cellar_entries ce
		JOIN wines w ON w.id = ce.wine_id
		WHERE ce.quantity > 0`,
	).Scan(&stats.TotalBottles, &stats.TotalValue, &stats.UniqueWines)
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT w.color, SUM(ce.quantity)
		FROM cellar_entries ce JOIN wines w ON w.id = ce.wine_id
		WHERE ce.quantity > 0
		GROUP BY w.color`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var color string
		var count int
		if err := rows.Scan(&color, &count); err != nil {
			return nil, err
		}
		stats.ByColor[color] = count
	}
	return stats, rows.Err()
}

func (r *cellarRepo) GetRecent(ctx context.Context, limit int) ([]*models.CellarEntry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT ce.id, ce.wine_id, ce.quantity, ce.added_at,
			w.name, w.producer, w.vintage, w.color, (w.image_thumbnail IS NOT NULL) as has_image
		FROM cellar_entries ce
		JOIN wines w ON w.id = ce.wine_id
		ORDER BY ce.added_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*models.CellarEntry
	for rows.Next() {
		e := &models.CellarEntry{Wine: &models.Wine{}}
		if err := rows.Scan(
			&e.ID, &e.WineID, &e.Quantity, &e.AddedAt,
			&e.Wine.Name, &e.Wine.Producer, &e.Wine.Vintage, &e.Wine.Color, &e.Wine.HasImage,
		); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func (r *cellarRepo) GetMaturity(ctx context.Context) ([]*models.MaturityEntry, error) {
	currentYear := time.Now().Year()
	rows, err := r.db.Query(ctx, `
		SELECT w.id, w.name, w.vintage, w.peak_maturity_start, w.peak_maturity_end, SUM(ce.quantity)
		FROM wines w
		JOIN cellar_entries ce ON ce.wine_id = w.id
		WHERE ce.quantity > 0 AND w.peak_maturity_start IS NOT NULL
		GROUP BY w.id, w.name, w.vintage, w.peak_maturity_start, w.peak_maturity_end
		ORDER BY w.peak_maturity_start ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*models.MaturityEntry
	for rows.Next() {
		e := &models.MaturityEntry{}
		if err := rows.Scan(&e.WineID, &e.WineName, &e.Vintage,
			&e.PeakMaturityStart, &e.PeakMaturityEnd, &e.Quantity); err != nil {
			return nil, err
		}
		e.Status = maturityStatus(currentYear, e.PeakMaturityStart, e.PeakMaturityEnd)
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func maturityStatus(currentYear int, start, end *int) string {
	if start == nil {
		return "unknown"
	}
	if currentYear >= *start && (end == nil || currentYear <= *end) {
		return "ready"
	}
	if *start-currentYear <= 1 {
		return "soon"
	}
	return "not_yet"
}
