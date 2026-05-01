import requests

response = requests.post(
    "http://127.0.0.1:8000/api/vault/ingest",
    data={
        "match_id": "MASTER_YT_TEST_01",
        "display_name": "YouTube VOD Test",
        "asset_type": "Remote VOD",
        "file_type": "video",
        "source_url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"
    },
    headers={
        "X-Broadcaster-ID": "test-broadcaster",
        "X-Source-Key": "test-key"
    }
)
print(response.status_code, response.text)
