# NanoMind — Agent Guidelines

> **NanoMind** is a self-hosted Markdown note-taking application — a single-binary full-stack app with PocketBase (Go library) backend and embedded React SPA frontend.

---

## Project Overview

NanoMind compiles into a **single binary** containing:
- PocketBase (auth, SQLite DB, admin UI, realtime)
- Custom file management API routes
- Embedded React SPA frontend (via `go:embed`)

### Key Characteristics

- **Single Binary Deployment**: `./nanomind serve --http=localhost:8090`
- **PocketBase as Go Library**: Not a separate process — integrated via `github.com/pocketbase/pocketbase`
- **File-based Storage**: Markdown files stored on local filesystem
- **Built-in Authentication**: PocketBase handles users, JWT tokens, admin UI
- **Theme System**: Three built-in themes (A, B, C) with dark mode support

---

## Technology Stack

### Backend

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | PocketBase | v0.36.5 |
| Language | Go | 1.25.6 |
| Database | SQLite | (built into PocketBase) |
| Auth | PocketBase built-in | JWT, OAuth2 |
| Router | PocketBase core.Router | - |

### Frontend

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | ^19.2.0 |
| Language | TypeScript | ~5.9.3 (strict) |
| Build Tool | Vite | ^7.2.0 |
| Styling | Tailwind CSS | ^4.1.0 |
| UI Components | Shadcn UI + Radix UI | - |
| State | Zustand | ^5.0.11 |
| Server State | TanStack Query | ^5.90.0 |
| Router | React Router | ^7.13.0 |
| Editor | Tiptap | ^3.15.0 |
| HTTP Client | Ky | ^1.14.0 |
| Auth SDK | PocketBase JS SDK | ^0.26.8 |
| Lint/Format | Biome | ^2.3.0 |
| Package Manager | pnpm | 9+ |

---

## Project Structure

```
nanomind/
├── cmd/server/
│   └── main.go                     # Entry point: PocketBase init + Hub startup
├── internal/
│   ├── hub/
│   │   ├── hub.go                  # AppServer + PocketBase Hub
│   │   ├── routes.go               # Route registration on PocketBase router
│   │   ├── file_handlers.go        # File CRUD handlers
│   │   ├── search_handlers.go      # Search handlers
│   │   ├── server_production.go    # Production: serve embedded SPA (//go:build !development)
│   │   └── server_development.go   # Development: reverse proxy to Vite (//go:build development)
│   ├── service/
│   │   └── file_service.go         # File operations business logic
│   └── migrations/
│       └── initial.go              # Initial PocketBase settings
├── api/                            # Thrift contracts only (managed by gve api)
│   └── nanomind/
│       └── auth/v1/
│           ├── auth.thrift
│           ├── auth.go
│           ├── client.go
│           └── client.ts
├── site/                           # Frontend SPA (Feature-Sliced Design)
│   ├── embed.go                    # go:embed directive for dist/
│   ├── biome.json                  # Biome linter/formatter config
│   ├── components.json             # Shadcn UI config
│   ├── vite.config.ts              # Vite configuration with path aliases
│   ├── tsconfig.app.json           # TypeScript strict config
│   └── src/
│       ├── app/                    # Initialization: routes, providers, global styles
│       │   ├── main.tsx            # Frontend entry (gve-aligned)
│       │   ├── providers.tsx
│       │   ├── routes.tsx
│       │   └── styles/
│       ├── views/                  # Feature pages (gve-style)
│       │   ├── auth/
│       │   │   └── index.tsx
│       │   └── editor/
│       │       ├── index.tsx
│       │       ├── components/
│       │       └── model/
│       └── shared/                 # Infrastructure (no business logic)
│           ├── hooks/              # Cross-feature hooks (auth/theme)
│           ├── lib/
│           │   ├── api-client.ts   # Ky HTTP client with PB token injection
│           │   ├── pb-client.ts    # PocketBase JS SDK client
│           │   └── utils.ts
│           ├── types/index.ts      # Shared TypeScript types
│           └── ui/                 # Shadcn UI components
├── test/                           # Test files (empty currently)
├── deploy/
│   └── nanomind.service            # Systemd service file
├── docs/                           # Documentation (Chinese)
│   ├── api/                        # API docs and docs registry
│   └── plans/                      # Iteration/restructure plans
├── go.mod                          # Go dependencies
├── go.sum                          # Go checksums
├── Makefile                        # Build commands
└── Dockerfile                      # Multi-stage build (frontend → backend → scratch)
```

---

## Build, Test, and Development Commands

### Setup

```bash
make install          # pnpm install for frontend dependencies
```

### Development

```bash
make dev              # Backend (:8090) + Frontend (:5173) with HMR (recommended)
make dev-backend      # Backend only (go run -tags development)
make dev-web          # Frontend only (Vite dev server on :5173)
```

**Development server ports:**
- Backend: http://localhost:8090 (PocketBase API)
- Frontend: http://localhost:5173 (Vite HMR)
- Admin UI: http://localhost:8090/_/

### Building

```bash
make build            # Frontend + backend for current platform → bin/nanomind
make build-web        # Frontend only → site/dist/
make build-backend    # Backend only (requires site/dist/ to exist)
make build-all        # All platforms (linux-amd64/arm64, darwin-amd64/arm64, windows-amd64)
```

**Important**: Build order matters — frontend must be built before backend so `go:embed` picks up `site/dist/`.

### Cross-Platform Builds

```bash
make build-linux        # Linux amd64
make build-linux-arm64  # Linux arm64
make build-macos        # macOS amd64 (Intel)
make build-macos-arm64  # macOS arm64 (Apple Silicon)
make build-windows      # Windows amd64
```

### Testing & Quality

```bash
make test                    # Run Go tests (go test ./...)
cd site && pnpm lint         # Biome lint check
cd site && pnpm lint:fix     # Biome auto-fix
cd site && pnpm typecheck    # TypeScript check (tsc --noEmit)
```

### Other Commands

```bash
make run              # Build and run the binary
make clean            # Clean build artifacts (site/dist/, bin/, /app)
make help             # Show available commands
```

---

## Code Style

### Go

- Format with `gofmt`
- Use `apis.RequireAuth()` for protected routes
- Access current user via `e.Auth` in handlers
- Build tags for dev/prod separation:
  - `//go:build development` — development mode
  - `//go:build !development` — production mode

### TypeScript/React

- **Strict mode**: All strict options enabled; no `any` (use `unknown` + type guards)
- **Path aliases**: Use `@/`, `@/shared/`, `@/views/`, `@/app/`
- Max 2 levels of `../` — use path aliases instead
- **Biome config** (2-space indent, 100 char line width, double quotes, semicolons, trailing commas):
  ```json
  {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "quoteStyle": "double",
    "semicolons": "always",
    "trailingCommas": "all"
  }
  ```
- **Components**: PascalCase filenames, regular functions (not `React.FC`), extract props as `interface Props`
- **Shadcn UI components** in `shared/ui/` — do not modify directly; theme via CSS variables

### State Management Hierarchy

1. **Server state** → TanStack Query (caching, auto-refresh)
2. **Global client state** → Zustand (theme, user, editor state)
3. **Local state** → `useState`/`useReducer` (forms, dialogs)
4. Do not use React Context for frequently changing data

---

## Runtime Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_DIR` | `~/.nanomind` | PocketBase data directory (DB, logs, config) |
| `MIND_PATH` | `{DATA_DIR}/mind` | Markdown file storage directory |
| `ENV` | (empty) | Set to `dev` for development mode + auto-migrations |

**Run:**
```bash
./nanomind serve --http=localhost:8090
```

**Admin UI:** http://localhost:8090/_/

**Default credentials:**
- Email: `admin@nanomind.local`
- Password: `nanomind123`

---

## API Endpoints

### Custom File Operations (require auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | List file tree |
| POST | `/api/files` | Create file/directory |
| GET | `/api/files/{path...}` | Read file content |
| PUT | `/api/files/{path...}` | Save file content |
| PATCH | `/api/files/{path...}` | Rename file/directory |
| DELETE | `/api/files/{path...}` | Delete file/directory |
| GET | `/api/search?q={query}` | Full-text search (min 2 chars) |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/info` | App info (mind path) |

### Setup Endpoints (no auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/setup/status` | Check if password change needed |
| POST | `/api/setup/change-password` | Change default admin password |

### PocketBase Built-in

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/collections/users/auth-with-password` | Login |
| POST | `/api/collections/users/auth-refresh` | Refresh token |
| GET | `/_/` | Admin UI |

---

## File Storage Rules

- Only `.md` files appear in the file tree
- Files/directories starting with `.` are excluded (hidden)
- `node_modules` directories are excluded
- Files are sorted alphabetically (directories first, then files)
- Path traversal is prevented — all paths must be within `MIND_PATH`

---

## Architecture Details

### Request Flow

```
Browser → PocketBase Router
  ├── /api/collections/* → PocketBase built-in (auth, CRUD)
  ├── /api/files|search|auth|setup → Custom handlers (with apis.RequireAuth() where applicable)
  ├── /_/ → PocketBase Admin UI
  └── /* → Embedded SPA (production) or Vite proxy (development)
```

### Frontend Architecture (Feature-Sliced Design)

```
src/
├── app/        # Application initialization layer
├── views/      # Feature pages (route-level, each feature has index.tsx)
└── shared/     # Infrastructure (no business logic)
    ├── hooks/  # Cross-feature hooks (auth/theme)
    ├── lib/    # Utilities and SDK clients
    ├── types/  # TypeScript types
    └── ui/     # UI component library (Shadcn)
```

---

## Security Considerations

- All custom API routes use `apis.RequireAuth()` except setup endpoints
- Path traversal protection in file handlers (`decodePath` function)
- PocketBase handles authentication securely (JWT tokens)
- Admin UI available at `/_/` for user management
- Default credentials should be changed on first setup

---

## Deployment

### Docker

Multi-stage Dockerfile builds frontend with Node.js, then backend with Go, producing a minimal scratch image:

```bash
docker build -t nanomind .
docker run -p 8090:8090 -v nanomind_data:/nanomind_data nanomind
```

### Systemd

Use provided `deploy/nanomind.service`:

```ini
[Unit]
Description=NanoMind — Self-hosted Markdown Note-taking
After=network.target

[Service]
Type=simple
User=nanomind
Group=nanomind
ExecStart=/usr/local/bin/nanomind serve --http=localhost:8090
WorkingDirectory=/home/nanomind
Environment=DATA_DIR=/home/nanomind/nanomind_data
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

---

## Notes for AI Agents

1. **Frontend Changes**: Always run `pnpm lint` and `pnpm typecheck` before committing
2. **Go Changes**: PocketBase is the primary framework; use its APIs (`apis.RequireAuth()`, `e.Auth`)
3. **Build Order**: Frontend must be built before backend for `go:embed` to work
4. **Chinese Language**: UI text is in Chinese (登录, 邮箱, etc.)
5. **Auth**: Never write custom auth middleware; use PocketBase's `apis.RequireAuth()`
6. **Static Files**: Use `apis.Static` in production, reverse proxy in dev
7. **Data Directory**: All runtime data in configurable `DATA_DIR` (default: `~/.nanomind`)
8. **Shadcn Components**: Do not modify directly; customize via CSS variables in `src/app/styles/`
9. **TypeScript**: Strict mode required; no `any` types allowed
10. **Frontend Entry**: Use `site/src/app/main.tsx` as the only canonical entry
11. **API Assets Split**: `api/` for thrift contracts, `docs/api/` for API docs (`API.md`)
