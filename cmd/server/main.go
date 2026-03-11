package main

import (
	"log"
	"os"
	"path/filepath"

	"nanomind/internal/hub"
	_ "nanomind/internal/setup"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

func main() {
	isDev := os.Getenv("ENV") == "dev"

	app := pocketbase.NewWithConfig(pocketbase.Config{
		DefaultDataDir: getDataDir(),
		DefaultDev:     isDev,
	})

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: isDev,
		Dir:         "internal/setup",
	})

	h := hub.New(app)
	if err := h.Start(); err != nil {
		log.Fatal(err)
	}
}

func getDataDir() string {
	if dir := os.Getenv("DATA_DIR"); dir != "" {
		return dir
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "nanomind_data"
	}
	return filepath.Join(home, ".nanomind")
}
