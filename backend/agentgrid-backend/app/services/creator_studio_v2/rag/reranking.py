"""
Confidence-based reranking for RAG results
"""
import logging
import time
from typing import List, Dict
from sqlalchemy.orm import Session

from app.services.creator_studio_llm import (
    get_default_enabled_model,
    infer_provider,
    get_llm_config,
    resolve_llm_key,
)

logger = logging.getLogger(__name__)

# Minimum confidence threshold to include a chunk
MIN_RELEVANCE_THRESHOLD = 0.3


def rerank_chunks(
    db: Session, 
    query: str, 
    chunks: List[Dict], 
    top_n: int = 5
) -> List[Dict]:
    """
    Second-stage reranking with confidence scoring.
    
    Uses a lightweight LLM pass to score each chunk's relevance (0.0–1.0).
    Filters out chunks below MIN_RELEVANCE_THRESHOLD.
    
    Args:
        db: Database session
        query: User's search query
        chunks: List of candidate chunks from retrieval
        top_n: Number of top chunks to return
        
    Returns:
        List of dictionaries with added 'confidence' scores
    """
    if not chunks:
        return []
    if len(chunks) <= top_n:
        return chunks

    # Prepare reranking prompt with confidence scoring
    context_text = "\n\n".join([
        f"ID: {i}\nContent: {c['text'][:500]}" 
        for i, c in enumerate(chunks)
    ])
    
    prompt = (
        f"You are a reranking assistant. Given a user query and a set of document chunks, "
        f"score each chunk's relevance to the query on a scale of 0.0 to 1.0.\n\n"
        f"Query: {query}\n\n"
        f"Chunks:\n{context_text}\n\n"
        f"Return ONLY a comma-separated list of ID:SCORE pairs, sorted by score descending.\n"
        f"Example: 3:0.95, 0:0.82, 5:0.41, 1:0.15\n"
        f"Include ALL chunk IDs. Do NOT add any other text."
    )

    start_time = time.perf_counter()
    
    try:
        # Import here to avoid circular dependency
        from app.services.creator_studio.llm.router import generate_response
        
        model = get_default_enabled_model(db)
        provider = infer_provider(model)
        config = get_llm_config(db, provider)
        api_key = resolve_llm_key(provider, config)
        
        response = generate_response(
            provider, 
            model, 
            "You are a reranking expert.", 
            prompt, 
            api_key, 
            db=db
        )
        
        # Parse ID:SCORE pairs
        try:
            scored = []
            for pair in response.split(","):
                pair = pair.strip()
                if ":" in pair:
                    parts = pair.split(":")
                    idx = int(parts[0].strip())
                    score = float(parts[1].strip())
                    if idx < len(chunks) and score >= MIN_RELEVANCE_THRESHOLD:
                        chunk_copy = dict(chunks[idx])
                        chunk_copy["confidence"] = round(score, 3)
                        scored.append(chunk_copy)
                elif pair.strip().isdigit():
                    # Fallback: plain ID without score
                    idx = int(pair.strip())
                    if idx < len(chunks):
                        chunk_copy = dict(chunks[idx])
                        chunk_copy["confidence"] = 0.5
                        scored.append(chunk_copy)
            
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.info(
                "rag_rerank input_count=%d output_count=%d filtered_count=%d time_ms=%d",
                len(chunks), len(scored), len(chunks) - len(scored), elapsed_ms
            )
            return scored[:top_n] if scored else chunks[:top_n]
            
        except Exception as parse_error:
            logger.warning("rag_rerank_parse_failed response=%r error=%s", 
                          response[:200], parse_error)
            return chunks[:top_n]
            
    except Exception as e:
        logger.warning("rag_rerank_failed error=%s", e)
        return chunks[:top_n]
