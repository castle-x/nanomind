package hub

import (
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

func (h *Hub) registerRoutes(se *core.ServeEvent) {
	docs := se.Router.Group("/api/docs/v1")
	docs.POST("/GetConfig", h.handleGetDocsConfig)
	docs.POST("/GetPage", h.handleGetDocsPage)

	api := se.Router.Group("/api")
	api.Bind(apis.RequireAuth())

	// File service
	api.POST("/files/v1/GetTree", h.handleGetTree)
	api.POST("/files/v1/GetFile", h.handleGetFile)
	api.POST("/files/v1/SaveFile", h.handleSaveFile)
	api.POST("/files/v1/CreateFile", h.handleCreateFile)
	api.POST("/files/v1/DeleteFile", h.handleDeleteFile)
	api.POST("/files/v1/RenameFile", h.handleRenameFile)

	// Search service
	api.POST("/search/v1/Search", h.handleSearch)

	// Auth service
	api.POST("/auth/v1/GetCurrentUser", h.handleGetCurrentUser)
	api.POST("/auth/v1/GetSetupStatus", h.handleGetSetupStatus)
	api.POST("/auth/v1/ChangePassword", h.handleChangePassword)
	api.POST("/auth/v1/GetAppInfo", h.handleGetAppInfo)
}
