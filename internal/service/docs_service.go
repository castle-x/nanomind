package service

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

const docsConfigFilename = "docs.json"

type DocsConfig struct {
	Site   DocsSiteConfig   `json:"site"`
	Topbar DocsTopbarConfig `json:"topbar"`
	Tabs   []DocsTab        `json:"tabs"`
}

type DocsSiteConfig struct {
	Title              string `json:"title"`
	Root               string `json:"root"`
	Homepage           string `json:"homepage"`
	DefaultLayout      string `json:"defaultLayout,omitempty"`
	DefaultContentMode string `json:"defaultContentMode,omitempty"`
}

type DocsTopbarConfig struct {
	ShowSearch bool       `json:"showSearch"`
	Links      []DocsLink `json:"links,omitempty"`
}

type DocsLink struct {
	Label    string `json:"label"`
	Href     string `json:"href"`
	External bool   `json:"external,omitempty"`
}

type DocsTab struct {
	Key    string      `json:"key"`
	Label  string      `json:"label"`
	Groups []DocsGroup `json:"groups"`
}

type DocsGroup struct {
	Key   string     `json:"key"`
	Label string     `json:"label"`
	Pages []DocsPage `json:"pages"`
}

type DocsPage struct {
	ID          string `json:"id"`
	Title       string `json:"title,omitempty"`
	Hidden      bool   `json:"hidden,omitempty"`
	Layout      string `json:"layout,omitempty"`
	ContentMode string `json:"contentMode,omitempty"`
}

type DocsFrontmatter struct {
	Title       string `yaml:"title" json:"title,omitempty"`
	Description string `yaml:"description" json:"description,omitempty"`
	TOC         *bool  `yaml:"toc" json:"toc,omitempty"`
	Layout      string `yaml:"layout" json:"layout,omitempty"`
	ContentMode string `yaml:"contentMode" json:"contentMode,omitempty"`
}

type DocsPageContent struct {
	ID          string          `json:"id"`
	Title       string          `json:"title"`
	Description string          `json:"description,omitempty"`
	TOC         bool            `json:"toc"`
	Layout      string          `json:"layout,omitempty"`
	ContentMode string          `json:"contentMode,omitempty"`
	Content     string          `json:"content"`
	Frontmatter DocsFrontmatter `json:"frontmatter"`
}

type DocsService struct {
	rootPath string
}

func NewDocsService(rootPath string) *DocsService {
	return &DocsService{rootPath: rootPath}
}

func (ds *DocsService) GetConfig() (DocsConfig, error) {
	configPath := filepath.Join(ds.rootPath, docsConfigFilename)
	data, err := os.ReadFile(configPath)
	if err != nil {
		return DocsConfig{}, fmt.Errorf("failed to read docs.json: %w", err)
	}

	var config DocsConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return DocsConfig{}, fmt.Errorf("invalid docs.json: %w", err)
	}

	if err := ds.validateConfig(config); err != nil {
		return DocsConfig{}, err
	}

	return config, nil
}

func (ds *DocsService) GetPage(id string) (DocsPageContent, error) {
	if strings.TrimSpace(id) == "" {
		return DocsPageContent{}, fmt.Errorf("page id required")
	}

	fullPath, err := ds.decodePagePath(id)
	if err != nil {
		return DocsPageContent{}, err
	}

	data, err := os.ReadFile(fullPath)
	if err != nil {
		return DocsPageContent{}, fmt.Errorf("page not found")
	}

	frontmatter, body, err := parseDocsFrontmatter(string(data))
	if err != nil {
		return DocsPageContent{}, err
	}

	config, err := ds.GetConfig()
	if err != nil {
		return DocsPageContent{}, err
	}

	title := frontmatter.Title
	if title == "" {
		title = fallbackTitleFromID(id)
	}

	pageMeta, _ := findPageMeta(config, id)
	if pageMeta != nil && pageMeta.Title != "" {
		title = pageMeta.Title
	}

	layout := config.Site.DefaultLayout
	if frontmatter.Layout != "" {
		layout = frontmatter.Layout
	}
	if pageMeta != nil && pageMeta.Layout != "" {
		layout = pageMeta.Layout
	}

	contentMode := config.Site.DefaultContentMode
	if frontmatter.ContentMode != "" {
		contentMode = frontmatter.ContentMode
	}
	if pageMeta != nil && pageMeta.ContentMode != "" {
		contentMode = pageMeta.ContentMode
	}

	toc := true
	if frontmatter.TOC != nil {
		toc = *frontmatter.TOC
	}

	return DocsPageContent{
		ID:          id,
		Title:       title,
		Description: frontmatter.Description,
		TOC:         toc,
		Layout:      layout,
		ContentMode: contentMode,
		Content:     body,
		Frontmatter: frontmatter,
	}, nil
}

func (ds *DocsService) validateConfig(config DocsConfig) error {
	if strings.TrimSpace(config.Site.Title) == "" {
		return fmt.Errorf("docs.json: site.title required")
	}
	if strings.TrimSpace(config.Site.Homepage) == "" {
		return fmt.Errorf("docs.json: site.homepage required")
	}
	if len(config.Tabs) == 0 {
		return fmt.Errorf("docs.json: tabs required")
	}

	tabKeys := make(map[string]struct{}, len(config.Tabs))
	pageIDs := make(map[string]struct{})
	homepageFound := false

	for _, tab := range config.Tabs {
		if tab.Key == "" {
			return fmt.Errorf("docs.json: tab.key required")
		}
		if _, exists := tabKeys[tab.Key]; exists {
			return fmt.Errorf("docs.json: duplicate tab key %q", tab.Key)
		}
		tabKeys[tab.Key] = struct{}{}
		if len(tab.Groups) == 0 {
			return fmt.Errorf("docs.json: tab %q requires at least one group", tab.Key)
		}

		groupKeys := make(map[string]struct{}, len(tab.Groups))
		for _, group := range tab.Groups {
			if group.Key == "" {
				return fmt.Errorf("docs.json: group.key required")
			}
			if _, exists := groupKeys[group.Key]; exists {
				return fmt.Errorf("docs.json: duplicate group key %q in tab %q", group.Key, tab.Key)
			}
			groupKeys[group.Key] = struct{}{}
			if len(group.Pages) == 0 {
				return fmt.Errorf("docs.json: group %q in tab %q requires at least one page", group.Key, tab.Key)
			}

			for _, page := range group.Pages {
				if page.ID == "" {
					return fmt.Errorf("docs.json: page.id required")
				}
				if _, exists := pageIDs[page.ID]; exists {
					return fmt.Errorf("docs.json: duplicate page id %q", page.ID)
				}
				pageIDs[page.ID] = struct{}{}
				if page.ID == config.Site.Homepage {
					homepageFound = true
				}
				if _, err := ds.decodePagePath(page.ID); err != nil {
					return err
				}
			}
		}
	}

	if !homepageFound {
		return fmt.Errorf("docs.json: homepage %q not found in navigation", config.Site.Homepage)
	}

	return nil
}

func (ds *DocsService) decodePagePath(id string) (string, error) {
	rel := filepath.Clean(id + ".md")
	if rel == "." || strings.HasPrefix(rel, "../") {
		return "", fmt.Errorf("invalid page id")
	}
	fullPath := filepath.Join(ds.rootPath, rel)
	fullPath = filepath.Clean(fullPath)
	if !strings.HasPrefix(fullPath, filepath.Clean(ds.rootPath)) {
		return "", fmt.Errorf("invalid page id")
	}
	if _, err := os.Stat(fullPath); err != nil {
		return "", fmt.Errorf("docs.json: page %q maps to missing file", id)
	}
	return fullPath, nil
}

func parseDocsFrontmatter(raw string) (DocsFrontmatter, string, error) {
	if !strings.HasPrefix(raw, "---\n") && !strings.HasPrefix(raw, "---\r\n") {
		return DocsFrontmatter{}, raw, nil
	}

	separator := "\n---\n"
	startLen := len("---\n")
	if strings.HasPrefix(raw, "---\r\n") {
		separator = "\r\n---\r\n"
		startLen = len("---\r\n")
	}

	end := strings.Index(raw[startLen:], separator)
	if end < 0 {
		return DocsFrontmatter{}, "", fmt.Errorf("invalid frontmatter")
	}
	end += startLen

	frontmatterText := raw[startLen:end]
	body := raw[end+len(separator):]

	var frontmatter DocsFrontmatter
	if err := yaml.Unmarshal([]byte(frontmatterText), &frontmatter); err != nil {
		return DocsFrontmatter{}, "", fmt.Errorf("invalid frontmatter: %w", err)
	}

	return frontmatter, body, nil
}

func fallbackTitleFromID(id string) string {
	segments := strings.Split(id, "/")
	base := segments[len(segments)-1]
	base = strings.ReplaceAll(base, "-", " ")
	if base == "" {
		return id
	}
	return strings.Title(base)
}

func findPageMeta(config DocsConfig, id string) (*DocsPage, bool) {
	for _, tab := range config.Tabs {
		for _, group := range tab.Groups {
			for _, page := range group.Pages {
				if page.ID == id {
					pageCopy := page
					return &pageCopy, true
				}
			}
		}
	}
	return nil, false
}
