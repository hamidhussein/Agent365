# 👥 Collaborator Guide - AgentGrid

Welcome to the AgentGrid team! This guide will help you set up the project correctly and maintain a high-quality codebase.

---

## 🛠 One-Time Setup (Windows)

### 1. Zero-Config Environment
We've provided a PowerShell script to launch everything.
1.  **Repo Structure**: Ensure you are in the root directory `AgentGrid/`.
2.  **Start Database**: 
    ```powershell
    docker compose up -d db
    ```
3.  **Run Application**:
    ```powershell
    .\run-app.ps1
    ```
    *This will auto-detect your Python path, set the database environment, and launch both Backend and Frontend in separate windows.*

---

## 🐍 Backend Specifics (`backend/agentgrid-backend`)

### Environment & Dependencies
1.  **Virtual Environment**: Always use a virtual environment.
    ```powershell
    cd backend/agentgrid-backend
    python -m venv venv
    .\venv\Scripts\activate
    pip install -r requirements.txt
    ```
2.  **PDF Generation**: This project uses `fpdf2` and `pillow`. If you see "ImportError: cannot import name '_imaging'", run:
    ```powershell
    pip install --force-reinstall pillow
    ```
3.  **Local Logs**: Files like `last_agent_code.py` and `last_agent_error.log` are for debugging only and are ignored by Git. Do NOT commit them.

---

## 🎨 Frontend Specifics (`frontend`)

### Tooling
1.  **Storybook**: Use it to develop components in isolation.
    ```powershell
    npm run storybook
    ```
2.  **Type Checking**: Ensure no errors before pushing.
    ```powershell
    npx tsc --noEmit
    ```

---

## 🚩 Git Hygiene & Best Practices

1.  **Branching**: Work on feature branches (e.g., `feature/your-name-feature`).
2.  **Do NOT Commit**:
    - `venv/` or `.venv/` (Virtual environments)
    - `.env` (Secrets/Local config)
    - `__pycache__`
    - `.generated_files/` (Local agent output)
    - `.lancedb/` (Local vector database)
3.  **Pulling Updates**:
    - After pulling, always check if `requirements.txt` or `package.json` changed and run `pip install`/`npm install`.
    - If there are database changes, run `alembic upgrade head`.

---

## 🚀 Verifying your Setup
Run the built-in validation script to ensure PDF generation and environment are correct:
```powershell
cd backend/agentgrid-backend
.\venv\Scripts\python.exe debug_pdf.py
```
If you see `SUCCESS`, you are ready to go!
