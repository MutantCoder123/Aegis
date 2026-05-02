import os
import sys
import argparse
import numpy as np
import json
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# Aegis Imports
from services.vector_vault import CLIPVectorizer
from services.temporal_guard import TemporalGuard
from models.schemas import IngestionMode
from PIL import Image
from google import genai

class MockAsset:
    def __init__(self):
        self.match_id = "master_match_001"
        self.timestamp = datetime.now(timezone.utc)

def calculate_similarity(master_path, target_path):
    print("--------------------------------------------------")
    print("[Tier 1] Visual Feature Breakdown (Vector Math)")
    print("--------------------------------------------------")
    try:
        with open(master_path, "rb") as f:
            master_bytes = bytearray(f.read())
        with open(target_path, "rb") as f:
            target_bytes = bytearray(f.read())
            
        vectorizer = CLIPVectorizer()
        master_vec = vectorizer.vectorize(master_bytes)
        target_vec = vectorizer.vectorize(target_bytes)
        
        # Calculate Cosine Similarity. Both are already normalized by the model.
        similarity = float(np.dot(master_vec, target_vec.T)[0][0]) if master_vec.ndim == 2 else float(np.dot(master_vec, target_vec))
        
        print(f"Master Frame: {master_path}")
        print(f"Target Frame: {target_path}")
        print(f"Raw Cosine Similarity: {similarity:.4f}")
        return similarity
    except Exception as e:
        print(f"[!] Error in Tier 1: {e}")
        return 0.0

def trace_temporal_guard(similarity):
    print("\n--------------------------------------------------")
    print("[Tier 2] Adjudication Trace (Temporal Guard)")
    print("--------------------------------------------------")
    
    match_data = {
        "asset": MockAsset(),
        "similarity": similarity
    }
    
    # We pass consecutive_frames=1 to simulate the first frame of a suspected stream 
    # jumping directly to a high similarity score without a preceding valid sequence.
    verdict = TemporalGuard.evaluate(match_data, IngestionMode.POST_MATCH, consecutive_frames=1)
    print(f"Verdict Triggered: {verdict['verdict']}")
    if "reason" in verdict:
        print(f"Reasoning: {verdict['reason']}")
    
    return verdict

def trace_gemini_arbiter(master_path, target_path):
    print("\n--------------------------------------------------")
    print("[Tier 3] Context Check (Gemini AI Arbiter)")
    print("--------------------------------------------------")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[!] GEMINI_API_KEY not found in environment.")
        return None
        
    client = genai.Client(api_key=api_key)
    
    try:
        master_img = Image.open(master_path)
        target_img = Image.open(target_path)
        
        prompt = (
            "You are an enterprise copyright AI. Analyze these two broadcast frames (Master and Target). "
            "Do the team jerseys, player colors, and scoreboard logos exactly match? Are they from the exact same game? "
            "Respond strictly in JSON format with two keys:\n"
            "'is_match' (boolean) - true if they are exactly the same match, false if they are different teams/matches.\n"
            "'reasoning' (string) - detailing the jersey colors, logo differences, or scoreboard mismatches."
        )
        
        print("Uploading frames and querying Gemini Arbiter...")
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        response = client.models.generate_content(
            model=model_name,
            contents=[master_img, target_img, prompt],
        )
        
        text_response = response.text
        if text_response.startswith('```json'):
            text_response = text_response.strip('```json').strip('```').strip()
        elif text_response.startswith('```'):
            text_response = text_response.strip('```').strip()
            
        data = json.loads(text_response)
        print(f"AI Verdict: {'MATCH' if data.get('is_match') else 'MISMATCH'}")
        print(f"AI Reasoning: {data.get('reasoning')}")
        return data
    except Exception as e:
        print(f"[!] Error in Tier 3: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="ForensicDebugger: Trace the Aegis pipeline logic for False Positives.")
    parser.add_argument("--master", required=True, help="Path to Master Frame image")
    parser.add_argument("--target", required=True, help="Path to Target Frame image")
    args = parser.parse_args()
    
    if not os.path.exists(args.master):
        print(f"[!] Error: Master frame not found at {args.master}")
        sys.exit(1)
    if not os.path.exists(args.target):
        print(f"[!] Error: Target frame not found at {args.target}")
        sys.exit(1)
        
    similarity = calculate_similarity(args.master, args.target)
    temporal_verdict = trace_temporal_guard(similarity)
    gemini_verdict = trace_gemini_arbiter(args.master, args.target)
    
    print("\n==================================================")
    print("FINAL VERDICT SUMMARY")
    print("==================================================")
    
    # If the user is trying to test semantic overlap, the Tier 1 similarity will be very high.
    if similarity > 0.85:
        print(f"Tier 1 Vector Math: FAILED (Fooled by semantic overlap, Similarity = {similarity:.2f})")
    else:
        print(f"Tier 1 Vector Math: PASSED (Correctly identified low similarity, Score = {similarity:.2f})")
        
    if temporal_verdict["verdict"] == "PENDING_CONSECUTIVE":
        print("Tier 2 Temporal Guard: PASSED (Successfully blocked takedown due to sequence jump)")
    else:
        print(f"Tier 2 Temporal Guard: {temporal_verdict['verdict']}")
        
    if gemini_verdict:
        if not gemini_verdict.get("is_match"):
            print("Tier 3 AI Arbiter: PASSED (Successfully identified jersey/logo mismatch)")
        else:
            print("Tier 3 AI Arbiter: FAILED (AI believed they were the exact same match)")

if __name__ == "__main__":
    main()
