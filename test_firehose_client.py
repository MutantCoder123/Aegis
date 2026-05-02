import httpx
import asyncio

async def test():
    print("Connecting to firehose...")
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("GET", "http://127.0.0.1:8000/api/streams/firehose") as response:
            print(f"Status: {response.status_code}")
            async for line in response.aiter_lines():
                if line:
                    print(f"Received: {line}")

if __name__ == "__main__":
    asyncio.run(test())
