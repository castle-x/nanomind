package hub

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
	"github.com/pocketbase/pocketbase/tools/types"

	"nanomind/internal/service"
)

func TestDocsRoutes(t *testing.T) {
	root := t.TempDir()
	spaceDir := filepath.Join(root, "testspaceid0001")
	mustWriteDocsHubFixture(t, spaceDir)

	newScenario := func(name, url string, body string, expectedStatus int, expectedContent []string) tests.ApiScenario {
		return tests.ApiScenario{
			Name:   name,
			Method: http.MethodPost,
			URL:    url,
			Body:   strings.NewReader(body),
			BeforeTestFunc: func(t testing.TB, app *tests.TestApp, e *core.ServeEvent) {
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
				if err := app.Save(spaces); err != nil {
					t.Fatalf("failed to create spaces collection: %v", err)
				}

				// Create a public test space
				col, _ := app.FindCollectionByNameOrId("spaces")
				record := core.NewRecord(col)
				record.Id = "testspaceid0001"
				record.Set("name", "Test Space")
				record.Set("slug", "test")
				record.Set("public", true)
				record.Set("is_default", true)
				if err := app.Save(record); err != nil {
					t.Fatalf("failed to create space record: %v", err)
				}

				h := &Hub{
					spaceService: service.NewSpaceService(app, root),
				}
				h.registerRoutes(e)
			},
			ExpectedStatus:  expectedStatus,
			ExpectedContent: expectedContent,
		}
	}

	scenarios := []tests.ApiScenario{
		newScenario(
			"GetConfig returns public docs config",
			"/api/docs/v1/GetConfig",
			`{"spaceSlug":"test"}`,
			http.StatusOK,
			[]string{`"title":"NanoMind Docs"`, `"homepage":"index"`, `"key":"start"`},
		),
		newScenario(
			"GetPage returns public docs page",
			"/api/docs/v1/GetPage",
			`{"spaceSlug":"test","id":"start/getting-started"}`,
			http.StatusOK,
			[]string{`"id":"start/getting-started"`, `"title":"Getting Started"`, `"content":"# Getting Started`},
		),
		newScenario(
			"GetPage requires spaceSlug and id",
			"/api/docs/v1/GetPage",
			`{}`,
			http.StatusBadRequest,
			[]string{`"error":"spaceSlug and id required"`},
		),
		newScenario(
			"GetPage rejects invalid traversal id",
			"/api/docs/v1/GetPage",
			`{"spaceSlug":"test","id":"../secrets"}`,
			http.StatusNotFound,
			[]string{`"error":"invalid page id"`},
		),
		newScenario(
			"GetConfig rejects non-public space",
			"/api/docs/v1/GetConfig",
			`{"spaceSlug":"nonexistent"}`,
			http.StatusNotFound,
			[]string{`"error"`},
		),
	}

	for _, scenario := range scenarios {
		scenario.Test(t)
	}
}

func mustWriteDocsHubFixture(t *testing.T, root string) {
	t.Helper()
	mustWriteDocsHubFile(t, filepath.Join(root, "docs.json"), `{
  "site": {
    "title": "NanoMind Docs",
    "root": "docs",
    "homepage": "index",
    "defaultLayout": "docs",
    "defaultContentMode": "centered"
  },
  "tabs": [
    {
      "key": "start",
      "label": "Get started",
      "groups": [
        {
          "key": "home",
          "label": "Home",
          "pages": [
            {"id": "index", "title": "Introduction"}
          ]
        },
        {
          "key": "first-steps",
          "label": "First steps",
          "pages": [
            {"id": "start/getting-started", "title": "Getting Started"}
          ]
        }
      ]
    }
  ]
}`)
	mustWriteDocsHubFile(t, filepath.Join(root, "index.md"), "# Home\n")
	mustWriteDocsHubFile(t, filepath.Join(root, "start", "getting-started.md"), "# Getting Started\n\nHello docs.\n")
}

func mustWriteDocsHubFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir failed: %v", err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write failed: %v", err)
	}
}
