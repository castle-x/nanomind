.PHONY: help build build-web build-backend dev dev-split dev-web dev-backend dev-backend-bg \
        dev-backend-stop dev-backend-status dev-backend-logs run-direct clean run install test \
        build-linux build-linux-arm64 build-macos build-macos-arm64 build-windows build-all

.DEFAULT_GOAL := help

GREEN  := \033[0;32m
YELLOW := \033[1;33m
BLUE   := \033[0;34m
NC     := \033[0m

BINARY_NAME := nanomind
CMD_PATH    := ./cmd/server
OUTPUT_DIR  := bin
LDFLAGS     := -s -w
BACKEND_HTTP := localhost:8090
FRONTEND_URL := http://localhost:5173
BACKEND_URL  := http://$(BACKEND_HTTP)

help: ## Show help
	@printf "$(BLUE)$(BINARY_NAME) - Available Commands:$(NC)\n"
	@printf "\n$(YELLOW)Basic Commands:$(NC)\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -v "build-linux\|build-macos\|build-windows\|build-all" | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@printf "\n$(YELLOW)Cross-Platform Build:$(NC)\n"
	@grep -E '^build-(linux|macos|windows|all).*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

install: ## Install frontend dependencies
	@printf "$(BLUE)[Installing Frontend Dependencies]$(NC)\n"
	@cd site && pnpm install
	@printf "$(GREEN)[Success] Dependencies installed$(NC)\n"

build-web: ## Build frontend
	@printf "$(BLUE)[Building Frontend]$(NC)\n"
	@cd site && pnpm run build
	@printf "$(GREEN)[Success] Frontend built to site/dist/$(NC)\n"

build-backend: ## Build backend (current platform)
	@printf "$(BLUE)[Building Backend]$(NC)\n"
	@mkdir -p $(OUTPUT_DIR)
	@CGO_ENABLED=0 go build -ldflags="$(LDFLAGS)" -o $(OUTPUT_DIR)/$(BINARY_NAME) $(CMD_PATH)
	@printf "$(GREEN)[Success] $(OUTPUT_DIR)/$(BINARY_NAME)$(NC)\n"

build: build-web build-backend ## Build frontend and backend

dev-web: ## Start frontend only with HMR (proxy API to backend)
	@printf "$(BLUE)[Starting Frontend Dev Server]$(NC)\n"
	@printf "  Frontend: $(GREEN)$(FRONTEND_URL)$(NC)\n"
	@printf "  Backend:  $(GREEN)$(BACKEND_URL)$(NC) (ensure dev-backend or dev-backend-bg is running)\n"
	@cd site && VITE_BACKEND_TARGET=$(BACKEND_URL) pnpm run dev

dev-backend: ## Start backend in dev mode (http://localhost:8090)
	@printf "$(BLUE)[Starting Backend Dev Server]$(NC)\n"
	@ENV=dev go run -tags development $(CMD_PATH) serve --http=$(BACKEND_HTTP)

dev-backend-bg: ## Start backend in background for split frontend iteration
	@./scripts/dev-backend.sh start

dev-backend-stop: ## Stop background backend dev server
	@./scripts/dev-backend.sh stop

dev-backend-status: ## Show background backend dev server status
	@./scripts/dev-backend.sh status

dev-backend-logs: ## Tail background backend dev server logs
	@./scripts/dev-backend.sh logs

dev-split: ## Start backend in background + frontend HMR (best for UI iteration)
	@printf "$(BLUE)============================================$(NC)\n"
	@printf "$(BLUE)  NanoMind Split Development Mode$(NC)\n"
	@printf "$(BLUE)============================================$(NC)\n"
	@printf "  Backend:  $(GREEN)$(BACKEND_URL)$(NC) (background)\n"
	@printf "  Frontend: $(GREEN)$(FRONTEND_URL)$(NC) (HMR)\n"
	@printf "  Admin UI: $(GREEN)$(BACKEND_URL)/_/$(NC)\n"
	@printf "  Logs:     $(GREEN).dev/backend.log$(NC)\n"
	@printf "$(BLUE)============================================$(NC)\n\n"
	@./scripts/dev-backend.sh start
	@cd site && VITE_BACKEND_TARGET=$(BACKEND_URL) pnpm run dev

dev: ## Start both backend and frontend (recommended)
	@printf "$(BLUE)============================================$(NC)\n"
	@printf "$(BLUE)  NanoMind Development Server$(NC)\n"
	@printf "$(BLUE)============================================$(NC)\n"
	@printf "  Backend:  $(GREEN)$(BACKEND_URL)$(NC) (PocketBase)\n"
	@printf "  Frontend: $(GREEN)$(FRONTEND_URL)$(NC) (Vite)\n"
	@printf "  Admin UI: $(GREEN)$(BACKEND_URL)/_/$(NC)\n"
	@printf "$(BLUE)============================================$(NC)\n\n"
	@trap 'kill $$(jobs -p) 2>/dev/null; exit 0' INT TERM; \
	ENV=dev go run -tags development $(CMD_PATH) serve --http=$(BACKEND_HTTP) & \
	sleep 2 && \
	cd site && VITE_BACKEND_TARGET=$(BACKEND_URL) pnpm run dev

run: build ## Build and run
	@printf "$(BLUE)[Running NanoMind]$(NC)\n"
	@$(OUTPUT_DIR)/$(BINARY_NAME) serve --http=localhost:8090

run-direct: ## Run directly without rebuilding frontend (uses existing site/dist)
	@printf "$(BLUE)[Running NanoMind Without Rebuild]$(NC)\n"
	@if [ ! -d site/dist ]; then \
		printf "$(YELLOW)[Missing site/dist]$(NC) Please run 'make build-web' once first.\n"; \
		exit 1; \
	fi
	@go run $(CMD_PATH) serve --http=localhost:8090

clean: ## Clean build artifacts
	@printf "$(BLUE)[Cleaning Build Artifacts]$(NC)\n"
	@rm -rf site/dist $(OUTPUT_DIR)/$(BINARY_NAME) $(OUTPUT_DIR)/$(BINARY_NAME)-* $(OUTPUT_DIR)/*.exe
	@printf "$(GREEN)[Success] Cleaned$(NC)\n"

test: ## Run all tests
	@printf "$(BLUE)[Running Tests]$(NC)\n"
	@go test ./...
	@printf "$(GREEN)[Success] All tests passed$(NC)\n"

# ============================================================================
# Cross-Platform Build Targets
# ============================================================================

build-linux: build-web ## Build for Linux amd64
	@mkdir -p $(OUTPUT_DIR)
	@CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o $(OUTPUT_DIR)/$(BINARY_NAME)-linux-amd64 $(CMD_PATH)
	@printf "$(GREEN)[Success] $(OUTPUT_DIR)/$(BINARY_NAME)-linux-amd64$(NC)\n"

build-linux-arm64: build-web ## Build for Linux arm64
	@mkdir -p $(OUTPUT_DIR)
	@CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="$(LDFLAGS)" -o $(OUTPUT_DIR)/$(BINARY_NAME)-linux-arm64 $(CMD_PATH)
	@printf "$(GREEN)[Success] $(OUTPUT_DIR)/$(BINARY_NAME)-linux-arm64$(NC)\n"

build-macos: build-web ## Build for macOS amd64 (Intel)
	@mkdir -p $(OUTPUT_DIR)
	@CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o $(OUTPUT_DIR)/$(BINARY_NAME)-darwin-amd64 $(CMD_PATH)
	@printf "$(GREEN)[Success] $(OUTPUT_DIR)/$(BINARY_NAME)-darwin-amd64$(NC)\n"

build-macos-arm64: build-web ## Build for macOS arm64 (Apple Silicon)
	@mkdir -p $(OUTPUT_DIR)
	@CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -ldflags="$(LDFLAGS)" -o $(OUTPUT_DIR)/$(BINARY_NAME)-darwin-arm64 $(CMD_PATH)
	@printf "$(GREEN)[Success] $(OUTPUT_DIR)/$(BINARY_NAME)-darwin-arm64$(NC)\n"

build-windows: build-web ## Build for Windows amd64
	@mkdir -p $(OUTPUT_DIR)
	@CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o $(OUTPUT_DIR)/$(BINARY_NAME)-windows-amd64.exe $(CMD_PATH)
	@printf "$(GREEN)[Success] $(OUTPUT_DIR)/$(BINARY_NAME)-windows-amd64.exe$(NC)\n"

build-all: build-web ## Build for all platforms
	@printf "$(BLUE)[Building All Platforms]$(NC)\n"
	@mkdir -p $(OUTPUT_DIR)
	@CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o $(OUTPUT_DIR)/$(BINARY_NAME)-linux-amd64 $(CMD_PATH)
	@CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="$(LDFLAGS)" -o $(OUTPUT_DIR)/$(BINARY_NAME)-linux-arm64 $(CMD_PATH)
	@CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o $(OUTPUT_DIR)/$(BINARY_NAME)-darwin-amd64 $(CMD_PATH)
	@CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -ldflags="$(LDFLAGS)" -o $(OUTPUT_DIR)/$(BINARY_NAME)-darwin-arm64 $(CMD_PATH)
	@CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o $(OUTPUT_DIR)/$(BINARY_NAME)-windows-amd64.exe $(CMD_PATH)
	@printf "$(GREEN)[Success] All platforms built$(NC)\n"
	@ls -lh $(OUTPUT_DIR)/$(BINARY_NAME)-* 2>/dev/null | awk '{printf "  %s  %s\n", $$5, $$9}'
