package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"wine-cellar/config"
	"wine-cellar/handlers"
	appMiddleware "wine-cellar/middleware"
	"wine-cellar/repository"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
)

func main() {
	cfg := config.Load()
	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	ctx := context.Background()

	// Database
	pool, err := repository.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect to database: %v", err)
	}
	defer pool.Close()

	// Migrations
	migrationsDir := "migrations"
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		// Fallback for running from source directory
		migrationsDir = filepath.Join(filepath.Dir(os.Args[0]), "migrations")
	}
	if err := repository.RunMigrations(ctx, pool, migrationsDir); err != nil {
		log.Fatalf("run migrations: %v", err)
	}
	log.Println("Migrations applied successfully")

	// Repositories
	wineRepo := repository.NewWineRepo(pool)
	cellarRepo := repository.NewCellarRepo(pool)
	tastingRepo := repository.NewTastingRepo(pool)

	// Handlers
	wineHandler := handlers.NewWineHandler(wineRepo, cfg.MaxImageSizeMB)
	cellarHandler := handlers.NewCellarHandler(cellarRepo)
	tastingHandler := handlers.NewTastingHandler(tastingRepo)
	aiHandler := handlers.NewAIHandler(cfg.N8NPairingWebhookURL, pool)

	// Router
	r := chi.NewRouter()
	r.Use(chiMiddleware.Recoverer)
	r.Use(appMiddleware.Logger)
	r.Use(appMiddleware.CORS(cfg.CORSOrigins))

	r.Route("/api", func(r chi.Router) {
		// Wines
		r.Post("/wines/scan", wineHandler.Scan)
		r.Post("/wines/with-image", wineHandler.CreateWithImage)
		r.Get("/wines/pending", wineHandler.Pending)
		r.Get("/wines", wineHandler.List)
		r.Post("/wines", wineHandler.Create)
		r.Get("/wines/{id}", wineHandler.Get)
		r.Put("/wines/{id}", wineHandler.Update)
		r.Delete("/wines/{id}", wineHandler.Delete)
		r.Get("/wines/{id}/image", wineHandler.GetImage)
		// n8n callbacks
		r.Put("/wines/{id}/recognition", wineHandler.UpdateRecognition)
		r.Put("/wines/{id}/enrichment", wineHandler.UpdateEnrichment)
		r.Put("/wines/{id}/status", wineHandler.UpdateStatus)

		// Cellar
		r.Post("/cellar", cellarHandler.Add)
		r.Get("/cellar", cellarHandler.List)
		r.Get("/cellar/stats", cellarHandler.Stats)
		r.Get("/cellar/recent", cellarHandler.Recent)
		r.Get("/cellar/maturity", cellarHandler.Maturity)
		r.Get("/cellar/{id}", cellarHandler.GetByID)
		r.Put("/cellar/{id}", cellarHandler.Update)
		r.Delete("/cellar/{id}", cellarHandler.Delete)
		r.Post("/cellar/{id}/consume", cellarHandler.Consume)

		// Tastings
		r.Post("/tastings", tastingHandler.Create)
		r.Get("/tastings", tastingHandler.List)
		r.Get("/tastings/pending", tastingHandler.Pending)
		r.Put("/tastings/{id}", tastingHandler.Update)

		// AI (proxied to n8n)
		r.Post("/ai/pairing", aiHandler.Pairing)
	})

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// Serve Next.js static export for all non-API routes
	r.Handle("/*", staticFileHandler(cfg.StaticDir))

	log.Printf("Server starting on :%s (static files from %s)", cfg.ServerPort, cfg.StaticDir)
	if err := http.ListenAndServe(":"+cfg.ServerPort, r); err != nil {
		log.Fatal(err)
	}
}

// staticFileHandler serves Next.js static export files.
// Tries: exact path → path.html → path/index.html → 404.
func staticFileHandler(dir string) http.Handler {
	fs := http.FileServer(http.Dir(dir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(dir, filepath.Clean("/"+r.URL.Path))

		// Exact file exists
		if fi, err := os.Stat(path); err == nil && !fi.IsDir() {
			fs.ServeHTTP(w, r)
			return
		}

		// Try path.html (Next.js static export generates /page.html)
		if _, err := os.Stat(path + ".html"); err == nil {
			http.ServeFile(w, r, path+".html")
			return
		}

		// Try path/index.html
		if _, err := os.Stat(filepath.Join(path, "index.html")); err == nil {
			http.ServeFile(w, r, filepath.Join(path, "index.html"))
			return
		}

		http.NotFound(w, r)
	})
}
