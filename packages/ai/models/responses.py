from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class IngestResponse(BaseModel):
    job_id: str
    status: str
    message: str
    progress: Optional[Dict[str, Any]] = None

class DraftResponse(BaseModel):
    job_id: str
    status: str
    content: Optional[Dict[str, str]] = None
    error: Optional[str] = None

class QueryResponse(BaseModel):
    query: str
    response: str
    sources: List[Dict[str, Any]]
    confidence: Optional[float] = None

class ComplianceResponse(BaseModel):
    project_id: str
    checks: List[Dict[str, Any]]
    overall_status: str
    issues: List[str]
    recommendations: List[str]