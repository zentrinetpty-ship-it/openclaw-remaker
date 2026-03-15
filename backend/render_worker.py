#!/usr/bin/env python3
"""Standalone render worker that runs independently of the backend.
Reads job config from a JSON file, renders using Remotion, and writes status to a status file.
This process survives backend restarts."""

import sys
import os
import json
import shutil
import asyncio
import logging
import uuid
import httpx
from pathlib import Path
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('render_worker')

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / 'uploads'
RENDERS_DIR = ROOT_DIR / 'renders'
MUSIC_LIB_DIR = ROOT_DIR / 'library' / 'music'
SFX_LIB_DIR = ROOT_DIR / 'library' / 'sfx'

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / '.env')

def write_status(status_file, data):
    """Write render status to file atomically."""
    tmp = str(status_file) + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(data, f)
    os.replace(tmp, str(status_file))

async def generate_voice_tts(text, voice_id, api_key):
    """Generate TTS voice audio."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}",
                json={
                    "input": {"text": text},
                    "voice": {"languageCode": voice_id[:5], "name": voice_id},
                    "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.0, "pitch": 0}
                }
            )
            if response.status_code == 200:
                import base64
                audio_content = response.json().get("audioContent")
                if audio_content:
                    return base64.b64decode(audio_content)
    except Exception as e:
        logger.error(f"TTS error: {e}")
    return None

async def run_render(job_file):
    """Main render function."""
    with open(job_file, 'r') as f:
        job = json.load(f)
    
    job_id = job['job_id']
    status_file = Path(job['status_file'])
    slides = job['slides']
    title = job['title']
    generate_voice = job.get('generate_voice', True)
    voice_id = job.get('voice_id', 'en-US-Journey-D')
    caption_style_id = job.get('caption_style_id')
    caption_mode = job.get('caption_mode', 'words')
    bgm_url = job.get('bgm_url')
    bgm_volume = job.get('bgm_volume', 0.4)
    
    tts_api_key = os.getenv("GOOGLE_TTS_API_KEY")
    base_url = "http://localhost:8001"
    
    write_status(status_file, {"status": "processing", "progress": 5, "step": "Preparing assets..."})
    
    remotion_slides = []
    total_slides = len(slides)
    
    for idx, slide in enumerate(slides):
        progress = int((idx / total_slides) * 40)
        write_status(status_file, {"status": "processing", "progress": progress, "step": f"Processing slide {idx + 1}/{total_slides}"})
        
        asset_url = slide.get('assetUrl')
        duration = slide.get('duration', 6)
        narration = slide.get('narration', '')
        voice_url = slide.get('voiceUrl')
        transition = slide.get('transition', 'fade')
        
        # Resolve image URL
        image_url = None
        if asset_url:
            if '/api/uploads/' in asset_url:
                filename = asset_url.split('/')[-1]
                if (UPLOADS_DIR / filename).exists():
                    image_url = f"{base_url}/api/uploads/{filename}"
            elif asset_url.startswith('http'):
                image_url = asset_url
        
        # Handle voice
        voice_http_url = None
        if voice_url and voice_url.startswith('/api/uploads/'):
            src_audio = UPLOADS_DIR / voice_url.split('/')[-1]
            if src_audio.exists():
                voice_http_url = f"{base_url}{voice_url}"
        
        if not voice_http_url and generate_voice and narration and tts_api_key:
            write_status(status_file, {"status": "processing", "progress": progress, "step": f"Generating voice for slide {idx + 1}"})
            audio_bytes = await generate_voice_tts(narration, voice_id, tts_api_key)
            if audio_bytes:
                audio_filename = f"voice_{job_id}_{idx}.mp3"
                audio_path = UPLOADS_DIR / audio_filename
                with open(audio_path, 'wb') as f:
                    f.write(audio_bytes)
                voice_http_url = f"{base_url}/api/uploads/{audio_filename}"
        
        remotion_slides.append({
            "imageUrl": image_url,
            "narration": narration,
            "duration": duration,
            "transition": transition,
            "voiceUrl": voice_http_url,
            "graphics": slide.get('graphics', []),
        })
    
    if not remotion_slides:
        write_status(status_file, {"status": "failed", "error": "No slides to render"})
        return
    
    # Resolve BGM
    bgm_http_url = None
    if bgm_url:
        if '/api/library/' in bgm_url:
            lib_filename = bgm_url.split('/')[-1]
            lib_dir = MUSIC_LIB_DIR if '/music/' in bgm_url else SFX_LIB_DIR
            if (lib_dir / lib_filename).exists():
                bgm_http_url = f"{base_url}{bgm_url}"
        elif '/api/uploads/' in bgm_url:
            filename = bgm_url.split('/')[-1]
            if (UPLOADS_DIR / filename).exists():
                bgm_http_url = f"{base_url}/api/uploads/{filename}"
        elif bgm_url.startswith('http'):
            bgm_http_url = bgm_url
    
    # Build Remotion data
    remotion_data = {
        "slides": remotion_slides,
        "captionStyleId": caption_style_id,
        "captionMode": caption_mode,
        "bgmUrl": bgm_http_url,
        "bgmVolume": bgm_volume,
    }
    
    temp_dir = RENDERS_DIR / f"temp_{job_id}"
    temp_dir.mkdir(exist_ok=True)
    data_file = temp_dir / "render_data.json"
    with open(data_file, 'w') as f:
        json.dump(remotion_data, f)
    
    safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()[:50]
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    output_filename = f"{safe_title}-{timestamp}.mp4"
    output_path = RENDERS_DIR / output_filename
    
    write_status(status_file, {"status": "processing", "progress": 45, "step": "Rendering with Remotion..."})
    logger.info(f"Starting Remotion render: {len(remotion_slides)} slides")
    
    # Run Remotion
    remotion_dir = ROOT_DIR.parent / "remotion"
    node_path = shutil.which('node') or '/usr/bin/node'
    
    proc = await asyncio.create_subprocess_exec(
        node_path, '--max-old-space-size=4096',
        str(remotion_dir / 'render.mjs'),
        str(data_file),
        str(output_path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=str(remotion_dir),
        env={**os.environ, "PATH": f"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:{os.environ.get('PATH', '')}"},
    )
    
    # Read progress from stderr
    while True:
        line = await proc.stderr.readline()
        if not line:
            break
        msg = line.decode().strip()
        if msg:
            logger.info(f"Remotion: {msg}")
            if "Progress:" in msg:
                try:
                    pct = int(msg.split("Progress:")[1].strip().replace("%", ""))
                    write_status(status_file, {
                        "status": "processing",
                        "progress": 45 + int(pct * 0.50),
                        "step": f"Rendering... {pct}%"
                    })
                except (ValueError, IndexError):
                    pass
    
    stdout_data = await proc.stdout.read()
    await proc.wait()
    
    if proc.returncode == 0 and output_path.exists():
        video_url = f"/api/renders/{output_filename}"
        write_status(status_file, {
            "status": "completed",
            "progress": 100,
            "videoUrl": video_url,
            "hasAudio": any(s.get('voiceUrl') for s in remotion_slides) or bgm_http_url is not None
        })
        logger.info(f"Render completed: {output_path}")
    else:
        error_msg = stdout_data.decode().strip() if stdout_data else "Unknown error"
        logger.error(f"Render failed (exit={proc.returncode}): {error_msg}")
        write_status(status_file, {"status": "failed", "error": f"Render failed: {error_msg[:300]}"})
    
    # Cleanup
    shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: render_worker.py <job_file>")
        sys.exit(1)
    asyncio.run(run_render(sys.argv[1]))
