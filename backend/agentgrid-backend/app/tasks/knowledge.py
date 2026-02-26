"""
Background tasks for knowledge base processing
"""
import uuid
from datetime import datetime
from app.tasks import celery_app
from app.db.session import SessionLocal
from app.models.creator_studio import CreatorStudioKnowledgeFile, CreatorStudioKnowledgeChunk
from app.services.creator_studio_files import extract_text, chunk_text
from app.services.creator_studio.rag.embeddings import embed_texts
from app.services.creator_studio.rag.retrieval import VECTOR_INDEX


@celery_app.task(bind=True, max_retries=3)
def process_knowledge_file(
    self,
    agent_id: str,
    file_id: str,
    filename: str,
    data: bytes
):
    """
    Process uploaded file: extract text, chunk, embed, and index.
    
    Retries up to 3 times on failure with exponential backoff.
    """
    db = SessionLocal()
    try:
        # Extract text from file
        text = extract_text(filename, data)
        
        # Chunk text
        chunks = chunk_text(text)
        
        # Generate embeddings
        embeddings = embed_texts(db, chunks)
        
        # Prepare metadata
        chunk_metadata = {
            "source": filename,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Save chunks to database and vector index
        for idx, chunk in enumerate(chunks):
            embedding = embeddings[idx] if idx < len(embeddings) else []
            chunk_id = uuid.uuid4()
            
            # Save to SQLAlchemy
            chunk_row = CreatorStudioKnowledgeChunk(
                id=chunk_id,
                file_id=uuid.UUID(file_id),
                agent_id=uuid.UUID(agent_id),
                chunk_index=idx,
                text=chunk,
                embedding=embedding,
                chunk_metadata=chunk_metadata
            )
            db.add(chunk_row)
            
            # Save to VectorIndex
            if VECTOR_INDEX is not None and embedding:
                VECTOR_INDEX.add(
                    agent_id,
                    str(chunk_id),
                    embedding,
                    chunk,
                    chunk_metadata
                )
        
        db.commit()
        
        return {
            "status": "success",
            "chunks_processed": len(chunks),
            "file_id": file_id
        }
        
    except Exception as exc:
        db.rollback()
        # Retry with exponential backoff: 60s, 120s, 240s
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        
    finally:
        db.close()


@celery_app.task
def cleanup_old_files():
    """
    Cleanup old generated files and orphaned knowledge chunks.
    
    Runs daily to free up storage.
    """
    from app.services.creator_studio.execution.file_manager import cleanup_generated_files
    
    deleted_count = cleanup_generated_files()
    
    return {
        "status": "success",
        "files_deleted": deleted_count
    }
