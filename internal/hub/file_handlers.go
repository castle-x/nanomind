package hub

import (
	"net/http"

	"github.com/pocketbase/pocketbase/core"
)

func (h *Hub) handleGetTree(e *core.RequestEvent) error {
	tree := h.fileService.GetTree()
	return e.JSON(http.StatusOK, tree)
}

func (h *Hub) handleGetFile(e *core.RequestEvent) error {
	var req struct {
		Path string `json:"path"`
	}
	if err := e.BindBody(&req); err != nil || req.Path == "" {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "path required"})
	}

	resp, err := h.fileService.ReadFile(req.Path)
	if err != nil {
		return e.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, resp)
}

func (h *Hub) handleSaveFile(e *core.RequestEvent) error {
	var req struct {
		Path    string `json:"path"`
		Content string `json:"content"`
	}
	if err := e.BindBody(&req); err != nil || req.Path == "" {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "path and content required"})
	}

	if err := h.fileService.SaveFile(req.Path, req.Content); err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, map[string]any{"success": true, "path": req.Path})
}

func (h *Hub) handleCreateFile(e *core.RequestEvent) error {
	var req struct {
		Path string `json:"path"`
		Type string `json:"type"`
		Name string `json:"name"`
	}
	if err := e.BindBody(&req); err != nil {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}

	relativePath, err := h.fileService.CreateFile(req.Path, req.Name, req.Type)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "file or directory already exists" {
			status = http.StatusConflict
		} else if err.Error() == "access denied" {
			status = http.StatusForbidden
		}
		return e.JSON(status, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, map[string]any{"success": true, "path": relativePath})
}

func (h *Hub) handleDeleteFile(e *core.RequestEvent) error {
	var req struct {
		Path string `json:"path"`
	}
	if err := e.BindBody(&req); err != nil || req.Path == "" {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "path required"})
	}

	if err := h.fileService.DeleteFile(req.Path); err != nil {
		return e.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, map[string]any{"success": true})
}

func (h *Hub) handleRenameFile(e *core.RequestEvent) error {
	var req struct {
		Path    string `json:"path"`
		NewName string `json:"new_name"`
	}
	if err := e.BindBody(&req); err != nil || req.Path == "" || req.NewName == "" {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "path and new_name required"})
	}

	newRelPath, err := h.fileService.RenameFile(req.Path, req.NewName)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "file not found" {
			status = http.StatusNotFound
		} else if err.Error() == "target already exists" {
			status = http.StatusConflict
		}
		return e.JSON(status, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, map[string]any{"success": true, "path": newRelPath})
}
