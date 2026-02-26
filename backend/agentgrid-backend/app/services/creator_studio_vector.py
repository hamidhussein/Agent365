# Creator Studio vector index helpers (extracted from creator_studio.py)
from __future__ import annotations

import json
import os
from sqlalchemy.orm import Session

from app.models.creator_studio import CreatorStudioKnowledgeChunk

# Optional dependencies for vector storage
try:
    import lancedb
    import pyarrow as pa
except ImportError:
    lancedb = None
    pa = None

LANCE_DB_PATH = os.path.join(os.getcwd(), ".lancedb")

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
        Hybrid search: Vector + FTS with Reciprocal Rank Fusion (RRF) scoring.
        RRF formula: score(d) = Σ 1 / (k + rank_i(d))  where k=60.
        """
        self._initialize()
        if self._table is None:
            return []
        
        RRF_K = 60  # Standard RRF constant

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

            # 3. Reciprocal Rank Fusion (RRF)
            rrf_scores: dict[str, float] = {}
            result_map: dict[str, dict] = {}

            for rank, r in enumerate(vector_results):
                rid = r["id"]
                rrf_scores[rid] = rrf_scores.get(rid, 0.0) + 1.0 / (RRF_K + rank)
                if rid not in result_map:
                    result_map[rid] = r

            for rank, r in enumerate(fts_results):
                rid = r["id"]
                rrf_scores[rid] = rrf_scores.get(rid, 0.0) + 1.0 / (RRF_K + rank)
                if rid not in result_map:
                    result_map[rid] = r

            # Sort by RRF score descending
            sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)

            return [
                {
                    "text": result_map[rid].get("text", ""),
                    "metadata": json.loads(result_map[rid]["metadata"]) if result_map[rid].get("metadata") else {},
                    "rrf_score": round(rrf_scores[rid], 6),
                }
                for rid in sorted_ids[:top_k]
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
VECTOR_INDEX = VectorIndex() if lancedb is not None else None

