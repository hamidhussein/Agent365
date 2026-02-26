# AgentGrid Architecture - After Improvements

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Agent    │  │ Chat     │  │ Analytics│  │ Version  │       │
│  │ Builder  │  │ Sessions │  │ Dashboard│  │ History  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    API Layer                                │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │ Creator  │  │ Sessions │  │ Analytics│  │ Versions │  │ │
│  │  │ Studio   │  │ API      │  │ API      │  │ API      │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Service Layer (Modular)                        │ │
│  │                                                              │ │
│  │  ┌─────────────────┐  ┌─────────────────┐                 │ │
│  │  │   RAG Module    │  │  LLM Module     │                 │ │
│  │  │  ├─embeddings   │  │  ├─providers    │                 │ │
│  │  │  ├─retrieval    │  │  ├─router       │                 │ │
│  │  │  ├─reranking    │  │  └─streaming    │                 │ │
│  │  │  └─context      │  └─────────────────┘                 │ │
│  │  └─────────────────┘                                        │ │
│  │                                                              │ │
│  │  ┌─────────────────┐  ┌─────────────────┐                 │ │
│  │  │ Execution       │  │  Architect      │                 │ │
│  │  │  ├─sandbox      │  │  ├─conversation │                 │ │
│  │  │  ├─validators   │  │  ├─domains      │                 │ │
│  │  │  └─file_mgr     │  │  └─instruction  │                 │ │
│  │  └─────────────────┘  └─────────────────┘                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Background Tasks (Celery)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ File         │  │ Metrics      │  │ Cleanup      │         │
│  │ Processing   │  │ Aggregation  │  │ Tasks        │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ PostgreSQL   │  │ Redis        │  │ LanceDB      │         │
│  │              │  │              │  │              │         │
│  │ • agents     │  │ • cache      │  │ • vectors    │         │
│  │ • versions   │  │ • tasks      │  │ • embeddings │         │
│  │ • sessions   │  │ • rate limit │  │              │         │
│  │ • messages   │  │              │  │              │         │
│  │ • metrics    │  │              │  │              │         │
│  │ • llm_usage  │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ OpenAI   │  │ Google   │  │ Anthropic│  │ Search   │       │
│  │ API      │  │ Gemini   │  │ Claude   │  │ APIs     │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### 1. Chat with Version Control

```
User → Frontend → POST /chat
                    │
                    ▼
              API Layer
                    │
                    ├─→ Load Agent Config
                    │   (with version check)
                    │
                    ├─→ RAG Module
                    │   ├─ Embed query
                    │   ├─ Search vectors
                    │   └─ Rerank results
                    │
                    ├─→ LLM Module
                    │   ├─ Build prompt
                    │   ├─ Call provider
                    │   └─ Stream response
                    │
                    └─→ Save to Session
                        ├─ chat_messages
                        └─ Update metrics
```

### 2. File Upload with Background Processing

```
User → Frontend → POST /files
                    │
                    ▼
              API Layer
                    │
                    ├─→ Save file metadata
                    │   (creator_studio_knowledge_files)
                    │
                    └─→ Queue Celery Task
                        │
                        ▼
                  Celery Worker
                        │
                        ├─→ Extract text
                        ├─→ Chunk text
                        ├─→ Generate embeddings
                        ├─→ Save chunks (DB)
                        └─→ Index vectors (LanceDB)
```

### 3. Analytics Aggregation

```
Celery Beat (Hourly)
        │
        ▼
  Metrics Task
        │
        ├─→ Query executions
        ├─→ Calculate stats
        │   ├─ Usage metrics
        │   ├─ Performance
        │   ├─ Quality
        │   └─ Cost
        │
        └─→ Save to agent_metrics
            │
            ▼
      User requests analytics
            │
            ▼
      API returns aggregated data
```

## Module Dependencies

```
creator_studio/
│
├─ core.py (no dependencies)
│
├─ rag/
│  ├─ embeddings.py → llm/providers
│  ├─ retrieval.py → embeddings, reranking
│  ├─ reranking.py → llm/router
│  └─ context_builder.py → (no dependencies)
│
├─ execution/
│  ├─ sandbox.py → core
│  ├─ validators.py → (no dependencies)
│  └─ file_manager.py → (no dependencies)
│
├─ llm/
│  ├─ providers.py → (external APIs)
│  ├─ router.py → providers
│  └─ streaming.py → providers
│
├─ architect/
│  ├─ conversation.py → llm/router
│  ├─ domains.py → (no dependencies)
│  └─ instruction_gen.py → (no dependencies)
│
└─ search/
   └─ web_search.py → core
```

## Database Schema

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   agents    │◄──────│agent_versions│      │agent_metrics│
│             │       │             │       │             │
│ • id        │       │ • agent_id  │       │ • agent_id  │
│ • name      │       │ • version   │       │ • date      │
│ • config    │       │ • config    │       │ • metrics   │
└─────────────┘       │ • is_active │       └─────────────┘
       │              └─────────────┘
       │
       │              ┌─────────────┐       ┌─────────────┐
       └──────────────►chat_sessions│◄──────│chat_messages│
                      │             │       │             │
                      │ • agent_id  │       │ • session_id│
                      │ • user_id   │       │ • role      │
                      │ • title     │       │ • content   │
                      └─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐
│   users     │◄──────│ llm_usage   │
│             │       │             │
│ • id        │       │ • user_id   │
│ • email     │       │ • agent_id  │
│ • role      │       │ • cost_usd  │
└─────────────┘       └─────────────┘
```

## Request Flow with New Features

```
1. User creates agent
   └─→ Saves to agents table
       └─→ Auto-creates version 1

2. User uploads knowledge file
   └─→ Saves file metadata
       └─→ Queues background task
           └─→ Processes async
               └─→ Updates vector index

3. User starts chat
   └─→ Creates chat_session
       └─→ Loads agent config (with version)
           └─→ Retrieves RAG context
               └─→ Calls LLM
                   └─→ Saves messages
                       └─→ Tracks usage/cost

4. User views analytics
   └─→ Queries agent_metrics
       └─→ Aggregates data
           └─→ Returns dashboard

5. User rolls back version
   └─→ Loads old config
       └─→ Updates agent
           └─→ Marks version active
```

## Scalability Points

```
Horizontal Scaling:
├─ API Layer: Multiple FastAPI instances (load balanced)
├─ Celery Workers: Multiple workers (task distribution)
├─ Redis: Redis Cluster (high availability)
└─ PostgreSQL: Read replicas (query distribution)

Vertical Scaling:
├─ Vector DB: Pinecone/Qdrant (managed, distributed)
├─ File Storage: S3/Azure Blob (unlimited)
└─ Cache: Redis with more memory
```

---

This architecture provides:
- ✅ Modularity (easy to maintain)
- ✅ Scalability (horizontal & vertical)
- ✅ Reliability (background tasks, retries)
- ✅ Observability (metrics, logging)
- ✅ Performance (caching, async processing)
