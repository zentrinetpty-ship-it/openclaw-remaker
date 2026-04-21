"""SundayRemaker - Debug Backend with Logging"""
from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
from datetime import datetime
import sys
import os
import uuid
import hashlib
import json
import re
import subprocess
import asyncio
import edge_tts
from google import genai

# Setup - ROOT_DIR is the project root (parent of backend folder)
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / 'backend' / '.env')
UPLOADS_DIR = ROOT_DIR / 'backend' / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

print("Starting SundayRemaker server...")

# Gemini client
_gemini_client = None
def get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        api_key = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("ERROR: No Gemini API key configured!")
            raise ValueError("Gemini API key not configured")
        print(f"Using API key: {api_key[:20]}...")
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client

# App
app = FastAPI(title="SundayRemaker", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Router
api = APIRouter(prefix="/api")

VOICE_MAP = {
    "en-US-Journey-D": "en-US-JennyNeural",
    "en-US-Journey-F": "en-US-GuyNeural",
    "en-GB-Neural2-B": "en-GB-SoniaNeural",
    "en-GB-Neural2-A": "en-GB-RyanNeural",
}

def fix_json(text):
    """Fix common JSON issues in LLM output"""
    if '{' not in text:
        print(f"fix_json: No JSON found in text")
        return None
    start = text.find('{')
    end = text.rfind('}')
    if end <= start:
        print(f"fix_json: Invalid JSON bounds")
        return None
    json_str = text[start:end+1]
    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
    try:
        return json.loads(json_str)
    except Exception as e:
        print(f"fix_json: JSON parse error: {e}")
        return None

@api.get("/")
def root():
    return {"message": "SundayRemaker API", "status": "running"}

@api.post("/generate-voice")
async def gen_voice(request: Request):
    try:
        body = await request.json()
        text = body.get("text", "")
        voiceId = body.get("voiceId", "en-US-Journey-D")
        
        print(f"[VOICE] raw body={body}")
        print(f"[VOICE] text='{text}', voiceId={voiceId}")
        
        voice = VOICE_MAP.get(voiceId, "en-US-JennyNeural")
        h = hashlib.md5(f"{text}_{voice}".encode()).hexdigest()
        fn = f"voice-{h}.mp3"
        fp = UPLOADS_DIR / fn
        
        print(f"[VOICE] final voice={voice}, fp={fp}")
        
        # Use subprocess with correct working directory
        result = subprocess.run([
            sys.executable, "-m", "edge_tts",
            "-t", text,
            "-v", voice,
            "--write-media", str(fp)
        ], capture_output=True, text=True, timeout=60, cwd=str(ROOT_DIR))
        
        print(f"[VOICE] returncode={result.returncode}, stdout={result.stdout}, stderr={result.stderr}")
        
        file_size = fp.stat().st_size if fp.exists() else 0
        print(f"[VOICE] file exists={fp.exists()}, size={file_size}")
        
        if result.returncode != 0:
            return {"success": False, "error": f"TTS error: {result.stderr}"}
        
        if file_size == 0:
            return {"success": False, "error": "Failed to generate audio - empty file"}
        
        return {"success": True, "url": f"/api/uploads/{fn}", "duration": len(text)/15}
    except Exception as e:
        print(f"generate-voice error: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

@api.post("/generate-image")
async def gen_image(description: str = "", style: str = "Cinematic"):
    try:
        prompt = f"{style} style: {description}. 16:9, no text."
        client = get_gemini_client()
        resp = client.models.generate_images(
            model='imagen-4.0-generate-001',
            prompt=prompt,
            config=genai.types.GenerateImagesConfig(number_of_images=1, aspect_ratio="16:9")
        )
        if resp.generated_images:
            fn = f"image-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:7]}.png"
            fp = UPLOADS_DIR / fn
            with open(fp, 'wb') as f:
                f.write(resp.generated_images[0].image.image_bytes)
            return {"success": True, "image": f"/api/uploads/{fn}"}
        return {"success": False, "error": "No image"}
    except Exception as e:
        print(f"generate-image error: {e}")
        return {"success": False, "error": str(e)}

@api.post("/generate-prompt")
async def generate_prompt(
    story: str = "",
    input: str = "",
    category: str = "explainer",
    tone: str = "professional",
    slideCount: int = 5,
    duration: int = 30,
    visualStyle: str = "Cinematic",
    type: str = ""
):
    try:
        client = get_gemini_client()
        story_text = story if story else (input if input else "")
        print(f"generate-prompt called with story: {story_text[:50]}...")
        
        prompt = f"""Create a video script with {slideCount} slides for a {category} video.
Topic: {story_text}
Tone: {tone}
Visual Style: {visualStyle}
Duration: {duration} seconds total.

Return valid JSON like:
{{"slides": [{{"text": "...", "duration": 6, "visualDescription": "...", "voiceScript": "..."}}]}}
Only output valid JSON, no other text."""
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(temperature=0.7)
        )
        
        print(f"Gemini response: {response.text[:200]}...")
        data = fix_json(response.text)
        
        if data:
            return {"success": True, "data": data, "topic": story_text}
        return {"success": False, "error": "Could not parse response"}
    except Exception as e:
        print(f"generate-prompt error: {e}")
        return {"success": False, "error": str(e)}

@api.post("/restructure-script")
async def restructure_script(
    story: str = "",
    input: str = "",
    category: str = "explainer",
    tone: str = "professional",
    slideCount: int = 5,
    duration: int = 30,
    visualStyle: str = "Cinematic",
    type: str = ""
):
    try:
        client = get_gemini_client()
        story_text = story if story else (input if input else "")
        print(f"\n=== restructure-script called ===")
        print(f"  story: '{story_text[:50]}...'")
        print(f"  category: {category}")
        print(f"  slideCount: {slideCount}")
        print(f"  duration: {duration}")
        
        prompt = f"""Create a {slideCount}-slide storyboard for a {category} video.
Content: {story_text}
Tone: {tone}
Visual Style: {visualStyle}
Duration: {duration} seconds total.

Return valid JSON like:
{{"slides": [{{"text": "...", "duration": 6, "visualDescription": "...", "voiceScript": "..."}}]}}
Only output valid JSON, no other text."""
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(temperature=0.7)
        )
        
        print(f"Gemini response length: {len(response.text)} chars")
        print(f"Gemini response preview: {response.text[:100]}...")
        
        data = fix_json(response.text)
        
        if data:
            slides = data.get('slides', [])
            print(f"Parsed {len(slides)} slides")
            return {"success": True, "data": data}
        else:
            print("Failed to parse JSON from response")
            return {"success": False, "error": "Could not parse response"}
    except Exception as e:
        print(f"restructure-script error: {e}")
        return {"success": False, "error": str(e)}

@api.get("/render/preflight")
def render_preflight():
    """Check if render environment is ready"""
    import shutil
    node = shutil.which("node")
    remotion_path = ROOT_DIR / "remotion" / "node_modules" / "@remotion" / "cli" / "package.json"
    remotion_ok = remotion_path.exists()
    print(f"[PREFLIGHT] node={node}, remotion_path={remotion_path}, exists={remotion_ok}")
    return {
        "ready": bool(node and remotion_ok),
        "node": bool(node),
        "remotion": remotion_ok
    }

@api.post("/render")
async def start_render(request: Request):
    """Start a render job"""
    try:
        body = await request.json()
        slides = body.get("slides", [])
        title = body.get("title", "Video")
        
        # Save project data to temp file for render - replace voice URLs with full backend URL
        import uuid
        job_id = str(uuid.uuid4())
        
        # Replace relative URLs with full backend URL
        slides_with_urls = []
        for slide in slides:
            slide_copy = dict(slide)
            # Fix voice URLs
            if slide_copy.get('voiceUrl') and slide_copy['voiceUrl'].startswith('/'):
                slide_copy['voiceUrl'] = f"http://localhost:8090{slide_copy['voiceUrl']}"
            # Fix image URLs
            if slide_copy.get('imageUrl') and slide_copy['imageUrl'].startswith('/'):
                slide_copy['imageUrl'] = f"http://localhost:8090{slide_copy['imageUrl']}"
            # Fix asset URLs
            if slide_copy.get('assetUrl') and slide_copy['assetUrl'].startswith('/'):
                slide_copy['assetUrl'] = f"http://localhost:8090{slide_copy['assetUrl']}"
            slides_with_urls.append(slide_copy)
        
        project_data = {
            "title": title,
            "slides": slides_with_urls
        }
        
        # Render using node/remotion
        import subprocess
        import threading
        
        def run_render():
            try:
                # Write project data
                data_file = ROOT_DIR / "render_data" / f"{job_id}.json"
                output_file = ROOT_DIR / "renders" / f"{job_id}.mp4"
                data_file.parent.mkdir(exist_ok=True)
                output_file.parent.mkdir(exist_ok=True)
                
                with open(data_file, "w") as f:
                    json.dump(project_data, f)
                
                print(f"[RENDER] Starting render {job_id}")
                print(f"[RENDER] Data file: {data_file}")
                print(f"[RENDER] Output file: {output_file}")
                
                # Run remotion render with correct args: <data.json> <output.mp4>
                result = subprocess.run([
                    "node",
                    "render.mjs",
                    str(data_file),
                    str(output_file)
                ], capture_output=True, text=True, timeout=600, cwd=str(ROOT_DIR / "remotion"))
                
                print(f"[RENDER] {job_id} completed: {result.returncode}")
                if result.returncode != 0:
                    print(f"[RENDER] Error: {result.stderr[:500]}")
                elif result.stdout:
                    print(f"[RENDER] Output: {result.stdout[:200]}")
                
                # Update status file
                status_file = ROOT_DIR / "render_data" / f"{job_id}_status.json"
                with open(status_file, "w") as f:
                    json.dump({
                        "status": "completed" if result.returncode == 0 else "failed",
                        "output": str(output_file) if result.returncode == 0 else None,
                        "error": result.stderr[:500] if result.returncode != 0 else None,
                        "stdout": result.stdout[:200]
                    }, f)
            except Exception as e:
                print(f"[RENDER] Thread error: {e}")
                import traceback
                traceback.print_exc()
                status_file = ROOT_DIR / "render_data" / f"{job_id}_status.json"
                with open(status_file, "w") as f:
                    json.dump({"status": "failed", "error": str(e)}, f)
        
        # Start render in background
        thread = threading.Thread(target=run_render)
        thread.start()
        
        return {"jobId": job_id, "status": "processing"}
    except Exception as e:
        print(f"start_render error: {e}")
        return {"error": str(e)}

@api.get("/render/{job_id}")
async def get_render_status(job_id: str):
    """Get render job status"""
    status_file = ROOT_DIR / "render_data" / f"{job_id}_status.json"
    
    if not status_file.exists():
        return {"status": "processing", "progress": 0}
    
    import json
    with open(status_file) as f:
        status = json.load(f)
    
    if status.get("status") == "completed":
        # Find output video
        video_file = ROOT_DIR / "renders" / f"{job_id}.mp4"
        video_url = f"/api/uploads/{job_id}.mp4" if video_file.exists() else None
        return {
            "status": "completed",
            "progress": 100,
            "videoUrl": video_url
        }
    elif status.get("status") == "failed":
        return {
            "status": "failed",
            "error": status.get("error", "Render failed")
        }
    
    return {"status": "processing", "progress": 50}

@api.get("/uploads/{filename}")
async def get_file(filename: str):
    fp = UPLOADS_DIR / filename
    if not fp.exists():
        raise HTTPException(404, "Not found")
    return FileResponse(fp)

app.include_router(api)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)