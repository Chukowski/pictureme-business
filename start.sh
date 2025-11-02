#!/bin/sh

echo "🚀 Starting AI Photobooth..."
echo "📦 Frontend will be served on port 8080"
echo "🔌 Backend API will run on port 3001"
echo ""

# Print environment info (without exposing secrets)
echo "🔧 Environment configuration:"
echo "  - FAL_MODEL: ${VITE_FAL_MODEL:-not set}"
echo "  - BASE_URL: ${VITE_BASE_URL:-not set}"
echo "  - API_URL: ${VITE_API_URL:-not set}"
echo ""

# Start backend in background with environment variables
echo "🚀 Starting backend server..."
node server/index.js &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
echo ""

# Install and start a simple static server for frontend
echo "📦 Installing static file server..."
npm install -g serve --silent
echo "✅ Server installed"
echo ""

echo "🌐 Starting frontend server on port 8080..."
serve -s dist -l 8080
