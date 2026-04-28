import requests
import json

URL = "http://127.0.0.1:8000/analyze_media"

def run_test(test_name: str, payload: dict):
    print(f"{test_name}")
    try:
        response = requests.post(URL, json=payload, timeout=10)
        # Attempt to parse json
        try:
            data = response.json()
            print(json.dumps(data, indent=2))
        except ValueError:
            print(f"Status Code: {response.status_code}")
            print(f"Raw Response: {response.text}")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the FastAPI server. Is it running on http://127.0.0.1:8000?")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    # Test Case 1: Local Screenshot Analysis
    test_1_payload = {
        "media_url": "Screenshot from 2026-04-26 23-10-41.png",
        "username": "local_user_test",
        "post_text": "Evaluating local screenshot similarity."
    }
    run_test("--- RUNNING TEST 1: LOCAL SCREENSHOT ---", test_1_payload)

    print()

    # Test Case 2: The "Viral Fan Edit" AI Arbiter Gate
    test_2_payload = {
        "media_url": "https://picsum.photos/id/1/500/500",
        "username": "superfan_edits",
        "post_text": "Spent 4 hours making this sick player montage! Let me know what you think of the transitions! 🐐⚽"
    }
    run_test("--- RUNNING TEST 2: VIRAL FAN EDIT ---", test_2_payload)
