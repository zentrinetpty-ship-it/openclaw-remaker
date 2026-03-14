from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
import base64
import aiofiles
import subprocess
import shutil
from jose import JWTError, jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create directories
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)
RENDERS_DIR = ROOT_DIR / 'renders'
RENDERS_DIR.mkdir(exist_ok=True)

# ─── Auth Configuration ─────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "explainapro-secret-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        return user
    except JWTError:
        return None

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ─── Models ─────────────────────────────────────────────────────────────────

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# ─── Auth Models ────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class ScriptRequest(BaseModel):
    input: str
    type: str = "idea"
    duration: int = 30
    tone: str = "professional"
    category: str = "explainer"
    slideCount: int = 5
    preferredVisualStyle: str = "Cinematic"
    prayerStyle: Optional[str] = None

class ImageGenerateRequest(BaseModel):
    description: str
    style: str = "Cinematic"
    characters: Optional[List[Dict]] = None
    projectId: Optional[str] = None
    userId: Optional[str] = None

class VideoGenerateRequest(BaseModel):
    description: str
    projectId: Optional[str] = None
    userId: Optional[str] = None

class VoiceGenerateRequest(BaseModel):
    text: str
    voiceId: str = "en-US-Journey-D"
    projectId: Optional[str] = None
    userId: Optional[str] = None

class MusicGenerateRequest(BaseModel):
    text: str
    duration: int = 10
    projectId: Optional[str] = None
    userId: Optional[str] = None

class SfxGenerateRequest(BaseModel):
    text: str
    duration: Optional[float] = None
    apiKey: Optional[str] = None

class ProjectCreateRequest(BaseModel):
    title: str
    project: Dict[str, Any]
    userId: str

class Slide(BaseModel):
    id: str
    title: str
    narration: str
    duration: float
    imagePrompt: str
    videoPrompt: str = ""
    transition: str = "fade"
    onScreenText: Optional[str] = None
    visualStyle: str = "realistic"
    assetType: str = "none"
    assetUrl: Optional[str] = None
    assetGenerating: bool = False
    voiceUrl: Optional[str] = None
    sfxUrl: Optional[str] = None
    sfxVolume: float = 1.0
    vfx: Optional[str] = None
    graphics: Optional[List[Dict]] = None

# ─── Category Prompts ───────────────────────────────────────────────────────

CATEGORY_PROMPTS = {
    "news": "senior broadcast journalist with access to credible global sources",
    "explainer": "expert explainer video producer making complex topics crystal clear",
    "cartoon": "creative director at a premium 2D animation studio",
    "ebook": "professional book summarizer for YouTube and TikTok",
    "biography": "documentary filmmaker specializing in life-story videos",
    "tutorial": "world-class educator and tutorial creator",
    "datastory": "data journalist turning complex data into visual narratives",
    "youtube": "content strategist specializing in YouTube content repurposing",
    "motiongraphic": "high-end Motion Graphics Designer and Creative Director",
    "prayer": "spiritual guide creating diverse prayer and devotional videos",
    "reporter": "professional News Anchor with 20 years broadcast experience",
    "history": "world-class historian and documentary filmmaker",
    "remaker": "video content strategist creating inspired-by remakes"
}

def build_master_prompt(request: ScriptRequest) -> str:
    """Build the master prompt for script generation based on category."""
    tone_guide = {
        'professional': 'Clear, authoritative, results-focused. No fluff.',
        'energetic': 'Fast-paced, punchy. Short sentences. Action words.',
        'soft': 'Warm, empathetic, gentle. Conversational.',
        'bold': 'Strong, provocative, direct and impactful.',
        'documentary': 'Narrative, observational, fact-based. Journalistic.',
        'storytelling': 'Story arc with hero, problem, and resolution.',
        'minimalist': 'Ultra-concise. One thought per slide.',
        'humorous': 'Witty, playful, lighthearted.',
    }
    
    tone_desc = tone_guide.get(request.tone, tone_guide['professional'])
    target_word_count = int((request.duration / 60) * 140)
    avg_slide_dur = round(request.duration / request.slideCount)
    
    persona = CATEGORY_PROMPTS.get(request.category, CATEGORY_PROMPTS['explainer'])
    
    json_schema = f'''{{
  "title": "Video project title",
  "duration": {request.duration},
  "style": "cinematic|flat|minimal|3d|illustrated",
  "colorScheme": "#HEX primary color",
  "slides": [
    {{
      "id": "1",
      "title": "Slide title",
      "narration": "Narration text (1-2 sentences max, tone: {request.tone})",
      "duration": {avg_slide_dur},
      "imagePrompt": "Detailed AI image generation prompt. 16:9 landscape. No text in image.",
      "videoPrompt": "Animation/camera movement description",
      "transition": "fade|slide|zoom|none",
      "onScreenText": "Optional short bold text overlay",
      "visualStyle": "abstract|realistic|illustrated|chart|screencast"
    }}
  ],
  "voiceoverStyle": "professional|energetic|calm|storytelling",
  "musicMood": "uplifting|corporate|cinematic|minimal",
  "characters": [
    {{ "name": "Character Name", "description": "Physical description for consistent AI image generation" }}
  ],
  "suggestedMusic": ["5 specific atmosphere/genre ideas for background music"],
  "suggestedVfx": ["5 specific VFX prompt ideas to use in this video"],
  "suggestedSfx": ["5 specific AI sound effect generation prompts for this video"]
}}'''

    visual_instruction = f'''
CRITICAL: The user has selected a preferred visual style: "{request.preferredVisualStyle}". 
1. Identify 1-2 key characters that should appear consistently throughout the video. 
2. Define them in the "characters" array with specific physical descriptions.
3. Reference these character names in the "imagePrompt" of EVERY slide where they appear.
4. Ensure all "imagePrompt" fields are strictly tailored to the "{request.preferredVisualStyle}" style.
5. Provide "suggestedMusic" (5 ideas), "suggestedVfx" (5 prompts), and "suggestedSfx" (5 prompts).'''

    return f'''You are a {persona}.

The user has provided {"an idea" if request.type == "idea" else "a script"} for a {request.category.upper()} VIDEO: "{request.input}"

Your job:
1. Create a {request.slideCount}-slide storyboard totaling exactly {request.duration} seconds
2. Tone: {request.tone.upper()} - {tone_desc}
3. CRITICAL: The TOTAL narration across all slides MUST be exactly around {target_word_count} words to ensure the video is exactly {request.duration} seconds long.
4. Output ONLY valid JSON, no markdown fences

{json_schema}
{visual_instruction}'''

# ─── API Routes ─────────────────────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "ExplainaPro API v1.0"}

# ─── Auth Routes ────────────────────────────────────────────────────────────

@api_router.post("/auth/register")
async def register(data: UserRegister):
    """Register a new user."""
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email.lower(),
        "password": get_password_hash(data.password),
        "name": data.name or data.email.split("@")[0],
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "subscriptionTier": "free"
    }
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"sub": user_id})
    return {
        "success": True,
        "token": token,
        "user": {"id": user_id, "email": user_doc["email"], "name": user_doc["name"]}
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    """Login user."""
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user["id"]})
    return {
        "success": True,
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name", "")}
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(require_auth)):
    """Get current user."""
    return {"success": True, "user": user}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

@api_router.post("/restructure-script")
async def restructure_script(request: ScriptRequest):
    """Main AI script generation endpoint using Gemini 2.5 Flash."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        prompt = build_master_prompt(request)
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"script-{uuid.uuid4()}",
            system_message="You are an expert video content producer. Always respond with valid JSON only."
        )
        chat.with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Clean and parse response
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        import json
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}, response: {cleaned[:200]}")
            raise HTTPException(status_code=500, detail="Failed to parse AI response as JSON")
        
        return {"success": True, "data": parsed}
        
    except Exception as e:
        logger.error(f"Script generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/generate-image")
async def generate_image(request: ImageGenerateRequest, user: dict = Depends(get_current_user)):
    """Generate image using Gemini Nano Banana."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        # Build enhanced prompt
        style_prompt = f"Generate a high-quality, professional image for a video background: {request.description}. Style: {request.style}. 16:9 aspect ratio, cinematic lighting, no text."
        
        if request.characters:
            char_desc = ", ".join([f"{c['name']}: {c['description']}" for c in request.characters])
            style_prompt += f" CONSISTENT CHARACTERS: {char_desc}"
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"image-{uuid.uuid4()}",
            system_message="You are an AI image generator."
        )
        chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        user_message = UserMessage(text=style_prompt)
        text_response, images = await chat.send_message_multimodal_response(user_message)
        
        if images and len(images) > 0:
            # Save image to uploads
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            random_suffix = str(uuid.uuid4())[:7]
            filename = f"image-{timestamp}-{random_suffix}.png"
            filepath = UPLOADS_DIR / filename
            
            image_bytes = base64.b64decode(images[0]['data'])
            async with aiofiles.open(filepath, 'wb') as f:
                await f.write(image_bytes)
            
            # Save to database - link to user
            user_id = user.get("id") if user else request.userId
            asset_doc = {
                "id": str(uuid.uuid4()),
                "type": "image",
                "url": f"/api/uploads/{filename}",
                "prompt": request.description,
                "style": request.style,
                "projectId": request.projectId,
                "userId": user_id,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.generated_assets.insert_one(asset_doc)
            
            return {
                "success": True,
                "image": f"/api/uploads/{filename}",
                "assetId": asset_doc["id"],
                "mimeType": images[0].get('mime_type', 'image/png')
            }
        else:
            raise HTTPException(status_code=500, detail="No image generated")
            
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/generate-video")
async def generate_video(request: VideoGenerateRequest, user: dict = Depends(get_current_user)):
    """Generate video background image using Gemini."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        prompt = f"Generate a cinematic, high-quality video background image for the following scene: {request.description}. Wide 16:9 format, photorealistic, 4k quality, dynamic composition."
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"video-{uuid.uuid4()}",
            system_message="You are an AI image generator for video backgrounds."
        )
        chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        user_message = UserMessage(text=prompt)
        text_response, images = await chat.send_message_multimodal_response(user_message)
        
        if images and len(images) > 0:
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            random_suffix = str(uuid.uuid4())[:7]
            filename = f"video-bg-{timestamp}-{random_suffix}.png"
            filepath = UPLOADS_DIR / filename
            
            image_bytes = base64.b64decode(images[0]['data'])
            async with aiofiles.open(filepath, 'wb') as f:
                await f.write(image_bytes)
            
            user_id = user.get("id") if user else request.userId
            asset_doc = {
                "id": str(uuid.uuid4()),
                "type": "video",
                "url": f"/api/uploads/{filename}",
                "prompt": request.description,
                "projectId": request.projectId,
                "userId": user_id,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.generated_assets.insert_one(asset_doc)
            
            return {
                "success": True,
                "video": f"/api/uploads/{filename}",
                "assetId": asset_doc["id"],
                "mimeType": "image/png"
            }
        else:
            raise HTTPException(status_code=500, detail="No video background generated")
            
    except Exception as e:
        logger.error(f"Video generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/generate-voice")
async def generate_voice(request: VoiceGenerateRequest, user: dict = Depends(get_current_user)):
    """Generate TTS voice using Google Cloud Text-to-Speech API."""
    try:
        import httpx
        
        api_key = os.getenv("GOOGLE_TTS_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GOOGLE_TTS_API_KEY not configured")
        
        # Map voice IDs to Google TTS format
        voice_mapping = {
            "en-US-Journey-D": {"languageCode": "en-US", "name": "en-US-Journey-D"},
            "en-US-Journey-F": {"languageCode": "en-US", "name": "en-US-Journey-F"},
            "en-US-Wavenet-D": {"languageCode": "en-US", "name": "en-US-Wavenet-D"},
            "en-US-Wavenet-F": {"languageCode": "en-US", "name": "en-US-Wavenet-F"},
            "en-GB-Neural2-B": {"languageCode": "en-GB", "name": "en-GB-Neural2-B"},
            "en-GB-Neural2-A": {"languageCode": "en-GB", "name": "en-GB-Neural2-A"},
            "en-AU-Neural2-B": {"languageCode": "en-AU", "name": "en-AU-Neural2-B"},
            "en-AU-Neural2-C": {"languageCode": "en-AU", "name": "en-AU-Neural2-C"},
        }
        
        voice_config = voice_mapping.get(request.voiceId, {"languageCode": "en-US", "name": "en-US-Wavenet-D"})
        
        # Call Google TTS API
        tts_url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}"
        payload = {
            "input": {"text": request.text},
            "voice": voice_config,
            "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.0, "pitch": 0}
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(tts_url, json=payload, timeout=30)
            
            if response.status_code != 200:
                logger.error(f"TTS API error: {response.text}")
                raise HTTPException(status_code=500, detail=f"TTS API error: {response.status_code}")
            
            result = response.json()
            audio_content = result.get("audioContent")
            
            if not audio_content:
                raise HTTPException(status_code=500, detail="No audio content returned")
            
            # Save audio file
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            random_suffix = str(uuid.uuid4())[:7]
            filename = f"voice-{timestamp}-{random_suffix}.mp3"
            filepath = UPLOADS_DIR / filename
            
            audio_bytes = base64.b64decode(audio_content)
            async with aiofiles.open(filepath, 'wb') as f:
                await f.write(audio_bytes)
            
            # Save to user's generated assets
            user_id = user.get("id") if user else request.userId
            asset_doc = {
                "id": str(uuid.uuid4()),
                "type": "voice",
                "url": f"/api/uploads/{filename}",
                "prompt": request.text[:100],
                "metadata": {"voiceId": request.voiceId, "textLength": len(request.text)},
                "projectId": request.projectId,
                "userId": user_id,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.generated_assets.insert_one(asset_doc)
            
            return {
                "success": True,
                "url": f"/api/uploads/{filename}",
                "assetId": asset_doc["id"]
            }
    except Exception as e:
        logger.error(f"Voice generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/generate-music")
async def generate_music(request: MusicGenerateRequest):
    """Generate background music (mocked for MVP)."""
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = str(uuid.uuid4())[:7]
        filename = f"music-{timestamp}-{random_suffix}.mp3"
        
        return {
            "success": True,
            "url": f"/api/uploads/{filename}",
            "message": "Music generation mocked for MVP"
        }
    except Exception as e:
        logger.error(f"Music generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/generate-sfx")
async def generate_sfx(request: SfxGenerateRequest):
    """Generate sound effects (mocked for MVP)."""
    try:
        filename = f"sfx-{uuid.uuid4()}.mp3"
        
        return {
            "success": True,
            "url": f"/api/uploads/{filename}",
            "message": "SFX generation mocked for MVP"
        }
    except Exception as e:
        logger.error(f"SFX generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/search/assets")
async def search_assets(q: str = "business"):
    """Search stock assets (mocked response for MVP)."""
    # Return mock stock images
    mock_results = [
        {"id": "1", "type": "image", "url": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800", "thumbnail": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=200", "tags": "business,office,team", "user": "Unsplash"},
        {"id": "2", "type": "image", "url": "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800", "thumbnail": "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=200", "tags": "technology,startup", "user": "Unsplash"},
        {"id": "3", "type": "image", "url": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800", "thumbnail": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200", "tags": "team,meeting,collaboration", "user": "Unsplash"},
        {"id": "4", "type": "video", "url": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800", "thumbnail": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=200", "tags": "workspace,desk,computer", "user": "Unsplash"},
    ]
    return {"results": mock_results}

@api_router.get("/search/audio")
async def search_audio(q: str = "ambient"):
    """Search audio tracks (mocked response for MVP)."""
    mock_results = [
        {"id": "1", "name": "Corporate Upbeat", "previews": {"preview-hq-mp3": "/api/uploads/mock-audio-1.mp3"}},
        {"id": "2", "name": "Cinematic Epic", "previews": {"preview-hq-mp3": "/api/uploads/mock-audio-2.mp3"}},
    ]
    return {"results": mock_results}

# ─── User Assets Routes ─────────────────────────────────────────────────────

@api_router.get("/user/assets")
async def get_user_assets(user: dict = Depends(require_auth), type: Optional[str] = None, limit: int = 50):
    """Get all assets generated by the current user."""
    try:
        query = {"userId": user["id"]}
        if type:
            query["type"] = type
        
        assets = await db.generated_assets.find(query, {"_id": 0}).sort("createdAt", -1).to_list(limit)
        return {"success": True, "assets": assets}
    except Exception as e:
        logger.error(f"Get user assets error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/user/stats")
async def get_user_stats(user: dict = Depends(require_auth)):
    """Get statistics for the current user."""
    try:
        # Count assets by type
        image_count = await db.generated_assets.count_documents({"userId": user["id"], "type": "image"})
        voice_count = await db.generated_assets.count_documents({"userId": user["id"], "type": "voice"})
        video_count = await db.generated_assets.count_documents({"userId": user["id"], "type": "video"})
        project_count = await db.projects.count_documents({"userId": user["id"]})
        
        return {
            "success": True,
            "stats": {
                "images": image_count,
                "voices": voice_count,
                "videos": video_count,
                "projects": project_count,
                "total": image_count + voice_count + video_count
            }
        }
    except Exception as e:
        logger.error(f"Get user stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/projects")
async def create_project(request: ProjectCreateRequest):
    """Create and save a project to database."""
    try:
        project_id = str(uuid.uuid4())
        
        # Prepare slides data
        slides_data = []
        for slide in request.project.get('slides', []):
            slides_data.append({
                "id": slide.get('id'),
                "order": int(slide.get('id', 0)),
                "script": slide.get('narration', ''),
                "imageUrl": slide.get('assetUrl') if slide.get('assetType') == 'image' else None,
                "videoUrl": slide.get('assetUrl') if slide.get('assetType') == 'video' else None,
                "imagePrompt": slide.get('imagePrompt', ''),
                "videoPrompt": slide.get('videoPrompt', ''),
                "onScreenText": slide.get('onScreenText'),
                "vfx": slide.get('vfx'),
                "duration": slide.get('duration', 6),
                "voiceUrl": slide.get('voiceUrl'),
                "graphicsJson": slide.get('graphics')
            })
        
        project_doc = {
            "id": project_id,
            "title": request.title,
            "description": request.project.get('title', ''),
            "category": request.project.get('category', 'explainer'),
            "status": "draft",
            "userId": request.userId,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "slides": slides_data,
            "settings": {
                "duration": request.project.get('duration', 30),
                "tone": request.project.get('voiceoverStyle', 'professional'),
                "slideCount": len(slides_data),
                "assetType": "image",
                "voiceId": request.project.get('voiceId'),
                "musicStyle": request.project.get('musicMood'),
                "bgmUrl": request.project.get('bgmUrl')
            },
            "projectData": request.project
        }
        
        # Insert and get clean copy for response
        await db.projects.insert_one(project_doc)
        
        # Also ensure user exists
        user_exists = await db.users.find_one({"id": request.userId})
        if not user_exists:
            await db.users.insert_one({
                "id": request.userId,
                "email": f"user_{request.userId[:8]}@explainapro.app",
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "subscriptionTier": "free"
            })
        
        # Return clean response without MongoDB _id
        response_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        return {"success": True, "project": response_project}
        
    except Exception as e:
        logger.error(f"Project creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/projects")
async def get_projects(userId: Optional[str] = None):
    """Get all projects, optionally filtered by userId."""
    try:
        query = {}
        if userId:
            query["userId"] = userId
        
        projects = await db.projects.find(query, {"_id": 0}).to_list(100)
        return {"success": True, "projects": projects}
    except Exception as e:
        logger.error(f"Get projects error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Get a single project by ID."""
    try:
        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return {"success": True, "project": project}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get project error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Serve uploaded files
from fastapi.responses import FileResponse

@api_router.get("/uploads/{filename}")
async def get_upload(filename: str):
    """Serve uploaded files."""
    filepath = UPLOADS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)

@api_router.get("/renders/{filename}")
async def get_render(filename: str):
    """Serve rendered videos as downloadable MP4."""
    filepath = RENDERS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Render not found")
    return FileResponse(
        filepath, 
        media_type="video/mp4",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ─── Video Render Routes ────────────────────────────────────────────────────

class RenderRequest(BaseModel):
    projectId: str
    slides: List[Dict[str, Any]]
    title: str
    duration: int = 30
    generateVoice: bool = True
    voiceId: str = "en-US-Journey-D"

render_jobs = {}

async def generate_voice_for_slide(text: str, voice_id: str, api_key: str) -> Optional[bytes]:
    """Generate voice audio for a slide using Google TTS."""
    try:
        import httpx
        
        voice_mapping = {
            "en-US-Journey-D": {"languageCode": "en-US", "name": "en-US-Journey-D"},
            "en-US-Journey-F": {"languageCode": "en-US", "name": "en-US-Journey-F"},
            "en-US-Wavenet-D": {"languageCode": "en-US", "name": "en-US-Wavenet-D"},
            "en-US-Wavenet-F": {"languageCode": "en-US", "name": "en-US-Wavenet-F"},
            "en-GB-Neural2-B": {"languageCode": "en-GB", "name": "en-GB-Neural2-B"},
            "en-GB-Neural2-A": {"languageCode": "en-GB", "name": "en-GB-Neural2-A"},
        }
        
        voice_config = voice_mapping.get(voice_id, {"languageCode": "en-US", "name": "en-US-Wavenet-D"})
        
        tts_url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}"
        payload = {
            "input": {"text": text},
            "voice": voice_config,
            "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.0, "pitch": 0}
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(tts_url, json=payload, timeout=30)
            if response.status_code == 200:
                result = response.json()
                audio_content = result.get("audioContent")
                if audio_content:
                    return base64.b64decode(audio_content)
        return None
    except Exception as e:
        logger.error(f"Voice generation error: {e}")
        return None

async def render_video_task(job_id: str, project_id: str, slides: List[Dict], title: str, generate_voice: bool = True, voice_id: str = "en-US-Journey-D"):
    """Background task to render video using FFmpeg with voice audio."""
    try:
        render_jobs[job_id] = {"status": "processing", "progress": 0, "step": "Preparing..."}
        
        # Create temp directory for this render
        temp_dir = RENDERS_DIR / f"temp_{job_id}"
        temp_dir.mkdir(exist_ok=True)
        
        total_slides = len(slides)
        image_files = []
        audio_files = []
        
        # Get TTS API key
        tts_api_key = os.getenv("GOOGLE_TTS_API_KEY")
        
        # Process each slide - images and voice
        for idx, slide in enumerate(slides):
            progress = int((idx / total_slides) * 40)
            render_jobs[job_id]["progress"] = progress
            render_jobs[job_id]["step"] = f"Processing slide {idx + 1}/{total_slides}"
            
            asset_url = slide.get('assetUrl')
            duration = slide.get('duration', 6)
            narration = slide.get('narration', '')
            voice_url = slide.get('voiceUrl')
            
            # Handle image
            img_path = temp_dir / f"slide_{idx:03d}.png"
            if asset_url:
                if asset_url.startswith('/api/uploads/'):
                    src_file = UPLOADS_DIR / asset_url.split('/')[-1]
                    if src_file.exists():
                        shutil.copy(src_file, img_path)
                elif asset_url.startswith('http'):
                    import httpx
                    async with httpx.AsyncClient() as client:
                        resp = await client.get(asset_url)
                        if resp.status_code == 200:
                            async with aiofiles.open(img_path, 'wb') as f:
                                await f.write(resp.content)
            
            if not img_path.exists():
                # Create placeholder
                subprocess.run([
                    'ffmpeg', '-y', '-f', 'lavfi', '-i', 
                    f'color=c=#1a1a2e:s=1920x1080:d=1', 
                    '-frames:v', '1', str(img_path)
                ], capture_output=True)
            
            image_files.append((str(img_path), duration))
            
            # Handle voice audio
            audio_path = temp_dir / f"audio_{idx:03d}.mp3"
            if voice_url and voice_url.startswith('/api/uploads/'):
                # Use existing voice file
                src_audio = UPLOADS_DIR / voice_url.split('/')[-1]
                if src_audio.exists():
                    shutil.copy(src_audio, audio_path)
                    audio_files.append((str(audio_path), duration))
            elif generate_voice and narration and tts_api_key:
                # Generate voice on the fly
                render_jobs[job_id]["step"] = f"Generating voice for slide {idx + 1}"
                audio_bytes = await generate_voice_for_slide(narration, voice_id, tts_api_key)
                if audio_bytes:
                    async with aiofiles.open(audio_path, 'wb') as f:
                        await f.write(audio_bytes)
                    audio_files.append((str(audio_path), duration))
                else:
                    audio_files.append((None, duration))
            else:
                audio_files.append((None, duration))
        
        if not image_files:
            render_jobs[job_id] = {"status": "failed", "error": "No images to render"}
            return
        
        render_jobs[job_id]["progress"] = 50
        render_jobs[job_id]["step"] = "Creating video..."
        
        # Create concat file for images
        concat_file = temp_dir / "concat.txt"
        with open(concat_file, 'w') as f:
            for img_path, duration in image_files:
                f.write(f"file '{img_path}'\n")
                f.write(f"duration {duration}\n")
            f.write(f"file '{image_files[-1][0]}'\n")
        
        render_jobs[job_id]["progress"] = 55
        
        # Output filenames
        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()[:50]
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        output_filename = f"{safe_title}-{timestamp}.mp4"
        output_path = RENDERS_DIR / output_filename
        video_only_path = temp_dir / "video_only.mp4"
        
        # First render video only
        render_jobs[job_id]["step"] = "Rendering video..."
        ffmpeg_video_cmd = [
            'ffmpeg', '-y',
            '-f', 'concat', '-safe', '0', '-i', str(concat_file),
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-movflags', '+faststart',
            str(video_only_path)
        ]
        
        result = subprocess.run(ffmpeg_video_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"FFmpeg video error: {result.stderr}")
            render_jobs[job_id] = {"status": "failed", "error": "Video rendering failed"}
            return
        
        render_jobs[job_id]["progress"] = 70
        
        # Combine audio files if we have any
        has_audio = any(af[0] is not None for af in audio_files)
        
        if has_audio:
            render_jobs[job_id]["step"] = "Merging audio..."
            
            # Create a combined audio file with proper timing
            combined_audio_path = temp_dir / "combined_audio.mp3"
            
            # Build ffmpeg filter for audio concatenation with silence padding
            audio_inputs = []
            filter_parts = []
            
            for idx, (audio_path, duration) in enumerate(audio_files):
                if audio_path and Path(audio_path).exists():
                    audio_inputs.extend(['-i', audio_path])
                    # Pad audio to match slide duration
                    filter_parts.append(f"[{idx}:a]apad=whole_dur={duration}[a{idx}]")
                else:
                    # Create silence for this duration
                    audio_inputs.extend(['-f', 'lavfi', '-i', f'anullsrc=r=44100:cl=stereo:d={duration}'])
                    filter_parts.append(f"[{idx}:a]acopy[a{idx}]")
            
            # Concatenate all audio streams
            concat_labels = ''.join([f'[a{i}]' for i in range(len(audio_files))])
            filter_complex = ';'.join(filter_parts) + f';{concat_labels}concat=n={len(audio_files)}:v=0:a=1[outa]'
            
            audio_cmd = ['ffmpeg', '-y'] + audio_inputs + [
                '-filter_complex', filter_complex,
                '-map', '[outa]',
                '-c:a', 'libmp3lame', '-q:a', '2',
                str(combined_audio_path)
            ]
            
            audio_result = subprocess.run(audio_cmd, capture_output=True, text=True)
            
            render_jobs[job_id]["progress"] = 85
            
            if audio_result.returncode == 0 and combined_audio_path.exists():
                # Merge video and audio
                render_jobs[job_id]["step"] = "Finalizing..."
                merge_cmd = [
                    'ffmpeg', '-y',
                    '-i', str(video_only_path),
                    '-i', str(combined_audio_path),
                    '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '192k',
                    '-shortest',
                    '-movflags', '+faststart',
                    str(output_path)
                ]
                
                merge_result = subprocess.run(merge_cmd, capture_output=True, text=True)
                
                if merge_result.returncode != 0:
                    logger.warning(f"Audio merge failed, using video only: {merge_result.stderr}")
                    shutil.copy(video_only_path, output_path)
            else:
                logger.warning("Audio combination failed, using video only")
                shutil.copy(video_only_path, output_path)
        else:
            # No audio, just use video
            shutil.copy(video_only_path, output_path)
        
        render_jobs[job_id]["progress"] = 95
        
        # Clean up temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        # Update job status
        video_url = f"/api/renders/{output_filename}"
        render_jobs[job_id] = {
            "status": "completed",
            "progress": 100,
            "videoUrl": video_url,
            "hasAudio": has_audio
        }
        
        # Update project in database
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"renderUrl": video_url, "status": "rendered"}}
        )
        
        logger.info(f"Render completed with audio: {output_path}")
        
    except Exception as e:
        logger.error(f"Render error: {e}")
        render_jobs[job_id] = {"status": "failed", "error": str(e)}

@api_router.post("/render")
async def start_render(request: RenderRequest, background_tasks: BackgroundTasks):
    """Start video rendering process with voice audio."""
    job_id = str(uuid.uuid4())
    render_jobs[job_id] = {"status": "pending", "progress": 0, "step": "Starting..."}
    
    background_tasks.add_task(
        render_video_task, 
        job_id, 
        request.projectId, 
        request.slides, 
        request.title,
        request.generateVoice,
        request.voiceId
    )
    
    return {"success": True, "jobId": job_id, "status": "started"}

@api_router.get("/render/{job_id}")
async def get_render_status(job_id: str):
    """Get render job status."""
    if job_id not in render_jobs:
        raise HTTPException(status_code=404, detail="Render job not found")
    return {"success": True, **render_jobs[job_id]}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
