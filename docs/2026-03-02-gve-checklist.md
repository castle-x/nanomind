# GVE 标准对齐检查清单（修订版）

**项目**: NanoMind
**日期**: 2026-03-02
**模式**: Hub 模式（PocketBase + GVE）
**参考**: Beszel 项目

---

## 1. 目录结构检查

### 根目录
- [ ] `go.mod` — Go 模块定义
- [ ] `go.sum` — Go 依赖锁定
- [ ] `Makefile` — `CMD_PATH := ./cmd/server`
- [ ] `gve.lock` — GVE 资产版本锁定
- [ ] `.gitignore` — 包含 `.gve/`
- [ ] `CLAUDE.md` — 已更新为 Hub 模式描述

### Go 后端（Hub 模式）

```
cmd/
└── server/
    └── main.go                ✅ GVE 标准入口

internal/
├── hub/                       ✅ PocketBase 编排器
│   ├── hub.go                 #   Hub struct (gopb.AppServer)
│   ├── routes.go              #   registerApiRoutes()
│   ├── file_handlers.go       #   文件 CRUD handlers
│   ├── search_handlers.go     #   搜索 handler
│   ├── server_development.go  #   //go:build development
│   └── server_production.go   #   //go:build !development
├── service/                   ✅ 纯业务逻辑
│   └── file_service.go        #   文件树、CRUD、搜索
└── migrations/
    └── initial.go             ✅ PocketBase 迁移
```

**检查项**:
- [ ] `cmd/app/` 已删除
- [ ] `internal/server/` 已删除
- [ ] `cmd/server/main.go` 存在，导入 `internal/hub`
- [ ] `internal/hub/hub.go` 存在，包名为 `hub`
- [ ] `internal/hub/routes.go` 使用 `apis.RequireAuth()`
- [ ] `internal/service/file_service.go` 不依赖 PocketBase HTTP 类型
- [ ] `internal/hub/server_development.go` 有 `//go:build development` tag
- [ ] `internal/hub/server_production.go` 有 `//go:build !development` tag

### 前端
```
site/
├── embed.go                   ✅ go:embed all:dist
└── src/
    ├── app/                   ✅ FSD 框架层
    ├── views/                 ✅ FSD 页面层
    ├── widgets/               ✅ FSD 组件层
    └── shared/
        └── ui/                ✅ gve ui add 安装位置
```

**检查项**:
- [ ] `site/embed.go` 存在且正确
- [ ] 前端结构符合 FSD 架构

### API 契约
```
api/
├── registry.json              ✅ 资产注册表
└── nanomind/
    ├── files/v1/API.md
    ├── auth/v1/API.md
    └── search/v1/API.md
```

**检查项**:
- [ ] `api/registry.json` 存在且有效
- [ ] 每个 API 资源都有文档

---

## 2. PocketBase 集成检查

### 认证
- [ ] `apis.RequireAuth()` 中间件已应用到所有自定义 API 路由
- [ ] `e.Auth` 用于获取当前用户
- [ ] PocketBase 内置认证端点可用 (`/api/collections/users/auth-with-password`)

### 路由
- [ ] 自定义路由通过 `se.Router.Group("/api")` 注册
- [ ] 所有 handlers 接收 `*core.RequestEvent`
- [ ] 路由在 `OnServe` hook 中注册

### 数据库
- [ ] PocketBase SQLite 正常工作
- [ ] 迁移在启动时自动运行
- [ ] Admin UI 在 `/_/` 可访问

### go-pocketbase 集成
- [ ] `gopb.AppServer` 正确包装
- [ ] `gopb.ServeSPA()` 在 production 模式工作
- [ ] `gopb.ServeDevProxy()` 在 development 模式工作
- [ ] `gopb.RegisterSetupRoutes()` 已注册
- [ ] `gopb.EnsureDefaults()` 已调用

---

## 3. 构建和运行检查

### 编译
```bash
go build -v ./cmd/server
```
- [ ] 编译成功，无错误
- [ ] 无 import cycle
- [ ] 无未使用的导入

### 前端构建
```bash
cd site && pnpm run build
```
- [ ] 构建成功
- [ ] `site/dist/` 生成

### 完整构建
```bash
make clean && make build
```
- [ ] 前端构建成功
- [ ] 后端构建成功
- [ ] `bin/nanomind` 生成
- [ ] 二进制大小 > 5MB

### 运行
```bash
./bin/nanomind serve --http=localhost:8090
```
- [ ] 启动成功
- [ ] API 可访问
- [ ] 前端可访问
- [ ] Admin UI 可访问 (`/_/`)

### 开发模式
```bash
make dev
```
- [ ] 后端启动 (:8090)
- [ ] 前端启动 (:5173)
- [ ] HMR 正常

---

## 4. 代码质量检查

### Go
```bash
go vet ./...
go fmt ./...
```
- [ ] 无 vet 警告
- [ ] 格式正确

### TypeScript
```bash
cd site && pnpm typecheck && pnpm lint
```
- [ ] 无类型错误
- [ ] 无 lint 错误

---

## 5. GVE 工具链兼容性检查

### gve.lock
- [ ] 文件存在且有效 JSON
- [ ] 包含 `version`, `ui`, `api` 字段
- [ ] 已提交到 Git

### .gve/ 运行时
- [ ] `.gve/` 在 `.gitignore` 中
- [ ] `.gve/` 目录不在 Git 中

### Makefile
- [ ] `CMD_PATH := ./cmd/server`
- [ ] `make dev` 正常
- [ ] `make build` 正常
- [ ] `make clean` 正常
- [ ] `make test` 正常

---

## 6. 功能回归检查

- [ ] 登录功能正常
- [ ] 文件树加载正常
- [ ] 创建文件/目录正常
- [ ] 读取文件正常
- [ ] 保存文件正常
- [ ] 重命名正常
- [ ] 删除正常
- [ ] 搜索功能正常
- [ ] Admin UI 正常

---

## 7. Git 检查

- [ ] 所有改动都有 commit
- [ ] commit 消息遵循 conventional commits
- [ ] 工作目录干净
- [ ] 无 merge conflicts

---

**检查清单状态**: ✅ 修订完成（v2 — Hub 模式）
**最后更新**: 2026-03-02
