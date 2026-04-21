from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import hashlib
import asyncio
import edge_tts

router = APIRouter(prefix="/tts", tags=["TTS"])

# TTS cache directory
CACHE_DIR = Path(__file__).parent / "tts_cache"
CACHE_DIR.mkdir(exist_ok=True)

# Voice options (Microsoft Edge voices - all free)
VOICES = {
    "en-US-Jenny": "en-US-JennyNeural",
    "en-US-Guy": "en-US-GuyNeural",
    "en-GB-Sonia": "en-GB-SoniaNeural",
    "en-GB-Ryan": "en-GB-RyanNeural",
    "en-AU-Natasha": "en-AU-NatashaNeural",
    "en-AU-William": "en-AU-WilliamNeural",
    "en-IN-Neerja": "en-IN-NeerjaNeural",
    "en-IN-Prabhat": "en-IN-PrabhatNeural",
}

class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-JennyNeural"
    rate: str = "+0%"  # Speed: -50% to +100%
    volume: str = "+0%"  # Volume: -50% to +100%

class TTSResponse(BaseModel):
    success: bool
    audio_url: str = None
    duration: float = None
    error: str = None

async def generate_tts(text: str, voice: str, output_path: Path, rate: str = "+0%", volume: str = "+0%"):
    """Generate TTS using Edge TTS"""
    communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume)
    await communicate.save(str(output_path))

@router.post("/generate", response_model=TTSResponse)
async def generate_tts_endpoint(request: TTSRequest):
    """Generate TTS audio from text"""
    try:
        # Create unique filename
        text_hash = hashlib.md5(f"{request.text}_{request.voice}_{request.rate}".encode()).hexdigest()
        output_file = CACHE_DIR / f"{text_hash}.mp3"
        
        # Generate TTS
        await generate_tts(request.text, request.voice, output_file, request.rate, request.volume)
        
        # Calculate approximate duration (rough estimate: ~150 chars/min)
        duration = len(request.text) / 15  # seconds
        
        return TTSResponse(
            success=True,
            audio_url=f"/tts/audio/{text_hash}.mp3",
            duration=duration
        )
    
    except Exception as e:
        return TTSResponse(success=False, error=str(e))

@router.get("/audio/{filename}")
async def get_audio(filename: str):
    """Serve cached audio file"""
    file_path = CACHE_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    from fastapi.responses import FileResponse
    return FileResponse(file_path, media_type="audio/mpeg")

@router.get("/voices")
async def list_voices():
    """List available voices"""
    return {
        "voices": [
            {"id": "en-US-JennyNeural", "name": "Jenny (US)", "locale": "en-US", "gender": "Female"},
            {"id": "en-US-GuyNeural", "name": "Guy (US)", "locale": "en-US", "gender": "Male"},
            {"id": "en-GB-SoniaNeural", "name": "Sonia (UK)", "locale": "en-GB", "gender": "Female"},
            {"id": "en-GB-RyanNeural", "name": "Ryan (UK)", "locale": "en-GB", "gender": "Male"},
            {"id": "en-AU-NatashaNeural", "name": "Natasha (AU)", "locale": "en-AU", "gender": "Female"},
            {"id": "en-AU-WilliamNeural", "name": "William (AU)", "locale": "en-AU", "gender": "Male"},
        ]
    }

# Simple test endpoint
@router.get("/test")
async def test_tts():
    """Test TTS with sample text"""
    try:
        output_file = CACHE_DIR / "test.mp3"
        await generate_tts("Hello from SundayRemaker!", "en-US-JennyNeural", output_file)
        return {"success": True, "message": "TTS working!", "audio_url": "/tts/audio/test.mp3"}
    except Exception as e:
        return {"success": False, "error": str(e)}
