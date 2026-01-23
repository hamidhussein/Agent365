# run-app.ps1
# This script starts both the backend and frontend for AgentGrid.

Write-Host "Starting AgentGrid services..." -ForegroundColor Cyan

# Define paths
$BackendDir = "backend\agentgrid-backend"
$FrontendDir = "frontend"
$BackendVenv = "$BackendDir\venv\Scripts\python.exe"

# 1. Start Backend in a new window
Write-Host "Starting Backend on port 8000..." -ForegroundColor Green
$BackendCommand = "`$env:PYTHONPATH='backend/agentgrid-backend'; `$env:DATABASE_URL='sqlite:///backend/agentgrid-backend/agentgrid.db'; & '$BackendVenv' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCommand

# 2. Start Frontend in a new window
Write-Host "Starting Frontend on port 3000..." -ForegroundColor Green
$FrontendCommand = "cd $FrontendDir; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCommand

Write-Host "Services are starting in new windows." -ForegroundColor Yellow
Write-Host "Backend: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Gray
