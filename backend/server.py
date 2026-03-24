from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, Body, Form
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
import sys
import json
import time
from jose import JWTError, jwt
import bcrypt as _bcrypt
from google import genai

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Ensure render dependencies are available (chromium, ffmpeg, node for Remotion)
def ensure_render_deps():
    """Install chromium, ffmpeg, and node if missing. Ensure remotion node_modules exist."""
    missing = []
    for cmd in ['chromium', 'ffmpeg', 'ffprobe']:
        if not shutil.which(cmd):
            missing.append(cmd)
    if not shutil.which('node'):
        missing.append('nodejs')
    if missing:
        logging.info(f"Installing missing render dependencies: {missing}")
        try:
            subprocess.run(['apt-get', 'update', '-qq'], capture_output=True, timeout=60)
            pkgs = ['chromium', 'ffmpeg']
            if 'nodejs' in missing:
                pkgs.append('nodejs')
            subprocess.run(['apt-get', 'install', '-y', '-qq'] + pkgs, capture_output=True, timeout=120)
            logging.info("Render dependencies installed successfully")
        except Exception as e:
            logging.warning(f"Could not install render dependencies: {e}")
    # Ensure remotion node_modules are installed
    remotion_dir = ROOT_DIR.parent / 'remotion'
    if remotion_dir.exists() and not (remotion_dir / 'node_modules').exists():
        logging.info("Installing remotion node_modules...")
        try:
            subprocess.run(['yarn', 'install', '--frozen-lockfile'], cwd=str(remotion_dir), capture_output=True, timeout=120)
            logging.info("Remotion node_modules installed successfully")
        except Exception as e:
            logging.warning(f"Could not install remotion node_modules: {e}")

ensure_render_deps()

# Gemini client
_gemini_client = None
def get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        api_key = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_GENERATIVE_AI_API_KEY not configured")
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client

async def gemini_generate(system_message: str, user_message: str) -> str:
    """Generate text using Gemini 2.5 Flash."""
    client = get_gemini_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_message,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_message,
            temperature=0.7,
        ),
    )
    return response.text

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
MUSIC_LIB_DIR = ROOT_DIR / 'library' / 'music'
MUSIC_LIB_DIR.mkdir(parents=True, exist_ok=True)
SFX_LIB_DIR = ROOT_DIR / 'library' / 'sfx'
SFX_LIB_DIR.mkdir(parents=True, exist_ok=True)

# ─── Library Catalog ─────────────────────────────────────────────────────────
MUSIC_CATALOG = [
    {"id": "cinematic-epic-rise", "name": "Epic Rise", "category": "cinematic", "mood": "dramatic", "duration": 25, "description": "Building tension with dramatic overtones"},
    {"id": "cinematic-dark-suspense", "name": "Dark Suspense", "category": "cinematic", "mood": "mysterious", "duration": 25, "description": "Deep mysterious atmosphere"},
    {"id": "cinematic-emotional", "name": "Emotional Touch", "category": "cinematic", "mood": "emotional", "duration": 25, "description": "Touching emotional melody with harmonics"},
    {"id": "cinematic-triumph", "name": "Orchestral Triumph", "category": "cinematic", "mood": "triumphant", "duration": 25, "description": "Victory and achievement feel"},
    {"id": "cinematic-tension", "name": "Rising Tension", "category": "cinematic", "mood": "suspenseful", "duration": 25, "description": "Slow-building tension and anticipation"},
    {"id": "corporate-forward", "name": "Business Forward", "category": "corporate", "mood": "professional", "duration": 25, "description": "Clean professional upbeat track"},
    {"id": "corporate-innovation", "name": "Innovation Drive", "category": "corporate", "mood": "modern", "duration": 25, "description": "Tech-forward corporate energy"},
    {"id": "corporate-teamwork", "name": "Team Spirit", "category": "corporate", "mood": "collaborative", "duration": 25, "description": "Warm collaborative team feel"},
    {"id": "corporate-presentation", "name": "Presentation Ready", "category": "corporate", "mood": "focused", "duration": 25, "description": "Clean background for presentations"},
    {"id": "ambient-deep-space", "name": "Deep Space", "category": "ambient", "mood": "cosmic", "duration": 25, "description": "Vast cosmic atmosphere"},
    {"id": "ambient-ocean-breeze", "name": "Ocean Breeze", "category": "ambient", "mood": "calm", "duration": 25, "description": "Gentle ocean waves atmosphere"},
    {"id": "ambient-forest-dawn", "name": "Forest Dawn", "category": "ambient", "mood": "natural", "duration": 25, "description": "Morning nature with birdsong"},
    {"id": "ambient-night-sky", "name": "Night Sky", "category": "ambient", "mood": "dreamy", "duration": 25, "description": "Peaceful nighttime ambience"},
    {"id": "ambient-meditation", "name": "Meditation Flow", "category": "ambient", "mood": "zen", "duration": 25, "description": "Calming meditation frequency"},
    {"id": "upbeat-happy-days", "name": "Happy Days", "category": "upbeat", "mood": "cheerful", "duration": 25, "description": "Fun and cheerful bright melody"},
    {"id": "upbeat-dance-energy", "name": "Dance Energy", "category": "upbeat", "mood": "energetic", "duration": 25, "description": "High energy dance rhythm"},
    {"id": "upbeat-sunny-walk", "name": "Sunny Walk", "category": "upbeat", "mood": "light", "duration": 25, "description": "Light breezy walking pace"},
    {"id": "upbeat-celebration", "name": "Celebration", "category": "upbeat", "mood": "festive", "duration": 25, "description": "Festive party celebration"},
    {"id": "lofi-late-night", "name": "Late Night Study", "category": "lofi", "mood": "chill", "duration": 25, "description": "Chill beats for late night focus"},
    {"id": "lofi-rainy-window", "name": "Rainy Window", "category": "lofi", "mood": "cozy", "duration": 25, "description": "Cozy rainy day vibes"},
    {"id": "lofi-coffee-shop", "name": "Coffee Shop", "category": "lofi", "mood": "warm", "duration": 25, "description": "Warm coffee shop atmosphere"},
    {"id": "lofi-dreamy", "name": "Dreamy Drift", "category": "lofi", "mood": "dreamy", "duration": 25, "description": "Soft dreamy floating feeling"},
    {"id": "electronic-neon-pulse", "name": "Neon Pulse", "category": "electronic", "mood": "futuristic", "duration": 25, "description": "Pulsing neon synthwave"},
    {"id": "electronic-digital-dreams", "name": "Digital Dreams", "category": "electronic", "mood": "tech", "duration": 25, "description": "Futuristic digital soundscape"},
    {"id": "electronic-cyber-grid", "name": "Cyber Grid", "category": "electronic", "mood": "intense", "duration": 25, "description": "Intense cyber rhythm"},
    {"id": "electronic-synthwave", "name": "Synthwave Ride", "category": "electronic", "mood": "retro", "duration": 25, "description": "Retro synthwave cruise"},
    {"id": "inspirational-new-beginnings", "name": "New Beginnings", "category": "inspirational", "mood": "hopeful", "duration": 25, "description": "Fresh start with hope"},
    {"id": "inspirational-rise-above", "name": "Rise Above", "category": "inspirational", "mood": "motivational", "duration": 25, "description": "Uplifting motivational energy"},
    {"id": "inspirational-dream-chaser", "name": "Dream Chaser", "category": "inspirational", "mood": "aspirational", "duration": 25, "description": "Chasing dreams and ambitions"},
    {"id": "inspirational-hope", "name": "Rays of Hope", "category": "inspirational", "mood": "uplifting", "duration": 25, "description": "Bright hopeful melody"},
    {"id": "acoustic-morning-light", "name": "Morning Light", "category": "acoustic", "mood": "warm", "duration": 25, "description": "Warm morning guitar-like tones"},
    {"id": "acoustic-gentle-stream", "name": "Gentle Stream", "category": "acoustic", "mood": "peaceful", "duration": 25, "description": "Soft natural flowing melody"},
    {"id": "acoustic-campfire", "name": "Campfire Stories", "category": "acoustic", "mood": "nostalgic", "duration": 25, "description": "Warm campfire folk feeling"},
    {"id": "acoustic-sunset", "name": "Golden Sunset", "category": "acoustic", "mood": "serene", "duration": 25, "description": "Serene sunset golden hour"},
]

SFX_CATALOG = [
    {"id": "transition-swoosh", "name": "Swoosh", "category": "transitions", "duration": 0.8, "description": "Fast air swoosh"},
    {"id": "transition-whoosh-low", "name": "Whoosh Low", "category": "transitions", "duration": 1.0, "description": "Deep bass whoosh"},
    {"id": "transition-slide-in", "name": "Slide In", "category": "transitions", "duration": 0.6, "description": "Smooth slide entrance"},
    {"id": "transition-reverse", "name": "Reverse Swoosh", "category": "transitions", "duration": 0.8, "description": "Reversed air swoosh"},
    {"id": "transition-zoom", "name": "Zoom", "category": "transitions", "duration": 0.5, "description": "Quick zoom effect"},
    {"id": "transition-fast-cut", "name": "Fast Cut", "category": "transitions", "duration": 0.3, "description": "Sharp fast cut"},
    {"id": "transition-heavy-whoosh", "name": "Heavy Whoosh", "category": "transitions", "duration": 1.2, "description": "Heavy powerful whoosh"},
    {"id": "transition-glide", "name": "Glide", "category": "transitions", "duration": 0.8, "description": "Smooth gliding transition"},
    {"id": "ui-click", "name": "Click", "category": "ui", "duration": 0.08, "description": "Clean button click"},
    {"id": "ui-pop", "name": "Pop", "category": "ui", "duration": 0.15, "description": "Soft bubble pop"},
    {"id": "ui-ding", "name": "Ding", "category": "ui", "duration": 1.2, "description": "Notification bell ding"},
    {"id": "ui-success", "name": "Success", "category": "ui", "duration": 0.8, "description": "Achievement success chime"},
    {"id": "ui-error", "name": "Error", "category": "ui", "duration": 0.6, "description": "Error alert tone"},
    {"id": "ui-toggle", "name": "Toggle", "category": "ui", "duration": 0.1, "description": "Quick toggle switch"},
    {"id": "ui-notification", "name": "Notification", "category": "ui", "duration": 0.8, "description": "Gentle notification alert"},
    {"id": "ui-hover", "name": "Hover", "category": "ui", "duration": 0.06, "description": "Subtle hover feedback"},
    {"id": "impact-boom", "name": "Boom", "category": "impact", "duration": 1.5, "description": "Deep powerful bass boom"},
    {"id": "impact-hit", "name": "Hit", "category": "impact", "duration": 0.3, "description": "Sharp impact hit"},
    {"id": "impact-thud", "name": "Thud", "category": "impact", "duration": 0.8, "description": "Heavy ground thud"},
    {"id": "impact-crash", "name": "Crash", "category": "impact", "duration": 1.0, "description": "Shattering crash"},
    {"id": "impact-slam", "name": "Slam", "category": "impact", "duration": 0.6, "description": "Door slam with reverb"},
    {"id": "impact-punch", "name": "Punch", "category": "impact", "duration": 0.25, "description": "Quick punch impact"},
    {"id": "tech-glitch", "name": "Glitch", "category": "tech", "duration": 0.4, "description": "Digital data glitch"},
    {"id": "tech-beep", "name": "Beep", "category": "tech", "duration": 0.3, "description": "Scanner beep"},
    {"id": "tech-data", "name": "Data Transfer", "category": "tech", "duration": 0.8, "description": "Fast data stream"},
    {"id": "tech-power-up", "name": "Power Up", "category": "tech", "duration": 1.0, "description": "Charging power up"},
    {"id": "tech-power-down", "name": "Power Down", "category": "tech", "duration": 1.0, "description": "System shutdown"},
    {"id": "tech-scan", "name": "Scan", "category": "tech", "duration": 0.6, "description": "Quick scan sweep"},
    {"id": "tech-digital-blip", "name": "Digital Blip", "category": "tech", "duration": 0.15, "description": "Short digital blip"},
    {"id": "tech-robot", "name": "Robot Voice", "category": "tech", "duration": 0.5, "description": "Robotic vocal tone"},
    {"id": "nature-thunder", "name": "Thunder", "category": "nature", "duration": 3.0, "description": "Rolling thunder crack"},
    {"id": "nature-rain", "name": "Rain", "category": "nature", "duration": 5.0, "description": "Gentle rain ambience"},
    {"id": "nature-wind", "name": "Wind", "category": "nature", "duration": 4.0, "description": "Soft wind gust"},
    {"id": "nature-birds", "name": "Birds", "category": "nature", "duration": 3.0, "description": "Chirping bird calls"},
    {"id": "nature-water-drop", "name": "Water Drop", "category": "nature", "duration": 0.5, "description": "Single water droplet"},
    {"id": "nature-ocean-wave", "name": "Ocean Wave", "category": "nature", "duration": 4.0, "description": "Rolling ocean wave"},
    {"id": "nature-crickets", "name": "Crickets", "category": "nature", "duration": 3.0, "description": "Evening cricket chorus"},
    {"id": "comic-boing", "name": "Boing", "category": "comic", "duration": 0.8, "description": "Springy bounce"},
    {"id": "comic-fail", "name": "Fail", "category": "comic", "duration": 1.2, "description": "Sad trombone fail"},
    {"id": "comic-win", "name": "Win Fanfare", "category": "comic", "duration": 1.0, "description": "Victory fanfare"},
    {"id": "comic-magic", "name": "Magic Sparkle", "category": "comic", "duration": 1.0, "description": "Sparkly magic effect"},
    {"id": "comic-cartoon", "name": "Cartoon Wobble", "category": "comic", "duration": 0.6, "description": "Wobbly cartoon effect"},
    {"id": "comic-spring", "name": "Spring", "category": "comic", "duration": 0.5, "description": "Coiled spring release"},
    {"id": "comic-whistle", "name": "Whistle", "category": "comic", "duration": 0.8, "description": "Short whistle tune"},
]

# ─── Auth Configuration ─────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "explainapro-secret-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return _bcrypt.hashpw(password.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')

security = HTTPBearer(auto_error=False)

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
    style: str = "Cinematic"
    characters: Optional[List[Dict]] = None
    characterImageUrl: Optional[str] = None
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
    assetMode: str = "image"  # image, video, upload
    assetUrl: Optional[str] = None
    startFrame: Optional[str] = None
    endFrame: Optional[str] = None
    assetGenerating: bool = False
    voiceUrl: Optional[str] = None
    sfxUrl: Optional[str] = None
    sfxVolume: float = 1.0
    vfx: Optional[str] = None
    graphics: Optional[List[Dict]] = None

# ─── Category Prompts ───────────────────────────────────────────────────────

CATEGORY_PROMPTS = {
    "news": "You are a Peabody Award-winning broadcast journalist with 25 years at CNN and BBC. You craft viral, fact-checked news packages that combine hard-hitting reporting with cinematic storytelling. Every slide must feel like a breaking news segment that keeps viewers glued to the screen.",
    "explainer": "You are the creative mind behind Kurzgesagt and Vox explainer videos. You transform the most complex topics into beautifully simple visual stories. Use powerful analogies, concrete examples, and a 'build-up to aha moment' structure that makes viewers feel smarter.",
    "cartoon": "You are a Pixar-level story architect who creates emotionally resonant animated narratives. Every scene has exaggerated expressions, vivid colors, dynamic poses, and a clear emotional beat. Your stories have heart, humor, and a satisfying arc even in 30 seconds.",
    "ebook": "You are a bestselling author and BookTok creator who distills 300-page books into gripping visual summaries. You extract the 3-5 most transformative ideas and present them as 'mind-blown' moments with vivid metaphors and real-world applications.",
    "biography": "You are Ken Burns meets modern YouTube documentarian. You find the most dramatic, little-known turning points in a person's life and weave them into a cinematic narrative arc with tension, triumph, and legacy. Every slide should feel like a movie scene.",
    "tutorial": "You are a world-class educator who has taught millions on Skillshare and MasterClass. You break skills into crystal-clear micro-steps with visual demonstrations. Every slide is one actionable concept with a clear before/after transformation.",
    "datastory": "You are Hans Rosling reborn as a TikTok creator. You make data dance, surprise, and tell human stories. Every statistic is paired with a jaw-dropping visual comparison. You use progressive revelation to build tension before the data payoff.",
    "youtube": "You are MrBeast's content strategist combined with a film school professor. You analyze YouTube content for hook structure, retention patterns, and viral elements, then reconstruct them into an even more engaging format with higher production value.",
    "motiongraphic": "You are the lead motion designer at Apple. Every frame is a masterpiece of typography, geometry, and kinetic energy. You think in layers: background atmosphere, mid-ground data/text, foreground accents. Every transition is purposeful and every animation tells a micro-story.",
    "prayer": "You are a globally beloved spiritual guide who creates deeply moving, multi-faith devotional experiences. Your words carry weight, reverence, and profound comfort. Every slide is a moment of peace, reflection, and spiritual connection with breathtaking sacred imagery.",
    "reporter": "You are Anderson Cooper delivering a special report. Your presence is commanding, your facts are airtight, and your narrative builds like a thriller. Use professional broadcast structure: hook, context, development, impact, call-to-action.",
    "history": "You are Dan Carlin narrating Hardcore History. You find the most electrifying moments in history and make the audience feel like they're THERE. Use vivid sensory details, dramatic irony, and the 'zoom in on a single person' technique to make history feel alive.",
    "remaker": "You are a visionary content remixer who takes existing videos and elevates them to cinematic quality. You identify the core emotional beats and storytelling hooks, then reconstruct them with better pacing, stronger visuals, and more impactful narration.",
    "horror": "You are the mastermind behind Creepypasta and horror podcasts that keep millions awake at night. You build dread through atmosphere, not jump scares. Every slide escalates tension with unsettling details, unreliable narration, and imagery that feels slightly wrong.",
    "scifi": "You are Arthur C. Clarke meets Neil deGrasse Tyson. You blend hard science with visionary speculation to create mind-expanding content about the future, space, AI, and technology. Every slide should make the viewer question reality and marvel at possibility.",
    "travel": "You are Anthony Bourdain meets National Geographic. You don't just show places, you make viewers FEEL them. Every slide captures the sounds, flavors, textures, and human stories of a destination. Your narration is poetic yet grounded in authentic cultural detail.",
    "motivation": "You are Tony Robbins meets a spoken word poet. Your words hit like a freight train of inspiration. Every slide is a crescendo building toward an unstoppable call-to-action. Use raw emotion, powerful metaphors, and the 'dark moment before the breakthrough' structure.",
    "crime": "You are the producer of Making a Murderer and host of Serial. You present evidence methodically while building unbearable suspense. Every slide reveals a new piece of the puzzle. Use forensic precision with noir-style visuals and an 'are you sure you know the truth?' hook.",
    "comedy": "You are a Netflix special director who creates tight, punchy comedy with perfect timing. Every beat is a setup or punchline. Use absurd escalation, callbacks, and subverted expectations. The visuals should enhance the comedy with exaggerated, cartoon-like energy.",
    "recipe": "You are a Michelin-star chef turned viral food content creator. Every step is a mouth-watering visual feast. You don't just show recipes, you tell the story behind the dish. Close-up textures, sizzling sounds, steam rising, cheese pulling — pure food cinema.",
    "fitness": "You are a celebrity trainer and sports science expert. Your content is high-energy, scientifically backed, and visually dynamic. Every slide shows a clear exercise or health concept with perfect form demonstrations, before/after energy, and motivational intensity.",
    "biz_product_demo": "You are a Silicon Valley product marketer who has launched products at Apple, Tesla, and Google. You showcase features through benefit-driven storytelling: problem → solution → delight. Every slide demonstrates a feature in action with clean, premium visuals.",
    "biz_pitch_deck": "You are the pitch coach behind 50+ unicorn funding rounds. You structure investor narratives with: massive market opportunity → unique insight → traction proof → team credibility → audacious vision. Every slide builds FOMO and confidence.",
    "biz_commercial": "You are a Cannes Lions-winning creative director. You craft 30-second stories that become cultural moments. Hook in 1 second, emotional peak by slide 3, brand reveal at the end. Every frame is Super Bowl ad quality.",
    "biz_marketing": "You are the CMO who scaled a DTC brand from $0 to $100M. You think in funnels: awareness → interest → desire → action. Every slide targets a specific stage with conversion-optimized messaging and scroll-stopping visuals.",
    "biz_company_profile": "You are a Fortune 500 corporate communications director. You weave company history, mission, values, and achievements into a compelling narrative that builds trust and authority. Professional yet warm, data-backed yet human.",
    "biz_brand_story": "You are a brand strategist who built Nike's 'Just Do It' and Apple's 'Think Different'. You find the emotional core of a brand and craft origin stories that create tribal loyalty. Every slide is a chapter in an epic journey.",
    "biz_testimonial": "You are a documentary filmmaker specializing in customer success stories. You structure testimonials as mini-hero journeys: the challenge → the search → the discovery → the transformation → the result. Authentic, specific, and emotionally compelling.",
    "biz_social_ad": "You are a viral social media strategist with 10B+ views across platforms. You know exactly what stops thumbs: pattern interrupts, curiosity gaps, and emotional triggers. Every frame is optimized for the first 3 seconds. Platform-native, trend-aware.",
    "biz_training": "You are an instructional design expert from Google's L&D team. You create training content that actually sticks: clear learning objectives, micro-lessons, knowledge checks, and memorable examples. Professional, engaging, and retention-optimized.",
    "biz_product_launch": "You are Apple's keynote producer. You build anticipation through teaser → problem → solution → 'one more thing' → availability. Every slide is a crescendo. The product is the hero. The reveal is cinematic. The CTA is urgent.",
    "biz_case_study": "You are McKinsey's storytelling lead. You present case studies as detective stories: the client challenge → the investigation → the insight → the solution → the measurable impact. Data is the star, but narrative is the vehicle.",
    "biz_webinar_promo": "You are an event marketing genius who fills stadiums. You sell the transformation, not the event: what will attendees BECOME? Showcase speakers, tease content, create urgency with limited spots. Every slide should make someone click 'Register Now'.",
    "biz_sales_explainer": "You are a sales enablement expert who simplifies complex sales processes. You use whiteboard-style progressive revelation: identify the pain → present the framework → show the solution → prove the ROI. Clear, logical, and persuasive.",
    "biz_presentation": "You are a TED Talk coach and McKinsey presentation specialist. You structure business presentations with the Minto Pyramid: answer first, then evidence. Every slide makes ONE point with maximum visual impact. Clean, confident, executive-ready.",
}

def build_master_prompt(request: ScriptRequest) -> str:
    """Build the master prompt for script generation based on category."""
    tone_guide = {
        'professional': 'Clear, authoritative, results-focused. Short punchy sentences. Zero filler words. Every word earns its place.',
        'energetic': 'EXPLOSIVE energy. Rapid-fire delivery. Action verbs. Exclamation points. Make the viewer feel ALIVE.',
        'soft': 'Warm, intimate, like a trusted friend sharing wisdom over coffee. Gentle pauses. Empathetic.',
        'bold': 'POWERFUL. Direct. Confrontational truth. Each sentence hits like a hammer. Unapologetic.',
        'documentary': 'Cinematic gravitas. Rich sensory descriptions. Build tension like a thriller. Let facts speak through stories.',
        'storytelling': 'Classic hero journey. Relatable protagonist. Clear stakes. Emotional crescendo. Satisfying resolution.',
        'minimalist': 'Ultra-concise. One devastating thought per slide. Let silence and visuals do the heavy lifting.',
        'humorous': 'Witty, self-aware, perfectly timed. Setup-punchline rhythm. Absurd escalation. Never try-hard.',
    }
    
    tone_desc = tone_guide.get(request.tone, tone_guide['professional'])
    target_word_count = int((request.duration / 60) * 140)
    avg_slide_dur = round(request.duration / request.slideCount)
    
    persona = CATEGORY_PROMPTS.get(request.category, CATEGORY_PROMPTS['explainer'])
    
    json_schema = f'''{{
  "title": "A compelling, click-worthy title (max 8 words)",
  "duration": {request.duration},
  "style": "cinematic|flat|minimal|3d|illustrated",
  "colorScheme": "#HEX primary color that matches the mood",
  "slides": [
    {{
      "id": "1",
      "title": "Short impactful slide title (3-5 words)",
      "narration": "Narration text. MUST be {request.tone} tone. 1-3 sentences. Write for SPOKEN delivery — use contractions, rhetorical questions, dramatic pauses (...).",
      "duration": {avg_slide_dur},
      "imagePrompt": "ULTRA-DETAILED image generation prompt. Include: subject, action, composition, lighting (golden hour/dramatic/neon), camera angle (close-up/wide/aerial), color palette, mood, style ({request.preferredVisualStyle}). 16:9 landscape. NEVER include text in image. Example quality level: 'A weathered fisherman mending nets at dawn, golden sunlight streaming through morning mist, shot from low angle, warm amber and deep blue tones, photojournalistic style, shallow depth of field'",
      "videoPrompt": "Specific camera movement: slow dolly in / parallax pan / aerial orbit / time-lapse / rack focus / handheld follow",
      "transition": "fade|slide|zoom|none",
      "onScreenText": "Optional 2-4 word bold overlay for emphasis",
      "visualStyle": "abstract|realistic|illustrated|chart|screencast",
      "sfxPrompt": "Specific sound effect for this slide moment (e.g., 'dramatic whoosh', 'crowd gasp', 'glass shatter', 'heartbeat')",
      "graphics": [
        {{
          "type": "title-card|lower-third|kinetic-text|stat-counter",
          "startTime": 0,
          "duration": 3,
          "title": "For title-card",
          "subtitle": "For title-card subtitle",
          "name": "For lower-third person name",
          "text": "For kinetic-text animated content",
          "value": "For stat-counter numeric value",
          "label": "For stat-counter metric label",
          "prefix": "$ or other prefix",
          "suffix": "% or other suffix"
        }}
      ]
    }}
  ],
  "voiceoverStyle": "Match the {request.tone} tone — specify pace (slow/medium/fast), emotion, emphasis patterns",
  "musicMood": "Specific genre + energy level + instruments (e.g., 'lo-fi hip-hop with soft piano, building to orchestral crescendo')",
  "characters": [
    {{ "name": "Character Name", "description": "DETAILED physical description for CONSISTENT AI generation: age, ethnicity, build, hair color/style, clothing, distinguishing features. Be SPECIFIC enough that every image generation produces the same recognizable person." }}
  ],
  "suggestedMusic": ["5 hyper-specific music descriptions with genre, tempo, instruments, and mood arc"],
  "suggestedVfx": ["5 specific visual effects: particle systems, light leaks, glitch effects, color grading shifts, zoom transitions"],
  "suggestedSfx": ["5 specific sound effects with timing context: 'metallic impact on stat reveal', 'wind ambience for landscape shot'"]
}}'''

    motion_graphics_instruction = ""
    if request.category == "motiongraphic":
        motion_graphics_instruction = """
MOTION GRAPHICS MASTERCLASS INSTRUCTIONS:
This is a PREMIUM motion graphics piece. Every single slide MUST include 2-3 animated overlays from the graphics array.
Design philosophy: Apple keynote meets Bloomberg data visualization.

Available graphic types and when to use them:
- "title-card": Cinematic title reveal with optional subtitle. Use for opening, section breaks, and closing.
- "lower-third": Sleek name/title bar. Use to introduce sources, speakers, topics, or locations.
- "kinetic-text": Large animated text that builds word-by-word. Use for key quotes, shocking stats, or call-to-action.
- "stat-counter": Animated counter that counts up to final value. Use for ANY number, percentage, or metric.

Image prompts for motion graphics should be: abstract gradient backgrounds, geometric patterns, flowing particle systems, or clean solid colors. NEVER busy photorealistic scenes.
"""

    visual_instruction = f'''
VISUAL EXCELLENCE REQUIREMENTS:
1. Visual style is "{request.preferredVisualStyle}" — EVERY imagePrompt MUST be crafted specifically for this style.
2. Define 1-2 KEY CHARACTERS with ultra-specific physical descriptions in "characters" array.
3. Reference these character names BY NAME in imagePrompt of EVERY slide they appear in.
4. Each imagePrompt must be 40-80 words of rich visual detail — lighting, angle, composition, color, mood.
5. NO TWO SLIDES should have similar compositions. Vary between: close-ups, wide shots, aerial views, POV shots, detail shots.
6. Include "sfxPrompt" for each slide — a specific sound that enhances the moment.
{motion_graphics_instruction}'''

    return f'''{persona}

USER INPUT ({request.type.upper()}): "{request.input}"

CATEGORY: {request.category.upper()} VIDEO

YOUR MISSION: Create a VIRAL-QUALITY {request.slideCount}-slide storyboard totaling exactly {request.duration} seconds.

NARRATION RULES:
- Tone: {request.tone.upper()} — {tone_desc}
- TOTAL word count across ALL slides: exactly ~{target_word_count} words (this ensures {request.duration}s at natural speaking pace)
- Write for SPOKEN delivery. Use contractions, rhetorical questions, power pauses (...)
- First slide MUST hook the viewer in under 3 seconds. Open with a question, shocking fact, or bold statement.
- Last slide MUST have a clear call-to-action or memorable closing line.

IMAGE PROMPT RULES:
- CRITICAL: Every imagePrompt MUST explicitly state the style "{request.preferredVisualStyle}" at the END of the prompt
- Every imagePrompt must be 40-80 words of cinematic detail
- Specify: subject, action, lighting, camera angle, color palette, mood
- ALWAYS end each imagePrompt with: "Rendered in {request.preferredVisualStyle} style."
- NEVER include text/words/letters in any image
- Maintain visual consistency across all slides (same color palette, same characters, same {request.preferredVisualStyle} aesthetic)

OUTPUT: Return ONLY valid JSON (no markdown, no code fences, no explanations)

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
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@api_router.post("/auth/login")
async def login(data: UserLogin):
    """Login user."""
    try:
        user = await db.users.find_one({"email": data.email.lower()})
        if not user or not verify_password(data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        token = create_access_token({"sub": user["id"]})
        return {
            "success": True,
            "token": token,
            "user": {"id": user["id"], "email": user["email"], "name": user.get("name", "")}
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

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

@api_router.post("/editor/chat")
async def editor_chat(request: dict = Body(...)):
    """AI-powered editor chat. Parses natural language into structured actions."""
    try:
        message = request.get("message", "")
        ctx = request.get("projectContext", {})
        
        slides_desc = ""
        for s in ctx.get("slides", []):
            slides_desc += f"\n  Slide {s['index']} (id=\"{s['id']}\"): title=\"{s['title']}\", duration={s['duration']}s, transition={s['transition']}, hasImage={s['hasImage']}, hasVoice={s['hasVoice']}, vfx={s['vfx']}, graphics={s['graphicsCount']}"
        
        system_prompt = f"""You are an AI video editor assistant for ExplainaPro. The user is editing a video project.

Current project: "{ctx.get('title', 'Untitled')}"
Slides ({ctx.get('slideCount', 0)} total):{slides_desc}
BGM: {ctx.get('bgmUrl', 'none')}
Caption style: {ctx.get('captionStyle', 'none')}

The user will give you natural language commands. Parse each command into one or more actions. Return ONLY valid JSON:
{{
  "reply": "Friendly confirmation of what you did (1-2 sentences)",
  "actions": [
    {{
      "type": "update_slide",
      "slideId": "the slide id",
      "updates": {{"field": "value"}}
    }}
  ]
}}

Available action types:
1. "update_slide" - Update slide properties. updates can include: duration (number), transition ("fade"|"slide"|"zoom"|"none"), vfx ("none"|"cinematic"|"vhs"|"glitch"|"grayscale"|"blur"), narration (text), title (text), onScreenText (text), imagePrompt (text)
2. "delete_slide" - Remove a slide. Fields: slideId
3. "add_graphic" - Add motion graphic to slide. Fields: slideId, graphic: {{type: "title-card"|"lower-third"|"kinetic-text"|"stat-counter", title/name/text/value/label/subtitle, startTime: 0, duration: 3}}
4. "remove_graphics" - Remove all graphics from slide. Fields: slideId
5. "set_caption_style" - Change caption style. Fields: styleId ("bold-pop"|"netflix"|"minimal"|"tiktok"|"neon"|"glass")
6. "set_caption_mode" - Change caption mode. Fields: mode ("words"|"lines"|"sentence")
7. "generate_image" - Trigger image generation for a slide. Fields: slideId
8. "generate_all_images" - Generate images for all slides. No extra fields.
9. "generate_voice" - Generate voice for a slide. Fields: slideId
10. "generate_all_voices" - Generate voices for all slides. No extra fields.
11. "open_tab" - Switch editor tab. Fields: tabId ("script"|"assets"|"graphics"|"music"|"voice"|"captions"|"effects")
12. "batch_update" - Update all slides at once. Fields: updates: {{field: value}}
13. "info" - Just respond with information, no action needed. No extra fields.

IMPORTANT:
- When user says "slide 1", "slide 2" etc, match to the correct slide id from the context.
- For batch operations like "set all transitions to zoom", use "batch_update" action type.
- If the user asks a question or you can't determine an action, use type "info" with just a reply.
- Always include a friendly reply."""

        response = await gemini_generate(system_prompt, message)
        
        # Parse response
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        import json
        parsed = json.loads(cleaned)
        
        return {"success": True, "reply": parsed.get("reply", "Done!"), "actions": parsed.get("actions", [])}
        
    except json.JSONDecodeError:
        return {"success": True, "reply": response.strip()[:200] if response else "I understood your request.", "actions": []}
    except Exception as e:
        logger.error(f"Editor chat error: {e}")
        return {"success": False, "reply": "Sorry, I couldn't process that request.", "actions": []}

class PromptGeneratorRequest(BaseModel):
    story: str
    category: str = "explainer"
    tone: str = "professional"
    slideCount: int = 5
    duration: int = 30
    visualStyle: str = "Cinematic"

@api_router.post("/generate-prompt")
async def generate_prompt(request: PromptGeneratorRequest):
    """AI Prompt Generator: Takes a user story and generates comprehensive, optimized prompts for every aspect of video creation."""
    try:
        avg_slide_dur = round(request.duration / request.slideCount)
        target_words = int((request.duration / 60) * 140)
        
        generator_prompt = f'''You are the world's best AI video prompt engineer. A user has provided a story/idea and you must generate the ULTIMATE set of prompts that will produce a VIRAL, CINEMATIC video.

USER STORY: "{request.story}"
CATEGORY: {request.category}
TONE: {request.tone}
SLIDES: {request.slideCount}
DURATION: {request.duration}s
VISUAL STYLE: {request.visualStyle}

Generate a comprehensive JSON prompt package. Each prompt must be hyper-detailed, specific, and optimized for maximum quality.

Return ONLY valid JSON:
{{
  "title": "Viral-worthy title (max 8 words)",
  "hook": "The opening 1-sentence hook that makes viewers STOP scrolling",
  "narrativeArc": "Brief description of the story structure: setup -> tension -> climax -> resolution",
  "slides": [
    {{
      "id": "1",
      "title": "3-5 word slide title",
      "narrationPrompt": "The EXACT narration script for this slide. {request.tone} tone. Written for spoken delivery. Include pauses (...). Total across all slides must be ~{target_words} words.",
      "imagePrompt": "60-80 word cinematic image generation prompt. Include: subject, action, composition rule (rule of thirds/leading lines/symmetry), specific lighting (golden hour/rembrandt/neon noir), camera (35mm wide/85mm portrait/macro), color palette (specific hex-worthy colors), mood. MUST be in {request.visualStyle} style. Always end with: 'Rendered in {request.visualStyle} style.' NEVER include text in image.",
      "videoPrompt": "Camera movement: slow dolly forward / parallax drift right / aerial orbit 180deg / time-lapse clouds / rack focus near-to-far / handheld intimate shake",
      "sfxPrompt": "Specific sound effect: 'deep bass impact + glass resonance', 'crowd murmur building to cheer', 'wind howl through canyon'",
      "musicMoment": "What the music should do HERE: 'soft piano intro', 'drums kick in', 'build to crescendo', 'drop to silence'",
      "duration": {avg_slide_dur},
      "transition": "fade|slide|zoom|none"
    }}
  ],
  "characters": [
    {{
      "name": "Name",
      "imageDescription": "Ultra-specific: age, ethnicity, build (athletic/slim/stocky), hair (color, length, style), face (shape, expressions), clothing (specific items, colors, textures), distinguishing features. 50+ words for consistency.",
      "voiceDescription": "Voice qualities: pitch, pace, accent, emotion, breathing patterns"
    }}
  ],
  "globalImageStyle": "Master visual directive: ALL images MUST be in {request.visualStyle} style. Apply {request.visualStyle} aesthetic to every single image: color grading, lighting philosophy, composition rules, texture preferences. No exceptions.",
  "voicePrompt": "Complete voice direction: pace (120wpm/150wpm), emotion progression across the video, emphasis words, pause locations, breathing style",
  "musicPrompt": "Full music brief: genre, BPM range, key instruments, energy arc (start soft -> build -> climax -> resolve), reference tracks style",
  "sfxDesign": ["8-10 specific sound design elements with exact timing descriptions"],
  "colorPalette": ["5 hex colors that define the visual identity"],
  "moodBoard": "3-sentence visual mood description that an AI image generator would understand"
}}'''

        response = await gemini_generate(
            "You are the world's #1 AI prompt engineer specializing in video production. Your prompts consistently produce 10x better results than generic prompts. Always respond with valid JSON only.",
            generator_prompt
        )
        
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        parsed = json.loads(cleaned)
        return {"success": True, "data": parsed}
        
    except json.JSONDecodeError as e:
        logger.error(f"Prompt generator JSON error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI-generated prompts")
    except Exception as e:
        logger.error(f"Prompt generator error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/analyze-business")
async def analyze_business(
    url: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """Analyze a business from URL, file upload, or description and suggest video types."""
    try:
        business_context = ""

        # 1. Scrape URL if provided
        if url and url.strip():
            try:
                import requests as req
                from bs4 import BeautifulSoup
                headers = {"User-Agent": "Mozilla/5.0 (compatible; ExplainaPro/1.0)"}
                resp = req.get(url.strip(), headers=headers, timeout=15)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")
                for tag in soup(["script", "style", "nav", "footer", "header"]):
                    tag.decompose()
                text = soup.get_text(separator=" ", strip=True)[:5000]
                title = soup.title.string if soup.title else ""
                meta_desc = ""
                meta_tag = soup.find("meta", attrs={"name": "description"})
                if meta_tag:
                    meta_desc = meta_tag.get("content", "")
                business_context += f"WEBSITE URL: {url}\nTITLE: {title}\nMETA: {meta_desc}\nCONTENT: {text}\n\n"
            except Exception as e:
                logger.warning(f"URL scrape failed: {e}")
                business_context += f"WEBSITE URL: {url} (could not scrape, use URL as reference)\n\n"

        # 2. Extract text from uploaded file
        if file:
            content = await file.read()
            ext = Path(file.filename).suffix.lower()
            try:
                if ext == ".pdf":
                    from PyPDF2 import PdfReader
                    import io
                    reader = PdfReader(io.BytesIO(content))
                    text = " ".join(page.extract_text() or "" for page in reader.pages)[:5000]
                    business_context += f"UPLOADED PDF ({file.filename}):\n{text}\n\n"
                elif ext in (".docx", ".doc"):
                    from docx import Document
                    import io
                    doc = Document(io.BytesIO(content))
                    text = " ".join(p.text for p in doc.paragraphs)[:5000]
                    business_context += f"UPLOADED DOCUMENT ({file.filename}):\n{text}\n\n"
                elif ext in (".txt", ".md", ".csv"):
                    text = content.decode("utf-8", errors="ignore")[:5000]
                    business_context += f"UPLOADED FILE ({file.filename}):\n{text}\n\n"
                elif ext in (".png", ".jpg", ".jpeg", ".webp"):
                    business_context += f"UPLOADED IMAGE ({file.filename}): [image provided as context]\n\n"
                else:
                    text = content.decode("utf-8", errors="ignore")[:3000]
                    business_context += f"UPLOADED FILE ({file.filename}):\n{text}\n\n"
            except Exception as e:
                logger.warning(f"File extraction failed: {e}")
                business_context += f"UPLOADED FILE ({file.filename}): [extraction failed]\n\n"

        # 3. Add manual description
        if description and description.strip():
            business_context += f"BUSINESS DESCRIPTION: {description.strip()}\n\n"

        if not business_context.strip():
            raise HTTPException(status_code=400, detail="Please provide a URL, file, or description")

        # 4. Analyze with Gemini
        analysis_prompt = f"""You are a world-class business video strategist. Analyze the following business information and provide:
1. A concise summary of what this business does
2. Key products/services offered
3. Target audience
4. Brand tone and personality
5. Recommend which video types would be MOST valuable for this business, ranked by impact

BUSINESS INFORMATION:
{business_context}

Return ONLY valid JSON:
{{
  "businessName": "Company name",
  "businessSummary": "2-3 sentence summary of the business",
  "products": ["product/service 1", "product/service 2"],
  "targetAudience": "Description of ideal customers",
  "brandTone": "professional|energetic|friendly|premium|innovative",
  "suggestedVideos": [
    {{
      "categoryId": "biz_product_demo",
      "label": "Product Demo",
      "reason": "Why this video type would benefit this specific business (1 sentence)",
      "priority": "high|medium|low",
      "suggestedTopic": "A specific topic/angle for this business"
    }}
  ],
  "keyMessages": ["3-5 key brand messages to highlight in videos"],
  "competitiveEdge": "What makes this business unique"
}}

Available categoryIds: biz_product_demo, biz_pitch_deck, biz_commercial, biz_marketing, biz_company_profile, biz_brand_story, biz_testimonial, biz_social_ad, biz_training, biz_product_launch, biz_case_study, biz_webinar_promo, biz_sales_explainer, biz_presentation

Include at least 6 relevant video types in suggestedVideos, sorted by priority (high first)."""

        response = await gemini_generate(
            "You are an elite business video strategist who has consulted for Fortune 500 companies. Always respond with valid JSON only.",
            analysis_prompt
        )

        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        parsed = json.loads(cleaned)
        return {"success": True, "data": parsed}

    except json.JSONDecodeError as e:
        logger.error(f"Business analysis JSON error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI analysis")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Business analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/restructure-script")
async def restructure_script(request: ScriptRequest):
    """Main AI script generation endpoint using Gemini 2.5 Flash."""
    try:
        prompt = build_master_prompt(request)
        
        response = await gemini_generate(
            "You are an expert video content producer. Always respond with valid JSON only.",
            prompt
        )
        
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
    """Generate image using Gemini."""
    try:
        # Build enhanced prompt with strict style enforcement
        style_prompt = f"Generate a high-quality, professional image for a video background. MANDATORY STYLE: {request.style} — the entire image MUST be rendered in {request.style} style consistently. Description: {request.description}. Requirements: 16:9 aspect ratio, {request.style} aesthetic throughout, no text or words in the image."
        
        if request.characters:
            char_desc = ", ".join([f"{c['name']}: {c['description']}" for c in request.characters])
            style_prompt += f" CONSISTENT CHARACTERS: {char_desc}"
        
        client = get_gemini_client()
        response = client.models.generate_images(
            model='imagen-4.0-generate-001',
            prompt=style_prompt,
            config=genai.types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="16:9",
                output_mime_type="image/png",
            )
        )
        
        if response.generated_images and len(response.generated_images) > 0:
            # Save image to uploads
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            random_suffix = str(uuid.uuid4())[:7]
            filename = f"image-{timestamp}-{random_suffix}.png"
            filepath = UPLOADS_DIR / filename
            
            image_bytes = response.generated_images[0].image.image_bytes
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
                "mimeType": "image/png"
            }
        else:
            raise HTTPException(status_code=500, detail="No image generated")
            
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/generate-video")
async def generate_video(request: VideoGenerateRequest, user: dict = Depends(get_current_user)):
    """Generate start frame and end frame for a video slide using Gemini."""
    try:
        char_desc = ""
        if request.characters:
            char_desc = " CONSISTENT CHARACTERS: " + ", ".join([f"{c.get('name','')}: {c.get('description','')}" for c in request.characters])
        
        # Generate START frame
        start_prompt = f"Generate the OPENING FRAME of a cinematic video scene. MANDATORY STYLE: {request.style}. Scene: {request.description}. This is the BEGINNING — show the initial state, establishing shot, calm before action. 16:9 aspect ratio, {request.style} aesthetic, no text.{char_desc}"
        
        # Generate END frame
        end_prompt = f"Generate the CLOSING FRAME of a cinematic video scene. MANDATORY STYLE: {request.style}. Scene: {request.description}. This is the END — show the climax/resolution, dynamic composition, peak moment. 16:9 aspect ratio, {request.style} aesthetic, no text.{char_desc}"
        
        client = get_gemini_client()
        
        # Generate both frames
        start_response = client.models.generate_images(
            model='imagen-4.0-generate-001',
            prompt=start_prompt,
            config=genai.types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="16:9",
                output_mime_type="image/png",
            )
        )
        
        end_response = client.models.generate_images(
            model='imagen-4.0-generate-001',
            prompt=end_prompt,
            config=genai.types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="16:9",
                output_mime_type="image/png",
            )
        )
        
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = str(uuid.uuid4())[:7]
        result = {"success": True}
        
        # Save start frame
        if start_response.generated_images and len(start_response.generated_images) > 0:
            start_filename = f"video-start-{timestamp}-{random_suffix}.png"
            start_path = UPLOADS_DIR / start_filename
            async with aiofiles.open(start_path, 'wb') as f:
                await f.write(start_response.generated_images[0].image.image_bytes)
            result["startFrame"] = f"/api/uploads/{start_filename}"
        
        # Save end frame
        if end_response.generated_images and len(end_response.generated_images) > 0:
            end_filename = f"video-end-{timestamp}-{random_suffix}.png"
            end_path = UPLOADS_DIR / end_filename
            async with aiofiles.open(end_path, 'wb') as f:
                await f.write(end_response.generated_images[0].image.image_bytes)
            result["endFrame"] = f"/api/uploads/{end_filename}"
        
        # Use start frame as the main asset
        result["video"] = result.get("startFrame")
        
        # Save to database
        user_id = user.get("id") if user else request.userId
        asset_doc = {
            "id": str(uuid.uuid4()),
            "type": "video",
            "url": result.get("startFrame"),
            "startFrame": result.get("startFrame"),
            "endFrame": result.get("endFrame"),
            "prompt": request.description,
            "style": request.style,
            "projectId": request.projectId,
            "userId": user_id,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        await db.generated_assets.insert_one(asset_doc)
        result["assetId"] = asset_doc["id"]
        
        if not result.get("startFrame"):
            raise HTTPException(status_code=500, detail="No frames generated")
        
        return result
            
    except Exception as e:
        logger.error(f"Video generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/upload-character")
async def upload_character(file: UploadFile = File(...), name: str = Form("Character"), description: str = Form("")):
    """Upload a reference character image for consistency across generations."""
    try:
        content = await file.read()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = str(uuid.uuid4())[:7]
        ext = Path(file.filename).suffix or '.png'
        filename = f"character-{timestamp}-{random_suffix}{ext}"
        filepath = UPLOADS_DIR / filename
        async with aiofiles.open(filepath, 'wb') as f:
            await f.write(content)
        return {
            "success": True,
            "url": f"/api/uploads/{filename}",
            "name": name,
            "description": description,
        }
    except Exception as e:
        logger.error(f"Character upload error: {e}")
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

@api_router.get("/user/library")
async def get_user_library(user: dict = Depends(require_auth), category: Optional[str] = None, limit: int = 100):
    """Get user's asset library grouped by category."""
    try:
        user_id = user["id"]
        query = {"userId": user_id}
        if category and category != "all":
            query["type"] = category
        
        assets = await db.generated_assets.find(query, {"_id": 0}).sort("createdAt", -1).to_list(limit)
        
        # Group by type for summary
        counts = {}
        for a in assets:
            t = a.get("type", "other")
            counts[t] = counts.get(t, 0) + 1
        
        return {
            "success": True,
            "assets": assets,
            "counts": counts,
            "total": len(assets)
        }
    except Exception as e:
        logger.error(f"Get user library error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/user/assets/{asset_id}")
async def delete_user_asset(asset_id: str, user: dict = Depends(require_auth)):
    """Delete an asset from the user's library."""
    try:
        asset = await db.generated_assets.find_one({"id": asset_id, "userId": user["id"]}, {"_id": 0})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # Delete file from disk if it exists
        url = asset.get("url", "")
        if url.startswith("/api/uploads/"):
            filename = url.replace("/api/uploads/", "")
            filepath = UPLOADS_DIR / filename
            if filepath.exists():
                filepath.unlink()
        
        await db.generated_assets.delete_one({"id": asset_id, "userId": user["id"]})
        
        return {"success": True, "message": "Asset deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete user asset error: {e}")
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
    """Create or update a project in database."""
    try:
        # Check if project already exists for this user with same title
        existing = await db.projects.find_one({
            "userId": request.userId,
            "title": request.title
        })
        
        project_id = existing["id"] if existing else str(uuid.uuid4())
        
        slides_data = []
        for slide in request.project.get('slides', []):
            slides_data.append({
                "id": slide.get('id'),
                "order": int(slide.get('id', 0)) if str(slide.get('id', '')).isdigit() else 0,
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
        
        if existing:
            await db.projects.update_one({"id": project_id}, {"$set": project_doc})
        else:
            project_doc["createdAt"] = datetime.now(timezone.utc).isoformat()
            await db.projects.insert_one(project_doc)
        
        response_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        return {"success": True, "project": response_project, "isNew": not existing}
        
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

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload a file (image, video, audio) to the server and save to user library."""
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = str(uuid.uuid4())[:7]
        ext = Path(file.filename).suffix or '.png'
        filename = f"upload-{timestamp}-{random_suffix}{ext}"
        filepath = UPLOADS_DIR / filename
        
        content = await file.read()
        async with aiofiles.open(filepath, 'wb') as f:
            await f.write(content)
        
        # Determine asset type from extension
        ext_lower = ext.lower()
        if ext_lower in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']:
            asset_type = "image"
        elif ext_lower in ['.mp4', '.mov', '.avi', '.webm', '.mkv']:
            asset_type = "video"
        elif ext_lower in ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac']:
            asset_type = "audio"
        else:
            asset_type = "other"
        
        url = f"/api/uploads/{filename}"
        
        # Save to user's library if authenticated
        user_id = user.get("id") if user else None
        asset_id = str(uuid.uuid4())
        if user_id:
            asset_doc = {
                "id": asset_id,
                "type": asset_type,
                "url": url,
                "prompt": file.filename,
                "metadata": {"originalName": file.filename, "size": len(content), "source": "upload"},
                "userId": user_id,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.generated_assets.insert_one(asset_doc)
        
        return {
            "success": True,
            "url": url,
            "filename": filename,
            "size": len(content),
            "assetId": asset_id,
            "type": asset_type
        }
    except Exception as e:
        logger.error(f"File upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

# ─── Export Routes (PDF, HTML) ───────────────────────────────────────────────

class ExportRequest(BaseModel):
    title: str
    slides: List[Dict[str, Any]]
    format: str = "pdf"  # pdf or html

@api_router.post("/export/pdf")
async def export_pdf(request: ExportRequest):
    """Export slides as a PDF document with images, titles, narrations, and prompts."""
    try:
        from reportlab.lib.pagesizes import landscape, A4
        from reportlab.lib.units import inch
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle, PageBreak
        from reportlab.lib.colors import HexColor
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
        import io
        import requests as req

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = str(uuid.uuid4())[:7]
        filename = f"export-{timestamp}-{random_suffix}.pdf"
        filepath = UPLOADS_DIR / filename

        doc = SimpleDocTemplate(str(filepath), pagesize=landscape(A4), leftMargin=40, rightMargin=40, topMargin=30, bottomMargin=30)

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24, spaceAfter=12, alignment=TA_CENTER, textColor=HexColor('#1e293b'))
        subtitle_style = ParagraphStyle('CustomSubtitle', parent=styles['Normal'], fontSize=10, spaceAfter=20, alignment=TA_CENTER, textColor=HexColor('#64748b'))
        slide_title_style = ParagraphStyle('SlideTitle', parent=styles['Heading2'], fontSize=16, spaceAfter=6, textColor=HexColor('#1e293b'))
        narration_style = ParagraphStyle('Narration', parent=styles['Normal'], fontSize=10, spaceAfter=4, textColor=HexColor('#334155'), leading=14)
        prompt_style = ParagraphStyle('Prompt', parent=styles['Normal'], fontSize=8, spaceAfter=4, textColor=HexColor('#6366f1'), italic=True, leading=11)
        label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=8, textColor=HexColor('#94a3b8'), spaceAfter=2)

        elements = []
        elements.append(Paragraph(request.title or "Video Storyboard", title_style))
        elements.append(Paragraph(f"{len(request.slides)} slides | Generated by ExplainaPro", subtitle_style))
        elements.append(Spacer(1, 12))

        for i, slide in enumerate(request.slides):
            elements.append(Paragraph(f"Slide {slide.get('id', i+1)}: {slide.get('title', 'Untitled')}", slide_title_style))

            # Try to include slide image
            asset_url = slide.get('assetUrl', '')
            if asset_url:
                try:
                    if asset_url.startswith('/api/'):
                        img_path = UPLOADS_DIR / asset_url.replace('/api/uploads/', '')
                        if img_path.exists():
                            elements.append(RLImage(str(img_path), width=5*inch, height=2.8*inch))
                            elements.append(Spacer(1, 6))
                except Exception:
                    pass

            elements.append(Paragraph("NARRATION:", label_style))
            elements.append(Paragraph(slide.get('narration', 'No narration'), narration_style))

            if slide.get('imagePrompt'):
                elements.append(Paragraph("IMAGE PROMPT:", label_style))
                elements.append(Paragraph(slide['imagePrompt'], prompt_style))

            if slide.get('videoPrompt'):
                elements.append(Paragraph("VIDEO GENERATION PROMPT:", label_style))
                elements.append(Paragraph(slide['videoPrompt'], prompt_style))

            duration_text = f"Duration: {slide.get('duration', 'N/A')}s"
            if slide.get('transition'):
                duration_text += f" | Transition: {slide['transition']}"
            elements.append(Paragraph(duration_text, label_style))

            if i < len(request.slides) - 1:
                elements.append(PageBreak())

        doc.build(elements)

        return {
            "success": True,
            "url": f"/api/uploads/{filename}",
            "filename": filename
        }
    except Exception as e:
        logger.error(f"PDF export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/export/html")
async def export_html(request: ExportRequest):
    """Export slides as a standalone HTML presentation file."""
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = str(uuid.uuid4())[:7]
        filename = f"export-{timestamp}-{random_suffix}.html"
        filepath = UPLOADS_DIR / filename

        slides_html = ""
        for i, slide in enumerate(request.slides):
            asset_url = slide.get('assetUrl', '')
            bg_style = ""
            if asset_url:
                if asset_url.startswith('/api/'):
                    img_path = UPLOADS_DIR / asset_url.replace('/api/uploads/', '')
                    if img_path.exists():
                        import base64
                        with open(img_path, 'rb') as f:
                            b64 = base64.b64encode(f.read()).decode()
                        ext = img_path.suffix.lstrip('.')
                        bg_style = f"background-image:url(data:image/{ext};base64,{b64});background-size:cover;background-position:center;"
                else:
                    bg_style = f"background-image:url({asset_url});background-size:cover;background-position:center;"

            if not bg_style:
                bg_style = "background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%);"

            slides_html += f'''
    <div class="slide" id="slide-{i}" style="{bg_style}">
      <div class="slide-overlay">
        <div class="slide-num">Slide {slide.get('id', i+1)}</div>
        <h2 class="slide-title">{slide.get('title', 'Untitled')}</h2>
        <p class="slide-narration">{slide.get('narration', '')}</p>
        {f'<div class="slide-prompt"><strong>Video Prompt:</strong> {slide.get("videoPrompt", "")}</div>' if slide.get('videoPrompt') else ''}
        <div class="slide-meta">{slide.get("duration", "N/A")}s | {slide.get("transition", "fade")}</div>
      </div>
    </div>'''

        html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{request.title or "Video Storyboard"} - ExplainaPro</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#fff;overflow:hidden}}
.controls{{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:rgba(15,23,42,0.9);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.1)}}
.controls h1{{font-size:14px;font-weight:800;color:#e2e8f0}}
.controls .nav{{display:flex;gap:8px;align-items:center}}
.controls button{{padding:8px 16px;border:none;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s}}
.controls .btn-nav{{background:rgba(255,255,255,0.1);color:#e2e8f0}}
.controls .btn-nav:hover{{background:rgba(255,255,255,0.2)}}
.controls .counter{{font-size:12px;color:#94a3b8;font-weight:600;min-width:60px;text-align:center}}
.slide{{position:fixed;inset:0;display:none;align-items:center;justify-content:center}}
.slide.active{{display:flex}}
.slide-overlay{{position:absolute;inset:0;background:linear-gradient(transparent 30%,rgba(0,0,0,0.8));display:flex;flex-direction:column;justify-content:flex-end;padding:60px 80px}}
.slide-num{{font-size:11px;font-weight:800;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px}}
.slide-title{{font-size:42px;font-weight:900;line-height:1.1;margin-bottom:12px;max-width:70%}}
.slide-narration{{font-size:16px;line-height:1.6;color:rgba(255,255,255,0.85);max-width:60%;margin-bottom:12px}}
.slide-prompt{{font-size:11px;color:#818cf8;background:rgba(79,70,229,0.15);border:1px solid rgba(99,102,241,0.3);padding:8px 12px;border-radius:4px;max-width:60%;margin-bottom:8px}}
.slide-meta{{font-size:11px;color:rgba(255,255,255,0.4);font-weight:600}}
@media print{{.controls{{display:none}}.slide{{position:relative;display:flex!important;min-height:100vh;page-break-after:always}}}}
</style>
</head>
<body>
<div class="controls">
  <h1>{request.title or "Storyboard"} — ExplainaPro</h1>
  <div class="nav">
    <button class="btn-nav" onclick="prev()">← Prev</button>
    <span class="counter" id="counter">1 / {len(request.slides)}</span>
    <button class="btn-nav" onclick="next()">Next →</button>
  </div>
</div>
{slides_html}
<script>
let current=0;const slides=document.querySelectorAll('.slide');const total=slides.length;
function show(n){{current=((n%total)+total)%total;slides.forEach((s,i)=>s.classList.toggle('active',i===current));document.getElementById('counter').textContent=`${{current+1}} / ${{total}}`}}
function next(){{show(current+1)}}function prev(){{show(current-1)}}
document.addEventListener('keydown',e=>{{if(e.key==='ArrowRight'||e.key===' ')next();if(e.key==='ArrowLeft')prev()}});
show(0);
</script>
</body>
</html>'''

        async with aiofiles.open(filepath, 'w') as f:
            await f.write(html_content)

        return {
            "success": True,
            "url": f"/api/uploads/{filename}",
            "filename": filename
        }
    except Exception as e:
        logger.error(f"HTML export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── Library Routes ──────────────────────────────────────────────────────────

@api_router.post("/analyze-video")
async def analyze_video(file: UploadFile = File(...), slideCount: int = 5, duration: int = 30, tone: str = "professional", visualStyle: str = "Cinematic"):
    """Upload a video, extract key frames, and analyze with Gemini to generate a remake storyboard."""
    try:
        # Save uploaded video
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = str(uuid.uuid4())[:7]
        ext = Path(file.filename).suffix or '.mp4'
        video_filename = f"remaker-{timestamp}-{random_suffix}{ext}"
        video_path = UPLOADS_DIR / video_filename
        
        content = await file.read()
        async with aiofiles.open(video_path, 'wb') as f:
            await f.write(content)
        
        logger.info(f"Video uploaded for analysis: {video_path} ({len(content)} bytes)")
        
        # Extract key frames using FFmpeg
        frames_dir = UPLOADS_DIR / f"frames-{random_suffix}"
        frames_dir.mkdir(exist_ok=True)
        
        # Get video duration
        probe_cmd = [shutil.which('ffprobe') or 'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(video_path)]
        probe_result = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=30)
        video_duration = float(probe_result.stdout.strip()) if probe_result.stdout.strip() else 30.0
        
        # Extract frames at regular intervals (1 per slide)
        frame_count = min(slideCount, 8)
        interval = max(1, video_duration / frame_count)
        
        for i in range(frame_count):
            seek_time = i * interval
            frame_path = frames_dir / f"frame_{i:03d}.jpg"
            extract_cmd = [
                shutil.which('ffmpeg') or 'ffmpeg', '-y', '-ss', str(seek_time), '-i', str(video_path),
                '-frames:v', '1', '-q:v', '2', str(frame_path)
            ]
            subprocess.run(extract_cmd, capture_output=True, timeout=15)
        
        # Read extracted frames as base64
        frame_descriptions = []
        frame_files = sorted(frames_dir.glob("*.jpg"))
        
        for i, fp in enumerate(frame_files):
            with open(fp, 'rb') as f:
                frame_data = base64.b64encode(f.read()).decode()
            frame_descriptions.append({
                "index": i,
                "timestamp": round(i * interval, 1),
                "base64": frame_data
            })
        
        # Clean up frames directory
        shutil.rmtree(frames_dir, ignore_errors=True)
        
        # Analyze with Gemini using text description of frames
        analysis_prompt = f"""You are analyzing a video to create a remake storyboard. The video is {video_duration:.1f} seconds long and I extracted {len(frame_descriptions)} key frames.

Frame timestamps: {', '.join([f'{fd["timestamp"]}s' for fd in frame_descriptions])}

Based on these video frames, create a {slideCount}-slide storyboard that recreates the essence and style of this video with a fresh perspective. Total duration: {duration} seconds.

Analyze the visual themes, pacing, subjects, and mood from the frames to inform your storyboard.

Output ONLY valid JSON matching this schema:
{{
  "title": "Remake title",
  "duration": {duration},
  "style": "{visualStyle}",
  "colorScheme": "#HEX primary color from the video",
  "slides": [
    {{
      "id": "1",
      "title": "Slide title",
      "narration": "Narration text (1-2 sentences, tone: {tone})",
      "duration": {round(duration / slideCount)},
      "imagePrompt": "Detailed image prompt inspired by the video's visual style. 16:9 landscape. No text.",
      "videoPrompt": "Camera movement/animation description",
      "transition": "fade|slide|zoom|none",
      "onScreenText": "Optional bold text overlay",
      "visualStyle": "{visualStyle}"
    }}
  ],
  "voiceoverStyle": "professional|energetic|calm|storytelling",
  "musicMood": "uplifting|corporate|cinematic|minimal",
  "characters": [],
  "suggestedMusic": ["5 music ideas matching the original video's mood"],
  "suggestedVfx": ["5 VFX ideas"],
  "suggestedSfx": ["5 SFX ideas"],
  "originalVideoAnalysis": "Brief 2-sentence summary of what the original video was about"
}}"""

        response = await gemini_generate(
            "You are an expert video content strategist. Analyze video content and create compelling remake storyboards. Always respond with valid JSON only.",
            analysis_prompt
        )
        
        # Clean and parse
        import json
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        parsed = json.loads(cleaned)
        
        # Clean up video file after analysis
        video_path.unlink(missing_ok=True)
        
        return {"success": True, "data": parsed, "framesAnalyzed": len(frame_descriptions), "originalDuration": video_duration}
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error in video analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI analysis response")
    except Exception as e:
        logger.error(f"Video analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/library/music")
async def get_music_library(category: Optional[str] = None):
    """Get music library catalog, optionally filtered by category."""
    tracks = MUSIC_CATALOG
    if category:
        tracks = [t for t in tracks if t["category"] == category]
    for t in tracks:
        t["url"] = f"/api/library/music/{t['id']}.mp3"
    categories = sorted(set(t["category"] for t in MUSIC_CATALOG))
    return {"success": True, "tracks": tracks, "categories": categories, "total": len(tracks)}

@api_router.get("/library/sfx")
async def get_sfx_library(category: Optional[str] = None):
    """Get SFX library catalog, optionally filtered by category."""
    sounds = SFX_CATALOG
    if category:
        sounds = [s for s in sounds if s["category"] == category]
    for s in sounds:
        s["url"] = f"/api/library/sfx/{s['id']}.mp3"
    categories = sorted(set(s["category"] for s in SFX_CATALOG))
    return {"success": True, "sounds": sounds, "categories": categories, "total": len(sounds)}

@api_router.get("/library/music/{filename}")
async def serve_music(filename: str):
    """Serve a music track from the library."""
    filepath = MUSIC_LIB_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Track not found")
    return FileResponse(filepath, media_type="audio/mpeg")

@api_router.get("/library/sfx/{filename}")
async def serve_sfx(filename: str):
    """Serve an SFX sample from the library."""
    filepath = SFX_LIB_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="SFX not found")
    return FileResponse(filepath, media_type="audio/mpeg")

# ─── Video Render Routes ────────────────────────────────────────────────────

class RenderRequest(BaseModel):
    projectId: str
    slides: List[Dict[str, Any]]
    title: str
    duration: float = 30
    generateVoice: bool = True
    voiceId: str = "en-US-Journey-D"
    captionStyleId: Optional[str] = None
    captionMode: str = "words"
    captionFont: Optional[str] = None
    captionColor: Optional[str] = None
    captionBgColor: Optional[str] = None
    captionPosition: str = "bottom"
    captionSize: int = 44
    bgmUrl: Optional[str] = None
    bgmVolume: float = 0.4
    musicTracks: List[Dict[str, Any]] = []

def format_ass_time(seconds):
    """Convert seconds to ASS time format H:MM:SS.CC"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int((seconds % 1) * 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def create_ass_subtitle(slides, caption_style_id, temp_dir):
    """Create ASS subtitle file for burning captions into rendered video."""
    CAPTION_ASS_STYLES = {
        'bold-pop': {
            'PrimaryColour': '&H00000000',
            'BackColour': '&H0024BFFB',
            'OutlineColour': '&H0024BFFB',
            'BorderStyle': '3', 'Outline': '0', 'Shadow': '0',
            'Bold': '-1', 'Fontsize': '46',
        },
        'netflix': {
            'PrimaryColour': '&H00FFFFFF',
            'BackColour': '&H80000000',
            'OutlineColour': '&H00000000',
            'BorderStyle': '1', 'Outline': '3', 'Shadow': '2',
            'Bold': '-1', 'Fontsize': '48',
        },
        'minimal': {
            'PrimaryColour': '&H00FFFFFF',
            'BackColour': '&H4D000000',
            'OutlineColour': '&H00000000',
            'BorderStyle': '3', 'Outline': '0', 'Shadow': '0',
            'Bold': '0', 'Fontsize': '42',
        },
        'tiktok': {
            'PrimaryColour': '&H00552DFF',
            'BackColour': '&HF01A1A1A',
            'OutlineColour': '&H001A1A1A',
            'BorderStyle': '3', 'Outline': '0', 'Shadow': '0',
            'Bold': '-1', 'Fontsize': '46',
        },
        'neon': {
            'PrimaryColour': '&H00FFF500',
            'BackColour': '&H00000000',
            'OutlineColour': '&H00FFF500',
            'BorderStyle': '1', 'Outline': '4', 'Shadow': '0',
            'Bold': '-1', 'Fontsize': '46',
        },
        'glass': {
            'PrimaryColour': '&H00FFFFFF',
            'BackColour': '&HE6FFFFFF',
            'OutlineColour': '&H40FFFFFF',
            'BorderStyle': '3', 'Outline': '0', 'Shadow': '0',
            'Bold': '0', 'Fontsize': '42',
        },
    }
    style = CAPTION_ASS_STYLES.get(caption_style_id, CAPTION_ASS_STYLES['minimal'])
    
    ass_content = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Liberation Sans,{style['Fontsize']},{style['PrimaryColour']},&H000000FF,{style['OutlineColour']},{style['BackColour']},{style['Bold']},0,0,0,100,100,0,0,{style['BorderStyle']},{style['Outline']},{style['Shadow']},2,60,60,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    time_offset = 0
    for slide in slides:
        narration = slide.get('narration', '')
        duration = slide.get('duration', 6)
        if narration:
            start = format_ass_time(time_offset)
            end = format_ass_time(time_offset + duration)
            text = narration.replace('\\', '\\\\').replace('{', '\\{').replace('}', '\\}')
            ass_content += f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}\n"
        time_offset += duration
    
    ass_path = temp_dir / "captions.ass"
    with open(ass_path, 'w', encoding='utf-8') as f:
        f.write(ass_content)
    logger.info(f"Created ASS subtitle file at {ass_path} with style '{caption_style_id}'")
    return ass_path

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

def get_audio_duration(filepath: str) -> float:
    """Get audio duration in seconds using ffprobe."""
    try:
        result = subprocess.run(
            [shutil.which('ffprobe') or 'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', filepath],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except Exception as e:
        logger.error(f"ffprobe error: {e}")
    return 0.0

class AutoSyncRequest(BaseModel):
    slides: List[Dict[str, Any]]
    voiceId: str = "en-US-Journey-D"
    bgmUrl: Optional[str] = None
    bgmVolume: float = 0.4
    captionStyleId: Optional[str] = None
    generateMissingVoices: bool = True
    bufferPerSlide: float = 0.5

@api_router.post("/editor/auto-sync")
async def auto_sync_project(request: AutoSyncRequest, user: dict = Depends(get_current_user)):
    """Intelligently synchronize all layers: generate missing voices, analyze durations, and return optimized timing."""
    try:
        import httpx
        api_key = os.getenv("GOOGLE_TTS_API_KEY")
        slides = request.slides
        synced_slides = []
        total_voice_duration = 0.0
        generated_count = 0
        
        for idx, slide in enumerate(slides):
            slide_id = slide.get('id', str(idx))
            narration = slide.get('narration', '')
            voice_url = slide.get('voiceUrl')
            
            voice_duration = 0.0
            new_voice_url = voice_url
            
            # Step 1: Generate missing voices
            if not voice_url and narration and request.generateMissingVoices and api_key:
                audio_bytes = await generate_voice_for_slide(narration, request.voiceId, api_key)
                if audio_bytes:
                    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                    random_suffix = str(uuid.uuid4())[:7]
                    filename = f"voice-sync-{timestamp}-{random_suffix}.mp3"
                    filepath = UPLOADS_DIR / filename
                    async with aiofiles.open(filepath, 'wb') as f:
                        await f.write(audio_bytes)
                    new_voice_url = f"/api/uploads/{filename}"
                    generated_count += 1
                    
                    # Save to user library
                    user_id = user.get("id") if user else None
                    if user_id:
                        await db.generated_assets.insert_one({
                            "id": str(uuid.uuid4()), "type": "voice",
                            "url": new_voice_url, "prompt": narration[:100],
                            "metadata": {"voiceId": request.voiceId, "source": "auto-sync"},
                            "userId": user_id, "createdAt": datetime.now(timezone.utc).isoformat()
                        })
            
            # Step 2: Analyze voice duration
            if new_voice_url:
                voice_file = new_voice_url.split('/')[-1] if new_voice_url else None
                if voice_file:
                    voice_path = UPLOADS_DIR / voice_file
                    if voice_path.exists():
                        voice_duration = get_audio_duration(str(voice_path))
            
            # Step 3: Calculate optimal slide duration
            # Voice duration + buffer, minimum 3 seconds
            if voice_duration > 0:
                optimal_duration = max(3.0, voice_duration + request.bufferPerSlide)
            else:
                # Estimate from narration text: ~150 words per minute
                word_count = len(narration.split()) if narration else 0
                estimated_speech_time = (word_count / 150.0) * 60.0
                optimal_duration = max(3.0, estimated_speech_time + request.bufferPerSlide) if word_count > 0 else slide.get('duration', 5.0)
            
            optimal_duration = round(optimal_duration, 1)
            total_voice_duration += voice_duration if voice_duration > 0 else optimal_duration
            
            synced_slides.append({
                "id": slide_id,
                "voiceUrl": new_voice_url,
                "voiceDuration": round(voice_duration, 2),
                "optimalDuration": optimal_duration,
                "originalDuration": slide.get('duration', 5),
                "hasVoice": new_voice_url is not None,
                "hasImage": bool(slide.get('assetUrl')),
                "captionStart": 0,
                "captionEnd": round(voice_duration, 2) if voice_duration > 0 else optimal_duration,
            })
        
        # Step 4: Analyze BGM
        bgm_info = None
        if request.bgmUrl:
            bgm_file = request.bgmUrl.split('/')[-1] if request.bgmUrl else None
            bgm_path = None
            if bgm_file:
                # Check uploads dir and library dirs
                for check_dir in [UPLOADS_DIR, MUSIC_LIB_DIR]:
                    candidate = check_dir / bgm_file
                    if candidate.exists():
                        bgm_path = candidate
                        break
            if bgm_path:
                bgm_duration = get_audio_duration(str(bgm_path))
                total_video_duration = sum(s['optimalDuration'] for s in synced_slides)
                bgm_info = {
                    "url": request.bgmUrl,
                    "duration": round(bgm_duration, 2),
                    "videoDuration": round(total_video_duration, 2),
                    "needsLoop": bgm_duration < total_video_duration,
                    "needsTrim": bgm_duration > total_video_duration,
                    "volume": request.bgmVolume,
                }
        
        total_video_duration = sum(s['optimalDuration'] for s in synced_slides)
        
        return {
            "success": True,
            "syncedSlides": synced_slides,
            "totalDuration": round(total_video_duration, 2),
            "voicesGenerated": generated_count,
            "bgmInfo": bgm_info,
            "summary": {
                "totalSlides": len(synced_slides),
                "slidesWithVoice": sum(1 for s in synced_slides if s['hasVoice']),
                "slidesWithImage": sum(1 for s in synced_slides if s['hasImage']),
                "avgSlideDuration": round(total_video_duration / len(synced_slides), 1) if synced_slides else 0,
            }
        }
    except Exception as e:
        logger.error(f"Auto-sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Audio duration endpoint for frontend timeline
@api_router.post("/audio/duration")
async def get_audio_duration_endpoint(request: Dict[str, Any] = Body(...)):
    """Get duration of an audio file."""
    url = request.get("url", "")
    if not url:
        return {"duration": 0}
    filename = url.split('/')[-1]
    for check_dir in [UPLOADS_DIR, MUSIC_LIB_DIR, SFX_LIB_DIR]:
        candidate = check_dir / filename
        if candidate.exists():
            dur = get_audio_duration(str(candidate))
            return {"duration": round(dur, 2)}
    return {"duration": 0}

RENDER_JOBS_DIR = RENDERS_DIR / "jobs"
RENDER_JOBS_DIR.mkdir(exist_ok=True)

# Clean up stuck render jobs from previous sessions
for _sf in RENDER_JOBS_DIR.glob("*.status.json"):
    try:
        with open(_sf, 'r') as _f:
            _st = json.load(_f)
        if _st.get('status') in ('processing', 'pending'):
            with open(_sf, 'w') as _f:
                json.dump({"status": "failed", "error": "Render was interrupted by a server restart. Please try again."}, _f)
    except Exception:
        pass

def read_render_status(job_id):
    """Read render status from disk. Detect stuck jobs."""
    status_file = RENDER_JOBS_DIR / f"{job_id}.status.json"
    if status_file.exists():
        try:
            with open(status_file, 'r') as f:
                status = json.load(f)
            # Detect stuck jobs: if processing for more than 10 minutes, mark as failed
            if status.get('status') == 'processing':
                file_age = time.time() - os.path.getmtime(str(status_file))
                if file_age > 600:  # 10 minutes
                    status = {"status": "failed", "error": "Render timed out. The process may have been interrupted. Please try again."}
                    with open(status_file, 'w') as f:
                        json.dump(status, f)
            return status
        except Exception:
            pass
    return None

@api_router.get("/render/preflight")
async def render_preflight():
    """Check if rendering dependencies are available."""
    checks = {"node": False, "remotion": False, "ready": False}
    # Check node
    node_path = None
    for p in ['/usr/bin/node', '/usr/local/bin/node']:
        if os.path.isfile(p) and os.access(p, os.X_OK):
            node_path = p
            break
    if not node_path:
        node_path = shutil.which('node')
    if node_path:
        checks["node"] = True
        checks["nodeVersion"] = subprocess.run([node_path, '--version'], capture_output=True, text=True, timeout=5).stdout.strip()
    # Check remotion
    remotion_dir = ROOT_DIR.parent / 'remotion'
    checks["remotion"] = (remotion_dir / 'node_modules').exists()
    checks["ready"] = checks["node"] and checks["remotion"]
    return checks

@api_router.post("/render")
async def start_render(request: RenderRequest):
    """Start video rendering in a detached subprocess that survives backend restarts."""
    job_id = str(uuid.uuid4())
    status_file = RENDER_JOBS_DIR / f"{job_id}.status.json"
    job_config_file = RENDER_JOBS_DIR / f"{job_id}.config.json"
    
    # Write initial status
    with open(status_file, 'w') as f:
        json.dump({"status": "pending", "progress": 0, "step": "Starting..."}, f)
    
    # Write job config for the worker
    job_config = {
        "job_id": job_id,
        "status_file": str(status_file),
        "slides": [dict(s) for s in request.slides],
        "title": request.title,
        "project_id": request.projectId,
        "generate_voice": request.generateVoice,
        "voice_id": request.voiceId,
        "caption_style_id": request.captionStyleId,
        "caption_mode": request.captionMode,
        "caption_font": request.captionFont,
        "caption_color": request.captionColor,
        "caption_bg_color": request.captionBgColor,
        "caption_position": request.captionPosition,
        "caption_size": request.captionSize,
        "bgm_url": request.bgmUrl,
        "bgm_volume": request.bgmVolume,
        "music_tracks": request.musicTracks,
    }
    with open(job_config_file, 'w') as f:
        json.dump(job_config, f)
    
    # Launch detached render worker subprocess
    python_path = sys.executable
    worker_script = str(ROOT_DIR / 'render_worker.py')
    
    # Use subprocess.Popen with start_new_session=True so it survives parent death
    # Include all possible node locations in PATH
    render_env = {**os.environ}
    render_env["PATH"] = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:" + os.environ.get("PATH", "")
    # Add nvm paths if they exist
    nvm_dir = os.path.expanduser("~/.nvm/versions/node")
    if os.path.isdir(nvm_dir):
        for d in sorted(os.listdir(nvm_dir), reverse=True):
            bin_dir = os.path.join(nvm_dir, d, "bin")
            if os.path.isdir(bin_dir):
                render_env["PATH"] = bin_dir + ":" + render_env["PATH"]
                break
    
    subprocess.Popen(
        [python_path, worker_script, str(job_config_file)],
        stdout=open(RENDER_JOBS_DIR / f"{job_id}.stdout.log", 'w'),
        stderr=open(RENDER_JOBS_DIR / f"{job_id}.stderr.log", 'w'),
        cwd=str(ROOT_DIR),
        start_new_session=True,
        env=render_env,
    )
    
    return {"success": True, "jobId": job_id, "status": "started"}

@api_router.get("/render/{job_id}")
async def get_render_status(job_id: str):
    """Get render job status from disk."""
    status = read_render_status(job_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Render job not found")
    return {"success": True, **status}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
