# NanoMind 文档站总 PRD v1

> 主题：文档站导航模型、页面布局骨架、DocsShell 设计与增强内容块规范
> 日期：2026-03-06
> 参考页面：https://docs.openclaw.ai/start/getting-started

## 1. 背景

当前项目的内容组织主要依赖本地文件树，适合编辑，但不适合做发布型文档站。
目标产品需要接近 OpenClaw 这类结构：

- 最上层有全局导航
- 其下有频道切换
- 左侧有分组导航
- 中间是文档内容
- 右侧是页内目录

这类结构通常不能只靠文件夹自动推导，必须增加一层显式导航配置。
因此本次改造从四部分同时确立：

- `docs.json` 导航与内容组织模型
- 完全参考 OpenClaw 的标准页面骨架
- `DocsShell` 组件与状态设计
- 正文增强内容块规范

## 2. 目标

v1 要解决的问题：

1. 支持顶部频道导航
2. 支持左侧分组导航
3. 支持页面排序，而不是按文件名排序
4. 支持页面标题与文件名解耦
5. 支持首页与普通文档页区分
6. 支持未来扩展到权限、发布状态、增强文档块
7. 建立统一的文档页面壳子
8. 支持左侧导航宽度拖拽与状态持久化
9. 支持中间内容区阅读模式切换
10. 支持现代文档站常见的增强内容块

## 3. 非目标

v1 先不做这些：

1. 复杂权限系统
2. 多站点
3. 版本化文档
4. 完整 CMS 数据库存储
5. 可视化导航编辑器
6. 国际化多语言文档
7. 首页营销模块
8. 任意 MDX / JSX 执行能力

## 4. 核心原则

- 原则一：文件负责内容，`docs.json` 负责导航
- 原则二：导航结构不等于文件夹结构
- 原则三：页面 path 稳定，显示标题可变
- 原则四：正文继续使用 Markdown
- 原则五：页内 TOC 不写在 `docs.json`，自动从正文标题生成
- 原则六：布局骨架优先于页面业务
- 原则七：阅读态与编辑态共用同一页面骨架
- 原则八：增强内容块必须兼容在线编辑

## 5. 内容组织模型

运行时文档内容根以 `MIND_PATH` 为准，而不是仓库中的 `docs/` 项目文档目录。

也就是说：

- 仓库 `docs/`：存放本项目自己的 PRD / 计划 / API 文档
- 运行时内容根：存放站点实际发布内容与 `docs.json`

下面的目录示例表达的是"运行时内容根"内部结构，而不是仓库目录结构。

建议运行时文档根目录固定为：

```text
docs/
  docs.json
  index.md
  start/getting-started.md
  start/onboarding.md
  guides/cli.md
  guides/automation.md
  reference/config.md
```

其中：

- `docs.json` 是站点导航配置
- 其余 `.md` 文件是正文内容

## 6. docs.json 设计

### 6.1 文件位置

`docs.json` 固定放在运行时内容根目录下。

若运行时内容根为 `MIND_PATH`，则配置文件位置为：

```text
${MIND_PATH}/docs.json
```

### 6.2 顶层结构

```json
{
  "site": {},
  "topbar": {},
  "tabs": []
}
```

说明：

- `site`：站点基础信息
- `topbar`：顶栏配置
- `tabs`：频道导航与左侧分组导航的主数据来源

### 6.3 site

```json
{
  "site": {
    "title": "NanoMind Docs",
    "root": "docs",
    "homepage": "index",
    "defaultLayout": "docs",
    "defaultContentMode": "centered"
  }
}
```

字段说明：

`title`
- 站点标题

`root`
- 文档根目录，v1 固定建议为 `docs`

`homepage`
- 首页页面 `pageId`，例如 `index`

`defaultLayout`
- 默认布局，建议 `docs`

`defaultContentMode`
- 默认内容宽度模式，建议 `centered`

### 6.4 topbar

```json
{
  "topbar": {
    "showSearch": true,
    "links": [
      {
        "label": "GitHub",
        "href": "https://github.com/example/nanomind",
        "external": true
      }
    ]
  }
}
```

字段说明：

`showSearch`
- 是否显示顶部搜索入口

`links`
- 顶栏右侧外链列表

### 6.5 tabs

```json
{
  "tabs": [
    {
      "key": "start",
      "label": "Get started",
      "groups": []
    }
  ]
}
```

字段说明：

`key`
- 频道唯一标识

`label`
- 频道显示名称

`groups`
- 当前频道下的分组列表

约束：

- `tabs` 至少有一个元素
- `key` 全局唯一
- 每个 `tab` 至少有一个 `group`

### 6.6 groups

```json
{
  "key": "first-steps",
  "label": "First steps",
  "pages": []
}
```

字段说明：

`key`
- 分组唯一标识

`label`
- 分组显示名称

`pages`
- 当前分组包含的页面列表

### 6.7 pages

v1 从一开始就使用对象写法：

```json
{
  "id": "start/getting-started",
  "title": "Getting Started",
  "hidden": false,
  "layout": "docs",
  "contentMode": "centered"
}
```

字段说明：

`id`
- 页面唯一标识
- 也是本地文件映射基础

`title`
- 导航显示标题
- 若缺失则回退到 frontmatter.title
- 若 frontmatter 也缺失，则回退到文件名

`hidden`
- 是否在导航中隐藏

`layout`
- 页面布局覆盖站点默认值

`contentMode`
- 页面内容宽度模式覆盖站点默认值

### 6.8 pageId 与文件映射

映射规则：

```text
{id}.md -> docs/{id}.md
```

示例：

- `index` -> `docs/index.md`
- `start/getting-started` -> `docs/start/getting-started.md`
- `reference/config` -> `docs/reference/config.md`

### 6.9 frontmatter 规范

```md
---
title: Getting Started
description: 从零开始快速使用 NanoMind
toc: true
layout: docs
contentMode: centered
---
```

建议字段：

- `title`
- `description`
- `toc`
- `layout`
- `contentMode`

### 6.10 优先级规则

标题优先级：
1. `page.title`
2. `frontmatter.title`
3. 文件名推导

布局优先级：
1. `page.layout`
2. `frontmatter.layout`
3. `site.defaultLayout`

内容宽度优先级：
1. `page.contentMode`
2. `frontmatter.contentMode`
3. `site.defaultContentMode`

### 6.11 路由规则

- `index` -> `/`
- `start/getting-started` -> `/start/getting-started`
- `reference/config` -> `/reference/config`

### 6.12 导航生成规则

- 顶部频道导航：来自 `tabs`
- 左侧导航：来自当前 `tab` 下的 `groups` 与 `pages`
- 右侧 TOC：来自正文标题结构自动生成

### 6.13 docs API 路由约定

v1 固定采用以下 docs API：

- `POST /api/docs/v1/GetConfig`
- `POST /api/docs/v1/GetPage`

其中 `GetPage` 请求体固定为：

```json
{
  "id": "start/getting-started"
}
```

`GetConfig` 可使用空请求体。

### 6.14 校验规则

系统读取 `docs.json` 时必须校验：

1. 顶层字段合法
2. `site.title/root/homepage` 必须存在
3. `tabs` 不可为空
4. `tab.key` 必须唯一
5. `group.key` 在所属 `tab` 内必须唯一
6. `page.id` 全局唯一
7. 每个 `page.id` 必须映射到真实 Markdown 文件
8. `site.homepage` 必须映射到真实页面

### 6.15 完整示例

```json
{
  "site": {
    "title": "NanoMind Docs",
    "root": "docs",
    "homepage": "index",
    "defaultLayout": "docs",
    "defaultContentMode": "centered"
  },
  "topbar": {
    "showSearch": true,
    "links": [
      {
        "label": "GitHub",
        "href": "https://github.com/castle-x/nanomind",
        "external": true
      }
    ]
  },
  "tabs": [
    {
      "key": "start",
      "label": "Get started",
      "groups": [
        {
          "key": "home",
          "label": "Home",
          "pages": [
            {
              "id": "index",
              "title": "Introduction"
            }
          ]
        },
        {
          "key": "first-steps",
          "label": "First steps",
          "pages": [
            {
              "id": "start/getting-started",
              "title": "Getting Started"
            },
            {
              "id": "start/onboarding",
              "title": "Onboarding"
            }
          ]
        }
      ]
    },
    {
      "key": "guides",
      "label": "Guides",
      "groups": [
        {
          "key": "usage",
          "label": "Usage",
          "pages": [
            {
              "id": "guides/cli",
              "title": "CLI Guide"
            },
            {
              "id": "guides/automation",
              "title": "Automation"
            }
          ]
        }
      ]
    },
    {
      "key": "reference",
      "label": "Reference",
      "groups": [
        {
          "key": "config",
          "label": "Configuration",
          "pages": [
            {
              "id": "reference/config",
              "title": "Config Reference",
              "contentMode": "wide"
            }
          ]
        }
      ]
    }
  ]
}
```

## 7. OpenClaw 布局拆解

参考页面可以拆成以下五层：

### 第一层：全局顶栏

作用：承载全站级动作。

包含：

- 品牌 Logo / 站点入口
- 全局搜索入口
- 语言切换
- 外链入口（如 GitHub、Releases）

特点：

- 高度较低
- 固定在页面顶部
- 只放全局动作，不放当前页业务操作

### 第二层：频道导航条

作用：承载站点一级栏目切换。

OpenClaw 示例：

- Get started
- Install
- Channels
- Agents
- Tools
- Models
- Platforms
- Gateway & Ops
- Reference
- Help

特点：

- 位于顶栏下方
- 横向排列
- 用于切换文档大频道
- 当前频道高亮

### 第三层：左侧导航栏

作用：承载当前频道下的分组导航与页面树。

OpenClaw 示例结构：

- Home
- Overview
- Core concepts
- First steps
- Guides

每个组下挂具体页面。

特点：

- 不是裸文件树，而是站点导航树
- 来自 `docs.json` 中的 `tab -> group -> page`
- 当前页面高亮
- 支持滚动

### 第四层：中间主内容区

作用：承载当前文档正文。

包含：

- 页面标题
- 摘要/引导说明
- 正文内容
- 步骤块
- 代码块
- 图示
- 跳转卡片
- 上下篇或下一步引导

特点：

- 宽度被严格控制，不铺满
- 阅读优先
- 是视觉中心
- 后续编辑态仍要使用同一主区域

### 第五层：右侧页内索引

作用：承载当前页面的 TOC。

特点：

- 标题通常为 `On this page`
- 自动从正文标题提取
- 只负责页内跳转
- 与左侧导航分工明确

## 8. 标准页面骨架

NanoMind 的文档页骨架直接采用与 OpenClaw 同构的结构：

1. 全局顶栏
2. 顶栏下方频道导航条
3. 左侧文档导航栏
4. 中间主内容区
5. 右侧页内索引栏

即：

顶栏 + 频道导航条 + 左导航 + 主内容 + 右索引

这是 v1 标准布局。

## 9. DocsShell 设计

建议定义统一的页面壳子：

- `DocsShell`

其职责：

- 统一顶栏布局
- 统一频道导航条
- 统一三栏结构
- 统一滚动与高度规则
- 统一侧栏宽度管理
- 统一内容区宽度模式
- 为阅读态和编辑态提供共同骨架

不负责：

- 文档数据请求
- Markdown 渲染逻辑
- TOC 提取逻辑
- 权限判断
- 编辑器业务逻辑

### 9.1 组件树

```text
DocsShell
  Topbar
  ChannelBar
  DocsBody
    LeftSidebar
    MainViewport
      MainContentFrame
        MainContent
    RightToc
```

### 9.2 组件职责

`Topbar`
- 品牌
- 搜索触发器
- 外链入口
- 用户入口
- 主题切换
- 后续可扩展编辑按钮

`ChannelBar`
- 展示顶部频道栏
- 当前频道高亮
- 切换频道
- 小屏支持横向滚动

`LeftSidebar`
- 展示当前频道的分组与页面树
- 当前页面高亮
- 支持拖拽宽度
- 支持折叠

`MainViewport`
- 主内容滚动容器
- 为 TOC 高亮和页内定位提供滚动上下文

`MainContentFrame`
- 控制 `centered / wide` 模式
- 控制正文最大宽度

`MainContent`
- 承载正文渲染结果
- 后续承载编辑器视图
- 承载增强型文档块

`RightToc`
- 展示当前文档标题目录
- 当前标题高亮
- 点击后滚动到对应位置
- 可开关显示

### 9.3 状态模型

建议单独维护 `docs-shell-store`：

```ts
interface DocsShellState {
  activeTab: string | null;
  contentMode: "centered" | "wide";
  leftSidebarWidth: number;
  leftSidebarCollapsed: boolean;
  rightTocVisible: boolean;
  mobileSidebarOpen: boolean;
}
```

默认值建议：

```ts
{
  activeTab: null,
  contentMode: "centered",
  leftSidebarWidth: 280,
  leftSidebarCollapsed: false,
  rightTocVisible: true,
  mobileSidebarOpen: false,
}
```

### 9.4 持久化规则

建议持久化：

- `contentMode`
- `leftSidebarWidth`
- `leftSidebarCollapsed`
- `rightTocVisible`

不建议持久化：

- `mobileSidebarOpen`
- `activeTab`

建议本地存储 key：

```text
docs-shell-preferences
```

### 9.5 尺寸规范

v1 建议：

- 顶栏高度：`56px`
- 频道导航条高度：`44px`
- 左侧栏默认宽度：`280px`
- 左侧栏最小宽度：`220px`
- 左侧栏最大宽度：`420px`
- 右侧栏默认宽度：`240px`
- 主内容区 `centered` 最大宽度：`860px`
- 主内容区 `wide` 最大宽度：`1120px`
- 页面整体左右安全边距：`24px`

### 9.6 交互规则

左栏拖拽：
1. 鼠标按下手柄
2. 记录初始宽度和起始坐标
3. 根据横向偏移量计算新宽度
4. 将宽度限制在最小/最大值之间
5. 鼠标释放后写入持久化状态

补充：
- 若左栏已折叠，不允许直接拖拽
- 宽度小于最小阈值时保持最小宽度，不自动折叠
- 折叠与拖拽是两个独立操作

### 9.7 内容模式

`centered`
- 适用于文档阅读、产品说明、知识库浏览
- 内容区居中，正文宽度受限，阅读优先

`wide`
- 适用于编辑态、宽代码块、宽表格、管理页
- 正文区域更宽，但整体骨架不变

默认模式：`centered`

页面可通过：
- `page.contentMode`
- `frontmatter.contentMode`
- `site.defaultContentMode`

决定最终模式。

### 9.8 响应式规则

桌面端：
- Topbar
- ChannelBar
- LeftSidebar
- MainContent
- RightToc

平板端：
- 保留 Topbar 和 ChannelBar
- LeftSidebar 抽屉化
- RightToc 默认隐藏

移动端：
- 保留 Topbar 和 ChannelBar
- LeftSidebar 抽屉化
- RightToc 收起为浮层入口或直接隐藏
- MainContent 全宽

## 10. 增强内容块规范

v1 采用：

- 基础内容：Markdown
- 增强能力：指令块语法
- 页面元信息：frontmatter

不采用：

- 任意 JSX/MDX 执行
- 任意运行时代码嵌入

### 10.1 语法原则

统一采用块级指令语法：

```text
:::block-name
内容
:::
```

带参数时：

```text
:::block-name key="value"
内容
:::
```

### 10.2 v1 支持的增强块

1. `note` / `tip` / `warning` / `danger` 提示块
2. `steps` 步骤块
3. `code-group` 多标签代码块
4. `card-group` 卡片导航块
5. `image` 带说明图片块
6. `next-steps` 下一步引导块

### 10.3 提示块

示例：

```md
:::note
这是普通提示。
:::
```

带标题：

```md
:::warning title="注意"
这里有一个需要特别注意的限制。
:::
```

渲染规则：
- 左侧带图标或色条
- 允许包含普通 Markdown 内容
- 标题可选
- 风格必须统一

### 10.4 步骤块

示例：

```md
:::steps
### 安装 CLI
先执行安装命令。

```bash
npm install -g nanomind
```

### 初始化项目
创建并初始化文档站。

```bash
nanomind init
```
:::
```

渲染规则：
- 自动将每个 `h3` 识别为一个步骤
- 自动编号
- 每一步支持正文、代码块、图片等普通 Markdown 子内容

### 10.5 多标签代码块

示例：

```md
:::code-group
```bash title="macOS / Linux"
curl -fsSL https://example.com/install.sh | sh
```

```powershell title="Windows"
iwr https://example.com/install.ps1 -useb | iex
```
:::
```

渲染规则：
- 每个代码块的 `title` 作为 tab 名称
- 默认显示第一个 tab
- 支持复制按钮
- 支持语言高亮

### 10.6 卡片导航块

示例：

```md
:::card-group cols="2"
- title: 快速开始
  href: /start/getting-started
  description: 从零开始使用 NanoMind

- title: 配置说明
  href: /reference/config
  description: 查看完整配置项
:::
```

渲染规则：
- 显示为统一卡片网格
- 支持标题、描述、链接
- 默认 2 列

### 10.7 图片块

示例：

```md
:::image src="/images/setup.png" alt="安装界面" caption="完成安装后的界面" /:::
```

或：

```md
:::image src="/images/setup.png" alt="安装界面"
完成安装后的界面
:::
```

渲染规则：
- 支持主图
- 支持 caption
- 后续可扩展宽度、对齐、放大预览

### 10.8 下一步引导块

示例：

```md
:::next-steps
- title: 安装完成后做什么
  href: /start/onboarding
- title: 查看配置项
  href: /reference/config
:::
```

渲染规则：
- 固定用于文末
- 显示为统一跳转列表或卡片组

### 10.9 与 TOC 的关系

- TOC 只从主正文里的标准标题提取
- `steps` 内 `h3` 也进入 TOC
- 其他增强块默认不进入 TOC

### 10.10 组件映射建议

- `note/tip/warning/danger` -> `CalloutBlock`
- `steps` -> `StepsBlock`
- `code-group` -> `CodeGroupBlock`
- `card-group` -> `CardGroupBlock`
- `image` -> `ImageBlock`
- `next-steps` -> `NextStepsBlock`

### 10.11 错误处理策略

若增强块语法错误：
- 页面不应整体崩溃
- 优先降级为普通代码/文本展示
- 管理员编辑态应显示可定位错误提示

### 10.12 完整内容示例

```md
---
title: Getting Started
description: 从零开始快速使用 NanoMind
toc: true
layout: docs
contentMode: centered
---

:::tip title="开始前"
建议先阅读安装说明，再进入初始化步骤。
:::

## 安装

:::steps
### 安装 CLI

```bash
npm install -g nanomind
```

### 初始化站点

```bash
nanomind init
```
:::

## 多平台安装

:::code-group
```bash title="macOS / Linux"
curl -fsSL https://example.com/install.sh | sh
```

```powershell title="Windows"
iwr https://example.com/install.ps1 -useb | iex
```
:::

## 继续阅读

:::card-group cols="2"
- title: Onboarding
  href: /start/onboarding
  description: 完成初始化后的第一步

- title: Config Reference
  href: /reference/config
  description: 查看可配置项
:::

:::next-steps
- title: 继续 Onboarding
  href: /start/onboarding
- title: 查看配置说明
  href: /reference/config
:::
```

## 11. 后续扩展位

v1 先不实现，但设计预留：

- `tabs[].icon`
- `tabs[].external`
- `groups[].collapsed`
- `page.status`: `draft | published`
- `page.visibility`: `public | members | private`
- `page.description`
- `page.icon`
- `page.badge`
- `page.external`
- 首页模块配置
- 多语言

## 12. 技术建议

后端建议：

1. 启动时读取 `docs/docs.json`
2. 构建内存中的导航索引
3. 建立 `page.id -> file path` 映射
4. 建立 `page.id -> tab/group` 反查映射

前端建议：

1. 顶栏频道栏直接消费 `tabs`
2. 左侧栏消费当前频道下的 `groups`
3. 页面打开后按 `page.id` 获取文档内容
4. TOC 从正文自动提取，不从配置读取
5. `DocsShell` 单独管理布局状态并持久化

## 13. 开发顺序

建议顺序：

1. 落地 `docs.json` 解析与校验
2. 实现 `DocsShell` 静态骨架
3. 实现 `MainContentFrame` 的 `centered / wide`
4. 实现 `LeftSidebar` 拖拽与折叠
5. 实现 `ChannelBar`
6. 实现 `RightToc`
7. 接入文档路由与内容渲染
8. 实现增强内容块渲染器
9. 让现有阅读页接入新骨架
10. 再让编辑页接入同一骨架

## 14. 验收标准

完成后应满足：

1. 可通过 `docs.json` 控制顶部频道栏
2. 可通过 `docs.json` 控制左侧分组与页面顺序
3. URL 可稳定映射到本地 Markdown 文件
4. 页面标题优先读取 `page.title` / `frontmatter.title`
5. 右侧 TOC 自动生成
6. 首页可通过 `site.homepage` 指定
7. 页面结构与 OpenClaw 参考页同构
8. 顶栏与频道导航条为两层独立结构
9. 左栏、主内容、右栏为稳定三栏布局
10. 左栏支持拖拽宽度与折叠
11. 中间内容区支持 `centered / wide`
12. 布局状态在刷新后仍可恢复
13. 正文区可渲染至少 3 类增强块
14. 代码组支持 tab 切换与复制
15. 步骤块可自动编号
16. 增强块可与普通 Markdown 共存
17. 后续阅读态与编辑态可共用此骨架

## 15. 结论

v1 正式采用以下模式：

- 内容：Markdown 文件
- 导航：`docs/docs.json`
- 页面元数据：frontmatter
- 页内目录：自动提取
- 页面骨架：`DocsShell`
- 正文表达：Markdown + 增强块指令

这份总 PRD 统一确定了：

- 内容与导航如何组织
- 页面与布局如何呈现
- 壳子如何拆组件和状态
- 正文如何支持现代文档站内容能力

它将作为后续所有实现与讨论的唯一基准文档。

## 16. 第一阶段实现状态（2026-03-07）

本阶段已经先落地“只读文档站骨架 + docs 配置服务”，暂不进入权限与发布控制。

已完成：

1. 后端 docs 服务
   - 新增运行时 `docs.json` 读取与校验
   - 运行时配置位置固定为 `${MIND_PATH}/docs.json`
   - 页面内容按 `pageId -> ${MIND_PATH}/{pageId}.md` 读取
   - 支持 frontmatter 与 `docs.json` 页面元数据合并
   - 暴露：
     - `POST /api/docs/v1/GetConfig`
     - `POST /api/docs/v1/GetPage`

2. 前端 docs 骨架
   - 新增公共路由：`/docs/*`
   - 已落地可复用壳子组件：
     - `DocsShell`
     - `DocsTopbar`
     - `DocsChannelBar`
     - `DocsSidebar`
     - `DocsContentFrame`
     - `DocsRightToc`
     - `DocsMarkdown`
   - 左侧导航支持：
     - 折叠
     - 拖拽宽度
     - 本地持久化
   - 主内容区支持：
     - `centered`
     - `wide`
   - 右侧 TOC 支持正文标题自动提取

3. 当前质量状态
   - `cd site && pnpm lint`：通过
   - `cd site && pnpm typecheck`：通过
   - `go test ./...`：通过

### 16.1 本阶段暂缓项

以下内容保留到下一阶段：

1. 搜索交互与索引 UI
2. 增强内容块（Callout / Steps / Code Group）
3. 阅读态与编辑态共用同一壳子的二次整合
4. 免登录发布与管理员编辑权限
5. docs 导航可视化管理

### 16.2 lint 工作流规范（必须固化）

GVE 项目前端质量检查一律使用：

```bash
cd site && pnpm lint
cd site && pnpm typecheck
```

原因：

1. 当前 `pnpm lint` 实际执行的是 `biome check src`
2. 它只检查源码目录，不会把 `dist/` 构建产物带进去
3. 若直接执行 `cd site && biome check .` 或 `cd site && pnpm exec biome check .`，Biome 会按项目根目录扫描，`dist/` 也可能被带入

结论：

- “要求执行 lint” 的来源是仓库 `AGENTS.md` 与 `gve` 工作流
- 但“扫描到 dist” 不是 skill 本身要求，而是执行者把命令放大成了根目录级 Biome 扫描

因此后续若要沉淀到 skill，必须明确写入：

1. 不允许把 `biome check .` 作为默认 lint 命令
2. NanoMind / GVE 前端统一使用 `pnpm lint`
3. 如需配置层兜底，可继续在 `biome.json` 中强化 `files.includes` / `dist` ignore

补充排查记录见：`docs/2026-03-07-docs-validation-and-lint-investigation.md`

## 17. 第二阶段 PRD：增强内容块与交互规范（更接近 OpenClaw）

第二阶段目标不是继续扩展导航，而是把正文表达能力提升到接近 OpenClaw / Mintlify 这类现代文档站。

本阶段聚焦四类高频内容块：

1. `Callout`
2. `Steps`
3. `Code Group`
4. `Tabs`

目标结果：

- 作者继续写 Markdown，不引入 MDX / JSX
- 前端阅读态具备更强的说明力与交互性
- 编辑态可以安全回写，不破坏原始内容
- 内容块与 `docs.json` 解耦，仍保持“文件负责内容，`docs.json` 负责导航”
- 为后续管理员在线编辑提供稳定的块级抽象

### 17.1 第二阶段范围

本阶段做：

1. 明确四类增强块的作者语法
2. 明确阅读态渲染规则
3. 明确编辑态如何保存与回写
4. 明确这些块与 `docs.json`、frontmatter 的边界
5. 明确验收标准

本阶段仍不做：

1. 任意 JS 运行
2. 自定义 React 组件注入
3. 可视化拖拽排版器
4. 脱离 Markdown 的独立块存储协议

### 17.2 总体设计原则

#### 原则一：源码仍然是 Markdown

所有内容块的唯一真实来源仍然是 Markdown 文件。

系统可以：

- 在阅读态把 Markdown 解析为增强块
- 在编辑态提供“结构化编辑辅助”

但最终保存时，必须可稳定回写为 Markdown 原文，不引入不可逆格式。

#### 原则二：块语法优先使用指令容器

统一继续采用块级指令：

```text
:::block-name
内容
:::
```

有参数时：

```text
:::block-name key="value"
内容
:::
```

这样做的目的：

- 作者可直接手写
- 编辑器可识别为块级节点
- 回退时仍可显示为普通文本，不会整页崩溃

#### 原则三：内容块默认不进 docs.json

`docs.json` 继续只承担这些职责：

- 站点信息
- 顶栏信息
- 导航结构
- 页面级布局默认值

内容块本身不写入 `docs.json`，而写在对应 Markdown 正文中。

原因：

- 内容块属于页面内容层
- 不能把正文表达拆散到配置文件中
- 避免作者同时维护“正文文件 + JSON 内容片段”两份数据

#### 原则四：编辑器必须可保真

对于本阶段四类块，编辑器至少要满足：

1. 能识别块边界
2. 能尽量以友好 UI 展示
3. 若当前版本尚未实现可视化编辑，也必须原样保留源码
4. 不可因为未知字段、顺序变化、空行变化而破坏块结构

### 17.3 术语说明

本文中的 `Tabs` 指正文中的“标签页内容块”，不是站点顶部频道导航 `tabs`。

为避免混淆：

- `docs.json.tabs`：站点频道导航
- `:::tabs`：正文中的内容切换块

### 17.4 Callout 规范

#### 17.4.1 作者语法

最小写法：

```md
:::note
这是普通提示。
:::
```

带标题写法：

```md
:::tip title="推荐"
建议先完成初始化，再继续后面的配置。
:::
```

完整写法：

```md
:::warning title="注意" collapsible="false"
升级前请先备份当前数据目录。
:::
```

支持的块名：

- `note`
- `tip`
- `warning`
- `danger`

支持属性：

- `title`：可选，自定义标题
- `collapsible`：可选，v2 默认先保留语义，阅读态可暂不实现折叠

#### 17.4.2 渲染规则

- 使用统一 `CalloutBlock`
- 根据块名映射不同视觉语义与图标
- 若未传 `title`，使用默认标题：
  - `note` -> `Note`
  - `tip` -> `Tip`
  - `warning` -> `Warning`
  - `danger` -> `Danger`
- 内容区继续支持普通 Markdown
- `Callout` 内可嵌套列表、代码块、链接、图片
- `Callout` 默认不进入右侧 TOC

视觉目标：

- 风格更接近 OpenClaw：浅底色、细边框、圆角、较轻的状态色
- 不做过重的彩色大面积填充

#### 17.4.3 可编辑性要求

- 编辑态至少能把整个 `Callout` 识别为一个块
- 支持修改：类型、标题、正文
- 若可视化 UI 尚未实现，源码模式也必须完整保留起止指令
- 不允许在保存时把 `:::warning` 自动改写成别的语法

#### 17.4.4 与 docs.json 的关系

- `Callout` 不在 `docs.json` 中声明
- `docs.json` 不参与 `Callout` 内容排序和数据存储
- 仅当未来需要“按站点禁用某类内容块”时，才考虑在 `site.features` 做开关；v2 默认不要求

### 17.5 Steps 规范

#### 17.5.1 作者语法

作者写法固定为一个容器，内部每个 `h3` 代表一个步骤：

```md
:::steps
### 安装 CLI
先安装命令行工具。

```bash
pnpm add -g nanomind
```

### 初始化站点
创建并初始化文档站。

```bash
nanomind init
```
:::
```

约束：

- `steps` 容器下至少要有一个 `h3`
- `h3` 之前允许有导语段落，但不计入步骤编号
- 一个 `h3` 到下一个 `h3` 之间的所有内容都归属于该步骤

#### 17.5.2 渲染规则

- 使用统一 `StepsBlock`
- 自动按顺序编号：1、2、3...
- 每个步骤包含：编号区、标题区、正文区
- 步骤间使用稳定的垂直节奏和连接视觉
- 步骤内部允许：
  - 段落
  - 列表
  - 代码块
  - 图片
  - Callout
- `steps` 内部的 `h3` 进入 TOC
- TOC 层级按 `h3` 处理，不额外制造伪标题

视觉目标：

- 接近 OpenClaw 的“流程说明”体验
- 强调顺序关系，但不做过重的时间线 UI

#### 17.5.3 可编辑性要求

- 编辑器应能识别 `steps` 容器
- 编辑器应支持“新增一步 / 删除一步 / 调整顺序”
- 若暂不做可视化排步，至少要保留：
  - `:::steps`
  - 内部 `h3`
  - 步骤内容原始顺序
- 不允许在保存后丢失步骤中的代码块语言、标题、空行

#### 17.5.4 与 docs.json 的关系

- `Steps` 完全属于正文层，不进 `docs.json`
- `docs.json` 只决定页面位于哪个导航位置，不决定步骤顺序
- 页面是否显示 TOC 仍由 frontmatter 的 `toc` 决定，不因 `steps` 单独配置

### 17.6 Code Group 规范

#### 17.6.1 作者语法

容器内放多个代码块，每个代码块必须提供 `title`：

```md
:::code-group
```bash title="macOS / Linux"
curl -fsSL https://example.com/install.sh | sh
```

```powershell title="Windows"
iwr https://example.com/install.ps1 -useb | iex
```
:::
```

可选增强写法：

```md
:::code-group sync-key="install"
```bash title="pnpm"
pnpm install
```

```bash title="npm"
npm install
```
:::
```

支持属性：

- `sync-key`：可选，预留给未来“跨页面或跨块记忆用户选择”

每个内部代码块支持属性：

- 代码语言：来自 fenced code info string
- `title`：必填，作为 tab 标签名

#### 17.6.2 渲染规则

- 使用统一 `CodeGroupBlock`
- 顶部展示 tab 列表
- 默认激活第一个 tab
- 支持手动切换 tab
- 每个 tab 面板只渲染一个代码块
- 每个代码块必须支持：
  - 语言高亮
  - 复制按钮
  - 长代码横向滚动
- 若存在 `sync-key`，后续可以把用户最近选择持久化；v2 初版可不实现持久化，但字段需保留
- `code-group` 本身不进入 TOC

#### 17.6.3 可编辑性要求

- 编辑器应识别 `code-group` 为块级容器
- 支持新增 / 删除代码 tab
- 支持修改 tab 标题与代码语言
- 若当前只有源码编辑能力，保存时必须严格保留：
  - tab 顺序
  - `title`
  - 代码内容
  - fenced code 栅栏

#### 17.6.4 与 docs.json 的关系

- `Code Group` 不写入 `docs.json`
- `docs.json` 不负责代码 tab 的数据
- 若未来要做“站点级默认 shell 偏好”，可以加在站点个性化配置，不属于 v2 必做

### 17.7 Tabs 规范

#### 17.7.1 作者语法

`Tabs` 用于承载“非代码”的正文分组切换，比如个人版 / 团队版、云端 / 本地、自托管 / SaaS 等。

推荐语法：

```md
:::tabs
:::tab title="个人版"
适合个人知识库，默认结构更轻。

- 单人使用
- 配置简单
:::

:::tab title="团队版"
适合团队知识库，需要登录、权限与协作流程。

- 多成员
- 需要权限控制
:::
:::
```

可选增强写法：

```md
:::tabs sync-key="plan-mode"
:::tab title="Public" value="public"
允许公开访问。
:::

:::tab title="Members" value="members"
需要登录后访问。
:::
:::
```

支持属性：

- `sync-key`：可选，预留给未来记忆用户选择

每个 `tab` 支持属性：

- `title`：必填，展示标题
- `value`：可选，稳定值；若缺失则由系统按标题生成 slug

#### 17.7.2 渲染规则

- 使用统一 `TabsBlock`
- 顶部展示 tab 标签
- 默认激活第一个 tab
- 每个 tab panel 中可包含普通 Markdown
- 每个 tab panel 中允许嵌套：
  - 段落
  - 列表
  - 图片
  - Callout
  - Code Group
- `Tabs` 容器本身不进入 TOC
- `Tabs` 面板内部若包含标准标题，进入 TOC 时只采集当前渲染输出对应的真实标题

v2 初版建议：

- 为避免 TOC 和隐藏内容冲突，`Tabs` 内不建议写 `h1/h2`
- 若写了 `h3/h4`，阅读态默认只让当前激活面板的标题参与 TOC

#### 17.7.3 可编辑性要求

- 编辑器应识别 `tabs` 与内部多个 `tab`
- 支持新增 / 删除 / 重排 tab
- 支持修改 tab 标题
- 若暂未实现可视化 tabs 编辑，源码模式必须完整保留嵌套容器结构
- 不允许保存后把 `:::tab` 扁平化为普通段落

#### 17.7.4 与 docs.json 的关系

- `Tabs` 与 `docs.json.tabs` 没有关联，二者是不同层级的概念
- `docs.json.tabs` 决定页面属于哪个频道
- `:::tabs` 决定页面正文内部的局部切换内容
- 实现中必须避免命名混淆，建议前端内部类型命名为：
  - `DocsNavTab`：顶部频道
  - `ContentTabsBlock`：正文 tabs 块

### 17.8 frontmatter 与 docs.json 的边界

第二阶段继续保持三层边界清晰：

1. `docs.json`
   - 定义站点导航、页面位置、默认布局
2. frontmatter
   - 定义页面级元信息，例如标题、描述、TOC 开关、内容宽度
3. Markdown 正文
   - 定义页面实际内容与增强块

明确规定：

- 不允许在 `docs.json` 里写 `callouts`、`steps`、`codeGroups`、`tabsContent`
- 不允许把正文增强块拆成外部 JSON 再回填到页面
- 允许在未来增加页面级 feature flag，但只能作为“是否启用某渲染能力”的开关，不能替代正文内容本身

### 17.9 解析与降级策略

为保证在线编辑稳定，本阶段必须支持降级：

1. 块名未知
   - 按普通自定义容器或原始文本处理
2. 属性未知
   - 保留属性，不报致命错误
3. `code-group` 中某个代码块缺少 `title`
   - 阅读态回退为普通代码块列表
   - 编辑态给出非阻断警告
4. `steps` 中没有 `h3`
   - 阅读态回退为普通容器渲染
   - 编辑态给出非阻断警告
5. `tabs` 中没有有效 `tab`
   - 回退为普通容器渲染

原则：

- 页面不能因为单个增强块语法错误而整体崩溃
- 错误要可定位，但不能阻塞作者继续编辑

### 17.10 第二阶段验收标准

完成后应满足：

1. 作者可在纯 Markdown 中写出 `Callout / Steps / Code Group / Tabs`
2. 四类块均有稳定、可复用的前端块组件映射
3. `Callout` 支持四种语义：`note/tip/warning/danger`
4. `Callout` 支持可选 `title`
5. `Steps` 能根据 `h3` 自动编号
6. `Steps` 内的步骤标题可进入 TOC
7. `Code Group` 支持至少两个 tab 的切换
8. `Code Group` 的 tab 名来自代码块 `title`
9. `Code Group` 支持代码复制
10. `Tabs` 支持非代码内容切换
11. `Tabs` 与顶部频道导航在概念和实现上完全分离
12. 四类块都能与普通 Markdown 混排
13. 任一块语法错误不会导致整页渲染崩溃
14. 编辑态保存后，四类块源码结构不被破坏
15. `docs.json` 继续只负责导航与页面级配置，不承担正文块数据
16. 前端实现命名上明确区分导航 tabs 与正文 tabs
17. 页面视觉效果明显更接近 OpenClaw：轻量、圆角、弱边框、阅读优先

### 17.11 推荐实现顺序

第二阶段建议按以下顺序落地：

1. 定义 Markdown 块解析层与 AST 结构
2. 先实现 `CalloutBlock`
3. 再实现 `CodeGroupBlock`
4. 再实现 `StepsBlock`
5. 最后实现 `TabsBlock`
6. 接入 TOC 采集规则与降级策略
7. 最后再接编辑态保真回写

原因：

- `Callout` 最简单，可先打通块渲染链路
- `Code Group` 和 `Tabs` 都涉及交互状态，是后续块系统的基础
- `Steps` 依赖标题解析与 TOC 协作
- 编辑态应建立在阅读态块协议稳定之后
