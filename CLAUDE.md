# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NanoMind is a self-hosted Markdown note-taking app built as a **single-binary full-stack application**. It uses **PocketBase as a Go library** for authentication, database, and admin UI, with an **embedded React SPA** frontend via `go:embed`. The frontend build output (`site/dist/`) is embedded into the Go binary, producing a single deployable binary.

## Commands

### Development

```bash
make install       # pnpm install for frontend
make dev           # Start backend (:8090) + frontend (:5173) with HMR
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

Uses the **GVE Hub pattern**: `internal/hub/` wraps PocketBase's `core.App` via `go-pocketbase`, handlers are Hub methods, business logic is extracted to `internal/service/`.

- `cmd/server/main.go` — entry point, creates PocketBase instance + Hub
- `internal/hub/hub.go` — Hub struct wrapping `gopb.AppServer`, OnServe hook
- `internal/hub/routes.go` — custom API route registration on PocketBase router
- `internal/hub/file_handlers.go` — file CRUD HTTP handlers (delegate to service)
- `internal/hub/search_handlers.go` — search HTTP handler
- `internal/hub/server_production.go` — production: embedded SPA serving
- `internal/hub/server_development.go` — development: reverse proxy to Vite
- `internal/service/file_service.go` — pure business logic (file tree, CRUD, search)
- `internal/migrations/initial.go` — initial PocketBase settings and auth config
- `site/embed.go` — `go:embed` directive embedding `site/dist/`
- `gve.lock` — GVE asset version lock file
- `api/` — API contract documentation (registry.json + per-resource API.md)

**Key dependency**: `github.com/pocketbase/pocketbase` — provides auth, SQLite DB, admin UI, routing. `github.com/castle-x/go-pocketbase` — Hub bootstrapping library.

### React Frontend (`site/`)

Follows **Feature-Sliced Design (FSD)** architecture:

- `src/app/` — initialization: routes (lazy-loaded), providers (React Query, theme), global styles
- `src/views/` — page components (`auth/LoginView.tsx`, `editor/EditorView.tsx` and its sub-components)
- `src/widgets/` — reusable business components (editor, file-tree, search, toolbar, toc)
- `src/entities/` — domain entities (planned)
- `src/shared/` — infrastructure with no business logic:
  - `api/client.ts` — HTTP client (Ky) with PocketBase token injection
  - `hooks/` — custom hooks (e.g., `useAuth`)
  - `lib/pb-client.ts` — PocketBase JS SDK client (`new PocketBase("/")`)
  - `store/app-store.ts` — Zustand global store
  - `types/` — shared TypeScript types
  - `ui/` — Shadcn components (keep unmodified; customize via CSS variables only)

### State Management Hierarchy

- Server state → **TanStack Query** (caching, auto-refresh)
- Global client state → **Zustand** (theme, user)
- Local state → `useState`/`useReducer` (forms, dialogs)
- Do not use React Context for frequently changing data

### Request Flow

```
Browser → PocketBase Router
  ├── /api/collections/* → PocketBase built-in (auth, CRUD)
  ├── /api/files|search|auth → Custom handlers (with apis.RequireAuth())
  ├── /_/ → PocketBase Admin UI
  └── /* → Embedded SPA (production) or Vite proxy (development)
```

## Code Style

### Go

- `gofmt` formatting
- GVE Hub pattern: `internal/hub/` contains Hub struct + HTTP handlers, `internal/service/` contains business logic
- PocketBase + go-pocketbase are the external dependencies
- Use `apis.RequireAuth()` for protected routes, access `e.Auth` for current user
- Build tags: `//go:build development` / `//go:build !development` for dev/prod separation

### TypeScript/React

- **Strict mode** with all strict options enabled; no `any` (use `unknown` + type guards)
- **Path aliases**: use `@/` (maps to `src/`), `@/shared/`, `@/views/`, `@/widgets/`, `@/entities/`, `@/app/`; max 2 levels of `../`
- **Biome**: 2-space indent, 100 char line width, double quotes, always semicolons, trailing commas on all
- **Components**: PascalCase filenames, regular functions (not `React.FC`), extract props as `interface Props`
- **Shadcn UI components** in `shared/ui/` — do not modify directly; theme via CSS variables in `src/app/styles/themes.css`

## Runtime Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_DIR` | `nanomind_data` | PocketBase data directory (contains DB, logs, memos) |
| `MIND_PATH` | `{DATA_DIR}/mind` | Markdown file storage directory |
| `ENV` | (empty) | Set to `dev` for development mode + auto-migrations |

Run with: `./nanomind serve --http=localhost:8090`

PocketBase Admin UI available at `http://localhost:8090/_/`

## API Endpoints

### Custom (file operations)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | List file tree |
| POST | `/api/files` | Create file/directory |
| GET | `/api/files/{path}` | Read file |
| PUT | `/api/files/{path}` | Save file |
| PATCH | `/api/files/{path}` | Rename file/directory |
| DELETE | `/api/files/{path}` | Delete file/directory |
| GET | `/api/search?q={query}` | Full-text search |
| GET | `/api/auth/me` | Current user info |

### PocketBase built-in

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/collections/users/auth-with-password` | Login |
| POST | `/api/collections/users/auth-refresh` | Refresh token |
| GET | `/_/` | Admin UI |

## Key Constraints

- UI text is in **Chinese** (登录, 邮箱, etc.)
- Only `.md` files appear in the file tree
- Files/directories starting with `.` and `node_modules` are excluded
- Test files go in the `test/` directory
- Design docs go in `docs/` (max 1 doc per day, append with headings if multiple)
