#!/bin/bash

# Photo Booth AI - Demo Setup Script
# This script helps you set up the demo quickly

set -e

echo "🎉 Photo Booth AI - Demo Setup"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: You need to add your fal.ai API key!"
    echo ""
    echo "1. Get your API key from: https://fal.ai/dashboard/keys"
    echo "2. Edit .env file and replace 'your_fal_api_key_here' with your actual key"
    echo ""
    read -p "Press Enter to open .env file in your default editor..."
    
    # Try to open .env in editor
    if command -v code &> /dev/null; then
        code .env
    elif command -v nano &> /dev/null; then
        nano .env
    elif command -v vim &> /dev/null; then
        vim .env
    else
        echo "Please edit .env manually"
    fi
else
    echo "✅ .env file already exists"
    
    # Check if FAL_KEY is set
    if grep -q "VITE_FAL_KEY=your_fal_api_key_here" .env; then
        echo ""
        echo "⚠️  Warning: Your FAL_KEY is not configured!"
        echo "   Please edit .env and add your fal.ai API key"
        echo ""
    else
        echo "✅ FAL_KEY appears to be configured"
    fi
fi

echo ""
echo "🎬 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Make sure your .env file has a valid VITE_FAL_KEY"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:8080"
echo ""
echo "📚 Documentation:"
echo "   - DEMO_SETUP.md     - Complete setup guide"
echo "   - CAMERA_SETUP.md   - Camera troubleshooting"
echo "   - IMPLEMENTATION_PLAN.md - Backend setup (future)"
echo ""
echo "🚀 Ready to create amazing AI photos!"

