# Getting Started with AgentGrid

Follow this guide to pull the project and run it locally.

## 1. Pull the repository

```powershell
# Clone the repository
git clone https://github.com/axeecom/AgentGrid.git
cd AgentGrid

# Switch to the active feature branch
git checkout feature/hamid-agentgrid-updates
```

## 2. Backend setup

1. Navigate to the backend directory:
   ```powershell
   cd backend/agentgrid-backend
   ```
2. Create and activate a virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate  # Windows
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   - Copy `backend/agentgrid-backend/.env.example` to `.env` and adjust as needed.
   - If you use Docker Compose for Postgres, the host port is `5435`.
5. Initialize the database:
   ```powershell
   docker compose up -d db redis
   alembic upgrade head
   python seed_agents.py
   ```
6. Optional: build the code execution sandbox:
   ```powershell
   docker build -t agentgrid-code-exec:latest backend/agentgrid-backend/docker/code-exec
   ```

## 3. Frontend setup

1. Navigate to the frontend directory:
   ```powershell
   cd ../../frontend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Configure environment:
   - Copy `frontend/.env.example` to `frontend/.env`.
   - Default API URL for local backend:
     ```ini
     VITE_API_URL=http://localhost:8000/api/v1
     ```

## 4. Run the application

### Option A: Windows quick start
From the project root:
```powershell
.\run-app.ps1
```

### Option B: Manual
Start backend (port 8000):
```powershell
cd backend/agentgrid-backend
uvicorn app.main:app --port 8000 --reload
```

Start frontend (port 3000):
```powershell
cd frontend
npm run dev
```

### Option C: Docker-only full stack
```powershell
docker compose up --build
```
Frontend: http://localhost:3000
Backend: http://localhost:8001/docs

## 5. Verification
- Frontend: http://localhost:3000
- API documentation: http://localhost:8000/docs
- Default login: `admin@agentgrid.ai` / `admin123`

## Troubleshooting
- Database errors: ensure Docker is running and `DATABASE_URL` points to port 5435.
- Missing tables: run `alembic upgrade head`.
- Port conflicts: adjust ports in `run-app.ps1` or your commands.
