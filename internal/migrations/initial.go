package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
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
		return app.Save(usersCol)
	}, nil)
}
