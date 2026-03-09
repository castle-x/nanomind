# gve api generate — TypeScript 客户端修复指南

> 日期：2026-03-06
> 复现项目：nanomind（Go + Vite + Embed，PocketBase 集成）
> gve 版本：v7f070f7-dirty (7f070f7) 2026-03-06T07:10:29Z

## 概述

`gve api generate` 生成的 TypeScript 客户端代码存在一个编译阻断性问题：生成的 class 使用了 `erasableSyntaxOnly` 模式下不允许的 TypeScript 语法。

---

## BUG：parameter property 与 erasableSyntaxOnly 不兼容

### 现象

```
src/api/nanomind/auth/v1/client.ts(3,15): error TS1294:
    This syntax is not allowed when 'erasableSyntaxOnly' is enabled.

src/api/nanomind/file/v1/client.ts(3,15): error TS1294:
    This syntax is not allowed when 'erasableSyntaxOnly' is enabled.

src/api/nanomind/search/v1/client.ts(3,15): error TS1294:
    This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

### 根因

gve 生成的 TypeScript 客户端使用了 **parameter property** 语法：

```typescript
// gve 当前生成的代码（不兼容）
export class FileServiceClient {
  constructor(private readonly baseUrl: string) {}
  //          ^^^^^^^^^^^^^^^^^ TS parameter property
}
```

TypeScript 5.8+ 引入了 `erasableSyntaxOnly` 编译选项（Node.js 原生 TS 支持所需）。当此选项启用时，**parameter property 不被允许**，因为它在运行时会产生赋值代码（`this.baseUrl = baseUrl`），不是纯类型注解。

GVE 的 base-setup 资产生成的 `tsconfig.app.json` 中启用了此选项：

```json
{
  "compilerOptions": {
    "erasableSyntaxOnly": true
  }
}
```

这导致 gve 自己生成的代码与 gve 自己的 base-setup 配置冲突。

### 影响范围

所有由 `gve api generate` 生成的 `client.ts` 文件。

### 修复方案

**方案 A（推荐）：生成兼容 `erasableSyntaxOnly` 的代码**

将 parameter property 改为显式字段声明 + 构造函数赋值：

```typescript
// 修复后（兼容 erasableSyntaxOnly）
export class FileServiceClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
}
```

改动量极小（模板替换），且向后兼容所有 TypeScript 版本。

**方案 B：不使用 class，改为工厂函数**

```typescript
// 函数式风格（更简洁，完全避免 class 语法）
export function createFileServiceClient(baseUrl: string) {
  return {
    async GetTree(reqBody: unknown): Promise<unknown[]> {
      const response = await fetch(`${baseUrl}/GetTree`, { ... });
      ...
    },
    // ...
  };
}
```

优点：无 class、无 parameter property、更符合 FP 风格。
缺点：改动较大，需调整所有使用方的实例化方式。

---

## 复现步骤

```bash
# 1. 确认 gve 版本
gve version
# gve v7f070f7-dirty (7f070f7) 2026-03-06T07:10:29Z

# 2. 确认 tsconfig 配置
grep erasableSyntaxOnly site/tsconfig.app.json
# "erasableSyntaxOnly": true

# 3. 生成代码
gve api generate
# ✓ Generated API artifacts for 3 thrift file(s)

# 4. 尝试类型检查 — 失败
cd site && npx tsc --noEmit -p tsconfig.app.json
# error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

## 注意：pnpm typecheck 可能无法检出此问题

当前 `package.json` 中 `typecheck` 脚本定义为 `tsc --noEmit`，使用根 `tsconfig.json`。

根 `tsconfig.json` 使用 project references（`"files": []` + `"references"`），`tsc --noEmit`（不带 `--build`）不会深入检查 referenced 项目，导致**静默通过**。

建议将 typecheck 脚本改为：

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit -p tsconfig.app.json"
  }
}
```

## 预期行为

`gve api generate` 生成的 TypeScript 代码应兼容 gve base-setup 初始化的 tsconfig 配置，无需手动修改即可通过 `tsc --noEmit`。
