package repository

import (
	"context"

	"wine-cellar/models"

	"github.com/google/uuid"
)

type WineRepo interface {
	Create(ctx context.Context, wine *models.Wine, imageData []byte) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Wine, error)
	GetImage(ctx context.Context, id uuid.UUID, thumbnail bool) ([]byte, error)
	List(ctx context.Context, filter models.WineFilter) ([]*models.Wine, int, error)
	Update(ctx context.Context, wine *models.Wine) error
	Delete(ctx context.Context, id uuid.UUID) error
	// n8n integration
	ListPending(ctx context.Context, status string, limit int) ([]*models.PendingWine, error)
	UpdateRecognition(ctx context.Context, id uuid.UUID, req *models.RecognitionUpdateRequest) error
	UpdateEnrichment(ctx context.Context, id uuid.UUID, req *models.EnrichmentUpdateRequest) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
}

type CellarRepo interface {
	Add(ctx context.Context, entry *models.CellarEntry) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.CellarEntry, error)
	Update(ctx context.Context, entry *models.CellarEntry) error
	Delete(ctx context.Context, id uuid.UUID) error
	Consume(ctx context.Context, entryID uuid.UUID, req *models.ConsumeRequest) error
	List(ctx context.Context) ([]*models.CellarEntry, error)
	GetStats(ctx context.Context) (*models.CellarStats, error)
	GetRecent(ctx context.Context, limit int) ([]*models.CellarEntry, error)
	GetMaturity(ctx context.Context) ([]*models.MaturityEntry, error)
}

type TastingRepo interface {
	Create(ctx context.Context, note *models.TastingNote) error
	List(ctx context.Context) ([]*models.TastingNote, error)
	GetPending(ctx context.Context) ([]*models.PendingRating, error)
	Update(ctx context.Context, note *models.TastingNote) error
	MarkRated(ctx context.Context, consumptionID uuid.UUID) error
}
