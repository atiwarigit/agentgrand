# 🚀 Deploy to Vercel - Quick Start

## 📋 Next Steps for Vercel Deployment

### Option 1: One-Click Deploy (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial Grant Writing Platform"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure these settings:
     - **Root Directory**: `packages/web`
     - **Build Command**: `npm run build:frontend`
     - **Output Directory**: `dist/frontend`

3. **Set Environment Variables in Vercel:**
   ```
   OPENAI_API_KEY = your_openai_api_key_here
   AI_SERVICE_URL = https://your-railway-app.railway.app
   DATABASE_URL = your_neon_database_url
   NODE_ENV = production
   ```

### Option 2: CLI Deploy

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd packages/web
   vercel --prod
   ```

## 🗄️ Database Setup (Choose One)

### Option A: Neon (Recommended)
1. Go to [neon.tech](https://neon.tech)
2. Create new project: "grant-writing-platform"
3. Run the SQL schema from `packages/web/src/api/database/schema.sql`
4. Copy connection string to Vercel env vars

### Option B: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Enable pgvector extension in SQL editor: `CREATE EXTENSION vector;`
4. Run schema and copy connection string

## 🤖 AI Service Deployment

### Railway (Recommended)
1. Go to [railway.app](https://railway.app)
2. Connect GitHub repo
3. Select `packages/ai` as root directory
4. Set environment variables:
   ```
   OPENAI_API_KEY = your_api_key
   DATABASE_URL = your_database_url
   ```

### Alternative: Render
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect repo, set root to `packages/ai`
4. Build: `pip install -r requirements.txt`
5. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## ⚡ Quick Test

After deployment:
1. **Frontend**: Your Vercel URL (e.g., `https://your-app.vercel.app`)
2. **API Health**: `https://your-app.vercel.app/api/health`
3. **AI Service**: `https://your-railway-app.railway.app/health`

## 🎯 What You Get

✅ **Live Platform** accessible worldwide  
✅ **Serverless Functions** for API endpoints  
✅ **PostgreSQL Database** with pgvector  
✅ **AI Processing Service** for RAG  
✅ **File Upload** and processing  
✅ **Document Export** (DOCX/PDF)  
✅ **Real-time Updates** and progress tracking  

## 💡 Pro Tips

1. **Use Environment Variables** for all sensitive data
2. **Test locally first** with `npm run dev`
3. **Monitor costs** - all services offer free tiers
4. **Set up custom domain** for professional appearance
5. **Enable analytics** in Vercel dashboard

## 🔧 Cost Estimate (Free Tiers)

- **Vercel**: Free (100GB bandwidth/month)
- **Railway**: $5 credit/month (usually enough for testing)
- **Neon**: Free (3GB storage)
- **Total**: Essentially free for development/testing

---

**Ready to deploy?** Follow the steps above and you'll have a live Grant Writing Platform in 15 minutes! 🚀