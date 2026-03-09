package hub

import (
	"os"
	"path/filepath"

	gopb "github.com/castle-x/go-pocketbase"
	"github.com/pocketbase/pocketbase/core"

	"nanomind/internal/service"
)

type Hub struct {
	*gopb.AppServer
	mindPath    string
	fileService *service.FileService
	docsService *service.DocsService
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
		h.mindPath = h.resolveMindPath()
		if err := os.MkdirAll(h.mindPath, 0755); err != nil {
			return err
		}
		h.fileService = service.NewFileService(h.mindPath)
		h.docsService = service.NewDocsService(h.mindPath)

		h.RegisterSetupRoutes(e)
		h.registerRoutes(e)
		h.EnsureDefaults()
		h.serveFrontend(e)

		h.Logger().Info("NanoMind ready", "mind", h.mindPath)
		return e.Next()
	})

	return h.AppServer.Start()
}

func (h *Hub) resolveMindPath() string {
	if p := os.Getenv("MIND_PATH"); p != "" {
		abs, _ := filepath.Abs(p)
		return abs
	}
	return filepath.Join(h.DataDir(), "mind")
}
