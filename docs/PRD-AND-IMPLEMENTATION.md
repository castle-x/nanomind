# NanoMind 产品需求文档 (PRD) 与实现方案

> 本文档基于 NanoMind 项目完整代码分析生成，涵盖产品定位、技术架构、后端接口设计、前端功能与样式，以及 go:embed 嵌入式部署方案。

---

## 一、产品概述

### 1.1 产品定位

**NanoMind** 是一个自托管的轻量级 Markdown 笔记应用，采用**单二进制文件部署**架构，将 PocketBase 后端（Go）和 React SPA 前端打包成一个可执行文件。

| 特性 | 说明 |
|------|------|
| **部署方式** | 单二进制文件（6.4-6.9MB），零外部依赖 |
| **存储方式** | 本地文件系统存储 Markdown 文件 |
| **认证系统** | PocketBase 内置 JWT 认证 |
| **编辑体验** | 所见即所得（WYSIWYG）富文本编辑器 |
| **目标用户** | 个人开发者、知识工作者、小团队、NAS 用户 |

### 1.2 核心理念

- **极简部署**：单个二进制文件，零外部依赖（无需独立数据库、无需 Docker），下载即用
- **本地存储**：所有笔记以 Markdown 文件形式存储在本地文件系统，数据完全归用户所有
- **富文本编辑**：所见即所得的编辑体验，同时底层保持 Markdown 格式的可移植性
- **自托管优先**：面向个人或小团队，部署在自己的服务器或本地机器上

### 1.3 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                     单二进制文件                          │
│  ┌─────────────────┐    ┌──────────────────────────┐   │
│  │   Go Backend    │    │    React SPA Frontend    │   │
│  │  (PocketBase)   │◄──►│   (Embedded via go:embed)│   │
│  │                 │    │                          │   │
│  │ • HTTP Router   │    │ • Vite + React 19        │   │
│  │ • SQLite DB     │    │ • Tiptap Editor          │   │
│  │ • JWT Auth      │    │ • Tailwind CSS 4         │   │
│  │ • File API      │    │ • Zustand + TanStack     │   │
│  └─────────────────┘    └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1.4 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **后端** | Go | 1.25.6 |
| | PocketBase | v0.36.5 |
| | go-pocketbase | (本地依赖) |
| **前端** | React | ^19.2.0 |
| | TypeScript | ~5.9.3 |
| | Vite | ^7.2.0 |
| | Tailwind CSS | ^4.1.0 |
| | Tiptap | ^3.15.0 |
| | Zustand | ^5.0.11 |
| | TanStack Query | ^5.90.0 |

---

## 二、后端接口设计（Go）

### 2.1 项目结构

```
internal/
├── server/
│   ├── server.go              # AppServer 主结构体
│   ├── routes.go              # 路由注册
│   ├── files.go               # 文件 CRUD 处理器（336行）
│   ├── server_development.go  # 开发模式：Vite 代理
│   └── server_production.go   # 生产模式：嵌入 SPA
└── migrations/
    └── initial.go             # PocketBase 初始配置

cmd/app/main.go                # 应用入口
site/embed.go                  # go:embed 指令
```

### 2.2 核心数据结构

```go
// FileTreeItem - 文件树节点
 type FileTreeItem struct {
     Name     string         `json:"name"`     // 显示名（不含 .md）
     Path     string         `json:"path"`     // 相对路径（含 .md）
     Type     string         `json:"type"`     // "file" | "directory"
     Children []FileTreeItem `json:"children,omitempty"`
 }

// FileContentResponse - 文件内容响应
 type FileContentResponse struct {
     Content string `json:"content"`  // Markdown 原始内容
     Path    string `json:"path"`     // 文件路径
 }

// CreateRequest - 创建请求
 type CreateRequest struct {
     Path string `json:"path"`   // 父目录路径
     Type string `json:"type"`   // "file" | "directory"
     Name string `json:"name"`   // 新建项名称
 }

// RenameRequest - 重命名请求
 type RenameRequest struct {
     NewName string `json:"newName"`  // 新名称
 }

// SearchResult - 搜索结果
 type SearchResult struct {
     Path    string   `json:"path"`    // 文件路径
     Name    string   `json:"name"`    // 文件名
     Matches []string `json:"matches"` // 匹配行摘要
 }
```

### 2.3 API 接口清单

#### 文件操作（需认证）

| 方法 | 路径 | 功能 | 请求体 | 响应体 |
|------|------|------|--------|--------|
| `GET` | `/api/files` | 获取文件树 | - | `FileTreeItem[]` |
| `GET` | `/api/files/{path...}` | 读取文件内容 | - | `FileContentResponse` |
| `PUT` | `/api/files/{path...}` | 保存文件内容 | `{ content }` | `{ success, path }` |
| `POST` | `/api/files` | 创建文件/目录 | `CreateRequest` | `{ success, path }` |
| `DELETE` | `/api/files/{path...}` | 删除文件/目录 | - | `{ success }` |
| `PATCH` | `/api/files/{path...}` | 重命名文件/目录 | `{ newName }` | `{ success, path }` |

#### 搜索与信息（需认证）

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| `GET` | `/api/search?q={query}` | 全文搜索 | 最小2字符，最多20条结果 |
| `GET` | `/api/auth/me` | 当前用户信息 | 返回 `{ userID }` |
| `GET` | `/api/info` | 应用信息 | 返回 `{ mindPath }` |

#### 设置（公开访问）

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| `GET` | `/api/setup/status` | 检查是否需要修改密码 | 首次登录检测 |
| `POST` | `/api/setup/change-password` | 修改默认密码 | 强制修改默认凭证 |

### 2.4 文件树构建逻辑

```go
func (s *AppServer) buildTree(dirPath, relativePath string) []FileTreeItem {
    entries, err := os.ReadDir(dirPath)
    if err != nil {
        return nil
    }

    var dirs, files []FileTreeItem

    for _, entry := range entries {
        name := entry.Name()
        
        // 过滤规则：跳过隐藏文件和 node_modules
        if skipHidden(name) {
            continue
        }

        entryRelPath := name
        if relativePath != "" {
            entryRelPath = relativePath + "/" + name
        }

        if entry.IsDir() {
            // 递归构建子目录
            children := s.buildTree(filepath.Join(dirPath, name), entryRelPath)
            dirs = append(dirs, FileTreeItem{
                Name: name, 
                Path: entryRelPath, 
                Type: "directory", 
                Children: children,
            })
        } else if isMarkdown(name) {
            // 只处理 .md 文件
            displayName := strings.TrimSuffix(name, filepath.Ext(name))
            files = append(files, FileTreeItem{
                Name: displayName, 
                Path: entryRelPath, 
                Type: "file",
            })
        }
    }

    // 排序规则：目录优先，按字母排序
    sort.Slice(dirs, func(i, j int) bool { 
        return strings.ToLower(dirs[i].Name) < strings.ToLower(dirs[j].Name) 
    })
    sort.Slice(files, func(i, j int) bool { 
        return strings.ToLower(files[i].Name) < strings.ToLower(files[j].Name) 
    })
    
    return append(dirs, files...)
}

func skipHidden(name string) bool {
    return strings.HasPrefix(name, ".") || name == "node_modules"
}

func isMarkdown(name string) bool {
    return strings.HasSuffix(strings.ToLower(name), ".md")
}
```

### 2.5 路径安全校验（防目录遍历）

```go
func (s *AppServer) decodePath(raw string) (string, error) {
    decoded := raw
    
    // URL 解码（仅在包含 % 时）
    if strings.Contains(raw, "%") {
        var err error
        decoded, err = url.PathUnescape(raw)
        if err != nil {
            return "", fmt.Errorf("invalid path encoding")
        }
    }

    // 构建完整路径
    fullPath := filepath.Join(s.mindPath, decoded)
    fullPath = filepath.Clean(fullPath)

    // 关键：校验路径必须在 mindPath 范围内
    if !strings.HasPrefix(fullPath, filepath.Clean(s.mindPath)) {
        return "", fmt.Errorf("access denied")
    }
    
    return fullPath, nil
}
```

### 2.6 全文搜索实现

```go
func (s *AppServer) handleSearch(e *core.RequestEvent) error {
    query := e.Request.URL.Query().Get("q")
    
    // 最小查询长度：2 个字符
    if len([]rune(query)) < 2 {
        return e.JSON(http.StatusOK, []any{})
    }

    queryLower := strings.ToLower(query)
    var results []SearchResult

    filepath.Walk(s.mindPath, func(path string, info os.FileInfo, err error) error {
        if err != nil || info.IsDir() || !isMarkdown(info.Name()) {
            return nil
        }

        // 限制结果数量
        if len(results) >= 20 {
            return io.EOF
        }

        content, _ := os.ReadFile(path)
        contentStr := string(content)
        contentLower := strings.ToLower(contentStr)

        if !strings.Contains(contentLower, queryLower) {
            return nil
        }

        // 提取匹配行摘要（最多3条，每条最多100字符）
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

        relPath, _ := filepath.Rel(s.mindPath, path)
        relPath = filepath.ToSlash(relPath)
        displayName := strings.TrimSuffix(info.Name(), filepath.Ext(info.Name()))

        results = append(results, SearchResult{
            Path: relPath, 
            Name: displayName, 
            Matches: matches,
        })
        return nil
    })

    return e.JSON(http.StatusOK, results)
}
```

---

## 三、前端功能与样式

### 3.1 项目结构（Feature-Sliced Design）

```
site/src/
├── app/                    # 应用初始化层
│   ├── App.tsx            # 根组件：监听认证状态
│   ├── routes.tsx         # 路由配置：登录页/编辑器页
│   ├── providers.tsx      # 全局 Provider：QueryClient, Theme, Toaster
│   └── styles/            # 全局样式
│       ├── globals.css    # Tailwind + 基础样式 + 动画
│       ├── themes.css     # 三套主题变量（亮色/暗色）
│       └── editor.css     # Tiptap 编辑器内容样式
├── views/                 # 页面层
│   ├── auth/
│   │   └── LoginView.tsx      # 登录页面（PocketBase 认证）
│   └── editor/
│       ├── EditorView.tsx     # 主编辑器页面（215行）
│       └── components/
│           ├── Sidebar.tsx        # 文件树侧边栏（297行）
│           ├── Header.tsx         # 顶部栏（190行）
│           ├── TiptapEditor.tsx   # 富文本编辑器（135行）
│           ├── Toolbar.tsx        # 编辑器工具栏（256行）
│           ├── SearchDialog.tsx   # 全局搜索弹窗（294行）
│           ├── TableOfContents.tsx # 目录导航（154行）
│           ├── CreateDialog.tsx   # 新建文件/目录对话框
│           ├── RenameDialog.tsx   # 重命名对话框
│           └── EmptyState.tsx     # 空状态显示
├── widgets/               # 可复用业务组件
│   ├── editor/
│   │   └── TiptapEditorLazy.tsx   # 懒加载编辑器包装
│   └── setup/
│       └── ChangePasswordDialog.tsx # 首次登录改密
└── shared/                # 共享基础设施
    ├── api/
    │   └── client.ts        # HTTP 客户端 (Ky)
    ├── hooks/
    │   └── useAuth.ts        # 认证状态管理 (Zustand)
    ├── store/
    │   └── app-store.ts      # 全局应用状态
    ├── lib/
    │   ├── markdown.ts       # MD ↔ HTML 转换（145行）
    │   ├── pb-client.ts      # PocketBase JS SDK
    │   ├── utils.ts          # 工具函数 (cn)
    │   └── use-file-actions.ts # 文件操作 Hook
    ├── types/
    │   └── index.ts          # TypeScript 类型定义
    └── ui/                   # Shadcn UI 组件
        ├── button.tsx
        ├── card.tsx
        ├── dialog.tsx
        ├── input.tsx
        ├── label.tsx
        └── ...
```

### 3.2 状态管理（Zustand）

```typescript
// shared/store/app-store.ts
interface AppState {
  // === 文件树 ===
  files: FileTreeItem[];
  setFiles: (files: FileTreeItem[]) => void;

  // === 当前文件 ===
  currentPath: string | null;
  setCurrentPath: (path: string | null) => void;

  // === 编辑器内容 ===
  content: string;              // 当前 HTML 内容
  setContent: (content: string) => void;
  originalContent: string;      // 原始内容（用于变更检测）
  setOriginalContent: (content: string) => void;

  // === 编辑状态 ===
  hasChanges: boolean;          // 是否有未保存变更
  setHasChanges: (has: boolean) => void;
  isEditing: boolean;           // 是否编辑模式
  setIsEditing: (editing: boolean) => void;
  saving: boolean;              // 是否保存中
  setSaving: (saving: boolean) => void;

  // === 目录导航 ===
  tocItems: TocItem[];
  setTocItems: (items: TocItem[]) => void;
  activeTocId: string | null;
  setActiveTocId: (id: string | null) => void;

  // === 搜索 ===
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchMode: "filename" | "fulltext";
  setSearchMode: (mode: "filename" | "fulltext") => void;

  // === 最近文件 ===
  recentOpened: string[];
  addRecentFile: (path: string) => void;

  // === 主题 ===
  theme: "A" | "B" | "C";
  setTheme: (theme: "A" | "B" | "C") => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  files: [],
  currentPath: null,
  content: "",
  originalContent: "",
  hasChanges: false,
  isEditing: false,
  saving: false,
  tocItems: [],
  activeTocId: null,
  searchOpen: false,
  searchMode: "filename",
  recentOpened: [],
  theme: (localStorage.getItem("site-theme") as ThemeKey) || "A",
  darkMode: false,
  // ... setters
}));
```

### 3.3 主题系统（三套主题 + 暗色模式）

```css
/* shared/styles/themes.css */

/* ============================================
   Theme A: Arctic Frost — 冷调蓝色，清爽低对比度
   ============================================ */
[data-theme="A"] {
  --background: 210 33% 98%;
  --foreground: 214 32% 14%;
  --card: 210 30% 96%;
  --card-foreground: 214 32% 14%;
  --popover: 0 0% 100%;
  --popover-foreground: 214 32% 14%;
  --primary: 213 94% 52%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 94%;
  --secondary-foreground: 214 32% 22%;
  --muted: 210 33% 95%;
  --muted-foreground: 215 16% 47%;
  --accent: 210 40% 92%;
  --accent-foreground: 214 32% 14%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 214 20% 91%;
  --input: 214 20% 88%;
  --ring: 213 94% 52%;
  --radius: 0.5rem;
  --sidebar: 210 30% 96.5%;
}

[data-theme="A"].dark {
  --background: 220 25% 7%;
  --foreground: 210 40% 96%;
  --card: 220 25% 9%;
  --card-foreground: 210 40% 96%;
  --popover: 220 25% 10%;
  --popover-foreground: 210 40% 96%;
  --primary: 213 94% 58%;
  --primary-foreground: 0 0% 100%;
  --secondary: 220 20% 16%;
  --secondary-foreground: 210 40% 92%;
  --muted: 220 20% 14%;
  --muted-foreground: 215 16% 60%;
  --accent: 220 20% 16%;
  --accent-foreground: 210 40% 96%;
  --destructive: 0 62% 45%;
  --destructive-foreground: 0 0% 100%;
  --border: 220 16% 16%;
  --input: 220 16% 20%;
  --ring: 213 94% 58%;
  --sidebar: 220 25% 8%;
}

/* Theme B: Modern Minimalist — 暖灰色调 */
[data-theme="B"] { /* ... */ }
[data-theme="B"].dark { /* ... */ }

/* Theme C: Ocean Depths — 青绿色调 */
[data-theme="C"] { /* ... */ }
[data-theme="C"].dark { /* ... */ }
```

**主题应用逻辑：**

```typescript
// app/providers.tsx
useEffect(() => {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
  if (darkMode) {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
}, [theme, darkMode]);
```

### 3.4 富文本编辑器（Tiptap）

**扩展配置：**

```typescript
// views/editor/components/TiptapEditor.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      codeBlock: false, // 使用 CodeBlockLowlight 替代
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: "开始编辑..." }),
    Highlight.configure({ multicolor: true }),
    CodeBlockLowlight.configure({ lowlight }),
    Underline,
    Link.configure({
      openOnClick: !editable,
      HTMLAttributes: { class: "text-primary underline cursor-pointer" },
    }),
    Table,
    TableRow,
    TableHeader,
    TableCell,
  ],
  editable,
  content,
  onUpdate: ({ editor: e }) => {
    const html = e.getHTML();
    onUpdate(html, html !== cleanHtmlRef.current);
  },
  editorProps: {
    handlePaste: (view, event) => {
      // Markdown 粘贴检测与转换
      const clipboardData = event.clipboardData;
      const html = clipboardData.getData("text/html");
      if (html) return false; // 有 HTML 时交给默认处理

      const text = clipboardData.getData("text/plain");
      if (!text || !looksLikeMarkdown(text)) return false;

      event.preventDefault();
      const convertedHtml = markdownToHtml(text);
      editorRef.current?.commands.insertContent(convertedHtml);
      return true;
    },
  },
});
```

**支持的格式：**

| 类别 | 格式 | Markdown |
|------|------|----------|
| 标题 | H1, H2, H3 | `#`, `##`, `###` |
| 文本样式 | 加粗、斜体、下划线、删除线 | `**`, `*`, `<u>`, `~~` |
| 高亮 | 文字高亮 | `<mark>` |
| 代码 | 行内代码、代码块（语法高亮） | `` ` ``, ` ``` ` |
| 列表 | 无序、有序、任务列表 | `-`, `1.`, `- [ ]` |
| 表格 | 表格（含表头） | `\|` |
| 其他 | 引用、链接、分隔线 | `>`, `[](url)`, `---` |

### 3.5 Markdown 双向转换

```typescript
// shared/lib/markdown.ts
import { marked } from "marked";
import TurndownService from "turndown";

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: false,
});

/**
 * Markdown → HTML
 */
export function markdownToHtml(md: string): string {
  if (!md.trim()) return "";

  // 预处理任务列表
  const processed = md.replace(
    /^(\s*)- \([ xX]\) (.*)$/gm,
    (match, indent, checked, text) => {
      const isChecked = checked.toLowerCase() === "x";
      const level = Math.floor(indent.length / 2);
      const indentStr = "  ".repeat(level);
      return `${indentStr}<li data-type="taskItem" data-checked="${isChecked}">${text}</li>`;
    }
  );

  // 包装连续任务项
  const withTaskLists = processed.replace(
    /((?:<li data-type="taskItem"[^>]*>.*<\/li>\n?)+)/g,
    '<ul data-type="taskList">\n$1</ul>\n'
  );

  return marked.parse(withTaskLists) as string;
}

/**
 * HTML → Markdown
 */
function createTurndownService(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
  });

  // 删除线
  td.addRule("strikethrough", {
    filter: ["del", "s"],
    replacement: (content) => `~~${content}~~`,
  });

  // 下划线 - 保留 HTML
  td.addRule("underline", {
    filter: ["u"],
    replacement: (content) => `<u>${content}</u>`,
  });

  // 任务列表项
  td.addRule("taskListItem", {
    filter: (node) => 
      node.nodeName === "LI" && 
      node.getAttribute("data-type") === "taskItem",
    replacement: (content, node) => {
      const checked = (node as Element).getAttribute("data-checked") === "true";
      const checkbox = checked ? "[x]" : "[ ]";
      const trimmed = content.replace(/^\n+/, "").replace(/\n+$/, "");
      return `- ${checkbox} ${trimmed}\n`;
    },
  });

  // 任务列表容器
  td.addRule("taskList", {
    filter: (node) =>
      node.nodeName === "UL" &&
      node.getAttribute("data-type") === "taskList",
    replacement: (content) => `\n${content}\n`,
  });

  // 分隔线
  td.addRule("horizontalRule", {
    filter: "hr",
    replacement: () => "\n---\n",
  });

  return td;
}

const turndownService = createTurndownService();

export function htmlToMarkdown(html: string): string {
  if (!html.trim()) return "";
  return turndownService.turndown(html);
}

/**
 * 检测文本是否为 Markdown 格式
 */
export function looksLikeMarkdown(text: string): boolean {
  if (!text || text.length < 3) return false;

  // 强特征（任一匹配即认为）
  const strongPatterns = [
    /^#{1,6}\s+\S/m,       // 标题
    /^```/m,               // 代码块
    /^\s*- \[[ xX]\]\s/m,  // 任务列表
  ];

  for (const p of strongPatterns) {
    if (p.test(text)) return true;
  }

  // 弱特征（需 2+ 匹配）
  const weakPatterns = [
    /^\s*[-*+]\s+\S/m,     // 无序列表
    /^\s*\d+\.\s+\S/m,     // 有序列表
    /^\s*>\s+/m,           // 引用
    /\*\*\S[\s\S]*?\S\*\*/, // 加粗
    /(?<!\*)\*\S[\s\S]*?\S\*(?!\*)/, // 斜体
    /\[.+?\]\(.+?\)/,       // 链接
    /^---$/m,              // 分隔线
    /!\[.*?\]\(.+?\)/,      // 图片
  ];

  let count = 0;
  for (const p of weakPatterns) {
    if (p.test(text)) count++;
  }

  return count >= 2;
}
```

### 3.6 文件树侧边栏（核心交互）

```typescript
// views/editor/components/Sidebar.tsx
export function Sidebar() {
  const files = useAppStore((s) => s.files);
  const currentPath = useAppStore((s) => s.currentPath);
  const { openFile, remove } = useFileActions();

  // 展开/折叠状态
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const paths = new Set<string>();
    for (const f of files) {
      if (f.type === "directory") paths.add(f.path);
    }
    return paths;
  });

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  return (
    <aside className="w-64 border-r border-border flex flex-col bg-sidebar shrink-0">
      {/* 搜索栏 + 新建按钮 */}
      <div className="h-11 px-3 flex items-center gap-2 border-b border-border">
        <Search className="w-3.5 h-3.5 text-muted-foreground/60" />
        <input type="text" placeholder="搜索..." />
        <kbd className="text-[10px] text-muted-foreground/50">⌘K</kbd>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Plus className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleNewFile("")}>
              新建文档
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNewFolder("")}>
              新建文件夹
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 文件树 */}
      <div className="flex-1 overflow-y-auto py-1.5">
        <FileTree
          items={files}
          depth={0}
          currentPath={currentPath}
          expanded={expanded}
          onToggle={toggleExpand}
          onSelect={openFile}
        />
      </div>
    </aside>
  );
}

// 递归文件树渲染
function FileTree({ items, depth, currentPath, expanded, onToggle, onSelect }) {
  const sorted = [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      {sorted.map((item) => {
        const paddingLeft = 12 + depth * 16;

        if (item.type === "directory") {
          const isExpanded = expanded.has(item.path);
          return (
            <ContextMenu key={item.path}>
              <ContextMenuTrigger>
                <button
                  onClick={() => onToggle(item.path)}
                  style={{ paddingLeft }}
                >
                  {isExpanded ? <ChevronDown /> : <ChevronRight />}
                  {isExpanded ? <FolderOpen /> : <Folder />}
                  <span>{item.name}</span>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem>新建文档</ContextMenuItem>
                <ContextMenuItem>新建文件夹</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>重命名</ContextMenuItem>
                <ContextMenuItem destructive>删除</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        }

        // 文件项
        const isActive = currentPath === item.path;
        return (
          <ContextMenu key={item.path}>
            <ContextMenuTrigger>
              <button
                onClick={() => onSelect(item.path)}
                className={isActive ? "bg-primary/8 text-primary font-medium" : ""}
                style={{ paddingLeft: paddingLeft + 16 }}
              >
                <FileText />
                <span>{item.name}</span>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem>重命名</ContextMenuItem>
              <ContextMenuItem destructive>删除</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
```

### 3.7 全局搜索弹窗

```typescript
// views/editor/components/SearchDialog.tsx
export function SearchDialog({ onOpenFile }: SearchDialogProps) {
  const open = useAppStore((s) => s.searchOpen);
  const setOpen = useAppStore((s) => s.setSearchOpen);
  const files = useAppStore((s) => s.files);

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"filename" | "fulltext">("filename");
  const [results, setResults] = useState<SearchResult[]>([]);

  // 防抖搜索
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (mode === "filename") {
        // 本地文件名过滤
        setResults(searchByFilename(query));
      } else {
        // 全文搜索：合并本地 + API
        const filenameResults = searchByFilename(query);
        const apiResults = await searchFiles(query);
        setResults(mergeResults(filenameResults, apiResults));
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, mode]);

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) {
        onOpenFile(results[activeIndex].path);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if ((e.ctrlKey || e.metaKey) && e.key === "d") {
      setMode((m) => (m === "filename" ? "fulltext" : "filename"));
    }
  }, [results, activeIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl">
        {/* 搜索输入 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === "filename" ? "搜索文件..." : "全文搜索..."}
          />
          <button onClick={() => setMode(mode === "filename" ? "fulltext" : "filename")}>
            {mode === "filename" ? <FileText /> : <BookOpen />}
          </button>
        </div>

        {/* 最近文件 */}
        {query.length < 2 && recentOpened.length > 0 && (
          <div className="px-4 py-2 border-b">
            <div className="text-[10px] uppercase tracking-wider">最近打开</div>
            {recentOpened.map((path) => (
              <button key={path} onClick={() => onOpenFile(path)}>
                {path.split("/").pop()}
              </button>
            ))}
          </div>
        )}

        {/* 搜索结果 */}
        <div className="max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={r.path}
              onClick={() => { onOpenFile(r.path); setOpen(false); }}
              className={i === activeIndex ? "bg-accent" : ""}
            >
              <span>{r.name}</span>
              <span>{r.path}</span>
              {r.matches[0] && <span>{r.matches[0]}</span>}
            </button>
          ))}
        </div>

        {/* 底部快捷键提示 */}
        <div className="px-4 py-1.5 border-t text-[10px]">
          <span>↑↓ 选择</span>
          <span>Enter 打开</span>
          <span>Esc 关闭</span>
          <span>⌘D 切换模式</span>
        </div>
      </div>
    </div>
  );
}
```

### 3.8 目录导航（TOC）

```typescript
// views/editor/components/TableOfContents.tsx
export function TableOfContents({ scrollContainerRef }: TableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const content = useAppStore((s) => s.content);

  // 提取标题
  const extractHeadings = useCallback(() => {
    const headings = scrollContainerRef.current?.querySelectorAll("h1, h2, h3");
    const tocItems: TocItem[] = [];
    const idCounts = new Map<string, number>();

    headings?.forEach((heading, index) => {
      const text = heading.textContent?.trim();
      if (!text) return;

      let id = slugify(text);
      const count = idCounts.get(id) || 0;
      idCounts.set(id, count + 1);
      if (count > 0) id = `${id}-${count}`;

      const level = Number.parseInt(heading.tagName[1], 10);
      tocItems.push({ id, text, level, index });
    });

    setItems(tocItems);
  }, [scrollContainerRef]);

  // 滚动高亮
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      let currentId: string | null = null;

      for (const item of items) {
        const el = container.querySelectorAll("h1, h2, h3")[item.index];
        if (el && el.offsetTop - 12 <= scrollTop) {
          currentId = item.id;
        }
      }
      setActiveId(currentId);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [items]);

  const handleClick = (index: number) => {
    const el = scrollContainerRef.current?.querySelectorAll("h1, h2, h3")[index];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <aside className="hidden xl:block w-48 border-l border-border p-4">
      <div className="text-[11px] font-medium uppercase">On this page</div>
      <nav>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.index)}
            className={activeId === item.id ? "text-primary font-medium" : ""}
            style={{ paddingLeft: item.level * 12 }}
          >
            {item.text}
          </button>
        ))}
      </nav>
    </aside>
  );
}
```

---

## 四、Go Embed 嵌入式技术详解

### 4.1 嵌入机制

```go
// site/embed.go
package site

import (
    "embed"
    "io/fs"
)

//go:embed all:dist
var distDir embed.FS

// DistDirFS 移除 "dist/" 前缀，使路径直接可用
// 例如：访问 "index.html" 而非 "dist/index.html"
var DistDirFS, _ = fs.Sub(distDir, "dist")
```

**关键说明：**
- `//go:embed all:dist` - `all:` 前缀包含隐藏文件
- `fs.Sub(distDir, "dist")` - 移除前缀，简化路径访问
- 嵌入的文件在编译时打包进二进制，运行时通过 `embed.FS` 访问

### 4.2 开发与生产分离（Build Tags）

**开发模式**（`-tags development`）：

```go
// internal/server/server_development.go
//go:build development

package server

import (
    gopb "github.com/castle-x/go-pocketbase"
    "github.com/pocketbase/pocketbase/core"
)

func (s *AppServer) serveFrontend(se *core.ServeEvent) {
    // 反向代理到 Vite 开发服务器
    gopb.ServeDevProxy(se, "localhost:5173")
}
```

**生产模式**：

```go
// internal/server/server_production.go
//go:build !development

package server

import (
    gopb "github.com/castle-x/go-pocketbase"
    "github.com/pocketbase/pocketbase/core"
    "nanomind/site"  // 导入 embed 包
)

func (s *AppServer) serveFrontend(se *core.ServeEvent) {
    // 服务嵌入的静态文件
    gopb.ServeSPA(se, site.DistDirFS, []string{"/static/", "/assets/"})
}
```

### 4.3 构建流程

```bash
# === 开发模式 ===
# 同时启动后端和前端
make dev
# 或分别启动：
make dev-backend   # :8090
make dev-web       # :5173

# === 生产构建 ===
# 1. 构建前端（生成 site/dist/）
cd site && pnpm run build

# 2. 构建后端（embed 自动打包 dist/）
go build -o bin/nanomind ./cmd/app

# 或使用 Makefile
make build

# === 最终二进制包含 ===
# - Go 代码编译的机器码
# - site/dist/ 下的所有静态文件（通过 embed.FS）
```

### 4.4 Vite 配置（配合 Embed）

```typescript
// site/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/app": path.resolve(__dirname, "./src/app"),
      "@/views": path.resolve(__dirname, "./src/views"),
      "@/widgets": path.resolve(__dirname, "./src/widgets"),
      "@/shared": path.resolve(__dirname, "./src/shared"),
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // 代码分割
        manualChunks: {
          "vendor-tiptap": ["@tiptap/react", "@tiptap/core"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-router": ["react-router"],
        },
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8090" },
      "/_": { target: "http://localhost:8090" },
    },
  },
});
```

---

## 五、关键交互流程

### 5.1 文件打开流程

```
用户点击文件树中的文件
  ↓
检查未保存变更
  ├─ 有变更 → 弹出确认对话框："有未保存的更改，是否放弃？"
  │            ├─ 取消 → 中止操作
  │            └─ 确认 → 继续
  └─ 无变更 → 继续
  ↓
调用 GET /api/files/{path} 获取 Markdown 内容
  ↓
markdownToHtml() 转换为 HTML
  ↓
设置编辑器内容、原始内容、当前路径
  ↓
退出编辑模式、重置变更标记
  ↓
添加到最近文件列表
  ↓
从内容中提取 TOC 标题
```

### 5.2 编辑保存流程

```
用户按 Ctrl+E 或点击编辑按钮
  ↓
进入编辑模式
  ├─ 编辑器变为可写
  ├─ 显示工具栏
  └─ 顶部栏显示"取消"和"保存"按钮
  ↓
用户编辑内容
  ↓
每次内容变化时
  └─ 对比原始内容 → 更新 hasChanges 状态
  ↓
用户按 Ctrl+S 或点击保存
  ├─ 条件检查：编辑模式 + 有变更 + 非保存中
  ↓
htmlToMarkdown() 将 HTML 转换为 Markdown
  ↓
调用 PUT /api/files/{path} 保存
  ↓
成功：
  ├─ 更新原始内容
  ├─ 重置变更标记
  └─ 退出编辑模式
```

### 5.3 全局搜索流程

```
用户按 Ctrl+K 或点击搜索框
  ↓
打开搜索弹窗，聚焦输入框
  ↓
输入关键词（防抖 200ms）
  ↓
文件名模式（默认）：
  └─ 本地过滤文件索引

全文模式：
  ├─ 本地文件名过滤
  ├─ 调用 GET /api/search?q=...
  └─ 合并结果（去重，补充匹配摘要）
  ↓
键盘导航：
  ├─ ↑↓ 移动选中
  ├─ Enter 打开选中文件
  ├─ Ctrl+D 切换模式
  └─ Escape 关闭弹窗
```

---

## 六、快捷键系统

| 快捷键 | 功能 | 条件 |
|--------|------|------|
| `Ctrl/Cmd+K` | 打开搜索弹窗 | 全局 |
| `Ctrl/Cmd+E` | 进入/退出编辑模式 | 已打开文件 |
| `Ctrl/Cmd+S` | 保存 | 编辑模式 |
| `Escape` | 关闭搜索 / 取消编辑 | 弹窗打开/编辑模式 |
| `Ctrl/Cmd+D` | 切换搜索模式（文件名/全文） | 搜索弹窗内 |
| `Ctrl/Cmd+B` | 加粗 | 编辑器内 |
| `Ctrl/Cmd+I` | 斜体 | 编辑器内 |
| `Ctrl/Cmd+U` | 下划线 | 编辑器内 |
| `Ctrl+Shift+8` | 无序列表 | 编辑器内 |
| `Ctrl+Shift+7` | 有序列表 | 编辑器内 |
| `Ctrl+Shift+9` | 任务列表 | 编辑器内 |
| `Ctrl+Alt+1/2/3` | 标题 1/2/3 | 编辑器内 |

---

## 七、部署与构建

### 7.1 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATA_DIR` | `~/.nanomind` | PocketBase 数据目录（SQLite、日志、配置） |
| `MIND_PATH` | `{DATA_DIR}/mind` | Markdown 文件存储路径 |
| `ENV` | - | 设为 `dev` 启用开发模式 + 自动迁移 |

### 7.2 Makefile 命令

```bash
make install        # 安装前端依赖 (pnpm install)
make dev            # 同时启动后端(8090)和前端(5173)
make dev-backend    # 仅启动后端开发服务器
make dev-web        # 仅启动前端开发服务器
make build          # 构建前端 + 后端
make build-web      # 仅构建前端
make build-backend  # 仅构建后端
make build-all      # 全平台交叉编译
make run            # 构建并运行
make test           # 运行测试
make clean          # 清理构建产物
```

### 7.3 跨平台构建产物

| 平台 | 文件名 | 大小 |
|------|--------|------|
| Linux amd64 | `nanomind-linux-amd64` | ~6.7 MB |
| Linux arm64 | `nanomind-linux-arm64` | ~6.4 MB |
| macOS Intel | `nanomind-darwin-amd64` | ~6.8 MB |
| macOS Apple Silicon | `nanomind-darwin-arm64` | ~6.4 MB |
| Windows amd64 | `nanomind-windows-amd64.exe` | ~6.9 MB |

### 7.4 运行

```bash
# 基本运行
./nanomind serve --http=localhost:8090

# 自定义数据目录
DATA_DIR=/path/to/data ./nanomind serve --http=localhost:8090

# 自定义笔记存储路径
MIND_PATH=/path/to/notes ./nanomind serve --http=localhost:8090

# 开发模式（自动迁移）
ENV=dev ./nanomind serve --http=localhost:8090
```

### 7.5 默认登录凭证

首次启动后使用默认凭证登录：
- **Email**: `admin@nanomind.local`
- **Password**: `nanomind123`

首次登录后会强制要求修改密码。

### 7.6 Admin 面板

PocketBase 内置管理界面：
- URL: `http://localhost:8090/_/`
- 用于用户管理、数据库查看等

---

## 八、安全设计

1. **路径遍历防护**
   - 所有文件操作通过 `decodePath()` 校验
   - 确保路径在 `MIND_PATH` 范围内

2. **隐藏文件过滤**
   - 自动跳过以 `.` 开头的文件
   - 跳过 `node_modules` 目录

3. **认证保护**
   - 所有文件 API 使用 `apis.RequireAuth()` 中间件
   - JWT Token 通过 PocketBase 管理

4. **密码安全**
   - 首次登录强制修改默认密码
   - 密码加密存储（PocketBase 内置）

5. **SQL 注入防护**
   - 使用 PocketBase 的 ORM 和参数化查询

---

## 九、文件存储规则

- 仅 `.md` 文件出现在文件树中
- 文件/目录以 `.` 开头被排除（隐藏）
- `node_modules` 目录被排除
- 文件按字母排序（目录优先，然后文件）
- 路径遍历被阻止 — 所有路径必须在 `MIND_PATH` 内

---

*文档生成时间: 2026-03-02*
*基于 NanoMind 项目代码分析*
