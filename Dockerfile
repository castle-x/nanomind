# ============================================
# NanoMind — Multi-stage build
# Single binary with embedded frontend + PocketBase
# ============================================

# Stage 1: Build frontend
FROM node:22-alpine AS frontend
WORKDIR /build/site
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY site/package.json site/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY site/ ./
RUN pnpm run build

# Stage 2: Build backend
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS backend
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /build/site/dist ./site/dist

RUN apk add --no-cache ca-certificates && update-ca-certificates

ARG TARGETOS TARGETARCH
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -ldflags="-s -w" -o /nanomind ./cmd/app

# Stage 3: Final image
FROM scratch
COPY --from=backend /nanomind /nanomind
COPY --from=backend /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

VOLUME ["/nanomind_data"]
EXPOSE 8090

ENTRYPOINT ["/nanomind"]
CMD ["serve", "--http=localhost:8090"]
