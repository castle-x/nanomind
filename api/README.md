# API Contracts Directory

`api/` 目录仅用于存放 Thrift IDL 契约定义文件（`.thrift`）。

## 目录结构

```
api/nanomind/
├── auth/v1/auth.thrift      # 认证 & 应用信息
├── file/v1/file.thrift      # 文件 CRUD
└── search/v1/search.thrift  # 全文搜索
```

## 规则

- **仅 `.thrift`**：`api/` 只保留 Thrift IDL 定义，不存放生成代码。
- **Go 生成代码** → `internal/api/nanomind/<resource>/v1/`
- **TS 客户端代码** → `site/src/api/nanomind/<resource>/v1/client.ts`
- 使用 `gve api new` 创建契约骨架。
- 使用 `gve api generate` 生成 Go/TS 客户端代码到对应目录。
- API 文档统一放到 `docs/api/`。

## 生成代码位置

| 语言 | 位置 | 说明 |
|------|------|------|
| Go (Thrift types) | `internal/api/nanomind/<res>/v1/` | 无 build tag，直接参与编译 |
| Go (HTTP client) | `internal/api/nanomind/<res>/v1/` | 同上 |
| TypeScript | `site/src/api/nanomind/<res>/v1/client.ts` | 使用 `@/api/request.ts` 提供的 Ky 实例 |

当前文档索引文件位于：`docs/api/registry.docs.json`。
