package setup

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		settings := app.Settings()
		settings.Meta.AppName = "NanoMind"
		settings.Meta.HideControls = false
		settings.Logs.MinLevel = 4
		if err := app.Save(settings); err != nil {
			return err
		}

		usersCol, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		usersCol.PasswordAuth.Enabled = true
		usersCol.PasswordAuth.IdentityFields = []string{"email"}
		if err := app.Save(usersCol); err != nil {
			return err
		}

		// Create spaces collection
		spaces := core.NewBaseCollection("spaces")
		spaces.Fields.Add(
			&core.TextField{Name: "name", Required: true, Max: 100},
			&core.TextField{Name: "slug", Required: true, Max: 50},
			&core.TextField{Name: "description", Max: 500},
			&core.BoolField{Name: "public"},
			&core.BoolField{Name: "is_default"},
			&core.TextField{Name: "custom_domain", Max: 200},
			&core.JSONField{Name: "meta"},
		)
		spaces.Indexes = types.JSONArray[string]{
			"CREATE UNIQUE INDEX idx_spaces_slug ON spaces (slug)",
		}
		return app.Save(spaces)
	}, nil)
}
