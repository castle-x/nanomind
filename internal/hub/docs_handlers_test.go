package hub

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"

	"nanomind/internal/service"
)

func TestDocsRoutes(t *testing.T) {
	root := t.TempDir()
	mustWriteDocsHubFixture(t, root)

	newScenario := func(name, url string, body string, expectedStatus int, expectedContent []string) tests.ApiScenario {
		return tests.ApiScenario{
			Name:   name,
			Method: http.MethodPost,
			URL:    url,
			Body:   strings.NewReader(body),
			BeforeTestFunc: func(t testing.TB, _ *tests.TestApp, e *core.ServeEvent) {
				h := &Hub{docsService: service.NewDocsService(root)}
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
			`{}`,
			http.StatusOK,
			[]string{`"title":"NanoMind Docs"`, `"homepage":"index"`, `"key":"start"`},
		),
		newScenario(
			"GetPage returns public docs page",
			"/api/docs/v1/GetPage",
			`{"id":"start/getting-started"}`,
			http.StatusOK,
			[]string{`"id":"start/getting-started"`, `"title":"Getting Started"`, `"content":"# Getting Started`},
		),
		newScenario(
			"GetPage requires id body field",
			"/api/docs/v1/GetPage",
			`{}`,
			http.StatusBadRequest,
			[]string{`"error":"id required"`},
		),
		newScenario(
			"GetPage rejects invalid traversal id",
			"/api/docs/v1/GetPage",
			`{"id":"../secrets"}`,
			http.StatusNotFound,
			[]string{`"error":"invalid page id"`},
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
