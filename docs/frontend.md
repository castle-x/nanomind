# **中后台前端技术选型方案（Vite + Shadcn UI 栈）**

---

## 1\. 核心技术栈

层级技术版本选型理由**包管理pnpm**9.x硬链接节省磁盘 70%，严格依赖树防幽灵依赖，原生 Monorepo 支持**构建工具Vite**6.x秒级冷启动（比 Webpack 快 10-100 倍），原生 ESM，Rollup 生产打包**框架React**19.xReact Compiler 自动优化重渲染，Server Components 可选支持**语言TypeScript**5.7+严格模式（`strict: true`），类型即文档**路由React Router**7.xData API（Loader/Action），嵌套路由，代码分割原生支持**UI 组件Shadcn UI**最新Headless + Tailwind，源码可修改，无运行时依赖，Radix UI 无障碍基础**样式Tailwind CSS**4.x原子类防冲突，CSS 变量主题系统，编译后零运行时**状态管理Zustand**5.x极轻量（<1KB），TS 推导完美，无 Provider 嵌套地狱**服务端状态TanStack Query**5.x自动缓存、去重、重试、轮询，替代 Redux 管理服务端数据**表单React Hook Form**7.x非受控组件性能优，配合 Zod resolver 类型安全**校验Zod**3.x运行时类型校验，前后端共享 Schema**HTTPKy**1.x轻量 fetch 封装，支持重试、超时、TypeScript 友好（替代 Axios）**工具库es-toolkit**最新Lodash 现代替代，Tree-shaking 友好，TS 原生支持**构建规范Biome**1.9+极速 Lint + Format（Rust 编写），替代 ESLint + Prettier**Git 规范Husky**9.x提交前自动检查（类型/格式/测试）

---

## 2\. 工程化约束（硬性）

### TypeScript 严格配置

-   `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`
    
-   路径别名：`@/` 映射 `./src/`，禁止 `../` 相对路径超过 2 层
    
-   禁用 `any`，使用 `unknown` + 类型守卫
    

### 代码质量门禁

-   **提交前**：Biome 自动修复 + TypeScript 类型检查（无 emit）
    
-   **提交信息**：Conventional Commits 规范（`feat:`, `fix:`, `refactor:`）
    
-   **分支保护**：主分支需 PR + CI 通过（GitHub Actions）
    

### 性能基线

-   首屏 JS < 200KB（Gzip）
    
-   组件懒加载覆盖率 > 80%
    
-   Lighthouse 性能评分 > 90
    

---

## 3\. 标准化目录结构（FSD 架构）

```
project/
├── .github/workflows/        # CI: 类型检查 -> 构建 -> 部署
├── .husky/                   # 提交钩子
├── public/                   # 静态资源（favicon, robots）
├── scripts/                  # 自动化脚本（生成组件、API 同步）
│
├── src/
│   ├── app/                  # 应用初始化层
│   │   ├── main.tsx          # 入口挂载
│   │   ├── routes.tsx        # 路由表（懒加载配置）
│   │   ├── providers.tsx     # 全局 Provider 组合
│   │   └── styles/           # 全局 CSS + Tailwind 入口
│   │
│   ├── views/                # 页面层（按功能模块）
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── system/           # 系统管理（用户/角色/权限）
│   │       ├── index.tsx     # 页面组件
│   │       ├── loader.ts     # 路由数据获取（React Router）
│   │       └── components/   # 页面级私有组件
│   │
│   ├── widgets/              # 可复用业务组件（跨页面）
│   │   ├── data-table/       # 基于 Shadcn Table 的 CRUD 封装
│   │   ├── search-filter/    # 通用筛选栏
│   │   └── page-header/      # 统一页面头
│   │
│   ├── entities/             # 领域层（业务实体）
│   │   ├── user/
│   │   │   ├── model/        # 类型定义 + Zustand Store
│   │   │   ├── api/          # 领域 API 请求（Ky 实例）
│   │   │   └── ui/           # 实体专属组件（UserSelect）
│   │   └── order/
│   │
│   ├── shared/               # 共享基础设施（禁止业务逻辑）
│   │   ├── ui/               # Shadcn 组件（原始，不修改）
│   │   ├── lib/              # 纯工具函数（cn, formatDate）
│   │   ├── api/              # HTTP 客户端实例 + 拦截器
│   │   ├── config/           # 环境变量读取
│   │   └── types/            # 全局辅助类型
│   │
│   └── main.tsx              # 应用入口
│
├── biome.json                # Lint + Format 配置
├── tailwind.config.ts        # 主题定制（CSS 变量）
├── tsconfig.json             # 严格类型配置
└── vite.config.ts            # 构建配置（别名、代理、优化）
```

---

## 4\. 关键开发规范

### 状态管理分层

-   **服务端状态**（API 数据）→ **TanStack Query**（缓存、自动刷新）
    
-   **客户端全局状态**（主题/用户）→ **Zustand**（持久化插件选 `zustand/middleware`）
    
-   **本地状态**（表单/弹窗）→ **React useState/useReducer**
    
-   **禁止**：用 Context 传递频繁变化的数据（导致重渲染）
    

### 组件封装原则

-   **Shadcn 层**：`components/ui/` 保持原始，仅通过 `globals.css` 覆盖主题变量
    
-   **业务层**：`widgets/` 和 `entities/ui/` 进行二次封装（如带权限的按钮）
    
-   **Props 接口**：必须提取为 `interface Props`，禁用 `React.FC`（丢失泛型支持）
    

### API 层规范

-   **分层**：`shared/api/client.ts`（Ky 实例） -> `entities/[domain]/api.ts`（领域方法）
    
-   **类型**：API 返回类型使用 `z.infer<typeof Schema>` 从 Zod Schema 推导
    
-   **错误**：HTTP 错误统一拦截，业务错误码映射到 Toast 提示
    

### 样式规范

-   **Tailwind**：使用 `cn()`（clsx + tailwind-merge）合并类名
    
-   **主题**：通过 CSS 变量定义品牌色，支持亮色/暗色/高对比度模式
    
-   **禁止**：手写 CSS 文件（除非复杂动画），禁用 CSS-in-JS（Emotion/Styled-components）
    

---

## 5\. 开发与部署脚本

```json
// package.json scripts
{
  "dev": "vite",                      // 本地开发（HMR）
  "dev:mock": "vite --mode mock",     // MSW Mock 模式
  "build": "tsc && vite build",       // 类型检查 + 构建
  "preview": "vite preview",          // 预览生产包
  "lint": "biome check .",            // 代码检查
  "lint:fix": "biome check . --write",// 自动修复
  "typecheck": "tsc --noEmit",        // 纯类型检查
  "generate:api": "openapi-typescript https://api.example.com/swagger.yaml -o src/shared/api/schema.ts"
}
```

**部署**：构建输出 `dist/` 为纯静态文件，可部署至：

-   Nginx / CDN（推荐）
    
-   Vercel / Netlify（边缘网络）
    
-   Docker（`nginx:alpine` 镜像，< 20MB）
    

---

## 6\. 版本锁定与升级策略

-   **锁定文件**：提交 `pnpm-lock.yaml`，确保团队成员依赖一致
    
-   **升级频率**：
    
    -   补丁版本（自动）：Dependabot 每周 PR
        
    -   次要版本（手动）：每月评估（React/Vite 等大版本需测试）
        
    -   **禁止**：直接修改 `package.json` 版本，使用 `pnpm update --interactive`
        

**这套选型的核心优势**：完全源码可控（Shadcn 组件即你的代码），构建极速（Vite），类型安全（TS 严格模式），且预留了向 Monorepo（pnpm workspace）扩展的能力，适合 3-5 人团队快速开发维护。