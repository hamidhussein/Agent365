"""
Creator Studio - Modular AI Agent Builder

Refactored from monolithic creator_studio.py into organized modules.
"""

from .core import (
    get_app_setting,
    set_app_setting,
    sanitize_user_input,
)

from .rag.embeddings import embed_texts
from .rag.retrieval import build_context
from .rag.context_builder import build_system_instruction

from .execution.sandbox import execute_python_code, cleanup_generated_files
from .execution.file_manager import GENERATED_FILES, GENERATED_FILES_DIR

from .search.web_search import perform_web_search

from .llm.providers import (
    get_gemini_client,
    get_openai_client,
    get_anthropic_client,
    get_llama_client,
    get_groq_client,
    get_deepseek_client,
)
from .llm.router import (
    generate_response,
    stream_response,
    get_default_enabled_model,
    get_assist_model,
    get_llm_config,
    get_provider_for_model,
    resolve_llm_key,
)

from .architect.conversation import build_agent_chat
from .architect.instruction_gen import (
    build_agent_suggest_prompt,
    parse_agent_suggest_response,
)

# Legacy compatibility - re-export vector index
from .rag.retrieval import VECTOR_INDEX

__all__ = [
    # Core
    "get_app_setting",
    "set_app_setting",
    "sanitize_user_input",
    
    # RAG
    "embed_texts",
    "build_context",
    "build_system_instruction",
    "VECTOR_INDEX",
    
    # Execution
    "execute_python_code",
    "cleanup_generated_files",
    "GENERATED_FILES",
    "GENERATED_FILES_DIR",
    
    # Search
    "perform_web_search",
    
    # LLM
    "get_gemini_client",
    "get_openai_client",
    "get_anthropic_client",
    "get_llama_client",
    "get_groq_client",
    "get_deepseek_client",
    "generate_response",
    "stream_response",
    "get_default_enabled_model",
    "get_assist_model",
    "get_llm_config",
    "get_provider_for_model",
    "resolve_llm_key",
    
    # Architect
    "build_agent_chat",
    "build_agent_suggest_prompt",
    "parse_agent_suggest_response",
]
