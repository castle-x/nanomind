# 前端 lint 清零与工作流改进记录

> 日期：2026-03-06
> 项目：NanoMind
> 范围：`site/` 前端 Biome lint、TypeScript typecheck、GVE 相关前端工作流

## 概述

本次修复最初由 `docs/2026-03-06-gve-ts-client-fix-guide.md` 引导排查，但实际落地时发现：

1. 文档中提到的 `gve api generate` TypeScript parameter property 问题在当前仓库里已经被修复。
2. 真正阻断的是前端类型错误与 lint 问题。
3. `pnpm lint` 还错误地扫描了 `site/dist/` 构建产物，导致大量无关诊断。

本次改进目标有两个：

- 让 `cd site && pnpm lint` 在正确范围内执行，并最终通过。
- 记录一份可复用的经验总结，便于后续沉淀到 skill 或项目规范中。

## 问题一：`pnpm lint` 扫描了 `dist`

### 现象

执行：

```bash
cd site && pnpm lint
```

原脚本实际运行的是：

```bash
biome check .
```

这会从 `site/` 根目录向下递归扫描所有内容，包括：

- `src/`
- `dist/`
- 其他位于 `site/` 下的文件

而 `dist/` 是 Vite 构建产物，不应被当作源码参与 lint。

### 根因

根因有两层：

#### 1）lint 脚本范围过大

`site/package.json` 原先配置为：

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check . --write"
  }
}
```

这会让 Biome 检查当前目录全部内容，而不是仅检查源码目录。

#### 2）不能依赖上层 `.gitignore` 自动兜底

项目根目录 `.gitignore` 虽然忽略了 `site/dist/`：

```gitignore
site/dist/
```

但在 `cd site && pnpm lint` 的运行上下文里，不能把“希望上层 Git ignore 一定被 lint 工具正确继承”当作稳定前提。

结论：**对于前端 lint，应该显式限制检查范围，而不是依赖忽略链条碰巧生效。**

### 修复

将脚本改为只检查源码目录：

```json
{
  "scripts": {
    "lint": "biome check src",
    "lint:fix": "biome check src --write"
  }
}
```

### 为什么这是更好的修复

- 直接表达真实意图：只检查源码，不检查构建产物。
- 避免 `dist/`、缓存目录、临时文件对 lint 结果造成污染。
- 对 CI、本地 shell 上下文、Git 工作树状态更稳健。
- 更适合沉淀为 GVE / base-setup 默认实践。

## 问题二：Biome 无法解析 Tailwind v4 指令

### 现象

在收窄 lint 范围到 `src/` 后，`site/src/app/styles/globals.css` 仍然报 parse error，例如：

- `@custom-variant`
- `@apply`
- `@theme`
- `@theme inline`

### 根因

当前 Biome 配置未开启 Tailwind 指令解析能力。

### 修复

在 `site/biome.json` 中显式启用：

```json
{
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  }
}
```

### 结论

如果项目使用 Tailwind CSS v4 风格指令，Biome 配置必须同步开启对应 CSS parser 能力，否则 lint 会把合法样式误报为语法错误。

## 问题三：源码中的真实 lint 问题

在排除 `dist/` 与 Tailwind parser 噪音后，剩余问题都来自 `src/` 真实源码。

### 已修复项

#### 1）Breadcrumb 使用数组索引作为 key

文件：`site/src/views/editor/components/Header.tsx`

修复前使用：

```tsx
key={`${seg}-${i}`}
```

修复后改为基于路径前缀生成稳定 key：

```tsx
const segmentPath = segments.slice(0, i + 1).join("/");
key={segmentPath}
```

#### 2）搜索弹窗 backdrop 使用静态元素承载交互

文件：`site/src/views/editor/components/SearchDialog.tsx`

修复前由静态 `div` 承担关闭交互，触发可访问性规则。

修复后改为真正的 `button` 作为 backdrop：

- 更符合语义
- 不再触发 `noStaticElementInteractions`
- 不再触发 click/keyboard 对应关系问题

#### 3）目录大纲 effect 依赖校验

文件：`site/src/views/editor/components/TableOfContents.tsx`

Biome 认为 effect 依赖包含 `content`，但 effect 体未显式引用它。

本次修复中显式保留 `content` 作为“内容变化触发重新提取目录”的依赖来源，避免误删依赖导致目录不同步。

#### 4）链接输入框使用 `autoFocus`

文件：`site/src/views/editor/components/Toolbar.tsx`

修复前直接使用 `autoFocus`。

修复后改为：

- `useRef<HTMLInputElement>()`
- `useEffect` 在 `linkInput` 打开后手动聚焦

这样更符合 lint 对可访问性和受控行为的要求。

#### 5）保存回调缺失依赖

文件：`site/src/views/editor/index.tsx`

`handleSave` 中使用了 `setIsEditing(false)`，但依赖数组未包含 `setIsEditing`。

本次补齐依赖，避免 stale closure 风险。

## 额外修复：类型检查问题

在本次工作中还顺手修复了前面暴露出的 TypeScript 问题，包括：

- PocketBase `RecordModel` 与本地 auth store 类型对齐
- Zustand `persist.partialize` 返回值类型收窄
- 本地 toast hook 缺失导致的模块错误
- 登录页不安全类型断言
- `ContextMenuContent` 不兼容 props 的类型问题

最终 `pnpm typecheck` 已通过。

## 验证结果

以下命令均已通过：

```bash
cd site && pnpm lint
cd site && pnpm typecheck
```

## 这次为什么会触发我去跑 `pnpm lint`

这个问题需要区分两层：

### 1）是什么让 `gve` skill 被触发

`gve` skill 的触发原因是：当前任务明确提到了 `gve`，而且参考文档本身就是 `gve` 相关修复指南。

依据：`.codex/skills/gve/SKILL.md` 中的描述明确写了：

- 当用户提到 `gve`
- 或任务涉及 `gve api generate`
- 或 API 契约 / GVE 工作流

就应使用该 skill。

### 2）是什么让我实际执行 `pnpm lint`

真正直接触发我运行 `pnpm lint` 的，不是 `gve` skill，而是项目根 `AGENTS.md` 的明确规则。

关键来源有两处：

#### A. 项目质量命令清单

`AGENTS.md` 的 “Testing & Quality” 段明确列出了：

```bash
cd site && pnpm lint
cd site && pnpm lint:fix
cd site && pnpm typecheck
```

#### B. 对 AI agent 的硬性说明

`AGENTS.md` 的 “Notes for AI Agents” 里明确写了：

> Frontend Changes: Always run `pnpm lint` and `pnpm typecheck` before committing

### 结论

- **触发 `gve` skill 的来源**：`gve` 相关任务语义。
- **触发执行 `pnpm lint` 的来源**：项目根 `AGENTS.md` 的显式工程规范。

如果后续要把这条经验加入 skill，建议把这两层区别写清楚，避免把“skill 触发”和“质量命令触发”混为一谈。

## 建议沉淀到 skill / 模板的规则

建议加入以下规则：

### 规则 1：Biome 默认不要检查 `dist`

对于 GVE / Vite 前端项目，默认建议：

```json
{
  "scripts": {
    "lint": "biome check src",
    "lint:fix": "biome check src --write"
  }
}
```

而不是：

```json
{
  "scripts": {
    "lint": "biome check ."
  }
}
```

### 规则 2：如果使用 Tailwind v4 指令，必须启用 Biome CSS parser 支持

```json
{
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  }
}
```

### 规则 3：前端改动后的验证顺序

推荐顺序：

```bash
cd site && pnpm lint
cd site && pnpm typecheck
```

如果 `pnpm lint` 出现大量与 `dist` 或构建产物相关的报错，优先先排查：

1. lint 脚本是否误用了 `biome check .`
2. Biome 是否缺少 `src` 范围限制
3. Biome 是否缺少 Tailwind CSS 指令解析配置

## 关联文件

本次改动涉及：

- `site/package.json`
- `site/biome.json`
- `site/src/views/editor/components/Header.tsx`
- `site/src/views/editor/components/SearchDialog.tsx`
- `site/src/views/editor/components/TableOfContents.tsx`
- `site/src/views/editor/components/Toolbar.tsx`
- `site/src/views/editor/index.tsx`
- `site/src/shared/hooks/useAuth.ts`
- `site/src/shared/ui/context-menu.tsx`
- `site/src/shared/ui/toast/index.tsx`
- `site/src/views/auth/index.tsx`

## 最终状态

- `pnpm lint`：通过
- `pnpm typecheck`：通过
- `dist` 不再参与前端 lint
- Tailwind v4 指令可被 Biome 正确解析
- 当前结论适合沉淀到项目规范或 skill 中
