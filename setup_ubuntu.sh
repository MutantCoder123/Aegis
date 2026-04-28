#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Setting up Python dependencies for Computer Vision Modules..."
pip install sqlalchemy asyncpg motor dnspython praw telethon playwright opencv-python scenedetect

echo "Installation complete!"
