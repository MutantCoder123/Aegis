# Sports Media Copyright Detection System Walkthrough

The system is now fully implemented and verified with a local test suite. It uses an **Asymmetric Spatial Threat Filtering Pipeline** to detect unauthorized sports media usage.

## 🚀 System Architecture

- **Tier 1 (Vector Matching)**: Uses `CLIP (clip-ViT-B-32)` to generate semantic embeddings.
- **Tier 2 (AI Adjudication)**: Uses `Gemini 2.5 Flash` for complex edge cases (0.65 - 0.90 similarity).
- **Graceful Handling**: Automatically generates dummy assets for local testing and handles missing API keys.

## 📁 Key Files Created

- [main.py](file:///home/indranil/GoogleSolution/DigitalAssetProtection/main.py): FastAPI entry point & startup logic.
- [matching_engine.py](file:///home/indranil/GoogleSolution/DigitalAssetProtection/services/matching_engine.py): Vector engine and similarity math.
- [ai_arbiter.py](file:///home/indranil/GoogleSolution/DigitalAssetProtection/services/ai_arbiter.py): Gemini LLM orchestration.
- [test_webhook.py](file:///home/indranil/GoogleSolution/DigitalAssetProtection/test_webhook.py): Verification script.

### Vault Ingestion & Playback Enhancements
- **Full VOD Archiving**: Updated `services/vault_worker.py` to archive the complete original video file before segmentation. This ensures the asset library plays the full match rather than isolated 5-second segments.
- **Seekable Playback**: By serving the full VOD, the frontend video player now has a functional progress bar and supports seeking across the entire duration.
- **Representative URL Logic**: Fixed the API route `/api/vault/assets` to prioritize the earliest segment (or the master VOD) as the representative playback source, preventing the player from defaulting to the very end of the stream.

## 🧪 Verification Results

The test script [test_webhook.py](file:///home/indranil/GoogleSolution/DigitalAssetProtection/test_webhook.py) verified the following flows:

1. **Vector Math Gate**: Successfully downloaded test images and performed cosine similarity against the ground truth.
2. **AI Arbiter Hand-off**: Correcty triggered the LLM stage for edge-case scores.
3. **Error Handling**: Confirmed that the system remains stable even when external API keys are missing.

## 🛠️ How to Go Production

1. **Add your Gemini API Key**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_key_here
   ```

2. **Upload Official Asset**:
   Replace [target_official_asset.jpg](file:///home/indranil/GoogleSolution/DigitalAssetProtection/target_official_asset.jpg) with the actual official sports media image you want to detect.

3. **Scale**:
   Run with multiple workers using Gunicorn:
   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
   ```
