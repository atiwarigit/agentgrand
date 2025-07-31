#!/bin/bash

echo "🚀 Deploying Grant Writing Platform for Testing"
echo "================================================"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one from .env.example"
    exit 1
fi

# Check if OpenAI API key is set
if grep -q "your_openai_api_key_here" .env; then
    echo "⚠️  WARNING: OpenAI API key not set in .env file"
    echo "   The AI features will not work without a valid OpenAI API key"
    echo "   Please update OPENAI_API_KEY in .env file"
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Step 1: Starting database and Redis services..."
docker-compose -f docker-compose.test.yml up -d

echo "⏳ Step 2: Waiting for services to be ready..."
sleep 10

echo "🗄️  Step 3: Checking database connection..."
docker-compose -f docker-compose.test.yml exec postgres pg_isready -U postgres || {
    echo "❌ Database is not ready. Please check logs:"
    echo "   docker-compose -f docker-compose.test.yml logs postgres"
    exit 1
}

echo "✅ Database services are running!"
echo ""
echo "🌐 Next Steps:"
echo "1. Install dependencies in web package: cd packages/web && npm install"
echo "2. Install dependencies in AI package: cd packages/ai && pip install -r requirements.txt"
echo "3. Start the web application: cd packages/web && npm run dev"
echo "4. Start the AI service: cd packages/ai && uvicorn main:app --reload --port 8001"
echo ""
echo "📍 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:8000"
echo "   AI Service: http://localhost:8001"
echo "   Database: localhost:5432"
echo ""
echo "📋 To stop services: docker-compose -f docker-compose.test.yml down"
echo "📋 To view logs: docker-compose -f docker-compose.test.yml logs -f"