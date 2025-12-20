#!/bin/bash
set -e

# Wait for Postgres to be ready
echo "Waiting for postgres..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "Postgres started"

# Run migrations
alembic upgrade head

# Seed data (optional, but good for first run)
python seed_agents.py

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8001
