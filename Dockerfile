# Stage 1: Build Next.js static export
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# Build without NEXT_PUBLIC_API_URL so it defaults to "" (same-origin requests)
RUN npm run build


# Stage 2: Build Go binary
FROM golang:1.25-alpine AS backend-builder

WORKDIR /backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server .


# Stage 3: Runtime image
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy Go binary and migrations
COPY --from=backend-builder /backend/server ./server
COPY --from=backend-builder /backend/migrations ./migrations

# Copy Next.js static export
COPY --from=frontend-builder /frontend/out ./static

EXPOSE 8080

CMD ["./server"]
