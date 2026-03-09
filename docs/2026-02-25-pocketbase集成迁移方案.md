# PocketBase 集成迁移方案

## 目标

将 PocketBase 从独立进程迁移为 Go Library 集成，实现真正的单二进制部署。

## 架构变更

### 迁移前
- Go 后端 `:4000`（stdlib net/http，零外部依赖）
- PocketBase 独立进程 `:8090`
- 两进程通过 HTTP 通信验证 token

### 迁移后
- 单一 PocketBase 进程 `:8090`（含自定义文件 API + 嵌入 SPA）
- 认证、数据库、Admin UI 全部内置
- `apis.RequireAuth()` 替代自写 AuthMiddleware

## 删除的文件

| 文件/目录 | 原因 |
|-----------|------|
| `pocketbase/` | 独立 PocketBase 二进制不再需要 |
| `pb_data/` (根目录) | 历史遗留数据 |
| `pb_migrations/` | 旧迁移文件，重建到 `internal/migrations/` |
| `.pids/` | 旧进程管理文件 |
| `internal/middleware/auth.go` | PocketBase 内置认证替代 |
| `pkg/siteserver/` | PocketBase `apis.Static` 替代 |

## 新增/改动文件

| 文件 | 说明 |
|------|------|
| `go.mod` | 添加 pocketbase 依赖 |
| `cmd/app/main.go` | 重写：PocketBase 初始化 + AppServer |
| `internal/server/server.go` | AppServer 包装 core.App |
| `internal/server/routes.go` | 文件 CRUD + 搜索路由 |
| `internal/server/files.go` | 文件操作业务逻辑（从旧 handlers.go 迁移） |
| `internal/server/server_production.go` | 生产环境静态文件服务 |
| `internal/server/server_development.go` | 开发环境反向代理 |
| `internal/migrations/initial.go` | 初始化设置 |
| `site/src/shared/lib/pb-client.ts` | PB 客户端改为同源 |
| `site/vite.config.ts` | 删除 `/pb` 代理 |
| `Makefile` | 简化为单进程管理 |
| `Dockerfile` | PocketBase serve 命令 |
| `deploy/nanomind.service` | 单服务 |

## 运行时数据目录

```
nanomind_data/
├── data.db      # PocketBase 主数据库
├── logs.db      # 请求日志
├── storage/     # 文件上传
└── memos/       # Markdown 笔记
```

可通过 `--dir` 参数或 `DATA_DIR` 环境变量自定义。

## 端口变化

统一为 `:8090`（PocketBase 默认），可通过 `--http` 参数自定义。

## API 兼容性

- `/api/files`、`/api/search` 保持不变
- 新增 PocketBase 内置 `/api/collections/...`
- Admin UI 位于 `/_/`

---

# PocketBase 登录态隔离问题（备忘）

## 现象

用户在 NanoMind 前端登录后，访问 PocketBase Admin UI (`/_/`) 仍需要单独登录。两边的登录状态互不共享。

## 根因

PocketBase 的 `_superusers` 和 `users` 是两个独立的认证集合（Collection），各自维护独立的 session/token：

- **`users`**：前端应用登录使用，通过 `pb.collection("users").authWithPassword()` 认证
- **`_superusers`**：Admin UI (`/_/`) 专用，只能通过 Admin 登录页面认证，**不支持公开 API 认证**

它们的 JWT Token 彼此不互认，这是 PocketBase 的架构设计决策，不是 bug。

## 当前方案

**密码一致性保障**（已实现）：

- 首次启动时 `gopb.EnsureDefaults()` 同时创建 `_superusers` 和 `users` 记录，使用相同凭据
- 用户通过 NanoMind 修改密码时，`gopb.handleChangePassword` 自动同步更新 `_superusers` 中仍使用默认密码的记录
- 用户导航栏有"管理面板"按钮直接跳转到 `/_/`，使用相同密码即可登录

## Beszel 的做法（参考）

Beszel 项目也面临同样问题，它的做法是：
1. 启动时创建一个临时 superuser
2. 首次用户注册时，同时创建 `users` 和 `_superusers` 记录（相同凭据）
3. 删除临时 superuser

核心思路相同：**保持密码一致，而非共享 session**。

## 未来优化方向

- **Token 桥接**：创建自定义端点，用 users token 换取 superuser token（需要安全评估）
- **统一认证入口**：在 NanoMind 内嵌 Admin UI 的 iframe，自动传递 token
- **自定义用户管理页**：在 NanoMind 内直接实现用户 CRUD，跳过 Admin UI

---

# NanoMind → GVE 结构重构计划

## 背景

GVE（Go + Vite + Embed）是自研全栈脚手架，包含：

| 仓库 | 职责 |
|------|------|
| `gve` CLI | 项目初始化、开发、构建、资产管理 |
| `wk-ui` | UI 组件资产库（版本化管理） |
| `wk-api` | API 契约库（Thrift IDL + 生成代码） |

详细设计见 Skill：`.cursor/skills/gve/SKILL.md` 和 `.cursor/skills/gve/reference.md`

---

## 当前结构 vs GVE 目标结构对比

```
nanomind（现状）                       GVE（目标）
──────────────────────────────────    ────────────────────────────────────
cmd/app/main.go                  →    cmd/server/main.go
internal/server/                 →    internal/handler/  (HTTP 层)
  ├── server.go                        └── internal/service/ (业务层)
  ├── files.go                         （文件操作逻辑移入 service）
  └── routes.go
internal/migrations/             →    internal/migrations/ (保留不变)
site/                            ≈    site/ (基本一致)
  └── src/shared/ui/（shadcn）    →    site/src/shared/ui/（gve ui 管理）
Makefile                         →    gve 命令替代
─────────────────────────────────     新增 ─────────────────────────────
                                       gve.lock（资产版本锁定，提交 Git）
                                       .gve/（运行时数据，不提交）
```

---

## 待决策的关键问题

开始重构前需要确认以下三点：

### 问题 1：gve CLI 是否可用？

需要确认 `gve` 二进制是否已经存在并可以使用，还是要先开发/安装 gve 本身。

- **如果 gve 已可用**：直接用 `gve init` 生成骨架，再迁移现有代码
- **如果 gve 尚未开发**：先规划 gve 的实现，nanomind 重构作为验证场景

### 问题 2：PocketBase 与 GVE 的端口/路由冲突

GVE `base-setup` 的 `vite.config.ts` 默认把 `/api/*` 代理到 `:8080`，而 nanomind 是 PocketBase 在 `:8090` 提供所有服务（包括 `/_/` Admin UI 和 `/api/*` 自定义路由）。

需要决定：
- GVE 的 base-setup 是否要支持 PocketBase 模式（代理到 `:8090`，额外暴露 `/_/`）？
- 还是为 PocketBase 项目提供专门的 base-setup 变体？

### 问题 3：重构边界

确认本次重构的范围：

- [ ] **仅对齐目录结构**：`cmd/app` → `cmd/server`，`internal/server` 拆分为 `handler` + `service`
- [ ] **UI 资产纳入 gve.lock 管理**：把现有 shadcn 组件归入 wk-ui 资产库
- [ ] **完整迁移到 GVE 工作流**：`gve dev` / `gve build` 替代 Makefile，新增 `gve.lock`

---

## 重构执行步骤（待确认后执行）

### Step 1：Go 目录结构调整

```
cmd/app/main.go   →  cmd/server/main.go
internal/server/  →  拆分为：
  server.go (AppServer)      →  保留在 internal/server/ 或合并入 cmd
  routes.go                  →  internal/handler/routes.go
  files.go (handler 部分)    →  internal/handler/files.go
  files.go (业务逻辑部分)    →  internal/service/file_service.go
  migrations/                →  不变
```

### Step 2：开发命令对齐

| 现状 | 目标 |
|------|------|
| `make dev` | `gve dev` |
| `make build` | `gve build` |
| `make run` | `gve run` |
| `make test` | `go test ./...`（保持） |

新增 `gve.lock` 文件，记录 UI 资产版本。

### Step 3：UI 资产迁移（可选）

把现有 `site/src/shared/ui/` 下的 shadcn 组件整理成 wk-ui 资产：

| 现有组件 | 目标资产名 |
|---------|-----------|
| button.tsx | `button` |
| dialog.tsx | `dialog` |
| input.tsx、label.tsx、card.tsx | `form-primitives` |
| sonner（toast） | `toast`（通过 deps） |

### Step 4：PocketBase 专用配置

在 wk-ui 中新增 `pb-setup` 资产（dest: "site" 全局资产），专门为 PocketBase 集成项目提供：
- 代理到 `:8090` 的 `vite.config.ts`
- `/_/` 路径透传配置

---

## 当前项目已完成的标准化工作（无需重做）

- ✅ Go 后端使用 `github.com/castle-x/go-pocketbase`（gopb）Module
- ✅ FSD 前端架构（app / views / widgets / entities / shared）
- ✅ Zustand + TanStack Query 状态管理
- ✅ PocketBase 认证（users collection + setup 路由）
- ✅ 首次登录强制改密 + Admin UI 密码同步
- ✅ `go:embed` 单二进制打包
- ✅ Build tags 分离开发/生产服务器
- ✅ `deploy/nanomind.service` systemd 部署文件
