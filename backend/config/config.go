package config

import (
	"os"
	"strconv"
)

type Config struct {
	DatabaseURL          string
	N8NPairingWebhookURL string
	StaticDir            string
	ServerPort           string
	CORSOrigins          string
	MaxImageSizeMB       int
}

func Load() *Config {
	maxSize, _ := strconv.Atoi(getEnv("MAX_IMAGE_SIZE_MB", "10"))
	return &Config{
		DatabaseURL:          getEnv("DATABASE_URL", ""),
		N8NPairingWebhookURL: getEnv("N8N_PAIRING_WEBHOOK_URL", ""),
		StaticDir:            getEnv("STATIC_DIR", "./static"),
		ServerPort:           getEnv("SERVER_PORT", "8080"),
		CORSOrigins:          getEnv("CORS_ORIGINS", "*"),
		MaxImageSizeMB:       maxSize,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
