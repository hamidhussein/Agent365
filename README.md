# AgentGrid Developer Setup Guide

This guide provides step-by-step instructions to set up and run the AgentGrid platform locally.

## 🚀 Quick Start (Windows)

To start both the frontend and backend with a single command:

1.  Open PowerShell in the project root.
2.  Run the following script:
    ```powershell
    .\run-app.ps1
    ```
    This will open two new terminal windows: one for the backend (port 8000) and one for the frontend (port 3000).

---

## 🛠 Manual Setup

If you prefer to run services manually, follow these steps:

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **SQLite**

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
DATABASE_URL=sqlite:///./agentgrid.db
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
OPENAI_API_KEY=your_openai_api_key_here
```

#### Database Initialization
```powershell
# Create tables and seed data
python init_db.py
python seed_agents.py
```

#### Start Backend
From the **project root**:
```powershell
$env:PYTHONPATH="backend/agentgrid-backend"; $env:DATABASE_URL="sqlite:///backend/agentgrid-backend/agentgrid.db"; .\backend\agentgrid-backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
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

Use these credentials to test the application:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@agentgrid.ai` | `admin123` |
| **Test User** | `testclient_user@example.com` | `Password123!` |

---

## 🔍 Verification

1.  **Frontend**: [http://localhost:3000](http://localhost:3000)
2.  **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
3.  **Login**: Use the Admin credentials above to access the full features, including the Creator Studio.

## 📌 Troubleshooting

- **Port Conflicts**: Ensure ports 8000 and 3000 are not in use by other applications.
- **Database Missing Tables**: If you see `no such table` errors, run `python init_db.py` in the backend directory.
- **Frontend API Errors**: Double-check that `frontend/.env` points to `http://localhost:8000/api/v1`.
