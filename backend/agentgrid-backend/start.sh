#!/bin/bash
set -e

# Wait for Postgres to be ready
# echo "Waiting for postgres..."
# while ! nc -z db 5432; do
#   sleep 0.1
# done
echo "Skipping netcat check for Railway"

# Run migrations
alembic upgrade head

# Seed data (optional, but good for first run)
# Seed data (optional, but good for first run)
python seed_agents.py

# Upgrade SEO Agent inputs (remove API key)
# python upgrade_seo_agent.py

# Start the server
if [ "$RELOAD" = "true" ]; then
    echo "Starting with reload..."
    uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001} --reload --proxy-headers --forwarded-allow-ips '*'
else
    uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001} --proxy-headers --forwarded-allow-ips '*'
fi
