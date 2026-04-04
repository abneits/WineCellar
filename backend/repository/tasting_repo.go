package repository

import (
	"context"
	"time"

	"wine-cellar/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type tastingRepo struct {
	db *pgxpool.Pool
}

func NewTastingRepo(db *pgxpool.Pool) TastingRepo {
	return &tastingRepo{db: db}
}

func (r *tastingRepo) Create(ctx context.Context, note *models.TastingNote) error {
	note.ID = uuid.New()
	note.CreatedAt = time.Now()
	if note.TastedAt.IsZero() {
		note.TastedAt = time.Now()
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO tasting_notes (id, wine_id, rating, comment, tasted_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		note.ID, note.WineID, note.Rating, note.Comment, note.TastedAt, note.CreatedAt,
	)
	return err
}

func (r *tastingRepo) List(ctx context.Context) ([]*models.TastingNote, error) {
	rows, err := r.db.Query(ctx, `
		SELECT tn.id, tn.wine_id, tn.rating, tn.comment, tn.tasted_at, tn.created_at,
			w.name, w.vintage, w.color
		FROM tasting_notes tn
		JOIN wines w ON w.id = tn.wine_id
		ORDER BY tn.tasted_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []*models.TastingNote
	for rows.Next() {
		n := &models.TastingNote{Wine: &models.Wine{}}
		if err := rows.Scan(&n.ID, &n.WineID, &n.Rating, &n.Comment, &n.TastedAt, &n.CreatedAt,
			&n.Wine.Name, &n.Wine.Vintage, &n.Wine.Color); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, rows.Err()
}

func (r *tastingRepo) ListByWine(ctx context.Context, wineID uuid.UUID) ([]*models.TastingNote, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, wine_id, rating, comment, tasted_at, created_at
		FROM tasting_notes
		WHERE wine_id = $1
		ORDER BY tasted_at DESC`, wineID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []*models.TastingNote
	for rows.Next() {
		n := &models.TastingNote{}
		if err := rows.Scan(&n.ID, &n.WineID, &n.Rating, &n.Comment, &n.TastedAt, &n.CreatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, rows.Err()
}

func (r *tastingRepo) GetPending(ctx context.Context) ([]*models.PendingRating, error) {
	rows, err := r.db.Query(ctx, `
		SELECT cl.id, cl.wine_id, w.name, w.vintage, cl.consumed_at, cl.occasion,
			(w.image_thumbnail IS NOT NULL) as has_thumbnail
		FROM consumption_log cl
		JOIN wines w ON w.id = cl.wine_id
		WHERE cl.rated = false
		ORDER BY cl.consumed_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pending []*models.PendingRating
	for rows.Next() {
		p := &models.PendingRating{}
		if err := rows.Scan(&p.ConsumptionID, &p.WineID, &p.WineName, &p.Vintage,
			&p.ConsumedAt, &p.Occasion, &p.HasThumbnail); err != nil {
			return nil, err
		}
		pending = append(pending, p)
	}
	return pending, rows.Err()
}

func (r *tastingRepo) Update(ctx context.Context, note *models.TastingNote) error {
	_, err := r.db.Exec(ctx, `
		UPDATE tasting_notes SET rating=$1, comment=$2, tasted_at=$3 WHERE id=$4`,
		note.Rating, note.Comment, note.TastedAt, note.ID,
	)
	return err
}

func (r *tastingRepo) MarkRated(ctx context.Context, consumptionID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		"UPDATE consumption_log SET rated=true WHERE id=$1", consumptionID)
	return err
}
