# AgentGrid Developer Setup Guide

This guide provides step-by-step instructions to set up and run the AgentGrid platform locally.

## Highlights
- Creator Studio with Agent Architect, live preview, and optional web search/code execution tools.
- Marketplace and dashboard UI updates.

## Quick start (Windows)

IMPORTANT: New collaborators should read GETTING_STARTED.md and COLLABORATOR_GUIDE.md first.

1. Checkout the feature branch:
   ```powershell
   git checkout feature/hamid-agentgrid-updates
   ```
2. Start database and Redis (Docker Desktop required):
   ```powershell
   docker compose up -d db redis
   ```
3. Copy environment templates:
   - `backend/agentgrid-backend/.env.example` -> `backend/agentgrid-backend/.env`
   - `frontend/.env.example` -> `frontend/.env`
4. Run the app:
   ```powershell
   .\run-app.ps1
   ```

Notes:
- Docker compose maps Postgres to `localhost:5435`. If you use local Postgres on `5432`, update `DATABASE_URL`.
- Set `OPENAI_API_KEY` in `backend/agentgrid-backend/.env` to enable AI features.

## Manual setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Docker Desktop (Postgres/Redis and optional code-execution sandbox)

### Backend setup
The backend is located in `backend/agentgrid-backend`.

```powershell
cd backend/agentgrid-backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

#### Environment config (`backend/agentgrid-backend/.env`)
Copy `backend/agentgrid-backend/.env.example` to `.env` and adjust as needed.
- Required: `DATABASE_URL`
- Recommended: `OPENAI_API_KEY` (enables AI features)

#### Database initialization
```powershell
# Start Postgres and Redis (Docker)
docker compose up -d db redis

# Run migrations
alembic upgrade head

# Seed initial agents
python seed_agents.py
```

#### Optional: Code execution sandbox
Code execution runs in a Docker sandbox when enabled.
```powershell
docker build -t agentgrid-code-exec:latest backend/agentgrid-backend/docker/code-exec
```
If you enable code execution, ensure Docker is running and `CODE_EXECUTION_USE_DOCKER=true` (the default in production).

#### Start backend
From the project root:
```powershell
$env:PYTHONPATH="backend/agentgrid-backend"; $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5435/agentgrid"; .\backend\agentgrid-backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend setup
The frontend is located in `frontend`.

```powershell
cd frontend
npm install
```

#### Environment config (`frontend/.env`)
```ini
VITE_API_URL=http://localhost:8000/api/v1
```

#### Start frontend
```powershell
npm run dev
```

## Docker-only option (full stack)
If you prefer running everything in Docker:
```powershell
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8001/docs

## Default credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| Admin | `admin@agentgrid.ai` | `admin123` |
| Test User | `testclient_user@example.com` | `Password123!` |

## Verification
1. Frontend: http://localhost:3000
2. Backend API docs: http://localhost:8000/docs
3. Creator Studio: Use the "Creator Studio" tab to try the Agent Architect.

## Troubleshooting
- Database connection errors: ensure Docker is running and `DATABASE_URL` uses port 5435.
- Missing tables: run `alembic upgrade head`.
- Code execution errors: build the sandbox image and confirm Docker is running.
