#!/usr/bin/env python3
"""Standalone render worker - runs independently of the backend.
Reads job config from JSON, renders using Remotion, writes status to disk."""

import sys
import os
import json
import shutil
import asyncio
import logging
import uuid
import base64
from pathlib import Path
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format='%(asctime)s - render - %(levelname)s - %(message)s')
logger = logging.getLogger('render')

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / 'uploads'
RENDERS_DIR = ROOT_DIR / 'renders'
MUSIC_LIB_DIR = ROOT_DIR / 'library' / 'music'
SFX_LIB_DIR = ROOT_DIR / 'library' / 'sfx'

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / '.env')

def write_status(status_file, data):
    tmp = str(status_file) + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(data, f)
    os.replace(tmp, str(status_file))

async def generate_voice_tts(text, voice_id, api_key):
    try:
        import httpx
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
                audio_content = response.json().get("audioContent")
                if audio_content:
                    return base64.b64decode(audio_content)
    except Exception as e:
        logger.error(f"TTS error: {e}")
    return None

async def run_render(job_file):
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
    
    try:
        write_status(status_file, {"status": "processing", "progress": 5, "step": "Preparing assets..."})
        
        remotion_slides = []
        total_slides = len(slides)
        
        for idx, slide in enumerate(slides):
            pct = 5 + int((idx / max(total_slides, 1)) * 35)
            write_status(status_file, {"status": "processing", "progress": pct, "step": f"Processing slide {idx+1}/{total_slides}"})
            
            asset_url = slide.get('assetUrl')
            duration = slide.get('duration', 6)
            narration = slide.get('narration', '')
            voice_url = slide.get('voiceUrl')
            transition = slide.get('transition', 'fade')
            
            # Resolve image
            image_url = None
            if asset_url:
                if '/api/uploads/' in asset_url:
                    fn = asset_url.split('/')[-1]
                    if (UPLOADS_DIR / fn).exists():
                        image_url = f"{base_url}/api/uploads/{fn}"
                elif asset_url.startswith('http'):
                    image_url = asset_url
            
            # Resolve or generate voice
            voice_http_url = None
            if voice_url and voice_url.startswith('/api/uploads/'):
                src = UPLOADS_DIR / voice_url.split('/')[-1]
                if src.exists():
                    voice_http_url = f"{base_url}{voice_url}"
            
            if not voice_http_url and generate_voice and narration and tts_api_key:
                write_status(status_file, {"status": "processing", "progress": pct, "step": f"Generating voice {idx+1}/{total_slides}"})
                audio_bytes = await generate_voice_tts(narration, voice_id, tts_api_key)
                if audio_bytes:
                    audio_fn = f"voice_{job_id}_{idx}.mp3"
                    with open(UPLOADS_DIR / audio_fn, 'wb') as f:
                        f.write(audio_bytes)
                    voice_http_url = f"{base_url}/api/uploads/{audio_fn}"
            
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
                fn = bgm_url.split('/')[-1]
                d = MUSIC_LIB_DIR if '/music/' in bgm_url else SFX_LIB_DIR
                if (d / fn).exists():
                    bgm_http_url = f"{base_url}{bgm_url}"
            elif '/api/uploads/' in bgm_url:
                fn = bgm_url.split('/')[-1]
                if (UPLOADS_DIR / fn).exists():
                    bgm_http_url = f"{base_url}/api/uploads/{fn}"
            elif bgm_url.startswith('http'):
                bgm_http_url = bgm_url
        
        # Write Remotion data
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
        
        write_status(status_file, {"status": "processing", "progress": 42, "step": "Launching Remotion renderer..."})
        logger.info(f"Starting render: {len(remotion_slides)} slides -> {output_path}")
        
        # Run Remotion
        remotion_dir = ROOT_DIR.parent / "remotion"
        node_path = shutil.which('node')
        if not node_path:
            # Try installing node if missing
            logger.warning("node not found, attempting install...")
            import subprocess as sp
            sp.run(['apt-get', 'update', '-qq'], capture_output=True, timeout=60)
            sp.run(['apt-get', 'install', '-y', '-qq', 'nodejs'], capture_output=True, timeout=120)
            node_path = shutil.which('node')
        if not node_path:
            write_status(status_file, {"status": "failed", "error": "Node.js is not installed. Please restart the server to auto-install dependencies."})
            return
        
        # Ensure remotion node_modules exist
        if not (remotion_dir / 'node_modules').exists():
            logger.info("Installing remotion dependencies...")
            import subprocess as sp
            sp.run(['yarn', 'install', '--frozen-lockfile'], cwd=str(remotion_dir), capture_output=True, timeout=120)
        
        env = {**os.environ, "PATH": f"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:{os.environ.get('PATH', '')}"}
        
        proc = await asyncio.create_subprocess_exec(
            node_path, '--max-old-space-size=4096',
            str(remotion_dir / 'render.mjs'),
            str(data_file), str(output_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(remotion_dir),
            env=env,
        )
        
        # Read BOTH stdout and stderr concurrently to avoid deadlock
        stdout_lines = []
        stderr_lines = []
        
        async def read_stderr():
            while True:
                line = await proc.stderr.readline()
                if not line:
                    break
                msg = line.decode().strip()
                if msg:
                    stderr_lines.append(msg)
                    logger.info(f"Remotion: {msg}")
                    if "Progress:" in msg:
                        try:
                            pct = int(msg.split("Progress:")[1].strip().replace("%", ""))
                            # Map Remotion 0-100% to our 42-95%
                            mapped = 42 + int(pct * 0.53)
                            write_status(status_file, {
                                "status": "processing",
                                "progress": mapped,
                                "step": f"Rendering... {pct}%"
                            })
                        except (ValueError, IndexError):
                            pass
                    elif "Bundling" in msg:
                        write_status(status_file, {"status": "processing", "progress": 44, "step": "Bundling composition..."})
                    elif "Composition:" in msg:
                        write_status(status_file, {"status": "processing", "progress": 48, "step": "Preparing frames..."})
                    elif "Error" in msg:
                        write_status(status_file, {"status": "processing", "progress": 42, "step": f"Error: {msg[:100]}"})
        
        async def read_stdout():
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                stdout_lines.append(line.decode().strip())
        
        # Run both readers concurrently
        await asyncio.gather(read_stderr(), read_stdout())
        await proc.wait()
        
        logger.info(f"Remotion exit code: {proc.returncode}")
        
        if proc.returncode == 0 and output_path.exists():
            video_url = f"/api/renders/{output_filename}"
            write_status(status_file, {
                "status": "completed",
                "progress": 100,
                "videoUrl": video_url,
                "hasAudio": any(s.get('voiceUrl') for s in remotion_slides) or bgm_http_url is not None
            })
            logger.info(f"Render completed: {output_path} ({output_path.stat().st_size} bytes)")
        else:
            # Collect error info from both streams
            err = "\n".join(stderr_lines[-5:]) if stderr_lines else ""
            out = "\n".join(stdout_lines[-3:]) if stdout_lines else ""
            error_msg = err or out or "Unknown error"
            logger.error(f"Render failed (exit={proc.returncode}): {error_msg}")
            write_status(status_file, {"status": "failed", "error": f"Render failed: {error_msg[:500]}"})
        
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    except Exception as e:
        logger.error(f"Render worker error: {e}", exc_info=True)
        write_status(status_file, {"status": "failed", "error": str(e)[:500]})

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: render_worker.py <job_file>")
        sys.exit(1)
    asyncio.run(run_render(sys.argv[1]))
