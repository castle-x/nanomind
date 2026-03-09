# NanoMind 对齐 GVE 规范迭代计划（简版）

> 目标：基于最新 gve 规范，对现有 nanomind 做“低风险、可分阶段”的规范化迭代。
> 策略：不推翻 PocketBase + Hub 架构，只做与 gve 规范冲突或易混淆部分的收敛。

---

## 1. 当前状态（对比结论）

### 1.1 已基本对齐（保留）

- 入口：`cmd/server/main.go`（已是 gve 推荐路径）
- 后端：`internal/hub/` + `internal/service/`（PocketBase Hub 模式，可接受）
- 前端嵌入：`site/embed.go`（`go:embed all:dist`）
- 资产锁：`gve.lock` 已存在
- 构建链：`Makefile` 已指向 `./cmd/server`

### 1.2 主要差距（本计划处理）

1. 前端入口不一致：当前 `site/src/main.tsx`，gve 推荐 `site/src/app/main.tsx`。
2. 前端工具目录重复：`site/src/lib/utils.ts` 与 `site/src/shared/lib/utils.ts` 并存。
3. API 契约目录混用：`api/` 下是 `API.md` 文档与自定义 `api/registry.json`，与 gve 的 thrift 契约目录语义冲突。
4. 文档存在历史路径描述（如旧 `cmd/app` 叙述）风险，容易误导 AI。

---

## 2. 迭代范围

### In Scope

- 前端入口路径规范化
- 前端 shared/lib 归一
- API 文档与 API 契约目录语义解耦
- 项目文档与 AI 指南同步到当前结构

### Out of Scope

- 重写 PocketBase 架构
- 替换 Hub 模式为 handler-only 模式
- 一次性重构全部业务代码

---

## 3. 分阶段任务（AI 可执行）

## Phase A：前端入口与目录规范收敛

### Task A1: 对齐入口到 `site/src/app/main.tsx`

**修改文件：**
- Create: `site/src/app/main.tsx`
- Modify: `site/index.html`
- Optional cleanup: `site/src/main.tsx`（改为薄转发或删除）

**实施步骤：**
1. 将当前 `site/src/main.tsx` 内容迁移到 `site/src/app/main.tsx`。
2. 修改 `site/index.html`：
   - 从 `"/src/main.tsx"` 改为 `"/src/app/main.tsx"`。
3. 若保留兼容层：将 `site/src/main.tsx` 变成仅转发导入（避免双入口逻辑）。

**验收命令：**
```bash
cd site && pnpm typecheck && pnpm build
```
期望：无 TS 错误，`site/dist` 正常生成。

---

### Task A2: 统一工具库到 `shared/lib`

**修改文件：**
- Modify: 所有引用 `@/lib/utils` 或 `../lib/utils` 的 TS/TSX 文件
- Delete: `site/src/lib/utils.ts`（若无残留引用）
- Keep: `site/src/shared/lib/utils.ts`

**实施步骤：**
1. 全局检索 `src/lib/utils` 引用。
2. 批量替换到 `@/shared/lib/utils`。
3. 确认无引用后删除 `site/src/lib/utils.ts`。

**验收命令：**
```bash
cd site && pnpm lint && pnpm typecheck && pnpm build
```
期望：全部通过。

---

## Phase B：API 目录语义解耦（先最小可用）

### Task B1: 将“API 文档”与“thrift 契约”分离

**修改文件：**
- Move: `api/nanomind/*/v1/API.md` -> `docs/api/nanomind/*/v1/API.md`
- Move/Rename: `api/registry.json` -> `docs/api/registry.docs.json`
- Create: `api/.gitkeep`
- Create: `api/README.md`（说明该目录仅放 gve thrift 契约）

**实施步骤：**
1. 新建 `docs/api/` 并迁移现有 API.md 文档。
2. 把现有自定义 registry 改名为 `registry.docs.json`，明确其仅文档索引作用。
3. 清空 `api/` 到“契约保留目录”状态（放 `.gitkeep` + README 说明）。

**验收命令：**
```bash
find api -maxdepth 3 -type f | sort
find docs/api -maxdepth 5 -type f | sort
```
期望：
- `api/` 只保留契约说明文件（非 API.md 文档）。
- `docs/api/` 持有 API 文档资产。

---

### Task B2: 试点 1 个 thrift 契约（auth）

**修改文件：**
- Create: `api/nanomind/auth/v1/auth.thrift`
- Generate: `api/nanomind/auth/v1/auth.go`
- Generate: `api/nanomind/auth/v1/client.go`
- Generate: `api/nanomind/auth/v1/client.ts`

**实施步骤：**
1. 在项目根执行：
   - `gve api new nanomind/auth`
2. 编辑 `auth.thrift` 写入最小 service（如 `GetCurrentUser`）。
3. 执行：
   - `gve api generate`

**验收命令：**
```bash
ls api/nanomind/auth/v1/
go test ./...
```
期望：四文件齐全，Go 测试可通过。

> 说明：`files`、`search` 契约在下一迭代复制同模式，不在本轮强制完成。

---

## Phase C：文档与 AI 入口对齐

### Task C1: 更新 AGENTS 与关键文档

**修改文件（至少）：**
- `AGENTS.md`
- `docs/2026-03-02-gve-restructure-overview.md`
- `docs/plans/2026-03-02-gve-restructure.md`（若内容已过期，补“已废弃/替代计划”说明）

**实施步骤：**
1. 清除过时描述（如 `cmd/app`、旧目录约定）。
2. 明确当前基线：`cmd/server` + `internal/hub` + `site/src/app/main.tsx` + `docs/api`（文档）+ `api`（thrift 契约）。
3. 在文档中附上“本计划文件”为最新执行入口。

**验收命令：**
```bash
rg -n "cmd/app|internal/server|api/registry.json" AGENTS.md docs/
```
期望：不再出现未说明的过时主路径。

---

## 4. 回归验证（每阶段后执行）

```bash
# backend
go test ./...
go build ./cmd/server

# frontend
cd site && pnpm lint && pnpm typecheck && pnpm build

# project level
make build
```

通过标准：
- Go 构建与测试通过
- 前端 lint/typecheck/build 通过
- 构建产物可正常运行（`bin/nanomind serve --http=localhost:8090`）

---

## 5. 建议执行顺序（最短路径）

1. A1 入口路径收敛
2. A2 shared/lib 归一
3. B1 API 文档迁移（先解耦语义）
4. C1 文档同步
5. B2 先试点 auth thrift 生成

---

## 6. 迭代完成定义（DoD）

满足以下即视为“本轮完成”：

1. 前端入口已切换到 `site/src/app/main.tsx`。
2. `site/src/lib/utils.ts` 已移除或仅保留兼容转发且无直接业务引用。
3. API 文档已迁移至 `docs/api/`，`api/` 目录仅用于 thrift 契约。
4. 至少 1 个资源（`nanomind/auth`）完成 `gve api new + gve api generate` 产物链路。
5. 文档（AGENTS + overview/plan）与当前结构一致，AI 不会被旧路径误导。
