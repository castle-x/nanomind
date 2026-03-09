# 前端遗留 TypeScript 错误修复方案

> 日期：2026-03-06
> 共 4 处错误源，6 条 TS 报错

---

## 1. `shared/hooks/useAuth.ts` — PocketBase RecordModel 类型不匹配

### 报错

```
TS2345: Argument of type 'AuthUser' is not assignable to parameter of type 'RecordModel'.
  Type 'AuthUser' is missing properties: collectionId, collectionName

TS2322: partialize return type is not assignable to AuthState.
  Missing properties: setAuth, logout
```

### 根因

1. `pb.authStore.save(token, user)` 的第二参数类型为 `AuthRecord = RecordModel | null`，而 `RecordModel` 要求 `collectionId` + `collectionName`。自定义的 `AuthUser` 接口缺这两个字段。
2. Zustand `persist` 的 `partialize` 回调要求返回值类型为完整的 `S`（state），但实际只返回了 3 个数据字段，缺少 `setAuth` 和 `logout` 方法。

### 修复

```typescript
// 1. AuthUser 继承 RecordModel 所需字段
interface AuthUser {
  id: string;
  email: string;
  name?: string;
  collectionId: string;
  collectionName: string;
  [key: string]: unknown;
}

// 2. partialize 用 DeepPartial 或显式类型断言
partialize: (state) => ({
  user: state.user,
  token: state.token,
  isAuthenticated: state.isAuthenticated,
}) as unknown as AuthState,
```

说明：`partialize` 断言 `as unknown as AuthState` 是 Zustand persist 的已知 pattern — 持久化只需序列化数据字段，方法在 hydrate 时由 `create()` 重新注入。

---

## 2. `shared/ui/context-menu.tsx` — Radix UI sideOffset 属性不存在

### 报错

```
TS2339: Property 'sideOffset' does not exist on type 'ContextMenuContentProps'.
```

### 根因

`@radix-ui/react-context-menu@2.2.16` 的 `Content` 组件没有 `sideOffset` 属性。`sideOffset` 是 `Popover.Content` / `DropdownMenu.Content` 的属性，ContextMenu 是右键菜单，显示位置由鼠标坐标决定，不需要偏移量。

这是组件模板从 DropdownMenu 复制过来时遗留的多余属性。

### 修复

移除 `sideOffset` 的解构和传递：

```typescript
// Before
>(({ className, sideOffset = 4, ...props }, ref) => (
    <ContextMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}

// After
>(({ className, ...props }, ref) => (
    <ContextMenuPrimitive.Content
      ref={ref}
```

---

## 3. `shared/ui/toast/index.tsx` — 缺失 `use-toast` 模块

### 报错

```
TS2307: Cannot find module './use-toast' or its corresponding type declarations.
```

### 根因

`shared/ui/toast/` 目录只有 `index.tsx`，缺少它 import 的 `use-toast.ts` 文件。这个 toast 组件是手写的自定义实现（不是 gve ui 资产），但未完成。

项目实际使用的 toast 库是 `sonner`（见 `ChangePasswordDialog.tsx` 和 `LoginView` 中的 `import { toast } from "sonner"`）。

### 修复方案

**方案 A（推荐）：删除整个 `shared/ui/toast/` 目录**

该组件未被任何 view 直接使用（所有 toast 调用都走 `sonner`），是死代码。删除即可。

```bash
rm -rf site/src/shared/ui/toast/
```

如果有其他文件 import 了 `@/shared/ui/toast`，需同步移除。

**方案 B：补全 `use-toast.ts`**

如果后续需要自定义 toast 逻辑，可以创建最小实现：

```typescript
// shared/ui/toast/use-toast.ts
import { useState } from "react";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const [toasts] = useState<Toast[]>([]);
  return { toasts };
}
```

但考虑到 `sonner` 已覆盖所有 toast 场景，方案 A 更干净。

---

## 4. `views/auth/index.tsx` — RecordModel 类型断言

### 报错

```
TS2352: Conversion of type 'RecordModel' to type '{ id: string; email: string; ... }'
may be a mistake because neither type sufficiently overlaps with the other.
```

### 根因

```typescript
authData.record as { id: string; email: string; [key: string]: unknown }
```

`RecordModel` 的索引签名是 `[key: string]: any`，而目标类型的索引签名是 `[key: string]: unknown`。TypeScript 认为 `any` → `unknown` 的索引签名缩窄不安全。

### 修复

通过 `unknown` 中间桥接，或直接使用修复后的 `AuthUser` 类型：

```typescript
// 使用修复后的 AuthUser（推荐，配合 Error 1 的修复）
setAuth(
  {
    id: authData.record.id,
    email: authData.record.email as string,
    collectionId: authData.record.collectionId,
    collectionName: authData.record.collectionName,
  },
  authData.token,
);
```

显式构造 `AuthUser` 对象而不是 `as` 断言，避免运行时字段缺失。

---

## 修复优先级

| 优先级 | 错误 | 影响 |
|--------|------|------|
| P0 | toast 缺失模块 | 编译阻断（虽然运行时不会触发） |
| P1 | useAuth + auth/index 类型 | 两处关联，一起修 |
| P2 | context-menu sideOffset | 编译警告，功能不受影响 |

建议按 Error 3 → Error 1+4 → Error 2 的顺序修复，预计改动 4 个文件。
