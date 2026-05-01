import asyncio
from database import AsyncSessionLocal, OfficialAssetVector
from sqlalchemy.future import select
from services.vault_worker import process_master_vod

async def test():
    print("Testing direct process_master_vod...")
    await process_master_vod(
        video_path="https://www.youtube.com/watch?v=jNQXAC9IVRw",
        match_id="MASTER_DIRECT_TEST",
        db_session_factory=AsyncSessionLocal,
        source_origin="secure_vod_ingest",
        broadcaster_id="test-broadcaster",
        file_type="video"
    )
    print("Done processing. Checking DB...")
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(OfficialAssetVector).filter_by(match_id="MASTER_DIRECT_TEST")
        )
        rows = result.scalars().all()
        print(f"Total Vectors stored: {len(rows)}")
        if rows:
            print(f"Sample chunk URL: {rows[0].video_chunk_url}")

if __name__ == "__main__":
    asyncio.run(test())
