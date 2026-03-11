# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NanoMind is a self-hosted Markdown note-taking app built as a **single-binary full-stack application**. It uses **PocketBase as a Go library** for authentication, database, and admin UI, with an **embedded React SPA** frontend via `go:embed`. The frontend build output (`site/dist/`) is embedded into the Go binary, producing a single deployable binary.

## Commands

### Development

```bash
make install       # pnpm install for frontend
make dev           # Start backend (:8090) + frontend (:5173) with HMR
make dev-split     # Backend in background + frontend HMR (auto-restart)
make dev-backend   # Go backend only (with -tags development)
make dev-web       # Vite dev server only
```

### Building

```bash
make build         # Build frontend then backend (current platform)
make build-web     # Frontend only → site/dist/
make build-backend # Backend only → bin/nanomind
make build-all     # All platforms (linux/mac/windows, amd64/arm64)
```

**Build order matters**: frontend must be built before backend so `go:embed` picks up `site/dist/`.

### Testing & Quality

```bash
make test                # Go tests (go test ./...)
cd site && pnpm lint     # Biome lint check
cd site && pnpm lint:fix # Biome auto-fix
cd site && pnpm typecheck # tsc --noEmit
```

Always run `pnpm lint` and `pnpm typecheck` after frontend changes.

## Architecture

### Go Backend (GVE Hub Pattern)

Uses the **GVE Hub pattern**: `internal/hub/` wraps PocketBase's `core.App` via `goutils/pocketbase`, handlers are Hub methods, business logic is extracted to `internal/service/`.

- `cmd/server/main.go` — entry point, creates PocketBase instance + Hub
- `internal/hub/hub.go` — Hub struct wrapping `gopb.AppServer`, OnServe hook
- `internal/hub/routes.go` — custom API route registration on PocketBase router
- `internal/hub/file_handlers.go` — file CRUD HTTP handlers (delegate to service)
- `internal/hub/search_handlers.go` — search HTTP handler
- `internal/hub/auth_handlers.go` — auth HTTP handlers (current user, setup status, password change)
- `internal/hub/docs_handlers.go` — public docs HTTP handlers (config, page rendering)
- `internal/hub/server_production.go` — production: embedded SPA serving
- `internal/hub/server_development.go` — development: reverse proxy to Vite
- `internal/service/file_service.go` — file tree, CRUD business logic
- `internal/service/docs_service.go` — docs rendering and config logic
- `internal/migrations/initial.go` — initial PocketBase settings and auth config
- `internal/api/` — generated Go types from Thrift IDL contracts
- `site/embed.go` — `go:embed` directive embedding `site/dist/`
- `api/` — Thrift IDL contracts per service (auth, docs, file, search)
- `gve.lock` — GVE asset version lock file

**Key dependencies**: `github.com/pocketbase/pocketbase` — provides auth, SQLite DB, admin UI, routing. `github.com/castle-x/goutils/pocketbase` — Hub bootstrapping library.

### React Frontend (`site/`)

Follows **Feature-Sliced Design (FSD)** architecture:

- `src/app/` — initialization: routes (lazy-loaded), providers (React Query, theme), global styles
- `src/views/` — page components (`auth/`, `editor/`, `docs/`)
- `src/shared/` — infrastructure with no business logic:
  - `lib/api-client.ts` — HTTP client (Ky) with PocketBase token injection
  - `lib/pb-client.ts` — PocketBase JS SDK client (`new PocketBase("/")`)
  - `hooks/useAuth.ts` — Zustand-based auth store + hook
  - `hooks/use-theme.ts` — theme hook
  - `docs/` — docs page components (sidebar, topbar, channel bar, shell)
  - `types/` — shared TypeScript types
  - `ui/` — Shadcn components (keep unmodified; customize via CSS variables only)
- `src/api/` — generated TypeScript API clients from Thrift IDL

### State Management Hierarchy

- Server state → **TanStack Query** (caching, auto-refresh)
- Global client state → **Zustand** (theme, auth)
- Local state → `useState`/`useReducer` (forms, dialogs)
- Do not use React Context for frequently changing data

### Request Flow

```
Browser → PocketBase Router
  ├── /api/collections/* → PocketBase built-in (auth, CRUD)
  ├── /api/{service}/v1/{Method} → Custom RPC handlers (POST, with apis.RequireAuth())
  ├── /api/docs/v1/* → Public docs handlers (no auth required)
  ├── /_/ → PocketBase Admin UI
  └── /* → Embedded SPA (production) or Vite proxy (development)
```

## API Endpoints

All custom endpoints use **RPC-style POST** with versioned paths:

### File service (auth required)

| Endpoint | Description |
|----------|-------------|
| `POST /api/files/v1/GetTree` | List file tree |
| `POST /api/files/v1/GetFile` | Read file |
| `POST /api/files/v1/SaveFile` | Save file |
| `POST /api/files/v1/CreateFile` | Create file/directory |
| `POST /api/files/v1/DeleteFile` | Delete file/directory |
| `POST /api/files/v1/RenameFile` | Rename file/directory |

### Search service (auth required)

| Endpoint | Description |
|----------|-------------|
| `POST /api/search/v1/Search` | Full-text search |

### Auth service (auth required)

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/v1/GetCurrentUser` | Current user info |
| `POST /api/auth/v1/GetSetupStatus` | Check setup status |
| `POST /api/auth/v1/ChangePassword` | Change password |
| `POST /api/auth/v1/GetAppInfo` | App info |

### Docs service (public, no auth)

| Endpoint | Description |
|----------|-------------|
| `POST /api/docs/v1/GetConfig` | Get docs site config |
| `POST /api/docs/v1/GetPage` | Get rendered docs page |

### PocketBase built-in

| Endpoint | Description |
|----------|-------------|
| `POST /api/collections/users/auth-with-password` | Login |
| `POST /api/collections/users/auth-refresh` | Refresh token |
| `GET /_/` | Admin UI |

## Code Style

### Go

- `gofmt` formatting
- GVE Hub pattern: `internal/hub/` contains Hub struct + HTTP handlers, `internal/service/` contains business logic
- PocketBase + goutils/pocketbase are the external dependencies
- Use `apis.RequireAuth()` for protected routes, access `e.Auth` for current user
- Build tags: `//go:build development` / `//go:build !development` for dev/prod separation

### TypeScript/React

- **Strict mode** with all strict options enabled; no `any` (use `unknown` + type guards)
- **Path aliases**: use `@/` (maps to `src/`), `@/shared/`, `@/views/`, `@/app/`; max 2 levels of `../`
- **Biome**: 2-space indent, 100 char line width, double quotes, always semicolons, trailing commas on all
- **Components**: PascalCase filenames, regular functions (not `React.FC`), extract props as `interface Props`
- **Shadcn UI components** in `shared/ui/` — do not modify directly; theme via CSS variables in `src/app/styles/themes.css`

## Runtime Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_DIR` | `~/.nanomind` | PocketBase data directory (contains DB, logs, memos) |
| `MIND_PATH` | `{DATA_DIR}/mind` | Markdown file storage directory |
| `ENV` | (empty) | Set to `dev` for development mode + auto-migrations |

Run with: `./nanomind serve --http=localhost:8090`

PocketBase Admin UI available at `http://localhost:8090/_/`

## Key Constraints

- UI text is in **Chinese** (登录, 邮箱, etc.)
- Only `.md` files appear in the file tree
- Files/directories starting with `.` and `node_modules` are excluded
- Test files go in the `test/` directory
- Design docs go in `docs/` (max 1 doc per day, append with headings if multiple)
