# AgentGrid Developer Setup Guide

This guide provides step-by-step instructions to set up and run the AgentGrid platform locally.

## ✨ New Features
### Advanced Creator Studio
- **Agent Architect**: Conversational builder that helps you create agents using natural language.
- **Live Preview**: Real-time side-by-side chat to test your agent before saving.
- **Enhanced Skills**: Dynamic integration of Web Search and Code Execution.

---

## 🚀 Quick Start (Windows)

> [!IMPORTANT]
> **New Collaborators**: Please read the [Collaborator Guide](COLLABORATOR_GUIDE.md) before pushing any code!

1.  **Start Database**: Ensure Docker Desktop is running.
    ```powershell
    docker compose up -d db
    ```
2.  **Run Services**: Open PowerShell in the project root and run:
    ```powershell
    .\run-app.ps1
    ```
    This will open two terminal windows: one for the backend (port 8000) and one for the frontend (port 3000).

---

## 🛠 Manual Setup

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **Docker** (for PostgreSQL)
- **PostgreSQL 15+** (if not using Docker)

### 2. Backend Setup
The backend is located in `backend/agentgrid-backend`.

```powershell
cd backend/agentgrid-backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

#### Environment Config (`backend/agentgrid-backend/.env`)
```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentgrid
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
OPENAI_API_KEY=your_openai_api_key_here
```

#### Database Initialization
```powershell
# Start the Postgres container (if using Docker)
docker compose up -d db

# Run Alembic migrations to set up the schema
alembic upgrade head

# Seed initial agents
python seed_agents.py
```

#### Start Backend
From the **project root**:
```powershell
$env:PYTHONPATH="backend/agentgrid-backend"; $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agentgrid"; .\backend\agentgrid-backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
The frontend is located in `frontend`.

```powershell
cd frontend
npm install
```

#### Environment Config (`frontend/.env`)
```ini
VITE_API_URL=http://localhost:8000/api/v1
```

#### Start Frontend
```powershell
npm run dev
```

---

## 🔑 Default Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@agentgrid.ai` | `admin123` |
| **Test User** | `testclient_user@example.com` | `Password123!` |

---

## 🔍 Verification

1.  **Frontend**: [http://localhost:3000](http://localhost:3000)
2.  **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
3.  **Creator Studio**: Go to the "Creator Studio" tab to try the new **Agent Architect**.

## 📌 Troubleshooting

- **Database Connection**: If the backend fails to start, ensure Docker is running and the `db` container is up (`docker ps`).
- **Migrations**: If you see `no such table` errors, run `alembic upgrade head`.
- **Unique Constraint Errors**: If you encounter errors during your first run, ensure your `agentgrid` database in Postgres is empty before running migrations.
