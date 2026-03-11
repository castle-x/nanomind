//go:build !development

package hub

import (
	gopb "github.com/castle-x/goutils/pocketbase"
	"github.com/pocketbase/pocketbase/core"

	"nanomind/site"
)

func (h *Hub) serveFrontend(se *core.ServeEvent) {
	gopb.ServeSPA(se, site.DistDirFS, []string{"/static/", "/assets/"})
}
