package service

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type Space struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Slug         string `json:"slug"`
	Description  string `json:"description"`
	Public       bool   `json:"public"`
	IsDefault    bool   `json:"isDefault"`
	CustomDomain string `json:"customDomain"`
	Meta         any    `json:"meta"`
	Path         string `json:"path"`
}

type SpaceService struct {
	app          core.App
	mindBasePath string
}

var reservedSlugs = map[string]bool{
	"dashboard": true,
	"login":     true,
	"api":       true,
	"_":         true,
}

func NewSpaceService(app core.App, mindBasePath string) *SpaceService {
	return &SpaceService{app: app, mindBasePath: mindBasePath}
}

func validateSlug(slug string) error {
	if reservedSlugs[slug] {
		return fmt.Errorf("slug '%s' is reserved", slug)
	}
	return nil
}

func (s *SpaceService) List() ([]Space, error) {
	records, err := s.app.FindAllRecords("spaces")
	if err != nil {
		return nil, fmt.Errorf("failed to list spaces: %w", err)
	}

	spaces := make([]Space, 0, len(records))
	for _, r := range records {
		spaces = append(spaces, s.recordToSpace(r))
	}
	return spaces, nil
}

func (s *SpaceService) Create(name, slug, description string) (Space, error) {
	if err := validateSlug(slug); err != nil {
		return Space{}, err
	}

	col, err := s.app.FindCollectionByNameOrId("spaces")
	if err != nil {
		return Space{}, fmt.Errorf("spaces collection not found: %w", err)
	}

	record := core.NewRecord(col)
	record.Set("name", name)
	record.Set("slug", slug)
	record.Set("description", description)

	if err := s.app.Save(record); err != nil {
		return Space{}, fmt.Errorf("failed to create space: %w", err)
	}

	spacePath := filepath.Join(s.mindBasePath, record.Id)
	if err := os.MkdirAll(spacePath, 0755); err != nil {
		return Space{}, fmt.Errorf("failed to create space directory: %w", err)
	}

	return s.recordToSpace(record), nil
}

func (s *SpaceService) Update(id, name, slug, description string, public, isDefault bool) (Space, error) {
	if err := validateSlug(slug); err != nil {
		return Space{}, err
	}

	record, err := s.app.FindRecordById("spaces", id)
	if err != nil {
		return Space{}, fmt.Errorf("space not found: %w", err)
	}

	record.Set("name", name)
	record.Set("slug", slug)
	record.Set("description", description)
	record.Set("public", public)
	record.Set("is_default", isDefault)

	if err := s.app.Save(record); err != nil {
		return Space{}, fmt.Errorf("failed to update space: %w", err)
	}

	return s.recordToSpace(record), nil
}

func (s *SpaceService) Delete(id string) error {
	record, err := s.app.FindRecordById("spaces", id)
	if err != nil {
		return fmt.Errorf("space not found: %w", err)
	}

	if err := s.app.Delete(record); err != nil {
		return fmt.Errorf("failed to delete space: %w", err)
	}

	return nil
}

func (s *SpaceService) GetDefaultSpace() (Space, error) {
	record, err := s.app.FindFirstRecordByFilter("spaces", "is_default = true AND public = true", dbx.Params{})
	if err != nil {
		return Space{}, fmt.Errorf("no default public space found: %w", err)
	}
	return s.recordToSpace(record), nil
}

func (s *SpaceService) GetBySlug(slug string) (Space, error) {
	record, err := s.app.FindFirstRecordByFilter("spaces", "slug = {:slug}", dbx.Params{"slug": slug})
	if err != nil {
		return Space{}, fmt.Errorf("space not found: %w", err)
	}
	return s.recordToSpace(record), nil
}

func (s *SpaceService) GetByID(id string) (Space, error) {
	record, err := s.app.FindRecordById("spaces", id)
	if err != nil {
		return Space{}, fmt.Errorf("space not found: %w", err)
	}
	return s.recordToSpace(record), nil
}

func (s *SpaceService) recordToSpace(r *core.Record) Space {
	meta := r.Get("meta")
	if meta == nil {
		meta = map[string]any{}
	}

	return Space{
		ID:           r.Id,
		Name:         r.GetString("name"),
		Slug:         r.GetString("slug"),
		Description:  r.GetString("description"),
		Public:       r.GetBool("public"),
		IsDefault:    r.GetBool("is_default"),
		CustomDomain: r.GetString("custom_domain"),
		Meta:         meta,
		Path:         filepath.Join(s.mindBasePath, r.Id),
	}
}
