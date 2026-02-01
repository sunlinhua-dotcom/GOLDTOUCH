#!/bin/bash

# Configuration
PROJECT_ROOT=$(pwd)
PYTHON_DIR="$PROJECT_ROOT/python-core"
VENV_DIR="$PYTHON_DIR/venv"

# Cleanup function to kill backend when script exits
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    if [ ! -z "$API_PID" ]; then
        echo "   - Killing Quant Core (PID: $API_PID)..."
        kill $API_PID 2>/dev/null
    fi
    echo "✅ Shutdown complete."
    exit
}

# Trap Ctrl+C
trap cleanup SIGINT

echo "🚀 Mojin AI: Starting Hybrid Environment"
echo "========================================"

# Pre-check: MongoDB Warning
# We are not using MongoDB, but logging might complain. Ignoring.

# 1. Setup Python Backend
echo "🐍 [Quant Core] Checking environment..."
cd "$PYTHON_DIR"

# Create venv if missing
if [ ! -d "$VENV_DIR" ]; then
    echo "   - Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source "$VENV_DIR/bin/activate"

# Install dependencies (We do this every time to be safe, but it's fast if cached)
echo "   - Installing/Verifying dependencies..."
pip install fastapi "uvicorn[standard]" akshare pandas python-dotenv langchain langchain-google-genai google-genai backtrader requests toml > /dev/null 2>&1

# Start API in background
echo "   - Starting API Server..."
# We use uvicorn direct or python api.py. API.py has if __main__ block.
python api.py > "$PROJECT_ROOT/backend.log" 2>&1 &
API_PID=$!
echo "   ✅ Quant Core running (PID: $API_PID) on http://localhost:8000"

# 2. Setup Next.js Frontend
cd "$PROJECT_ROOT"
echo "⚛️  [Web Frontend] Starting Next.js..."
echo "========================================"
echo "📝 Backend logs are being written to backend.log"
echo "👉 Press Ctrl+C to stop both services"
echo ""

# Start Next.js
npm run dev
