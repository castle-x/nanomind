# Plan: Multi-Space Dashboard Architecture

## Context

NanoMind 从单知识库 + 独立文档站的模式，重构为：
- **多知识库（Space）管理**：一个实例管理多个独立知识库
- **Dashboard 替代 Editor**：`/dashboard` 作为管理控制台，内嵌编辑器
- **多空间公开文档**：`/{slug}/*` 作为各空间的公开访问入口
- **同步清理死代码**：移除探索阶段发现的冗余文件

决策确认：Space 元数据存 PocketBase 集合；URL 用 `/{slug}/*` 多空间并存；Dashboard 内嵌编辑（不跳页）。

---

## 团队协作规则

### 角色分工

| 角色 | 职责 |
|------|------|
| **PM / PD（用户）** | 把控需求、验收功能、决策产品方向 |
| **后端 Agent** | Go 服务开发，严格遵循 GVE Hub 分层（handler / service），维护 Thrift IDL 与生成代码 |
| **前端 Agent** | React 开发，严格遵循 GVE 前端目录约定（views / shared），组件现代化 |
| **QA Agent** | 验收每个 Step，运行 `make test` / `pnpm typecheck` / `pnpm lint`，发现问题反馈给对应 Agent |

### 并行工作约定
- 后端和前端 Agent **并行开发**，以 Thrift IDL 作为契约边界
- 每个 Step 完成后由 QA Agent 验收，通过后进入下一 Step
- 任何 Agent 不得跨越角色边界

### GVE 项目结构规范（强制）

**后端（Go）**：
- 分层：`internal/hub/`（HTTP 层）→ `internal/service/`（业务层）
- 文件命名：每个业务资源一个文件，如 `space_handler.go` / `space_service.go`
- API 契约：先写 Thrift IDL → `gve api generate` 生成代码，不手写生成文件

**前端（React）**：
- 目录：`src/views/{feature}/` 存放页面及私有组件；`src/shared/` 跨 feature 复用
- 依赖方向（单向）：`views → shared`，`shared` 内部不互相依赖
- UI 组件：优先 `shared/ui/`（Shadcn），禁止在此目录手写组件
- 样式：Tailwind 优先，复杂用 `.module.css`，禁止全局裸选择器和 CSS-in-JS

### 前端组件设计原则（强制）

凡涉及以下情形，必须抽象为独立组件：
1. **可复用 UI**：2 处以上使用 → 提取到 `shared/`
2. **复杂业务组件**：超过 150 行或含独立状态 → 拆分子组件
3. **组件接口**：`interface Props` 显式定义，支持 `className` 透传，事件通过 props 回调
4. **设计风格**：现代化，与 Shadcn UI 设计语言一致（CSS 变量驱动）

---

## 数据模型

### PocketBase `spaces` 集合字段

**核心原则：与文档内容/展示无关的一切管理配置存数据库；文档结构和样式存 docs.json。**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | auto | PB 自动生成，同时作为磁盘目录名 |
| name | text, required | 展示名称（中文友好） |
| slug | text, required, unique | URL 标识符，仅小写字母/数字/连字符（禁保留词：`dashboard`/`login`/`api`） |
| description | text | 简介 |
| public | bool, default false | 是否允许访客访问（访问控制前置检查） |
| is_default | bool, default false | 是否为根路径默认空间（应用层保证唯一） |
| custom_domain | text | 自定义域名，如 `docs.example.com`（可选，未来路由匹配用） |
| meta | json | 扩展配置（预留：访问密码、成员权限、统计开关等） |

文件存储路径：`{MIND_PATH}/{space.id}/`

### 配置分层原则
| 层 | 存储位置 | 内容 |
|----|---------|------|
| 访问控制 & 管理 | 数据库 spaces 表 | slug、public、is_default、custom_domain、meta |
| 展示 & 导航 | `docs.json`（随文件） | site.title、topbar、tabs 导航结构 |

- 删除空间：只删 PocketBase 记录，文件目录保留（防误删，管理员手动清理）
- `meta` 字段初期为空对象 `{}`，后续扩展无需 schema 变更

---

## 路由结构变更

```
变更前：
  /          → DocsView（单空间）
  /*         → DocsView
  /editor    → EditorView
  /login     → LoginView

变更后：
  /          → 智能重定向：
               已登录 → /dashboard
               未登录 + 有默认公开空间 → /{defaultSlug}
               未登录 + 无默认空间    → /login
  /login     → LoginView
  /dashboard           → DashboardView（protected）
  /dashboard/:spaceId  → DashboardView，直接打开指定空间
  /:slug     → DocsView（公开，按 slug 查找空间，space.public=false 则 404）
  /:slug/*   → DocsView（公开，页面路由）
```

---

## 后端改动

### 1. 新增 `spaces` 集合定义
**文件**: `internal/setup/initial.go`（原 `internal/migrations/initial.go`，Step 6 统一重命名）
- 在现有 init 函数中追加创建 `spaces` collection
- 字段：name (text), slug (text, unique), description (text), public (bool), is_default (bool), custom_domain (text), meta (json)

### 2. 新增 SpaceService
**新文件**: `internal/service/space_service.go`
```go
type Space struct {
  ID           string
  Name         string
  Slug         string
  Description  string
  Public       bool
  IsDefault    bool
  CustomDomain string
  Meta         map[string]any
  Path         string // mindBasePath + "/" + ID
}

type SpaceService struct { app core.App; mindBasePath string }

func (s *SpaceService) List() ([]Space, error)
func (s *SpaceService) Create(name, slug, desc string) (Space, error)  // mkdir + PB record
func (s *SpaceService) Update(id string, fields Space) (Space, error)
func (s *SpaceService) Delete(id string) error  // 只删 PB 记录，保留文件
func (s *SpaceService) GetBySlug(slug string) (Space, error)
func (s *SpaceService) GetByID(id string) (Space, error)
func (s *SpaceService) SetDefault(id string) error  // 清除其他 is_default，设置当前
```

### 3. 新增 Space Handlers
**新文件**: `internal/hub/space_handlers.go`
- handleListSpaces, handleCreateSpace, handleUpdateSpace, handleDeleteSpace, handleGetSpace

### 4. 修改 Hub
**文件**: `internal/hub/hub.go`
- 去掉 `mindPath string` 和 `fileService`/`docsService`（单例）
- 改为 `mindBasePath string` + `spaceService *service.SpaceService`
- FileService/DocsService 改为按请求动态创建（传入 space path）

### 5. 修改 Routes
**文件**: `internal/hub/routes.go`
- 新增空间管理路由（auth required）：`/api/spaces/v1/*`
- 文件/搜索路由保持 path 不变，handler 内部解析 spaceId
- Docs 路由保持 path 不变，handler 内部解析 spaceSlug

### 6. 修改 File/Search/Docs Handlers
**文件**: `internal/hub/file_handlers.go`, `search_handlers.go`, `docs_handlers.go`
- 所有请求 body 新增 `spaceId`（文件/搜索）或 `spaceSlug`（文档，公开接口）
- Handler 先通过 SpaceService 解析 space 路径，再构造对应 FileService/DocsService

### 7. Thrift IDL 更新
- **新增**: `api/nanomind/space/v1/space.thrift`
- **修改**: `api/nanomind/file/v1/file.thrift` → 所有 request struct 加 `spaceId`
- **修改**: `api/nanomind/docs/v1/docs.thrift` → 加 `spaceSlug`
- **修改**: `api/nanomind/search/v1/search.thrift` → 加 `spaceId`

---

## 前端改动

### 1. 新 DashboardView（替换 EditorView）
**新目录**: `site/src/views/dashboard/`

#### 整体布局（4 列，全屏高度）

```
┌──────────┬────────────────────────────┬──────────────────────────────┬─────────────┐
│ 空间栏    │ [Navigation] [Files]       │ 面包屑          [操作按钮区] │ On This Page│
│ ● Space1 │ ────────────────────────── │ ──────────────────────────── │ ─────────── │
│ ● Space2 │ Navigation: docs.json 结构 │                              │ Heading 1   │
│ ● Space3 │ Files: 磁盘全量文件树       │    Tiptap 编辑区             │ Heading 2   │
│ ──────── │                            │                              │             │
│ 👤 用户  │                            │                              │             │
└──────────┴────────────────────────────┴──────────────────────────────┴─────────────┘
   ~60px            ~240px                         flex-1                   ~200px
```

#### Navigation 模式（严格对应 docs.json）
- 展示 docs.json 中 tabs → groups → pages 层级，仅显示已收录页面
- 这就是访客最终看到的导航视图，点击直接在编辑区打开

#### Files 模式（完整文件系统）
- 展示空间目录下的**所有**文件（不过滤类型）
- `.md` / `docs.json`：可编辑；其他文件：显示「此文件类型暂不支持渲染」

#### Navigation ↔ Files 双向联动

`currentFileId` 是两个视图共享的唯一状态源：

| 操作 | 行为 |
|------|------|
| Navigation 点击页面 | 打开文件；切换到 Files 时自动展开并高亮该文件 |
| Files 点击 `.md` | 打开文件；切换到 Navigation 时若已收录则高亮对应条目，未收录则无高亮 |
| 编辑区切换文件 | 两个视图同步更新高亮 |

实现要点：
- `navMode` 与 `currentFileId` 均存于 `dashboardStore`，切换 Tab 不重置选中
- `NavigationTree` 维护 `pageId → filePath` 双向映射供反向查找
- 联动时自动展开目标节点的祖先目录，确保可见

#### 编辑区顶部 Header
```
[← 返回] 空间名 / 分组 / 页面名          [编辑] [保存] [更多▾]
```

#### 右栏：On This Page（~200px）
- h2/h3 标题列表，滚动 spy 自动高亮，点击跳转锚点

#### 状态管理
- `dashboardStore`（Zustand）：`currentSpaceId`、`spaces[]`、`navMode: 'navigation' | 'files'`、`currentFileId`
- 复用现有 `editor-store.ts` 的 `content`、`hasChanges`、`saving`、`isEditing`

#### 组件清单
| 组件 | 位置 | 来源 |
|------|------|------|
| `SpacesSidebar` | `views/dashboard/components/` | 新建 |
| `FileNavPanel` | `views/dashboard/components/` | 新建（Navigation + Files 切换） |
| `NavigationTree` | `views/dashboard/components/` | 新建（读 docs.json） |
| `FileTree` | `views/dashboard/components/` | 重构自 `Sidebar.tsx` |
| `EditorHeader` | `views/dashboard/components/` | 重构自 `Header.tsx` |
| `TiptapEditor` | `views/editor/components/` | 直接复用 |
| `OnPageNav` | `views/dashboard/components/` | 重构自 `TableOfContents.tsx` |
| `UserPopover` | `views/dashboard/components/` | 新建（用户信息、改密、主题、退出） |
| `SpaceSettingsDialog` | `views/dashboard/components/` | 新建 |
| `UnsupportedFileView` | `views/dashboard/components/` | 新建（非 md/json 占位） |

### 2. 修改 DocsView
**文件**: `site/src/views/docs/index.tsx`
- 从 URL 参数读取 `:slug`（react-router `useParams`）
- 所有 API 调用带上 `spaceSlug`

### 3. 修改 Routes
**文件**: `site/src/app/routes.tsx`
- `/` → 智能重定向组件（查 default space API）
- `/dashboard` / `/dashboard/:spaceId` → DashboardView (protected)
- `/:slug` / `/:slug/*` → DocsView

### 4. API Client 更新
**文件**: `site/src/shared/lib/api-client.ts`
- 新增 space CRUD 函数
- 修改 file/search/docs 函数签名，加 spaceId/spaceSlug

---

## 死代码清理（同步执行）

| 操作 | 文件 |
|------|------|
| DELETE | `site/src/shared/lib/docs-markdown.ts`（完全未使用） |
| DELETE | `site/src/shared/lib/docs-content.ts`（竞争实现，未使用） |
| DELETE | `site/src/shared/lib/docs-client.ts`（仅 re-export） |
| DELETE | `site/src/shared/docs/DocsMarkdown.tsx`（仅 re-export） |
| DELETE | `site/src/shared/docs/utils.ts`（仅 re-export） |
| MERGE | `TocItem` 和 `DocsTocItem` 合并（`index` 字段改为 optional） |
| EXTRACT | `slugify` 提取到 `shared/lib/utils.ts`，三处引用统一 |

---

## 实施顺序（用户路径驱动）

按完整用户旅程打通一条垂直切片：登录 → 创建项目 → 编辑 → 发布 → 查看效果

### Step 1：后端 spaces 基础
- migration 新增 `spaces` 集合（含所有字段）
- `internal/service/space_service.go`：List/Create/Update/Delete/GetBySlug/GetByID/SetDefault
- `internal/hub/space_handlers.go`：对应 HTTP handlers
- `internal/hub/routes.go`：注册 `/api/spaces/v1/*` 路由
- 更新 `internal/hub/hub.go`：mindPath → mindBasePath，hub 持有 SpaceService

### Step 2：文件/搜索 API 适配 spaces
- 所有文件/搜索 handler 加 spaceId 参数，按需动态构建 FileService
- 更新 Thrift IDL（file、search）
- 生成新的 Go/TS client 代码

### Step 3：前端 Dashboard 骨架
- 新路由：`/dashboard`、`/dashboard/:spaceId`，`/` 做智能重定向
- `DashboardView` 基础布局：SpacesSidebar（左）+ 主区域
- SpacesSidebar：拉取空间列表，点击切换，新建空间对话框

### Step 4：嵌入编辑器（选中空间后可编辑）
- 选中空间后主区域渲染文件树 + Tiptap 编辑器 + TOC
- 文件 CRUD 操作带上 spaceId
- 路径：`/dashboard/:spaceId` 直接打开对应空间

### Step 5：发布 & 公开文档查看
- Dashboard 里可设置空间 public=true / is_default
- 更新 docs handlers 接收 spaceSlug，按 slug 找到对应空间目录
- 路由：`/:slug` 和 `/:slug/*` 渲染对应空间的 DocsView
- 根路径 `/` 重定向逻辑

### Step 6：收尾清理
- 删除死代码（5 个文件）
- 合并 TocItem 类型、统一 slugify
- 保留词 slug 校验
- 重命名 `internal/migrations/` → `internal/setup/`（包名更准确反映"初始化配置"而非"版本迁移"）
  - `internal/migrations/initial.go` → `internal/setup/initial.go`，`package migrations` → `package setup`
  - `cmd/server/main.go`：import 路径 + `migratecmd.Config{Dir: "internal/setup"}`

---

## 验证

```bash
# 后端
make test                    # Go 单元测试
make dev-backend             # 启动后端，验证 spaces 集合出现在 /_/ Admin UI

# 前端
cd site && pnpm typecheck     # 无类型错误
cd site && pnpm lint          # Biome 检查通过

# 功能验收
# 1. 登录后进入 /dashboard，可创建空间（自动建目录）
# 2. 选中空间后出现文件树和编辑器，可创建/编辑文件
# 3. 空间设置"公开"后，未登录用户可访问 /{slug}/
# 4. /{slug}/* 正确渲染对应空间的文档页
# 5. / 已登录→跳 /dashboard，未登录+有默认空间→跳 /{slug}，否则→/login
```
