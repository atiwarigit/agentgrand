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
    await rag_service.initialize()
    logger.info("RAG service initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Grant Writing AI Service...")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
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
        
        # Stage 3: Generate draft
        await update_job_progress(conn, job_id, "drafting", 60)
        
        grant_data = await draft_generator.generate_initial_draft(
            project_id, all_chunks, conn
        )
        
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
        
        # Generate new section content
        new_content = await draft_generator.regenerate_section(
            request.section,
            [{"content": chunk["content"], "metadata": json.loads(chunk["metadata"])} for chunk in chunks],
            request.custom_prompt,
            json.loads(project["grant_data"]) if project["grant_data"] else {}
        )
        
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