# Aegis Ingestion Worker - VERSION 2.0 - FIXED POLLING
import asyncio
import os
import random
import re
from datetime import datetime, timezone
import httpx
from database import social_intel_collection, raw_telemetry_collection
import traceback

# --- 1. REDDIT DAEMON ---
async def scrape_reddit():
    print("[*] Starting Reddit daemon...")
    reddit_client_id = os.getenv("REDDIT_CLIENT_ID")
    if not reddit_client_id:
        print("[!] No REDDIT_CLIENT_ID provided. Skipping simulation.")
        return
    import praw
    reddit = praw.Reddit(
        client_id=os.getenv("REDDIT_CLIENT_ID"),
        client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
        user_agent="AegisBot/1.0",
    )
    subreddit = reddit.subreddit("soccerstreams")
    try:
        for comment in subreddit.stream.comments(skip_existing=True):
            url_match = re.search(r"(?P<url>https?://[^\s]+)", comment.body)
            if url_match:
                 await social_intel_collection.insert_one({
                     "platform": "Reddit",
                     "raw_url": url_match.group("url"),
                     "timestamp": datetime.now(timezone.utc).isoformat(),
                     "scanned": False
                 })
                 print("[Reddit] Link ingested.")
    except Exception as e:
        print(f"[Reddit Error] {e}")

# --- 2. TELEGRAM LISTENER ---
async def scrape_telegram():
    print("[*] Starting Telegram listener...")
    api_id = os.getenv("TELEGRAM_API_ID")
    if not api_id:
        print("[!] No TELEGRAM_API_ID provided. Skipping simulation.")
        return
    from telethon import TelegramClient, events
    client = TelegramClient('aegis_session', int(api_id), os.getenv("TELEGRAM_API_HASH"))
    await client.start()
    @client.on(events.NewMessage(chats=['LiveMatchHD']))
    async def handler(event):
        url_match = re.search(r"(?P<url>https?://[^\s]+)", event.text)
        if url_match:
             await social_intel_collection.insert_one({
                 "platform": "Telegram",
                 "raw_url": url_match.group("url"),
                 "timestamp": datetime.now(timezone.utc).isoformat(),
                 "scanned": False
             })
             print("[Telegram] Link ingested.")
    await client.run_until_disconnected()

# --- 3. HEADLESS SCRAPER ---
from playwright.async_api import async_playwright
async def run_headless_scraper():
    from database import MONGO_URI
    print(f"[*] Connecting to MongoDB: {MONGO_URI}")
    from database import mongo_client
    print(f"[*] Databases: {await mongo_client.list_database_names()}")
    from database import mongo_db
    print(f"[*] Current DB: {mongo_db.name}")
    print(f"[*] Collections in {mongo_db.name}: {await mongo_db.list_collection_names()}")
    # STARTUP RESET: Mark everything as pending to scan from start
    print("[Scraper] Startup Reset: Clearing 'scanned' status for all records...")
    await social_intel_collection.update_many({}, {"$set": {"scanned": False}})
    
    while True:
        try:
            # CHECK MONGODB
            total_count = await social_intel_collection.count_documents({})
            pending_count = await social_intel_collection.count_documents({"scanned": False})
            scanned_count = await social_intel_collection.count_documents({"scanned": True})
            print(f"[Scraper] DB Status: {pending_count} pending / {scanned_count} scanned / {total_count} total")
            
            target = None
            if pending_count > 0:
                print(f"[Scraper] Processing pending queue...")
                # Targeted Intelligence Pipeline: Pull LIVE targets before POST_MATCH
                target = await social_intel_collection.find_one_and_update(
                    {"scanned": False},
                    {"$set": {"scanned": True}},
                    sort=[("ingestion_mode", 1), ("priority_score", -1)]
                )
            if not target:
                # Eliminate repeated heartbeat scan loop
                # print("[Scraper] Queue empty. Waiting for new links...")
                await asyncio.sleep(20)
                continue
            
            print(f"[Scraper] Found link in DB: {target.get('raw_url')} (ID: {target.get('_id')})")
            
            m3u8_found = target['raw_url']
            platform = target['platform']

            # Process
            final_media_url = m3u8_found
            if not m3u8_found.startswith("/"):
                async with async_playwright() as p:
                    browser = await p.chromium.launch(headless=True)
                    page = await browser.new_page()
                    def intercept(request):
                        nonlocal final_media_url
                        if any(x in request.url for x in [".m3u8", ".ts", ".mp4"]):
                            final_media_url = request.url
                    page.on("request", intercept)
                    try:
                        await page.goto(m3u8_found, timeout=30000)
                        await asyncio.sleep(5)
                    except: pass
                    await browser.close()

            # Analyze
            is_verified_media = (final_media_url != m3u8_found) or m3u8_found.startswith("/") or any(x in final_media_url for x in [".m3u8", ".ts", ".mp4"])
            if is_verified_media:
                print(f"[*] Calling /analyze_media for {final_media_url}")
                async with httpx.AsyncClient() as client:
                    try:
                        resp = await client.post("http://127.0.0.1:8000/analyze_media", json={
                            "media_url": final_media_url,
                            "platform": platform,
                            "username": target.get("metadata", {}).get("username", "anonymous_detector"),
                            "post_text": target.get("metadata", {}).get("text", "Suspected piracy stream detected via telemetry."),
                            "engagement_metrics": target.get("metadata", {}).get("engagement_metrics", {})
                        }, timeout=30.0)
                        print(f"[+] Response: {resp.status_code} - {resp.json().get('status')}")
                    except Exception as e:
                        print(f"[!] API Error: {e}")
            else:
                print(f"[!] Skip: No media stream found on page {m3u8_found}")

        except Exception as e:
            print(f"[Scraper Error] {e}")
        await asyncio.sleep(10)

async def run_worker():
    await asyncio.gather(scrape_reddit(), scrape_telegram(), run_headless_scraper())

if __name__ == "__main__":
    asyncio.run(run_worker())
