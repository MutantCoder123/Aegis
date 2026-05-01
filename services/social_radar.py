import datetime
import random
from typing import List
from playwright.async_api import async_playwright
from services.velocity_sieve import VelocitySieve

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
]

class SocialStealthRadar:
    @staticmethod
    async def hunt(hashtags: List[str], platform: str):
        """
        Scrapes Instagram or TikTok hashtag pages using Playwright with stealth properties.
        """
        print(f"[SocialRadar] Hunting {platform} for hashtags: {hashtags}")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            
            for hashtag in hashtags:
                context = await browser.new_context(user_agent=random.choice(USER_AGENTS))
                page = await context.new_page()
                
                try:
                    if platform.lower() == "instagram":
                        url = f"https://www.instagram.com/explore/tags/{hashtag}/"
                    elif platform.lower() == "tiktok":
                        url = f"https://www.tiktok.com/tag/{hashtag}"
                    else:
                        continue
                        
                    await page.goto(url, wait_until="networkidle", timeout=30000)
                    await page.wait_for_timeout(3000) # Wait for dynamic content
                    
                    # Basic extraction logic (Platform specific)
                    links = []
                    if platform.lower() == "instagram":
                        # Extract post links
                        links = await page.eval_on_selector_all("a[href*='/p/'], a[href*='/reels/']", 
                            "elements => elements.map(e => e.href)")
                    elif platform.lower() == "tiktok":
                        links = await page.eval_on_selector_all("a[href*='/video/']", 
                            "elements => elements.map(e => e.href)")
                    
                    for link in list(set(links))[:5]: # Take top 5 unique links per hashtag
                        # Since we can't easily get exact views from the listing page without deep scraping,
                        # we simulate engagement for the demonstration or perform a quick check if possible.
                        # For this phase, we'll use a heuristic or mock view count for promotion.
                        mock_views = random.randint(1000, 50000)
                        upload_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=random.randint(1, 10))
                        
                        await VelocitySieve.evaluate_target(
                            url=link,
                            platform=platform.title(),
                            source="social_radar",
                            views=mock_views,
                            upload_time=upload_time,
                            metadata={"hashtag": hashtag}
                        )
                
                except Exception as e:
                    print(f"[SocialRadar] Error scraping {hashtag} on {platform}: {e}")
                finally:
                    await page.close()
                    await context.close()
            
            await browser.close()
