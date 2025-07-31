# 🚀 Deploy Grant Writing Platform to Vercel - Step by Step

## **📋 What You Need (No Firebase!)**
- ✅ GitHub account
- ✅ Vercel account (free)
- ✅ OpenAI API key (required for AI features)
- ✅ 15 minutes of your time

## **🎯 Step 1: Push to GitHub**

```bash
cd "/Users/animeshtiwari/Agent Granti"

# Initialize git if not already done
git init
git add .
git commit -m "Initial Grant Writing Platform"

# Create GitHub repo and push
# Go to github.com/new and create "grant-writing-platform"
git remote add origin https://github.com/YOUR_USERNAME/grant-writing-platform.git
git branch -M main
git push -u origin main
```

## **🌐 Step 2: Deploy Frontend to Vercel**

1. **Go to [vercel.com](https://vercel.com) and sign in**

2. **Click "New Project"**

3. **Import your GitHub repository**

4. **Configure deployment settings:**
   - **Root Directory**: `packages/web`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build:frontend`
   - **Output Directory**: `dist/frontend`
   - **Install Command**: `npm install`

5. **Add Environment Variables** (in Vercel dashboard):
   ```
   OPENAI_API_KEY = sk-your-openai-api-key-here
   DATABASE_URL = (we'll add this after setting up database)
   AI_SERVICE_URL = (we'll add this after deploying AI service)
   NODE_ENV = production
   ```

6. **Click "Deploy"**

## **🗄️ Step 3: Set Up Database (Neon)**

1. **Go to [neon.tech](https://neon.tech)**

2. **Sign up/Sign in and create new project:**
   - Name: "grant-writing-platform"
   - Region: Choose closest to you
   - PostgreSQL version: 15 (default)

3. **Copy the connection string** (looks like: `postgresql://user:pass@host/db`)

4. **Run the database schema:**
   - Click "SQL Editor" in Neon dashboard
   - Copy and paste the contents of `packages/web/src/api/database/schema.sql`
   - Click "Run"

5. **Enable pgvector extension:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

6. **Update Vercel environment variables:**
   - Go back to Vercel dashboard
   - Add: `DATABASE_URL = your_neon_connection_string`
   - Redeploy

## **🤖 Step 4: Deploy AI Service (Railway)**

1. **Go to [railway.app](https://railway.app)**

2. **Sign up/Sign in with GitHub**

3. **Create new project:**
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Choose "packages/ai" as root directory

4. **Configure environment variables in Railway:**
   ```
   OPENAI_API_KEY = sk-your-openai-api-key-here
   DATABASE_URL = your_neon_connection_string
   OPENAI_MODEL = gpt-4
   EMBEDDING_MODEL = text-embedding-3-small
   ```

5. **Deploy and copy the Railway URL** (e.g., `https://your-app.railway.app`)

6. **Update Vercel environment variables:**
   - Add: `AI_SERVICE_URL = your_railway_app_url`
   - Redeploy

## **✅ Step 5: Test Your Deployment**

1. **Check your live URLs:**
   - **Frontend**: `https://your-app.vercel.app`
   - **API Health**: `https://your-app.vercel.app/api/health`
   - **AI Service**: `https://your-app.railway.app/health`

2. **Test basic functionality:**
   - Visit your Vercel URL
   - Should see the Grant Writing Platform login page
   - UI should be fully functional

## **🎉 You're Live!**

Your Grant Writing Platform is now deployed and accessible worldwide!

### **What Works Immediately:**
✅ Complete UI/UX  
✅ File upload interface  
✅ Project management  
✅ Database operations  
✅ API endpoints  

### **What Requires OpenAI API Key:**
🔑 Document processing  
🔑 AI content generation  
🔑 RAG functionality  

## **🔧 Quick Fixes**

### **If something doesn't work:**

1. **Check Vercel build logs:**
   - Go to Vercel dashboard → Deployments
   - Click on failed deployment to see logs

2. **Check Railway logs:**
   - Go to Railway dashboard → Your project
   - Click "View Logs"

3. **Database connection issues:**
   - Verify DATABASE_URL is correct in both Vercel and Railway
   - Test connection in Neon SQL editor

4. **CORS issues:**
   - The API functions include CORS headers
   - If issues persist, check browser console

## **💰 Cost Breakdown:**
- **Vercel**: Free (100GB bandwidth/month)
- **Railway**: Free ($5 credit/month, usually enough)
- **Neon**: Free (3GB storage)
- **OpenAI**: Pay per use (estimates: $5-20/month for testing)

## **🚀 Next Steps After Deployment:**

1. **Test with real documents** (upload PDFs, CSVs)
2. **Monitor usage** in dashboards
3. **Set up custom domain** (optional)
4. **Configure AWS Cognito** for production auth
5. **Add error monitoring** (Sentry)

---

**🎯 Need Help?** Check the specific error messages in the deployment logs and let me know what you see!