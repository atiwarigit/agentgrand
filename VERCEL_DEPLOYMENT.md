# 🚀 Grant Writing Platform - Vercel Deployment Guide

## 🏗️ Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway       │    │   Neon DB       │
│   ┌───────────┐ │    │   ┌───────────┐ │    │   ┌───────────┐ │
│   │ React App │ │    │   │ FastAPI   │ │    │   │PostgreSQL│ │
│   │ + API     │◄┼────┼──►│AI Service │ │    │   │+ pgvector │ │
│   │Functions  │ │    │   │           │ │    │   │           │ │
│   └───────────┘ │    │   └───────────┘ │    │   └───────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- [ ] Vercel account (free tier works)
- [ ] Railway account (for AI service)
- [ ] Neon account (for PostgreSQL database)
- [ ] OpenAI API key
- [ ] GitHub repository

## 🗄️ Step 1: Set Up Database (Neon)

1. **Create Neon Database:**
   ```bash
   # Go to https://neon.tech
   # Create new project: "grant-writing-platform"
   # Copy the connection string
   ```

2. **Enable pgvector Extension:**
   ```sql
   -- Connect to your Neon database and run:
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Initialize Schema:**
   ```bash
   # Copy the contents of packages/web/src/api/database/schema.sql
   # Run it in your Neon SQL Editor
   ```

## 🤖 Step 2: Deploy AI Service (Railway)

1. **Create Railway Project:**
   ```bash
   # Go to https://railway.app
   # Create new project from GitHub repo
   # Select packages/ai folder as root
   ```

2. **Configure Environment Variables:**
   ```env
   DATABASE_URL=your_neon_connection_string
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=gpt-4
   EMBEDDING_MODEL=text-embedding-3-small
   ```

3. **Set Railway Build Settings:**
   ```toml
   # railway.toml (create in packages/ai/)
   [build]
   builder = "NIXPACKS"
   buildCommand = "pip install -r requirements.txt"
   
   [deploy]
   startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
   healthcheckPath = "/health"
   ```

## 🌐 Step 3: Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Configure Environment Variables:**
   Create `.env.local` in the project root:
   ```env
   # Database
   DATABASE_URL=your_neon_connection_string
   
   # AI Service  
   AI_SERVICE_URL=https://your-railway-app.railway.app
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   
   # AWS Cognito (optional for now)
   COGNITO_USER_POOL_ID=your_cognito_pool_id
   COGNITO_CLIENT_ID=your_cognito_client_id
   
   # File Upload
   MAX_FILE_SIZE=20971520
   MAX_FILES_PER_UPLOAD=10
   ```

3. **Deploy to Vercel:**
   ```bash
   # From project root
   vercel --prod
   
   # Or connect GitHub repo for auto-deployment
   # Go to https://vercel.com/dashboard
   # Import your GitHub repository
   ```

## ⚙️ Step 4: Configure Vercel Project Settings

1. **Build Settings:**
   - Framework Preset: `Vite`
   - Root Directory: `packages/web`
   - Build Command: `npm run build:frontend`
   - Output Directory: `dist/frontend`

2. **Environment Variables** (in Vercel dashboard):
   ```
   DATABASE_URL = your_neon_connection_string
   AI_SERVICE_URL = https://your-railway-app.railway.app
   OPENAI_API_KEY = your_openai_api_key
   NODE_ENV = production
   ```

3. **Serverless Functions:**
   - Functions are automatically deployed from `/api` folder
   - Each `.ts` file becomes an endpoint

## 🔧 Step 5: Update Frontend Configuration

Update `packages/web/src/frontend/services/apiService.ts`:

```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-vercel-app.vercel.app'
  : 'http://localhost:3000'
```

## 🧪 Step 6: Test Deployment

1. **Health Checks:**
   ```bash
   # Frontend
   curl https://your-vercel-app.vercel.app
   
   # API
   curl https://your-vercel-app.vercel.app/api/health
   
   # AI Service
   curl https://your-railway-app.railway.app/health
   ```

2. **Database Connection:**
   ```bash
   # Test from Vercel function
   curl https://your-vercel-app.vercel.app/api/projects
   ```

## 📊 Current Deployment Status

### ✅ What Works Immediately:
- Frontend UI (React app)
- Serverless API functions  
- Database operations
- File upload interface
- Basic project management

### 🔑 Requires API Keys:
- AI document processing
- Content generation
- Semantic search

### 🚧 Optional Setup:
- AWS Cognito (authentication)
- AWS S3 (file storage)
- Custom domain

## 🚀 Quick Deploy Commands

```bash
# 1. Deploy AI service to Railway
cd packages/ai
# Push to Railway via GitHub connection

# 2. Deploy frontend + API to Vercel  
vercel --prod

# 3. Test the deployment
curl https://your-app.vercel.app/api/health
```

## 🔧 Alternative: One-Click Deploy

Create these files for easy deployment:

### Railway Deploy Button
```markdown
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template)
```

### Vercel Deploy Button  
```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your/repo)
```

## 🌍 Production URLs

After deployment, you'll have:
- **Frontend**: `https://your-app.vercel.app`
- **API**: `https://your-app.vercel.app/api/*`
- **AI Service**: `https://your-ai-app.railway.app`
- **Database**: Neon-hosted PostgreSQL

## 📈 Scaling Considerations

### Vercel Limits (Free Tier):
- 100 GB bandwidth/month
- 100 serverless function executions/day
- 10s max function duration

### Railway Limits (Free Tier):
- $5 credit/month
- 1GB RAM
- Sleeps after 30min inactivity

### Neon Limits (Free Tier):
- 3GB storage
- 1 database
- No connection pooling

## 🔄 CI/CD Pipeline

Set up automatic deployments:

1. **GitHub Actions** (optional):
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
   ```

2. **Vercel Git Integration** (recommended):
   - Auto-deploy on push to main
   - Preview deployments for PRs
   - Rollback capabilities

## 🚨 Troubleshooting

### Common Issues:

1. **Build Failures:**
   ```bash
   # Check build logs in Vercel dashboard
   # Verify all dependencies are in package.json
   ```

2. **Database Connection:**
   ```bash
   # Verify DATABASE_URL is set correctly
   # Check Neon database is active
   ```

3. **CORS Issues:**
   ```bash
   # Ensure API functions have CORS headers
   # Check frontend API_BASE_URL configuration
   ```

4. **Function Timeouts:**
   ```bash
   # Optimize database queries
   # Consider async processing for long tasks
   ```

---

## 🎯 Next Steps After Deployment

1. **Test all features** with real data
2. **Set up monitoring** (Vercel Analytics, Railway metrics)
3. **Configure custom domain** (optional)
4. **Set up AWS Cognito** for production auth
5. **Add error tracking** (Sentry, LogRocket)
6. **Performance optimization** based on usage

Your Grant Writing Platform will be live and accessible worldwide! 🌍