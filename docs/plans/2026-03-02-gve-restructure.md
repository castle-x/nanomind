# NanoMind GVE 重构实现计划（修订版）

> [!WARNING]
> 本计划已废弃（截至 2026-03-04），不要继续按本文步骤执行。
> 请使用 `docs/plans/2026-03-04-nanomind-gve-iteration-plan.md`。
> 当前基线：`cmd/server` + `internal/hub` + `site/src/app/main.tsx` + `docs/api`（文档）+ `api`（thrift 契约）。

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 NanoMind 重构为 GVE Hub 模式，保留 PocketBase 全部能力，符合 GVE 目录规范。

**Architecture:** PocketBase 项目在 GVE 中使用 Hub 模式：`internal/hub/` 包装 `core.App`，handlers 作为 Hub 方法，业务逻辑可选分离到 `internal/service/`。参考 Beszel 项目。

**Tech Stack:** Go 1.22+ (PocketBase + go-pocketbase library), Vite 7.2 + React 19 + TypeScript 5.9, SQLite (via PocketBase)

---

## Phase 1: 准备工作

### Task 1: 环境检查

**Files:** None (verification only)

**Step 1:** 检查 Go 版本
```bash
go version
```
Expected: go1.22 or higher

**Step 2:** 检查 Node 和 pnpm
```bash
node --version && pnpm --version
```
Expected: Node v18+, pnpm v8+

**Step 3:** 确认项目当前可编译
```bash
go build -v ./cmd/app
```
Expected: 编译成功

---

### Task 2: 创建 gve.lock

**Files:**
- Create: `gve.lock`

**Step 1:** 创建 gve.lock
```json
{
  "version": "1",
  "ui": {
    "registry": "https://github.com/castle-x/wk-ui.git",
    "assets": {}
  },
  "api": {
    "registry": "https://github.com/castle-x/wk-api.git",
    "assets": {}
  }
}
```

**Step 2:** 验证
```bash
cat gve.lock | python3 -m json.tool
```
Expected: Valid JSON

**Step 3:** Commit
```bash
git add gve.lock
git commit -m "chore: init gve.lock"
```

---

### Task 3: 更新 .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1:** 追加 GVE 运行时规则
```
# GVE runtime
.gve/
```

**Step 2:** Commit
```bash
git add .gitignore
git commit -m "chore: add .gve/ to .gitignore"
```

---

## Phase 2: Go 后端 Hub 模式重构

### Task 4: 创建 cmd/server/ 并迁移 main.go

**Files:**
- Create: `cmd/server/main.go` (from `cmd/app/main.go`)

**Step 1:** 创建目录并复制
```bash
mkdir -p cmd/server
cp cmd/app/main.go cmd/server/main.go
```

**Step 2:** 修改 `cmd/server/main.go` 中的导入路径

将所有 `nanomind/internal/server` 改为 `nanomind/internal/hub`（此时 hub 包还不存在，后续步骤创建）。

**Step 3:** 暂不编译（等 Task 5 完成后一起验证）

**Step 4:** Commit
```bash
git add cmd/server/
git commit -m "chore: create cmd/server with updated main.go"
```

---

### Task 5: 创建 internal/hub/ 并迁移核心文件

**Files:**
- Create: `internal/hub/hub.go` (from `internal/server/server.go`)
- Create: `internal/hub/routes.go` (from `internal/server/routes.go`)
- Create: `internal/hub/server_development.go` (from `internal/server/server_development.go`)
- Create: `internal/hub/server_production.go` (from `internal/server/server_production.go`)

**Step 1:** 创建 hub 目录
```bash
mkdir -p internal/hub
```

**Step 2:** 复制文件
```bash
cp internal/server/server.go internal/hub/hub.go
cp internal/server/routes.go internal/hub/routes.go
cp internal/server/server_development.go internal/hub/server_development.go
cp internal/server/server_production.go internal/hub/server_production.go
```

**Step 3:** 在所有 hub 文件中更新包名

每个文件的第一行：
```go
// Before
package server

// After
package hub
```

**Step 4:** Commit
```bash
git add internal/hub/
git commit -m "chore: create internal/hub from internal/server"
```

---

### Task 6: 拆分 files.go 为 handlers + service

**Files:**
- Create: `internal/hub/file_handlers.go` (HTTP handlers)
- Create: `internal/hub/search_handlers.go` (搜索 handler)
- Create: `internal/service/file_service.go` (纯业务逻辑)

这是最复杂的任务。当前 `internal/server/files.go` (~337行) 混合了：
- HTTP 请求处理（解析参数、返回 JSON）
- 业务逻辑（文件树构建、文件 CRUD、全文搜索）
- 类型定义（FileTreeItem、响应结构体）

**Step 1:** 阅读当前 files.go，识别以下分类：

```
HTTP 处理部分（留在 hub）：
  - handleListFiles() → 解析请求 → 调用 service → 返回 JSON
  - handleCreateFile() → 解析 body → 调用 service → 返回 JSON
  - handleReadFile() → 解析路径 → 调用 service → 返回 JSON
  - handleSaveFile() → 解析 body → 调用 service → 返回 JSON
  - handleRenameFile() → 解析 body → 调用 service → 返回 JSON
  - handleDeleteFile() → 解析路径 → 调用 service → 返回 JSON
  - handleSearch() → 解析 query → 调用 service → 返回 JSON

业务逻辑部分（提取到 service）：
  - buildFileTree() → 遍历文件系统，返回树结构
  - readFileContent() → 读取文件内容
  - createFile() → 创建文件/目录
  - saveFile() → 写入文件内容
  - renameFile() → 重命名
  - deleteFile() → 删除
  - searchFiles() → 全文搜索

类型定义（放在 service 或单独的 types 文件）：
  - FileTreeItem
  - FileContentResponse
  - SearchResult
```

**Step 2:** 创建 `internal/service/file_service.go`

```go
package service

type FileService struct {
    MindPath string
}

func NewFileService(mindPath string) *FileService {
    return &FileService{MindPath: mindPath}
}

// 从 files.go 提取的纯业务逻辑方法
// func (fs *FileService) GetTree() ([]FileTreeItem, error) { ... }
// func (fs *FileService) ReadFile(path string) (string, error) { ... }
// func (fs *FileService) CreateFile(path, fileType, content string) error { ... }
// func (fs *FileService) SaveFile(path, content string) error { ... }
// func (fs *FileService) RenameFile(oldPath, newPath string) error { ... }
// func (fs *FileService) DeleteFile(path string) error { ... }
// func (fs *FileService) Search(query string) ([]SearchResult, error) { ... }
```

**Step 3:** 创建 `internal/hub/file_handlers.go`

```go
package hub

import (
    "net/http"
    "github.com/pocketbase/pocketbase/core"
)

func (h *Hub) handleListFiles(e *core.RequestEvent) error {
    tree, err := h.fileService.GetTree()
    if err != nil {
        return e.JSON(http.StatusInternalServerError, map[string]any{
            "code": 1, "message": err.Error(),
        })
    }
    return e.JSON(http.StatusOK, map[string]any{
        "code": 0, "data": tree,
    })
}

// ... 其他 handlers
```

**Step 4:** 编译验证
```bash
go build -v ./cmd/server
```
Expected: 编译成功

**Step 5:** Commit
```bash
git add internal/hub/file_handlers.go internal/hub/search_handlers.go internal/service/
git commit -m "refactor: split files.go into hub handlers + file service"
```

---

### Task 7: 更新 cmd/server/main.go 导入路径

**Files:**
- Modify: `cmd/server/main.go`

**Step 1:** 更新所有导入

```go
// Before
import "nanomind/internal/server"

// After
import "nanomind/internal/hub"
```

**Step 2:** 更新代码中的引用

```go
// Before
s := server.New(app)

// After
h := hub.NewHub(app, mindPath)
```

**Step 3:** 编译验证
```bash
go build -v ./cmd/server
```
Expected: 编译成功

**Step 4:** Commit
```bash
git add cmd/server/main.go
git commit -m "refactor: update main.go imports to use hub package"
```

---

### Task 8: 删除旧目录

**Files:**
- Delete: `cmd/app/` (entire directory)
- Delete: `internal/server/` (entire directory)

**Step 1:** 确认新代码可编译
```bash
go build -v ./cmd/server
```
Expected: 编译成功

**Step 2:** 删除旧目录
```bash
rm -rf cmd/app internal/server
```

**Step 3:** 确认删除后仍可编译
```bash
go build -v ./cmd/server
```
Expected: 编译成功

**Step 4:** 运行 go mod tidy
```bash
go mod tidy
```

**Step 5:** Commit
```bash
git add -A
git commit -m "chore: remove old cmd/app and internal/server directories"
```

---

### Task 9: 完整编译验证

**Files:** None (verification only)

**Step 1:** 清理并重新编译
```bash
go clean -cache
go build -v ./cmd/server
```
Expected: 编译成功

**Step 2:** 运行测试
```bash
go test ./...
```
Expected: 所有测试通过

**Step 3:** 检查 vet
```bash
go vet ./...
```
Expected: 无警告

---

## Phase 3: 工具链更新

### Task 10: 更新 Makefile

**Files:**
- Modify: `Makefile`

**Step 1:** 更新 CMD_PATH
```makefile
# Before
CMD_PATH    := ./cmd/app

# After
CMD_PATH    := ./cmd/server
```

**Step 2:** 验证
```bash
make help
```
Expected: 所有命令显示正常

**Step 3:** Commit
```bash
git add Makefile
git commit -m "chore: update Makefile CMD_PATH to cmd/server"
```

---

### Task 11: 测试 make build

**Files:** None (test only)

**Step 1:** 完整构建
```bash
make clean && make build
```
Expected: 前端和后端都构建成功，`bin/nanomind` 生成

**Step 2:** 验证二进制大小
```bash
ls -lh bin/nanomind
```
Expected: > 5MB（包含嵌入的前端）

---

### Task 12: 测试 make dev

**Files:** None (test only)

**Step 1:** 启动开发模式
```bash
make dev
```
Expected: 后端 (:8090) 和前端 (:5173) 都启动

**Step 2:** 验证功能
```bash
curl http://localhost:8090/_/     # PocketBase Admin UI
curl http://localhost:5173        # Vite 前端
```

---

## Phase 4: API 契约和文档

### Task 13: 创建 api/ 目录结构

**Files:**
- Create: `api/registry.json`
- Create: `api/nanomind/files/v1/API.md`
- Create: `api/nanomind/auth/v1/API.md`
- Create: `api/nanomind/search/v1/API.md`

**Step 1:** 创建目录
```bash
mkdir -p api/nanomind/{files,auth,search}/v1
```

**Step 2:** 创建 registry.json
```json
{
  "version": "1",
  "api": {
    "nanomind/files": {
      "v1": {
        "description": "File CRUD operations for Markdown notes",
        "files": ["API.md"]
      }
    },
    "nanomind/auth": {
      "v1": {
        "description": "Authentication (PocketBase built-in + custom /api/auth/me)",
        "files": ["API.md"]
      }
    },
    "nanomind/search": {
      "v1": {
        "description": "Full-text search across Markdown files",
        "files": ["API.md"]
      }
    }
  }
}
```

**Step 3:** 创建各 API 文档（内容参照 CLAUDE.md 中的 API 端点表）

**Step 4:** Commit
```bash
git add api/
git commit -m "docs: create API contract definitions"
```

---

### Task 14: 文档化 API 端点

**Files:**
- Create: `api/nanomind/files/v1/API.md`
- Create: `api/nanomind/auth/v1/API.md`
- Create: `api/nanomind/search/v1/API.md`

（详细内容参照 CLAUDE.md 中的端点定义，此处省略完整文档内容。）

**Step 1:** 为每个 API 资源编写文档，包含：
- 端点路径和方法
- 请求参数
- 响应格式
- 认证要求
- 示例

**Step 2:** Commit
```bash
git add api/
git commit -m "docs: document files, auth, search API contracts"
```

---

### Task 15: 更新 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1:** 更新目录结构说明

将 `cmd/app/main.go` 相关描述改为 `cmd/server/main.go`
将 `internal/server/` 相关描述改为 `internal/hub/`
添加 `internal/service/` 描述
添加 `api/` 目录说明
添加 `gve.lock` 说明

**Step 2:** 更新命令部分

将 `CMD_PATH` 相关的构建命令更新

**Step 3:** Commit
```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect GVE hub structure"
```

---

## 验收标准

重构完成后，运行以下验证：

```bash
# 1. 编译验证
go build -v ./cmd/server

# 2. 完整构建
make clean && make build

# 3. 代码质量
go vet ./...
cd site && pnpm lint && pnpm typecheck

# 4. 目录结构验证
test -d cmd/server && echo "✅ cmd/server"
test -d internal/hub && echo "✅ internal/hub"
test -d internal/service && echo "✅ internal/service"
test -f gve.lock && echo "✅ gve.lock"
test -d api && echo "✅ api"
test ! -d cmd/app && echo "✅ cmd/app removed"
test ! -d internal/server && echo "✅ internal/server removed"

# 5. 功能验证（需要手动）
make dev  # 启动并手动测试登录、文件 CRUD、搜索
```

---

**方案状态**: ✅ 修订完成（v2 — Hub 模式）
**总任务数**: 15
**预计时间**: 1-1.5 小时
