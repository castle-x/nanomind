package service

import (
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type FileTreeItem struct {
	Name     string         `json:"name"`
	Path     string         `json:"path"`
	Type     string         `json:"type"`
	Children []FileTreeItem `json:"children,omitempty"`
}

type FileContentResponse struct {
	Content string `json:"content"`
	Path    string `json:"path"`
}

type SearchResult struct {
	Path    string   `json:"path"`
	Name    string   `json:"name"`
	Matches []string `json:"matches"`
}

type FileService struct {
	MindPath string
}

func NewFileService(mindPath string) *FileService {
	return &FileService{MindPath: mindPath}
}

func (fs *FileService) GetTree() []FileTreeItem {
	tree := fs.buildTree(fs.MindPath, "")
	if tree == nil {
		return []FileTreeItem{}
	}
	return tree
}

func (fs *FileService) buildTree(dirPath, relativePath string) []FileTreeItem {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil
	}

	var dirs, files []FileTreeItem

	for _, entry := range entries {
		name := entry.Name()
		if skipHidden(name) {
			continue
		}

		entryRelPath := name
		if relativePath != "" {
			entryRelPath = relativePath + "/" + name
		}

		if entry.IsDir() {
			children := fs.buildTree(filepath.Join(dirPath, name), entryRelPath)
			dirs = append(dirs, FileTreeItem{Name: name, Path: entryRelPath, Type: "directory", Children: children})
		} else if isMarkdown(name) {
			displayName := strings.TrimSuffix(name, filepath.Ext(name))
			files = append(files, FileTreeItem{Name: displayName, Path: entryRelPath, Type: "file"})
		}
	}

	sort.Slice(dirs, func(i, j int) bool { return strings.ToLower(dirs[i].Name) < strings.ToLower(dirs[j].Name) })
	sort.Slice(files, func(i, j int) bool { return strings.ToLower(files[i].Name) < strings.ToLower(files[j].Name) })
	return append(dirs, files...)
}

func (fs *FileService) ReadFile(rawPath string) (FileContentResponse, error) {
	fullPath, err := fs.DecodePath(rawPath)
	if err != nil {
		return FileContentResponse{}, fmt.Errorf("invalid file path")
	}

	content, err := os.ReadFile(fullPath)
	if err != nil {
		return FileContentResponse{}, fmt.Errorf("file not found")
	}

	return FileContentResponse{Content: string(content), Path: rawPath}, nil
}

func (fs *FileService) CreateFile(path, name, fileType string) (string, error) {
	if name == "" {
		return "", fmt.Errorf("name required")
	}

	targetName := name
	if fileType == "file" {
		targetName = name + ".md"
	}

	relativePath := targetName
	if path != "" {
		relativePath = path + "/" + targetName
	}

	fullPath, err := fs.DecodePath(relativePath)
	if err != nil {
		return "", fmt.Errorf("access denied")
	}

	if _, err := os.Stat(fullPath); err == nil {
		return "", fmt.Errorf("file or directory already exists")
	}

	if fileType == "directory" {
		if err := os.MkdirAll(fullPath, 0755); err != nil {
			return "", fmt.Errorf("failed to create directory: %w", err)
		}
	} else {
		dir := filepath.Dir(fullPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return "", fmt.Errorf("failed to create parent directory: %w", err)
		}
		initialContent := fmt.Sprintf("# %s\n\n", name)
		if err := os.WriteFile(fullPath, []byte(initialContent), 0644); err != nil {
			return "", fmt.Errorf("failed to create file: %w", err)
		}
	}

	return relativePath, nil
}

func (fs *FileService) SaveFile(rawPath, content string) error {
	fullPath, err := fs.DecodePath(rawPath)
	if err != nil {
		return fmt.Errorf("invalid file path")
	}

	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to save file")
	}

	return nil
}

func (fs *FileService) RenameFile(rawPath, newName string) (string, error) {
	fullPath, err := fs.DecodePath(rawPath)
	if err != nil {
		return "", fmt.Errorf("invalid file path")
	}

	if newName == "" {
		return "", fmt.Errorf("new name required")
	}

	info, err := os.Stat(fullPath)
	if err != nil {
		return "", fmt.Errorf("file not found")
	}

	dir := filepath.Dir(fullPath)
	finalName := newName
	if !info.IsDir() {
		finalName = newName + filepath.Ext(fullPath)
	}
	newFullPath := filepath.Join(dir, finalName)

	if _, err := os.Stat(newFullPath); err == nil {
		return "", fmt.Errorf("target already exists")
	}

	if err := os.Rename(fullPath, newFullPath); err != nil {
		return "", fmt.Errorf("failed to rename: %w", err)
	}

	newRelPath, _ := filepath.Rel(fs.MindPath, newFullPath)
	newRelPath = filepath.ToSlash(newRelPath)

	return newRelPath, nil
}

func (fs *FileService) DeleteFile(rawPath string) error {
	fullPath, err := fs.DecodePath(rawPath)
	if err != nil {
		return fmt.Errorf("invalid file path")
	}

	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		return fmt.Errorf("file not found")
	}

	return os.RemoveAll(fullPath)
}

func (fs *FileService) Search(query string) []SearchResult {
	if len([]rune(query)) < 2 {
		return []SearchResult{}
	}

	queryLower := strings.ToLower(query)
	var results []SearchResult

	filepath.Walk(fs.MindPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		name := info.Name()
		if skipHidden(name) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if info.IsDir() || !isMarkdown(name) {
			return nil
		}

		if len(results) >= 20 {
			return io.EOF
		}

		content, _ := os.ReadFile(path)
		contentStr := string(content)
		contentLower := strings.ToLower(contentStr)

		if !strings.Contains(contentLower, queryLower) {
			return nil
		}

		relPath, _ := filepath.Rel(fs.MindPath, path)
		relPath = filepath.ToSlash(relPath)
		displayName := strings.TrimSuffix(name, filepath.Ext(name))

		var matches []string
		for _, line := range strings.Split(contentStr, "\n") {
			if len(matches) >= 3 {
				break
			}
			if strings.Contains(strings.ToLower(line), queryLower) {
				trimmed := strings.TrimSpace(line)
				if len([]rune(trimmed)) > 100 {
					trimmed = string([]rune(trimmed)[:100])
				}
				if trimmed != "" {
					matches = append(matches, trimmed)
				}
			}
		}

		results = append(results, SearchResult{Path: relPath, Name: displayName, Matches: matches})
		return nil
	})

	if results == nil {
		return []SearchResult{}
	}
	return results
}

func (fs *FileService) DecodePath(raw string) (string, error) {
	decoded := raw
	if strings.Contains(raw, "%") {
		var err error
		decoded, err = url.PathUnescape(raw)
		if err != nil {
			return "", fmt.Errorf("invalid path encoding")
		}
	}

	fullPath := filepath.Join(fs.MindPath, decoded)
	fullPath = filepath.Clean(fullPath)

	if !strings.HasPrefix(fullPath, filepath.Clean(fs.MindPath)) {
		return "", fmt.Errorf("access denied")
	}
	return fullPath, nil
}

func skipHidden(name string) bool {
	return strings.HasPrefix(name, ".") || name == "node_modules"
}

func isMarkdown(name string) bool {
	return strings.HasSuffix(strings.ToLower(name), ".md")
}
