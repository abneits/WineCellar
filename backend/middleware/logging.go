package middleware

import (
	"log"
	"net/http"
	"time"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// Logger logs method, path, status, and duration for each request.
// Errors (4xx/5xx) are logged at ERROR level for easier grep.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rw, r)
		if rw.statusCode >= 400 {
			log.Printf("ERROR %s %s %d %s", r.Method, r.URL.Path, rw.statusCode, time.Since(start))
		} else {
			log.Printf("%s %s %d %s", r.Method, r.URL.Path, rw.statusCode, time.Since(start))
		}
	})
}
