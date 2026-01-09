import io
import json
import math
import os
import uuid
from datetime import datetime
from typing import Any, Iterable

from anthropic import Anthropic
from fastapi import HTTPException
from google import genai
from google.genai import types
from openai import OpenAI
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.models.creator_studio import (
    CreatorStudioAppSetting,
    CreatorStudioGuestCredit,
    CreatorStudioKnowledgeChunk,
    CreatorStudioLLMConfig,
)

try:
    import faiss
    import numpy as np
except Exception:
    faiss = None
    np = None


LLAMA_BASE_URL = os.environ.get("LLAMA_BASE_URL", "http://localhost:11434/v1")
GROQ_BASE_URL = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
DEFAULT_GUEST_CREDITS = int(os.environ.get("CREATOR_STUDIO_GUEST_CREDITS", "5"))


class VectorIndex:
    def __init__(self) -> None:
        self.indexes: dict[str, dict[str, object]] = {}

    def _vector_id(self, chunk_id: str) -> int:
        return uuid.UUID(chunk_id).int & 0x7FFFFFFFFFFFFFFF

    def _normalize(self, vectors: Any) -> Any:
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return vectors / norms

    def _ensure_index(self, agent_id: str, dim: int) -> dict[str, object] | None:
        store = self.indexes.get(agent_id)
        if store:
            if store["dim"] != dim:
                return None
            return store
        base = faiss.IndexFlatIP(dim)
        index = faiss.IndexIDMap2(base)
        store = {"index": index, "dim": dim, "texts": {}}
        self.indexes[agent_id] = store
        return store

    def add(self, agent_id: str, chunk_id: str, embedding: list[float], text: str) -> None:
        if faiss is None or np is None:
            return
        vec = np.array(embedding, dtype="float32")
        if vec.ndim != 1 or vec.size == 0:
            return
        store = self._ensure_index(agent_id, vec.size)
        if store is None:
            return
        vec = self._normalize(vec.reshape(1, -1))
        vec_id = self._vector_id(chunk_id)
        store["index"].add_with_ids(vec, np.array([vec_id], dtype="int64"))
        store["texts"][vec_id] = text

    def remove(self, agent_id: str, chunk_ids: list[str]) -> None:
        if faiss is None or np is None or not chunk_ids:
            return
        store = self.indexes.get(agent_id)
        if not store:
            return
        ids = np.array([self._vector_id(chunk_id) for chunk_id in chunk_ids], dtype="int64")
        store["index"].remove_ids(ids)
        texts = store["texts"]
        for vec_id in ids.tolist():
            texts.pop(vec_id, None)

    def drop_agent(self, agent_id: str) -> None:
        self.indexes.pop(agent_id, None)

    def search(self, agent_id: str, embedding: list[float], top_k: int = 4) -> list[str]:
        if faiss is None or np is None:
            return []
        store = self.indexes.get(agent_id)
        if not store:
            return []
        vec = np.array(embedding, dtype="float32")
        if vec.ndim != 1 or vec.size == 0:
            return []
        if vec.size != store["dim"]:
            return []
        vec = self._normalize(vec.reshape(1, -1))
        _, ids = store["index"].search(vec, top_k)
        texts = store["texts"]
        results: list[str] = []
        for vec_id in ids[0]:
            if vec_id == -1:
                continue
            text = texts.get(int(vec_id))
            if text:
                results.append(text)
        return results

    def has_index(self, agent_id: str, dim: int) -> bool:
        store = self.indexes.get(agent_id)
        if not store:
            return False
        if store["dim"] != dim:
            return False
        return store["index"].ntotal > 0


VECTOR_INDEX = VectorIndex() if faiss is not None and np is not None else None


def _coerce_uuid(value: str | uuid.UUID) -> uuid.UUID:
    if isinstance(value, uuid.UUID):
        return value
    return uuid.UUID(str(value))


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
    return "google"


def normalize_model(provider: str, model: str) -> str:
    if "/" in model:
        prefix, name = model.split("/", 1)
        if prefix == provider:
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


def extract_text(file_name: str, data: bytes) -> str:
    lower_name = file_name.lower()
    if lower_name.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages)
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1", errors="ignore")


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 120) -> list[str]:
    normalized = " ".join(text.split())
    if not normalized:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(len(normalized), start + chunk_size)
        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(normalized):
            break
        start = max(0, end - overlap)
    return chunks


def embed_texts(db: Session, texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
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
                embeddings: list[list[float]] = []
                if hasattr(response, "embeddings"):
                    for emb in response.embeddings:
                        embeddings.append(list(emb.values))
                elif hasattr(response, "embedding"):
                    embeddings.append(list(response.embedding.values))
                if embeddings:
                    return embeddings
            except Exception:
                pass
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
            except Exception:
                return []
    return []


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    length = min(len(a), len(b))
    dot = sum(a[i] * b[i] for i in range(length))
    norm_a = math.sqrt(sum(a[i] * a[i] for i in range(length)))
    norm_b = math.sqrt(sum(b[i] * b[i] for i in range(length)))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def build_context(db: Session, agent_id: str | uuid.UUID, query: str) -> list[str]:
    embeddings = embed_texts(db, [query])
    if not embeddings:
        return []
    query_embedding = embeddings[0]
    agent_uuid = _coerce_uuid(agent_id)
    agent_key = str(agent_uuid)
    if VECTOR_INDEX is not None and VECTOR_INDEX.has_index(agent_key, len(query_embedding)):
        results = VECTOR_INDEX.search(agent_key, query_embedding)
        if results:
            return results
    rows = (
        db.query(CreatorStudioKnowledgeChunk)
        .filter(CreatorStudioKnowledgeChunk.agent_id == agent_uuid)
        .all()
    )
    if not rows:
        return []
    scored = []
    for row in rows:
        emb = row.embedding or []
        if not isinstance(emb, list):
            continue
        score = cosine_similarity(query_embedding, emb)
        scored.append((score, row.text))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [text for _, text in scored[:4]]


def build_system_instruction(
    instruction: str,
    context_chunks: list[str],
    inputs_context: str | None = None,
) -> str:
    sections = [instruction]
    if inputs_context and inputs_context.strip():
        sections.append(inputs_context.strip())
    if context_chunks:
        context_block = "\n\n".join(
            f"--- Context {idx + 1} ---\n{chunk}" for idx, chunk in enumerate(context_chunks)
        )
        sections.append(f"Use the following context when relevant:\n{context_block}")
    return "\n\n".join(sections)


def generate_response(provider: str, model: str, system_instruction: str, message: str, api_key: str) -> str:
    if provider == "openai":
        client = get_openai_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": message})
        model_name = normalize_model(provider, model)
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""
    if provider == "llama":
        client = get_llama_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": message})
        model_name = normalize_model(provider, model)
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""
    if provider == "groq":
        client = get_groq_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": message})
        model_name = normalize_model(provider, model)
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""
    if provider == "anthropic":
        client = get_anthropic_client(api_key)
        kwargs = {
            "model": model,
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": message}],
        }
        if system_instruction:
            kwargs["system"] = system_instruction
        response = client.messages.create(**kwargs)
        parts = []
        for block in response.content:
            if block.type == "text":
                parts.append(block.text)
        return "".join(parts)

    client = get_gemini_client(api_key)
    if system_instruction:
        response = client.models.generate_content(
            model=model,
            contents=message,
            config=types.GenerateContentConfig(system_instruction=system_instruction),
        )
    else:
        response = client.models.generate_content(
            model=model,
            contents=message,
        )
    return getattr(response, "text", "") or ""


def stream_response(provider: str, model: str, system_instruction: str, message: str, api_key: str) -> Iterable[bytes]:
    if provider == "openai":
        client = get_openai_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": message})
        model_name = normalize_model(provider, model)
        stream = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta
            text = getattr(delta, "content", None)
            if text:
                yield text.encode("utf-8")
        return

    if provider == "llama":
        client = get_llama_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": message})
        model_name = normalize_model(provider, model)
        stream = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta
            text = getattr(delta, "content", None)
            if text:
                yield text.encode("utf-8")
        return

    if provider == "groq":
        client = get_groq_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": message})
        model_name = normalize_model(provider, model)
        stream = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta
            text = getattr(delta, "content", None)
            if text:
                yield text.encode("utf-8")
        return

    if provider == "anthropic":
        client = get_anthropic_client(api_key)
        kwargs = {
            "model": model,
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": message}],
        }
        if system_instruction:
            kwargs["system"] = system_instruction
        with client.messages.stream(**kwargs) as stream:
            for text in stream.text_stream:
                if text:
                    yield text.encode("utf-8")
        return

    client = get_gemini_client(api_key)
    if system_instruction:
        result = client.models.generate_content_stream(
            model=model,
            contents=message,
            config=types.GenerateContentConfig(system_instruction=system_instruction),
        )
    else:
        result = client.models.generate_content_stream(
            model=model,
            contents=message,
        )
    for chunk in result:
        text = getattr(chunk, "text", "")
        if text:
            yield text.encode("utf-8")


def build_agent_suggest_prompt(payload: dict[str, Any]) -> str:
    name = str(payload.get("name", "")).strip()
    action = payload.get("action", "suggest")
    parts = [f"Agent name: {name}"]
    description = payload.get("description")
    if description:
        parts.append(f"Current description: {str(description).strip()}")
    instruction = payload.get("instruction")
    if instruction:
        parts.append(f"Current instruction: {str(instruction).strip()}")
    notes = payload.get("notes")
    if notes:
        parts.append(f"Creator notes: {str(notes).strip()}")

    if action == "refine":
        parts.append("Action: Refine the current description/instruction for clarity, accuracy, and usefulness while preserving intent.")
    elif action == "regenerate":
        parts.append("Action: Regenerate a fresh description and instruction from scratch.")
    else:
        parts.append("Action: Suggest a concise description and instruction.")

    parts.append("Guidelines:")
    parts.append("- Do NOT mention model names or providers.")
    parts.append("- Description: 1-2 sentences, plain language, outcome-focused.")
    parts.append("- Instruction: 6-10 bullet points, each an imperative behavior rule.")
    parts.append("- Include: scope, tone, when to ask clarifying questions, how to use provided context, and how to handle uncertainty.")
    parts.append("- Avoid listing questions for the user; write agent behavior instead.")
    parts.append("- Include a safety boundary (no legal/medical/financial advice) and a polite fallback for out-of-scope requests.")
    parts.append("Output ONLY JSON with keys: description, instruction.")
    parts.append("Instruction should be a single string with bullets using '-' prefixes.")

    return "".join(parts)


def parse_agent_suggest_response(raw: str, name: str) -> dict[str, str]:
    content = raw.strip()
    data = None
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                data = json.loads(content[start:end + 1])
            except json.JSONDecodeError:
                data = None
    if not isinstance(data, dict):
        fallback_desc = f"{name} assistant."
        fallback_instr = f"You are {name}. Be helpful, concise, and accurate."
        return {"description": fallback_desc, "instruction": fallback_instr}
    description = str(data.get("description", "")).strip() or f"{name} assistant."
    instruction = str(data.get("instruction", "")).strip() or f"You are {name}. Be helpful, concise, and accurate."
    return {"description": description, "instruction": instruction}


def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    return f"{size_bytes / 1024:.1f} KB"


def get_app_setting(db: Session, key: str) -> str | None:
    row = db.get(CreatorStudioAppSetting, key)
    if row is None:
        return None
    return row.value or None


def set_app_setting(db: Session, key: str, value: str) -> None:
    setting = db.get(CreatorStudioAppSetting, key)
    now = datetime.utcnow()
    if setting is None:
        setting = CreatorStudioAppSetting(key=key, value=value)
        db.add(setting)
    else:
        setting.value = value
        setting.updated_at = now
    db.commit()


def get_assist_model(db: Session) -> str | None:
    return get_app_setting(db, "assist_model")


def get_or_create_guest_credits(db: Session, guest_id: str) -> int:
    row = db.get(CreatorStudioGuestCredit, guest_id)
    if row is None:
        row = CreatorStudioGuestCredit(id=guest_id, credits=DEFAULT_GUEST_CREDITS)
        db.add(row)
        db.commit()
        return row.credits
    return row.credits


def add_guest_credits(db: Session, guest_id: str, amount: int) -> int:
    row = db.get(CreatorStudioGuestCredit, guest_id)
    if row is None:
        row = CreatorStudioGuestCredit(id=guest_id, credits=DEFAULT_GUEST_CREDITS)
        db.add(row)
    row.credits += amount
    db.commit()
    return row.credits


def deduct_guest_credits(db: Session, guest_id: str, amount: int) -> None:
    row = db.get(CreatorStudioGuestCredit, guest_id)
    if row is None:
        raise HTTPException(status_code=402, detail="Not enough credits.")
    if row.credits < amount:
        raise HTTPException(status_code=402, detail="Not enough credits.")
    row.credits -= amount
    db.commit()


def seed_llm_configs(db: Session) -> None:
    existing = {row.id for row in db.query(CreatorStudioLLMConfig.id).all()}
    now = datetime.utcnow()
    defaults = [
        {
            "id": "google",
            "name": "Google Gemini API",
            "provider": "google",
            "enabled": True,
            "api_key": "",
            "usage": 45,
            "limit_amount": 1000,
        },
        {
            "id": "openai",
            "name": "OpenAI Platform",
            "provider": "openai",
            "enabled": True,
            "api_key": "",
            "usage": 78,
            "limit_amount": 500,
        },
        {
            "id": "groq",
            "name": "Groq Cloud",
            "provider": "groq",
            "enabled": False,
            "api_key": "",
            "usage": 0,
            "limit_amount": 300,
        },
        {
            "id": "anthropic",
            "name": "Anthropic Console",
            "provider": "anthropic",
            "enabled": False,
            "api_key": "",
            "usage": 12,
            "limit_amount": 200,
        },
        {
            "id": "llama",
            "name": "Llama Gateway",
            "provider": "llama",
            "enabled": False,
            "api_key": "ollama",
            "usage": 0,
            "limit_amount": 300,
        },
    ]
    for config in defaults:
        if config["id"] in existing:
            continue
        db.add(
            CreatorStudioLLMConfig(
                id=config["id"],
                name=config["name"],
                provider=config["provider"],
                enabled=config["enabled"],
                api_key=config["api_key"],
                usage=config["usage"],
                limit_amount=config["limit_amount"],
                created_at=now,
                updated_at=now,
            )
        )
    db.commit()


def build_vector_index(db: Session) -> None:
    if VECTOR_INDEX is None:
        return
    rows = db.query(CreatorStudioKnowledgeChunk).all()
    for row in rows:
        embedding = row.embedding or []
        if not isinstance(embedding, list) or not embedding:
            continue
        try:
            embedding = [float(value) for value in embedding]
        except (TypeError, ValueError):
            continue
        VECTOR_INDEX.add(str(row.agent_id), str(row.id), embedding, row.text)
