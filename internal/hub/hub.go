package hub

import (
	"fmt"
	"os"
	"path/filepath"

	gopb "github.com/castle-x/goutils/pocketbase"
	"github.com/pocketbase/pocketbase/core"

	"nanomind/internal/service"
)

type Hub struct {
	*gopb.AppServer
	mindBasePath string
	spaceService *service.SpaceService
}

func New(app core.App) *Hub {
	srv := gopb.New(app, gopb.Options{
		DefaultEmail:    "admin@nanomind.local",
		DefaultPassword: "nanomind123",
	})
	return &Hub{AppServer: srv}
}

func (h *Hub) Start() error {
	h.OnServe().BindFunc(func(e *core.ServeEvent) error {
		h.mindBasePath = h.resolveMindBasePath()
		if err := os.MkdirAll(h.mindBasePath, 0755); err != nil {
			return err
		}
		h.spaceService = service.NewSpaceService(h.AppServer, h.mindBasePath)

		h.RegisterSetupRoutes(e)
		h.registerRoutes(e)
		h.EnsureDefaults()
		h.serveFrontend(e)

		h.Logger().Info("NanoMind ready", "mind", h.mindBasePath)
		return e.Next()
	})

	return h.AppServer.Start()
}

func (h *Hub) resolveMindBasePath() string {
	if p := os.Getenv("MIND_PATH"); p != "" {
		abs, _ := filepath.Abs(p)
		return abs
	}
	return filepath.Join(h.DataDir(), "mind")
}

func (h *Hub) fileServiceForSpace(spaceID string) (*service.FileService, error) {
	space, err := h.spaceService.GetByID(spaceID)
	if err != nil {
		return nil, err
	}
	return service.NewFileService(space.Path), nil
}

func (h *Hub) docsServiceForSpace(spaceSlug string) (*service.DocsService, error) {
	space, err := h.spaceService.GetBySlug(spaceSlug)
	if err != nil {
		return nil, err
	}
	if !space.Public {
		return nil, fmt.Errorf("space not found")
	}
	return service.NewDocsService(space.Path), nil
}
