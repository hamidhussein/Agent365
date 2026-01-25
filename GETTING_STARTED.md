# 🏁 Getting Started with AgentGrid

Follow this guide to successfully pull the project and run it on your local machine.

---

## 1. 📥 Pull the Latest Changes

If you are joining the team, clone the repository and switch to the development branch:

```powershell
# Clone the repository
git clone https://github.com/axeecom/AgentGrid.git
cd AgentGrid

# Switch to the active feature branch (if applicable)
git checkout feature/hamid-agentgrid-updates
```

---

## 2. 🐍 Backend Setup

The backend uses FastAPI and PostgreSQL.

1.  **Navigate to backend directory**:
    ```powershell
    cd backend/agentgrid-backend
    ```
2.  **Create and activate Virtual Environment**:
    ```powershell
    python -m venv venv
    .\venv\Scripts\activate  # Windows
    # source venv/bin/activate # Mac/Linux
    ```
3.  **Install dependencies**:
    ```powershell
    pip install -r requirements.txt
    ```
4.  **Configure Environment Variables**:
    Create a `.env` file in `backend/agentgrid-backend/` (use `.env.example` as a template):
    ```ini
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentgrid
    SECRET_KEY=your_secret_key_here
    ALGORITHM=HS256
    OPENAI_API_KEY=sk-xxxx...  # Required for AI features
    ```
5.  **Initialize Database**:
    Ensure Docker Desktop is running, then:
    ```powershell
    docker compose up -d db
    alembic upgrade head
    python seed_agents.py
    ```

---

## 🎨 3. Frontend Setup

The frontend uses React (Vite) and Tailwind CSS.

1.  **Navigate to frontend directory**:
    ```powershell
    cd ../../frontend
    ```
2.  **Install dependencies**:
    ```powershell
    npm install
    ```
3.  **Configure Environment**:
    Create a `.env` file in `frontend/`:
    ```ini
    VITE_API_URL=http://localhost:8000/api/v1
    ```

---

## 🚀 4. Running the Application

### The Easy Way (Windows)
From the **project root**, run the provided automation script:
```powershell
.\run-app.ps1
```
*This will open two terminal windows and start everything automatically.*

### The Manual Way
**Start Backend (Port 8000)**:
```powershell
cd backend/agentgrid-backend
uvicorn app.main:app --port 8000 --reload
```

**Start Frontend (Port 3000)**:
```powershell
cd frontend
npm run dev
```

---

## 🔍 5. Verification

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Default Login**: `admin@agentgrid.ai` / `admin123`

---

## 📌 Troubleshooting
- **400 Bad Request on Register**: This usually means the email or username is already taken. Check the backend logs for `[DEBUG]` messages.
- **ImportError / Missing Modules**: Ensure your Virtual Environment is activated before running backend commands.
- **Port Conflict**: If port 8000 or 3000 is in use, you can change them in `run-app.ps1` or commands.
