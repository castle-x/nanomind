package hub

import (
	"net/http"

	"github.com/pocketbase/pocketbase/core"
)

func (h *Hub) handleGetDocsConfig(e *core.RequestEvent) error {
	var req struct {
		SpaceSlug string `json:"spaceSlug"`
	}
	if err := e.BindBody(&req); err != nil || req.SpaceSlug == "" {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "spaceSlug required"})
	}

	ds, err := h.docsServiceForSpace(req.SpaceSlug)
	if err != nil {
		return e.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	}

	config, err := ds.GetConfig()
	if err != nil {
		return e.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, config)
}

func (h *Hub) handleGetDocsPage(e *core.RequestEvent) error {
	var req struct {
		SpaceSlug string `json:"spaceSlug"`
		ID        string `json:"id"`
	}
	if err := e.BindBody(&req); err != nil || req.SpaceSlug == "" || req.ID == "" {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "spaceSlug and id required"})
	}

	ds, err := h.docsServiceForSpace(req.SpaceSlug)
	if err != nil {
		return e.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	}

	page, err := ds.GetPage(req.ID)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "page not found" || err.Error() == "invalid page id" {
			status = http.StatusNotFound
		}
		return e.JSON(status, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, page)
}
