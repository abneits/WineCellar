package repository

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"time"

	"wine-cellar/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/image/draw"
)

type wineRepo struct {
	db *pgxpool.Pool
}

func NewWineRepo(db *pgxpool.Pool) WineRepo {
	return &wineRepo{db: db}
}

func (r *wineRepo) Create(ctx context.Context, wine *models.Wine, imageData []byte) error {
	wine.ID = uuid.New()
	wine.CreatedAt = time.Now()
	wine.UpdatedAt = time.Now()
	if wine.Status == "" {
		wine.Status = "validated"
	}
	// JSONB NOT NULL columns require a valid default, not SQL NULL
	if wine.GrapeVarieties == nil {
		wine.GrapeVarieties = json.RawMessage("[]")
	}
	if wine.TastingNotes == nil {
		wine.TastingNotes = json.RawMessage("{}")
	}
	if wine.FoodPairings == nil {
		wine.FoodPairings = json.RawMessage("[]")
	}

	var thumbnail []byte
	if len(imageData) > 0 {
		var err error
		thumbnail, err = generateThumbnail(imageData, 300)
		if err != nil {
			// Non-fatal: unsupported format or corrupt image — save without thumbnail
			fmt.Printf("warn: generate thumbnail: %v\n", err)
		}
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO wines (
			id, name, appellation, region, country, producer, vintage, color,
			grape_varieties, alcohol_content, description, tasting_notes, food_pairings,
			peak_maturity_start, peak_maturity_end, average_price,
			ai_confidence, ai_raw_response, web_search_data,
			image, image_thumbnail, status, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,
			$9,$10,$11,$12,$13,
			$14,$15,$16,
			$17,$18,$19,
			$20,$21,$22,$23,$24
		)`,
		wine.ID, wine.Name, wine.Appellation, wine.Region, wine.Country, wine.Producer, wine.Vintage, wine.Color,
		wine.GrapeVarieties, wine.AlcoholContent, wine.Description, wine.TastingNotes, wine.FoodPairings,
		wine.PeakMaturityStart, wine.PeakMaturityEnd, wine.AveragePrice,
		wine.AIConfidence, wine.AIRawResponse, wine.WebSearchData,
		imageData, thumbnail, wine.Status, wine.CreatedAt, wine.UpdatedAt,
	)
	return err
}

func (r *wineRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Wine, error) {
	wine := &models.Wine{}
	err := r.db.QueryRow(ctx, `
		SELECT id, name, appellation, region, country, producer, vintage, color,
			grape_varieties, alcohol_content, description, tasting_notes, food_pairings,
			peak_maturity_start, peak_maturity_end, average_price,
			ai_confidence, ai_raw_response, web_search_data,
			status, (image IS NOT NULL) as has_image,
			created_at, updated_at
		FROM wines WHERE id = $1`, id,
	).Scan(
		&wine.ID, &wine.Name, &wine.Appellation, &wine.Region, &wine.Country, &wine.Producer,
		&wine.Vintage, &wine.Color,
		&wine.GrapeVarieties, &wine.AlcoholContent, &wine.Description,
		&wine.TastingNotes, &wine.FoodPairings,
		&wine.PeakMaturityStart, &wine.PeakMaturityEnd, &wine.AveragePrice,
		&wine.AIConfidence, &wine.AIRawResponse, &wine.WebSearchData,
		&wine.Status, &wine.HasImage, &wine.CreatedAt, &wine.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return wine, nil
}

func (r *wineRepo) GetImage(ctx context.Context, id uuid.UUID, thumbnail bool) ([]byte, error) {
	col := "image"
	if thumbnail {
		col = "image_thumbnail"
	}
	var data []byte
	err := r.db.QueryRow(ctx, fmt.Sprintf("SELECT %s FROM wines WHERE id = $1", col), id).Scan(&data)
	return data, err
}

func (r *wineRepo) List(ctx context.Context, filter models.WineFilter) ([]*models.Wine, int, error) {
	if filter.Limit == 0 {
		filter.Limit = 20
	}
	if filter.Page < 1 {
		filter.Page = 1
	}
	offset := (filter.Page - 1) * filter.Limit

	args := []interface{}{}
	where := "WHERE 1=1"
	i := 1
	if filter.Color != "" {
		where += fmt.Sprintf(" AND color = $%d", i)
		args = append(args, filter.Color)
		i++
	}
	if filter.Country != "" {
		where += fmt.Sprintf(" AND country ILIKE $%d", i)
		args = append(args, filter.Country)
		i++
	}
	if filter.Search != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR producer ILIKE $%d OR appellation ILIKE $%d)", i, i, i)
		args = append(args, "%"+filter.Search+"%")
		i++
	}

	var total int
	if err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM wines "+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, filter.Limit, offset)
	rows, err := r.db.Query(ctx, `
		SELECT id, name, appellation, region, country, producer, vintage, color,
			grape_varieties, alcohol_content, description, tasting_notes, food_pairings,
			peak_maturity_start, peak_maturity_end, average_price,
			ai_confidence, status, (image IS NOT NULL) as has_image,
			created_at, updated_at
		FROM wines `+where+fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, i, i+1),
		args...,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var wines []*models.Wine
	for rows.Next() {
		w := &models.Wine{}
		if err := rows.Scan(
			&w.ID, &w.Name, &w.Appellation, &w.Region, &w.Country, &w.Producer,
			&w.Vintage, &w.Color,
			&w.GrapeVarieties, &w.AlcoholContent, &w.Description,
			&w.TastingNotes, &w.FoodPairings,
			&w.PeakMaturityStart, &w.PeakMaturityEnd, &w.AveragePrice,
			&w.AIConfidence, &w.Status, &w.HasImage,
			&w.CreatedAt, &w.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		wines = append(wines, w)
	}
	return wines, total, rows.Err()
}

func (r *wineRepo) Update(ctx context.Context, wine *models.Wine) error {
	wine.UpdatedAt = time.Now()
	_, err := r.db.Exec(ctx, `
		UPDATE wines SET
			name=$1, appellation=$2, region=$3, country=$4, producer=$5,
			vintage=$6, color=$7, grape_varieties=$8, alcohol_content=$9,
			description=$10, tasting_notes=$11, food_pairings=$12,
			peak_maturity_start=$13, peak_maturity_end=$14, average_price=$15,
			updated_at=$16
		WHERE id=$17`,
		wine.Name, wine.Appellation, wine.Region, wine.Country, wine.Producer,
		wine.Vintage, wine.Color, wine.GrapeVarieties, wine.AlcoholContent,
		wine.Description, wine.TastingNotes, wine.FoodPairings,
		wine.PeakMaturityStart, wine.PeakMaturityEnd, wine.AveragePrice,
		wine.UpdatedAt, wine.ID,
	)
	return err
}

func (r *wineRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, "DELETE FROM wines WHERE id = $1", id)
	return err
}

// ListPending returns wines with the given status, including their base64-encoded full image.
// Only returns wines still in a pending state (not manually filled by user).
func (r *wineRepo) ListPending(ctx context.Context, status string, limit int) ([]*models.PendingWine, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, name, status, (image IS NOT NULL) as has_image, image, created_at
		FROM wines
		WHERE status = $1
		ORDER BY created_at ASC
		LIMIT $2
	`, status, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*models.PendingWine, 0)
	for rows.Next() {
		pw := &models.PendingWine{}
		var imageData []byte
		if err := rows.Scan(&pw.ID, &pw.Name, &pw.Status, &pw.HasImage, &imageData, &pw.CreatedAt); err != nil {
			return nil, err
		}
		if len(imageData) > 0 {
			pw.ImageBase64 = base64.StdEncoding.EncodeToString(imageData)
		}
		result = append(result, pw)
	}
	return result, rows.Err()
}

// UpdateRecognition applies AI vision recognition results and advances status to "recognized".
func (r *wineRepo) UpdateRecognition(ctx context.Context, id uuid.UUID, req *models.RecognitionUpdateRequest) error {
	_, err := r.db.Exec(ctx, `
		UPDATE wines SET
			name=$1, producer=$2, vintage=$3, appellation=$4, region=$5, country=$6,
			color=$7, grape_varieties=$8, alcohol_content=$9, description=$10,
			ai_confidence=$11, ai_raw_response=$12,
			status='recognized', updated_at=NOW()
		WHERE id=$13`,
		req.Name, req.Producer, req.Vintage, req.Appellation, req.Region, req.Country,
		req.Color, req.GrapeVarieties, req.AlcoholContent, req.Description,
		req.AIConfidence, req.AIRawResponse,
		id,
	)
	return err
}

// UpdateEnrichment applies web search / tasting data and advances status to "enriched".
func (r *wineRepo) UpdateEnrichment(ctx context.Context, id uuid.UUID, req *models.EnrichmentUpdateRequest) error {
	_, err := r.db.Exec(ctx, `
		UPDATE wines SET
			tasting_notes=COALESCE($1, tasting_notes),
			food_pairings=COALESCE($2, food_pairings),
			web_search_data=COALESCE($3, web_search_data),
			peak_maturity_start=COALESCE($4, peak_maturity_start),
			peak_maturity_end=COALESCE($5, peak_maturity_end),
			average_price=COALESCE($6, average_price),
			status='enriched', updated_at=NOW()
		WHERE id=$7`,
		req.TastingNotes, req.FoodPairings, req.WebSearchData,
		req.PeakMaturityStart, req.PeakMaturityEnd, req.AveragePrice,
		id,
	)
	return err
}

// UpdateStatus sets the wine's status field (e.g. "failed", "validated").
func (r *wineRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.Exec(ctx, `UPDATE wines SET status=$1, updated_at=NOW() WHERE id=$2`, status, id)
	return err
}

// generateThumbnail resizes imageData to targetWidth preserving aspect ratio, returns JPEG bytes.
func generateThumbnail(data []byte, targetWidth int) ([]byte, error) {
	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
	}
	bounds := src.Bounds()
	ratio := float64(targetWidth) / float64(bounds.Dx())
	targetHeight := int(float64(bounds.Dy()) * ratio)

	dst := image.NewRGBA(image.Rect(0, 0, targetWidth, targetHeight))
	draw.BiLinear.Scale(dst, dst.Bounds(), src, bounds, draw.Over, nil)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 80}); err != nil {
		return nil, fmt.Errorf("encode thumbnail: %w", err)
	}
	return buf.Bytes(), nil
}

// WineSummaryForAI returns a compact JSON representation of in-cellar wines for the pairing webhook.
func WineSummaryForAI(ctx context.Context, db *pgxpool.Pool) (json.RawMessage, error) {
	rows, err := db.Query(ctx, `
		SELECT w.id, w.name, w.producer, w.vintage, w.color, w.appellation,
			w.food_pairings, ce.quantity
		FROM wines w
		JOIN cellar_entries ce ON ce.wine_id = w.id
		WHERE ce.quantity > 0
		ORDER BY w.name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type entry struct {
		ID           string          `json:"id"`
		Name         string          `json:"name"`
		Producer     string          `json:"producer"`
		Vintage      *int            `json:"vintage,omitempty"`
		Color        string          `json:"color"`
		Appellation  string          `json:"appellation"`
		FoodPairings json.RawMessage `json:"food_pairings"`
		Quantity     int             `json:"quantity"`
	}
	var entries []entry
	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.ID, &e.Name, &e.Producer, &e.Vintage, &e.Color,
			&e.Appellation, &e.FoodPairings, &e.Quantity); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(entries) == 0 {
		return json.RawMessage("[]"), nil
	}
	return json.Marshal(entries)
}
