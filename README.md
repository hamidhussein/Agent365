# AgentGrid (Standalone Creator Studio)

This repo now runs as a private Creator Studio platform (no public marketplace, no credits, no review workflow).

## What It Does
- Authenticated users create and manage private AI agents.
- Creator Studio supports RAG file uploads, web search, and optional code execution.
- Admins manage LLM provider configs and platform settings.

## Services (Docker Compose)
- `db` (Postgres) on `localhost:5435`
- `backend` (FastAPI) on `localhost:8001`
- `frontend` (Vite) on `localhost:3000`

`redis` has been removed from the default stack.

## Quick Start (Docker)
```powershell
docker compose up -d --remove-orphans
docker compose ps
```

Open:
- Frontend: `http://localhost:3000`
- Backend docs: `http://localhost:8001/docs`

## Backend Local Development (Windows / PowerShell)
```powershell
cd D:\Axeecom\Agent365\backend\agentgrid-backend
python -m venv venv
.\venv\Scripts\activate
pip install -e .
$env:PYTHONPATH="."
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5435/agent365"
.\venv\Scripts\python.exe -m alembic upgrade head
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## Frontend Local Development
```powershell
cd D:\Axeecom\Agent365\frontend
npm install
```

Create `frontend/.env`:
```ini
VITE_API_URL=http://localhost:8001/api/v1
```

Run:
```powershell
npm run dev
```

## Environment Notes
- Set `OPENAI_API_KEY` for AI features.
- Postgres database name is `agent365` in the default compose setup.
- Code execution is optional and should use Docker in non-local environments (`CODE_EXECUTION_REQUIRE_DOCKER=true`).

## Default Seeded Accounts
Seed data creates:
- 1 admin account (configurable via `ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- 1 demo creator account (configurable via `DEMO_CREATOR_EMAIL` / `DEMO_CREATOR_PASSWORD`)

Check `backend/agentgrid-backend/seed_agents.py` for current defaults.

## Verification Checklist
1. `GET http://localhost:8001/api/v1/health` returns `200`.
2. `GET http://localhost:8001/api/v1/agents/` returns `404` (removed marketplace endpoint).
3. `GET http://localhost:8001/creator-studio/api/agents` returns `401` without auth.
4. Log in and land on `/studio`.

## Documentation

- **[FEATURES.md](FEATURES.md)** - Complete feature guide including Agent Sharing, API reference, and troubleshooting
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Initial setup and installation
- **[ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)** - System architecture overview
- **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - Platform improvements and enhancements
- **[COLLABORATOR_GUIDE.md](COLLABORATOR_GUIDE.md)** - Team collaboration guide
