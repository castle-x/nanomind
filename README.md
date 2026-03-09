# NanoMind

> 一个自托管的 Markdown 笔记应用，采用 Go + PocketBase + React 构建，目标是以单二进制方式部署。

## 状态

**项目目前仍在积极开发中。**

当前仓库主要用于：
- 持续迭代前端编辑器与文档界面
- 验证 PocketBase 嵌入式后端架构
- 打磨单二进制部署与本地文件存储方案

因此在现阶段：
- API 和前端交互细节可能继续调整
- 数据结构和目录组织可能继续演进
- 文档会逐步补齐

## 技术栈

- 后端：Go、PocketBase、SQLite
- 前端：React、TypeScript、Vite、Tailwind CSS
- 状态管理：Zustand、TanStack Query
- 编辑器：Tiptap
- 部署方式：单二进制，前端构建产物通过 `go:embed` 内嵌

## 项目结构

```text
cmd/server/     Go 服务入口
internal/       后端业务、路由、服务、迁移
site/           React 前端
api/            Thrift API 契约
docs/           设计、计划与实现文档
scripts/        开发辅助脚本
```

## 本地开发

安装前端依赖：

```bash
make install
```

常用开发命令：

```bash
make dev              # 前后端一起启动
make dev-backend      # 仅启动后端开发模式
make dev-web          # 仅启动前端 Vite HMR
make dev-split        # 后端后台常驻 + 前端热更新，适合快速调样式
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8090`
- Admin UI：`http://localhost:8090/_/`

## 构建

```bash
make build
```

构建完成后会生成可执行文件：

```bash
bin/nanomind
```

运行方式：

```bash
./bin/nanomind serve --http=localhost:8090
```

## 测试与检查

```bash
make test
cd site && pnpm lint
cd site && pnpm typecheck
```

## 数据目录

运行时数据默认存放在：

```bash
~/.nanomind
```

可通过环境变量覆盖：

- `DATA_DIR`：PocketBase 数据目录
- `MIND_PATH`：Markdown 文件目录
- `ENV=dev`：开发模式

## 说明

- 当前 README 仅提供最基础的项目说明
- 更详细的设计与实现文档见 `docs/`
- 如果你只是想快速迭代前端界面，优先使用 `make dev-split`

## License

暂未指定。
