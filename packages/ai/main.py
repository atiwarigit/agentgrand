from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import asyncpg
import os
import json
import logging
from datetime import datetime

from services.rag_service import RAGService
from services.embedding_service import EmbeddingService
from services.document_processor import DocumentProcessor
from services.draft_generator import DraftGenerator
from services.agent_orchestrator import get_orchestrator
from models.requests import IngestRequest, DraftRequest, RegenerateRequest, QueryRequest
from models.responses import IngestResponse, DraftResponse, QueryResponse
from config.settings import Settings

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
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
settings = Settings()
rag_service = RAGService()
embedding_service = EmbeddingService()
document_processor = DocumentProcessor()
draft_generator = DraftGenerator()

# Database connection
async def get_db_connection():
    return await asyncpg.connect(
        host=settings.db_host,
        port=settings.db_port,
        user=settings.db_user,
        password=settings.db_password,
        database=settings.db_name
    )

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Grant Writing AI Service...")
    try:
        await rag_service.initialize()
        logger.info("RAG service initialized")
    except Exception as e:
        logger.warning(f"RAG service initialization failed: {e}")
    logger.info("Service startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Grant Writing AI Service...")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Grant Writing AI Service",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Simple health check endpoint for Railway"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "grant-ai-service"
    }

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check endpoint with service status"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "rag": rag_service.is_ready(),
            "embedding": embedding_service.is_ready(),
            "document_processor": document_processor.is_ready(),
            "draft_generator": draft_generator.is_ready()
        }
    }

@app.post("/ingest", response_model=IngestResponse)
async def ingest_documents(
    background_tasks: BackgroundTasks,
    job_id: str = Form(...),
    project_id: str = Form(...),
    user_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Ingest documents for a project
    - Parse documents
    - Extract text
    - Generate embeddings
    - Store in vector database
    """
    try:
        logger.info(f"Starting document ingestion for job {job_id}")
        
        # Update job status to processing
        conn = await get_db_connection()
        await conn.execute(
            """
            UPDATE processing_jobs 
            SET status = 'processing', 
                started_at = $1,
                progress = $2
            WHERE id = $3
            """,
            datetime.utcnow(),
            json.dumps({"stage": "parsing", "percentage": 10}),
            job_id
        )
        await conn.close()
        
        # Start background processing
        background_tasks.add_task(
            process_documents_background,
            job_id, project_id, user_id, files
        )
        
        return IngestResponse(
            job_id=job_id,
            status="processing",
            message="Document ingestion started"
        )
        
    except Exception as e:
        logger.error(f"Error starting document ingestion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_documents_background(
    job_id: str, 
    project_id: str, 
    user_id: str, 
    files: List[UploadFile]
):
    """Background task for processing documents"""
    conn = None
    try:
        conn = await get_db_connection()
        
        # Stage 1: Parse documents
        await update_job_progress(conn, job_id, "parsing", 20)
        
        processed_files = []
        for file in files:
            content = await file.read()
            
            # Process based on file type
            if file.content_type == "application/pdf":
                text_content = await document_processor.process_pdf(content)
            elif file.content_type == "text/csv":
                text_content = await document_processor.process_csv(content)
            elif file.content_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                text_content = await document_processor.process_xlsx(content)
            else:
                continue
                
            processed_files.append({
                "filename": file.filename,
                "content": text_content,
                "file_type": file.content_type
            })
        
        # Stage 2: Generate embeddings
        await update_job_progress(conn, job_id, "embedding", 40)
        
        all_chunks = []
        for file_data in processed_files:
            # Store file record
            file_record = await conn.fetchrow(
                """
                INSERT INTO files (project_id, filename, original_filename, file_type, file_size, 
                                 s3_bucket, s3_key, uploaded_by, processing_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed')
                RETURNING id
                """,
                project_id, file_data["filename"], file_data["filename"],
                file_data["file_type"], len(file_data["content"]),
                "local", f"temp/{job_id}/{file_data['filename']}", user_id
            )
            
            # Chunk the document
            chunks = await document_processor.chunk_document(file_data["content"])
            
            # Generate embeddings for chunks
            for i, chunk in enumerate(chunks):
                embedding = await embedding_service.generate_embedding(chunk["content"])
                
                await conn.execute(
                    """
                    INSERT INTO document_chunks (file_id, project_id, chunk_index, content, metadata, embedding)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    file_record["id"], project_id, i, chunk["content"],
                    json.dumps(chunk["metadata"]), json.dumps(embedding)
                )
                
                all_chunks.append(chunk)
        
        # Stage 3: Generate draft using Agent Orchestrator
        await update_job_progress(conn, job_id, "drafting", 60)
        
        # Use agent orchestrator for enhanced content generation
        orchestrator = get_orchestrator(settings.openai_api_key)
        
        # Prepare context for agents
        agent_context = {
            "project_id": project_id,
            "document_chunks": all_chunks[:10],  # Limit context size
            "processed_files": processed_files,
            "job_id": job_id
        }
        
        # Execute full analysis workflow with multiple specialized agents
        agent_results = await orchestrator.execute_workflow(
            workflow_type="full_analysis",
            context=agent_context
        )
        
        # Generate grant data from agent results
        grant_data = await _process_agent_results(agent_results, all_chunks, conn)
        
        # Stage 4: Compliance check
        await update_job_progress(conn, job_id, "compliance", 80)
        
        compliance_results = await run_compliance_checks(project_id, grant_data, conn)
        grant_data["compliance"] = compliance_results
        
        # Stage 5: Package results
        await update_job_progress(conn, job_id, "packaging", 90)
        
        # Update project with generated data
        await conn.execute(
            """
            UPDATE projects 
            SET grant_data = $1, status = 'in_progress', updated_at = $2
            WHERE id = $3
            """,
            json.dumps(grant_data),
            datetime.utcnow(),
            project_id
        )
        
        # Complete job
        await conn.execute(
            """
            UPDATE processing_jobs 
            SET status = 'completed', 
                completed_at = $1,
                progress = $2,
                result = $3
            WHERE id = $4
            """,
            datetime.utcnow(),
            json.dumps({"stage": "completed", "percentage": 100}),
            json.dumps(grant_data),
            job_id
        )
        
        logger.info(f"Document processing completed for job {job_id}")
        
    except Exception as e:
        logger.error(f"Error processing documents for job {job_id}: {str(e)}")
        if conn:
            await conn.execute(
                """
                UPDATE processing_jobs 
                SET status = 'failed', 
                    completed_at = $1,
                    error_message = $2
                WHERE id = $3
                """,
                datetime.utcnow(),
                str(e),
                job_id
            )
    finally:
        if conn:
            await conn.close()

async def update_job_progress(conn, job_id: str, stage: str, percentage: int):
    """Update job progress"""
    await conn.execute(
        """
        UPDATE processing_jobs 
        SET progress = $1
        WHERE id = $2
        """,
        json.dumps({"stage": stage, "percentage": percentage}),
        job_id
    )

async def _process_agent_results(agent_results: Dict, all_chunks: List, conn) -> Dict:
    """Process agent results into structured grant data"""
    try:
        grant_data = {
            "sections": {},
            "analysis": {},
            "agent_insights": agent_results
        }
        
        # Extract content from agent results
        if "results" in agent_results:
            results = agent_results["results"]
            
            # Extract sections from specialized agents
            if "need" in results and results["need"]["status"] == "completed":
                grant_data["sections"]["need"] = results["need"]["result"]
            
            if "project" in results and results["project"]["status"] == "completed":
                grant_data["sections"]["projectPlan"] = results["project"]["result"]
            
            if "budget" in results and results["budget"]["status"] == "completed":
                grant_data["sections"]["budgetNarrative"] = results["budget"]["result"]
                
            # Use project planning result for outcomes as well
            if "project" in results and results["project"]["status"] == "completed":
                # Extract outcomes from project plan or generate separately
                project_content = results["project"]["result"]
                grant_data["sections"]["outcomes"] = _extract_outcomes_from_project(project_content)
            
            # Extract analysis insights
            if "analyst" in results and results["analyst"]["status"] == "completed":
                grant_data["analysis"] = results["analyst"]["result"]
        
        # Generate additional required fields
        grant_data["summary"] = _generate_summary_from_sections(grant_data.get("sections", {}))
        grant_data["deadlines"] = _generate_default_deadlines()
        grant_data["eligibility"] = _generate_default_eligibility()
        grant_data["kpiSuggestions"] = _generate_default_kpis()
        
        return grant_data
        
    except Exception as e:
        logger.error(f"Error processing agent results: {str(e)}")
        # Fallback to basic structure
        return {
            "sections": {
                "need": "Content generated by specialized agents",
                "projectPlan": "Content generated by specialized agents", 
                "budgetNarrative": "Content generated by specialized agents",
                "outcomes": "Content generated by specialized agents"
            },
            "summary": "Grant proposal generated using AI agent collaboration",
            "deadlines": _generate_default_deadlines(),
            "eligibility": _generate_default_eligibility(), 
            "kpiSuggestions": _generate_default_kpis(),
            "agent_insights": agent_results
        }

def _extract_outcomes_from_project(project_content: str) -> str:
    """Extract outcomes section from project plan content"""
    # Simple extraction - in production you might use more sophisticated parsing
    if "outcomes" in project_content.lower() or "results" in project_content.lower():
        lines = project_content.split('\n')
        outcomes_lines = []
        in_outcomes = False
        
        for line in lines:
            if any(word in line.lower() for word in ['outcome', 'result', 'impact', 'goal']):
                in_outcomes = True
            if in_outcomes:
                outcomes_lines.append(line)
        
        if outcomes_lines:
            return '\n'.join(outcomes_lines)
    
    return "Expected outcomes and impact will be defined based on the project plan and community needs identified."

def _generate_summary_from_sections(sections: Dict) -> str:
    """Generate executive summary from sections"""
    if not sections:
        return "Executive summary will be generated based on project sections."
    
    summary_parts = []
    if "need" in sections:
        summary_parts.append("This proposal addresses critical community needs")
    if "projectPlan" in sections:
        summary_parts.append("through a comprehensive implementation plan")
    if "budgetNarrative" in sections:
        summary_parts.append("with detailed budget justification")
    if "outcomes" in sections:
        summary_parts.append("targeting measurable outcomes and community impact")
    
    return " ".join(summary_parts) + "."

def _generate_default_deadlines():
    """Generate default deadline structure"""
    from datetime import datetime, timedelta
    base_date = datetime.now()
    return [
        {"task": "Complete proposal sections", "date": (base_date + timedelta(days=14)).strftime("%Y-%m-%d"), "completed": False},
        {"task": "Internal review and compliance check", "date": (base_date + timedelta(days=21)).strftime("%Y-%m-%d"), "completed": False},
        {"task": "Final review and submission", "date": (base_date + timedelta(days=28)).strftime("%Y-%m-%d"), "completed": False}
    ]

def _generate_default_eligibility():
    """Generate default eligibility structure"""
    return [
        {"requirement": "Organizational eligibility verified", "status": "pending", "notes": "Confirm 501(c)(3) status and mission alignment"},
        {"requirement": "Geographic service area", "status": "pending", "notes": "Verify service area matches grant requirements"},
        {"requirement": "Program experience", "status": "pending", "notes": "Document relevant program experience and outcomes"}
    ]

def _generate_default_kpis():
    """Generate default KPI structure"""
    return [
        {"category": "Service Delivery", "metric": "Number of beneficiaries served", "target": "TBD", "measurement": "Program enrollment and completion records"},
        {"category": "Outcomes", "metric": "Percentage achieving program goals", "target": "80%", "measurement": "Pre/post assessments and evaluations"},
        {"category": "Efficiency", "metric": "Cost per participant", "target": "TBD", "measurement": "Total budget divided by participants served"}
    ]

async def run_compliance_checks(project_id: str, grant_data: Dict, conn) -> Dict:
    """Run compliance checks on the generated grant data"""
    compliance_results = {
        "pageLimit": {"current": 0, "max": 50},  # Will be calculated based on content
        "wordLimit": {"current": 0, "max": 5000},  # Will be calculated based on content
        "requiredAttachments": [
            {"name": "SF-424", "required": True, "uploaded": False},
            {"name": "Budget Worksheet", "required": True, "uploaded": False},
            {"name": "Organizational Chart", "required": True, "uploaded": False},
            {"name": "Letters of Support", "required": False, "uploaded": False}
        ],
        "deadlineAlerts": []
    }
    
    # Calculate word count
    total_words = 0
    for section_name, section_content in grant_data.get("sections", {}).items():
        if isinstance(section_content, str):
            total_words += len(section_content.split())
    
    compliance_results["wordLimit"]["current"] = total_words
    
    # Add deadline alerts if needed
    if total_words > compliance_results["wordLimit"]["max"]:
        compliance_results["deadlineAlerts"].append({
            "message": f"Word count ({total_words}) exceeds limit ({compliance_results['wordLimit']['max']})",
            "severity": "error",
            "date": datetime.utcnow().isoformat()
        })
    
    return compliance_results

@app.post("/regenerate", response_model=DraftResponse)
async def regenerate_section(request: RegenerateRequest, background_tasks: BackgroundTasks):
    """Regenerate a specific section of the grant proposal"""
    try:
        logger.info(f"Regenerating section {request.section} for project {request.project_id}")
        
        # Check regeneration quota
        conn = await get_db_connection()
        quota_result = await conn.fetchrow(
            "SELECT * FROM check_regeneration_quota($1::uuid)",
            request.user_id
        )
        
        if quota_result and quota_result["used"] >= quota_result["limit_val"]:
            await conn.close()
            raise HTTPException(
                status_code=429, 
                detail="Regeneration quota exceeded. Please wait until next month."
            )
        
        # Create regeneration job
        job = await conn.fetchrow(
            """
            INSERT INTO processing_jobs (project_id, user_id, job_type, status, input_data)
            VALUES ($1, $2, 'regenerate', 'processing', $3)
            RETURNING id
            """,
            request.project_id, request.user_id, 
            json.dumps({"section": request.section, "custom_prompt": request.custom_prompt})
        )
        
        # Log regeneration
        await conn.execute(
            """
            INSERT INTO regeneration_log (user_id, project_id, section, job_id)
            VALUES ($1, $2, $3, $4)
            """,
            request.user_id, request.project_id, request.section, job["id"]
        )
        
        await conn.close()
        
        # Start background regeneration
        background_tasks.add_task(
            regenerate_section_background,
            job["id"], request
        )
        
        return DraftResponse(
            job_id=job["id"],
            status="processing",
            content={request.section: "Regenerating..."}
        )
        
    except Exception as e:
        logger.error(f"Error starting section regeneration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def regenerate_section_background(job_id: str, request: RegenerateRequest):
    """Background task for section regeneration"""
    conn = None
    try:
        conn = await get_db_connection()
        
        # Get project context
        project = await conn.fetchrow(
            "SELECT * FROM projects WHERE id = $1",
            request.project_id
        )
        
        if not project:
            raise Exception("Project not found")
        
        # Get relevant document chunks
        chunks = await conn.fetch(
            """
            SELECT content, metadata FROM document_chunks 
            WHERE project_id = $1 
            ORDER BY chunk_index 
            LIMIT 20
            """,
            request.project_id
        )
        
        # Use agent orchestrator for section regeneration
        orchestrator = get_orchestrator(settings.openai_api_key)
        
        # Prepare context for agents
        agent_context = {
            "project_id": request.project_id,
            "section_type": request.section,
            "document_chunks": [{"content": chunk["content"], "metadata": json.loads(chunk["metadata"])} for chunk in chunks],
            "custom_prompt": request.custom_prompt,
            "existing_data": json.loads(project["grant_data"]) if project["grant_data"] else {}
        }
        
        # Execute section regeneration workflow
        agent_results = await orchestrator.execute_workflow(
            workflow_type="section_regeneration",
            context=agent_context,
            section_type=request.section
        )
        
        # Extract the new content from agent results
        new_content = _extract_section_content(agent_results, request.section)
        
        # Update project data
        current_data = json.loads(project["grant_data"]) if project["grant_data"] else {}
        if "sections" not in current_data:
            current_data["sections"] = {}
        current_data["sections"][request.section] = new_content
        
        await conn.execute(
            """
            UPDATE projects 
            SET grant_data = $1, 
                regenerations_used = regenerations_used + 1,
                updated_at = $2
            WHERE id = $3
            """,
            json.dumps(current_data),
            datetime.utcnow(),
            request.project_id
        )
        
        # Complete job
        await conn.execute(
            """
            UPDATE processing_jobs 
            SET status = 'completed', 
                completed_at = $1,
                result = $2
            WHERE id = $3
            """,
            datetime.utcnow(),
            json.dumps({request.section: new_content}),
            job_id
        )
        
        logger.info(f"Section regeneration completed for job {job_id}")
        
    except Exception as e:
        logger.error(f"Error regenerating section for job {job_id}: {str(e)}")
        if conn:
            await conn.execute(
                """
                UPDATE processing_jobs 
                SET status = 'failed', 
                    completed_at = $1,
                    error_message = $2
                WHERE id = $3
                """,
                datetime.utcnow(),
                str(e),
                job_id
            )
    finally:
        if conn:
            await conn.close()

@app.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """Query documents using RAG"""
    try:
        conn = await get_db_connection()
        
        # Generate query embedding
        query_embedding = await embedding_service.generate_embedding(request.query)
        
        # Search similar chunks
        similar_chunks = await conn.fetch(
            """
            SELECT content, metadata, 1 - (embedding <=> $1::vector) as similarity
            FROM document_chunks 
            WHERE project_id = $2
            AND 1 - (embedding <=> $1::vector) > $3
            ORDER BY embedding <=> $1::vector
            LIMIT $4
            """,
            json.dumps(query_embedding),
            request.project_id,
            request.similarity_threshold,
            request.max_results
        )
        
        await conn.close()
        
        # Generate response using RAG
        response = await rag_service.generate_response(
            request.query,
            [
                {
                    "content": chunk["content"],
                    "metadata": json.loads(chunk["metadata"]),
                    "similarity": float(chunk["similarity"])
                }
                for chunk in similar_chunks
            ]
        )
        
        return QueryResponse(
            query=request.query,
            response=response,
            sources=[
                {
                    "content": chunk["content"][:200] + "...",
                    "similarity": float(chunk["similarity"]),
                    "metadata": json.loads(chunk["metadata"])
                }
                for chunk in similar_chunks[:5]
            ]
        )
        
    except Exception as e:
        logger.error(f"Error querying documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)