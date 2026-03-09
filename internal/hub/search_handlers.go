package hub

import (
	"net/http"

	"github.com/pocketbase/pocketbase/core"
)

func (h *Hub) handleSearch(e *core.RequestEvent) error {
	var req struct {
		Query string `json:"query"`
	}
	if err := e.BindBody(&req); err != nil {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}

	results := h.fileService.Search(req.Query)
	return e.JSON(http.StatusOK, results)
}
