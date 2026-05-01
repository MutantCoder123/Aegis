import os
from dotenv import load_dotenv

# Load .env file at startup
load_dotenv()

# Flag to toggle between real external APIs and local mock simulations
USE_MOCK_SERVICES = os.getenv("USE_MOCK_SERVICES", "False").lower() == "true"
