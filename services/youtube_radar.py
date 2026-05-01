import os
import requests
import datetime
from typing import List
from services.velocity_sieve import VelocitySieve

class YouTubeRadar:
    API_KEY = os.getenv("YOUTUBE_API_KEY")
    SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
    VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

    @staticmethod
    async def hunt(keywords: List[str]):
        if not YouTubeRadar.API_KEY:
            print("[YouTubeRadar] Error: Missing YOUTUBE_API_KEY. Skipping hunt.")
            return

        print(f"[YouTubeRadar] Hunting for keywords: {keywords}")
        
        for query in keywords:
            try:
                # 1. Search for recent videos
                published_after = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat()
                search_params = {
                    "part": "snippet",
                    "q": query,
                    "type": "video",
                    "order": "date",
                    "publishedAfter": published_after,
                    "maxResults": 10,
                    "key": YouTubeRadar.API_KEY
                }
                
                response = requests.get(YouTubeRadar.SEARCH_URL, params=search_params)
                if response.status_code != 200:
                    print(f"[YouTubeRadar] API Error ({response.status_code}): {response.text}")
                    continue
                
                items = response.json().get("items", [])
                if not items:
                    continue

                video_ids = [item["id"]["videoId"] for item in items]
                
                # 2. Get statistics for these videos
                stats_params = {
                    "part": "statistics,snippet",
                    "id": ",".join(video_ids),
                    "key": YouTubeRadar.API_KEY
                }
                
                stats_response = requests.get(YouTubeRadar.VIDEOS_URL, params=stats_params)
                if stats_response.status_code != 200:
                    continue
                
                stats_items = stats_response.json().get("items", [])
                for video in stats_items:
                    url = f"https://www.youtube.com/watch?v={video['id']}"
                    views = int(video["statistics"].get("viewCount", 0))
                    upload_time = datetime.datetime.fromisoformat(video["snippet"]["publishedAt"].replace("Z", "+00:00"))
                    
                    await VelocitySieve.evaluate_target(
                        url=url,
                        platform="YouTube",
                        source="youtube_radar",
                        views=views,
                        upload_time=upload_time,
                        metadata={
                            "title": video["snippet"]["title"],
                            "channel": video["snippet"]["channelTitle"]
                        }
                    )
                    
            except Exception as e:
                print(f"[YouTubeRadar] Unexpected error: {e}")
