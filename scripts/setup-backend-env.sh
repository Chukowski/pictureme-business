#!/bin/bash

# Copy .env to backend directory for Python backend
echo "📋 Setting up backend .env file..."

if [ -f .env ]; then
    cp .env backend/.env
    echo "✅ .env copied to backend/"
elif [ -f .env.storage ]; then
    cp .env.storage backend/.env
    echo "✅ .env.storage copied to backend/.env"
else
    echo "❌ No .env or .env.storage file found!"
    echo "Create a .env file with your database credentials"
    exit 1
fi

# Test database connection
echo ""
echo "🧪 Testing database connection..."
cd backend && python3 test_db.py

