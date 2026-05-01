import asyncio
import subprocess
import os
import io
import logging
from typing import Generator, Optional

class MediaExtractor:
    @staticmethod
    async def get_stream_url(target_url: str) -> Optional[str]:
        """
        Uses yt-dlp to resolve the direct media/stream URL.
        Short-circuits for local files or direct HLS links to avoid overhead.
        """
        if "mock_" in target_url:
            # Simulation Mode: Redirect mock URLs to a stable test stream
            return "https://www.youtube.com/watch?v=21X5lGlDOfg" # NASA Live

        if target_url.endswith((".m3u8", ".mp4", ".ts")) or target_url.startswith(("/", "./", "../")):
            return target_url

        try:
            cmd = ["yt-dlp", "--get-url", "-f", "best", target_url]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                return stdout.decode().strip()
            else:
                logging.error(f"[MediaExtractor] yt-dlp failed: {stderr.decode()}")
                return None
        except Exception as e:
            logging.error(f"[MediaExtractor] Error resolving URL: {e}")
            return None

    @staticmethod
    async def stream_frames(stream_url: str, is_live: bool = False):
        """
        Pipes media stream into FFmpeg and yields raw frames (PNG) at 1fps.
        """
        # FFmpeg command:
        # -i stream_url: input stream
        # -vf fps=1: sample 1 frame per second
        # -f image2pipe: output to pipe
        # -vcodec png: format frames as PNG
        # -: stdout
        
        ffmpeg_cmd = [
            "ffmpeg",
            "-i", stream_url,
            "-vf", "fps=1",
            "-f", "image2pipe",
            "-vcodec", "png",
            "-"
        ]
        
        # If it's a live stream, we might want to add some flags for low latency/real-time
        if is_live:
            ffmpeg_cmd = [
                "ffmpeg",
                "-fflags", "nobuffer+igndts",
                "-i", stream_url,
                "-vf", "fps=1",
                "-f", "image2pipe",
                "-vcodec", "png",
                "-"
            ]

        process = await asyncio.create_subprocess_exec(
            *ffmpeg_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL
        )

        try:
            # PNG frames start with 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
            # and end with 0x49 0x45 0x4E 0x44 0xAE 0x42 0x60 0x82
            
            # We'll read the stream in chunks and split by PNG header/footer or just rely on image2pipe behavior.
            # image2pipe with png codec writes complete PNG files one after another.
            
            buffer = bytearray()
            while True:
                chunk = await process.stdout.read(4096)
                if not chunk:
                    break
                
                buffer.extend(chunk)
                
                # Simple PNG splitting logic:
                # Look for PNG header and the next header to extract a full frame.
                header = b"\x89PNG\r\n\x1a\n"
                
                while True:
                    start_idx = buffer.find(header)
                    if start_idx == -1:
                        # No header found, clear buffer if too large to avoid memory leak
                        if len(buffer) > 1024 * 1024: # 1MB
                            buffer.clear()
                        break
                    
                    next_header_idx = buffer.find(header, start_idx + len(header))
                    if next_header_idx == -1:
                        # Only one header found, wait for more data
                        break
                    
                    # We have a full PNG frame
                    frame_data = buffer[start_idx:next_header_idx]
                    yield frame_data
                    
                    # Remove processed frame from buffer
                    del buffer[:next_header_idx]

        except Exception as e:
            logging.error(f"[MediaExtractor] Stream processing error: {e}")
        finally:
            if process.returncode is None:
                try:
                    process.terminate()
                    await process.wait()
                except:
                    pass
            logging.info("[MediaExtractor] FFmpeg process cleaned up.")
