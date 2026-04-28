#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=========================================================="
echo "          Starting Aegis Architecture Setup               "
echo "=========================================================="

echo "[1/3] Installing Python Dependencies..."
pip install fastapi uvicorn pydantic sentence-transformers Pillow requests numpy python-dotenv google-genai
pip install sqlalchemy asyncpg motor dnspython praw telethon playwright opencv-python scenedetect httpx

echo "[2/3] Installing Playwright Chromium Dependencies..."
playwright install --with-deps

echo "[3/3] Checking Environment Variables..."
if [ ! -f .env ]; then
    echo "Creating a default .env file..."
    cat << EOF > .env
# Environment Configuration for Aegis

# 1. Supabase Cloud PostgreSQL (The Ledger)
# Use Transaction Pooler URL (Port 6543)
SUPABASE_DB_URL="postgresql://postgres:[YOUR_ENCODED_PASSWORD]@aws-0-pooler.supabase.com:6543/postgres"

# 2. MongoDB Atlas (The Unstructured Data Lake)
MONGO_URI="mongodb+srv://[USER]:[PASSWORD]@[CLUSTER].mongodb.net/aegis_telemetry?retryWrites=true&w=majority"

# 3. Computer Vision & LLM
GEMINI_API_KEY="[YOUR_API_KEY]"

# 4. Web Scraper Keys (Optional, falls back to simulated mode if missing)
REDDIT_CLIENT_ID=""
REDDIT_CLIENT_SECRET=""
TELEGRAM_API_ID=""
TELEGRAM_API_HASH=""

EOF
    echo "Created .env file. Please populate it with your actual keys."
else
    echo ".env file found."
fi

echo "=========================================================="
echo "Setup Complete!"
echo ""
echo "Quick Start Commands:"
echo "1. Boot Backend:        uvicorn main:app --reload"
echo "2. Boot UI:             cd frontend && npm run dev"
echo "3. Run Scrapers:        python ingestion_worker.py"
echo "4. Simulate Traffic:    python firehose_simulator.py"
echo "5. Add Extension:       Load 'chrome_extension/' folder manually in Chrome/Edge at chrome://extensions"
echo "=========================================================="
