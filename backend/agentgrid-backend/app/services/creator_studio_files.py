# Creator Studio file extraction/chunking helpers (extracted from creator_studio.py)
from __future__ import annotations

import io
from typing import List

from bs4 import BeautifulSoup
from docx import Document
from pypdf import PdfReader

def extract_text(file_name: str, data: bytes) -> str:
    lower_name = file_name.lower()
    if lower_name.endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(data))
            pages = []
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                if page_text.strip():
                    pages.append(f"[PAGE {i + 1}]\n{page_text}")
            return "\n\n".join(pages)
        except Exception as e:
            print(f"Error extracting PDF: {e}")
            return ""
    if lower_name.endswith(".docx"):
        try:
            doc = Document(io.BytesIO(data))
            paragraphs = []
            for i, p in enumerate(doc.paragraphs):
                if p.text.strip():
                    paragraphs.append(f"[PARA {i + 1}] {p.text}")
            return "\n".join(paragraphs)
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
