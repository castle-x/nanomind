# 2026-03-07 docs 改造验证与 Biome 扫描 dist 排查

## 本次排查目标

1. 识别当前 docs 改造相关的 `typecheck` / `lint` / `go test` 状态。
2. 仅在测试缺失时补充最小测试，不改业务实现。
3. 记录 `lint` 为什么会扫描 `dist`，以及是由什么命令触发。

## 实际执行命令

### 前端 lint

```bash
cd site && pnpm lint
```

结果：失败。

当前暴露的问题：

- `src/shared/docs/DocMarkdown.tsx`
  - `lint/security/noDangerouslySetInnerHtml`
  - `format`
- `src/shared/docs/DocsShell.tsx`
  - `assist/source/organizeImports`
- `src/shared/docs/DocsTopbar.tsx`
  - `format`
- `src/views/docs/index.tsx`
  - `lint/suspicious/useIterableCallbackReturn`
  - `lint/correctness/useExhaustiveDependencies`
  - `format`

说明：当前 `pnpm lint` 脚本实际执行的是 `biome check src`，因此它不会主动扫描 `site/dist/`。

### 前端 typecheck

```bash
cd site && pnpm typecheck
```

结果：失败。

当前暴露的问题：

- `src/shared/docs/DocsShell.tsx`
  - 找不到模块 `@/shared/docs/use-docs-shell`
  - 多个 `state` 参数隐式 `any`
  - 组件 props 不匹配
  - `isResizing` / `setIsResizing` 未定义
- `src/shared/docs/DocsTopbar.tsx`
  - 找不到模块 `@/shared/docs/use-docs-shell`
  - 多个 `state` 参数隐式 `any`
- `src/views/docs/index.tsx`
  - 传给 `DocsShell` 的 `defaultContentMode` 与组件当前 props 定义不匹配

结论：当前 docs 前端还处于组件/命名收敛未完成状态，`typecheck` 问题主要来自 docs shell 组件接口不一致，不是测试缺失导致。

### Go tests

```bash
go test ./internal/service ./internal/hub
```

结果：通过。

当前 docs 相关后端最小验证已存在并可用：

- `internal/service/docs_service_test.go`
- `internal/service/docs_service_parsing_test.go`
- `internal/service/docs_service_validation_test.go`
- `internal/hub/docs_handlers_test.go`

## 为什么会扫描 dist

### 先说当前项目脚本

`site/package.json` 当前定义：

```json
{
  "scripts": {
    "lint": "biome check src"
  }
}
```

因此：

- 运行 `cd site && pnpm lint` 时，Biome 只检查 `src/`。
- 这个脚本本身不是 `dist` 被扫描的根因。

### 会触发 dist 扫描的命令

排查时执行了：

```bash
cd site && timeout 8s pnpm exec biome check .
```

结果：8 秒超时，退出码 `124`。

这说明当 Biome 被直接对项目根目录 `.` 运行时，会进入全目录扫描流程；在当前 `site/biome.json` 没有配置 `files.includes` / `dist` force-ignore 的情况下，`dist/` 这类构建产物目录会被带入扫描范围，导致明显变慢，甚至看起来像“lint 在扫无关内容”。

### 配置层面的直接原因

当前 `site/biome.json` 没有 `files` 段来约束扫描范围，例如：

- 没有限定只处理 `src/**`
- 也没有对 `dist` 做 force-ignore

根据 Biome 官方文档，若希望强制永远忽略构建产物目录，应在 `files.includes` 中使用 `!!**/dist` 这类 force-ignore 模式。

## “是谁触发的”结论

从当前仓库配置可确认：

- 不是 `site/package.json` 里的 `pnpm lint` 触发的，因为它只执行 `biome check src`。
- `dist` 扫描只能由“更宽的 Biome 调用方式”触发，例如：
  - 手动执行 `cd site && pnpm exec biome check .`
  - 手动执行 `cd site && biome check .`
  - 编辑器 / IDE 插件按项目根目录运行 Biome
  - 某个 agent 没有走 `pnpm lint`，而是直接对 `site` 根目录运行了 Biome

### 和 skill 的关系

本仓库里会促使 agent 去跑 lint 的来源主要有两处：

1. 根 `AGENTS.md`
   - 明确写了前端改动应运行 `cd site && pnpm lint` 与 `cd site && pnpm typecheck`
2. `gve` skill
   - 强调 GVE 项目的前端质量校验流程

但这两处都没有要求执行 `biome check .`。

所以结论是：

- “触发去跑 lint” 这件事，确实是被 `AGENTS.md` / `gve` 工作流推动的。
- 但“为什么扫到 dist” 不是 skill 本身要求的，而是执行者把命令放大成了项目根目录级别的 `biome check .`，或者用了等价的编辑器触发方式。

## 当前建议

1. 对前端开发流程，继续统一使用：

```bash
cd site && pnpm lint
cd site && pnpm typecheck
```

2. 不要把 `biome check .` 作为默认 lint 命令。
3. 若后续要把这个经验沉淀进 skill，建议明确写入：
   - GVE 前端 lint 一律走 `pnpm lint`
   - 禁止直接对 `site` 根目录执行 `biome check .`
   - 若需从配置层兜底，可在 `site/biome.json` 增加 `files.includes` 并 force-ignore `dist`

## 本次是否补充了测试

本轮未新增业务实现；测试侧已有 docs 最小覆盖，且 Go 相关测试已经通过。

如后续需要，可以继续补一组表驱动坏配置样例测试，专门覆盖 `docs.json` 校验边界。

## 最终收敛状态

在 docs 壳子组件统一后，已再次验证：

```bash
cd site && pnpm typecheck
cd site && pnpm lint
go test ./...
```

结果：

- `pnpm typecheck`：通过
- `pnpm lint`：通过
- `go test ./...`：通过

本次最终结论没有变化：

- `pnpm lint` 不会扫描 `dist/`，因为当前脚本固定为 `biome check src`
- 真正会把 `dist/` 带进去的是更宽范围的命令，如 `biome check .`
- 促使 agent 去执行 lint 的流程来源是根 `AGENTS.md` 与 `gve` skill
- 但把扫描范围扩大到整个 `site/` 根目录，不是 `gve` skill 的要求，而是执行者选错了命令粒度
