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
            target_url = "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4"

        if target_url.endswith((".m3u8", ".mp4", ".ts")) or target_url.startswith(("/", "./", "../")):
            return target_url

        try:
            cmd = [
                "python3", "-m", "yt_dlp", 
                "--get-url", 
                "-f", "best", 
                "--extractor-args", "youtube:player_client=android,web",
                "--no-check-certificates",
                "--ignore-config",
                "--no-warnings",
                "--add-header", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "--add-header", "Accept-Language: en-US,en;q=0.9",
                target_url
            ]
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
                        err_msg = stderr_data.decode()
                        print(f"[MediaExtractor] FFmpeg exited with code {process.returncode}: {err_msg}")
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
            # Final cleanup and check for last frame
            if process.returncode is None:
                try:
                    # Give it a tiny bit of time to finish
                    await asyncio.sleep(0.1)
                    if process.returncode is None:
                        process.terminate()
                except:
                    pass
            
            # Read any remaining data in buffer
            if buffer:
                header = b"\x89PNG\r\n\x1a\n"
                start_idx = buffer.find(header)
                if start_idx != -1:
                    yield buffer[start_idx:]
            
            # Get return code and stderr
            return_code = await process.wait()
            stderr_data = await process.stderr.read()
            if return_code != 0 and return_code != -15: # -15 is SIGTERM
                print(f"[MediaExtractor] FFmpeg failed with code {return_code}: {stderr_data.decode()}")
            
            logging.info(f"[MediaExtractor] FFmpeg process cleaned up with code {return_code}")
