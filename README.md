# Grant Writing Platform

An AI-powered grant writing platform with RAG capabilities, built for seasoned grant professionals and housing authority staff.

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/grant-writing-platform&project-name=grant-writing-platform&repository-name=grant-writing-platform&env=OPENAI_API_KEY,DATABASE_URL,AI_SERVICE_URL)

**Or follow the step-by-step guide:** [DEPLOY_STEPS.md](DEPLOY_STEPS.md)

## ✨ Features

- **🤖 AI-Powered Drafting**: RAG-based content generation with OpenAI GPT-4
- **📁 Multi-Format Upload**: PDF, CSV, XLSX support (≤20MB)
- **📊 Real-Time Progress**: 6-stage processing pipeline with live updates
- **✏️ Smart Editor**: Section-by-section editing with regeneration
- **✅ Compliance Checking**: Automated validation with user overrides
- **📄 Professional Export**: Clean DOCX and PDF generation
- **👥 Collaboration**: Role-based access (Owner/Editor/Viewer)
- **🔒 Enterprise Security**: Authentication, quotas, and audit logging

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway       │    │   Neon DB       │
│ React + API     │◄──►│   FastAPI       │◄──►│ PostgreSQL      │
│ Serverless      │    │   AI Service    │    │ + pgvector      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Vercel Serverless Functions (Node.js)
- **AI Service**: FastAPI with LangChain + OpenAI
- **Database**: PostgreSQL with pgvector extension
- **Deployment**: Vercel + Railway + Neon

## 📋 Prerequisites

- OpenAI API key (required for AI features)
- GitHub account
- Vercel account (free)

## 🚦 Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/grant-writing-platform.git
cd grant-writing-platform

# Set up environment
cp .env.example .env
# Add your OpenAI API key to .env

# Start database services
docker-compose -f docker-compose.test.yml up -d

# Install and run web app
cd packages/web
npm install
npm run dev

# Install and run AI service
cd packages/ai
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Access at http://localhost:3000

## 🌐 Deployment

### Option 1: One-Click Deploy
Click the Vercel button above and follow the prompts.

### Option 2: Manual Deploy
Follow the detailed guide in [DEPLOY_STEPS.md](DEPLOY_STEPS.md)

### Option 3: Docker Deploy
Follow [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for containerized deployment.

## 📊 Usage

1. **Upload Documents**: Drag & drop grant RFPs, organizational docs
2. **AI Processing**: Watch 6-stage pipeline extract and analyze content
3. **Draft Generation**: Get AI-powered grant proposal sections
4. **Edit & Refine**: Use inline editor with smart regeneration
5. **Compliance Check**: Automated validation with override options
6. **Export**: Download professional DOCX/PDF documents

## 🔧 Configuration

### Environment Variables

```env
# Required
OPENAI_API_KEY=sk-your-api-key-here
DATABASE_URL=postgresql://user:pass@host/db
AI_SERVICE_URL=https://your-ai-service.railway.app

# Optional
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Database Setup

The platform uses PostgreSQL with pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run the schema from `packages/web/src/api/database/schema.sql`

## 📈 Features Overview

### Core MVP Features
- ✅ Manual file upload (PDF, CSV, XLSX ≤20MB)
- ✅ RAG system with OpenAI + pgvector
- ✅ 6-stage processing pipeline
- ✅ Draft generation (Need, Project Plan, Budget, Outcomes)
- ✅ Smart regeneration (10/month limit)
- ✅ Compliance checking with overrides
- ✅ DOCX/PDF export
- ✅ Collaboration with roles
- ✅ Quota management

### Business Logic
- **Project Limits**: 2 active projects per user
- **Regeneration Quota**: 10 per user per month
- **Concurrency**: 1 processing job per organization
- **File Limits**: 20MB per file, 10 files per upload

## 🧪 Testing

```bash
# Frontend tests
cd packages/web && npm test

# Backend tests
cd packages/ai && pytest

# Integration tests
npm run test:integration
```

## 📝 API Documentation

### Core Endpoints
- `GET /api/health` - Service health check
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `POST /api/process` - Upload and process files
- `GET /api/jobs/:id` - Check processing status
- `POST /api/regenerate` - Regenerate content sections

### AI Service Endpoints
- `POST /ingest` - Process uploaded documents
- `POST /regenerate` - Regenerate specific sections
- `POST /query` - RAG-based document querying

## 🔒 Security

- JWT-based authentication with AWS Cognito
- Role-based access control
- Rate limiting and quota enforcement
- File type validation and size limits
- Audit logging for all actions
- Environment-based configuration

## 📊 Monitoring

- Health checks on all services
- Structured logging with error tracking
- Usage analytics and quota monitoring
- Performance metrics collection

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- 📖 [Documentation](VERCEL_DEPLOYMENT.md)
- 🐛 [Issues](https://github.com/your-username/grant-writing-platform/issues)
- 💬 [Discussions](https://github.com/your-username/grant-writing-platform/discussions)

---

**Built with ❤️ for grant professionals everywhere**