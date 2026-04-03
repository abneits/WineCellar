package config_test

import (
	"testing"

	"wine-cellar/config"
	"github.com/stretchr/testify/assert"
)

func TestLoad(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/winecellar")
	t.Setenv("N8N_PAIRING_WEBHOOK_URL", "http://n8n:5678/webhook/pairing")
	t.Setenv("SERVER_PORT", "8080")
	t.Setenv("CORS_ORIGINS", "http://localhost:3000")
	t.Setenv("MAX_IMAGE_SIZE_MB", "10")

	cfg := config.Load()

	assert.Equal(t, "postgres://user:pass@localhost:5432/winecellar", cfg.DatabaseURL)
	assert.Equal(t, "http://n8n:5678/webhook/pairing", cfg.N8NPairingWebhookURL)
	assert.Equal(t, "8080", cfg.ServerPort)
	assert.Equal(t, "http://localhost:3000", cfg.CORSOrigins)
	assert.Equal(t, 10, cfg.MaxImageSizeMB)
}

func TestLoad_Defaults(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://x")

	cfg := config.Load()

	assert.Equal(t, "8080", cfg.ServerPort)
	assert.Equal(t, 10, cfg.MaxImageSizeMB)
	assert.Equal(t, "./static", cfg.StaticDir)
}
