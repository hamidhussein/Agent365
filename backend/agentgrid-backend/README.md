# AgentGrid Backend

## Local Setup

```bash
cd backend/agentgrid-backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # update with real secrets
uvicorn app.main:app --reload
```

## Database & Migrations

After configuring `.env` with your database URL, run:

```bash
alembic upgrade head       # apply migrations
alembic revision -m "..."  # generate new migration
```

## Project Structure (initial)

```
app/
  api/
    api_v1.py
    v1/endpoints/health.py
  core/{config.py,deps.py}
  db/{base.py, session.py}
  models/
  schemas/
  main.py
tests/unit/test_health.py
.env.example
requirements.txt
.gitignore
alembic/
  env.py
  versions/
```
