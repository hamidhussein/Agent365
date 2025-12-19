# AgentGrid Developer Setup Guide

This guide provides step-by-step instructions to set up and run the AgentGrid platform locally.

## Prerequisites

Ensure you have the following installed on your machine:
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **Git**
- **SQLite** (included with Python, but a viewer like DB Browser for SQLite is recommended)

## 1. Clone the Repository

```bash
git clone <repository-url>
cd AgentGrid
```

## 2. Backend Setup

The backend is built with FastAPI and uses SQLite as the database.

### Navigate to the backend directory
```bash
cd backend/agentgrid-backend
```

### Create and Activate Virtual Environment
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
# Install additional dependencies for SEO Agent
pip install pandas beautifulsoup4 lxml reportlab langchain_openai
```

### Environment Configuration
Create a `.env` file in `backend/agentgrid-backend` with the following content:
```ini
DATABASE_URL=sqlite:///./agentgrid.db
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
OPENAI_API_KEY=your_openai_api_key_here
```

### Database Setup
Initialize the database and apply migrations:
```bash
# Apply migrations
alembic upgrade head

# Seed initial data (Users and Agents)
python seed_agents.py
```

### Run the Backend Server
```bash
python -m uvicorn app.main:app --reload --port 8001
```
The API will be available at `http://localhost:8001`.
API Documentation: `http://localhost:8001/docs`

## 3. Frontend Setup

The frontend is built with React, Vite, and Tailwind CSS.

### Navigate to the frontend directory
Open a new terminal window and run:
```bash
cd frontend
```

### Install Dependencies
```bash
npm install
```

### Environment Configuration
Create a `.env` file in `frontend` (optional, defaults are usually fine for local dev):
```ini
VITE_API_URL=http://localhost:8001/api/v1
```

### Run the Frontend Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000` (or the port shown in the terminal).

## 4. Verification

1.  Open `http://localhost:3000` in your browser.
2.  **Login** with the seeded test user:
    *   **Email:** `testclient_user@example.com`
    *   **Password:** `Password123!`
3.  Navigate to the **Marketplace**.
4.  You should see the **Echo Agent** and **SEO Audit Agent**.
5.  Click on **SEO Audit Agent** and try running it with a valid URL and OpenAI API Key.

## Troubleshooting

*   **Backend 500 Errors:** Check the terminal running `uvicorn` for tracebacks.
*   **Database Issues:** If you encounter DB errors, try deleting `agentgrid.db` and re-running `alembic upgrade head` and `seed_agents.py`.
*   **Frontend Connection Refused:** Ensure the backend is running on port 8001. Check `VITE_API_URL` in `.env`.

## 5. How to Add New Agents

To add a new agent to the platform (like the SEO Audit Agent), follow these steps:

### Step 1: Create the Agent File
Create a new Python file in `backend/agentgrid-backend/app/agents/` (e.g., `my_new_agent.py`).
Implement your agent class inheriting from `BaseAgent` and decorate it with `@register_agent`.

```python
from app.agents.base import BaseAgent, AgentInput, AgentOutput
from app.agents.registry import register_agent
import uuid

MY_AGENT_ID = "your-uuid-here"

@register_agent(MY_AGENT_ID)
class MyNewAgent(BaseAgent):
    # Implement name, description, inputs, outputs, and run() method
    ...
```

### Step 2: Register the Agent
Open `backend/agentgrid-backend/app/agents/__init__.py` and import your new agent class. This ensures it gets registered when the app starts.

```python
from app.agents.my_new_agent import MyNewAgent
```

### Step 3: Seed the Agent
Open `backend/agentgrid-backend/seed_agents.py`.
1.  Import your agent ID.
2.  Create a `seed_my_agent()` function that checks if the agent exists and adds it to the DB if not.
3.  Call this function in the `if __name__ == "__main__":` block.

### Step 4: Install Dependencies
If your agent requires new Python packages:
1.  Install them: `pip install <package_name>`
2.  Add them to `requirements.txt`: `pip freeze > requirements.txt`

### Step 5: Verify
1.  Restart the backend server.
2.  Run the seed script: `python seed_agents.py`
3.  Check the Marketplace in the frontend to see your new agent!
