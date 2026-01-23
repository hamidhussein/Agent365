#!/bin/bash

# run-app.sh
# This script starts both the backend and frontend for AgentGrid.

echo "Starting AgentGrid services..."

# Define paths
BACKEND_DIR="backend/agentgrid-backend"
FRONTEND_DIR="frontend"

# 1. Start Backend in background
echo "Starting Backend on port 8000..."
export PYTHONPATH="backend/agentgrid-backend"
export DATABASE_URL="sqlite:///backend/agentgrid-backend/agentgrid.db"
cd $BACKEND_DIR
./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ../..

# 2. Start Frontend in background
echo "Starting Frontend on port 3000..."
cd $FRONTEND_DIR
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Services are running."
echo "Backend PID: $BACKEND_PID (http://localhost:8000/docs)"
echo "Frontend PID: $FRONTEND_PID (http://localhost:3000)"

# Handle cleanup
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM EXIT
wait
