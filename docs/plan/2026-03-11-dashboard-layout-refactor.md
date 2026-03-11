# Plan: Dashboard 交互与布局重构

## Context

Multi-Space 基础架构已完成（后端 Space CRUD、前端 Dashboard 骨架、文件编辑、公开文档），现在需要优化 Dashboard 的交互逻辑和布局设计，使其更接近 Mintlify 风格的现代文档管理体验。

核心变更：侧边栏从"平铺空间图标"改为"可折叠导航栏 + 空间下拉切换"；文件树仅在点击 Editor 后展开；文件树增强右键菜单、悬停快捷按钮、行内重命名。

**范围**：纯前端改动，不涉及 Go 后端代码。

---

## 布局变更

```
变更前：
[SpacesSidebar 60px] [FileNavPanel 240px] [Editor] [OnPageNav]
  ↑ 平铺空间图标         ↑ 始终可见

变更后：
[AppSidebar 220px/48px] [FileNavPanel 240px (仅 Editor 模式)] [Editor] [OnPageNav]
  ↑ 空间下拉 + 导航项       ↑ 点击 Editor 才显示
  ↑ 可折叠
```

---

## Step 1: Store 更新 + AppSidebar

### 1.1 dashboard-store.ts 新增字段

```typescript
// 新增
activeSection: "home" | "editor" | "settings";  // 默认 "editor"
setActiveSection: (section) => void;
sidebarCollapsed: boolean;  // 默认 false
setSidebarCollapsed: (collapsed) => void;
renamingPath: string | null;  // 默认 null（行内重命名用）
setRenamingPath: (path) => void;
```

### 1.2 新建 AppSidebar.tsx（替换 SpacesSidebar.tsx）

**文件**: `views/dashboard/components/AppSidebar.tsx`

三段式布局，垂直排列：

**顶部 — 空间选择器**：
- DropdownMenu 触发器：显示当前空间名 + ChevronDown
- 下拉内容：所有空间列表（彩色圆点 + 名称），底部 "+ 创建空间" 入口
- 复用 `hashColor()` 函数（从 SpacesSidebar 迁移）
- 复用 `CreateSpaceDialog` 组件

**中部 — 功能导航**：
- 三个导航项：
  - Home（Home 图标, "主页"）
  - Editor（FileText 图标, "编辑器"）
  - Settings（Settings 图标, "设置"）
- 选中项：`bg-accent text-foreground font-medium` 高亮
- 点击调用 `setActiveSection(...)`
- 折叠模式：仅显示图标，Tooltip 显示文字

**底部 — 用户 + 折叠按钮**：
- 用户头像（email 首字母）+ email 文字
- DropdownMenu：主题切换、退出登录
- 折叠按钮：PanelLeftClose / PanelLeftOpen 图标
- 折叠模式：仅头像，文字隐藏

**尺寸**：展开 `w-[220px]`，折叠 `w-[48px]`，`transition-all duration-200`

### 1.3 更新 DashboardView (index.tsx)

- `<SpacesSidebar />` → `<AppSidebar />`
- 根据 `activeSection` 条件渲染：
  - `"editor"` → FileNavPanel + Editor + OnPageNav（现有逻辑）
  - `"home"` → 占位："主页（即将推出）"
  - `"settings"` → 占位："设置（即将推出）"

### 1.4 删除 SpacesSidebar.tsx

---

## Step 2: FileTree 增强

### 2.1 树头部：统计 + 新建按钮

```
[文档 N · 文件夹 M]                    [+]
```

- 左侧：`countItems(files)` 递归统计文件/文件夹数
- 右侧：现有 DropdownMenu（新建文档 / 新建文件夹）移到最右

### 2.2 右键菜单增强

| 目标 | 菜单项 |
|------|--------|
| 文件夹 | 新建文档 → separator → 设置 · 重命名 · 删除 |
| 文件 | 设置 · 重命名 · 删除 |
| 空白区域 | 新建文档 · 新建文件夹 |

- "设置" 暂为占位（no-op）
- 空白区域右键：在树滚动容器上加 ContextMenu，子 item 的 ContextMenu 阻止冒泡

### 2.3 悬停快捷按钮

每个 tree item 行加 `group` class，右侧追加 hover 时显示的按钮：

- **文件夹**：`+` 按钮（DropdownMenu：新建文档 / 新建文件夹）+ ⚙ 按钮（设置，占位）
- **文件**：仅 ⚙ 按钮

按钮容器：`opacity-0 group-hover:opacity-100 transition-opacity`
按钮点击：`e.stopPropagation()` 防止触发行的 select/toggle

### 2.4 行内重命名（替代 RenameFileDialog）

触发重命名时：
1. 设置 `renamingPath = item.path`（store 或 FileTree 本地 state）
2. item 文本区域替换为 `<input>`，预填当前名称（文件不含 .md）
3. 文件项在 input 后显示灰色 `.md` 后缀
4. `autoFocus` + `select()` 全选
5. Enter / onBlur → 确认（调用 `rename()`，清除 renamingPath）
6. Escape → 取消（清除 renamingPath）
7. 校验：空名、非法字符、名称未变则跳过

实现为 `InlineRenameInput` 子组件（定义在 FileTree.tsx 内部）

### 2.5 删除 RenameFileDialog.tsx

---

## Step 3: 清理 + FileNavPanel 调整

- `FileNavPanel.tsx`：移除无用的 `spaceId` prop（当前已标记 `_spaceId`）
- 更新 `index.tsx` 中 `<FileNavPanel spaceId={...} />` → `<FileNavPanel />`
- 确认 imports 清理完毕

---

## 涉及文件清单

| 操作 | 文件 |
|------|------|
| 修改 | `views/dashboard/model/dashboard-store.ts` |
| 新建 | `views/dashboard/components/AppSidebar.tsx` |
| 删除 | `views/dashboard/components/SpacesSidebar.tsx` |
| 修改 | `views/dashboard/index.tsx` |
| 修改 | `views/dashboard/components/FileTree.tsx` |
| 修改 | `views/dashboard/components/FileNavPanel.tsx` |
| 删除 | `views/dashboard/components/RenameFileDialog.tsx` |

**复用的 Shadcn 组件**：dropdown-menu, context-menu, tooltip, button, dialog

---

## 验证

```bash
cd site && pnpm typecheck   # 无类型错误
cd site && pnpm lint        # Biome 0 errors
```

功能验收：
1. 侧边栏展开/折叠动画流畅
2. 空间下拉切换正常，创建空间正常
3. 点击 Home/Editor/Settings 切换主内容区
4. 仅 Editor 模式显示 FileNavPanel
5. 文件树头部显示正确统计，"+" 在右侧
6. 右键文件→设置/重命名/删除；右键文件夹→新建文档/设置/重命名/删除
7. 悬停文件→显示⚙；悬停文件夹→显示+和⚙
8. 重命名：行内编辑，Enter 确认，Escape 取消，点击外部确认
9. 编辑器功能无回归（打开文件、编辑、保存）
