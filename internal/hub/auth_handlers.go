package hub

import (
	"net/http"

	"github.com/pocketbase/pocketbase/core"
)

func (h *Hub) handleGetCurrentUser(e *core.RequestEvent) error {
	if e.Auth == nil {
		return e.JSON(http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
	}
	return e.JSON(http.StatusOK, map[string]any{
		"user": map[string]any{
			"id":    e.Auth.Id,
			"email": e.Auth.GetString("email"),
			"name":  e.Auth.GetString("name"),
		},
	})
}

func (h *Hub) handleGetSetupStatus(e *core.RequestEvent) error {
	if e.Auth == nil {
		return e.JSON(http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
	}
	mustChange := e.Auth.GetBool("mustChangePassword")
	return e.JSON(http.StatusOK, map[string]bool{"needsPasswordChange": mustChange})
}

func (h *Hub) handleChangePassword(e *core.RequestEvent) error {
	if e.Auth == nil {
		return e.JSON(http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
	}

	var req struct {
		Password        string `json:"password"`
		PasswordConfirm string `json:"passwordConfirm"`
	}
	if err := e.BindBody(&req); err != nil || req.Password == "" {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "password required"})
	}

	e.Auth.Set("password", req.Password)
	e.Auth.Set("passwordConfirm", req.PasswordConfirm)
	e.Auth.Set("mustChangePassword", false)

	if err := e.App.Save(e.Auth); err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return e.JSON(http.StatusOK, map[string]bool{"success": true})
}

func (h *Hub) handleGetAppInfo(e *core.RequestEvent) error {
	return e.JSON(http.StatusOK, map[string]string{"mindPath": h.mindBasePath})
}
