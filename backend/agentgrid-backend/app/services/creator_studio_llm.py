# Creator Studio LLM provider/config helpers (extracted from creator_studio.py)
from __future__ import annotations

import os

from anthropic import Anthropic
from fastapi import HTTPException
from google import genai
from openai import OpenAI
from sqlalchemy.orm import Session

from app.models.creator_studio import CreatorStudioLLMConfig

LLAMA_BASE_URL = os.environ.get("LLAMA_BASE_URL", "http://localhost:11434/v1")
GROQ_BASE_URL = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")

def get_gemini_client(api_key: str) -> genai.Client:
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key is not set.")

    return genai.Client(api_key=api_key)

def get_openai_client(api_key: str) -> OpenAI:
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key is not set.")
    return OpenAI(api_key=api_key)

def get_llama_client(api_key: str) -> OpenAI:
    base_url = (LLAMA_BASE_URL or "").strip()
    if not base_url:
        raise HTTPException(status_code=500, detail="LLAMA_BASE_URL is not set.")
    key = api_key or "ollama"
    return OpenAI(api_key=key, base_url=base_url)

def get_groq_client(api_key: str) -> OpenAI:
    base_url = (GROQ_BASE_URL or "").strip()
    if not base_url:
        raise HTTPException(status_code=500, detail="GROQ_BASE_URL is not set.")
    if not api_key:
        raise HTTPException(status_code=500, detail="Groq API key is not set.")
    return OpenAI(api_key=api_key, base_url=base_url)

def get_deepseek_client(api_key: str) -> OpenAI:
    base_url = (DEEPSEEK_BASE_URL or "").strip()
    if not base_url:
        raise HTTPException(status_code=500, detail="DEEPSEEK_BASE_URL is not set.")
    if not api_key:
        raise HTTPException(status_code=500, detail="DeepSeek API key is not set.")
    return OpenAI(api_key=api_key, base_url=base_url)

def get_anthropic_client(api_key: str) -> Anthropic:
    if not api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key is not set.")
    return Anthropic(api_key=api_key)

def infer_provider(model: str) -> str:
    lower = model.lower()
    if lower.startswith("groq/"):
        return "groq"
    if lower.startswith(("gpt-", "o1-", "o3-", "o4-", "chatgpt-")):
        return "openai"
    if lower.startswith("claude"):
        return "anthropic"
    if lower.startswith("gemini"):
        return "google"
    if lower.startswith(("llama", "meta-llama")):
        return "llama"
    if lower.startswith("deepseek"):
        return "deepseek"
    return "google"

def normalize_model(provider: str, model: str) -> str:
    if "/" in model:
        prefix, name = model.split("/", 1)
        if prefix in (provider, "deepseek"):
            return name
    return model

def get_llm_config(db: Session, provider: str) -> CreatorStudioLLMConfig:
    row = db.get(CreatorStudioLLMConfig, provider)
    if row is None:
        raise HTTPException(status_code=404, detail=f"LLM config {provider} not found.")
    return row

def resolve_llm_key(provider: str, row: CreatorStudioLLMConfig) -> str:
    api_key = row.api_key

    if api_key:
        return api_key
    if provider == "llama":
        base_url = (LLAMA_BASE_URL or "").lower()
        if "localhost" in base_url or "127.0.0.1" in base_url:
            return "ollama"
    return ""

def get_provider_for_model(db: Session, model: str) -> str:
    provider = infer_provider(model)
    row = get_llm_config(db, provider)
    if not row.enabled:
        raise HTTPException(status_code=403, detail=f"{provider} models are disabled by admin.")
    api_key = resolve_llm_key(provider, row)
    if not api_key:
        raise HTTPException(status_code=500, detail=f"{provider} API key is not set.")
    return provider

def get_default_enabled_model(db: Session) -> str:
    """
    Returns the module ID for the first enabled provider's default model.
    Prioritizes OpenAI -> Google -> Anthropic -> etc.
    """
    # Check providers in order of preference
    preferred_order = ["openai", "google", "anthropic", "groq", "llama"]
    default_models = {
        "openai": "gpt-4o",
        "google": "gemini-1.5-pro",
        "anthropic": "claude-3-opus",
        "groq": "llama3-70b-8192",
        "llama": "llama3",
    }
    
    for provider in preferred_order:
        row = get_llm_config(db, provider)
        if row and row.enabled:
            return default_models.get(provider, "gpt-3.5-turbo")
            
    # Fallback to OpenAI even if disabled (to prevent total crash, or raise error)
    return "gpt-4o"
