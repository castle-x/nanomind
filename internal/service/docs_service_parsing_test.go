package service

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func mustWriteFixtureFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir failed: %v", err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write file failed: %v", err)
	}
}

func TestDocsServiceGetPageUsesFallbackTitleAndSiteDefaults(t *testing.T) {
	root := t.TempDir()

	mustWriteFixtureFile(t, filepath.Join(root, "docs.json"), `{
  "site": {
    "title": "NanoMind Docs",
    "root": "docs",
    "homepage": "index",
    "defaultLayout": "docs",
    "defaultContentMode": "centered"
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
            {"id": "guides/quick-start"}
          ]
        }
      ]
    }
  ]
}`)
	mustWriteFixtureFile(t, filepath.Join(root, "index.md"), "# Home\n")
	mustWriteFixtureFile(t, filepath.Join(root, "guides", "quick-start.md"), "# Quick Start\n\nBody\n")

	svc := NewDocsService(root)
	page, err := svc.GetPage("guides/quick-start")
	if err != nil {
		t.Fatalf("GetPage failed: %v", err)
	}

	if page.Title != "Quick Start" {
		t.Fatalf("expected fallback title, got %q", page.Title)
	}
	if !page.TOC {
		t.Fatalf("expected toc default true")
	}
	if page.Layout != "docs" {
		t.Fatalf("expected default layout, got %q", page.Layout)
	}
	if page.ContentMode != "centered" {
		t.Fatalf("expected default contentMode, got %q", page.ContentMode)
	}
}

func TestDocsServiceRejectsHomepageOutsideNavigation(t *testing.T) {
	root := t.TempDir()

	mustWriteFixtureFile(t, filepath.Join(root, "docs.json"), `{
  "site": {
    "title": "NanoMind Docs",
    "root": "docs",
    "homepage": "missing-home"
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
            {"id": "index", "title": "Home"}
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
		t.Fatalf("expected homepage validation error")
	}
	if !strings.Contains(err.Error(), `homepage "missing-home" not found`) {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDocsServiceRejectsInvalidFrontmatter(t *testing.T) {
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
            {"id": "guides/broken", "title": "Broken"}
          ]
        }
      ]
    }
  ]
}`)
	mustWriteFixtureFile(t, filepath.Join(root, "index.md"), "# Home\n")
	mustWriteFixtureFile(t, filepath.Join(root, "guides", "broken.md"), `---
title: Broken
layout: [
---

# Broken
`)

	svc := NewDocsService(root)
	_, err := svc.GetPage("guides/broken")
	if err == nil {
		t.Fatalf("expected invalid frontmatter error")
	}
	if !strings.Contains(err.Error(), "invalid frontmatter") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestParseDocsFrontmatterSupportsCRLF(t *testing.T) {
	frontmatter, body, err := parseDocsFrontmatter("---\r\ntitle: Hello\r\ndescription: World\r\n---\r\n\r\n# Heading\r\n")
	if err != nil {
		t.Fatalf("parseDocsFrontmatter failed: %v", err)
	}
	if frontmatter.Title != "Hello" {
		t.Fatalf("unexpected title: %q", frontmatter.Title)
	}
	if !strings.Contains(body, "# Heading") {
		t.Fatalf("unexpected body: %q", body)
	}
}
