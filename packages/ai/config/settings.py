import os
from typing import List, Optional
from pydantic import BaseModel
from urllib.parse import urlparse

class Settings(BaseModel):
    # Database - support both individual components and full URL
    database_url: str = os.getenv("DATABASE_URL", "")
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "password")
    db_name: str = os.getenv("DB_NAME", "grant_platform")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Parse DATABASE_URL if provided
        if self.database_url:
            parsed = urlparse(self.database_url)
            if parsed.hostname:
                self.db_host = parsed.hostname
            if parsed.port:
                self.db_port = parsed.port
            if parsed.username:
                self.db_user = parsed.username
            if parsed.password:
                self.db_password = parsed.password
            if parsed.path.lstrip('/'):
                self.db_name = parsed.path.lstrip('/')
    
    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    
    # Redis (for caching and job queue) - optional
    redis_url: Optional[str] = os.getenv("REDIS_URL")
    
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
