import requests
import sys

def mock_ingest(youtube_url: str):
    print(f"Mocking live ingestion for: {youtube_url}")
    response = requests.post(
        "http://127.0.0.1:8000/api/telemetry/report",
        json={
            "source": "manual_mock_script",
            "url": youtube_url,
            "action": "Illegal Stream Found",
            "platform": "YouTube",
            "ingestion_mode": "LIVE"
        }
    )
    if response.status_code == 200:
        print("Success!", response.json())
    else:
        print("Failed!", response.status_code, response.text)

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.youtube.com/watch?v=21X5lGlDOfg"
    mock_ingest(url)
