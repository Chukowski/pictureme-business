#!/bin/bash

echo "🐳 Building AI Photobooth Docker Image..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Creating .env from .env.storage..."
    cp .env.storage .env
    echo "✅ .env created. Please edit it with your credentials."
    echo ""
fi

# Build the image
echo "📦 Building Docker image..."
docker build -t ai-photobooth:latest .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "🚀 To run the container:"
    echo "   docker-compose up -d"
    echo ""
    echo "📊 To view logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "🌐 Access the app at:"
    echo "   Frontend: http://localhost:8080"
    echo "   Backend:  http://localhost:3001/health"
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi

