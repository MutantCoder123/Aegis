import os
from typing import Dict, Any
from dotenv import set_key, load_dotenv

ENV_FILE = os.path.join(os.getcwd(), ".env")

def get_current_config() -> Dict[str, Any]:
    """
    Reads the current configuration from environment variables.
    """
    load_dotenv(override=True)
    return {
        "gemini": {
            "apiKey": os.getenv("GEMINI_API_KEY", ""),
            "model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        },
        "youtube": {
            "apiKey": os.getenv("YOUTUBE_API_KEY", "")
        },
        "instagram": {
            "apiKey": os.getenv("INSTAGRAM_ACCESS_TOKEN", "")
        },
        "twitter": {
            "apiKey": os.getenv("TWITTER_BEARER_TOKEN", "")
        },
        "reddit": {
            "clientId": os.getenv("REDDIT_CLIENT_ID", ""),
            "clientSecret": os.getenv("REDDIT_CLIENT_SECRET", ""),
            "userAgent": os.getenv("REDDIT_USER_AGENT", "AegisBot/1.0")
        },
        "telegram": {
            "botToken": os.getenv("TELEGRAM_BOT_TOKEN", "")
        },
        "discord": {
            "botToken": os.getenv("DISCORD_BOT_TOKEN", "")
        }
    }

def update_config(config: Dict[str, Any]):
    """
    Persists the provided config to the .env file.
    """
    mapping = {
        "gemini.apiKey": "GEMINI_API_KEY",
        "gemini.model": "GEMINI_MODEL",
        "youtube.apiKey": "YOUTUBE_API_KEY",
        "instagram.apiKey": "INSTAGRAM_ACCESS_TOKEN",
        "twitter.apiKey": "TWITTER_BEARER_TOKEN",
        "reddit.clientId": "REDDIT_CLIENT_ID",
        "reddit.clientSecret": "REDDIT_CLIENT_SECRET",
        "reddit.userAgent": "REDDIT_USER_AGENT",
        "telegram.botToken": "TELEGRAM_BOT_TOKEN",
        "discord.botToken": "DISCORD_BOT_TOKEN"
    }

    for path, env_key in mapping.items():
        parts = path.split('.')
        val = config
        for part in parts:
            val = val.get(part, {})
        
        if isinstance(val, str):
            set_key(ENV_FILE, env_key, val)
            os.environ[env_key] = val
    
    # Reload dotenv in current process
    load_dotenv(ENV_FILE, override=True)
