# 🚀 Deploy Grant Writing Platform - Step by Step

## Prerequisites Check

Before starting, ensure you have:
- [ ] Docker Desktop installed and running
- [ ] Node.js 18+ installed
- [ ] Python 3.11+ installed  
- [ ] OpenAI API key (get from https://platform.openai.com/api-keys)

## 🔧 Step 1: Configure Environment

**IMPORTANT**: You need to add your OpenAI API key for the AI features to work.

```bash
# Navigate to the project directory
cd "/Users/animeshtiwari/Agent Granti"

# Edit the .env file to add your OpenAI API key
# Replace: OPENAI_API_KEY=your_openai_api_key_here
# With: OPENAI_API_KEY=sk-your-actual-api-key-here
```

## 🗄️ Step 2: Start Database Services

```bash
# Start PostgreSQL and Redis with Docker
docker-compose -f docker-compose.test.yml up -d

# Wait 10 seconds for services to start
sleep 10

# Verify services are running
docker-compose -f docker-compose.test.yml ps

# Check if database is ready
docker-compose -f docker-compose.test.yml exec postgres pg_isready -U postgres
```

## 📦 Step 3: Install Dependencies

**For Web Package (React + Node.js API):**
```bash
cd packages/web
npm install
```

**For AI Package (FastAPI):**
```bash
cd packages/ai
pip install -r requirements.txt
```

## 🚀 Step 4: Start Application Services

**Terminal 1 - Start Web Application:**
```bash
cd packages/web
npm run dev
```

**Terminal 2 - Start AI Service:**
```bash
cd packages/ai
uvicorn main:app --reload --port 8001 --host 0.0.0.0
```

## 🌐 Step 5: Access the Application

Once both services are running, you can access:

- **Frontend (React App)**: http://localhost:3000
- **API Server**: http://localhost:8000  
- **AI Service**: http://localhost:8001
- **Database**: localhost:5432

## ✅ Step 6: Verify Deployment

**Check Service Health:**
```bash
# API Health Check
curl http://localhost:8000/health

# AI Service Health Check  
curl http://localhost:8001/health

# Database Connection
docker-compose -f docker-compose.test.yml exec postgres psql -U postgres -d grant_platform -c "SELECT version();"
```

## 🧪 Step 7: Test Core Features

### 1. Frontend Access
- Open http://localhost:3000
- You should see the Grant Writing Platform login page
- The UI should be fully functional

### 2. File Upload Test
- Click on file upload area
- Try uploading a PDF file (the processing will require OpenAI API key)
- Watch the progress bar show the 6 stages

### 3. Database Verification
```bash
# Connect to database
docker-compose -f docker-compose.test.yml exec postgres psql -U postgres -d grant_platform

# Check tables exist
\dt

# Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

# Exit database
\q
```

## 🐛 Troubleshooting

### Issue: Docker services won't start
```bash
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d --force-recreate
```

### Issue: Database connection fails
```bash
# Check database logs
docker-compose -f docker-compose.test.yml logs postgres

# Restart database
docker-compose -f docker-compose.test.yml restart postgres
```

### Issue: Node.js dependencies fail
```bash
cd packages/web
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Issue: Python dependencies fail
```bash
cd packages/ai
pip install --upgrade pip
pip install -r requirements.txt
```

### Issue: OpenAI API not working
- Verify your API key is correct in `.env`
- Check you have credits in your OpenAI account
- Test the key: `curl https://api.openai.com/v1/models -H "Authorization: Bearer sk-your-key"`

## 📋 What You Can Test

### ✅ Working Features (No External APIs Required)
- [ ] Frontend UI and navigation
- [ ] File upload interface  
- [ ] Progress tracking UI
- [ ] Project management interface
- [ ] Draft editor interface
- [ ] Compliance checking UI
- [ ] Database operations
- [ ] Basic API endpoints

### ⚠️ Limited Features (Require OpenAI API Key)
- [ ] Document processing and analysis
- [ ] AI-powered draft generation
- [ ] Section regeneration
- [ ] Semantic search
- [ ] Content suggestions

### 🔒 Requires AWS Setup
- [ ] User authentication (Cognito)
- [ ] File storage (S3)
- [ ] Production deployment

## 🛑 Stopping the Platform

```bash
# Stop application services (Ctrl+C in terminals running npm/uvicorn)

# Stop Docker services  
docker-compose -f docker-compose.test.yml down

# Optional: Remove volumes to start fresh
docker-compose -f docker-compose.test.yml down -v
```

## 🎯 Next Steps After Testing

1. **Add OpenAI API Key**: Update `.env` with your actual OpenAI API key
2. **Set up AWS Cognito**: For user authentication
3. **Configure S3 Bucket**: For file storage  
4. **Test Full Workflow**: Upload documents and generate content
5. **Production Deployment**: Deploy to AWS using provided configurations

## 📞 Support

If you encounter issues:
1. Check the specific error messages in terminal outputs
2. Verify all prerequisites are installed correctly
3. Ensure Docker has sufficient resources (4GB+ RAM recommended)
4. Check firewall settings for ports 3000, 8000, 8001, 5432, 6379

---

**🎉 Congratulations!** You now have the Grant Writing Platform running locally and ready for testing!