#!/usr/bin/env bash

# Check if a file was provided
if [ -z "$1" ]; then
  echo "Usage: ./generate_stream.sh <path_to_video>"
  exit 1
fi

VIDEO_FILE=$1
OUTPUT_DIR="demo_stream"

# Create output dir if not exists
mkdir -p "$OUTPUT_DIR"

echo "[*] Converting $VIDEO_FILE to HLS stream in ./$OUTPUT_DIR..."

# Use FFmpeg to create an HLS playlist and segments
ffmpeg -i "$VIDEO_FILE" \
  -c:v libx264 -preset veryfast -g 60 -sc_threshold 0 \
  -c:a aac -b:a 128k -ac 2 \
  -f hls \
  -hls_time 4 \
  -hls_playlist_type event \
  -hls_segment_filename "$OUTPUT_DIR/seg%03d.ts" \
  "$OUTPUT_DIR/playlist.m3u8"

echo ""
echo "=========================================================="
echo "HLS Stream Generated!"
echo "=========================================================="
echo "1. The playlist is at: $(pwd)/$OUTPUT_DIR/playlist.m3u8"
echo "2. You can provide this absolute path in the Aegis UI."
echo "=========================================================="
