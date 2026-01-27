# AgentGrid Backend

The backend for AgentGrid, powered by FastAPI, SQLAlchemy, and PostgreSQL.

## Local Setup

1. **Prerequisites**: Python 3.10+, Docker (for PostgreSQL).
2. **Environment**: Ensure `.env` contains your PostgreSQL `DATABASE_URL`.
   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentgrid
   ```
3. **Install Dependencies**:
   ```bash
   cd backend/agentgrid-backend
   python -m venv venv
   source venv/bin/activate  # venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```
4. **Initialize Database**:
   ```bash
   alembic upgrade head
   python seed_agents.py
   ```
5. **Run Server**:
   ```bash
   uvicorn app.main:app --reload
   ```

## Key Services
- **Creator Studio**: Backend logic for agent building and previewing.
- **Agent Architect**: Conversational AI service for guided creation.
- **RAG Engine**: Vector-based knowledge retrieval for agents.

## Migrations
We use Alembic for versioning our PostgreSQL schema:
- `alembic upgrade head`: Apply all migrations.
- `alembic revision --autogenerate -m "description"`: Create a new migration after model changes.
