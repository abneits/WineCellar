package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"wine-cellar/handlers"
	"wine-cellar/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockWineRepo implements repository.WineRepo for testing
type mockWineRepo struct {
	wines   []*models.Wine
	images  map[uuid.UUID][]byte
	pending []*models.PendingWine
}

func (m *mockWineRepo) Create(_ context.Context, wine *models.Wine, _ []byte) error {
	wine.ID = uuid.New()
	m.wines = append(m.wines, wine)
	return nil
}
func (m *mockWineRepo) GetByID(_ context.Context, id uuid.UUID) (*models.Wine, error) {
	for _, w := range m.wines {
		if w.ID == id {
			return w, nil
		}
	}
	return nil, fmt.Errorf("not found")
}
func (m *mockWineRepo) GetImage(_ context.Context, id uuid.UUID, _ bool) ([]byte, error) {
	return m.images[id], nil
}
func (m *mockWineRepo) List(_ context.Context, _ models.WineFilter) ([]*models.Wine, int, error) {
	return m.wines, len(m.wines), nil
}
func (m *mockWineRepo) Update(_ context.Context, wine *models.Wine) error { return nil }
func (m *mockWineRepo) Delete(_ context.Context, id uuid.UUID) error      { return nil }
func (m *mockWineRepo) ListPending(_ context.Context, _ string, _ int) ([]*models.PendingWine, error) {
	return m.pending, nil
}
func (m *mockWineRepo) UpdateRecognition(_ context.Context, _ uuid.UUID, _ *models.RecognitionUpdateRequest) error {
	return nil
}
func (m *mockWineRepo) UpdateEnrichment(_ context.Context, _ uuid.UUID, _ *models.EnrichmentUpdateRequest) error {
	return nil
}
func (m *mockWineRepo) UpdateStatus(_ context.Context, _ uuid.UUID, _ string) error { return nil }

func TestWineHandler_List(t *testing.T) {
	repo := &mockWineRepo{wines: []*models.Wine{
		{ID: uuid.New(), Name: "Test Wine", Color: "red", Status: "validated"},
	}}
	h := handlers.NewWineHandler(repo, 10)

	r := chi.NewRouter()
	r.Get("/api/wines", h.List)

	req := httptest.NewRequest(http.MethodGet, "/api/wines", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, float64(1), resp["total"])
}

func TestWineHandler_Scan_QueuesBottle(t *testing.T) {
	repo := &mockWineRepo{}
	h := handlers.NewWineHandler(repo, 10)

	r := chi.NewRouter()
	r.Post("/api/wines/scan", h.Scan)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, _ := writer.CreateFormFile("image", "bottle.jpg")
	part.Write([]byte("fake-jpeg-data"))
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/wines/scan", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var result models.ScanQueuedResponse
	require.NoError(t, json.NewDecoder(w.Body).Decode(&result))
	assert.Equal(t, "pending_recognition", result.Status)
	assert.NotEqual(t, uuid.Nil, result.ID)
	// Wine was created in repo
	require.Len(t, repo.wines, 1)
	assert.Equal(t, "pending_recognition", repo.wines[0].Status)
}

func TestWineHandler_Pending(t *testing.T) {
	repo := &mockWineRepo{
		pending: []*models.PendingWine{
			{ID: uuid.New(), Status: "pending_recognition", HasImage: true, CreatedAt: time.Now()},
		},
	}
	h := handlers.NewWineHandler(repo, 10)

	r := chi.NewRouter()
	r.Get("/api/wines/pending", h.Pending)

	req := httptest.NewRequest(http.MethodGet, "/api/wines/pending?status=pending_recognition&limit=5", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var result []*models.PendingWine
	require.NoError(t, json.NewDecoder(w.Body).Decode(&result))
	assert.Len(t, result, 1)
}

func TestWineHandler_UpdateRecognition(t *testing.T) {
	id := uuid.New()
	repo := &mockWineRepo{wines: []*models.Wine{
		{ID: id, Name: "", Status: "pending_recognition"},
	}}
	h := handlers.NewWineHandler(repo, 10)

	r := chi.NewRouter()
	r.Put("/api/wines/{id}/recognition", h.UpdateRecognition)

	payload := models.RecognitionUpdateRequest{
		Name:    "Château Margaux",
		Color:   "red",
		Country: "France",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPut, "/api/wines/"+id.String()+"/recognition", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestWineHandler_UpdateStatus(t *testing.T) {
	id := uuid.New()
	repo := &mockWineRepo{wines: []*models.Wine{
		{ID: id, Status: "pending_recognition"},
	}}
	h := handlers.NewWineHandler(repo, 10)

	r := chi.NewRouter()
	r.Put("/api/wines/{id}/status", h.UpdateStatus)

	payload := models.StatusUpdateRequest{Status: "failed"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPut, "/api/wines/"+id.String()+"/status", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}
