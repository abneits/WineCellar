package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
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

type mockCellarRepo struct {
	entries  []*models.CellarEntry
	stats    *models.CellarStats
	consumed bool
}

func (m *mockCellarRepo) Add(_ context.Context, e *models.CellarEntry) error {
	e.ID = uuid.New()
	m.entries = append(m.entries, e)
	return nil
}
func (m *mockCellarRepo) GetByID(_ context.Context, id uuid.UUID) (*models.CellarEntry, error) {
	for _, e := range m.entries {
		if e.ID == id {
			return e, nil
		}
	}
	return nil, fmt.Errorf("not found")
}
func (m *mockCellarRepo) Update(_ context.Context, _ *models.CellarEntry) error { return nil }
func (m *mockCellarRepo) Delete(_ context.Context, _ uuid.UUID) error           { return nil }
func (m *mockCellarRepo) Consume(_ context.Context, _ uuid.UUID, _ *models.ConsumeRequest) error {
	m.consumed = true
	return nil
}
func (m *mockCellarRepo) List(_ context.Context) ([]*models.CellarEntry, error) {
	return m.entries, nil
}
func (m *mockCellarRepo) GetStats(_ context.Context) (*models.CellarStats, error) {
	return m.stats, nil
}
func (m *mockCellarRepo) GetRecent(_ context.Context, _ int) ([]*models.CellarEntry, error) {
	return m.entries, nil
}
func (m *mockCellarRepo) GetMaturity(_ context.Context) ([]*models.MaturityEntry, error) {
	return nil, nil
}

func TestCellarHandler_Add(t *testing.T) {
	repo := &mockCellarRepo{}
	h := handlers.NewCellarHandler(repo)
	r := chi.NewRouter()
	r.Post("/api/cellar", h.Add)

	body, _ := json.Marshal(models.AddToCellarRequest{
		WineID:   uuid.New(),
		Quantity: 3,
		Location: "Rack A",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/cellar", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	assert.Len(t, repo.entries, 1)
	assert.Equal(t, 3, repo.entries[0].Quantity)
}

func TestCellarHandler_Consume(t *testing.T) {
	entryID := uuid.New()
	repo := &mockCellarRepo{entries: []*models.CellarEntry{{ID: entryID, Quantity: 5}}}
	h := handlers.NewCellarHandler(repo)
	r := chi.NewRouter()
	r.Post("/api/cellar/{id}/consume", h.Consume)

	body, _ := json.Marshal(models.ConsumeRequest{Quantity: 2, Occasion: "dinner"})
	req := httptest.NewRequest(http.MethodPost, "/api/cellar/"+entryID.String()+"/consume", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.True(t, repo.consumed)
}

var _ = require.New // ensure require is used
