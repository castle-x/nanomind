package hub

import (
	"net/http"

	"github.com/pocketbase/pocketbase/core"
)

func (h *Hub) handleSearch(e *core.RequestEvent) error {
	var req struct {
		SpaceID string `json:"spaceId"`
		Query   string `json:"query"`
	}
	if err := e.BindBody(&req); err != nil || req.SpaceID == "" {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "spaceId required"})
	}

	fs, err := h.fileServiceForSpace(req.SpaceID)
	if err != nil {
		return e.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	}

	results := fs.Search(req.Query)
	return e.JSON(http.StatusOK, results)
}
