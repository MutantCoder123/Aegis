import asyncio
import os
import random
import re
from datetime import datetime, timezone
import httpx
from database import social_intel_collection, raw_telemetry_collection
import traceback

# --- 1. REDDIT DAEMON (PRAW) ---
# Note: For hackathon safety, we simulate the PRAW comment stream if keys are missing
# but keep the structure robust for real credentials.
import praw
async def scrape_reddit():
    print("[*] Starting Reddit daemon...")
    reddit_client_id = os.getenv("REDDIT_CLIENT_ID")
    if not reddit_client_id:
        print("[!] No REDDIT_CLIENT_ID provided. Simulating reddit PRAW stream.")
        while True:
            intel_record = {
                "platform": "Reddit",
                "group_name": "r/soccerstreams",
                "extracted_text": "1080p stream working perfectly: streamhub-mirror[.]ru",
                "raw_url": "reddit.com/r/soccerstreams/comments/x/live_match",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "members_count": random.randint(300000, 500000),
                "action": "Monitoring",
            }
            await social_intel_collection.insert_one(intel_record)
            await asyncio.sleep(60)
    else:
        # Real PRAW implementation
        reddit = praw.Reddit(
            client_id=os.getenv("REDDIT_CLIENT_ID"),
            client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
            user_agent=os.getenv("REDDIT_USER_AGENT", "AegisBot/1.0"),
        )
        subreddit = reddit.subreddit("soccerstreams")
        try:
            for comment in subreddit.stream.comments(skip_existing=True): # Blocking call wrapped in async ideally, but simplified for hackathon
                url_match = re.search(r"(?P<url>https?://[^\s]+)", comment.body)
                if url_match:
                    intel_record = {
                        "platform": "Reddit",
                        "group_name": f"r/{subreddit.display_name}",
                        "extracted_text": comment.body,
                        "raw_url": url_match.group("url"),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "members_count": subreddit.subscribers,
                        "action": "Monitoring"
                    }
                    await social_intel_collection.insert_one(intel_record)
                    print("[Reddit] New link ingested.")
                await asyncio.sleep(1) # Yield to event loop
        except Exception as e:
            print(f"[Reddit Error] {e}")


# --- 2. TELEGRAM DAEMON (Telethon) ---
# Similar to Reddit, we build the Telethon logic but fallback to simulation if keys are missing
from telethon import TelegramClient, events
async def scrape_telegram():
    print("[*] Starting Telegram listener...")
    api_id = os.getenv("TELEGRAM_API_ID")
    if not api_id:
         print("[!] No TELEGRAM_API_ID provided. Simulating Telethon stream.")
         while True:
             intel_record = {
                 "platform": "Telegram",
                 "group_name": "LiveMatchHD",
                 "extracted_text": "HD Stream link in bio! Fast before takedown.",
                 "raw_url": "t.me/LiveMatchHD/8421",
                 "timestamp": datetime.now(timezone.utc).isoformat(),
                 "members_count": random.randint(150000, 200000),
                 "action": "Injecting Ads"
             }
             await social_intel_collection.insert_one(intel_record)
             await asyncio.sleep(45)
    else:
        api_id = int(api_id)
        api_hash = os.getenv("TELEGRAM_API_HASH")
        client = TelegramClient('aegis_session', api_id, api_hash)
        await client.start()
        
        # Listen to specified target channels
        @client.on(events.NewMessage(chats=['LiveMatchHD', 'SoccerStreamsOfficial']))
        async def handler(event):
            url_match = re.search(r"(?P<url>https?://[^\s]+)", event.text)
            if url_match:
                 intel_record = {
                     "platform": "Telegram",
                     "group_name": event.chat.username or "Unknown",
                     "extracted_text": event.text,
                     "raw_url": url_match.group("url"),
                     "timestamp": datetime.now(timezone.utc).isoformat(),
                     "members_count": 0, # Fetching participants requires extra API calls
                     "action": "Logging"
                 }
                 await social_intel_collection.insert_one(intel_record)
                 print("[Telegram] New link ingested.")
                 
        print("[*] Telethon listening for events...")
        await client.run_until_disconnected()


# --- 3. HEADLESS SCRAPER (Playwright) ---
from playwright.async_api import async_playwright
async def run_headless_scraper():
    """
    Watches MongoDB for new URLs, boots Playwright to intercept .m3u8 traffic
    and fires it to the local /analyze_media endpoint.
    """
    print("[*] Starting Playwright Headless Interceptor...")
    
    # We will simulate this to loop locally just for testing, but in production
    # this would listen to an asynchronous queue from the Reddit/Telegram scrapers.
    # Use a real local segment from demo_stream for simulation since mock URLs cause FFmpeg hangs.
    video_target_url = "/home/indranil/GoogleSolution/DigitalAssetProtection/demo_stream/seg003.ts" 
    
    while True:
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                # Setup request interception to find video streams
                m3u8_found = None
                
                async def intercept(request):
                    nonlocal m3u8_found
                    if ".m3u8" in request.url:
                        m3u8_found = request.url
                    await request.continue_() # Pass through
                
                await page.route("**/*", intercept)
                
                # Mock navigation
                # await page.goto(video_target_url)  # Disabled to not spam actual example.com
                await asyncio.sleep(2)
                
                # Simulate finding a real path
                m3u8_found = video_target_url
                
                if m3u8_found:
                    print(f"[Playwright] Intercepted stream payload: {m3u8_found}")
                    
                    # Fire to our own API
                    async with httpx.AsyncClient() as client:
                        payload = {
                            "media_url": m3u8_found,
                            "username": "headless_worker",
                            "post_text": "Intercepted from Playwright"
                        }
                        try:
                            # We send it to our own FastAPI backend
                            await client.post("http://127.0.0.1:8000/analyze_media", json=payload, timeout=30.0)
                        except httpx.ConnectError:
                            pass # FastAPI not running yet
                        except httpx.TimeoutException:
                            print("[Playwright] API request timed out waiting for backend analysis.")
                            pass
                            
                await browser.close()
        except Exception as e:
            print(f"[Playwright Error] {type(e).__name__}: {e}")
            
        await asyncio.sleep(60)

async def run_worker():
    print("Starting Asynchronous Ingestion Daemons (MongoDB Polyglot Persistence)...")
    await asyncio.gather(
        scrape_telegram(),
        scrape_reddit(),
        run_headless_scraper()
    )

if __name__ == "__main__":
    asyncio.run(run_worker())
