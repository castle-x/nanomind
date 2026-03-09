# 2026-03-07 docs API / 契约复核结论

## 结论

### 1. Callout / Steps / Code Group / Tabs 当前**不需要**新增后端 API 或 docs.json 契约字段

原因：

- 当前 docs API 已经返回完整页面正文 `content`，前端可以在 Markdown 渲染层解析块级指令语法。
- PRD 已明确这些增强块属于“正文表达层”，不是站点导航层，也不是页面元信息层。
- `docs.json` 当前职责是导航编排：`site / topbar / tabs / groups / pages`。
- frontmatter 当前职责是页面级元信息：`title / description / toc / layout / contentMode`。

因此这几类能力建议保持分层：

- `docs.json`：导航与页面壳信息
- `frontmatter`：页面级展示元信息
- Markdown 正文：`:::note`、`:::steps`、`:::code-group` 等增强块
- 前端 renderer：把增强块解析成组件

### 2. 如果未来要支持通用 `Tabs` 内容块，也仍然优先做前端语法块，不建议先扩后端

建议复用与 `code-group` 相同的设计哲学：

- 后端仍只返回原始 Markdown 正文
- 前端解析例如 `:::tabs` / `:::tab title="..."` 之类语法
- 不把块级结构提前固化进 docs API 返回模型

这样可以避免把正文表现层过早耦合到后端契约。

## 当前可见的契约注意点

### 1. `DocsPageResponse` 与实际 handler 返回存在轻微漂移

当前 thrift / 生成代码中的 `DocsPageResponse` 字段是：

- `id`
- `title`
- `description`
- `toc`
- `layout`
- `contentMode`
- `content`

但后端 `DocsService.GetPage()` 的内部模型 `DocsPageContent` 还包含：

- `frontmatter`

这个字段目前不会阻塞前端内容块实现，因为前端也没有依赖它；但从“契约严格一致”角度看，后面应二选一：

1. 要么把 `frontmatter` 正式加进 thrift；
2. 要么保证 handler 只输出 thrift 中声明的字段。

当前阶段不建议为内容块而扩这部分。

### 2. `site.root` 当前更像描述字段，不是实际路径约束

PRD 中写了 `site.root`，但当前后端解析页面时实际直接以运行时 `MIND_PATH` 为根。

这不影响现阶段前端开发，但到后续发布/多站点/子目录部署阶段，若想让 `root` 真正参与寻址或 URL 前缀设计，需要重新明确它的语义。

## 未来权限 / 发布阶段真正会卡的点

这些点比内容块更值得优先进入后端设计。

### 1. docs API 目前是公开路由，没有权限门控

当前：

- `/api/docs/v1/GetConfig`
- `/api/docs/v1/GetPage`

都挂在公开路由组上。

所以一旦站点进入“部分文档需登录、部分文档公开”的阶段，现有路由模型会不够用。

后续至少需要明确：

- 站点级访问模式：公开 / 登录可读 / 混合
- 页面级或分组级可见性
- 匿名用户是否能拿到完整导航
- 未授权页面返回 404 还是 403

### 2. `docs.json` / frontmatter 目前没有发布状态字段

若要支持“管理员可编辑、用户只读、发布前可配置免登录、也可要求登录”的产品目标，后面会缺这些表达能力：

- `visibility` / `access`
- `published`
- `draft`
- `publishedAt`
- `roles` / `audiences`
- 是否显示在导航中但不可访问

建议后续优先评估这些字段该放：

- `docs.json page` 上
- frontmatter 上
- 或二者组合（导航控制 + 页面元数据控制）

### 3. 预览态与发布态尚未分离

当前内容根默认就是 `MIND_PATH`，读取的是实时文件。

这在“个人知识库在线编辑”阶段没问题，但在“可发布站点”阶段会遇到：

- 草稿与已发布内容如何并存
- 发布是否需要生成快照/manifest
- 用户看到的是当前编辑中内容，还是最后一次发布内容

这会直接影响后续后端数据流设计，比增强块本身更关键。

### 4. 搜索、目录、权限最终需要统一口径

当混合权限出现后，后续这些能力都要一起收敛：

- 左侧导航是否过滤未授权页面
- 搜索结果是否过滤未发布/未授权页面
- 直接访问页面 URL 时如何鉴权
- TOC 和正文是否允许对未授权块做局部隐藏

## 对主线程的建议

下一阶段前端可以放心推进：

1. 先把 Markdown renderer + 块级指令解析器做好
2. 先把 `CalloutBlock` / `StepsBlock` / `CodeGroupBlock` 做成可复用组件
3. `Tabs` 若要做，也优先作为正文增强块实现
4. 暂时不要为了这些内容块改 docs API / docs.json / frontmatter

但请尽早在“权限 / 发布”专题里单独设计：

1. 站点访问模式
2. 页面发布状态模型
3. 导航过滤与 API 鉴权策略
4. 预览态 / 发布态内容源分离
