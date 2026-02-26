"""
Embedding generation with multi-provider support and caching
"""
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.services.creator_studio_llm import (
    get_openai_client,
    get_gemini_client,
    get_llm_config,
    resolve_llm_key,
)


def embed_texts(db: Session, texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of texts using available providers.
    
    Priority order:
    1. OpenAI (text-embedding-3-small)
    2. Google (text-embedding-004)
    
    Args:
        db: Database session
        texts: List of text strings to embed
        
    Returns:
        List of embedding vectors (list of floats)
    """
    if not texts:
        return []
    
    # Priority 1: OpenAI
    try:
        openai_row = get_llm_config(db, "openai")
    except HTTPException:
        openai_row = None
        
    if openai_row and openai_row.enabled:
        openai_key = resolve_llm_key("openai", openai_row)
        if openai_key:
            try:
                response = get_openai_client(openai_key).embeddings.create(
                    model="text-embedding-3-small",
                    input=texts,
                )
                return [item.embedding for item in response.data]
            except Exception as e:
                print(f"OpenAI embedding failed: {e}")

    # Priority 2: Google
    try:
        google_row = get_llm_config(db, "google")
    except HTTPException:
        google_row = None
        
    if google_row and google_row.enabled:
        google_key = resolve_llm_key("google", google_row)
        if google_key:
            try:
                response = get_gemini_client(google_key).models.embed_content(
                    model="text-embedding-004",
                    contents=texts,
                )
                embeddings: List[List[float]] = []
                if hasattr(response, "embeddings"):
                    for emb in response.embeddings:
                        embeddings.append(list(emb.values))
                elif hasattr(response, "embedding"):
                    embeddings.append(list(response.embedding.values))
                if embeddings:
                    return embeddings
            except Exception as e:
                print(f"Google embedding failed: {e}")
                
    return []


def embed_texts_cached(db: Session, texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings with Redis caching.
    
    TODO: Implement Redis caching layer for production.
    For now, falls back to direct embedding.
    """
    # TODO: Add Redis caching
    # import redis
    # import hashlib
    # import json
    # 
    # redis_client = redis.Redis(...)
    # 
    # results = []
    # to_embed = []
    # 
    # for text in texts:
    #     key = f"embedding:{hashlib.sha256(text[:500].encode()).hexdigest()[:16]}"
    #     cached = redis_client.get(key)
    #     if cached:
    #         results.append(json.loads(cached))
    #     else:
    #         to_embed.append(text)
    #         results.append(None)
    # 
    # if to_embed:
    #     fresh = embed_texts(db, to_embed)
    #     for i, embedding in enumerate(fresh):
    #         results[i] = embedding
    #         redis_client.setex(key, 86400, json.dumps(embedding))
    
    return embed_texts(db, texts)
