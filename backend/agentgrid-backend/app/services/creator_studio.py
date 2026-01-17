import io
import json
import math
import os
import re
import uuid
from datetime import datetime
from typing import Any, Iterable, List

from anthropic import Anthropic
from bs4 import BeautifulSoup
from docx import Document
from fastapi import HTTPException
import requests
from google import genai
from google.genai import types
from openai import OpenAI
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.creator_studio import (
    CreatorStudioAppSetting,
    CreatorStudioGuestCredit,
    CreatorStudioKnowledgeChunk,
    CreatorStudioLLMConfig,
)

# Optional dependencies for vector storage
try:
    import lancedb
    import pyarrow as pa
except ImportError:
    lancedb = None
    pa = None

def get_app_setting(db: Session, key: str) -> str | None:
    setting = db.query(CreatorStudioAppSetting).filter(CreatorStudioAppSetting.key == key).first()
    return setting.value if setting else None

def set_app_setting(db: Session, key: str, value: str):
    setting = db.query(CreatorStudioAppSetting).filter(CreatorStudioAppSetting.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = CreatorStudioAppSetting(key=key, value=value)
        db.add(setting)
    db.commit()

def perform_web_search(query: str, db: Session | None = None) -> str:
    print(f"Executing web search for: {query}")
    settings = get_settings()
    
    # Priority 1: Check Database if session is provided
    serpapi_key = None
    google_key = None
    google_cx = None
    
    if db:
        serpapi_key = get_app_setting(db, "SERPAPI_KEY")
        google_key = get_app_setting(db, "GOOGLE_SEARCH_API_KEY")
        google_cx = get_app_setting(db, "GOOGLE_SEARCH_CX")
    
    # Priority 2: Fallback to get_settings()
    serpapi_key = serpapi_key or settings.SERPAPI_KEY
    google_key = google_key or settings.GOOGLE_SEARCH_API_KEY
    google_cx = google_cx or settings.GOOGLE_SEARCH_CX

    # 1. Try SerpApi (Professional Google search)
    if serpapi_key:
        try:
            print("Using SerpApi for search...")
            params = {
                "q": query,
                "api_key": serpapi_key,
                "engine": "google",
                "num": 4
            }
            response = requests.get("https://serpapi.com/search", params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            results = []
            # Organic results
            for result in data.get("organic_results", []):
                title = result.get("title", "No Title")
                link = result.get("link", "#")
                snippet = result.get("snippet", "")
                results.append(f"Title: {title}\nURL: {link}\nSnippet: {snippet}")
                if len(results) >= 4:
                    break
            
            if results:
                return "\n\n".join(results)
        except Exception as e:
            print(f"SerpApi error: {e}")

    # 2. Try Google Custom Search
    if google_key and google_cx:
        try:
            print("Using Google Custom Search...")
            params = {
                "q": query,
                "key": google_key,
                "cx": google_cx,
                "num": 4
            }
            response = requests.get("https://www.googleapis.com/customsearch/v1", params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for item in data.get("items", []):
                title = item.get("title", "No Title")
                link = item.get("link", "#")
                snippet = item.get("snippet", "")
                results.append(f"Title: {title}\nURL: {link}\nSnippet: {snippet}")
            
            if results:
                return "\n\n".join(results)
        except Exception as e:
            print(f"Google Search error: {e}")

    # 3. Fallback to DuckDuckGo (Robust Library)
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=4))
            if results:
                formatted = []
                for r in results:
                    title = r.get('title', 'No Title')
                    href = r.get('href', '#')
                    snippet = r.get('body', '')
                    formatted.append(f"Title: {title}\nURL: {href}\nSnippet: {snippet}")
                return "\n\n".join(formatted)
    except Exception as e:
        print(f"DDGS error: {e}")

    # 4. Final Fallback (Scraping)
    url = "https://html.duckduckgo.com/html/"
    payload = {'q': query}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        resp = requests.post(url, data=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.text, "html.parser")
        results = []
        for res in soup.find_all("div", class_="result"):
            title_tag = res.find("a", class_="result__a")
            if not title_tag:
                continue
            title = title_tag.get_text(strip=True)
            href = title_tag['href']
            
            snippet_tag = res.find("a", class_="result__snippet")
            snippet = snippet_tag.get_text(strip=True) if snippet_tag else ""
            
            results.append(f"Title: {title}\nURL: {href}\nSnippet: {snippet}")
            if len(results) >= 3:
                break
        
        if not results:
            return "No results found."
            
        return "\n\n".join(results)
    except Exception as e:
        print(f"Final search fail: {e}")
        return f"Search failed: {str(e)}"


# Global storage for generated files (execution_id -> list of file paths)
GENERATED_FILES = {}

def execute_python_code(code: str, execution_id: str) -> str:
    """
    Executes Python code in a temporary directory and captures stdout + generated files.
    Returns a formatted string with output and download links.
    """
    import tempfile
    import subprocess
    import sys
    
    print(f"Executing Python code for execution {execution_id}...")
    
    # Create temp directory
    with tempfile.TemporaryDirectory() as tmpdir:
        code_file = os.path.join(tmpdir, "script.py")
        
        # Write code to file
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)
        
        try:
            # Run code with subprocess for safety
            result = subprocess.run(
                [sys.executable, code_file],
                cwd=tmpdir,
                capture_output=True,
                text=True,
                timeout=30,  # 30 second timeout
            )
            
            stdout = result.stdout
            stderr = result.stderr
            
            # Check for generated files
            files_before = set()
            files_after = set(os.listdir(tmpdir))
            generated = files_after - files_before - {"script.py"}
            
            # Actually, we need to list files after execution
            all_files = [f for f in os.listdir(tmpdir) if f != "script.py" and os.path.isfile(os.path.join(tmpdir, f))]
            
            # Copy generated files to a persistent location
            output_dir = os.path.join(os.getcwd(), ".generated_files", execution_id)
            os.makedirs(output_dir, exist_ok=True)
            
            file_links = []
            for filename in all_files:
                src = os.path.join(tmpdir, filename)
                dst = os.path.join(output_dir, filename)
                import shutil
                shutil.copy(src, dst)
                # Store reference
                file_links.append(f"[Download {filename}](/api/creator-studio/files/{execution_id}/{filename})")
            
            # Store in global dict
            GENERATED_FILES[execution_id] = [os.path.join(output_dir, f) for f in all_files]
            
            # Format output
            output_parts = []
            if stdout:
                output_parts.append(f"**Output:**\n```\n{stdout}\n```")
            if stderr:
                output_parts.append(f"**Errors:**\n```\n{stderr}\n```")
            if file_links:
                output_parts.append(f"**Generated Files:**\n" + "\n".join(file_links))
            
            if not output_parts:
                return "Code executed successfully (no output)."
            
            return "\n\n".join(output_parts)
            
        except subprocess.TimeoutExpired:
            return "Error: Code execution timed out (30s limit)."
        except Exception as e:
            print(f"Code execution error: {e}")
            return f"Error executing code: {str(e)}"


LANCE_DB_PATH = os.path.join(os.getcwd(), ".lancedb")
LLAMA_BASE_URL = os.environ.get("LLAMA_BASE_URL", "http://localhost:11434/v1")
GROQ_BASE_URL = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEFAULT_GUEST_CREDITS = int(os.environ.get("CREATOR_STUDIO_GUEST_CREDITS", "5"))


class VectorIndex:
    def __init__(self) -> None:
        self.db = None
        self.table = None
        if lancedb is not None:
            try:
                if not os.path.exists(LANCE_DB_PATH):
                    os.makedirs(LANCE_DB_PATH)
                self.db = lancedb.connect(LANCE_DB_PATH)
                self._ensure_table()
            except Exception as e:
                print(f"Failed to initialize LanceDB: {e}")

    def _ensure_table(self):
        if self.db is None:
            return
        table_name = "knowledge_chunks"
        if table_name not in self.db.table_names():
            # Define schema: vector, id (chunk_id), agent_id, text
            schema = pa.schema([
                pa.field("vector", pa.list_(pa.float32())),
                pa.field("id", pa.string()),
                pa.field("agent_id", pa.string()),
                pa.field("text", pa.string()),
            ])
            self.table = self.db.create_table(table_name, schema=schema)
        else:
            self.table = self.db.open_table(table_name)

    def add(self, agent_id: str, chunk_id: str, embedding: list[float], text: str) -> None:
        if self.table is None:
            return
        try:
            self.table.add([{
                "vector": embedding,
                "id": str(chunk_id),
                "agent_id": str(agent_id),
                "text": text
            }])
        except Exception as e:
            print(f"Error adding to VectorIndex: {e}")

    def remove(self, agent_id: str, chunk_ids: list[str]) -> None:
        if self.table is None:
            return
        try:
            # Filter by IDs and Agent ID
            ids_str = ", ".join([f"'{cid}'" for cid in chunk_ids])
            self.table.delete(f"id IN ({ids_str}) AND agent_id = '{agent_id}'")
        except Exception as e:
            print(f"Error removing from VectorIndex: {e}")

    def drop_agent(self, agent_id: str) -> None:
        if self.table is None:
            return
        try:
            self.table.delete(f"agent_id = '{agent_id}'")
        except Exception as e:
            print(f"Error dropping agent from VectorIndex: {e}")

    def search(self, agent_id: str, embedding: list[float], top_k: int = 4) -> list[str]:
        if self.table is None or not embedding:
            return []
        try:
            results = (
                self.table.search(embedding)
                .where(f"agent_id = '{agent_id}'")
                .limit(top_k)
                .to_list()
            )
            return [r["text"] for r in results]
        except Exception as e:
            print(f"Error searching VectorIndex: {e}")
            return []

    def has_index(self, agent_id: str, dim: int) -> bool:
        if self.table is None:
            return False
        try:
            count = len(self.table.search().where(f"agent_id = '{agent_id}'").limit(1).to_list())
            return count > 0
        except Exception:
            return False

    def is_empty(self) -> bool:
        if self.table is None:
            return True
        try:
            return self.table.count_rows() == 0
        except Exception:
            return True


VECTOR_INDEX = VectorIndex() if lancedb is not None else None


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


def extract_text(file_name: str, data: bytes) -> str:
    lower_name = file_name.lower()
    if lower_name.endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(data))
            pages = [page.extract_text() or "" for page in reader.pages]
            return "\n".join(pages)
        except Exception as e:
            print(f"Error extracting PDF: {e}")
            return ""
    if lower_name.endswith(".docx"):
        try:
            doc = Document(io.BytesIO(data))
            return "\n".join([p.text for p in doc.paragraphs])
        except Exception as e:
            print(f"Error extracting DOCX: {e}")
            return ""
    if lower_name.endswith((".html", ".htm")):
        try:
            soup = BeautifulSoup(data, "html.parser")
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            return soup.get_text(separator="\n", strip=True)
        except Exception as e:
            print(f"Error extracting HTML: {e}")
            return ""
            
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1", errors="ignore")


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 120) -> list[str]:
    """
    Recursive character text splitter logic to maintain semantic integrity.
    Splits by paragraph, then sentence, then space, then character.
    """
    if not text or not text.strip():
        return []

    separators = ["\n\n", "\n", ". ", " ", ""]
    
    def split_recursive(content: str, seps: List[str]) -> List[str]:
        if len(content) <= chunk_size:
            return [content]
        
        if not seps:
            # Last resort: split by character limit
            return [content[i:i+chunk_size] for i in range(0, len(content), chunk_size - overlap)]

        current_sep = seps[0]
        remaining_seps = seps[1:]
        
        # Split by current separator
        if current_sep:
            parts = content.split(current_sep)
        else:
            parts = list(content)

        final_chunks = []
        current_chunk = ""
        
        for part in parts:
            # If a single part is already too long, recurse further on it
            if len(part) > chunk_size:
                if current_chunk:
                    final_chunks.append(current_chunk.strip())
                    current_chunk = ""
                final_chunks.extend(split_recursive(part, remaining_seps))
                continue

            # Check if adding this part overflows the chunk size
            if len(current_chunk) + len(part) + len(current_sep) <= chunk_size:
                if current_chunk:
                    current_chunk += current_sep + part
                else:
                    current_chunk = part
            else:
                if current_chunk:
                    final_chunks.append(current_chunk.strip())
                current_chunk = part
                
        if current_chunk:
            final_chunks.append(current_chunk.strip())
            
        return final_chunks

    # Initial split and filter empty
    all_chunks = split_recursive(text, separators)
    
    # Post-process to ensure overlap and size
    # For now, we return the recursive split which is already much better than fixed character split.
    return [c for c in all_chunks if c.strip()]


def embed_texts(db: Session, texts: list[str]) -> list[list[float]]:
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
                pass

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
                embeddings: list[list[float]] = []
                if hasattr(response, "embeddings"):
                    for emb in response.embeddings:
                        embeddings.append(list(emb.values))
                elif hasattr(response, "embedding"):
                    embeddings.append(list(response.embedding.values))
                if embeddings:
                    return embeddings
            except Exception as e:
                print(f"Google embedding failed: {e}")
                pass
                
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
    capabilities: dict | None = None,
) -> str:
    current_time_str = datetime.now().strftime("%A, %B %d, %Y %I:%M %p")
    sections = [f"Current Date and Time: {current_time_str}", instruction]
    if inputs_context and inputs_context.strip():
        sections.append(inputs_context.strip())
    if context_chunks:
        context_block = "\n\n".join(
            f"--- Context {idx + 1} ---\n{chunk}" for idx, chunk in enumerate(context_chunks)
        )
        sections.append(f"Use the following context when relevant:\n{context_block}")
    
    if capabilities:
        if capabilities.get("webBrowsing"):
            sections.append("FEATURE ENABLED: Web Search. You have access to a web search tool. Use it ONLY when the user explicitly asks for current information (e.g., news, weather, recent events) or when your internal knowledge cut-off prevents you from answering accurately. Do NOT use it for general knowledge, coding help, or creative tasks unless specifically requested. Always prioritize your internal knowledge.")
        if capabilities.get("codeExecution"):
            sections.append("FEATURE ENABLED: Code Execution. You can write and execute Python code blocks to perform complex calculations, data analysis, or visualizations.")
        if capabilities.get("apiIntegrations"):
            sections.append("FEATURE ENABLED: API Integrations. You can interact with external services and APIs if specific tool definitions are provided.")
        if capabilities.get("fileHandling"):
            sections.append("FEATURE ENABLED: File Handling. The user may upload files to provide context. Use this file content to answer their questions.")

    return "\n\n".join(sections)


def generate_response(provider: str, model: str, system_instruction: str, message: str, api_key: str, db: Session | None = None, history: list[dict] | None = None) -> str:
    if provider == "openai":
        client = get_openai_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        
        if history:
            for m in history:
                role = "assistant" if m["role"] == "model" else m["role"]
                messages.append({"role": role, "content": m["content"]})
            
        messages.append({"role": "user", "content": message})
        model_name = normalize_model(provider, model)

        tools = []
        if system_instruction:
            if "FEATURE ENABLED: Web Search" in system_instruction:
                tools.append({
                    "type": "function",
                    "function": {
                        "name": "web_search",
                        "description": "Search the web for real-time information.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "The search query"}
                            },
                            "required": ["query"]
                        }
                    }
                })
            if "FEATURE ENABLED: Code Execution" in system_instruction:
                tools.append({
                    "type": "function",
                    "function": {
                        "name": "run_python",
                        "description": "Execute Python code to perform calculations, data analysis, or generate files.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "code": {"type": "string", "description": "The Python code to execute"}
                            },
                            "required": ["code"]
                        }
                    }
                })
        
        if not tools:
            tools = None

        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
            tools=tools,
        )

        # Handle tool calls for non-streaming response
        if response.choices[0].message.tool_calls:
            tool_call = response.choices[0].message.tool_calls[0]
            if tool_call.function.name == "web_search":
                import json
                try:
                    decoder = json.JSONDecoder()
                    args, _ = decoder.raw_decode(tool_call.function.arguments)
                    query = args.get("query")
                    
                    search_result = perform_web_search(query, db=db)
                    
                    # Call again with tool results
                    messages.append(response.choices[0].message)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": "web_search",
                        "content": search_result
                    })
                    
                    final_response = client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        max_tokens=1024
                    )
                    return final_response.choices[0].message.content or ""
                except Exception as e:
                    print(f"Tool execution error: {e}")
                    return f"Error executing tool: {e}"

        return response.choices[0].message.content or ""
    if provider == "llama":
        client = get_llama_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        if history:
            for m in history:
                role = "assistant" if m["role"] == "model" else m["role"]
                messages.append({"role": role, "content": m["content"]})
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
        if history:
            for m in history:
                role = "assistant" if m["role"] == "model" else m["role"]
                messages.append({"role": role, "content": m["content"]})
        messages.append({"role": "user", "content": message})
        model_name = normalize_model(provider, model)
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""
    if provider == "deepseek":
        client = get_deepseek_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        if history:
            for m in history:
                role = "assistant" if m["role"] == "model" else m["role"]
                messages.append({"role": role, "content": m["content"]})
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
            "messages": [],
        }
        if history:
            for m in history:
                role = "assistant" if m["role"] == "model" else m["role"]
                kwargs["messages"].append({"role": role, "content": m["content"]})
        kwargs["messages"].append({"role": "user", "content": message})
        if system_instruction:
            kwargs["system"] = system_instruction
        response = client.messages.create(**kwargs)
        parts = []
        for block in response.content:
            if block.type == "text":
                parts.append(block.text)
        return "".join(parts)

    client = get_gemini_client(api_key)
    contents = []
    if history:
        for m in history:
            role = "model" if m["role"] == "assistant" else m["role"]
            contents.append({"role": role, "parts": [{"text": m["content"]}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    if system_instruction:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system_instruction),
        )
    else:
        response = client.models.generate_content(
            model=model,
            contents=contents,
        )
    return getattr(response, "text", "") or ""


def stream_response(provider: str, model: str, system_instruction: str, message: str, api_key: str, execution_id: str = None, db: Session | None = None, history: list[dict] | None = None) -> Iterable[bytes]:
    if provider == "openai":
        client = get_openai_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        
        if history:
            for m in history:
                role = "assistant" if m["role"] == "model" else m["role"]
                messages.append({"role": role, "content": m["content"]})

        messages.append({"role": "user", "content": message})
        model_name = normalize_model(provider, model)

        tools = []
        if system_instruction:
            if "FEATURE ENABLED: Web Search" in system_instruction:
                tools.append({
                    "type": "function",
                    "function": {
                        "name": "web_search",
                        "description": "Search the web for real-time information.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "The search query"}
                            },
                            "required": ["query"]
                        }
                    }
                })
            if "FEATURE ENABLED: Code Execution" in system_instruction:
                tools.append({
                    "type": "function",
                    "function": {
                        "name": "run_python",
                        "description": "Execute Python code to perform calculations, data analysis, or generate files.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "code": {"type": "string", "description": "The Python code to execute"}
                            },
                            "required": ["code"]
                        }
                    }
                })
        
        if not tools:
            tools = None

        stream = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
            stream=True,
            tools=tools,
        )

        tool_call_id = None
        tool_name = None
        tool_args_list = []

        for chunk in stream:
            delta = chunk.choices[0].delta
            
            # Handle Tool Calls
            if delta.tool_calls:
                tc = delta.tool_calls[0]
                if tc.id:
                    tool_call_id = tc.id
                    tool_name = tc.function.name
                if tc.function.arguments:
                    tool_args_list.append(tc.function.arguments)
                continue
            
            text = getattr(delta, "content", None)
            if text:
                yield text.encode("utf-8")

        # Execute tool if needed
        if tool_call_id and tool_name == "web_search":
            args_str = "".join(tool_args_list)
            import json
            try:
                decoder = json.JSONDecoder()
                args, _ = decoder.raw_decode(args_str)
                query = args.get("query")
                yield f"\n\n_Searching for: {query}..._\n\n".encode("utf-8")
                
                search_result = perform_web_search(query, db=db)
                
                # Append tool messages
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [{
                        "id": tool_call_id,
                        "type": "function",
                        "function": {"name": tool_name, "arguments": args_str}
                    }]
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": search_result
                })
                
                # Second stream with search results
                stream2 = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    stream=True
                )
                for chunk in stream2:
                    delta = chunk.choices[0].delta
                    text = getattr(delta, "content", None)
                    if text:
                        yield text.encode("utf-8")
                        
            except Exception as e:
                yield f"\n[Search failed: {e}]".encode("utf-8")
        
        # Execute run_python tool if needed
        if tool_call_id and tool_name == "run_python":
            args_str = "".join(tool_args_list)
            import json
            try:
                decoder = json.JSONDecoder()
                args, _ = decoder.raw_decode(args_str)
                code = args.get("code")
                yield f"\n\n_Executing Python code..._\n\n".encode("utf-8")
                
                # Execute code
                if execution_id:
                    code_result = execute_python_code(code, execution_id)
                else:
                    code_result = "Error: No execution ID available for file storage."
                
                # Append tool messages
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [{
                        "id": tool_call_id,
                        "type": "function",
                        "function": {"name": tool_name, "arguments": args_str}
                    }]
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": code_result
                })
                
                # Second stream with code results
                stream2 = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    stream=True
                )
                for chunk in stream2:
                    delta = chunk.choices[0].delta
                    text = getattr(delta, "content", None)
                    if text:
                        yield text.encode("utf-8")
                        
            except Exception as e:
                yield f"\n[Code execution failed: {e}]".encode("utf-8")
        return

    if provider == "llama":
        client = get_llama_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        if history:
            for m in history:
                role = "assistant" if m["role"] == "model" else m["role"]
                messages.append({"role": role, "content": m["content"]})
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
        if history:
            for m in history:
                role = "assistant" if m["role"] == "model" else m["role"]
                messages.append({"role": role, "content": m["content"]})
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

    if provider == "deepseek":
        client = get_deepseek_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        if history:
            for m in history:
                role = "assistant" if m["role"] == "model" else m["role"]
                messages.append({"role": role, "content": m["content"]})
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
            "messages": [],
        }
        if history:
            for m in history:
                role = "assistant" if m["role"] == "model" else m["role"]
                kwargs["messages"].append({"role": role, "content": m["content"]})
        kwargs["messages"].append({"role": "user", "content": message})
        if system_instruction:
            kwargs["system"] = system_instruction
        with client.messages.stream(**kwargs) as stream:
            for text in stream.text_stream:
                if text:
                    yield text.encode("utf-8")
        return

    client = get_gemini_client(api_key)
    contents = []
    if history:
        for m in history:
            role = "model" if m["role"] == "assistant" else m["role"]
            contents.append({"role": role, "parts": [{"text": m["content"]}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    if system_instruction:
        result = client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system_instruction),
        )
    else:
        result = client.models.generate_content_stream(
            model=model,
            contents=contents,
        )
    for chunk in result:
        text = getattr(chunk, "text", "")
        if text:
            yield text.encode("utf-8")


def build_agent_suggest_prompt(payload: dict[str, Any]) -> str:
    name = str(payload.get("name", "")).strip()
    description = str(payload.get("description", "")).strip()
    instruction = str(payload.get("instruction", "")).strip()
    notes = str(payload.get("notes", "")).strip()
    model_id = str(payload.get("model", "")).lower()

    parts = [f"Agent name: {name}"]
    
    if description:
        parts.append(f"Current description: {description}")
    if instruction:
        parts.append(f"Current instructions: {instruction}")
        
    if notes:
        parts.append(f"Creator's requests/notes for this update: {notes}")
        parts.append("Action: Refine the agent based on these notes while keeping the existing quality.")
    elif description or instruction:
        parts.append("Action: Improve and polish the current agent metadata.")
    else:
        parts.append("Action: Generate a fresh, high-quality description and instruction set.")

    capabilities = payload.get("enabledCapabilities")
    if capabilities:
        enabled = []
        if capabilities.get("webBrowsing"): enabled.append("Web Search")
        if capabilities.get("codeExecution"): enabled.append("Code Execution")
        if capabilities.get("apiIntegrations"): enabled.append("API Integrations")
        if enabled:
            parts.append(f"\nNote for AI: The following special features are ENABLED for this agent: {', '.join(enabled)}. Please ensure your generated description and instructions reflect these capabilities.")

    # Guidance based on model capabilities
    if "gpt" in model_id or "gemini" in model_id:
        parts.append("\nNote for AI: The selected model supports Code Execution, Web Browsing, and Advanced File Handling. You can suggest technical or data-heavy tasks.")
    elif "claude" in model_id:
        parts.append("\nNote for AI: The selected model is excellent at conversational nuances and text analysis but has limited web/code execution support. Focus on personality and deep reasoning.")
    elif "deepseek" in model_id:
        parts.append("\nNote for AI: The selected model is specialized in Deep Analysis and Coding. Emphasize these strengths in the instructions.")
    else:
        parts.append("\nNote for AI: Focus on general text generation and summarization, as this model has limited tool support.")

    parts.append("\nGuidelines:")
    parts.append("- Output ONLY valid JSON with keys: \"description\", \"instruction\".")
    parts.append("- Description: 1-2 professional sentences focused on user outcomes.")
    parts.append("- Instruction: A single string using '-' bullet points for clarity (8-12 rules).")
    parts.append("- DO NOT mention specific model names or technical providers in the description/instruction themselves.")
    parts.append("- Include: tone of voice, scope of knowledge, when to ask for clarification, and a polite fallback for out-of-scope requests.")

    return "\n".join(parts)


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
        {
            "id": "deepseek",
            "name": "DeepSeek API",
            "provider": "deepseek",
            "enabled": False,
            "api_key": "",
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
    
    # Since LanceDB is persistent, only rebuild if empty
    if not VECTOR_INDEX.is_empty():
        print("Vector index already populated, skipping rebuild.")
        return

    print("Populating vector index from database...")
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
    print(f"Vector index population complete. Added {len(rows)} chunks.")
