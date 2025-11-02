# Multi-stage build for AI Photobooth (Frontend + Backend)
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Accept build arguments for Vite environment variables
ARG VITE_FAL_KEY
ARG VITE_FAL_MODEL
ARG VITE_BASE_URL
ARG VITE_API_URL

# Set as environment variables for Vite build
ENV VITE_FAL_KEY=$VITE_FAL_KEY
ENV VITE_FAL_MODEL=$VITE_FAL_MODEL
ENV VITE_BASE_URL=$VITE_BASE_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend (Vite will use VITE_* env vars)
RUN npm run build

# Production stage
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy backend server code
COPY server ./server

# Copy environment variables template
COPY .env.storage ./.env.example

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose ports
EXPOSE 3001 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/ && curl -f http://localhost:3001/health || exit 1

# Start both services
CMD ["/app/start.sh"]
