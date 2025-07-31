import os
from typing import List
from pydantic import BaseSettings

class Settings(BaseSettings):
    # Database
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "password")
    db_name: str = os.getenv("DB_NAME", "grant_platform")
    
    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    
    # Redis (for caching and job queue)
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # File processing
    max_file_size: int = 20 * 1024 * 1024  # 20MB
    supported_file_types: List[str] = [
        "application/pdf",
        "text/csv", 
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]
    
    # Chunking settings
    chunk_size: int = 1000
    chunk_overlap: int = 200
    
    # RAG settings
    similarity_threshold: float = 0.7
    max_context_chunks: int = 10
    
    # Rate limiting
    requests_per_minute: int = 60
    
    # Compliance defaults
    default_page_limit: int = 50
    default_word_limit: int = 5000
    
    class Config:
        env_file = ".env"