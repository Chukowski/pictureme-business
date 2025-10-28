# Multi-stage build for AI Photobooth (Frontend + Backend)
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
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

# Create a simple startup script
RUN cat > /app/start.sh << 'EOF'
#!/bin/sh
echo "🚀 Starting AI Photobooth..."
echo "📦 Frontend will be served on port 8080"
echo "🔌 Backend API will run on port 3001"

# Start backend in background
node server/index.js &

# Install and start a simple static server for frontend
npm install -g serve
serve -s dist -l 8080

EOF

RUN chmod +x /app/start.sh

# Expose ports
EXPOSE 3001 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/ && curl -f http://localhost:3001/health || exit 1

# Start both services
CMD ["/app/start.sh"]
