# ============================================
# Stage 1: Build React Frontend (Vite)
# ============================================
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ============================================
# Stage 2: Build Go Backend
# ============================================
FROM golang:1.22-alpine AS backend-build
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM alpine:3.19

RUN apk add --no-cache tzdata ca-certificates

ENV TZ=Asia/Jakarta
RUN ln -sf /usr/share/zoneinfo/$TZ /etc/localtime

WORKDIR /app

# Copy Go binary from backend build
COPY --from=backend-build /app/server ./server

# Copy React build output to serve as static files
COPY --from=frontend-build /app/dist ./static

EXPOSE 8080

CMD ["./server"]
