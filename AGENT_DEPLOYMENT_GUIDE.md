# Agent Deployment Guide

This guide outlines the exact steps to deploy a new agent to AgentGrid, ensuring it works correctly and displays beautiful results in the UI.

## 1. Backend Implementation
Location: `backend/agentgrid-backend/app/agents/`

1.  **Create Agent File**: Create a new file (e.g., `my_agent.py`).
2.  **Inherit BaseAgent**: Your class must inherit from `BaseAgent` and implement `run(inputs)`.
3.  **Dependencies**: Check imports. If you need new libraries (e.g., `pandas`, `openai`):
    *   Add them to `backend/agentgrid-backend/requirements.txt`.
4.  **Registration**:
    *   Open `backend/agentgrid-backend/app/agents/__init__.py`.
    *   Add: `from app.agents.my_agent import MyAgent`.

## 2. Database Seeding (Crucial)
Location: `backend/agentgrid-backend/seed_agents.py`

You must explicitly seed the agent into the database for it to appear.

1.  **Define ID**: Generate a UUID (or use a constant).
    ```python
    MY_AGENT_ID = "..."
    ```
2.  **Create Seed Function**:
    ```python
    def seed_my_agent():
        db = SessionLocal()
        try:
             # ... (Fetch creator code) ...
             
             config = {
                 # ...
                 "required_inputs": [
                     {
                         "name": "my_input", 
                         "type": "select", # Supported: string, select, number, boolean, file
                         "options": [
                             # IMPORTANT: Options must be Objects {value, label}, NOT strings
                             {"value": "opt1", "label": "Option 1"}
                         ]
                     }
                 ]
             }
             
             # ... (Agent creation logic) ...
        except Exception: ...
    ```
3.  **Call Function**: Add `seed_my_agent()` inside the `if __name__ == "__main__":` block at the bottom of the file.

## 3. Frontend Visuals
The frontend (`RichResultDisplay.tsx`) automatically renders results beautifully if you return **JSON**.

### Structured Output (Recommended)
Return a Python dictionary (which becomes JSON). The UI will create a **Card** for each top-level key.
*   **Keys**: Become Card Titles (e.g., `Executive_Summary` -> "EXECUTIVE SUMMARY").
*   **Values**: Rendered as Markdown (supports tables, lists, bold, code blocks).

**Example**:
```python
return {
    "Summary": "This is a **markdown** summary.",
    "Details": "- Point 1\n- Point 2"
}
```

### Magic Keys (Specialized UI)
If your JSON contains specific keys, the UI triggers special widgets:

| Keys | Visual Result |
| :--- | :--- |
| `sql_query`, `python_code`, `code`, `regex_pattern` | **Code Card**: Renders with syntax highlighting and a "Copy" button. |
| `explanation`, `description` (with Code) | Description below the code block. |
| `subject`, `subject_line` AND `body`, `email_body` | **Email Preview**: Renders a subject line and email body card. |

### Plain Text
If you return a simple string, it renders as a single Markdown block.

## 4. Deployment
Run these commands to apply changes:

1.  **Backend** (Installs deps + Seeds DB):
    ```bash
    npx -y @railway/cli up --service backend
    ```
2.  **Frontend** (Updates UI logic if changed):
    ```bash
    npx -y @railway/cli up --service frontend
    ```
