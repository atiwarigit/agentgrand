from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class IngestRequest(BaseModel):
    job_id: str
    project_id: str
    user_id: str
    files: List[str]  # File paths or IDs
    custom_prompts: Optional[Dict[str, str]] = None

class DraftRequest(BaseModel):
    project_id: str
    user_id: str
    sections: Optional[List[str]] = None  # Specific sections to generate
    custom_prompts: Optional[Dict[str, str]] = None

class RegenerateRequest(BaseModel):
    project_id: str
    user_id: str
    section: str  # Which section to regenerate
    custom_prompt: Optional[str] = None

class QueryRequest(BaseModel):
    project_id: str
    query: str
    similarity_threshold: float = 0.7
    max_results: int = 10

class ComplianceCheckRequest(BaseModel):
    project_id: str
    grant_data: Dict[str, Any]
    rules: Optional[List[Dict[str, Any]]] = None