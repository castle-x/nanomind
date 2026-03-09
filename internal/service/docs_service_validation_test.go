package service

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestDocsServiceRejectsInvalidJSONConfig(t *testing.T) {
	root := t.TempDir()

	mustWriteFixtureFile(t, filepath.Join(root, "docs.json"), `{"site": `)

	svc := NewDocsService(root)
	_, err := svc.GetConfig()
	if err == nil {
		t.Fatalf("expected invalid docs.json error")
	}
	if !strings.Contains(err.Error(), "invalid docs.json") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDocsServiceRejectsMissingReferencedMarkdownFile(t *testing.T) {
	root := t.TempDir()

	mustWriteFixtureFile(t, filepath.Join(root, "docs.json"), `{
  "site": {
    "title": "NanoMind Docs",
    "root": "docs",
    "homepage": "index"
  },
  "tabs": [
    {
      "key": "guides",
      "label": "Guides",
      "groups": [
        {
          "key": "intro",
          "label": "Intro",
          "pages": [
            {"id": "index", "title": "Home"},
            {"id": "guides/missing", "title": "Missing"}
          ]
        }
      ]
    }
  ]
}`)
	mustWriteFixtureFile(t, filepath.Join(root, "index.md"), "# Home\n")

	svc := NewDocsService(root)
	_, err := svc.GetConfig()
	if err == nil {
		t.Fatalf("expected missing page validation error")
	}
	if !strings.Contains(err.Error(), `docs.json: page "guides/missing" maps to missing file`) {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestParseDocsFrontmatterWithoutFrontmatterReturnsRawBody(t *testing.T) {
	raw := "# Heading\n\nBody content.\n"

	frontmatter, body, err := parseDocsFrontmatter(raw)
	if err != nil {
		t.Fatalf("parseDocsFrontmatter failed: %v", err)
	}
	if frontmatter.Title != "" || frontmatter.Description != "" {
		t.Fatalf("expected empty frontmatter, got %+v", frontmatter)
	}
	if body != raw {
		t.Fatalf("unexpected body: %q", body)
	}
}
