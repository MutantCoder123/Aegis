import asyncio
import httpx
import random
from datetime import datetime

TELEMETRY_ENDPOINT = "http://localhost:8000/api/telemetry/report"

# 1. Raw Piracy Vectors (Existing)
PIRACY_URLS = [
    {"url": "http://streamhub-mirror.ru/live/match-12", "platform": "Web", "type": "mirror"},
    {"url": "http://rojadirecta.watch/event/4128/multi.html", "platform": "Web", "type": "aggregator"},
    {"url": "http://pirate-sports.net/champions-league.m3u8", "platform": "Web", "type": "m3u8"},
    {"url": "http://soccercatch.stream/vip", "platform": "Web", "type": "aggregator"},
    {"url": "t.me/SoccerStreamsOfficial/99283", "platform": "Telegram", "type": "social_leak"}
]

# 2. Viral Fan Edits (New Social Sources)
SOCIAL_PAYLOADS = [
    {
        "url": "https://www.youtube.com/shorts/xYz123aBc",
        "platform": "YouTube",
        "text": "Messi impossible angle goal 4K Edit 🔥⚽ #UCL #InterMiami",
        "engagement": {"views": 45000, "likes": 3200}
    },
    {
        "url": "https://x.com/TotalFooty/status/198273645",
        "platform": "Twitter",
        "text": "Bellingham game winner set to Phonk music. Unbelievable. 🤯",
        "engagement": {"views": 120000, "likes": 15000}
    },
    {
        "url": "https://www.instagram.com/reel/A1b2C3d4E5/",
        "platform": "Instagram",
        "text": "POV: You are in the stadium for the final penalty. (Fan Cam)",
        "engagement": {"views": 85000, "likes": 9000}
    },
    {
        "url": "https://www.tiktok.com/@goalzone/video/73829102",
        "platform": "TikTok",
        "text": "Top 10 saves of the weekend. Absolute wall. 🧤 #EPL",
        "engagement": {"views": 250000, "likes": 42000}
    }
]

async def simulate_user(client: httpx.AsyncClient, user_id: int):
    """Simulates a single active user/node firing telemetry periodically."""
    while True:
        # 70% chance of a piracy link, 30% chance of a viral social post
        is_social = random.random() < 0.3
        
        if is_social:
            data = random.choice(SOCIAL_PAYLOADS)
            action = "Viral Content Detected"
            intent = "viral_velocity"
        else:
            data = random.choice(PIRACY_URLS)
            action = "Illegal Stream Found"
            intent = "malicious_leak"

        payload = {
            "source": "firehose_simulator",
            "url": data["url"],
            "platform": data.get("platform", "Web"),
            "action": action,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {
                "user_v_id": f"sim_user_{user_id}",
                "simulated": True,
                "intent_flag": intent,
                "text_content": data.get("text", "N/A"),
                "engagement_metrics": data.get("engagement", {"views": random.randint(100, 5000)})
            }
        }

        try:
            response = await client.post(TELEMETRY_ENDPOINT, json=payload, timeout=2.0)
            if response.status_code == 200:
                print(f"[Firehose] User {user_id} | {payload['platform']} | {intent}")
        except httpx.ConnectError:
            print("[!] FastAPI server offline.")
        except Exception as e:
            print(f"[!] Error: {e}")
            
        await asyncio.sleep(random.uniform(0.5, 3.0))

async def main():
    print("--- Aegis Multi-Platform Firehose Active ---")
    print("[*] Ingesting Web, Telegram, YouTube, X, and Instagram signals...")
    
    async with httpx.AsyncClient() as client:
        tasks = [simulate_user(client, i) for i in range(25)] # Increased to 25 users
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[*] Simulator shutdown.")