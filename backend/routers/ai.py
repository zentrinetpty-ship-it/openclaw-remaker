from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import json
import aiohttp

router = APIRouter(prefix="/ai", tags=["AI Generation"])

# Ollama configuration
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "glm-5.1:cloud")  # or qwen3.5:cloud

class ScriptGenerationRequest(BaseModel):
    topic: str
    duration: int = Field(default=60, ge=15, le=300)
    tone: str = "professional"
    target_audience: str = "general"
    num_slides: int = Field(default=8, ge=3, le=20)
    language: str = "en"

class SlideScript(BaseModel):
    slide_number: int
    visual_description: str
    narration: str
    duration: int
    image_prompt: str

class ScriptGenerationResponse(BaseModel):
    success: bool
    title: str = ""
    description: str = ""
    slides: List[SlideScript] = []
    total_duration: int = 0
    error: Optional[str] = None

async def call_ollama(prompt: str, model: str = None):
    """Call Ollama API for text generation"""
    model = model or OLLAMA_MODEL
    url = f"{OLLAMA_URL}/api/generate"
    
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 2048
        }
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=120)) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"Ollama API error {response.status}: {error_text[:200]}")
            
            data = await response.json()
            return data.get("response", "")

@router.post("/generate-script", response_model=ScriptGenerationResponse)
async def generate_script(request: ScriptGenerationRequest):
    """Generate a complete video script using Ollama"""
    try:
        prompt = f"""Create a video script about: {request.topic}

Requirements:
- Duration: {request.duration} seconds
- Number of slides: {request.num_slides}
- Tone: {request.tone}
- Target audience: {request.target_audience}

For each slide, provide:
1. Visual description (what to show)
2. Narration text (what to say)
3. Duration in seconds
4. Image generation prompt (detailed description for AI image generation)

Format your response as JSON:
{{
    "title": "Video Title",
    "description": "Brief description",
    "slides": [
        {{
            "slide_number": 1,
            "visual_description": "What appears on screen",
            "narration": "Voiceover text",
            "duration": 8,
            "image_prompt": "Detailed image generation prompt"
        }}
    ]
}}

Make it engaging and professional."""

        response_text = await call_ollama(prompt)
        
        # Parse JSON from response
        text = response_text
        # Extract JSON if wrapped in markdown
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        
        data = json.loads(text.strip())
        
        slides = [SlideScript(**slide) for slide in data["slides"]]
        total_duration = sum(slide.duration for slide in slides)
        
        return ScriptGenerationResponse(
            success=True,
            title=data.get("title", ""),
            description=data.get("description", ""),
            slides=slides,
            total_duration=total_duration
        )
    
    except Exception as e:
        return ScriptGenerationResponse(
            success=False,
            error=str(e)
        )

@router.post("/enhance-prompt")
async def enhance_image_prompt(prompt: str, style: str = "photorealistic"):
    """Enhance a simple prompt into a detailed image generation prompt using Ollama"""
    try:
        enhancement_prompt = f"""Enhance this image prompt for AI image generation:
        
Original: {prompt}
Style: {style}

Make it detailed and specific for high-quality image generation. Include lighting, camera angle, composition, colors, and mood.

Return only the enhanced prompt, nothing else."""

        response_text = await call_ollama(enhancement_prompt)
        
        return {
            "success": True,
            "original": prompt,
            "enhanced": response_text.strip(),
            "style": style
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.get("/health")
async def ai_service_health():
    """Check if Ollama service is available"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{OLLAMA_URL}/api/tags", timeout=aiohttp.ClientTimeout(total=5)) as response:
                if response.status == 200:
                    data = await response.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    return {
                        "status": "connected",
                        "ollama_url": OLLAMA_URL,
                        "model": OLLAMA_MODEL,
                        "available_models": models[:5]  # First 5 models
                    }
                else:
                    return {"status": "error", "message": f"HTTP {response.status}"}
    except Exception as e:
        return {"status": "disconnected", "error": str(e), "ollama_url": OLLAMA_URL}

@router.get("/models")
async def list_ollama_models():
    """List available Ollama models"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{OLLAMA_URL}/api/tags", timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    models = [{"name": m.get("name"), "size": m.get("size")} for m in data.get("models", [])]
                    return {"success": True, "models": models}
                else:
                    return {"success": False, "error": f"HTTP {response.status}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# Quick test endpoint
@router.post("/test")
async def test_ai():
    """Test Ollama AI generation"""
    try:
        result = await call_ollama("Say 'Ollama AI is working!' and nothing else.")
        return {"success": True, "response": result, "model": OLLAMA_MODEL}
    except Exception as e:
        return {"success": False, "error": str(e), "ollama_url": OLLAMA_URL}
