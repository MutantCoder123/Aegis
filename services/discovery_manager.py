import asyncio
import logging
import os
from services.youtube_radar import YouTubeRadar
from services.social_radar import SocialStealthRadar

class DiscoveryManager:
    # DESIGNATED HIGH-RISK TARGETS
    KEYWORDS = ["Lakers vs Warriors Full Highlights", "UFC 301 Main Card Replay", "Champions League Final 2026"]
    HASHTAGS = ["nba", "ufc", "championsleague", "footballgoals"]

    @staticmethod
    async def run_youtube_scheduler():
        """Runs YouTubeRadar (or Mock) hourly."""
        from services.config import USE_MOCK_SERVICES
        if USE_MOCK_SERVICES:
            from services.mocks import MockYouTubeRadar
            radar = MockYouTubeRadar
        else:
            radar = YouTubeRadar

        while True:
            try:
                await radar.hunt(DiscoveryManager.KEYWORDS)
            except Exception as e:
                logging.error(f"[DiscoveryManager] YouTube loop error: {e}")
            await asyncio.sleep(3600 if not USE_MOCK_SERVICES else 60) # 1 hour (or 1 min for mocks)

    @staticmethod
    async def run_social_scheduler():
        """Runs SocialStealthRadar (or Mock) every 30 minutes."""
        from services.config import USE_MOCK_SERVICES
        if USE_MOCK_SERVICES:
            from services.mocks import MockSocialRadar
            radar = MockSocialRadar
        else:
            radar = SocialStealthRadar

        while True:
            try:
                await radar.hunt(DiscoveryManager.HASHTAGS, "Instagram")
                await radar.hunt(DiscoveryManager.HASHTAGS, "TikTok")
            except Exception as e:
                logging.error(f"[DiscoveryManager] Social loop error: {e}")
            await asyncio.sleep(1800 if not USE_MOCK_SERVICES else 60) # 30 minutes (or 1 min for mocks)

    @staticmethod
    async def start():
        """
        Starts the Discovery Radar background tasks.
        """
        print("[*] Discovery Radar initiated. Monitoring YouTube, Instagram, and TikTok...")
        asyncio.create_task(DiscoveryManager.run_youtube_scheduler())
        asyncio.create_task(DiscoveryManager.run_social_scheduler())
