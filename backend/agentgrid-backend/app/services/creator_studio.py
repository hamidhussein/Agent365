import io
import json
import math
import os
import re
import uuid
import time
import logging
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
from app.db.session import SessionLocal
from app.models.code_execution_log import CodeExecutionLog
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
GENERATED_FILES_DIR = os.path.join(os.getcwd(), ".generated_files")
logger = logging.getLogger(__name__)


def _maybe_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError):
        return None


def _record_code_execution(
    execution_id: str,
    status: str,
    duration_ms: int | None = None,
    stdout_len: int = 0,
    stderr_len: int = 0,
    file_count: int = 0,
    total_file_bytes: int = 0,
    error_message: str | None = None,
    agent_id: str | None = None,
    user_id: str | None = None,
    sandboxed: bool = False,
    docker_image: str | None = None,
) -> None:
    db = SessionLocal()
    try:
        log = CodeExecutionLog(
            id=uuid.uuid4(),
            execution_id=str(execution_id),
            tool_name="run_python",
            status=status,
            duration_ms=duration_ms,
            stdout_len=stdout_len,
            stderr_len=stderr_len,
            file_count=file_count,
            total_file_bytes=total_file_bytes,
            error_message=error_message[:1024] if error_message else None,
            sandboxed=sandboxed,
            docker_image=docker_image,
            agent_id=_maybe_uuid(agent_id),
            user_id=_maybe_uuid(user_id),
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("code_exec_log_failed execution_id=%s", execution_id)
    finally:
        db.close()

def cleanup_generated_files() -> int:
    def _env_int(name: str, default: int) -> int:
        try:
            return int(os.environ.get(name, default))
        except (TypeError, ValueError):
            return default

    ttl_seconds = _env_int("CODE_EXECUTION_CLEANUP_TTL_SECONDS", 86400)
    max_dirs = _env_int("CODE_EXECUTION_CLEANUP_MAX_DIRS", 2000)
    max_delete = _env_int("CODE_EXECUTION_CLEANUP_MAX_DELETE", 50)

    if ttl_seconds <= 0:
        return 0
    if not os.path.isdir(GENERATED_FILES_DIR):
        return 0

    now = time.time()
    cutoff = now - ttl_seconds
    entries: list[tuple[float, str]] = []

    try:
        with os.scandir(GENERATED_FILES_DIR) as it:
            for entry in it:
                if len(entries) >= max_dirs:
                    break
                if not entry.is_dir():
                    continue
                try:
                    mtime = entry.stat().st_mtime
                except OSError:
                    continue
                if mtime < cutoff:
                    entries.append((mtime, entry.path))
    except OSError:
        return 0

    if not entries:
        return 0

    entries.sort(key=lambda item: item[0])
    deleted = 0
    for _, path in entries:
        if deleted >= max_delete:
            break
        try:
            import shutil
            shutil.rmtree(path, ignore_errors=True)
            deleted += 1
        except Exception:
            continue

    if deleted:
        logger.info("code_exec_cleanup_deleted=%s", deleted)
    return deleted

def execute_python_code(code: str, execution_id: str, agent_id: str | None = None, user_id: str | None = None) -> str:
    """
    Executes Python code in a temporary directory and captures stdout + generated files.
    Returns a formatted string with output and download links.
    """
    import tempfile
    import subprocess
    import sys
    import ast

    def _env_int(name: str, default: int) -> int:
        try:
            return int(os.environ.get(name, default))
        except (TypeError, ValueError):
            return default

    def _parse_module_list(raw: str) -> set[str]:
        if not raw:
            return set()
        return {item.strip() for item in raw.split(",") if item.strip()}

    def _collect_imports(source: str) -> set[str]:
        try:
            tree = ast.parse(source)
        except SyntaxError:
            return set()
        modules: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name:
                        modules.add(alias.name.split(".", 1)[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    modules.add(node.module.split(".", 1)[0])
        return modules

    max_code_chars = _env_int("CODE_EXECUTION_MAX_CHARS", 50000)
    max_stdout_chars = _env_int("CODE_EXECUTION_MAX_STDOUT_CHARS", 20000)
    max_stderr_chars = _env_int("CODE_EXECUTION_MAX_STDERR_CHARS", 20000)
    max_files = _env_int("CODE_EXECUTION_MAX_FILES", 5)
    max_file_bytes = _env_int("CODE_EXECUTION_MAX_FILE_BYTES", 5 * 1024 * 1024)
    max_total_bytes = _env_int("CODE_EXECUTION_MAX_TOTAL_FILE_BYTES", 20 * 1024 * 1024)
    timeout_seconds = _env_int("CODE_EXECUTION_TIMEOUT_SECONDS", 30)
    base_url = os.environ.get("CODE_EXECUTION_BASE_URL", "http://localhost:8000").rstrip("/")
    use_docker = os.environ.get("CODE_EXECUTION_USE_DOCKER", "").strip().lower() in {"1", "true", "yes"}
    require_docker = os.environ.get("CODE_EXECUTION_REQUIRE_DOCKER", "").strip().lower() in {"1", "true", "yes"}
    app_env = os.environ.get("APP_ENV", os.environ.get("ENVIRONMENT", "")).strip().lower()
    if app_env in {"prod", "production"}:
        require_docker = True
    docker_image = os.environ.get("CODE_EXECUTION_DOCKER_IMAGE", "agentgrid-code-exec:latest").strip()
    docker_cpus = os.environ.get("CODE_EXECUTION_DOCKER_CPUS", "1").strip()
    docker_mem_mb = _env_int("CODE_EXECUTION_DOCKER_MEMORY_MB", 512)
    docker_pids = _env_int("CODE_EXECUTION_DOCKER_PIDS_LIMIT", 128)
    docker_tmpfs_mb = _env_int("CODE_EXECUTION_DOCKER_TMPFS_MB", 64)
    allowed_modules = _parse_module_list(os.environ.get("CODE_EXECUTION_ALLOWED_MODULES", ""))
    forbidden_modules = _parse_module_list(
        os.environ.get(
            "CODE_EXECUTION_FORBIDDEN_MODULES",
            "os,sys,subprocess,shutil,pathlib,socket,importlib,ctypes,inspect,signal,resource,multiprocessing,threading,asyncio,ssl,urllib,requests,http,ftplib,webbrowser",
        )
    )

    if require_docker:
        use_docker = True

    if not code:
        _record_code_execution(
            execution_id=execution_id,
            status="rejected",
            error_message="No code provided.",
            agent_id=agent_id,
            user_id=user_id,
            sandboxed=use_docker,
            docker_image=docker_image if use_docker else None,
        )
        return "Error: No code provided."
    if len(code) > max_code_chars:
        _record_code_execution(
            execution_id=execution_id,
            status="rejected",
            error_message=f"Code length exceeds limit ({max_code_chars} characters).",
            agent_id=agent_id,
            user_id=user_id,
            sandboxed=use_docker,
            docker_image=docker_image if use_docker else None,
        )
        return f"Error: Code length exceeds limit ({max_code_chars} characters)."

    imports = _collect_imports(code)
    if allowed_modules:
        blocked = sorted(imports - allowed_modules)
        if blocked:
            _record_code_execution(
                execution_id=execution_id,
                status="rejected",
                error_message=f"Import(s) not allowed: {', '.join(blocked)}.",
                agent_id=agent_id,
                user_id=user_id,
                sandboxed=use_docker,
                docker_image=docker_image if use_docker else None,
            )
            return f"Error: Import(s) not allowed: {', '.join(blocked)}."
    else:
        blocked = sorted(imports.intersection(forbidden_modules))
        if blocked:
            _record_code_execution(
                execution_id=execution_id,
                status="rejected",
                error_message=f"Import(s) not allowed: {', '.join(blocked)}.",
                agent_id=agent_id,
                user_id=user_id,
                sandboxed=use_docker,
                docker_image=docker_image if use_docker else None,
            )
            return f"Error: Import(s) not allowed: {', '.join(blocked)}."
    
    cleanup_generated_files()
    start_ts = time.perf_counter()
    logger.info(
        "code_exec_start execution_id=%s docker=%s imports=%s",
        execution_id,
        use_docker,
        ",".join(sorted(imports)) if imports else "",
    )
    
    # Create temp directory
    with tempfile.TemporaryDirectory() as tmpdir:
        code_file = os.path.join(tmpdir, "script.py")
        
        # Write code to file
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)

        # DEBUG: Log the code being executed
        try:
            with open("last_agent_code.py", "w", encoding="utf-8") as f:
                f.write(code)
        except:
            pass
        
        try:
            if use_docker:
                cmd = [
                    "docker", "run", "--rm",
                    "--network", "none",
                    "--read-only",
                    "--pids-limit", str(docker_pids),
                    "--memory", f"{docker_mem_mb}m",
                    "--cpus", str(docker_cpus),
                    "--security-opt", "no-new-privileges",
                    "--cap-drop", "ALL",
                    "--tmpfs", f"/tmp:rw,size={docker_tmpfs_mb}m",
                    "-v", f"{tmpdir}:/work:rw",
                    "-w", "/work",
                    docker_image,
                    "python", "/work/script.py",
                ]
                result = subprocess.run(
                    cmd,
                    cwd=tmpdir,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds,
                )
            else:
                # Run code with subprocess for safety
                result = subprocess.run(
                    [sys.executable, code_file],
                    cwd=tmpdir,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds,
                )
            
            stdout = result.stdout or ""
            stderr = result.stderr or ""
            if len(stdout) > max_stdout_chars:
                stdout = stdout[:max_stdout_chars] + "\n...[truncated]..."
            if len(stderr) > max_stderr_chars:
                stderr = stderr[:max_stderr_chars] + "\n...[truncated]..."
            
            if result.returncode != 0:
                error_msg = f"ERROR: Python script failed (Return Code: {result.returncode}).\n\nSTDOUT:\n{stdout}\n\nSTDERR:\n{stderr}"
                # DEBUG: Log the error
                try:
                    with open("last_agent_error.log", "w", encoding="utf-8") as f:
                        f.write(error_msg)
                        f.write(f"\n\nSYS.EXECUTABLE: {sys.executable}\n")
                except:
                    pass
                return error_msg
            
            # Actually, we need to list files after execution
            all_files = [f for f in os.listdir(tmpdir) if f != "script.py" and os.path.isfile(os.path.join(tmpdir, f))]
            
            # Copy generated files to a persistent location
            output_dir = os.path.join(GENERATED_FILES_DIR, execution_id)
            os.makedirs(output_dir, exist_ok=True)
            
            file_links = []
            total_bytes = 0
            for filename in all_files:
                if len(file_links) >= max_files:
                    break
                src = os.path.join(tmpdir, filename)
                try:
                    size_bytes = os.path.getsize(src)
                except OSError:
                    continue
                if size_bytes > max_file_bytes:
                    continue
                if total_bytes + size_bytes > max_total_bytes:
                    break
                dst = os.path.join(output_dir, filename)
                import shutil
                shutil.copy(src, dst)
                total_bytes += size_bytes
                # Store reference
                file_links.append(f"[Download {filename}]({base_url}/creator-studio/api/files/{execution_id}/{filename})")
            
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
            
            duration_ms = int((time.perf_counter() - start_ts) * 1000)
            logger.info(
                "code_exec_done execution_id=%s duration_ms=%s stdout_len=%s stderr_len=%s files=%s total_file_bytes=%s",
                execution_id,
                duration_ms,
                len(stdout),
                len(stderr),
                len(file_links),
                total_bytes,
            )
            _record_code_execution(
                execution_id=execution_id,
                status="success",
                duration_ms=duration_ms,
                stdout_len=len(stdout),
                stderr_len=len(stderr),
                file_count=len(file_links),
                total_file_bytes=total_bytes,
                agent_id=agent_id,
                user_id=user_id,
                sandboxed=use_docker,
                docker_image=docker_image if use_docker else None,
            )

            if not output_parts:
                return "Code executed successfully (no output)."
            
            return "\n\n".join(output_parts)
            
        except subprocess.TimeoutExpired:
            duration_ms = int((time.perf_counter() - start_ts) * 1000)
            logger.warning("code_exec_timeout execution_id=%s duration_ms=%s", execution_id, duration_ms)
            _record_code_execution(
                execution_id=execution_id,
                status="timeout",
                duration_ms=duration_ms,
                agent_id=agent_id,
                user_id=user_id,
                sandboxed=use_docker,
                docker_image=docker_image if use_docker else None,
            )
            return f"Error: Code execution timed out ({timeout_seconds}s limit)."
        except FileNotFoundError as e:
            if use_docker:
                logger.error("code_exec_docker_missing execution_id=%s", execution_id)
                _record_code_execution(
                    execution_id=execution_id,
                    status="error",
                    error_message="Docker not found.",
                    agent_id=agent_id,
                    user_id=user_id,
                    sandboxed=use_docker,
                    docker_image=docker_image if use_docker else None,
                )
                return "Error: Docker not found. Install Docker or disable CODE_EXECUTION_USE_DOCKER."
            logger.error("code_exec_missing_runtime execution_id=%s error=%s", execution_id, e)
            _record_code_execution(
                execution_id=execution_id,
                status="error",
                error_message=str(e),
                agent_id=agent_id,
                user_id=user_id,
                sandboxed=use_docker,
                docker_image=docker_image if use_docker else None,
            )
            return f"Error executing code: {str(e)}"
        except Exception as e:
            logger.exception("code_exec_error execution_id=%s", execution_id)
            _record_code_execution(
                execution_id=execution_id,
                status="error",
                error_message=str(e),
                agent_id=agent_id,
                user_id=user_id,
                sandboxed=use_docker,
                docker_image=docker_image if use_docker else None,
            )
            return f"Error executing code: {str(e)}"


LANCE_DB_PATH = os.path.join(os.getcwd(), ".lancedb")
LLAMA_BASE_URL = os.environ.get("LLAMA_BASE_URL", "http://localhost:11434/v1")
GROQ_BASE_URL = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEFAULT_GUEST_CREDITS = int(os.environ.get("CREATOR_STUDIO_GUEST_CREDITS", "5"))


class VectorIndex:
    def __init__(self) -> None:
        self._db = None
        self._table = None
        self._initialized = False

    def _initialize(self):
        if self._initialized:
            return
        if lancedb is not None:
            try:
                if not os.path.exists(LANCE_DB_PATH):
                    os.makedirs(LANCE_DB_PATH)
                self._db = lancedb.connect(LANCE_DB_PATH)
                self._ensure_table()
                self._initialized = True
            except Exception as e:
                print(f"Lazy initialization of LanceDB failed: {e}")

    def _ensure_table(self):
        if self._db is None:
            return
        table_name = "knowledge_chunks"
        if table_name not in self._db.table_names():
            # Define schema: vector, id (chunk_id), agent_id, text
            schema = pa.schema([
                pa.field("vector", pa.list_(pa.float32())),
                pa.field("id", pa.string()),
                pa.field("agent_id", pa.string()),
                pa.field("text", pa.string()),
                pa.field("metadata", pa.string()), # JSON string for flexibility
            ])
            self._table = self._db.create_table(table_name, schema=schema)
            # Create FTS index for keyword search
            try:
                self._table.create_fts_index("text")
            except Exception as e:
                print(f"Failed to create FTS index: {e}")
        else:
            self._table = self._db.open_table(table_name)

    def add(self, agent_id: str, chunk_id: str, embedding: list[float], text: str, metadata: dict = None) -> None:
        self._initialize()
        if self._table is None:
            return
        try:
            self._table.add([{
                "vector": embedding,
                "id": str(chunk_id),
                "agent_id": str(agent_id),
                "text": text,
                "metadata": json.dumps(metadata or {})
            }])
        except Exception as e:
            print(f"Error adding to VectorIndex: {e}")

    def remove(self, agent_id: str, chunk_ids: list[str]) -> None:
        self._initialize()
        if self._table is None:
            return
        try:
            # Filter by IDs and Agent ID
            ids_str = ", ".join([f"'{cid}'" for cid in chunk_ids])
            self._table.delete(f"id IN ({ids_str}) AND agent_id = '{agent_id}'")
        except Exception as e:
            print(f"Error removing from VectorIndex: {e}")

    def drop_agent(self, agent_id: str) -> None:
        self._initialize()
        if self._table is None:
            return
        try:
            self._table.delete(f"agent_id = '{agent_id}'")
        except Exception as e:
            print(f"Error dropping agent from VectorIndex: {e}")

    def search(self, agent_id: str, embedding: list[float], query: str = None, top_k: int = 15) -> list[dict]:
        """
        Hybrid search: Vector + FTS
        """
        self._initialize()
        if self._table is None:
            return []
        
        try:
            # 1. Vector Search
            vector_results = []
            if embedding:
                vector_results = (
                    self._table.search(embedding)
                    .where(f"agent_id = '{agent_id}'")
                    .limit(top_k)
                    .to_list()
                )
            
            # 2. Keyword Search (FTS)
            fts_results = []
            if query:
                try:
                    fts_results = (
                        self._table.search(query, query_type="fts")
                        .where(f"agent_id = '{agent_id}'")
                        .limit(top_k)
                        .to_list()
                    )
                except Exception as e:
                    print(f"FTS search failed: {e}")

            # Combine results (Simple deduplication and fusion)
            seen_ids = set()
            combined = []
            
            # Give slight priority to FTS for exact keyword matches, then interleave
            for r in fts_results + vector_results:
                if r["id"] not in seen_ids:
                    combined.append(r)
                    seen_ids.add(r["id"])
            
            return [
                {
                    "text": r.get("text", ""),
                    "metadata": json.loads(r["metadata"]) if r.get("metadata") else {}
                }
                for r in combined
            ]
        except Exception as e:
            print(f"Error searching VectorIndex: {e}")
            return []

    def has_index(self, agent_id: str, dim: int) -> bool:
        self._initialize()
        if self._table is None:
            return False
        try:
            count = len(self._table.search().where(f"agent_id = '{agent_id}'").limit(1).to_list())
            return count > 0
        except Exception:
            return False

    def is_empty(self) -> bool:
        self._initialize()
        if self._table is None:
            return True
        try:
            return self._table.count_rows() == 0
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


def rewrite_query(db: Session, message: str, history: list[dict] | None = None) -> str:
    """
    Analyzes conversation history and current message to generate a standalone search query.
    """
    if not history:
        return message

    # Only look at the last few exchanges for efficiency
    history_snippets = []
    for m in history[-3:]:
        role = "User" if m["role"] == "user" else "Assistant"
        history_snippets.append(f"{role}: {m['content']}")
    
    context = "\n".join(history_snippets)
    prompt = (
        f"Given the following conversation history and a new user message, "
        f"rewrite the user message into a standalone, descriptive search query that captures "
        f"the full context needed for document retrieval. If the message is already a clear standalone query, return it as is.\n\n"
        f"History:\n{context}\n\n"
        f"New Message: {message}\n\n"
        f"Standalone Query:"
    )

    try:
        # Use system's dynamic model selection instead of hardcoded provider
        model = get_default_enabled_model(db)
        provider = infer_provider(model)
        config = get_llm_config(db, provider)
        api_key = resolve_llm_key(provider, config)
        
        rewritten = generate_response(provider, model, "You are a search query optimizer.", prompt, api_key, db=db)
        # Remove common prefixes the LLM might include
        final_query = rewritten.strip().replace("Standalone Query:", "").strip()
        print(f"RAG rewritten query: '{message}' -> '{final_query}'")
        return final_query
    except Exception as e:
        print(f"Query rewriting failed: {e}")
        return message


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


def rerank_chunks(db: Session, query: str, chunks: list[dict], top_n: int = 5) -> list[dict]:
    """
    Second-stage Reranking: Uses a lightweight LLM pass to select the most relevant chunks.
    Returns a list of dictionaries: [{"text": "...", "metadata": {...}}, ...]
    """
    if not chunks:
        return []
    if len(chunks) <= top_n:
        return chunks

    # Prepare reranking prompt
    context_text = "\n\n".join([f"ID: {i}\nContent: {c['text']}" for i, c in enumerate(chunks)])
    prompt = (
        f"You are a reranking assistant. Given a user query and a set of document chunks, "
        f"select the top {top_n} most relevant chunks that directly answer the query.\n\n"
        f"Query: {query}\n\n"
        f"Chunks:\n{context_text}\n\n"
        f"Return ONLY a comma-separated list of IDs in order of relevance. Example: 3, 0, 5"
    )

    try:
        # Use system's dynamic model selection instead of hardcoded provider
        model = get_default_enabled_model(db)
        provider = infer_provider(model)
        config = get_llm_config(db, provider)
        api_key = resolve_llm_key(provider, config)
        
        response = generate_response(provider, model, "You are a reranking expert.", prompt, api_key, db=db)
        
        # Parse IDs
        try:
            ids = [int(idx.strip()) for idx in response.split(",") if idx.strip().isdigit()]
            reranked = [chunks[i] for i in ids if i < len(chunks)]
            return reranked[:top_n]
        except:
            # Fallback to original order if parsing fails
            return chunks[:top_n]
            
    except Exception as e:
        print(f"Reranking failed: {e}")
        return chunks[:top_n]


def build_context(db: Session, agent_id: str | uuid.UUID, query: str) -> list[dict]:
    """
    Super RAG Retrieval: Hybrid Search + Re-ranking
    Returns a list of dictionaries: [{"text": "...", "metadata": {...}}, ...]
    """
    embeddings = embed_texts(db, [query])
    query_embedding = embeddings[0] if embeddings else []
    
    agent_uuid = _coerce_uuid(agent_id)
    agent_key = str(agent_uuid)
    
    # 1. Retrieval (Hybrid)
    candidate_chunks = []
    if VECTOR_INDEX is not None:
        # Check if table has data and dimension matches
        if VECTOR_INDEX.has_index(agent_key, len(query_embedding) if query_embedding else 0):
            candidate_chunks = VECTOR_INDEX.search(agent_key, query_embedding, query=query, top_k=20)
    
    # 2. Fallback to SQL if VectorIndex is empty/missing
    if not candidate_chunks:
        rows = (
            db.query(CreatorStudioKnowledgeChunk)
            .filter(CreatorStudioKnowledgeChunk.agent_id == agent_uuid)
            .all()
        )
        if not rows:
            return []
            
        # Basic similarity for SQL chunks if no vector index
        sql_candidates = []
        for row in rows:
            emb = row.embedding or []
            score = cosine_similarity(query_embedding, emb) if query_embedding and emb else 0
            # Ensure we wrap in dict format compatible with LanceDB output
            sql_candidates.append({
                "score": score, 
                "text": row.text, 
                "id": str(row.id),
                "metadata": row.chunk_metadata or {}
            })
            
        sql_candidates.sort(key=lambda x: x["score"], reverse=True)
        candidate_chunks = sql_candidates[:20]

    # 3. Re-ranking
    return rerank_chunks(db, query, candidate_chunks, top_n=5)


def build_system_instruction(
    instruction: str,
    context_chunks: list[dict],
    inputs_context: str | None = None,
    capabilities: dict | None = None,
) -> str:
    """
    Constructs a high-fidelity system prompt that combines agent persona with 
    robust RAG guidelines and grounded interaction rules.
    """
    current_time_str = datetime.now().strftime("%A, %B %d, %Y %I:%M %p")
    
    # --- RAG Core Guidelines ---
    sections = [
        f"Current Date and Time: {current_time_str}",
        "## YOUR ROLE & PERSONA\n" + instruction,
    ]

    if inputs_context and inputs_context.strip():
        sections.append("## USER-PROVIDED INPUT CONTEXT\n" + inputs_context.strip())

    if context_chunks:
        # --- RAG Core Guidelines ---
        rag_guidelines = (
            "## RAG OPERATIONAL GUIDELINES\n"
            "1. **Primary Information Source**: Use the provided 'Context' blocks as your primary source of truth. If the context contains the answer, prioritize it over your internal knowledge.\n"
            "2. **Grounding & Faithfulness**: Only state what is supported by the context. Do not invent information.\n"
            "3. **Handling Uncertainty**: If the provided context does not contain enough information to answer the user's request accurately, state clearly that you do not have that information based on the current knowledge base. Offer to help with what you DO know.\n"
            "4. **Synthesis**: If multiple context chunks provide relevant information, synthesize them into a coherent, organized response.\n"
            "5. **Source Attribution**: When you use information from a context block, mention the source at the end of the relevant sentence or paragraph using the format: [Source: <filename>].\n"
        )
        sections.append(rag_guidelines)

        formatted_chunks = []
        for idx, chunk_dict in enumerate(context_chunks):
            text = chunk_dict.get("text", "")
            meta = chunk_dict.get("metadata") or {}
            source = meta.get("source", "Unknown Source")
            
            chunk_block = (
                f"--- Context Block {idx + 1} (Source: {source}) ---\n"
                f"{text}\n"
            )
            formatted_chunks.append(chunk_block)
        
        sections.append("## PROVIDED CONTEXT BLOCKS\n" + "\n".join(formatted_chunks))
    
    if capabilities:
        cap_section = ["## ENABLED CAPABILITIES"]
        
        # Robustly determine if capabilities are enabled (handle dict, list, camelCase, snake_case)
        if isinstance(capabilities, list):
            can_search = any(x in capabilities for x in ["web_search", "webBrowsing"])
            can_exec = any(x in capabilities for x in ["code_execution", "codeExecution"])
            can_api = any(x in capabilities for x in ["api_access", "apiIntegrations"])
            can_files = any(x in capabilities for x in ["file_handling", "fileHandling"])
        else:
            # Assume dict-like (Pydantic model or raw dict)
            get_cap = lambda k: capabilities.get(k) if hasattr(capabilities, "get") else getattr(capabilities, k, False)
            can_search = get_cap("webBrowsing") or get_cap("web_search")
            can_exec = get_cap("codeExecution") or get_cap("code_execution")
            can_api = get_cap("apiIntegrations") or get_cap("api_access")
            can_files = get_cap("fileHandling") or get_cap("file_handling")

        if can_search:
            cap_section.append("- FEATURE ENABLED: Web Search: You have access to a web search tool. Use it ONLY for real-time information (news, weather) or when context is insufficient. Always prioritize provided context first.")
        
        if can_exec:
            exec_instruction = (
                "- FEATURE ENABLED: Code Execution: You have the 'run_python' tool. You can write and execute Python code blocks for file generation.\n"
                "  - **PDF generation**: Use the `fpdf2` library. **IMPORTANT**: The library is called `fpdf2` but you MUST import it as `fpdf`. Never try to `import fpdf2`. ONLY USE: `from fpdf import FPDF`. (Example: `pdf = FPDF(); pdf.add_page(); pdf.set_font('helvetica', size=12); pdf.cell(text='Hello'); pdf.output('file.pdf')`)\n"
                "  - **Word (.docx) generation**: Use the `python-docx` library. IMPORT VIA: `import docx`. (Example: `doc = docx.Document(); doc.add_paragraph('Hello'); doc.save('file.docx')`)\n"
                "  - **FORMAT RULE**: If the user asks for a specific format (PDF or Word/doc/docx), you MUST generate that exact format. If the user does not specify a format, default to PDF (unless the content has non-Latin characters; then choose DOCX to avoid PDF font errors).\n"
                "  - **CRITICAL**: If the user asks for a 'downloadable document', 'file', 'PDF', or 'Word document', you **MUST** use this tool to generate it. If you believe you lack a library, you are WRONG. Always use `fpdf` or `docx` as shown above.\n"
                "  - **UNICODE WARNING**: The default PDF font ('helvetica') does NOT support non-Latin characters (like Urdu or Arabic). If the content contains such characters, you MUST stick to English/ASCII in the PDF or the script will crash.\n"
                "  - **LINKING RULES**: You MUST use the `run_python` tool to generate any requested file. Do NOT pretend to generate it. PROHIBITED: Do not write markdown links like `[Download](...)` yourself. INSTEAD: execute the tool, and THEN say 'I have created the document.' The system will handle the link display."
            )
            cap_section.append(exec_instruction)
            
        if can_api:
            cap_section.append("- FEATURE ENABLED: API Integrations: You can interact with external services if specific tools are defined.")
            
        if can_files:
            cap_section.append("- FEATURE ENABLED: File Handling: You can process and reference content from uploaded files.")
        
        if len(cap_section) > 1:
            sections.append("\n".join(cap_section))

    return "\n\n".join(sections)


from app.services.tool_engine import get_actions_for_agent, format_action_as_tool, execute_agent_action, format_action_as_gemini_tool

def generate_response(
    provider: str,
    model: str,
    system_instruction: str,
    message: str,
    api_key: str,
    db: Session | None = None,
    history: list[dict] | None = None,
    agent_id: str | None = None,
    user_id: str | None = None,
) -> str:
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
        
        # --- Add Dynamic Actions ---
        if db and agent_id:
            db_actions = get_actions_for_agent(db, agent_id)
            for action in db_actions:
                tools.append(format_action_as_tool(action))
        
        if not tools:
            tools = None

        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
            tools=tools,
        )

        if response.choices[0].message.tool_calls:
            tool_call = response.choices[0].message.tool_calls[0]
            tool_name = tool_call.function.name
            try:
                decoder = json.JSONDecoder()
                args, _ = decoder.raw_decode(tool_call.function.arguments)
                result = ""
                
                if tool_name == "web_search":
                    result = perform_web_search(args.get("query"), db=db)
                elif tool_name == "run_python":
                    exec_id = f"chat-{uuid.uuid4()}"
                    result = execute_python_code(args.get("code"), exec_id, agent_id=agent_id, user_id=user_id)
                elif tool_name.startswith("action_"):
                    action_uuid_str = tool_name.replace("action_", "").replace("_", "-")
                    result = execute_agent_action(db, action_uuid_str, args)
                
                if result:
                    messages.append(response.choices[0].message)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": tool_name,
                        "content": result
                    })
                    
                    final_response = client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        max_tokens=1024
                    )
                    final_text = final_response.choices[0].message.content or ""
                    
                    # Force append links if found
                    if tool_name == "run_python" and "**Generated Files:**" in result:
                        try:
                            links_part = result.split("**Generated Files:**")[1].strip()
                            final_text += f"\n\n**Generated Files:**\n{links_part}"
                        except: pass
                    
                    return final_text
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
        
        # Shared OpenAI-compatible tool logic
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
        
        if db and agent_id:
            db_actions = get_actions_for_agent(db, agent_id)
            for action in db_actions:
                tools.append(format_action_as_tool(action))
        
        if not tools: settings_tools = None
        else: settings_tools = tools

        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
            tools=settings_tools if settings_tools else None,
        )

        # Handle tool calls
        if response.choices[0].message.tool_calls:
            tool_call = response.choices[0].message.tool_calls[0]
            if tool_call.function.name == "web_search":

                try:
                    decoder = json.JSONDecoder()
                    args, _ = decoder.raw_decode(tool_call.function.arguments)
                    query = args.get("query")
                    search_result = perform_web_search(query, db=db)
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
                    return f"Error executing tool: {e}"
            
            elif tool_call.function.name.startswith("action_"):
                action_uuid_str = tool_call.function.name.replace("action_", "").replace("_", "-")
                try:

                    decoder = json.JSONDecoder()
                    args, _ = decoder.raw_decode(tool_call.function.arguments)
                    result = execute_agent_action(db, action_uuid_str, args)
                    messages.append(response.choices[0].message)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": tool_call.function.name,
                        "content": result
                    })
                    final_response = client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        max_tokens=1024
                    )
                    return final_response.choices[0].message.content or ""
                except Exception as e:
                    return f"Error executing action: {e}"

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
        
        # Shared OpenAI-compatible tool logic
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
        
        if db and agent_id:
            db_actions = get_actions_for_agent(db, agent_id)
            for action in db_actions:
                tools.append(format_action_as_tool(action))
        
        if not tools: settings_tools = None
        else: settings_tools = tools

        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
            tools=settings_tools if settings_tools else None,
        )

        # Handle tool calls
        if response.choices[0].message.tool_calls:
            tool_call = response.choices[0].message.tool_calls[0]
            if tool_call.function.name == "web_search":

                try:
                    decoder = json.JSONDecoder()
                    args, _ = decoder.raw_decode(tool_call.function.arguments)
                    query = args.get("query")
                    search_result = perform_web_search(query, db=db)
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
                    return f"Error executing tool: {e}"
            
            elif tool_call.function.name.startswith("action_"):
                action_uuid_str = tool_call.function.name.replace("action_", "").replace("_", "-")
                try:

                    decoder = json.JSONDecoder()
                    args, _ = decoder.raw_decode(tool_call.function.arguments)
                    result = execute_agent_action(db, action_uuid_str, args)
                    messages.append(response.choices[0].message)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": tool_call.function.name,
                        "content": result
                    })
                    final_response = client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        max_tokens=1024
                    )
                    return final_response.choices[0].message.content or ""
                except Exception as e:
                    return f"Error executing action: {e}"

        return response.choices[0].message.content or ""
    if provider == "anthropic":
        from app.services.tool_engine import format_action_as_anthropic_tool # Ensure import available
        
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
            
        # Anthropic Tool Logic
        tools = []
        if system_instruction:
            if "FEATURE ENABLED: Web Search" in system_instruction:
                tools.append({
                    "name": "web_search",
                    "description": "Search the web for real-time information.",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "The search query"}
                        },
                        "required": ["query"]
                    }
                })
            if "FEATURE ENABLED: Code Execution" in system_instruction:
                tools.append({
                    "name": "run_python",
                    "description": "Execute Python code to perform calculations, data analysis, or generate files.",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "code": {"type": "string", "description": "The Python code to execute"}
                        },
                        "required": ["code"]
                    }
                })

        if db and agent_id:
            db_actions = get_actions_for_agent(db, agent_id)
            for action in db_actions:
                tools.append(format_action_as_anthropic_tool(action))
        
        if tools:
            kwargs["tools"] = tools

        response = client.messages.create(**kwargs)
        
        # Handle Tool Use
        has_tool_use = False
        tool_results = []
        
        for block in response.content:
            if block.type == "tool_use":
                has_tool_use = True
                tool_name = block.name
                tool_id = block.id
                tool_input = block.input
                
                result_content = ""
                
                if tool_name == "web_search":
                    query = tool_input.get("query")
                    result_content = perform_web_search(query, db=db)
                elif tool_name == "run_python":
                    exec_id = f"chat-{uuid.uuid4()}"
                    result_content = execute_python_code(tool_input.get("code"), exec_id, agent_id=agent_id, user_id=user_id)
                elif tool_name.startswith("action_"):
                    action_uuid_str = tool_name.replace("action_", "").replace("_", "-")
                    try:
                        result_content = execute_agent_action(db, action_uuid_str, tool_input)
                    except Exception as e:
                        result_content = f"Error: {e}"
                
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_id,
                    "content": result_content
                })

        if has_tool_use:
            # Append assistant's response first (it contains the tool_use blocks)
            kwargs["messages"].append({"role": "assistant", "content": response.content})
            # Append tool results
            kwargs["messages"].append({"role": "user", "content": tool_results})
            
            # Get final response
            response2 = client.messages.create(**kwargs)
            
            parts = []
            for block in response2.content:
                if block.type == "text":
                    parts.append(block.text)
            return "".join(parts)

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

    gemini_tools = []
    if db and agent_id:
        db_actions = get_actions_for_agent(db, agent_id)
        if db_actions:
             gemini_tools.append({"function_declarations": [format_action_as_gemini_tool(a) for a in db_actions]})

    config = types.GenerateContentConfig(system_instruction=system_instruction)
    if gemini_tools:
        config.tools = gemini_tools

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=config,
    )
    
    # Handle usage of function calls
    if response.function_calls:
        # We only handle the first one for now in this simple loop, 
        # or iterate if multiple. Gemini usually returns one or more parts.
        
        # In python SDK, response.function_calls is a list? or we check parts.
        # It's better to check parts.
        full_response_text = ""
        
        # Helper to process parts
        function_responses = []
        for part in response.candidates[0].content.parts:
            if part.function_call:
                fc = part.function_call
                args = {k: v for k, v in fc.args.items()}
                
                result_str = ""
                if fc.name == "web_search":
                    result_str = perform_web_search(args.get("query"), db=db)
                elif fc.name == "run_python":
                    exec_id = f"chat-{uuid.uuid4()}"
                    result_str = execute_python_code(args.get("code"), exec_id, agent_id=agent_id, user_id=user_id)
                elif fc.name.startswith("action_"):
                    action_uuid_str = fc.name.replace("action_", "").replace("_", "-")
                    result_str = execute_agent_action(db, action_uuid_str, args)
                
                function_responses.append({
                    "name": fc.name,
                    "response": {"result": result_str}
                })
                
                # Store if it was code execution to force links later
                if fc.name == "run_python":
                    last_python_result = result_str
        
        if function_responses:
            # Send result back
            # We must append the model's call to history first
            contents.append(response.candidates[0].content)
            
            # Then the tool response
            parts_response = []
            for fr in function_responses:
                parts_response.append(types.Part(function_response=types.FunctionResponse(
                    name=fr["name"],
                    response=fr["response"]
                )))
            
            contents.append(types.Content(role="tool", parts=parts_response))
            
            # Generate final response
            response2 = client.models.generate_content(
                model=model,
                contents=contents,
                config=config 
            )
            final_text = getattr(response2, "text", "") or ""
            
            # Force append links if found
            try:
                if 'last_python_result' in locals() and "**Generated Files:**" in last_python_result:
                    links_part = last_python_result.split("**Generated Files:**")[1].strip()
                    final_text += f"\n\n**Generated Files:**\n{links_part}"
            except: pass
            
            return final_text

    return getattr(response, "text", "") or ""


def stream_response(
    provider: str,
    model: str,
    system_instruction: str,
    message: str,
    api_key: str,
    execution_id: str | None = None,
    db: Session | None = None,
    history: list[dict] | None = None,
    agent_id: str | None = None,
    user_id: str | None = None,
) -> Iterable[bytes]:
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
        
        # --- Add Dynamic Actions ---
        if db and agent_id:
            from app.services.tool_engine import get_actions_for_agent, format_action_as_tool
            db_actions = get_actions_for_agent(db, agent_id)
            for action in db_actions:
                tools.append(format_action_as_tool(action))

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
                yield (json.dumps({"type": "token", "content": text}) + "\n").encode("utf-8")

        # Execute tool if needed
        if tool_call_id and tool_name:
            args_str = "".join(tool_args_list)
            args = {}
            try:
                decoder = json.JSONDecoder()
                args, _ = decoder.raw_decode(args_str)
            except:
                pass
            
            # Emit tool call event
            yield (json.dumps({
                "type": "tool_call", 
                "name": tool_name, 
                "args": args
            }) + "\n").encode("utf-8")
            
            result_content = ""
            
            try:
                if tool_name == "web_search":
                    query = args.get("query")
                    yield (json.dumps({"type": "thought", "content": f"Searching web for: {query}"}) + "\n").encode("utf-8")
                    result_content = perform_web_search(query, db=db)
                
                elif tool_name.startswith("action_"):
                    # Handle dynamic API action
                    action_uuid_str = tool_name.replace("action_", "").replace("_", "-")
                    yield (json.dumps({"type": "thought", "content": f"Calling external action: {tool_name}"}) + "\n").encode("utf-8")
                    result_content = execute_agent_action(db, action_uuid_str, args)
                elif tool_name == "run_python":
                    code = args.get("code")
                    yield (json.dumps({"type": "thought", "content": "Executing Python code..."}) + "\n").encode("utf-8")
                    if execution_id:
                        result_content = execute_python_code(code, execution_id, agent_id=agent_id, user_id=user_id)
                    else:
                        result_content = "Code execution requires a valid execution session."
                        
                # Emit tool result event
                yield (json.dumps({
                    "type": "tool_result", 
                    "name": tool_name, 
                    "result": result_content
                }) + "\n").encode("utf-8")
                
                # Append tool messages for the second pass
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
                    "name": tool_name,
                    "content": result_content
                })
                
                # Second stream with tool results
                stream2 = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    stream=True
                )
                for chunk in stream2:
                    delta = chunk.choices[0].delta
                    text = getattr(delta, "content", None)
                    if text:
                        yield (json.dumps({"type": "token", "content": text}) + "\n").encode("utf-8")

                # --- FORCE APPEND LINKS AT THE END OF THE STREAM ---
                if "**Generated Files:**" in result_content:
                    try:
                        links_part = result_content.split("**Generated Files:**")[1].strip()
                        # Add a separator and the links
                        yield (json.dumps({"type": "token", "content": f"\n\n**Generated Files:**\n{links_part}"}) + "\n").encode("utf-8")
                    except:
                        pass

            except Exception as e:
                yield (json.dumps({"type": "error", "content": f"Tool error: {str(e)}"}) + "\n").encode("utf-8")
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
                yield (json.dumps({"type": "token", "content": text}) + "\n").encode("utf-8")
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
        
        # Shared OpenAI-compatible tool logic
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
        
        if db and agent_id:
            db_actions = get_actions_for_agent(db, agent_id)
            for action in db_actions:
                tools.append(format_action_as_tool(action))
        
        if not tools: settings_tools = None
        else: settings_tools = tools

        stream = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
            stream=True,
            tools=settings_tools if settings_tools else None,
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
                yield (json.dumps({"type": "token", "content": text}) + "\n").encode("utf-8")

        # Execute tool if needed
        if tool_call_id and tool_name == "web_search":
            args_str = "".join(tool_args_list)

            try:
                decoder = json.JSONDecoder()
                args, _ = decoder.raw_decode(args_str)
                query = args.get("query")
                yield (json.dumps({"type": "thought", "content": f"Searching web for: {query}"}) + "\n").encode("utf-8")
                
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
                    "name": "web_search",
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
                        yield (json.dumps({"type": "token", "content": text}) + "\n").encode("utf-8")
                        
            except Exception as e:
                yield (json.dumps({"type": "error", "content": f"Search failed: {e}"}) + "\n").encode("utf-8")
        
        elif tool_call_id and tool_name and tool_name.startswith("action_"):
            action_uuid_str = tool_name.replace("action_", "").replace("_", "-")
            args_str = "".join(tool_args_list)
            try:

                decoder = json.JSONDecoder()
                args, _ = decoder.raw_decode(args_str)
                
                yield f"\n\n_Executing action: {tool_name}..._\n\n".encode("utf-8")
                
                result = execute_agent_action(db, action_uuid_str, args)
                
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
                    "name": tool_name,
                    "content": result
                })
                
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
                yield f"\n[Action execution failed: {e}]".encode("utf-8")
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
        
        # Shared OpenAI-compatible tool logic
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
        
        if db and agent_id:
            db_actions = get_actions_for_agent(db, agent_id)
            for action in db_actions:
                tools.append(format_action_as_tool(action))
        
        if not tools: settings_tools = None
        else: settings_tools = tools

        stream = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1024,
            stream=True,
            tools=settings_tools if settings_tools else None,
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
                yield (json.dumps({"type": "token", "content": text}) + "\n").encode("utf-8")

        # Execute tool if needed
        if tool_call_id and tool_name == "web_search":
            args_str = "".join(tool_args_list)

            try:
                decoder = json.JSONDecoder()
                args, _ = decoder.raw_decode(args_str)
                query = args.get("query")
                yield (json.dumps({"type": "thought", "content": f"Searching web for: {query}"}) + "\n").encode("utf-8")
                
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
                    "name": "web_search",
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
                        yield (json.dumps({"type": "token", "content": text}) + "\n").encode("utf-8")
                        
            except Exception as e:
                yield (json.dumps({"type": "error", "content": f"Search failed: {e}"}) + "\n").encode("utf-8")
        
        elif tool_call_id and tool_name and tool_name.startswith("action_"):
            action_uuid_str = tool_name.replace("action_", "").replace("_", "-")
            args_str = "".join(tool_args_list)
            try:

                decoder = json.JSONDecoder()
                args, _ = decoder.raw_decode(args_str)
                
                yield f"\n\n_Executing action: {tool_name}..._\n\n".encode("utf-8")
                
                result = execute_agent_action(db, action_uuid_str, args)
                
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
                    "name": tool_name,
                    "content": result
                })
                
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
                yield f"\n[Action execution failed: {e}]".encode("utf-8")
        return

    if provider == "anthropic":
        from app.services.tool_engine import format_action_as_anthropic_tool # Ensure import available
        
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
            
        # Anthropic Tool Logic
        tools = []
        if system_instruction:
            if "FEATURE ENABLED: Web Search" in system_instruction:
                tools.append({
                    "name": "web_search",
                    "description": "Search the web for real-time information.",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "The search query"}
                        },
                        "required": ["query"]
                    }
                })
            if "FEATURE ENABLED: Code Execution" in system_instruction:
                tools.append({
                    "name": "run_python",
                    "description": "Execute Python code to perform calculations, data analysis, or generate files.",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "code": {"type": "string", "description": "The Python code to execute"}
                        },
                        "required": ["code"]
                    }
                })

        if db and agent_id:
            db_actions = get_actions_for_agent(db, agent_id)
            for action in db_actions:
                tools.append(format_action_as_anthropic_tool(action))
        
        if tools:
            kwargs["tools"] = tools

        # We need to capture the full tool use to add it to history properly
        current_tool_use = {}
        tool_input_json = []

        with client.messages.stream(**kwargs) as stream:
            for event in stream:
                if event.type == "content_block_start" and event.content_block.type == "tool_use":
                    current_tool_use = event.content_block
                    tool_input_json = []
                    yield (json.dumps({"type": "thought", "content": f"Executing action: {current_tool_use.name}..."}) + "\n").encode("utf-8")
                    
                elif event.type == "content_block_delta" and event.delta.type == "input_json_delta":
                    tool_input_json.append(event.delta.partial_json)
                    
                elif event.type == "content_block_stop":
                    if current_tool_use:
                        # Reconstruct full input
                        full_json = "".join(tool_input_json)

                        try:
                            tool_input = json.loads(full_json)
                            # Execute
                            result_content = ""
                            if current_tool_use.name == "web_search":
                                query = tool_input.get("query")
                                result_content = perform_web_search(query, db=db)
                            elif current_tool_use.name == "run_python":
                                result_content = "Python execution not fully supported in this context."
                            elif current_tool_use.name.startswith("action_"):
                                action_uuid_str = current_tool_use.name.replace("action_", "").replace("_", "-")
                                result_content = execute_agent_action(db, action_uuid_str, tool_input)

                            # Append to history
                            # We need to reconstruct the assistant message correctly
                            # For streaming, we cheat a bit and assume single tool call per turn for simplicity in this complexity
                            kwargs["messages"].append({
                                "role": "assistant",
                                "content": [
                                    {
                                        "type": "tool_use",
                                        "id": current_tool_use.id,
                                        "name": current_tool_use.name,
                                        "input": tool_input
                                    }
                                ]
                            })
                            
                            kwargs["messages"].append({
                                "role": "user",
                                "content": [
                                    {
                                        "type": "tool_result",
                                        "tool_use_id": current_tool_use.id,
                                        "content": result_content
                                    }
                                ]
                            })
                            
                            # Stream 2
                            with client.messages.stream(**kwargs) as stream2:
                                for text in stream2.text_stream:
                                    if text:
                                        yield (json.dumps({"type": "token", "content": text}) + "\n").encode("utf-8")
                            return

                        except Exception as e:
                            yield (json.dumps({"type": "error", "content": f"Action Error: {e}"}) + "\n").encode("utf-8")
                            return

                elif event.type == "text_delta":
                     yield (json.dumps({"type": "token", "content": event.text}) + "\n").encode("utf-8")
        return

    client = get_gemini_client(api_key)
    
    contents = []
    if history:
        for m in history:
            role = "model" if m["role"] == "assistant" else m["role"]
            contents.append({"role": role, "parts": [{"text": m["content"]}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    gemini_tools = []
    
    # --- Add Built-in Capabilities ---
    if system_instruction:
        decls = []
        if "FEATURE ENABLED: Web Search" in system_instruction:
            decls.append({
                "name": "web_search",
                "description": "Search the web for real-time information.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query"}
                    },
                    "required": ["query"]
                }
            })
        if "FEATURE ENABLED: Code Execution" in system_instruction:
            decls.append({
                "name": "run_python",
                "description": "Execute Python code to perform calculations, data analysis, or generate files.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "description": "The Python code to execute"}
                    },
                    "required": ["code"]
                }
            })
        if decls:
            gemini_tools.append({"function_declarations": decls})

    # --- Add Dynamic Actions ---
    if db and agent_id:
        db_actions = get_actions_for_agent(db, agent_id)
        if db_actions:
             gemini_tools.append({"function_declarations": [format_action_as_gemini_tool(a) for a in db_actions]})

    config = types.GenerateContentConfig(system_instruction=system_instruction)
    if gemini_tools:
        config.tools = gemini_tools

    response = client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=config,
    )

    for chunk in response:
        # Check for function calls
        if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
            for part in chunk.candidates[0].content.parts:
                if part.function_call:
                    fc = part.function_call
                    args = {k: v for k, v in fc.args.items()}
                    
                    if fc.name == "web_search":
                        try:
                            query = args.get("query")
                            yield (json.dumps({"type": "thought", "content": f"Searching web for: {query}"}) + "\n").encode("utf-8")
                            result_str = perform_web_search(query, db=db)
                            # Prepare history for second turn
                            contents.append(chunk.candidates[0].content)
                            contents.append(types.Content(
                                role="tool", 
                                parts=[types.Part(function_response=types.FunctionResponse(
                                    name=fc.name,
                                    response={"result": result_str}
                                ))]
                            ))
                            stream2 = client.models.generate_content_stream(model=model, contents=contents, config=config)
                            for chunk2 in stream2:
                                if chunk2.text: yield (json.dumps({"type": "token", "content": chunk2.text}) + "\n").encode("utf-8")
                            return
                        except Exception as e:
                            yield (json.dumps({"type": "error", "content": f"Search failed: {e}"}) + "\n").encode("utf-8")
                            return

                    elif fc.name == "run_python":
                        try:
                            code = args.get("code")
                            yield (json.dumps({"type": "thought", "content": "Executing Python code..."}) + "\n").encode("utf-8")
                            exec_id = f"chat-{uuid.uuid4()}"
                            result_str = execute_python_code(code, exec_id, agent_id=agent_id, user_id=user_id)
                            # Prepare history for second turn
                            contents.append(chunk.candidates[0].content)
                            contents.append(types.Content(
                                role="tool", 
                                parts=[types.Part(function_response=types.FunctionResponse(
                                    name=fc.name,
                                    response={"result": result_str}
                                ))]
                            ))
                            stream2 = client.models.generate_content_stream(model=model, contents=contents, config=config)
                            for chunk2 in stream2:
                                if chunk2.text: yield (json.dumps({"type": "token", "content": chunk2.text}) + "\n").encode("utf-8")
                            
                            # --- FORCE APPEND LINKS ---
                            if "**Generated Files:**" in result_str:
                                try:
                                    links_part = result_str.split("**Generated Files:**")[1].strip()
                                    yield (json.dumps({"type": "token", "content": f"\n\n**Generated Files:**\n{links_part}"}) + "\n").encode("utf-8")
                                except: pass
                            return
                        except Exception as e:
                            yield (json.dumps({"type": "error", "content": f"Execution failed: {e}"}) + "\n").encode("utf-8")
                            return

                    elif fc.name.startswith("action_"):
                        action_uuid_str = fc.name.replace("action_", "").replace("_", "-")
                        try:
                            result_str = execute_agent_action(db, action_uuid_str, args)
                            # Prepare history for second turn
                            contents.append(chunk.candidates[0].content)
                            contents.append(types.Content(
                                role="tool", 
                                parts=[types.Part(function_response=types.FunctionResponse(
                                    name=fc.name,
                                    response={"result": result_str}
                                ))]
                            ))
                            stream2 = client.models.generate_content_stream(model=model, contents=contents, config=config)
                            for chunk2 in stream2:
                                if chunk2.text: yield (json.dumps({"type": "token", "content": chunk2.text}) + "\n").encode("utf-8")
                            return
                        except Exception as e:
                            yield (json.dumps({"type": "error", "content": f"Action failed: {e}"}) + "\n").encode("utf-8")
                            return

        text = getattr(chunk, "text", "")
        if text:
            yield (json.dumps({"type": "token", "content": text}) + "\n").encode("utf-8")


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
        VECTOR_INDEX.add(str(row.agent_id), str(row.id), embedding, row.text, row.chunk_metadata)
    print(f"Vector index population complete. Added {len(rows)} chunks.")


def build_agent_chat(
    db: Session,
    message: str,
    current_state: dict[str, Any] | None = None,
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    model = get_assist_model(db)
    if not model:
        model = get_default_enabled_model(db)
    
    try:
        provider = get_provider_for_model(db, model)
    except HTTPException:
        # If specifically disabled, fallback to next best
        model = get_default_enabled_model(db)
        provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)

    # Specialized System Instruction for the Architect
    system_instruction = (
        "You are the 'Agent Architect', a world-class AI expert assistant that helps users build their own AI agents on the AgentGrid platform.\n\n"
        "Your goal is to guide users naturally through the creation process by engaging in thoughtful conversation, asking insightful questions, and providing expert recommendations. You should be friendly, professional, enthusiastic, and insightful.\n\n"
        "CORE RESPONSIBILITIES:\n\n"
        "1. CONVERSATIONAL GUIDANCE:\n"
        "   - Engage users in natural dialogue about their agent concept\n"
        "   - Ask clarifying questions when their idea is vague or incomplete\n"
        "   - Probe for key details: purpose, target audience, tone, key features, use cases\n"
        "   - Suggest powerful features like web search, code execution, file handling when relevant\n"
        "   - Provide examples and inspiration to help users think bigger\n"
        "   - Anticipate needs they might not have considered\n"
        "   - Validate their ideas and build excitement about possibilities\n\n"
        "2. INTELLIGENT RECOMMENDATIONS:\n"
        "   - Suggest web search capability for agents needing current information (news, prices, research, real_time data)\n"
        "   - Recommend code execution for agents doing calculations, data analysis, or file processing\n"
        "   - Propose specific instruction improvements based on best practices\n"
        "   - Identify missing elements in their agent definition\n"
        "   - Offer tone and personality suggestions that fit the use case\n"
        "   - Recommend edge cases and safety considerations\n\n"
        "3. JSON CONFIGURATION UPDATES:\n"
        "   - You MUST include a JSON block inside <suggestion> tags whenever the conversation leads to changes in the agent's definition\n"
        "   - Update incrementally - only change fields that were discussed or refined\n"
        "   - Keep existing content unless explicitly replacing it\n"
        "   - Ensure all JSON is valid and properly formatted\n"
        "   - Be thorough in instructions - include role definition, capabilities, interaction style, and specific behaviors\n\n"
        "FIELDS TO UPDATE:\n"
        "- 'name': Clear, memorable agent name (2-4 words typically)\n"
        "- 'description': Concise 2-3 sentence overview of what the agent does and its value (user-facing)\n"
        "- 'instruction': Comprehensive system prompt with role, capabilities, behavior, tone, and guidelines\n\n"
        "INSTRUCTION WRITING BEST PRACTICES:\n"
        "- Start with clear role definition: \"You are [Name], a [expertise] that [primary function]\"\n"
        "- Use structured sections with clear headers\n"
        "- Include specific behavioral guidelines, not vague directives\n"
        "- Define interaction style and tone explicitly\n"
        "- Specify when and how to use special capabilities\n"
        "- Add relevant disclaimers for professional domains (legal, medical, financial)\n"
        "- Provide examples of good responses or behaviors when helpful\n"
        "- Make instructions actionable and unambiguous\n"
        "- Optimize length: 200-400 words for standard agents, 400-600 for complex domains\n\n"
        "EXAMPLE INTERACTION FLOW:\n\n"
        "User: \"I want to make a fitness coach\"\n\n"
        "You: \"Great idea! A fitness coach agent could be really valuable. Let me ask a few questions to make this perfect:\n\n"
        "- What's the primary focus: workout planning, nutrition advice, or both?\n"
        "- Who's the target user: beginners, intermediate, or advanced fitness enthusiasts?\n"
        "- Should it create personalized workout plans, or provide general guidance?\n"
        "- Would you like it to track progress or just give advice?\n\n"
        "I'm thinking this agent could benefit from web search to find the latest fitness research and nutrition information. What do you think?\"\n\n"
        "[After user responds with more details]\n\n"
        "You: \"Perfect! I'm envisioning a comprehensive fitness and nutrition coach that creates personalized plans, provides evidence-based advice, and adapts to the user's goals and fitness level. \n\n"
        "I'll set this up with:\n"
        "✅ Web search enabled - for latest research, exercise techniques, and nutrition science\n"
        "✅ Motivational yet realistic tone - encouraging without overpromising\n"
        "✅ Personalization - adapting advice to user's experience level, goals, and constraints\n\n"
        "Here's the configuration:\"\n\n"
        "<suggestion>\n"
        "{\n"
        "  \"name\": \"FitLife Coach\",\n"
        "  \"description\": \"Your personal AI fitness and nutrition coach that creates customized workout plans, provides evidence-based nutrition guidance, and adapts to your goals and fitness level. Combines motivation with practical, sustainable advice.\",\n"
        "  \"instruction\": \"You are FitLife Coach, a professional fitness and nutrition expert that helps users achieve their health and fitness goals through personalized guidance and evidence-based advice.\\n\\nCORE CAPABILITIES:\\n- Create customized workout plans based on user's fitness level, goals, equipment, and time availability\\n- Provide evidence-based nutrition guidance and meal planning advice\\n- Offer exercise form corrections and technique tips\\n- Adapt recommendations for injuries, limitations, or special needs\\n- Track progress and adjust plans accordingly\\n- Motivate and encourage sustainable lifestyle changes\\n\\nWEB SEARCH USAGE:\\n- Use web search to find latest fitness research and studies\\n- Look up current nutrition science and dietary recommendations\\n- Research specific exercises, techniques, and training methods\\n- Verify safety information for exercises or dietary approaches\\n- Find evidence for or against trending fitness/nutrition claims\\n\\nINTERACTION STYLE:\\n- Be encouraging and motivational yet realistic and honest\\n- Use clear, accessible language - avoid excessive jargon\\n- Personalize all advice to the user's specific situation\\n- Ask clarifying questions about goals, experience, equipment, and constraints\\n- Celebrate progress and milestones\\n- Address setbacks with empathy and constructive solutions\\n\\nASSESSMENT APPROACH:\\n- Start by understanding user's current fitness level, goals, and lifestyle\\n- Consider injuries, medical conditions, and limitations\\n- Account for available equipment and time commitment\\n- Assess dietary preferences, restrictions, and current habits\\n- provide progressive training that builds over time\\n- Balance different training modalities (strength, cardio, flexibility, recovery)\\n- Include warm-up and cool-down guidance\\n- Offer exercise alternatives for different equipment or ability levels\\n- Specify sets, reps, rest periods, and intensity levels\\n\\nNUTRITION GUIDANCE:\\n- Focus on sustainable, balanced eating approaches\\n- Provide macronutrient guidance appropriate to goals\\n- Suggest meal ideas and timing strategies\\n- Address common nutrition questions and myths\\n- Emphasize whole foods and practical meal planning\\n\\nSAFETY & DISCLAIMERS:\\n- Always remind users you're an AI coach, not a licensed personal trainer or dietitian\\n- Recommend consulting healthcare providers for medical concerns or before starting new programs\\n- Emphasize proper form and injury prevention\\n- Advise caution with aggressive dietary restrictions or extreme training\\n\\nMOTIVATION STRATEGY:\\n- Set realistic, achievable goals with clear milestones\\n- Celebrate non_scale victories (strength gains, consistency, energy levels)\\n- Provide accountability and positive reinforcement\\n- Help users overcome mental barriers and plateaus\\n- Encourage long-term lifestyle change over quick fixes\"\n"
        "}\n"
        "</suggestion>\n\n"
        "RESPONSE STRUCTURE:\n"
        "1. Acknowledge user input enthusiastically\n"
        "2. Ask 2-4 clarifying questions if needed (don't overwhelm)\n"
        "3. Suggest relevant features or capabilities\n"
        "4. Summarize what you're creating\n"
        "5. Provide the <suggestion> JSON block\n\n"
        "ADAPTIVE BEHAVIOR:\n"
        "- If user gives minimal info (\"make a cooking bot\"), ask questions before generating JSON\n"
        "- If user gives detailed info, generate comprehensive JSON immediately\n"
        "- If user wants to refine existing agent, update only the discussed fields\n"
        "- If user is exploring ideas, brainstorm with them before committing to JSON\n\n"
        "DOMAIN-SPECIFIC KNOWLEDGE:\n"
        "For different agent types, consider:\n"
        "- Professional agents (legal, medical, financial): Add disclaimers, emphasize informational nature\n"
        "- Creative agents: Encourage experimentation, provide constructive feedback frameworks\n"
        "- Educational agents: Use Socratic method, adapt to learning pace\n"
        "- Technical agents: Be precise, include debugging approaches, stay current via web search\n"
        "- Personal coaches: Focus on motivation, goal-setting, accountability\n"
        "- Business tools: Emphasize ROI, actionable insights, practical frameworks\n\n"
        "CONVERSATION QUALITY:\n"
        "- Be concise but thorough - don't write essays\n"
        "- Use bullet points for clarity when listing features or questions\n"
        "- Show enthusiasm about their agent idea\n"
        "- Validate their concept while offering improvements\n"
        "- Make the process feel collaborative, not prescriptive\n\n"
        "Remember: You're not just filling out a form - you're helping users create powerful, well-designed AI agents that truly serve their needs. Every suggestion should make their agent better, smarter, and more valuable.\n\n"
        "The current agent state is provided below. Update it incrementally as the user provides more details."
    )

    if current_state:
        # Filter None values to keep it clean
        clean_state = {k: v for k, v in current_state.items() if v is not None}
        system_instruction += f"\n\nCurrent Agent State:\n{json.dumps(clean_state, indent=2)}"

    # Format history for the LLM
    llm_history = []
    if history:
        for m in history:
            role = "assistant" if m["role"] == "model" else m["role"]
            llm_history.append({"role": role, "content": m["content"]})

    # Generate response
    response_text = generate_response(provider, model, system_instruction, message, api_key, db=db, history=llm_history)

    # Parse out the suggestion
    suggested_changes = None
    suggestion_match = re.search(r"<suggestion>(.*?)</suggestion>", response_text, re.DOTALL)
    if suggestion_match:
        try:
            suggested_changes = json.loads(suggestion_match.group(1).strip())
            # Clean the response text from the tag for cleaner UI display
            response_text = response_text.replace(suggestion_match.group(0), "").strip()
        except Exception as e:
            print(f"Failed to parse architect suggestion: {e}")
            pass

    return {
        "architect_message": response_text,
        "suggested_changes": suggested_changes
    }
