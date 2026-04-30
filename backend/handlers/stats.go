package handlers

import (
	"log"
	"net/http"

	"wine-cellar/repository"
)

type StatsHandler struct {
	repo repository.StatsRepo
}

func NewStatsHandler(repo repository.StatsRepo) *StatsHandler {
	return &StatsHandler{repo: repo}
}

func (h *StatsHandler) Get(w http.ResponseWriter, r *http.Request) {
	stats, err := h.repo.GetStats(r.Context())
	if err != nil {
		log.Printf("ERROR get stats: %v", err)
		jsonError(w, "failed to fetch stats", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, stats)
}
