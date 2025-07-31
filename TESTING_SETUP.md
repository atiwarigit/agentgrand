# Grant Writing Platform - Testing Setup

## 🚀 Quick Start for Testing

Follow these steps to deploy and test the Grant Writing Platform locally.

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ installed
- Python 3.11+ installed
- OpenAI API key (required for AI features)

### Step 1: Environment Configuration

1. **Update the OpenAI API Key** (REQUIRED):
   ```bash
   # Edit the .env file
   nano .env
   
   # Replace this line:
   OPENAI_API_KEY=your_openai_api_key_here
   
   # With your actual OpenAI API key:
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

2. **Optional: Configure AWS services** (for full functionality):
   - Set up Cognito User Pool for authentication
   - Create S3 bucket for file storage
   - Update AWS credentials in `.env`

### Step 2: Start Database Services

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.test.yml up -d

# Check if services are running
docker-compose -f docker-compose.test.yml ps

# View logs if needed
docker-compose -f docker-compose.test.yml logs -f
```

### Step 3: Install Dependencies

**Web Package (React + Node.js API):**
```bash
cd packages/web
npm install
```

**AI Package (FastAPI):**
```bash
cd packages/ai
pip install -r requirements.txt
```

### Step 4: Start Application Services

**Terminal 1 - Web Application:**
```bash
cd packages/web
npm run dev
```

**Terminal 2 - AI Service:**
```bash
cd packages/ai
uvicorn main:app --reload --port 8001
```

### Step 5: Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **AI Service**: http://localhost:8001
- **Database**: localhost:5432

## 🧪 Testing Features

### 1. User Authentication (Limited)
Since AWS Cognito is not fully configured for testing:
- The login page will be visible
- Authentication will fail without proper Cognito setup
- You can test the UI components and flows

### 2. Document Upload & Processing
- Upload PDF, CSV, or XLSX files (max 20MB)
- Watch the 6-stage progress tracking
- Test file validation and error handling

### 3. RAG & AI Features (Requires OpenAI API Key)
- Document analysis and text extraction
- AI-powered draft generation
- Section regeneration with custom prompts
- Semantic search functionality

### 4. Project Management
- Create and manage projects
- Test project collaboration features
- Quota and limit enforcement

### 5. Compliance Checking
- Automated requirement validation
- User override functionality
- Deadline and attachment tracking

### 6. Document Export
- DOCX generation with proper formatting
- PDF export with professional layout
- Download functionality

## 🔧 Test Configuration

### Database Access
```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.test.yml exec postgres psql -U postgres -d grant_platform

# View tables
\dt

# Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### API Testing
```bash
# Health check
curl http://localhost:8000/health

# AI service health check
curl http://localhost:8001/health

# Test file upload (requires authentication)
curl -X POST http://localhost:8000/api/process \
  -H "Authorization: Bearer your-token" \
  -F "files=@test.pdf" \
  -F "projectId=test-project-id"
```

## 🐛 Troubleshooting

### Common Issues

1. **Docker Services Not Starting:**
   ```bash
   docker-compose -f docker-compose.test.yml down
   docker-compose -f docker-compose.test.yml up -d --force-recreate
   ```

2. **Database Connection Issues:**
   ```bash
   # Check if PostgreSQL is ready
   docker-compose -f docker-compose.test.yml exec postgres pg_isready -U postgres
   
   # View database logs
   docker-compose -f docker-compose.test.yml logs postgres
   ```

3. **Node.js Dependency Issues:**
   ```bash
   cd packages/web
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Python Dependency Issues:**
   ```bash
   cd packages/ai
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **OpenAI API Issues:**
   - Verify your API key is valid
   - Check your OpenAI account has sufficient credits
   - Monitor API usage in OpenAI dashboard

### Health Checks

**Frontend Health:**
- Visit http://localhost:3000
- Should see the login page
- Console should show minimal errors

**API Health:**
- Visit http://localhost:8000/health
- Should return `{"status": "healthy"}`

**AI Service Health:**
- Visit http://localhost:8001/health
- Should return service status information

**Database Health:**
```bash
docker-compose -f docker-compose.test.yml exec postgres pg_isready -U postgres
```

## 📊 Testing Scenarios

### Basic Workflow Test
1. Start all services
2. Access frontend at http://localhost:3000
3. Test file upload interface
4. Monitor processing pipeline
5. Verify error handling

### Integration Test
1. Upload a test document
2. Monitor AI processing stages
3. Check generated content
4. Test export functionality
5. Verify compliance checking

### Performance Test
1. Upload multiple files simultaneously
2. Test quota enforcement
3. Monitor resource usage
4. Check concurrent job limits

## 🔧 Development Mode

For active development:

```bash
# Watch mode for web frontend
cd packages/web
npm run dev:frontend

# Watch mode for API
cd packages/web
npm run dev:api

# Watch mode for AI service
cd packages/ai
uvicorn main:app --reload --port 8001
```

## 📝 Test Data

Create test files in different formats:
- **PDF**: Grant RFP documents
- **CSV**: Organizational data, budgets
- **XLSX**: Financial spreadsheets, KPI data

## 🛑 Stopping Services

```bash
# Stop application services (Ctrl+C in terminals)

# Stop Docker services
docker-compose -f docker-compose.test.yml down

# Clean up volumes (if needed)
docker-compose -f docker-compose.test.yml down -v
```

---

## 🆘 Need Help?

1. Check the logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure Docker has sufficient resources allocated
4. Test individual components separately to isolate issues

The platform is designed to be resilient, but some features require proper configuration of external services (OpenAI, AWS) to function fully.