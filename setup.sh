#!/bin/bash

# Extractly Setup Script
echo "Setting up Extractly - Natural Language Web Data Extraction"
echo "============================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo " Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo " Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo " Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo " Prerequisites check passed"

# Start PostgreSQL database
echo "Starting PostgreSQL database..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Check if database is healthy
if docker-compose ps | grep -q "healthy"; then
    echo " Database is ready"
else
    echo " Database might still be starting up. Continuing..."
fi

# Setup backend
echo "Setting up backend..."
cd backend

# Install dependencies
echo "Installing backend dependencies..."
npm install

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    echo " Please edit backend/.env and add your GEMINI_API_KEY"
fi

# Run Prisma migrations
echo " Setting up database schema..."
npx prisma migrate dev --name init

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Build TypeScript
echo "Building TypeScript..."
npm run build

cd ..

echo ""
echo "Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env and add your GEMINI_API_KEY"
echo "2. Start the backend: cd backend && npm run dev"
echo "3. Load the Chrome extension from the /extension folder"
echo "4. Test the extension on any webpage"
echo ""
echo "Useful commands:"
echo "- Start backend: cd backend && npm run dev"
echo "- View database: cd backend && npm run db:studio"
echo "- Stop database: docker-compose down"
echo ""
echo "See README.md for detailed instructions"
