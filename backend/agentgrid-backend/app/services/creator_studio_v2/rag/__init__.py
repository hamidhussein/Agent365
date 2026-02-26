"""
RAG (Retrieval Augmented Generation) Module

Enterprise-grade retrieval system with:
- Multi-query expansion
- Hybrid search with RRF merge
- Confidence-based reranking
- Anti-hallucination controls
"""

from .embeddings import embed_texts
from .retrieval import build_context, VECTOR_INDEX
from .context_builder import build_system_instruction
from .reranking import rerank_chunks

__all__ = [
    "embed_texts",
    "build_context",
    "build_system_instruction",
    "rerank_chunks",
    "VECTOR_INDEX",
]
