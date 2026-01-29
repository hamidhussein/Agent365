# Collaborator Guide - AgentGrid

Welcome to the AgentGrid team. This guide helps you set up the project correctly and keep the codebase healthy.

## One-time setup (Windows)

1. Ensure you are in the repo root (`AgentGrid/`).
2. Start dependencies with Docker:
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
- Docker Compose maps Postgres to `localhost:5435`.
- Set `OPENAI_API_KEY` in the backend `.env` to enable AI features.

## Backend specifics (`backend/agentgrid-backend`)

### Environment and dependencies
```powershell
cd backend/agentgrid-backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Optional: code execution sandbox
```powershell
docker build -t agentgrid-code-exec:latest docker/code-exec
```

### PDF generation
If you see `ImportError: cannot import name '_imaging'`, run:
```powershell
pip install --force-reinstall pillow
```

### Local logs
Files like `last_agent_code.py` and `last_agent_error.log` are for debugging only and must not be committed.

## Frontend specifics (`frontend`)

### Tooling
```powershell
npm run storybook
npx tsc --noEmit
```

## Git hygiene and best practices
1. Work on feature branches (e.g., `feature/your-name-feature`).
2. Do NOT commit:
   - `venv/` or `.venv/`
   - `.env`
   - `__pycache__/`
   - `.generated_files/`
   - `.lancedb/`
3. After pulling updates:
   - If `requirements.txt` or `package.json` changed, run `pip install` / `npm install`.
   - If migrations changed, run `alembic upgrade head`.

## Verify your setup
```powershell
cd backend/agentgrid-backend
.\venv\Scripts\python.exe debug_pdf.py
```
If you see `SUCCESS`, you are ready to go.
