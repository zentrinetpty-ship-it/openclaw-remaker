from fastapi import APIRouter, HTTPException
from pathlib import Path
import hashlib
import aiohttp
import asyncio
import base64
from typing import Optional, List
import os

router = APIRouter(prefix="/images", tags=["Image Generation"])

# Image cache directory
CACHE_DIR = Path(__file__).parent.parent / "image_cache"
CACHE_DIR.mkdir(exist_ok=True)

# Gemini API configuration
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict"

def get_gemini_api_key():
    return os.getenv("GEMINI_API_KEY", "")

async def generate_with_gemini(prompt: str, aspect_ratio: str = "16:9", num_images: int = 1):
    """Generate images using Gemini Imagen API"""
    
    api_key = get_gemini_api_key()
    if not api_key:
        raise Exception("GEMINI_API_KEY not configured")
    
    url = f"{GEMINI_API_URL}?key={api_key}"
    
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": min(num_images, 4),
            "aspectRatio": aspect_ratio
        }
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=120)) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"Gemini API error {response.status}: {error_text[:200]}")
            
            data = await response.json()
            
            predictions = data.get("predictions", [])
            image_paths = []
            
            for idx, prediction in enumerate(predictions):
                if "bytesBase64Encoded" in prediction:
                    image_data = base64.b64decode(prediction["bytesBase64Encoded"])
                    prompt_hash = hashlib.md5(f"{prompt}_{idx}".encode()).hexdigest()
                    image_path = CACHE_DIR / f"{prompt_hash}.jpg"
                    
                    with open(image_path, "wb") as f:
                        f.write(image_data)
                    
                    image_paths.append(f"/images/generated/{prompt_hash}.jpg")
            
            return image_paths

@router.post("/generate")
async def generate_images(prompt: str, aspect_ratio: str = "16:9", num_images: int = 1):
    """Generate images using Gemini Imagen API"""
    try:
        image_urls = await generate_with_gemini(prompt, aspect_ratio, num_images)
        return {"success": True, "image_urls": image_urls}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/generated/{filename}")
async def get_generated_image(filename: str):
    """Serve generated image file"""
    file_path = CACHE_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    from fastapi.responses import FileResponse
    return FileResponse(file_path, media_type="image/jpeg")

@router.get("/health")
async def image_service_health():
    """Check if image service is configured"""
    api_key = get_gemini_api_key()
    return {
        "status": "configured" if api_key else "not_configured",
        "api_key_present": bool(api_key)
    }
