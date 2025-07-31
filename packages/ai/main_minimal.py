from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Grant Writing AI Service",
    description="FastAPI microservice for RAG-based grant writing assistance",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Simple startup event"""
    logger.info("Grant Writing AI Service starting...")
    logger.info(f"PORT environment variable: {os.getenv('PORT', 'not set')}")
    logger.info("Service startup complete")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Grant Writing AI Service",
        "version": "1.0.0",
        "status": "running",
        "port": os.getenv("PORT", "unknown")
    }

@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "grant-ai-service",
        "port": os.getenv("PORT", "unknown")
    }

@app.get("/test")
async def test_endpoint():
    """Test endpoint for debugging"""
    return {
        "message": "Test endpoint working",
        "env_vars": {
            "PORT": os.getenv("PORT"),
            "OPENAI_API_KEY": "***" if os.getenv("OPENAI_API_KEY") else None,
            "DATABASE_URL": "***" if os.getenv("DATABASE_URL") else None,
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)