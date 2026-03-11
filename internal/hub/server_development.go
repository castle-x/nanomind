//go:build development

package hub

import (
	gopb "github.com/castle-x/goutils/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func (h *Hub) serveFrontend(se *core.ServeEvent) {
	gopb.ServeDevProxy(se, "localhost:5173")
}
