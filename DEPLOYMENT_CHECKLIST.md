# ✅ Vercel Deployment Checklist

## **🎯 No Firebase Needed! Here's Your Stack:**

- ✅ **Vercel** → Frontend + API (Better than Firebase for your use case)
- ✅ **Neon** → PostgreSQL Database (Better than Firestore for AI/RAG)
- ✅ **Railway** → AI Service (FastAPI)
- ✅ **OpenAI** → AI Processing

## **📋 Step-by-Step Checklist:**

### **□ Step 1: Get OpenAI API Key (Required)**
- Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Create new API key
- Copy it (starts with `sk-`)
- Keep it handy for next steps

### **□ Step 2: Push to GitHub**
```bash
cd "/Users/animeshtiwari/Agent Granti"
git init
git add .
git commit -m "Initial Grant Writing Platform"

# Create repo at github.com/new
git remote add origin https://github.com/YOUR_USERNAME/grant-writing-platform.git
git push -u origin main
```

### **□ Step 3: Deploy to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your repo
5. **Important Settings:**
   - Root Directory: `packages/web`
   - Build Command: `npm run build:frontend`
   - Output Directory: `dist/frontend`
6. Add environment variable: `OPENAI_API_KEY = your-key-here`
7. Deploy!

### **□ Step 4: Set Up Database (Neon)**
1. Go to [neon.tech](https://neon.tech)
2. Create project: "grant-writing-platform"
3. Copy connection string
4. In SQL Editor, paste contents of `packages/web/src/api/database/schema.sql`
5. Run: `CREATE EXTENSION vector;`
6. Add to Vercel env: `DATABASE_URL = your-connection-string`

### **□ Step 5: Deploy AI Service (Railway)**
1. Go to [railway.app](https://railway.app)
2. Deploy from GitHub repo
3. Select `packages/ai` folder
4. Add environment variables:
   - `OPENAI_API_KEY = your-key`
   - `DATABASE_URL = your-neon-connection`
5. Copy Railway URL
6. Add to Vercel env: `AI_SERVICE_URL = your-railway-url`

### **□ Step 6: Test Everything**
- Visit your Vercel URL
- Check `/api/health` endpoint
- Try uploading a file
- Verify UI works

## **🎉 What You Get:**

✅ **Live Platform** at your Vercel URL  
✅ **AI-Powered** document processing  
✅ **Professional UI** with real-time updates  
✅ **Database** with vector search  
✅ **File Upload** and processing  
✅ **Export** to DOCX/PDF  
✅ **Scalable** serverless architecture  

## **💰 Cost: $0-10/month**
- Vercel: Free
- Railway: Free ($5 credit)
- Neon: Free
- OpenAI: Pay per use (~$5-10/month for testing)

## **🚨 If Something Goes Wrong:**

1. **Check Vercel build logs** in dashboard
2. **Check Railway logs** in dashboard  
3. **Verify environment variables** are set correctly
4. **Test database connection** in Neon SQL editor

## **🎯 Why This Stack is Better Than Firebase:**

- ✅ **PostgreSQL + pgvector** → Perfect for AI/RAG (Firebase doesn't support)
- ✅ **Vercel Serverless** → Better performance & scaling
- ✅ **Railway FastAPI** → Purpose-built for AI workloads
- ✅ **Enterprise Ready** → Real authentication, proper database
- ✅ **Cost Effective** → Pay only for what you use

---

**Ready to deploy? Follow `DEPLOY_STEPS.md` for detailed instructions!**