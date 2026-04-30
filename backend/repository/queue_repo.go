package repository

import (
	"context"
	"encoding/base64"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Prompts for wine tasks — English for better model compatibility.

const wineDetectionSystemPrompt = `You are a wine expert. Analyze this bottle label image and return ONLY valid JSON with the following fields:
- name (string)
- producer (string)
- vintage (integer or null)
- appellation (string)
- region (string)
- country (string)
- color (must be one of: red, white, rosé, sparkling, dessert, orange, yellow)
- grape_varieties (array of strings)
- alcohol_content (float or null)
- description (string)
- ai_confidence (float between 0 and 1, reflecting your confidence in the identification)

Return ONLY the JSON object. No explanation, no markdown, no code block.`

const wineEnrichmentSystemPrompt = `You are a wine expert with access to a web search tool.
Use the search tool to find accurate information about the wine provided, then return ONLY valid JSON with the following fields:
- tasting_notes (object with keys: nose, palate, finish — all strings)
- food_pairings (array of strings, e.g. ["grilled lamb", "aged cheese"])
- peak_maturity_start (integer year or null)
- peak_maturity_end (integer year or null)
- enrichment_confidence (float between 0 and 1, reflecting your confidence in the data found)

Return ONLY the JSON object. No explanation, no markdown, no code block.`

// QueueTask holds the data needed to insert a task into the shared llm_queue table.
type QueueTask struct {
	Project      string
	TaskType     string
	RefID        uuid.UUID
	SystemPrompt string
	UserPrompt   string
	CallbackURL  string
	MaxRetries   int
	Priority     int // 1 (most urgent) to 10 (least urgent); defaults to 5
}

// QueueRepo inserts tasks into the shared llm_queue database.
type QueueRepo interface {
	InsertTask(ctx context.Context, task QueueTask) error
}

type queueRepo struct {
	db *pgxpool.Pool
}

// NewQueuePool creates a dedicated connection pool for the shared queue database.
func NewQueuePool(ctx context.Context, url string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("connect to queue database: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping queue database: %w", err)
	}
	return pool, nil
}

// NewQueueRepo creates a QueueRepo backed by the shared queue database pool.
func NewQueueRepo(db *pgxpool.Pool) QueueRepo {
	return &queueRepo{db: db}
}

func (r *queueRepo) InsertTask(ctx context.Context, task QueueTask) error {
	if task.MaxRetries <= 0 {
		task.MaxRetries = 3
	}
	if task.Priority <= 0 {
		task.Priority = 5
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO llm_queue (
			project, task_type, ref_id,
			system_prompt, user_prompt,
			callback_url, max_retries, priority
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		task.Project, task.TaskType, task.RefID,
		task.SystemPrompt, task.UserPrompt,
		task.CallbackURL, task.MaxRetries, task.Priority,
	)
	if err != nil {
		return fmt.Errorf("insert llm_queue task: %w", err)
	}
	return nil
}

// WineDetectionTask builds a wine_detection QueueTask from raw image bytes.
func WineDetectionTask(wineID uuid.UUID, imageData []byte, appBaseURL string) QueueTask {
	userPrompt := fmt.Sprintf(
		"Analyze this wine label: data:image/jpeg;base64,%s",
		base64.StdEncoding.EncodeToString(imageData),
	)
	return QueueTask{
		Project:      "wine-cellar",
		TaskType:     "wine_detection",
		RefID:        wineID,
		SystemPrompt: wineDetectionSystemPrompt,
		UserPrompt:   userPrompt,
		CallbackURL:  fmt.Sprintf("%s/api/wines/%s/recognition", appBaseURL, wineID),
		Priority:     10,
	}
}

// WineEnrichmentTask builds a wine_enrichment QueueTask from recognition data.
func WineEnrichmentTask(wineID uuid.UUID, name, producer, appellation, region, country string, vintage *int, appBaseURL string) QueueTask {
	vintageStr := "unknown"
	if vintage != nil {
		vintageStr = fmt.Sprintf("%d", *vintage)
	}
	userPrompt := fmt.Sprintf(
		`Search for: "%s %s %s %s wine tasting notes food pairing"`+"\n"+
			`Wine details: name=%s, producer=%s, vintage=%s, appellation=%s, region=%s, country=%s`,
		name, vintageStr, appellation, producer,
		name, producer, vintageStr, appellation, region, country,
	)
	return QueueTask{
		Project:      "wine-cellar",
		TaskType:     "wine_enrichment",
		RefID:        wineID,
		SystemPrompt: wineEnrichmentSystemPrompt,
		UserPrompt:   userPrompt,
		CallbackURL:  fmt.Sprintf("%s/api/wines/%s/enrichment", appBaseURL, wineID),
		Priority:     10,
	}
}
