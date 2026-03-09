package service

import (
	"os"
	"path/filepath"
	"testing"
)

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir failed: %v", err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write file failed: %v", err)
	}
}

func TestDocsServiceGetConfigAndPage(t *testing.T) {
	root := t.TempDir()

	writeFile(t, filepath.Join(root, "docs.json"), `{
  "site": {
    "title": "NanoMind Docs",
    "root": "docs",
    "homepage": "index",
    "defaultLayout": "docs",
    "defaultContentMode": "centered"
  },
  "topbar": {
    "showSearch": true,
    "links": [{"label": "GitHub", "href": "https://example.com", "external": true}]
  },
  "tabs": [
    {
      "key": "start",
      "label": "Get started",
      "groups": [
        {
          "key": "home",
          "label": "Home",
          "pages": [{"id": "index", "title": "Introduction"}]
        },
        {
          "key": "first-steps",
          "label": "First steps",
          "pages": [{"id": "start/getting-started", "title": "Getting Started", "contentMode": "wide"}]
        }
      ]
    }
  ]
}`)

	writeFile(t, filepath.Join(root, "index.md"), "# Home\n\nWelcome")
	writeFile(t, filepath.Join(root, "start", "getting-started.md"), `---
title: From Frontmatter
description: Start here
toc: false
layout: docs
contentMode: centered
---

# Getting Started

Hello world.
`)

	svc := NewDocsService(root)

	config, err := svc.GetConfig()
	if err != nil {
		t.Fatalf("GetConfig failed: %v", err)
	}
	if config.Site.Title != "NanoMind Docs" {
		t.Fatalf("unexpected site title: %s", config.Site.Title)
	}
	if len(config.Tabs) != 1 {
		t.Fatalf("expected 1 tab, got %d", len(config.Tabs))
	}

	page, err := svc.GetPage("start/getting-started")
	if err != nil {
		t.Fatalf("GetPage failed: %v", err)
	}
	if page.Title != "Getting Started" {
		t.Fatalf("expected title from docs.json override, got %s", page.Title)
	}
	if page.Description != "Start here" {
		t.Fatalf("unexpected description: %s", page.Description)
	}
	if page.TOC {
		t.Fatalf("expected toc false from frontmatter")
	}
	if page.ContentMode != "wide" {
		t.Fatalf("expected contentMode wide from docs.json override, got %s", page.ContentMode)
	}
	if page.Content == "" {
		t.Fatalf("expected markdown content")
	}
}

func TestDocsServiceRejectsDuplicatePageID(t *testing.T) {
	root := t.TempDir()

	writeFile(t, filepath.Join(root, "docs.json"), `{
  "site": {
    "title": "NanoMind Docs",
    "root": "docs",
    "homepage": "index"
  },
  "topbar": {"showSearch": true},
  "tabs": [
    {
      "key": "start",
      "label": "Start",
      "groups": [
        {
          "key": "home",
          "label": "Home",
          "pages": [
            {"id": "index", "title": "Home"},
            {"id": "index", "title": "Home Duplicate"}
          ]
        }
      ]
    }
  ]
}`)
	writeFile(t, filepath.Join(root, "index.md"), "# Home\n")

	svc := NewDocsService(root)
	if _, err := svc.GetConfig(); err == nil {
		t.Fatalf("expected duplicate page id validation error")
	}
}
