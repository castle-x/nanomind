# NanoMind GVE 重构方案（修订版）

> [!WARNING]
> 本文档已过期（截至 2026-03-04）。请改用 `docs/plans/2026-03-04-nanomind-gve-iteration-plan.md` 作为当前执行基线。
> 当前真实结构为：`cmd/server` + `internal/hub` + `site/src/app/main.tsx` + `docs/api`（文档）+ `api`（thrift 契约）。

**日期**: 2026-03-02
**状态**: 📋 方案阶段（未执行）
**修订**: v2 — 基于 Beszel 参考项目分析，修正 PocketBase + GVE 兼容方案

---

## 1. 核心发现：PocketBase 完全兼容 GVE

经过对 GVE 参考项目 **Beszel** 的深入分析，确认：

> **GVE 脚手架并不排斥 PocketBase** — Beszel 本身就是一个使用 PocketBase 的 GVE 项目。
> PocketBase 项目在 GVE 中使用 `internal/hub/` 模式（Hub 模式），而非 `internal/handler/` + `internal/service/` 模式。

### GVE 中的两种后端模式

| 模式 | 适用场景 | 目录结构 |
|------|---------|---------|
| **Hub 模式** | PocketBase 项目（如 Beszel、NanoMind） | `internal/hub/` |
| **Handler/Service 模式** | 标准 stdlib/Chi 项目 | `internal/handler/` + `internal/service/` |

NanoMind 使用 PocketBase，因此应采用 **Hub 模式**。

---

## 2. 架构对比

### Before: 当前结构

```
nanomind/
├── cmd/app/                         # ❌ 非标准名称（应为 cmd/server/）
│   └── main.go
├── internal/
│   ├── server/                      # ⚠️ 功能正确，但命名不规范
│   │   ├── server.go                #    AppServer 包装 gopb.AppServer
│   │   ├── routes.go                #    路由注册（RequireAuth）
│   │   ├── files.go                 #    文件 CRUD + 搜索（混合 HTTP 和业务逻辑）
│   │   ├── server_development.go    #    开发代理
│   │   └── server_production.go     #    嵌入 SPA
│   └── migrations/
│       └── initial.go
├── site/
│   ├── embed.go                     # ✅
│   └── src/                         # ✅ FSD 架构
├── Makefile                         # ⚠️ CMD_PATH 指向 cmd/app
├── go.mod
└── (no gve.lock)                    # ❌ 缺少
```

### After: GVE 标准结构（Hub 模式）

```
nanomind/
├── cmd/server/                      # ✅ GVE 标准入口
│   └── main.go                      #    创建 PocketBase 实例 + Hub
│
├── internal/
│   ├── hub/                         # ✅ 核心编排器（替代 internal/server/）
│   │   ├── hub.go                   #    Hub 结构体，包装 core.App
│   │   ├── routes.go                #    registerApiRoutes()
│   │   ├── file_handlers.go         #    文件 CRUD HTTP 处理
│   │   ├── search_handlers.go       #    搜索 HTTP 处理
│   │   ├── server_development.go    #    开发代理（build tag）
│   │   └── server_production.go     #    嵌入 SPA（build tag）
│   │
│   ├── service/                     # ✅ 纯业务逻辑（可选，从 handlers 中提取）
│   │   ├── file_service.go          #    文件树构建、CRUD、搜索逻辑
│   │   └── mind_path.go             #    mindPath 管理
│   │
│   └── migrations/                  # ✅ 保持不变
│       └── initial.go
│
├── api/                             # ✅ API 契约定义（新增）
│   ├── registry.json
│   └── nanomind/
│       ├── files/v1/
│       ├── auth/v1/
│       └── search/v1/
│
├── site/                            # ✅ 前端保持不变
│   ├── embed.go
│   └── src/
│       ├── app/
│       ├── views/
│       ├── widgets/
│       └── shared/ui/              # UI 资产（gve ui add 安装到此）
│
├── gve.lock                         # ✅ 资产版本锁定（新增）
├── .gve/                            # ✅ 运行时目录（不提交）
├── Makefile                         # ✅ CMD_PATH → ./cmd/server
├── go.mod
└── .gitignore                       # ✅ 添加 .gve/
```

---

## 3. Hub 模式详解（Beszel 参考）

### 3.1 Hub 结构体

Hub 是 PocketBase GVE 项目的核心编排器。它包装 `core.App`，提供：

- 路由注册（`registerApiRoutes`）
- 服务初始化
- Hook 绑定
- 前端服务（dev proxy / embedded SPA）

```go
// internal/hub/hub.go
package hub

import (
    gopb "github.com/castle-x/go-pocketbase"
    "github.com/pocketbase/pocketbase/core"
)

type Hub struct {
    *gopb.AppServer                    // 包装 PocketBase App
    mindPath    string                 // NanoMind 特有：Markdown 文件路径
    fileService *service.FileService   // 可选：分离的业务逻辑
}

func NewHub(app core.App, mindPath string) *Hub {
    h := &Hub{
        AppServer: gopb.NewAppServer(app),
        mindPath:  mindPath,
    }
    h.fileService = service.NewFileService(mindPath)
    return h
}

func (h *Hub) Start() error {
    h.OnServe().BindFunc(func(e *core.ServeEvent) error {
        // 1. 初始化
        h.ensureDirectories()

        // 2. 注册路由
        h.registerApiRoutes(e)

        // 3. 注册前端服务（dev proxy 或 embedded SPA）
        h.startServer(e)

        // 4. go-pocketbase 默认设置
        gopb.RegisterSetupRoutes(e, h.AppServer)
        gopb.EnsureDefaults(h.App)

        return e.Next()
    })

    return h.App.(*pocketbase.PocketBase).Start()
}
```

### 3.2 路由注册

```go
// internal/hub/routes.go
package hub

import (
    "github.com/pocketbase/pocketbase/apis"
    "github.com/pocketbase/pocketbase/core"
)

func (h *Hub) registerApiRoutes(se *core.ServeEvent) {
    // 需要认证的路由组
    api := se.Router.Group("/api")
    api.Bind(apis.RequireAuth())

    // 文件操作
    api.GET("/files", h.handleListFiles)
    api.POST("/files", h.handleCreateFile)
    api.GET("/files/{path...}", h.handleReadFile)
    api.PUT("/files/{path...}", h.handleSaveFile)
    api.PATCH("/files/{path...}", h.handleRenameFile)
    api.DELETE("/files/{path...}", h.handleDeleteFile)

    // 搜索
    api.GET("/search", h.handleSearch)

    // 认证信息
    api.GET("/auth/me", h.handleAuthMe)
}
```

### 3.3 Handler 方法（Hub 上的方法）

```go
// internal/hub/file_handlers.go
package hub

import (
    "net/http"
    "github.com/pocketbase/pocketbase/core"
)

func (h *Hub) handleListFiles(e *core.RequestEvent) error {
    tree := h.fileService.GetTree()
    return e.JSON(http.StatusOK, map[string]any{
        "code": 0,
        "data": tree,
    })
}

func (h *Hub) handleReadFile(e *core.RequestEvent) error {
    path := e.Request.PathValue("path")
    content, err := h.fileService.ReadFile(path)
    if err != nil {
        return e.JSON(http.StatusNotFound, map[string]any{
            "code":    1,
            "message": "文件不存在",
        })
    }
    return e.JSON(http.StatusOK, map[string]any{
        "code": 0,
        "data": content,
    })
}
```

### 3.4 Service 层（可选分离）

```go
// internal/service/file_service.go
package service

type FileService struct {
    mindPath string
}

func NewFileService(mindPath string) *FileService {
    return &FileService{mindPath: mindPath}
}

func (fs *FileService) GetTree() []FileTreeItem {
    // 纯业务逻辑：遍历文件系统，构建树
    // 不依赖 PocketBase HTTP 类型
}

func (fs *FileService) ReadFile(path string) (string, error) {
    // 纯业务逻辑：读取 Markdown 文件
}
```

### 3.5 Build Tag 分离

```go
// internal/hub/server_production.go
//go:build !development

package hub

func (h *Hub) startServer(se *core.ServeEvent) error {
    gopb.ServeSPA(se, site.DistDirFS, []string{"/static/", "/assets/"})
    return nil
}

// internal/hub/server_development.go
//go:build development

package hub

func (h *Hub) startServer(se *core.ServeEvent) error {
    gopb.ServeDevProxy(se, "localhost:5173")
    return nil
}
```

---

## 4. 当前代码与 GVE Hub 模式的差距分析

### 4.1 差距矩阵

| 当前文件 | GVE 目标 | 差距 | 工作量 |
|---------|---------|------|-------|
| `cmd/app/main.go` | `cmd/server/main.go` | 仅目录重命名 | 极小 |
| `internal/server/server.go` | `internal/hub/hub.go` | 包名 `server` → `hub`，重命名 | 小 |
| `internal/server/routes.go` | `internal/hub/routes.go` | 包名更新 | 小 |
| `internal/server/files.go` | `internal/hub/file_handlers.go` + `internal/service/file_service.go` | 拆分 HTTP 和业务逻辑 | 中等 |
| `internal/server/server_development.go` | `internal/hub/server_development.go` | 包名更新 | 极小 |
| `internal/server/server_production.go` | `internal/hub/server_production.go` | 包名更新 | 极小 |
| `internal/migrations/initial.go` | `internal/migrations/initial.go` | 无变化 | 无 |
| `site/embed.go` | `site/embed.go` | 无变化 | 无 |
| (不存在) | `gve.lock` | 新建 | 极小 |
| (不存在) | `api/` | 新建 | 小 |

### 4.2 PocketBase 集成点（无需改动）

以下 PocketBase API 在重构中保持不变：

| API | 用途 | 改动 |
|-----|------|------|
| `core.App` | 主实例接口 | 无 |
| `core.ServeEvent` | 服务器启动事件 | 无 |
| `core.RequestEvent` | 请求上下文 | 无 |
| `apis.RequireAuth()` | 认证中间件 | 无 |
| `apis.Static()` | 静态文件服务 | 无 |
| `pocketbase.NewWithConfig()` | 创建实例 | 无 |
| `migratecmd.MustRegister()` | 迁移系统 | 无 |
| `gopb.AppServer` | PocketBase 包装 | 无 |
| `gopb.ServeSPA()` | 嵌入 SPA | 无 |
| `gopb.ServeDevProxy()` | 开发代理 | 无 |

**结论**: PocketBase 集成完全不需要改动，重构仅涉及目录结构和包命名。

---

## 5. 重构任务清单

### Phase 1: 准备（3 个任务）

| # | 任务 | 说明 |
|---|------|------|
| 1 | 环境检查 | Go 1.22+, Node 18+, pnpm, Git |
| 2 | 创建 `gve.lock` | 初始化资产版本锁定文件 |
| 3 | 更新 `.gitignore` | 添加 `.gve/` 目录 |

### Phase 2: Go 后端重构（6 个任务）

| # | 任务 | 说明 |
|---|------|------|
| 4 | 创建 `cmd/server/` | 从 `cmd/app/` 复制 main.go |
| 5 | 创建 `internal/hub/` | 从 `internal/server/` 迁移，包名改为 `hub` |
| 6 | 拆分 `files.go` | HTTP handlers 留在 hub，业务逻辑提取到 `internal/service/` |
| 7 | 更新所有导入路径 | `internal/server` → `internal/hub`，`cmd/app` → `cmd/server` |
| 8 | 删除旧目录 | 清理 `cmd/app/` 和 `internal/server/` |
| 9 | 编译验证 | `go build ./cmd/server` 无错误 |

### Phase 3: 工具链更新（3 个任务）

| # | 任务 | 说明 |
|---|------|------|
| 10 | 更新 Makefile | `CMD_PATH := ./cmd/server` |
| 11 | 测试 `make build` | 确保单二进制构建成功 |
| 12 | 测试 `make dev` | 确保开发模式正常 |

### Phase 4: API 契约 + 文档（3 个任务）

| # | 任务 | 说明 |
|---|------|------|
| 13 | 创建 `api/` 目录 | API 契约定义 + registry.json |
| 14 | 文档化 API 端点 | 为 files/auth/search 写 API 文档 |
| 15 | 更新 CLAUDE.md | 反映新的目录结构 |

**总计: 15 个任务**（比初版精简 3 个，因为合并了一些步骤）

---

## 6. 文件映射表（完整）

### 移动/重命名

| 来源 | 目标 | 操作 |
|------|------|------|
| `cmd/app/main.go` | `cmd/server/main.go` | 移动 + 更新导入 |
| `internal/server/server.go` | `internal/hub/hub.go` | 移动 + 改包名 |
| `internal/server/routes.go` | `internal/hub/routes.go` | 移动 + 改包名 |
| `internal/server/files.go` | `internal/hub/file_handlers.go` | 拆分（HTTP 部分） |
| `internal/server/files.go` | `internal/service/file_service.go` | 拆分（业务逻辑） |
| `internal/server/server_development.go` | `internal/hub/server_development.go` | 移动 + 改包名 |
| `internal/server/server_production.go` | `internal/hub/server_production.go` | 移动 + 改包名 |

### 不变

| 文件 | 原因 |
|------|------|
| `internal/migrations/initial.go` | 已符合 GVE 标准 |
| `site/embed.go` | 已符合 GVE 标准 |
| `site/src/` (整个前端) | FSD 架构已符合 GVE 标准 |
| `go.mod` | 仅 `go mod tidy` 更新 |

### 新增

| 文件 | 说明 |
|------|------|
| `gve.lock` | 资产版本锁定 |
| `api/registry.json` | API 契约注册表 |
| `api/nanomind/files/v1/API.md` | 文件 API 文档 |
| `api/nanomind/auth/v1/API.md` | 认证 API 文档 |
| `api/nanomind/search/v1/API.md` | 搜索 API 文档 |

### 删除

| 文件/目录 | 原因 |
|----------|------|
| `cmd/app/` | 已迁移到 `cmd/server/` |
| `internal/server/` | 已迁移到 `internal/hub/` |

---

## 7. 风险评估

### 低风险

- 目录重命名（`cmd/app` → `cmd/server`）
- 包名更新（`server` → `hub`）
- 新增 `gve.lock` 和 `api/`（纯新增，不影响现有功能）

### 中等风险

- `files.go` 拆分为 `file_handlers.go` + `file_service.go`（需要仔细处理依赖关系）
- 导入路径全局更新（编译器会检查，但需要确保无遗漏）

### 缓解措施

1. 分阶段提交，每步验证编译
2. `files.go` 拆分可以分两步：先移动整个文件到 hub，再提取 service
3. 使用 `go build` 即时验证每次改动

### 回滚计划

```bash
git log --oneline | grep "gve\|hub"
git reset --hard <commit-before-gve>
```

---

## 8. 关键决策记录

### 决策 1：为什么用 Hub 模式而非 Handler/Service 模式？

**原因**：
1. GVE 参考项目 Beszel 就使用 Hub 模式
2. PocketBase 的 `OnServe` hook + `core.RequestEvent` 天然适合 Hub 模式
3. Handlers 作为 Hub 的方法，可以直接访问 Hub 的服务和状态
4. 避免不必要的抽象层

### 决策 2：是否需要 internal/service/ 层？

**建议**：可选但推荐。

- **有 service 层的好处**：业务逻辑与 HTTP 处理分离，便于测试
- **无 service 层也可以**：Beszel 就没有严格的 service 层，handlers 直接包含业务逻辑
- **NanoMind 建议有**：因为文件操作逻辑（树构建、搜索）足够复杂，值得分离

### 决策 3：go-pocketbase 库是否保留？

**保留**。`gopb.AppServer`、`gopb.ServeSPA()`、`gopb.ServeDevProxy()` 提供了有价值的封装，减少样板代码。Hub 结构体包装 `gopb.AppServer` 而非直接包装 `core.App`。

### 决策 4：前端结构是否需要改动？

**不需要**。当前 FSD 架构（app/views/widgets/shared）已完全符合 GVE 标准。`site/src/shared/ui/` 是 `gve ui add` 的标准安装位置。

---

## 9. 与 Beszel 参考项目的对标

| 方面 | Beszel | NanoMind (重构后) | 说明 |
|------|--------|-----------------|------|
| 入口 | `cmd/hub/main.go` | `cmd/server/main.go` | GVE 标准用 `server` |
| 核心 | `internal/hub/hub.go` | `internal/hub/hub.go` | 一致 |
| 路由 | Hub 方法 | Hub 方法 | 一致 |
| PocketBase | `core.App` | `gopb.AppServer` (包装) | NanoMind 多一层封装 |
| 认证 | `apis.RequireAuth()` | `apis.RequireAuth()` | 一致 |
| 前端 | `internal/site/embed.go` | `site/embed.go` | 位置不同但功能一致 |
| Dev/Prod | Build tags | Build tags | 一致 |
| 特性模块 | `internal/alerts/`, `internal/users/` | `internal/service/` | 组织方式不同 |
| 资产管理 | 无 | `gve.lock` | NanoMind 增加了 GVE 资产管理 |

---

## 10. 成功标准

### 构建验证
- [ ] `make clean && make build` 成功
- [ ] 二进制嵌入了前端（大小 > 5MB）
- [ ] `./bin/nanomind serve --http=localhost:8090` 正常运行

### 功能验证
- [ ] 登录功能正常（PocketBase 认证）
- [ ] 文件树加载正常
- [ ] 文件 CRUD 正常
- [ ] 搜索功能正常
- [ ] Admin UI (`/_/`) 可访问

### 结构验证
- [ ] `cmd/server/main.go` 存在
- [ ] `internal/hub/` 存在且包含所有核心文件
- [ ] `internal/server/` 已删除
- [ ] `cmd/app/` 已删除
- [ ] `gve.lock` 存在且有效
- [ ] `api/` 目录和契约文件存在

### 代码质量
- [ ] `go build ./cmd/server` 无错误
- [ ] `go vet ./...` 无警告
- [ ] `cd site && pnpm lint && pnpm typecheck` 无错误

---

## 11. 参考文档

- **详细实现计划**: `docs/plans/2026-03-02-gve-restructure.md`（需同步更新）
- **验收清单**: `docs/2026-03-02-gve-checklist.md`（需同步更新）
- **GVE 使用指南**: `.claude/skills/gve/README.md`
- **GVE 参考**: `.claude/skills/gve/reference.md`
- **Beszel 参考项目**: `reference/beszel/`
- **项目规范**: `CLAUDE.md`

---

**方案状态**: ✅ 修订完成（v2）
**核心变更**: `internal/handler/` + `internal/service/` → `internal/hub/` + `internal/service/`（可选）
**下一步**: 同步更新实现计划和检查清单，然后等待执行决策
