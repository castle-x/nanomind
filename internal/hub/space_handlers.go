package hub

import (
	"net/http"

	"github.com/pocketbase/pocketbase/core"
)

func (h *Hub) handleListSpaces(e *core.RequestEvent) error {
	spaces, err := h.spaceService.List()
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, spaces)
}

func (h *Hub) handleCreateSpace(e *core.RequestEvent) error {
	var req struct {
		Name        string `json:"name"`
		Slug        string `json:"slug"`
		Description string `json:"description"`
	}
	if err := e.BindBody(&req); err != nil {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}
	if req.Name == "" || req.Slug == "" {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "name and slug required"})
	}

	space, err := h.spaceService.Create(req.Name, req.Slug, req.Description)
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, space)
}

func (h *Hub) handleUpdateSpace(e *core.RequestEvent) error {
	var req struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Slug        string `json:"slug"`
		Description string `json:"description"`
		Public      bool   `json:"public"`
		IsDefault   bool   `json:"isDefault"`
	}
	if err := e.BindBody(&req); err != nil {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}
	if req.ID == "" {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "id required"})
	}

	space, err := h.spaceService.Update(req.ID, req.Name, req.Slug, req.Description, req.Public, req.IsDefault)
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, space)
}

func (h *Hub) handleDeleteSpace(e *core.RequestEvent) error {
	var req struct {
		ID string `json:"id"`
	}
	if err := e.BindBody(&req); err != nil {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}
	if req.ID == "" {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "id required"})
	}

	if err := h.spaceService.Delete(req.ID); err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, map[string]bool{"success": true})
}

func (h *Hub) handleGetDefaultSpace(e *core.RequestEvent) error {
	space, err := h.spaceService.GetDefaultSpace()
	if err != nil {
		return e.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, space)
}

func (h *Hub) handleGetSpace(e *core.RequestEvent) error {
	var req struct {
		ID string `json:"id"`
	}
	if err := e.BindBody(&req); err != nil {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}
	if req.ID == "" {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "id required"})
	}

	space, err := h.spaceService.GetByID(req.ID)
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, space)
}
