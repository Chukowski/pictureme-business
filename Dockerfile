FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the app (without env vars, we'll inject them at runtime)
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx-runtime.conf /etc/nginx/conf.d/default.conf

# Create script to inject runtime env vars
# NOTE: Sensitive keys like FAL_KEY should NOT be exposed in frontend config
# They should be fetched from backend via /api/config endpoint
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'set -e' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Generate runtime config (public values only)' >> /docker-entrypoint.sh && \
    echo 'cat > /usr/share/nginx/html/config.js << EOF' >> /docker-entrypoint.sh && \
    echo 'window.ENV = {' >> /docker-entrypoint.sh && \
    echo '  VITE_API_URL: "${VITE_API_URL}",' >> /docker-entrypoint.sh && \
    echo '  VITE_AUTH_URL: "${VITE_AUTH_URL}",' >> /docker-entrypoint.sh && \
    echo '  VITE_BASE_URL: "${VITE_BASE_URL}",' >> /docker-entrypoint.sh && \
    echo '  VITE_CREATOR_APP_URL: "${VITE_CREATOR_APP_URL}",' >> /docker-entrypoint.sh && \
    echo '  VITE_MINIO_ENDPOINT: "${VITE_MINIO_ENDPOINT}",' >> /docker-entrypoint.sh && \
    echo '  VITE_MINIO_BUCKET: "${VITE_MINIO_BUCKET}",' >> /docker-entrypoint.sh && \
    echo '  VITE_MINIO_SERVER_URL: "${VITE_MINIO_SERVER_URL}",' >> /docker-entrypoint.sh && \
    echo '  VITE_STRIPE_PUBLISHABLE_KEY: "${VITE_STRIPE_PUBLISHABLE_KEY}"' >> /docker-entrypoint.sh && \
    echo '};' >> /docker-entrypoint.sh && \
    echo 'EOF' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Start nginx' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
