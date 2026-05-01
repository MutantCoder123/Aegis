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
            return "https://www.youtube.com/watch?v=21X5lGlDOfg" 

        if target_url.endswith((".m3u8", ".mp4", ".ts")) or target_url.startswith(("/", "./", "../")):
            return target_url

        try:
            cmd = ["yt-dlp", "--get-url", "-f", "best", target_url]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            # Add a timeout to prevent hanging if yt-dlp is throttled
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30.0)
            except asyncio.TimeoutError:
                process.terminate()
                logging.error(f"[MediaExtractor] yt-dlp timed out for {target_url}")
                return None
            
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
        ffmpeg_cmd = [
            "ffmpeg",
            "-i", stream_url,
            "-vf", "fps=1",
            "-f", "image2pipe",
            "-vcodec", "png",
            "-"
        ]
        
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
            stderr=asyncio.subprocess.PIPE # CAPTURE ERROR LOGS
        )

        try:
            buffer = bytearray()
            while True:
                # Read stdout for image data
                chunk = await process.stdout.read(4096)
                if not chunk:
                    # Check stderr if process ended early
                    if process.returncode is not None and process.returncode != 0:
                        stderr_data = await process.stderr.read()
                        logging.error(f"[MediaExtractor] FFmpeg exited with code {process.returncode}: {stderr_data.decode()}")
                    break
                
                buffer.extend(chunk)
                header = b"\x89PNG\r\n\x1a\n"
                
                while True:
                    start_idx = buffer.find(header)
                    if start_idx == -1:
                        if len(buffer) > 1024 * 1024:
                            buffer.clear()
                        break
                    
                    next_header_idx = buffer.find(header, start_idx + len(header))
                    if next_header_idx == -1:
                        break
                    
                    frame_data = buffer[start_idx:next_header_idx]
                    yield frame_data
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
