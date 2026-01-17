# PostgreSQL Migration Plan

This document outlines the step-by-step process to migrate the **AgentGrid** backend from SQLite to **PostgreSQL**. This switch will improve concurrency, data integrity, and production readiness.

## 1. Prerequisites
- [ ] Install PostgreSQL (locally or in a Docker container).
- [ ] Create a new database named `agentgrid`.
- [ ] Create a database user with appropriate permissions.

## 2. Dependency Updates
- [ ] Install the PostgreSQL adapter for Python:
  ```bash
  pip install psycopg2-binary
  ```
- [ ] Update `requirements.txt` to include `psycopg2-binary`.

## 3. Configuration Changes
- [ ] Update `.env` in the backend directory:
  ```env
  # Replace SQLite URL with PostgreSQL URL
  # Format: postgresql+psycopg2://user:password@host:port/dbname
  DATABASE_URL=postgresql+psycopg2://postgres:yourpassword@localhost:5432/agentgrid
  ```
- [ ] Verify `app/core/config.py` correctly picks up the environment variable.

## 4. Database Schema Migration
Because we use Alembic, we don't need to manually create tables.
- [ ] Run the migration command to build the schema in the new database:
  ```bash
  alembic upgrade head
  ```

## 5. Data Migration (Optional but Recommended)
If you want to keep your existing agents and users from `agentgrid.db`:
- [ ] **Method A (CSV/Script)**: Use a script to read from SQLite and write to PostgreSQL.
- [ ] **Method B (pgloader)**: Use a tool like `pgloader` to automate the transition from SQLite to Postgres.
- [ ] **Method C (Fresh Start)**: Run existing seed scripts to populate the new DB:
  ```bash
  python seed_agents.py
  ```

## 6. Verification Steps
- [ ] **Startup**: Start the backend and ensure no connection errors:
  ```bash
  uvicorn app.main:app --port 8001
  ```
- [ ] **API Check**: Hit the `/api/v1/agents/` endpoint to verify data retrieval.
- [ ] **JSON Handling**: Create a test Creator Studio agent to ensure Postgres handles the JSONB fields correctly.

## 7. Post-Migration Cleanup
- [ ] Once verified, delete the old `agentgrid.db` file.
- [ ] Archive any SQLite-specific backup files.

> [!IMPORTANT]
> PostgreSQL is case-sensitive regarding column names if quoted, and handles transactions more strictly. Always ensure your database connection string uses the `psycopg2` driver for best compatibility with SQLAlchemy.
