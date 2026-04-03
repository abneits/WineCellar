package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"wine-cellar/handlers"
	"wine-cellar/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockTastingRepo struct {
	notes   []*models.TastingNote
	pending []*models.PendingRating
}

func (m *mockTastingRepo) Create(_ context.Context, n *models.TastingNote) error {
	n.ID = uuid.New()
	m.notes = append(m.notes, n)
	return nil
}
func (m *mockTastingRepo) List(_ context.Context) ([]*models.TastingNote, error) {
	return m.notes, nil
}
func (m *mockTastingRepo) GetPending(_ context.Context) ([]*models.PendingRating, error) {
	return m.pending, nil
}
func (m *mockTastingRepo) Update(_ context.Context, _ *models.TastingNote) error { return nil }
func (m *mockTastingRepo) MarkRated(_ context.Context, _ uuid.UUID) error        { return nil }

func TestTastingHandler_Create(t *testing.T) {
	repo := &mockTastingRepo{}
	h := handlers.NewTastingHandler(repo)
	r := chi.NewRouter()
	r.Post("/api/tastings", h.Create)

	body, _ := json.Marshal(models.CreateTastingRequest{
		WineID:  uuid.New(),
		Rating:  4,
		Comment: "Excellent balance",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/tastings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	assert.Len(t, repo.notes, 1)
	assert.Equal(t, 4, repo.notes[0].Rating)
}

func TestTastingHandler_Pending(t *testing.T) {
	wineID := uuid.New()
	repo := &mockTastingRepo{
		pending: []*models.PendingRating{
			{ConsumptionID: uuid.New(), WineID: wineID, WineName: "Test Wine"},
		},
	}
	h := handlers.NewTastingHandler(repo)
	r := chi.NewRouter()
	r.Get("/api/tastings/pending", h.Pending)

	req := httptest.NewRequest(http.MethodGet, "/api/tastings/pending", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var result []*models.PendingRating
	require.NoError(t, json.NewDecoder(w.Body).Decode(&result))
	assert.Len(t, result, 1)
}
